document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    // const uploadButton = document.getElementById('upload-button'); // Old generic upload button
    const fileUploadInput = document.getElementById('file-upload-input'); // For workspace/knowledge
    const fileList = document.getElementById('file-list'); // For workspace
    const workspaceDropZone = document.getElementById('workspace-dropzone');

    // Chat Image Upload Elements
    const uploadImageButton = document.getElementById('upload-image-button');
    const chatImageInput = document.getElementById('chat-image-input');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const chatImageThumbnail = document.getElementById('chat-image-thumbnail');
    const removeImageButton = document.getElementById('remove-image-button');

    // Settings Panel Elements
    const settingsPanel = document.getElementById('settings-panel');
    const tabButtons = settingsPanel.querySelectorAll('.tab-button');
    const tabContents = settingsPanel.querySelectorAll('.tab-content');
    // Model Settings
    const ollamaUrlInput = document.getElementById('ollama-url');
    const modelSelector = document.getElementById('model-selector');
    const testConnectionButton = document.getElementById('test-connection-button');
    const connectionStatus = document.getElementById('connection-status');
    const modelLoadingAnimation = document.getElementById('model-loading-animation');
    // LED Settings
    const ledModeSelect = document.getElementById('led-mode');
    const colorSchemeSelect = document.getElementById('color-scheme');
    const glowIntensitySlider = document.getElementById('glow-intensity');
    const mouseGlowSyncCheckbox = document.getElementById('mouse-glow-sync');
    const typingPulseEffectCheckbox = document.getElementById('typing-pulse-effect');
    const ledPreview = document.getElementById('led-preview');
    const ledPulseSpeedSlider = document.getElementById('led-pulse-speed');
    // Knowledge Settings
    const ragEnabledCheckbox = document.getElementById('rag-enabled');
    const knowledgeUploadInput = document.getElementById('knowledge-upload-input');
    const knowledgeFileList = document.getElementById('knowledge-file-list');
    const ragStatusIndicator = document.getElementById('rag-status-indicator');

    // Floating Settings Button & Main Container
    const floatingSettingsButton = document.getElementById('floating-settings-button');
    const mainContainer = document.getElementById('main-container'); // For blur effect

    const mouseGlowElement = document.querySelector('.mouse-glow');

    // --- Initial State & Configuration ---
    let chatImageFile = null; // Variable to store the selected image file for chat
    let isModelReady = false; // Tracks if the primary model is confirmed ready
    let modelLoadingInProgress = false; // Prevents multiple simultaneous loading sequences
    let modelRetryInterval = null;
    let modelRetryCount = 0;
    const MAX_MODEL_RETRIES = 6; // Approx 1 minute if retry is 10s
    const MODEL_RETRY_DELAY = 10000; // 10 seconds
    let messageQueue = [];


    let currentConfig = {
        ollamaBaseUrl: 'http://localhost:11434',
        selectedModel: 'gemma:4b', // Default, will be fetched
        led: {
            mode: 'reactive', // reactive, full-glow, off
            colorScheme: 'neon-blue', // neon-blue, purple, red, rainbow
            intensity: 0.7,
            mouseGlow: true,
            typingPulse: true,
            pulseSpeed: 2.0, // Default pulse speed in seconds
        },
        ragEnabled: true,
        chatHistoryEnabled: true,
        // other settings...
    };

    // --- Helper Functions ---
    function addMessageToChat(sender, text, type = '') { // type can be 'user', 'assistant', 'error', 'rag'
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        if (type) messageDiv.classList.add(type);

        // Basic Markdown for code blocks (```text```)
        // Handle text content
        const textElement = document.createElement('div');
        textElement.classList.add('message-text');
        if (text.includes("```")) {
            text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
                const language = ''; // Basic, no language detection for now
                return `<pre><code class="${language}">${escapeHtml(code.trim())}</code></pre>`;
            });
            textElement.innerHTML = text; // Use innerHTML if Markdown is processed
        } else {
            textElement.textContent = text;
        }
        messageDiv.appendChild(textElement);

        // If an image URL is provided (e.g., for user messages with images or AI responses with images)
        if (type === 'user_image' || type === 'assistant_image') { // Custom types for messages with images
            const imageUrl = arguments[2]; // Expect imageUrl as 3rd arg for these types
            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;
            imgElement.classList.add('chat-log-image');
            imgElement.alt = type === 'user_image' ? "User uploaded image" : "Assistant generated image";
            // Insert image before text for user, after for assistant (or consistent)
            if (sender === 'user') {
                messageDiv.insertBefore(imgElement, textElement);
            } else {
                messageDiv.appendChild(imgElement);
            }
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll
        return messageDiv;
    }

    function escapeHtml(unsafe) {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

    function showLoading(isLoading, message = "AI Core Syncing...") {
        if (isLoading) {
            modelLoadingAnimation.textContent = message;
            modelLoadingAnimation.classList.remove('hidden');
        } else {
            modelLoadingAnimation.classList.add('hidden');
        }
    }

    function updateConnectionStatus(message, isError = false) {
        connectionStatus.textContent = message;
        connectionStatus.style.color = isError ? 'var(--error-glow-color)' : 'var(--primary-glow-color)';
        if (isError) {
            setTimeout(() => connectionStatus.textContent = '', 5000); // Clear error after 5s
        }
    }

    // --- API Interaction ---
    async function fetchFromAPI(endpoint, method = 'GET', body = null) {
        const options = { method };
        if (body instanceof FormData) {
            options.body = body;
            // Don't set Content-Type header for FormData, browser does it with boundary
        } else if (body) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`/api${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            addMessageToChat('assistant', `System Error: ${error.message}`, 'error');
            throw error; // Re-throw for further handling if needed
        }
    }

    // --- Chat Functionality ---
    async function handleSendMessage() {
        const messageText = chatInput.value.trim();
        const messageText = chatInput.value.trim();
        if (!messageText && !chatImageFile) return; // Don't send if both are empty

        let messageType = 'user';
        let tempImageSrc = null; // For optimistic display

        if (chatImageFile) {
            messageType = 'user_image';
            // For optimistic display, create a data URL. This won't be sent to backend.
            // Backend will save the file and we should ideally use its path for persistent display.
            tempImageSrc = URL.createObjectURL(chatImageFile);
            addMessageToChat('user', messageText, messageType, tempImageSrc);
        } else {
            addMessageToChat('user', messageText, messageType);
        }

        const originalChatImageFile = chatImageFile; // Keep a reference

        // Clear inputs after preparing message
        chatInput.value = '';
        chatInput.style.height = 'auto'; // Reset height
        if (chatImageFile) {
            chatImageInput.value = ''; // Reset file input
            chatImageFile = null;
            imagePreviewArea.classList.add('hidden');
        }

        if (!isModelReady || modelLoadingInProgress) {
            messageQueue.push({ text: messageText, imageFile: originalChatImageFile, imagePreviewUrl: tempImageSrc });
            addMessageToChat('assistant', `Message queued. Model "${currentConfig.selectedModel}" is still loading...`, 'system');
            // Ensure loading check is active if it stopped for some reason
            if (!modelLoadingInProgress && !modelRetryInterval) {
                checkOllamaModelStatusAndUpdateUI(true); // Re-trigger check if not already happening
            }
            if (tempImageSrc) URL.revokeObjectURL(tempImageSrc); // Revoke blob URL if queued, as it's already displayed
            return;
        }

        showLoading(true, 'Assistant is processing...');

        try {
            let requestBody;
            // let apiOptions = { method: 'POST' }; // Not needed with direct fetch

            if (originalChatImageFile) {
                const formData = new FormData();
                formData.append('message', messageText);
                formData.append('image', originalChatImageFile);
                formData.append('config_ollama_url', currentConfig.ollamaBaseUrl);
                formData.append('config_model', currentConfig.selectedModel);
                formData.append('config_rag_enabled', currentConfig.ragEnabled.toString()); // Ensure string for FormData

                requestBody = formData;
            } else {
                requestBody = JSON.stringify({ // Ensure JSON is stringified for direct fetch
                    message: messageText,
                    config: {
                        ollama_url: currentConfig.ollamaBaseUrl,
                        model: currentConfig.selectedModel,
                        rag_enabled: currentConfig.ragEnabled,
                    }
                });
            }

            const fetchOptions = {
                method: 'POST',
                body: requestBody,
            };
            if (!(requestBody instanceof FormData)) { // Set content type only for JSON
                fetchOptions.headers = { 'Content-Type': 'application/json' };
            }

            const response = await fetch('/api/chat', fetchOptions);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.image_url) {
                 addMessageToChat('assistant', data.response, 'assistant_image', data.image_url);
            } else if (data.user_image_sent_url && messageType === 'user_image') {
                // If backend confirms user image URL, we could update the displayed user image src
                // For now, optimistic display is kept. But this field is available.
                addMessageToChat('assistant', data.response, data.type || 'assistant');
            }
            else {
                 addMessageToChat('assistant', data.response, data.type || 'assistant');
            }

        } catch (error) {
             addMessageToChat('assistant', `Error: ${error.message}`, 'error');
        } finally {
            showLoading(false);
            if (tempImageSrc && messageType === 'user_image') { // Only revoke if it was for an image message AND not queued
                URL.revokeObjectURL(tempImageSrc);
            }
        }
    }

    // --- File Upload & Workspace (Generic files, not chat images) ---
    function handleFileUpload(files, event = null) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            addMessageToChat('user', `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`, 'system'); // System message for upload
            addFileToWorkspace(file);

            const formData = new FormData();
            formData.append('file', file);
            // Optionally add other data: formData.append('user_id', '123');

            const uploadIndicator = addMessageToChat('assistant', `Processing ${file.name}...`, 'system');
            uploadIndicator.classList.add('file-upload-indicator', 'processing');


            fetch('/api/upload', { method: 'POST', body: formData })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => { throw new Error(err.error || `Upload failed with status ${response.status}`) });
                    }
                    return response.json();
                })
                .then(data => {
                    uploadIndicator.textContent = `${file.name}: ${data.message || 'Processed.'}`;
                    uploadIndicator.classList.remove('processing');
                    uploadIndicator.classList.add('success');

                    // If RAG is enabled and file processed for knowledge (this part is more for dedicated knowledge uploads)
                    // if (currentConfig.ragEnabled && data.knowledge_added) { // data.knowledge_added is from /api/knowledge/upload
                    //      addMessageToChat('assistant', `"${file.name}" has been added to my knowledge. You can now ask questions about it.`, 'assistant');
                    // } else if (data.analysis) { // Or if backend provides some initial analysis from /api/upload
                    //     addMessageToChat('assistant', `Analysis of "${file.name}":\n${data.analysis}`, 'assistant');
                    // }

                    // If chat input is empty after file upload, prompt assistant about the file.
                    // This assumes the user uploaded through the chat UI's "+" button or D&D to workspace
                    // and not through the dedicated "upload to knowledge base" button in settings.
                    if (chatInput.value.trim() === '') {
                        // Check if the file was uploaded via chat context rather than settings' RAG upload
                        // Ensure event is not null and activeElement is not within settings panel
                        const isChatContextUpload = event &&
                                                 (event.target?.id === 'file-upload-input' || event.type === 'drop') &&
                                                 (!document.activeElement || !document.activeElement.closest('#settings-panel'));

                        if(isChatContextUpload) {
                            // Construct a prompt that might trigger RAG if the file name is indexed or generally make the LLM acknowledge.
                            const promptAboutFile = `I've just uploaded a file named "${file.name}". If this file has been processed into your knowledge base, please provide a brief summary or ask a pertinent question about its content. Otherwise, just acknowledge the upload.`;

                            // Add user message for this prompt
                            addMessageToChat('user', promptAboutFile, 'user');

                            // Directly call the backend with this message
                            // This is a simplified way of calling handleSendMessage's core logic
                            showLoading(true, 'Assistant is processing...');
                            fetchFromAPI('/chat', 'POST', {
                                message: promptAboutFile,
                                config: {
                                    ollama_url: currentConfig.ollamaBaseUrl,
                                    model: currentConfig.selectedModel,
                                    rag_enabled: currentConfig.ragEnabled,
                                }
                            }).then(aiResponse => {
                                addMessageToChat('assistant', aiResponse.response, aiResponse.type || 'assistant');
                            }).catch(err => {
                                // Error already handled by fetchFromAPI
                            }).finally(() => {
                                showLoading(false);
                            });
                        }
                    }
                })
                .catch(error => {
                    console.error('File upload error:', error);
                    uploadIndicator.textContent = `Error processing ${file.name}: ${error.message}`;
                    uploadIndicator.classList.remove('processing');
                    uploadIndicator.classList.add('error');
                });
        });
        fileUploadInput.value = ''; // Reset file input
    }

    function addFileToWorkspace(file) {
        const listItem = document.createElement('li');
        listItem.textContent = `📄 ${file.name}`; // Add icon based on file type later
        listItem.title = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
        listItem.dataset.fileName = file.name;
        listItem.addEventListener('click', () => {
            // Handle file click in workspace: e.g., preview, set as context for chat
            addMessageToChat('system', `Context set to file: ${file.name}`, 'system');
            // Potentially send a message to assistant to focus on this file
        });
        fileList.appendChild(listItem);
    }

    // Drag and Drop for Workspace
    function setupDragAndDrop() {
        workspaceDropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            workspaceDropZone.style.borderColor = 'var(--secondary-glow-color)'; // Highlight
        });
        workspaceDropZone.addEventListener('dragleave', () => {
            workspaceDropZone.style.borderColor = 'var(--primary-glow-color)'; // Reset highlight
        });
        workspaceDropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            workspaceDropZone.style.borderColor = 'var(--primary-glow-color)';
            if (event.dataTransfer.files) {
                handleFileUpload(event.dataTransfer.files, event); // Pass event
            }
        });
        // Also allow clicking on dropzone to trigger file input
        workspaceDropZone.addEventListener('click', () => fileUploadInput.click());
    }


    // --- Settings Panel Logic ---
    function switchTab(tabName) {
        tabContents.forEach(content => content.classList.remove('active'));
        tabButtons.forEach(button => button.classList.remove('active'));

        document.getElementById(tabName).classList.add('active');
        settingsPanel.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
    }

    async function loadModels() {
        showLoading(true, 'Fetching available models...');
        updateConnectionStatus('Fetching models...');
        try {
            const data = await fetchFromAPI(`/ollama/models?url=${encodeURIComponent(currentConfig.ollamaBaseUrl)}`);
            modelSelector.innerHTML = ''; // Clear existing options
            if (data.models && data.models.length > 0) {
                data.models.forEach(modelName => {
                    const option = document.createElement('option');
                    option.value = modelName;
                    option.textContent = modelName;
                    if (modelName === currentConfig.selectedModel) {
                        option.selected = true;
                    }
                    modelSelector.appendChild(option);
                });
                updateConnectionStatus('Models loaded.', false);
            } else {
                modelSelector.innerHTML = '<option value="">No models found</option>';
                updateConnectionStatus('No models found at the specified Ollama URL.', true);
            }
        } catch (error) {
            modelSelector.innerHTML = '<option value="">Error loading models</option>';
            updateConnectionStatus(`Error loading models: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }

    async function checkOllamaModelStatusAndUpdateUI(isInitialCheck = false) {
        if (modelLoadingInProgress && !isInitialCheck) return; // Don't stack checks if one is running, unless it's the explicit initial one

        modelLoadingInProgress = true;
        if (isInitialCheck) {
            isModelReady = false; // Assume not ready until confirmed
            modelRetryCount = 0;
            if (modelRetryInterval) clearInterval(modelRetryInterval);
            addMessageToChat('assistant', `Initializing connection to model: ${currentConfig.selectedModel}...`, 'system');
        }

        showLoading(true, `Syncing with ${currentConfig.selectedModel}...`);
        updateConnectionStatus(`Syncing with ${currentConfig.selectedModel}...`);

        try {
            const data = await fetchFromAPI('/ollama/status', 'POST', {
                ollama_url: currentConfig.ollamaBaseUrl,
                model: currentConfig.selectedModel
            });

            if (data.available) {
                isModelReady = true;
                modelLoadingInProgress = false;
                if (modelRetryInterval) clearInterval(modelRetryInterval);
                modelRetryInterval = null;
                updateConnectionStatus(`${currentConfig.selectedModel} is online. ${data.message || ''}`, false);
                showLoading(false);
                processMessageQueue();
                chatInput.disabled = false;
                sendButton.disabled = false;
                addMessageToChat('assistant', `${currentConfig.selectedModel} connection established. Ready for prompts.`, 'system');
            } else {
                // Model not available or error, could be loading
                isModelReady = false;
                updateConnectionStatus(`⚠️ ${data.message || 'Model not ready or error.'}`, true);
                showLoading(false); // Show the error message, not main loading spinner

                if (isInitialCheck || modelRetryCount < MAX_MODEL_RETRIES) {
                    if (isInitialCheck && !modelRetryInterval) { // Start retrying only on initial check failure
                         addMessageToChat('assistant', `Model ${currentConfig.selectedModel} is not immediately available. Will retry... (Attempt ${modelRetryCount + 1}/${MAX_MODEL_RETRIES})`, 'system');
                        modelRetryInterval = setInterval(() => {
                            checkOllamaModelStatusAndUpdateUI(false); // Subsequent checks are not 'initial'
                        }, MODEL_RETRY_DELAY);
                    }
                    if (!isInitialCheck) { // Only increment for retries, not the very first check
                        modelRetryCount++;
                        addMessageToChat('assistant', `Retrying model connection... (Attempt ${modelRetryCount + 1}/${MAX_MODEL_RETRIES})`, 'system');
                    }
                } else if (modelRetryCount >= MAX_MODEL_RETRIES) {
                    // Max retries reached
                    modelLoadingInProgress = false;
                    if (modelRetryInterval) clearInterval(modelRetryInterval);
                    modelRetryInterval = null;
                    const finalErrorMsg = `⚠️ Model ${currentConfig.selectedModel} failed to respond after multiple retries. Please check Ollama, try pulling the model, or select a different one.`;
                    updateConnectionStatus(finalErrorMsg, true);
                    addMessageToChat('assistant', finalErrorMsg, 'error');
                    chatInput.disabled = true; // Keep disabled if model ultimately fails
                    sendButton.disabled = true;
                }
            }
        } catch (error) {
            isModelReady = false;
            modelLoadingInProgress = false; // Allow retry attempt even on fetch error
            updateConnectionStatus(`Connection test failed: ${error.message}`, true);
            showLoading(false);
            // Potentially start retry here too if it's an intermittent network issue
            if (isInitialCheck && !modelRetryInterval && modelRetryCount < MAX_MODEL_RETRIES) {
                addMessageToChat('assistant', `Connection error. Will retry... (Attempt ${modelRetryCount + 1}/${MAX_MODEL_RETRIES})`, 'system');
                modelRetryInterval = setInterval(() => {
                    checkOllamaModelStatusAndUpdateUI(false);
                }, MODEL_RETRY_DELAY);
            }
        }
    }


    function processMessageQueue() {
        if (messageQueue.length > 0) {
            addMessageToChat('assistant', `Model is ready. Processing ${messageQueue.length} queued message(s)...`, 'system');
            // Send messages one by one to avoid overwhelming anything, though could also batch
            messageQueue.forEach(async (queuedMsg) => {
                // Simulate the core parts of handleSendMessage for each queued item
                // This needs to be careful to not re-queue if sending fails now
                try {
                    // Optimistically add to chat (already done when queued)
                    // addMessageToChat('user', queuedMsg.text, queuedMsg.image ? 'user_image' : 'user', queuedMsg.image ? queuedMsg.image.previewUrl : null);
                    showLoading(true, `Sending queued: ${queuedMsg.text.substring(0,20)}...`);

                    let requestBody;
                    if (queuedMsg.imageFile) {
                        const formData = new FormData();
                        formData.append('message', queuedMsg.text);
                        formData.append('image', queuedMsg.imageFile);
                        formData.append('config_ollama_url', currentConfig.ollamaBaseUrl);
                        formData.append('config_model', currentConfig.selectedModel);
                        formData.append('config_rag_enabled', currentConfig.ragEnabled);
                        requestBody = formData;
                    } else {
                        requestBody = {
                            message: queuedMsg.text,
                            config: {
                                ollama_url: currentConfig.ollamaBaseUrl,
                                model: currentConfig.selectedModel,
                                rag_enabled: currentConfig.ragEnabled,
                            }
                        };
                    }

                    const response = await fetch('/api/chat', { method: 'POST', body: requestBody });
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    if (data.image_url) {
                        addMessageToChat('assistant', data.response, 'assistant_image', data.image_url);
                    } else {
                        addMessageToChat('assistant', data.response, data.type || 'assistant');
                    }
                } catch (error) {
                    addMessageToChat('assistant', `Error sending queued message "${queuedMsg.text.substring(0,20)}...": ${error.message}`, 'error');
                } finally {
                    showLoading(false);
                }
            });
            messageQueue = []; // Clear queue
        }
    }


    function applyLedSettings() {
        document.body.className = ''; // Clear existing theme/led classes
        document.body.classList.add(`theme-${currentConfig.led.colorScheme}`);
        document.body.classList.add(`led-${currentConfig.led.mode}`);

        document.documentElement.style.setProperty('--glow-intensity-val', currentConfig.led.intensity); // Store raw value 0-1
        document.documentElement.style.setProperty('--glow-intensity', `${currentConfig.led.intensity * 10}px`);
        document.documentElement.style.setProperty('--glow-intensity-strong', `${currentConfig.led.intensity * 15}px`);
        document.documentElement.style.setProperty('--led-pulse-duration', `${currentConfig.led.pulseSpeed}s`);

        // For live preview in settings
        if (ledPreview) {
            ledPreview.style.borderColor = `var(--primary-glow-color)`;
            // Use the CSS var for intensity in preview to also show pulse if we add it there
            ledPreview.style.boxShadow = `0 0 var(--glow-intensity-strong) var(--primary-glow-color)`;
            ledPreview.style.color = `var(--primary-glow-color)`;
            ledPreview.style.animationDuration = `var(--led-pulse-duration)`; // If preview pulses
        }

        // Mouse glow visibility based on setting
        if (mouseGlowElement) {
            mouseGlowElement.style.display = currentConfig.led.mouseGlow && currentConfig.led.mode !== 'off' ? 'block' : 'none';
        }
    }

    function saveSettings() {
        // In a real app, this would send to backend or save to localStorage
        console.log("Settings saved (simulated):", currentConfig);
        localStorage.setItem('cyberAssistantConfig', JSON.stringify(currentConfig));
        addMessageToChat('system', 'Configuration matrix updated.', 'system');
    }

    function loadSettings() {
        const savedConfig = localStorage.getItem('cyberAssistantConfig');
        if (savedConfig) {
            currentConfig = JSON.parse(savedConfig);
        }
        // Apply loaded settings to UI elements
        ollamaUrlInput.value = currentConfig.ollamaBaseUrl;
        // modelSelector will be populated by loadModels, then selected

        ledModeSelect.value = currentConfig.led.mode;
        colorSchemeSelect.value = currentConfig.led.colorScheme;
        glowIntensitySlider.value = currentConfig.led.intensity;
        ledPulseSpeedSlider.value = currentConfig.led.pulseSpeed;
        mouseGlowSyncCheckbox.checked = currentConfig.led.mouseGlow;
        typingPulseEffectCheckbox.checked = currentConfig.led.typingPulse;

        ragEnabledCheckbox.checked = currentConfig.ragEnabled;
        // ... and other settings

        applyLedSettings(); // Apply visual settings on load
    }

    // --- Knowledge/RAG Specific Functions ---
    function handleKnowledgeUpload(files) {
        if (!files || files.length === 0) return;
        Array.from(files).forEach(file => {
            const formData = new FormData();
            formData.append('file', file);

            updateRagStatus(`Uploading ${file.name} to knowledge base...`, 'processing');

            fetch('/api/knowledge/upload', { method: 'POST', body: formData })
                .then(response => {
                    if (!response.ok) return response.json().then(err => { throw new Error(err.error || 'Upload failed')});
                    return response.json();
                })
                .then(data => {
                    updateRagStatus(data.message || `${file.name} added to knowledge.`, 'success');
                    loadKnowledgeFiles(); // Refresh list
                })
                .catch(error => {
                    updateRagStatus(`Error adding ${file.name}: ${error.message}`, 'error');
                });
        });
        knowledgeUploadInput.value = ''; // Reset input
    }

    async function loadKnowledgeFiles() {
        try {
            const data = await fetchFromAPI('/knowledge/list');
            knowledgeFileList.innerHTML = ''; // Clear list
            if (data.knowledge_files && data.knowledge_files.length > 0) {
                // Group files by original_doc_id to represent them as single entries
                const groupedFiles = {};
                data.knowledge_files.forEach(kf => {
                    const originalId = kf.metadata?.original_doc_id || kf.id.substring(0, kf.id.lastIndexOf('_chunk_') > 0 ? kf.id.lastIndexOf('_chunk_') : kf.id.length);
                    if (!groupedFiles[originalId]) {
                        groupedFiles[originalId] = {
                            name: kf.metadata?.source_filename || originalId.replace(/^file_/, ''),
                            id_to_delete: originalId, // This is the base ID for deletion
                            status: kf.metadata?.status || 'Processed', // Could aggregate statuses if complex
                            chunk_count: 0
                        };
                    }
                    groupedFiles[originalId].chunk_count++;
                });

                Object.values(groupedFiles).forEach(displayFile => {
                    const li = document.createElement('li');
                    li.innerHTML = `📘 ${displayFile.name} (${displayFile.status}, ${displayFile.chunk_count} chunk(s))
                                    <button class="delete-knowledge-btn" data-id="${displayFile.id_to_delete}" title="Delete all chunks for ${displayFile.name}">X</button>`;
                    knowledgeFileList.appendChild(li);
                });
            } else {
                knowledgeFileList.innerHTML = '<li>No documents in knowledge base.</li>';
            }
        } catch (error) {
            knowledgeFileList.innerHTML = '<li>Error loading knowledge files.</li>';
        }
    }

    async function deleteKnowledgeFile(docId) {
        if (!confirm(`Are you sure you want to delete document "${docId}" from the knowledge base?`)) return;
        try {
            updateRagStatus(`Deleting ${docId}...`, 'processing');
            await fetchFromAPI(`/knowledge/delete/${docId}`, 'DELETE');
            updateRagStatus(`Document ${docId} deleted.`, 'success');
            loadKnowledgeFiles(); // Refresh
        } catch (error) {
            updateRagStatus(`Error deleting ${docId}: ${error.message}`, 'error');
        }
    }

    function updateRagStatus(message, type = 'info') { // type: info, success, error, processing
        ragStatusIndicator.textContent = message;
        ragStatusIndicator.className = `file-upload-indicator ${type}`;
         if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (ragStatusIndicator.textContent === message) ragStatusIndicator.textContent = ''; // Clear only if it's the same message
            }, 5000);
        }
    }


    // --- Event Listeners ---
    // Chat
    sendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent newline in textarea
            handleSendMessage();
        }
    });
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    });

    // File Upload
    uploadButton.addEventListener('click', () => fileUploadInput.click());
    fileUploadInput.addEventListener('change', (e) => handleFileUpload(e.target.files, e)); // Pass event
    setupDragAndDrop(); // For workspace panel dropzone

    // Settings Panel Tabs
    tabButtons.forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Model Settings Listeners
    ollamaUrlInput.addEventListener('change', (e) => {
        currentConfig.ollamaBaseUrl = e.target.value;
        loadModels(); // Reload models if URL changes
        saveSettings();
    });
    modelSelector.addEventListener('change', (e) => {
        currentConfig.selectedModel = e.target.value;
        saveSettings();
    });
    testConnectionButton.addEventListener('click', testOllamaConnection);

    // LED Settings Listeners
    ledModeSelect.addEventListener('change', (e) => {
        currentConfig.led.mode = e.target.value;
        applyLedSettings();
        saveSettings();
    });
    colorSchemeSelect.addEventListener('change', (e) => {
        currentConfig.led.colorScheme = e.target.value;
        applyLedSettings();
        saveSettings();
    });
    glowIntensitySlider.addEventListener('input', (e) => { // 'input' for live update
        currentConfig.led.intensity = parseFloat(e.target.value);
        applyLedSettings();
        // No need to call saveSettings() on every slider move, maybe on 'change'
    });
    glowIntensitySlider.addEventListener('change', (e) => { // Save on final change
        currentConfig.led.intensity = parseFloat(e.target.value);
        saveSettings();
    });
    mouseGlowSyncCheckbox.addEventListener('change', (e) => {
        currentConfig.led.mouseGlow = e.target.checked;
        applyLedSettings();
        saveSettings();
    });
    typingPulseEffectCheckbox.addEventListener('change', (e) => {
        currentConfig.led.typingPulse = e.target.checked;
        // This effect is mostly CSS driven by class on input, but JS can toggle the class here if needed
        // Or, the CSS can react to a body class controlled by currentConfig.led.typingPulse
        saveSettings();
    });
    ledPulseSpeedSlider.addEventListener('input', (e) => {
        currentConfig.led.pulseSpeed = parseFloat(e.target.value);
        applyLedSettings();
    });
    ledPulseSpeedSlider.addEventListener('change', () => { // Save on final change
        saveSettings();
    });


    // Knowledge Settings Listeners
    ragEnabledCheckbox.addEventListener('change', (e) => {
        currentConfig.ragEnabled = e.target.checked;
        saveSettings();
    });
    knowledgeUploadInput.addEventListener('change', (e) => handleKnowledgeUpload(e.target.files));
    knowledgeFileList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-knowledge-btn')) {
            deleteKnowledgeFile(e.target.dataset.id);
        }
    });


    // Dynamic LED Effects
    // Mouse Glow
    let mouseGlowTimeout;
    document.addEventListener('mousemove', (e) => {
        if (currentConfig.led.mouseGlow && currentConfig.led.mode !== 'off' && mouseGlowElement) {
            mouseGlowElement.style.opacity = '1';
            mouseGlowElement.style.transform = `translate(${e.clientX - mouseGlowElement.offsetWidth / 2}px, ${e.clientY - mouseGlowElement.offsetHeight / 2}px)`;
            clearTimeout(mouseGlowTimeout);
            mouseGlowTimeout = setTimeout(() => {
                mouseGlowElement.style.opacity = '0';
            }, 200); // Fade out after a short delay
        }
    });

    // Typing Pulse
    let typingPulseTimeout;
    chatInput.addEventListener('keyup', () => {
        if (currentConfig.led.typingPulse && currentConfig.led.mode !== 'off') {
            chatInput.classList.add('typing-pulse');
            clearTimeout(typingPulseTimeout);
            typingPulseTimeout = setTimeout(() => {
                chatInput.classList.remove('typing-pulse');
            }, 500);
        }
    });

    // Settings Panel Toggle
    floatingSettingsButton.addEventListener('click', (event) => {
        event.stopPropagation();
        settingsPanel.classList.toggle('open');
        mainContainer.classList.toggle('settings-open');
        floatingSettingsButton.classList.add('clicked-animation');
        setTimeout(() => floatingSettingsButton.classList.remove('clicked-animation'), 300);
    });

    document.addEventListener('click', (event) => {
        if (settingsPanel.classList.contains('open') && !settingsPanel.contains(event.target) && event.target !== floatingSettingsButton) {
            settingsPanel.classList.remove('open');
            mainContainer.classList.remove('settings-open');
        }
    });

    // Model Settings Listeners (testConnectionButton is now checkOllamaModelStatusAndUpdateUI)
    ollamaUrlInput.addEventListener('change', (e) => {
        currentConfig.ollamaBaseUrl = e.target.value;
        loadModels().then(() => checkOllamaModelStatusAndUpdateUI(true)); // Re-check status after loading models with new URL
        saveSettings();
    });
    modelSelector.addEventListener('change', (e) => {
        currentConfig.selectedModel = e.target.value;
        checkOllamaModelStatusAndUpdateUI(true); // Check status of newly selected model
        saveSettings();
    });
    testConnectionButton.addEventListener('click', () => checkOllamaModelStatusAndUpdateUI(true)); // Manual ping


    // Chat Image Upload Listeners
    uploadImageButton.addEventListener('click', () => {
        chatImageInput.click();
    });

    chatImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            chatImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                chatImageThumbnail.src = e.target.result;
                imagePreviewArea.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            // Not an image or no file selected
            chatImageFile = null;
            imagePreviewArea.classList.add('hidden');
            chatImageInput.value = ''; // Reset if invalid file selected
        }
    });

    removeImageButton.addEventListener('click', () => {
        chatImageFile = null;
        chatImageThumbnail.src = '#';
        imagePreviewArea.classList.add('hidden');
        chatImageInput.value = ''; // Reset file input value
    });


    // --- Initialization ---
    function initializeApp() {
        fileList.innerHTML = '';
        knowledgeFileList.innerHTML = '';

        loadSettings();
        applyLedSettings(); // Apply LED settings from loaded config immediately

        // Load models and then check initial status
        loadModels().then(() => {
            checkOllamaModelStatusAndUpdateUI(true); // Initial model status check
        });

        loadKnowledgeFiles();

        addMessageToChat('assistant', 'System Online. Interface loaded.', 'system');
        if (currentConfig.chatHistoryEnabled) {
            addMessageToChat('assistant', 'Chat history module active (session persistence NYI).', 'system');
        } else {
            addMessageToChat('assistant', 'Chat history module inactive.', 'system');
        }

        if (!currentConfig.ollamaBaseUrl || !currentConfig.selectedModel) {
             addMessageToChat('assistant', 'Warning: Ollama URL or model not configured. Please check settings.', 'error');
             // Potentially disable chat input here until configured
             chatInput.disabled = true;
             sendButton.disabled = true;
        } else {
            // Initially disable chat until model status is known
            chatInput.disabled = true;
            sendButton.disabled = true;
            updateConnectionStatus("Initializing model connection...", false);
        }
    }

    initializeApp();
});
