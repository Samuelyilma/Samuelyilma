document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const uploadButton = document.getElementById('upload-button');
    const fileUploadInput = document.getElementById('file-upload-input');
    const fileList = document.getElementById('file-list'); // For workspace
    const workspaceDropZone = document.getElementById('workspace-dropzone');

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
    // Knowledge Settings
    const ragEnabledCheckbox = document.getElementById('rag-enabled');
    const knowledgeUploadInput = document.getElementById('knowledge-upload-input');
    const knowledgeFileList = document.getElementById('knowledge-file-list');
    const ragStatusIndicator = document.getElementById('rag-status-indicator');

    const mouseGlowElement = document.querySelector('.mouse-glow');

    // --- Initial State & Configuration ---
    let currentConfig = {
        ollamaBaseUrl: 'http://localhost:11434',
        selectedModel: 'gemma:4b', // Default, will be fetched
        led: {
            mode: 'reactive', // reactive, full-glow, off
            colorScheme: 'neon-blue', // neon-blue, purple, red, rainbow
            intensity: 0.7,
            mouseGlow: true,
            typingPulse: true,
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
        if (text.includes("```")) {
            text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
                const language = ''; // Basic, no language detection for now
                return `<pre><code class="${language}">${escapeHtml(code.trim())}</code></pre>`;
            });
            messageDiv.innerHTML = text; // Use innerHTML if Markdown is processed
        } else {
            messageDiv.textContent = text;
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
        const headers = { 'Content-Type': 'application/json' };
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

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
        if (!messageText) return;

        addMessageToChat('user', messageText, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto'; // Reset height
        showLoading(true, 'Assistant is processing...');

        try {
            // Include workspace context if available (selected file, etc.)
            // For now, just sending the message
            const data = await fetchFromAPI('/chat', 'POST', {
                message: messageText,
                // context: getWorkspaceContext(), // Future: add context
                config: { // Send relevant parts of current config
                    ollama_url: currentConfig.ollamaBaseUrl,
                    model: currentConfig.selectedModel,
                    rag_enabled: currentConfig.ragEnabled,
                }
            });
            addMessageToChat('assistant', data.response, data.type || 'assistant'); // data.type could be 'rag'
        } catch (error) {
            // Error already added by fetchFromAPI, but we can add more specifics if needed
            // addMessageToChat('assistant', `Error communicating with AI: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    // --- File Upload & Workspace ---
    function handleFileUpload(files, event = null) { // Added event parameter
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

    async function testOllamaConnection() {
        showLoading(true, `Pinging ${currentConfig.selectedModel}...`);
        updateConnectionStatus(`Pinging ${currentConfig.selectedModel}...`);
        try {
            const data = await fetchFromAPI('/ollama/status', 'POST', {
                ollama_url: currentConfig.ollamaBaseUrl,
                model: currentConfig.selectedModel
            });
            if (data.available) {
                updateConnectionStatus(`${currentConfig.selectedModel} is responsive. ${data.message || ''}`, false);
            } else {
                updateConnectionStatus(`${currentConfig.selectedModel} not available or Ollama error: ${data.message || 'Unknown issue.'}`, true);
            }
        } catch (error) {
             updateConnectionStatus(`Connection test failed: ${error.message}`, true);
        } finally {
            showLoading(false);
        }
    }

    function applyLedSettings() {
        document.body.className = ''; // Clear existing theme/led classes
        document.body.classList.add(`theme-${currentConfig.led.colorScheme}`);
        document.body.classList.add(`led-${currentConfig.led.mode}`);

        document.documentElement.style.setProperty('--glow-intensity', `${currentConfig.led.intensity * 10}px`);
        document.documentElement.style.setProperty('--glow-intensity-strong', `${currentConfig.led.intensity * 15}px`);

        // For live preview in settings
        if (ledPreview) {
            ledPreview.style.borderColor = `var(--primary-glow-color)`;
            ledPreview.style.boxShadow = `0 0 ${currentConfig.led.intensity * 15}px var(--primary-glow-color)`;
            ledPreview.style.color = `var(--primary-glow-color)`;
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


    // --- Initialization ---
    function initializeApp() {
        fileList.innerHTML = ''; // Clear static/dummy file list items
        knowledgeFileList.innerHTML = ''; // Clear static/dummy knowledge items

        loadSettings(); // Load saved settings first
        loadModels();   // Then load models based on (possibly loaded) URL
        loadKnowledgeFiles(); // Load RAG files
        // applyLedSettings(); // Already called in loadSettings

        addMessageToChat('assistant', 'System Online. Awaiting your command.', 'system');
        if (currentConfig.chatHistoryEnabled) {
            addMessageToChat('assistant', 'Chat history module active (session persistence NYI).', 'system');
        } else {
            addMessageToChat('assistant', 'Chat history module inactive.', 'system');
        }

        if (!currentConfig.ollamaBaseUrl || !currentConfig.selectedModel) {
             addMessageToChat('assistant', 'Warning: Ollama URL or model not configured. Please check settings.', 'error');
        }
    }

    initializeApp();
});
