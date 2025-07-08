document.addEventListener('DOMContentLoaded', () => {
    const chatOutput = document.getElementById('chat-output');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const uploadButton = document.getElementById('upload-button');
    const fileInput = document.getElementById('file-input');

    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModal = document.getElementById('close-settings-modal');
    const llmUrlInput = document.getElementById('llm-url');
    const checkModelsButton = document.getElementById('check-models-button');
    const modelStatus = document.getElementById('model-status');
    const modelSelect = document.getElementById('model-select');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const clearChatHistoryButton = document.getElementById('clear-chat-history-button');
    const accentColorSelect = document.getElementById('accent-color-select');

    let currentLLMUrl = localStorage.getItem('llmUrl') || 'http://localhost:11434';
    let currentModel = localStorage.getItem('selectedModel') || '';
    llmUrlInput.value = currentLLMUrl;
    let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    let currentAccentColor = localStorage.getItem('accentColor') || '#ff00ff'; // Default accent

    function applyAccentColor(color) {
        document.documentElement.style.setProperty('--accent-color', color);
        currentAccentColor = color;
        localStorage.setItem('accentColor', color);
        // Update select element to reflect the current color (e.g. on load)
        if (accentColorSelect) accentColorSelect.value = color;
    }
    applyAccentColor(currentAccentColor); // Apply initially

    // --- Utility Functions ---
    function appendMessage(content, sender, type = 'text', saveToHistory = true) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

        if (type === 'text') {
            const contentDiv = document.createElement('div');
            if (sender === 'ai') {
                // Sanitize AI HTML output if necessary, though marked should be safe
                // For now, directly using marked output.
                // Consider DOMPurify if AI could output malicious HTML/script tags and marked wasn't sanitizing.
                contentDiv.innerHTML = marked.parse(content);
            } else {
                // User messages are treated as plain text
                const p = document.createElement('p');
                p.textContent = content;
                contentDiv.appendChild(p);
            }
            messageDiv.appendChild(contentDiv);
        } else if (type === 'image') {
            const img = document.createElement('img');
            img.src = content; // content is URL/base64 for image
            img.alt = sender === 'user' ? 'User uploaded image' : 'AI generated image';
            img.src = text; // text is URL/base64 for image
            img.alt = sender === 'user' ? 'User uploaded image' : 'AI generated image';
            img.style.maxWidth = '100%';
            img.style.borderRadius = '5px';
            messageDiv.appendChild(img);
        }
        // Add more types like PDF later

        chatOutput.appendChild(messageDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight; // Auto-scroll

        if (saveToHistory) {
            chatHistory.push({ content, sender, type });
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        }
    }

    function loadChatHistory() {
        chatHistory.forEach(msg => appendMessage(msg.content, msg.sender, msg.type, false)); // false to prevent re-saving
    }

    function adjustTextareaHeight() {
        chatInput.style.height = 'auto'; // Reset height
        chatInput.style.height = (chatInput.scrollHeight) + 'px'; // Set to content height
    }

    // --- Event Listeners ---
    chatInput.addEventListener('input', adjustTextareaHeight);

    sendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    uploadButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // --- Chat Functionality ---
    async function handleSendMessage() {
        const messageText = chatInput.value.trim();
        if (messageText === '') return;

        appendMessage(messageText, 'user');
        chatInput.value = '';
        adjustTextareaHeight();

        // Simulate AI response (placeholder)
        // Later, this will call the actual LLM API
        setTimeout(() => {
            if (currentLLMUrl && currentModel) {
                fetchLLMResponse(messageText);
            } else {
                appendMessage("Please configure the LLM URL and select a model in settings.", 'ai');
            }
        }, 500);
    }

    async function fetchLLMResponse(prompt) {
        appendMessage("Thinking...", 'ai', 'thinking'); // Temporary thinking message

        // Remove "Thinking..." message before showing actual response or error
        const removeThinkingMessage = () => {
            const thinkingMessages = chatOutput.querySelectorAll('.ai-message div'); // Content is now in a div
            thinkingMessages.forEach(contentDiv => {
                // Check if the div only contains a p tag with "Thinking..."
                const pElement = contentDiv.querySelector('p');
                if (pElement && pElement.textContent === "Thinking...") {
                    contentDiv.closest('.ai-message').remove();
                }
            });
        };

        try {
            // This is a basic Ollama-compatible API call structure
            // For LM Studio, the endpoint might be /v1/chat/completions
            const response = await fetch(`${currentLLMUrl}/api/generate`, { // or /api/chat for conversational models
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: currentModel,
                    prompt: prompt,
                    stream: false // For simplicity, not handling streaming yet
                }),
            });

            removeThinkingMessage();

            if (!response.ok) {
                let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.detail || errorData.error || errorData.message || errorDetail;
                } catch (e) {
                    // If parsing error JSON fails, stick with the HTTP status
                }
                throw new Error(`API Error: ${errorDetail}`);
            }

            const data = await response.json();
            const aiText = data.response || (data.message && data.message.content) || (data.choices && data.choices[0].message.content);

            if (!aiText) {
                console.error("Unexpected API response structure:", data);
                throw new Error("AI server gave an unexpected response format. Check model compatibility.");
            }
            appendMessage(aiText, 'ai');

        } catch (error) {
            removeThinkingMessage();
            console.error('Error fetching LLM response:', error); // Full error to console

            let userMessage = "An unexpected error occurred while contacting the AI.";
            if (error.message.startsWith("API Error:")) {
                userMessage = `AI Server Error: ${error.message.substring(10).trim()}. Please check your model or server.`;
            } else if (error instanceof TypeError) { // Typically network errors like "Failed to fetch"
                userMessage = "Could not reach the AI server. Please check the LLM URL in settings and your network connection.";
            } else if (error.message.includes("unexpected response format")) {
                userMessage = error.message;
            }
            appendMessage(userMessage, 'ai');
        }
    }


    function handleFileUpload(file) {
        appendMessage(`File selected: ${file.name}`, 'user');
        // For images, display a preview
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                appendMessage(e.target.result, 'user', 'image');
                // Placeholder for sending image data to AI (if supported)
                setTimeout(() => appendMessage("I've received the image. (Image processing not implemented yet)", 'ai'), 500);
            };
            reader.readAsDataURL(file);
        } else {
             // Placeholder for other file types
            setTimeout(() => appendMessage(`Received file: ${file.name}. (File content processing not implemented yet)`, 'ai'), 500);
        }
        fileInput.value = ''; // Reset file input
    }

    // --- Settings Modal Functionality ---
    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        llmUrlInput.value = currentLLMUrl; // Populate with current or saved URL
        if (currentLLMUrl) fetchAvailableModels(); // Try to fetch models if URL is set
    });

    closeSettingsModal.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    checkModelsButton.addEventListener('click', fetchAvailableModels);

    async function fetchAvailableModels() {
        const url = llmUrlInput.value.trim();
        if (!url) {
            modelStatus.textContent = 'Please enter an LLM Server URL.';
            modelStatus.style.color = 'var(--accent-color)';
            return;
        }

        currentLLMUrl = url; // Update current URL for this session
        modelStatus.textContent = 'Checking models...';
        modelStatus.style.color = 'var(--secondary-color)';
        modelSelect.innerHTML = '<option value="">-- Select a Model --</option>'; // Clear previous models

        try {
            // Ollama uses /api/tags, LM Studio might use /v1/models
            // Trying Ollama first
            let models = [];
            let errorMessages = [];

            try {
                const responseOllama = await fetch(`${currentLLMUrl}/api/tags`);
                if (responseOllama.ok) {
                    const dataOllama = await responseOllama.json();
                    models = dataOllama.models ? dataOllama.models.map(m => m.name) : [];
                } else {
                    errorMessages.push(`Ollama API (/api/tags) error: ${responseOllama.status}`);
                }
            } catch (e) {
                 errorMessages.push(`Failed to fetch from Ollama endpoint: ${e.message}`);
            }

            if (models.length === 0) { // If Ollama failed or returned no models, try LM Studio
                 try {
                    const responseLMStudio = await fetch(`${currentLLMUrl}/v1/models`);
                    if (responseLMStudio.ok) {
                        const dataLMStudio = await responseLMStudio.json();
                        models = dataLMStudio.data ? dataLMStudio.data.map(m => m.id) : [];
                    } else {
                         errorMessages.push(`LM Studio API (/v1/models) error: ${responseLMStudio.status}`);
                    }
                } catch (e) {
                    errorMessages.push(`Failed to fetch from LM Studio endpoint: ${e.message}`);
                }
            }


            if (models.length > 0) {
                models.forEach(modelName => {
                    const option = document.createElement('option');
                    option.value = modelName;
                    option.textContent = modelName;
                    if (modelName === currentModel) {
                        option.selected = true;
                    }
                    modelSelect.appendChild(option);
                });
                modelStatus.textContent = `Found ${models.length} model(s). Select one.`;
                modelStatus.style.color = 'var(--text-color)';
            } else {
                modelStatus.textContent = 'No models found or error fetching. ' + errorMessages.join('; ');
                modelStatus.style.color = 'var(--accent-color)';
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            modelStatus.textContent = `Error fetching models: ${error.message}`;
            modelStatus.style.color = 'var(--accent-color)';
        }
    }

    saveSettingsButton.addEventListener('click', () => {
        currentLLMUrl = llmUrlInput.value.trim();
        currentModel = modelSelect.value;
        const selectedAccentColor = accentColorSelect.value;

        if (currentLLMUrl) {
            localStorage.setItem('llmUrl', currentLLMUrl);
        } else {
            localStorage.removeItem('llmUrl');
        }
        if (currentModel) {
            localStorage.setItem('selectedModel', currentModel);
        } else {
            localStorage.removeItem('selectedModel');
        }

        applyAccentColor(selectedAccentColor);

        appendMessage(`Settings saved. LLM URL: ${currentLLMUrl || 'Not set'}, Model: ${currentModel || 'Not set'}, Accent: ${selectedAccentColor}`, 'ai');
        settingsModal.style.display = 'none';
    });

    // Function to open/populate settings - reusable for button and shortcut
    function openSettingsModal() {
        settingsModal.style.display = 'block';
        llmUrlInput.value = currentLLMUrl;
        accentColorSelect.value = currentAccentColor;
        // Fetch models if URL is set and models aren't already populated or if no model is selected
        if (currentLLMUrl && (modelSelect.options.length <= 1 || !currentModel)) {
            fetchAvailableModels();
        }
    }

    // Ensure accent color select is populated correctly when settings open
    settingsButton.addEventListener('click', openSettingsModal);


    clearChatHistoryButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the entire chat history? This cannot be undone.")) {
            chatHistory = [];
            localStorage.removeItem('chatHistory');
            chatOutput.innerHTML = ''; // Clear the visible chat
            appendMessage("Chat history cleared.", 'ai', 'text', false); // Add a system message, don't save this specific one to history
            // Optionally, re-add the welcome message
            if (currentLLMUrl && currentModel) {
                appendMessage(`Using LLM URL: ${currentLLMUrl} and Model: ${currentModel}. (History Cleared)`, 'ai');
            } else if (currentLLMUrl) {
                appendMessage(`LLM URL set to: ${currentLLMUrl}. Please select a model in settings. (History Cleared)`, 'ai');
            } else {
                appendMessage("Welcome! Please configure your LLM Server URL and select a model in the settings (cog icon). (History Cleared)", 'ai');
            }
        }
    });

    // Initial load:
    loadChatHistory(); // Load history first
    adjustTextareaHeight(); // Initial adjustment for placeholder

    // Display initial welcome/status message only if chat history is empty
    // or if the last message isn't the status message (to avoid duplication on simple reloads)
    const shouldShowWelcome = chatHistory.length === 0 ||
                             (chatHistory.length > 0 && !chatHistory[chatHistory.length -1].content.startsWith("Using LLM URL:") &&
                              !chatHistory[chatHistory.length -1].content.startsWith("LLM URL set to:") &&
                              !chatHistory[chatHistory.length -1].content.startsWith("Welcome!"));

    if (shouldShowWelcome) {
        if (currentLLMUrl && currentModel) {
            appendMessage(`Using LLM URL: ${currentLLMUrl} and Model: ${currentModel}. (New session started or history cleared)`, 'ai');
        } else if (currentLLMUrl) {
            appendMessage(`LLM URL set to: ${currentLLMUrl}. Please select a model in settings. (New session started or history cleared)`, 'ai');
            if (settingsModal.style.display !== 'block') fetchAvailableModels(); // Attempt to populate models if URL is already set and settings not open
        } else {
            appendMessage("Welcome! Please configure your LLM Server URL and select a model in the settings (cog icon).", 'ai');
        }
    } else {
        // If history is loaded, still try to fetch models if settings are opened later and URL is present
        if (currentLLMUrl && modelSelect.options.length <=1) { // <=1 because of the default "-- Select a Model --"
             if (settingsModal.style.display === 'block' || !currentModel) { // Fetch if settings open or no model selected
                fetchAvailableModels();
             }
        }
    }

    // Keyboard shortcut for settings
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === ',') {
            event.preventDefault(); // Prevent browser default for Ctrl+, if any
            if (settingsModal.style.display === 'block') {
                settingsModal.style.display = 'none';
            } else {
                openSettingsModal();
            }
        }
    });
});
