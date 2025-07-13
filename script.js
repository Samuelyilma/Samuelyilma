document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtn = document.querySelector('.close-btn');
    const ollamaUrlInput = document.getElementById('ollama-url');
    const lmstudioUrlInput = document.getElementById('lmstudio-url');
    const scanModelsBtn = document.getElementById('scan-models-btn');
    const modelSelect = document.getElementById('model-select');
    const glowToggle = document.getElementById('glow-toggle');
    const glowColorInput = document.getElementById('glow-color');
    const animationToggle = document.getElementById('animation-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const ollamaStatus = document.getElementById('ollama-status');
    const lmstudioStatus = document.getElementById('lmstudio-status');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');

    // Load settings from localStorage
    const loadSettings = () => {
        ollamaUrlInput.value = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        lmstudioUrlInput.value = localStorage.getItem('lmstudioUrl') || 'http://localhost:1234';
        glowToggle.checked = localStorage.getItem('glowEnabled') !== 'false';
        glowColorInput.value = localStorage.getItem('glowColor') || '#00ffde';
        animationToggle.checked = localStorage.getItem('animationEnabled') !== 'false';
        soundToggle.checked = localStorage.getItem('soundEnabled') === 'true';
        updateAppearance();
    };

    // Save settings to localStorage
    const saveSettings = () => {
        localStorage.setItem('ollamaUrl', ollamaUrlInput.value);
        localStorage.setItem('lmstudioUrl', lmstudioUrlInput.value);
        localStorage.setItem('glowEnabled', glowToggle.checked);
        localStorage.setItem('glowColor', glowColorInput.value);
        localStorage.setItem('animationEnabled', animationToggle.checked);
        localStorage.setItem('soundEnabled', soundToggle.checked);
    };

    // Update appearance based on settings
    const updateAppearance = () => {
        document.documentElement.style.setProperty('--glow-color', glowToggle.checked ? glowColorInput.value : 'transparent');
        document.getElementById('background-animation').style.display = animationToggle.checked ? 'block' : 'none';
    };

    // --- Event Listeners ---
    settingsBtn.addEventListener('click', () => settingsModal.style.display = 'block');
    closeBtn.addEventListener('click', () => settingsModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Settings panel listeners
    ollamaUrlInput.addEventListener('change', saveSettings);
    lmstudioUrlInput.addEventListener('change', saveSettings);
    glowToggle.addEventListener('change', () => { saveSettings(); updateAppearance(); });
    glowColorInput.addEventListener('input', () => { saveSettings(); updateAppearance(); });
    animationToggle.addEventListener('change', () => { saveSettings(); updateAppearance(); });
    soundToggle.addEventListener('change', saveSettings);

    // --- Server Communication ---
    const checkServerStatus = async (url, statusElement) => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                statusElement.classList.add('connected');
            } else {
                statusElement.classList.remove('connected');
            }
        } catch (error) {
            statusElement.classList.remove('connected');
        }
    };

    const scanModels = async () => {
        modelSelect.innerHTML = '<option>Scanning...</option>';
        const ollamaUrl = ollamaUrlInput.value;
        const lmstudioUrl = lmstudioUrlInput.value; // Note: LM Studio API path might differ

        let models = [];

        // Scan Ollama
        try {
            const response = await fetch(`${ollamaUrl}/api/tags`);
            const data = await response.json();
            models = models.concat(data.models.map(m => ({ name: `Ollama: ${m.name}`, server: 'ollama' })));
        } catch (error) {
            console.error('Error scanning Ollama models:', error);
        }

        // Scan LM Studio (placeholder - API endpoint might be different)
        try {
            // This is a guess, LM Studio's API might not have a public model list endpoint
            const response = await fetch(`${lmstudioUrl}/v1/models`);
            const data = await response.json();
             models = models.concat(data.data.map(m => ({ name: `LM Studio: ${m.id}`, server: 'lmstudio' })));
        } catch (error) {
            console.error('Error scanning LM Studio models:', error);
        }

        modelSelect.innerHTML = models.length > 0
            ? models.map(m => `<option value="${m.name}">${m.name}</option>`).join('')
            : '<option>No models found</option>';
    };

    const sendMessage = async () => {
        const message = messageInput.value.trim();
        if (!message) return;

        appendMessage('user', message);
        messageInput.value = '';

        const selectedModel = modelSelect.value;
        const server = selectedModel.startsWith('Ollama') ? 'ollama' : 'lmstudio';
        const modelName = selectedModel.replace(/^(Ollama: |LM Studio: )/, '');
        const url = server === 'ollama' ? ollamaUrlInput.value : lmstudioUrlInput.value;

        try {
            const response = await fetch(`${url}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: message }],
                    stream: false
                })
            });

            const data = await response.json();
            appendMessage('assistant', data.message.content);

        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage('assistant', 'Error: Could not connect to the AI server.');
        }
    };

    const appendMessage = (role, content) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${role}-message`);
        messageElement.textContent = content;
        chatHistory.appendChild(messageElement);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    };


    // --- Event Listeners ---
    scanModelsBtn.addEventListener('click', scanModels);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Initial load
    loadSettings();
    checkServerStatus(ollamaUrlInput.value, ollamaStatus);
    checkServerStatus(lmstudioUrlInput.value, lmstudioStatus);
    setInterval(() => {
        checkServerStatus(ollamaUrlInput.value, ollamaStatus);
        checkServerStatus(lmstudioUrlInput.value, lmstudioStatus);
    }, 10000);
});
