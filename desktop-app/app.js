const { ipcRenderer } = require('electron');

// DOM Elements
let chatContainer;
let messageInput;
let sendBtn;
let settingsBtn;
let settingsModal;
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
let shortcutVoiceInput;
let shortcutScreenInput;
let shortcutAreaInput;
let promptTextInput;
let promptVoiceInput;
let promptImageInput;
let confirmDialog;
let confirmMessage;
let confirmYes;
let confirmNo;

// Default Prompts
const DEFAULT_PROMPT_TEXT = `You are an expert interview coach helping someone answer technical interview questions.

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
15. Always use simple words to answer the questions
16. If the question involves multiple parts, address each part clearly and separately.
17. Your name is Interview Genie if anyone asks`;

const DEFAULT_PROMPT_VOICE = `INSTRUCTION: The user has provided an audio recording. This audio is STEREO. 
- **LEFT CHANNEL**: This is the CANDIDATE (User).
- **RIGHT CHANNEL**: This is the INTERVIEWER.

Your task is to:
1. Identify who is speaking based on the channel.
2. If the INTERVIEWER (Right Channel) asks a question, provide the answer for the Candidate to say.
3. If the CANDIDATE (Left Channel) asks you for help, answer their specific request.
4. Start your response with "TRANSCRIPTION: " followed by a transcript of the audio (labeling speakers as [Interviewer] or [Candidate] if possible). Then, add a newline and provide the ANSWER.
5. Your name is Interview Genie if anyone asks`;

const DEFAULT_PROMPT_IMAGE = `INSTRUCTION: The user has provided a screenshot. This image likely contains a Data Structures & Algorithms (DSA) problem, a coding challenge, or a technical interview question.
Your task is to:
1. **Analyze the image** to extract the problem statement or code.
2. **Solve the problem**:
   * If it's a **DSA/Coding problem**: Provide the optimal solution code immediately. Keep explanations brief but mention Time/Space complexity.
   * If it's a **Multiple Choice Question**: State the correct option and a one-sentence reason.
   * If it's a **Conceptual Question**: Answer concisely following the main rules.
3. **Ignore** any irrelevant screen elements and focus on the technical content.`;

// State
let apiKey = localStorage.getItem('api-key') || '';
let customModelId = localStorage.getItem('model-id') || '';
let selectedLanguage = localStorage.getItem('coding-language') || 'auto';
let conversationHistory = [];
let confirmResolve = null;

// Prompt State
let promptText = localStorage.getItem('prompt-text') || DEFAULT_PROMPT_TEXT;
let promptVoice = localStorage.getItem('prompt-voice') || DEFAULT_PROMPT_VOICE;
let promptImage = localStorage.getItem('prompt-image') || DEFAULT_PROMPT_IMAGE;

// Shortcuts State (Default: L, S, P)
let shortcutVoice = localStorage.getItem('shortcut-voice') || 'l';
let shortcutScreen = localStorage.getItem('shortcut-screen') || 's';
let shortcutArea = localStorage.getItem('shortcut-area') || 'p';

// Voice Recording (MediaRecorder)
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isCtrlLPressed = false;
let audioContext = null; // Global AudioContext

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
    shortcutVoiceInput = document.getElementById('shortcutVoice');
    shortcutScreenInput = document.getElementById('shortcutScreen');
    shortcutAreaInput = document.getElementById('shortcutArea');
    promptTextInput = document.getElementById('promptTextInput');
    promptVoiceInput = document.getElementById('promptVoiceInput');
    promptImageInput = document.getElementById('promptImageInput');
    confirmDialog = document.getElementById('confirmDialog');
    confirmMessage = document.getElementById('confirmMessage');
    confirmYes = document.getElementById('confirmYes');
    confirmNo = document.getElementById('confirmNo');

    // Profile Elements
    const profileEmail = document.getElementById('profileEmail');
    const profileStatus = document.getElementById('profileStatus');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileSection = document.querySelector('.profile-section');

    // Fetch User Profile
    fetchUserProfile();

    async function fetchUserProfile() {
        const token = localStorage.getItem('auth-token');

        if (!token) {
            // Not logged in
            if (profileSection) profileSection.style.display = 'none';
            if (authBtn) authBtn.style.display = 'block';
            return;
        }

        try {
            // CHANGE THIS URL AFTER DEPLOYING SERVER
            const API_URL = 'http://localhost:5000/api/auth/me';

            const response = await fetch(API_URL, {
                headers: { 'x-auth-token': token }
            });

            if (response.ok) {
                const user = await response.json();

                // Show Profile Section if logged in
                if (profileSection) profileSection.style.display = 'block';
                if (authBtn) authBtn.style.display = 'none';

                if (profileEmail) profileEmail.textContent = user.email;
                if (profileStatus) {
                    profileStatus.textContent = user.isPremium ? 'PREMIUM' : 'FREE';
                    profileStatus.style.background = user.isPremium ? '#fbbf24' : '#94a3b8';
                }

                // Sync premium status
                localStorage.setItem('is-premium', user.isPremium);

                // IMMEDIATE UI UPDATE
                if (user.isPremium) {
                    // Hide Upgrade Button
                    const upgradeBtn = document.getElementById('upgradeBtn');
                    if (upgradeBtn) upgradeBtn.style.display = 'none';

                    // Remove Warning Text
                    const welcomeHint = document.querySelector('.welcome-message .hint');
                    if (welcomeHint) {
                        welcomeHint.textContent = '👻 Invisible Mode Active';
                        welcomeHint.style.color = '#4ade80'; // Green
                    }

                    // Tell Main Process to Enable Invisible Mode
                    ipcRenderer.send('login-success', { isPremium: true });
                }

            } else if (response.status === 401) {
                // Token invalid/expired - Logout
                console.log('Session expired');
                localStorage.removeItem('auth-token');
                localStorage.removeItem('is-premium');
                if (profileSection) profileSection.style.display = 'none';
                if (authBtn) authBtn.style.display = 'block';
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            // On network error, maybe keep quiet or show offline status
            // But don't logout immediately in case it's just wifi
        }
    }

    // Logout Handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (await showConfirm('Are you sure you want to logout?')) {
                localStorage.removeItem('auth-token');
                localStorage.removeItem('is-premium');
                // Tell main process to restart/show login
                ipcRenderer.send('logout');
            }
        });
    }

    // Auth Handler (Login Button in Header)
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', () => {
            ipcRenderer.send('logout'); // Effectively restarts to login screen
        });
    }

    // LISTENER FOR GOOGLE/DEEP LINK LOGIN SUCCESS
    ipcRenderer.on('google-login-success', (event, data) => {
        console.log('Google Login Success in Renderer:', data);

        if (data && data.token) {
            // Save Token
            localStorage.setItem('auth-token', data.token);

            // Save User Data if present
            if (data.user) {
                localStorage.setItem('user-data', JSON.stringify(data.user));
            }

            // Save Premium Status
            localStorage.setItem('is-premium', data.isPremium);

            // Reload Profile immediately
            fetchUserProfile();

            // Show Success UI
            addSystemMessage('✅ Logged in successfully via Google!');
        }
    });

    // Free User Logic
    const upgradeBtn = document.getElementById('upgradeBtn');
    const isPremium = localStorage.getItem('is-premium') === 'true';

    if (!isPremium) {
        if (upgradeBtn) {
            upgradeBtn.style.display = 'block';
            upgradeBtn.addEventListener('click', () => {
                const { shell } = require('electron'); // Ensure shell is available
                shell.openExternal('http://localhost:5000/index.html#pricing');
            });
        }

        // Show auth button if not logged in (token check better here, but simplistic for now)
        const token = localStorage.getItem('auth-token');
        if (token && authBtn) {
            authBtn.style.display = 'none';
        }

        // Update welcome message
        const welcomeHint = document.querySelector('.welcome-message .hint');
        if (welcomeHint) {
            welcomeHint.textContent = '⚠️ This window is visible. Upgrade to make it invisible.';
            welcomeHint.style.color = '#fbbf24'; // Gold warning color
        }
    } else {
        // If premium, hide login button
        if (authBtn) authBtn.style.display = 'none';
    }

    // Load saved settings
    // Note: For commercial version, we might want to fetch this from server or keep it empty
    if (apiKey) {
        const keys = apiKey.split(',').map(k => k.trim());
        const inputs = document.querySelectorAll('.api-key-input');
        inputs.forEach((input, index) => {
            if (keys[index]) input.value = keys[index];
        });
    } else {
        // Ensure inputs are empty
        const inputs = document.querySelectorAll('.api-key-input');
        inputs.forEach(input => input.value = '');
    }
    if (customModelId) modelInput.value = customModelId;

    // Load saved shortcuts into inputs
    if (shortcutVoiceInput) shortcutVoiceInput.value = shortcutVoice.toUpperCase();
    if (shortcutScreenInput) shortcutScreenInput.value = shortcutScreen.toUpperCase();
    if (shortcutAreaInput) shortcutAreaInput.value = shortcutArea.toUpperCase();

    // Load saved prompts into inputs
    if (promptTextInput) promptTextInput.value = promptText;
    if (promptVoiceInput) promptVoiceInput.value = promptVoice;
    if (promptImageInput) promptImageInput.value = promptImage;

    // Update UI with current shortcuts
    updateShortcutUI();

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
        clearBtn.addEventListener('click', async () => {
            if (await showConfirm('Are you sure you want to clear the chat history?')) {
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
        if (e.ctrlKey && (
            e.key.toLowerCase() === shortcutVoice.toLowerCase() ||
            e.key.toLowerCase() === shortcutScreen.toLowerCase() ||
            e.key.toLowerCase() === shortcutArea.toLowerCase()
        )) {
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
        // Collect all API keys
        const inputs = document.querySelectorAll('.api-key-input');
        const keys = Array.from(inputs).map(input => input.value.trim()).filter(k => k);
        apiKey = keys.join(',');

        customModelId = modelInput.value.trim();

        // Save Shortcuts
        const newVoice = shortcutVoiceInput.value.trim().toLowerCase();
        const newScreen = shortcutScreenInput.value.trim().toLowerCase();
        const newArea = shortcutAreaInput.value.trim().toLowerCase();

        if (newVoice) shortcutVoice = newVoice;
        if (newScreen) shortcutScreen = newScreen;
        if (newArea) shortcutArea = newArea;

        localStorage.setItem('shortcut-voice', shortcutVoice);
        localStorage.setItem('shortcut-screen', shortcutScreen);
        localStorage.setItem('shortcut-area', shortcutArea);

        // Save Prompts
        promptText = promptTextInput.value.trim();
        promptVoice = promptVoiceInput.value.trim();
        promptImage = promptImageInput.value.trim();

        localStorage.setItem('prompt-text', promptText);
        localStorage.setItem('prompt-voice', promptVoice);
        localStorage.setItem('prompt-image', promptImage);

        if (apiKey) {
            localStorage.setItem('api-key', apiKey);
            localStorage.setItem('model-id', customModelId);

            addSystemMessage('✅ Settings saved successfully!');
            updateShortcutUI(); // Update UI with new shortcuts
            settingsModal.classList.remove('show');
        } else {
            addSystemMessage('❌ Please enter at least one API key');
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

    closeBtn.addEventListener('click', async () => {
        if (await showConfirm('Are you sure you want to close?')) {
            ipcRenderer.send('close-app');
        }
    });

    // Setup custom confirm dialog
    if (confirmYes && confirmNo) {
        confirmYes.addEventListener('click', () => {
            if (confirmResolve) {
                confirmResolve(true);
                confirmResolve = null;
            }
            confirmDialog.classList.remove('show');
        });

        confirmNo.addEventListener('click', () => {
            if (confirmResolve) {
                confirmResolve(false);
                confirmResolve = null;
            }
            confirmDialog.classList.remove('show');
        });
    }

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

// Custom Confirm Dialog (Invisible during screen sharing)
function showConfirm(message) {
    return new Promise((resolve) => {
        confirmMessage.textContent = message;
        confirmDialog.classList.add('show');
        confirmResolve = resolve;
    });
}

function updateShortcutUI() {
    // Update Placeholder
    if (messageInput) {
        messageInput.placeholder = `Type your question or hold Ctrl+${shortcutVoice.toUpperCase()} to speak...`;
    }

    // Update Help Modal Text
    const keys = document.querySelectorAll('.shortcut-item .key');
    if (keys.length >= 3) {
        keys[0].textContent = `Ctrl + ${shortcutVoice.toUpperCase()}`;
        keys[1].textContent = `Ctrl + ${shortcutScreen.toUpperCase()}`;
        keys[2].textContent = `Ctrl + ${shortcutArea.toUpperCase()}`;
    }
}

// Screen Capture Setup
function setupScreenCapture() {
    document.addEventListener('keydown', async (e) => {
        // Ctrl+S (or custom) to capture full screen
        if (e.ctrlKey && e.key.toLowerCase() === shortcutScreen.toLowerCase()) {
            e.preventDefault();
            await captureScreen('full');
        }

        // Ctrl+P (or custom) to capture area behind app
        if (e.ctrlKey && e.key.toLowerCase() === shortcutArea.toLowerCase()) {
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

        // Send to AI
        const response = await callAI(null, null, imageBase64);
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

    // Initialize AudioContext once
    try {
        audioContext = new AudioContext();
    } catch (e) {
        console.warn('Could not init AudioContext:', e);
    }

    // Push-to-talk: Hold Ctrl+L (or custom) to record
    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === shortcutVoice.toLowerCase()) {
            e.preventDefault();

            if (!isCtrlLPressed && !isRecording) {
                isCtrlLPressed = true;
                await startRecording();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Control' || e.key.toLowerCase() === shortcutVoice.toLowerCase()) {
            if (isCtrlLPressed) {
                isCtrlLPressed = false;
                stopRecording();
            }
        }
    });
}

async function startRecording() {
    // Immediate UI Feedback
    showListeningIndicator(true); // true = "Initializing"

    try {
        let finalStream;

        // Parallelize stream acquisition for speed
        const [sourceId, micStream] = await Promise.all([
            ipcRenderer.invoke('get-desktop-source-id'),
            navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            })
        ]);

        let systemStream;
        try {
            systemStream = await navigator.mediaDevices.getUserMedia({
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
        } catch (sysErr) {
            console.warn('System audio failed:', sysErr);
            // Fallback to mic only if system audio fails
        }

        if (systemStream) {
            // Mix them using AudioContext with STEREO SEPARATION
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

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

            // Note: We don't need the video track from system stream
            systemStream.getVideoTracks().forEach(track => track.stop());
        } else {
            finalStream = micStream;
        }

        // Start Recording
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
            // Don't close AudioContext, keep it for next time
        };

        mediaRecorder.start();
        isRecording = true;
        console.log('🎤 Recording started');

        // Update UI to "Recording" state
        updateListeningIndicatorText(`🎤 Recording... (Release Ctrl+${shortcutVoice.toUpperCase()} to send)`);

    } catch (err) {
        console.error('Error starting recording:', err);
        addSystemMessage('❌ Could not access audio: ' + err.message);
        hideListeningIndicator();
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

function showListeningIndicator(isInitializing = false) {
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
                <div class="listening-text" id="listening-text">🎤 Initializing...</div>
            </div>
        `;
        chatContainer.appendChild(indicator);
    }

    const textEl = document.getElementById('listening-text');
    if (textEl) {
        textEl.textContent = isInitializing ? '🎤 Initializing...' : `🎤 Recording... (Release Ctrl+${shortcutVoice.toUpperCase()} to send)`;
    }

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function updateListeningIndicatorText(text) {
    const textEl = document.getElementById('listening-text');
    if (textEl) {
        textEl.textContent = text;
    }
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
        // Call AI with Audio
        let response = await callAI(null, base64Audio, null);

        // Check for transcription
        if (response.startsWith('TRANSCRIPTION:')) {
            const splitIndex = response.indexOf('\n');
            if (splitIndex !== -1) {
                const transcription = response.substring(14, splitIndex).trim();
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
        // Call AI with Text
        const response = await callAI(message, null, null);
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

    if (type === 'ai') {
        const img = document.createElement('img');
        img.src = 'assets/ICON.jpeg';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        avatar.appendChild(img);
        // Remove default text/background styling handles by CSS if needed, 
        // but replacing content usually helps
    } else {
        avatar.textContent = '👤';
    }

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

// Universal AI Call Function (Now Gemini Only)
async function callAI(prompt, audioBase64 = null, imageBase64 = null) {
    return await callGeminiAPI(prompt, audioBase64, imageBase64);
}

// Call Gemini API with Key Rotation
async function callGeminiAPI(prompt, audioBase64 = null, imageBase64 = null) {
    const defaultModels = ['gemini-2.0-flash-exp', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
    let modelsToTry = [...defaultModels];

    if (customModelId && customModelId.trim() !== '') {
        modelsToTry = [customModelId.trim(), ...defaultModels];
    }

    // Parse API keys (handle comma-separated list)
    const apiKeys = apiKey.split(',').map(k => k.trim()).filter(k => k);

    if (apiKeys.length === 0) {
        throw new Error('No valid API key provided.');
    }

    let lastError = null;

    // Construct language instruction
    let languageInstruction = '';
    if (selectedLanguage && selectedLanguage !== 'auto') {
        const langName = selectedLanguage.toUpperCase();
        languageInstruction = `\nIMPORTANT: All coding solutions MUST be written in ${langName}. Do not use any other language.`;
    }

    // Try each key in rotation
    for (let i = 0; i < apiKeys.length; i++) {
        const currentKey = apiKeys[i];

        // Try models with this key
        for (const model of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;

                const parts = [];

                // Add system prompt based on input type
                let finalPrompt = promptText; // Default to text prompt

                if (audioBase64) {
                    finalPrompt += '\n\n' + promptVoice;
                } else if (imageBase64) {
                    finalPrompt += '\n\n' + promptImage;
                }

                // Add language instruction
                finalPrompt += languageInstruction;

                // Add system prompt
                parts.push({
                    text: finalPrompt
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
                console.warn(`Key ${i + 1} / Model ${model} failed:`, err);
                lastError = err;
                // Continue to next model with same key
            }
        }
        // If all models failed for this key, loop continues to next key
        console.log(`Key ${i + 1} exhausted, switching to next key...`);
    }

    throw lastError || new Error('All keys and models failed. Please check your API keys.');
}

console.log('App script loaded');
