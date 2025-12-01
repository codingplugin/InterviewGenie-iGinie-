const { ipcRenderer } = require('electron');

// DOM Elements
let chatContainer;
let messageInput;
let sendBtn;
let settingsBtn;
let settingsModal;
let apiKeyInput;
let modelInput;
let saveSettingsBtn;
let closeSettingsBtn;
let minimizeBtn;
let closeBtn;
let opacitySlider;
let languageSelect;
let helpBtn;
let helpModal;
let closeHelpBtn;

// State
let apiKey = localStorage.getItem('gemini-api-key') || '';
let customModelId = localStorage.getItem('gemini-model-id') || '';
let selectedLanguage = localStorage.getItem('coding-language') || 'auto';
let conversationHistory = [];

// Voice Recording (MediaRecorder)
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isCtrlLPressed = false;
let audioContext = null;
let audioStream = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing chatbot...');

    // Get DOM elements
    chatContainer = document.getElementById('chatContainer');
    messageInput = document.getElementById('messageInput');
    sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    settingsBtn = document.getElementById('settingsBtn');
    settingsModal = document.getElementById('settingsModal');
    apiKeyInput = document.getElementById('apiKeyInput');
    modelInput = document.getElementById('modelInput');
    saveSettingsBtn = document.getElementById('saveSettingsBtn');
    closeSettingsBtn = document.getElementById('closeSettingsBtn');
    minimizeBtn = document.getElementById('minimizeBtn');
    closeBtn = document.getElementById('closeBtn');
    opacitySlider = document.getElementById('opacitySlider');
    languageSelect = document.getElementById('languageSelect');
    helpBtn = document.getElementById('helpBtn');
    helpModal = document.getElementById('helpModal');
    closeHelpBtn = document.getElementById('closeHelpBtn');

    // Load saved settings
    if (apiKey) {
        apiKeyInput.value = apiKey;
    }
    if (customModelId) {
        modelInput.value = customModelId;
    }

    // Load saved language
    if (languageSelect) {
        languageSelect.value = selectedLanguage;
        languageSelect.addEventListener('change', () => {
            selectedLanguage = languageSelect.value;
            localStorage.setItem('coding-language', selectedLanguage);
            console.log('Language changed to:', selectedLanguage);
        });
    }

    // Event listeners
    sendBtn.addEventListener('click', () => sendMessage());

    // Clear Chat Logic
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the chat history?')) {
                chatContainer.innerHTML = `
                    <div class="welcome-message">
                        <h2>👋 Welcome!</h2>
                        <p>Ask me anything about coding, algorithms, or technical concepts.</p>
                        <p class="hint">This window is invisible during screen sharing.</p>
                    </div>
                `;
                conversationHistory = [];
                addSystemMessage('🧹 Chat cleared');
            }
        });
    }

    messageInput.addEventListener('keydown', (e) => {
        // Don't interfere with shortcuts
        if (e.ctrlKey && (e.key.toLowerCase() === 'l' || e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'p')) {
            return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Settings modal
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('show');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });

    saveSettingsBtn.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        customModelId = modelInput.value.trim();

        if (apiKey) {
            localStorage.setItem('gemini-api-key', apiKey);
            localStorage.setItem('gemini-model-id', customModelId);

            addSystemMessage('✅ Settings saved successfully!');
            settingsModal.classList.remove('show');
        } else {
            addSystemMessage('❌ Please enter a valid API key');
        }
    });

    // Help modal
    if (helpBtn && helpModal && closeHelpBtn) {
        helpBtn.addEventListener('click', () => {
            helpModal.classList.add('show');
        });

        closeHelpBtn.addEventListener('click', () => {
            helpModal.classList.remove('show');
        });
    }

    // Window controls
    minimizeBtn.addEventListener('click', () => {
        ipcRenderer.send('minimize-app');
    });

    closeBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to close?')) {
            ipcRenderer.send('close-app');
        }
    });

    opacitySlider.addEventListener('input', (e) => {
        ipcRenderer.send('set-opacity', e.target.value / 100);
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });

    // Setup Audio Recording
    setupAudioRecording();

    // Setup Screen Capture
    setupScreenCapture();

    console.log('Chatbot ready! Press Ctrl+L (Audio), Ctrl+S (Screen), Ctrl+P (Area).');
});

// Screen Capture Setup
function setupScreenCapture() {
    document.addEventListener('keydown', async (e) => {
        // Ctrl+S to capture full screen
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            await captureScreen('full');
        }

        // Ctrl+P to capture area behind app
        if (e.ctrlKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            await captureScreen('area');
        }
    });
}

async function captureScreen(mode = 'full') {
    if (!apiKey) {
        addSystemMessage('⚠️ Please set your API key in settings first');
        settingsModal.classList.add('show');
        return;
    }

    const msg = mode === 'area' ? '📸 Capturing area behind app...' : '📸 Capturing full screen...';
    addMessage(msg, 'user');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Analyzing...';

    try {
        // Request screen capture from main process
        const channel = mode === 'area' ? 'capture-area' : 'capture-screen';
        const imageBase64 = await ipcRenderer.invoke(channel);

        // Send to Gemini
        const response = await callGeminiAPI(null, null, imageBase64);
        addMessage(response, 'ai');

    } catch (error) {
        console.error('Screen capture error:', error);
        addSystemMessage('❌ Screen capture failed: ' + error.message);
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

// Audio Recording Setup
async function setupAudioRecording() {
    // Check for MediaRecorder support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Audio recording not supported');
        addSystemMessage('⚠️ Audio recording not supported in this environment');
        return;
    }

    // Push-to-talk: Hold Ctrl+L to record
    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();

            if (!isCtrlLPressed && !isRecording) {
                isCtrlLPressed = true;
                await startRecording();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Control' || e.key.toLowerCase() === 'l') {
            if (isCtrlLPressed) {
                isCtrlLPressed = false;
                stopRecording();
            }
        }
    });
}

async function startRecording() {
    try {
        let finalStream;

        try {
            // 1. Get System Audio (Desktop)
            const sourceId = await ipcRenderer.invoke('get-desktop-source-id');
            const systemStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                },
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                }
            });

            // 2. Get Microphone Audio
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // 3. Mix them using AudioContext with STEREO SEPARATION
            audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();
            destination.channelCount = 2; // Ensure stereo output

            // Mic Source -> Pan LEFT (-1)
            const micSource = audioContext.createMediaStreamSource(micStream);
            const micPanner = audioContext.createStereoPanner();
            micPanner.pan.value = -1; // Full Left
            micSource.connect(micPanner);
            micPanner.connect(destination);

            // System Source -> Pan RIGHT (+1)
            const systemSource = audioContext.createMediaStreamSource(systemStream);
            const systemPanner = audioContext.createStereoPanner();
            systemPanner.pan.value = 1; // Full Right
            systemSource.connect(systemPanner);
            systemPanner.connect(destination);

            finalStream = destination.stream;
            audioStream = finalStream; // Keep reference to stop later

            // Note: We don't need the video track from system stream
            systemStream.getVideoTracks().forEach(track => track.stop());

        } catch (mixError) {
            console.warn('System audio capture failed, falling back to mic only:', mixError);
            // Fallback: Mic only
            finalStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStream = finalStream;
        }

        // 4. Start Recording
        // Important: Request stereo recording
        mediaRecorder = new MediaRecorder(finalStream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
        });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            // Create audio blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

            // Convert to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64Audio = reader.result.split(',')[1];
                sendAudioMessage(base64Audio);
            };

            // Stop all tracks
            finalStream.getTracks().forEach(track => track.stop());
            if (audioContext) audioContext.close();
        };

        mediaRecorder.start();
        isRecording = true;
        console.log('🎤 Recording started (Stereo: Mic=Left, System=Right)');
        showListeningIndicator();

    } catch (err) {
        console.error('Error starting recording:', err);
        addSystemMessage('❌ Could not access audio: ' + err.message);
        isCtrlLPressed = false; // Reset state
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        console.log('🎤 Recording stopped');
        hideListeningIndicator();
    }
}

function showListeningIndicator() {
    // Remove welcome message if exists
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    // Create listening indicator
    let indicator = document.getElementById('listening-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'listening-indicator';
        indicator.className = 'listening-indicator';
        indicator.innerHTML = `
            <div class="listening-content">
                <div class="listening-animation">
                    <div class="pulse"></div>
                    <div class="pulse"></div>
                    <div class="pulse"></div>
                </div>
                <div class="listening-text">🎤 Recording... (Release Ctrl+L to send)</div>
            </div>
        `;
        chatContainer.appendChild(indicator);
    }

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideListeningIndicator() {
    const indicator = document.getElementById('listening-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Send Audio Message
async function sendAudioMessage(base64Audio) {
    if (!apiKey) {
        addSystemMessage('⚠️ Please set your API key in settings first');
        settingsModal.classList.add('show');
        return;
    }

    addMessage('🎤 Audio Question Sent', 'user');

    // Disable send button
    sendBtn.disabled = true;
    sendBtn.textContent = 'Thinking...';

    try {
        // Call Gemini API with Audio
        let response = await callGeminiAPI(null, base64Audio, null);

        // Check for transcription
        if (response.startsWith('TRANSCRIPTION:')) {
            const splitIndex = response.indexOf('\n');
            if (splitIndex !== -1) {
                const transcription = response.substring(14, splitIndex).trim(); // 14 is length of "TRANSCRIPTION: "
                const answer = response.substring(splitIndex).trim();

                // Update the last user message with the transcription
                const userMessages = chatContainer.querySelectorAll('.message.user .message-content');
                if (userMessages.length > 0) {
                    userMessages[userMessages.length - 1].textContent = '🎤 ' + transcription;
                }

                response = answer;
            }
        }

        addMessage(response, 'ai');
    } catch (error) {
        console.error('Error:', error);
        addSystemMessage('❌ Error: ' + error.message);
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

// Send Text Message
async function sendMessage() {
    const message = messageInput.value.trim();

    if (!message) return;

    if (!apiKey) {
        addSystemMessage('⚠️ Please set your API key in settings first');
        settingsModal.classList.add('show');
        return;
    }

    // Add user message to chat
    addMessage(message, 'user');

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Disable send button
    sendBtn.disabled = true;
    sendBtn.textContent = 'Thinking...';

    try {
        // Call Gemini API with Text
        const response = await callGeminiAPI(message, null, null);
        addMessage(response, 'ai');
    } catch (error) {
        console.error('Error:', error);
        addSystemMessage('❌ Error: ' + error.message);
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
    }
}

// Add message to chat
function addMessage(text, type) {
    // Remove welcome message if it exists
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? '👤' : '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Store in history
    conversationHistory.push({ role: type, content: text });
}

// Add system message
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    messageDiv.style.alignSelf = 'center';
    messageDiv.style.maxWidth = '100%';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.style.background = 'rgba(52, 211, 153, 0.1)';
    content.style.borderColor = 'rgba(52, 211, 153, 0.3)';
    content.style.color = '#34d399';
    content.style.textAlign = 'center';
    content.textContent = text;

    messageDiv.appendChild(content);
    chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Call Gemini API
async function callGeminiAPI(prompt, audioBase64 = null, imageBase64 = null) {
    // Default models to try if no custom model is specified
    const defaultModels = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];

    // If user specified a custom model, try that FIRST.
    // If it fails, we can optionally fall back to defaults, or just fail.
    // For now, let's prioritize the custom model.
    let modelsToTry = [...defaultModels];

    if (customModelId && customModelId.trim() !== '') {
        // Prepend custom model to the list
        modelsToTry = [customModelId.trim(), ...defaultModels];
        console.log('Using custom model preference:', customModelId);
    }

    let lastError = null;

    // Construct language instruction
    let languageInstruction = '';
    if (selectedLanguage && selectedLanguage !== 'auto') {
        const langName = selectedLanguage.toUpperCase();
        languageInstruction = `\nIMPORTANT: All coding solutions MUST be written in ${langName}. Do not use any other language.`;
    }

    for (const model of modelsToTry) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const parts = [];

            // Add system prompt
            parts.push({
                text: `You are an expert interview coach helping someone answer technical interview questions.

IMPORTANT RULES:
1. Give CONCISE answers 
2. Sound NATURAL and CONVERSATIONAL - like a real person talking in an interview
3. Avoid robotic or overly formal language
4. For technical concepts: Give the key points, maybe one example, then stop
5. For coding questions: Provide clean, working code with minimal comments
6. **NO GREETINGS OR FILLER**: Do not say "Here is the answer", "I understand", "Sure", or "Let me help". JUST GIVE THE ANSWER.
7. Use simple, clear language that's easy to read aloud
8. If it's a "what is" question, give a brief definition and one practical use case
9. If it's a "how to" question, give the approach in 3-4 steps maximum
10. Never write long paragraphs - keep it punchy and memorable
11. If it's a "why" question, give the reason and one example
12. If it's a "what are the differences between" question, give the differences with points and one example
13. Give the answer in points if necessary.
14. Answer the question in sequence of what is asked
${languageInstruction}

${audioBase64 ? 'INSTRUCTION: The user has provided an audio recording. This audio is STEREO. \n- **LEFT CHANNEL**: This is the CANDIDATE (User).\n- **RIGHT CHANNEL**: This is the INTERVIEWER.\n\nYour task is to:\n1. Identify who is speaking based on the channel.\n2. If the INTERVIEWER (Right Channel) asks a question, provide the answer for the Candidate to say.\n3. If the CANDIDATE (Left Channel) asks you for help, answer their specific request.\n4. Start your response with "TRANSCRIPTION: " followed by a transcript of the audio (labeling speakers as [Interviewer] or [Candidate] if possible). Then, add a newline and provide the ANSWER.' : ''}
${imageBase64 ? 'INSTRUCTION: The user has provided a screenshot. This image likely contains a Data Structures & Algorithms (DSA) problem, a coding challenge, or a technical interview question.\nYour task is to:\n1. **Analyze the image** to extract the problem statement or code.\n2. **Solve the problem**:\n   * If it\'s a **DSA/Coding problem**: Provide the optimal solution code immediately. Keep explanations brief but mention Time/Space complexity.\n   * If it\'s a **Multiple Choice Question**: State the correct option and a one-sentence reason.\n   * If it\'s a **Conceptual Question**: Answer concisely following the main rules.\n3. **Ignore** any irrelevant screen elements and focus on the technical content.' : ''}`
            });

            // Add Audio if present
            if (audioBase64) {
                parts.push({
                    inline_data: {
                        mime_type: "audio/webm",
                        data: audioBase64
                    }
                });
            }

            // Add Image if present
            if (imageBase64) {
                parts.push({
                    inline_data: {
                        mime_type: "image/png",
                        data: imageBase64
                    }
                });
            }

            // Add User Text Prompt if present
            if (prompt) {
                parts.push({ text: `User Question: ${prompt}` });
            }

            const requestBody = {
                contents: [{ parts: parts }]
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || 'API request failed');
            }

            const data = await response.json();
            return data.candidates[0].content.parts[0].text;

        } catch (err) {
            console.warn(`Model ${model} failed:`, err);
            lastError = err;
        }
    }

    throw lastError || new Error('All models failed. Please check your API key or Model ID.');
}

console.log('App script loaded');
