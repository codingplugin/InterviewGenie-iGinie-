const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');

// Suppress SSL errors in console (they're harmless)
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('log-level', '3'); // Suppress non-fatal errors

let mainWindow = null;
let isVisible = false;



function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900, // Start with main app size
        height: 700,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: false,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    // Enable screen capture protection (Default: OFF until premium check)
    // We will enable it later if user is premium

    mainWindow.loadFile('index.html');

    // Open DevTools for debugging
    // DevTools removed for production

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC: Login Success
ipcMain.on('login-success', (event, data) => {
    if (data.isPremium) {
        enablePremiumMode();
    } else {
        // Free user logged in
        loadMainApp(false);
    }
});

// Check Status
ipcMain.on('check-premium-status', async (event) => {
    if (mainWindow) mainWindow.reload();
});

// IPC: Payment Success
ipcMain.on('payment-success', () => {
    enablePremiumMode();
});

// IPC: Continue Free
ipcMain.on('continue-free', () => {
    loadMainApp(false);
});

// IPC: Open Payment Page
ipcMain.on('open-payment', () => {
    mainWindow.setSize(450, 700);
    mainWindow.center();
    mainWindow.loadFile('payment.html');
});

function enablePremiumMode() {
    // Enable content protection (Invisible Mode)
    if (process.platform === 'win32' && mainWindow) {
        try {
            mainWindow.setContentProtection(true);
            console.log('Invisible Mode Enabled');
        } catch (e) {
            console.log('Content protection not available');
        }
    }

    // We do NOT reload index.html here because this event is triggered FROM index.html's fetchUserProfile
    // Reloading it would restart the fetchUserProfile -> trigger this again -> Infinite Loop.

    // Only resize/center if needed (optional)
    if (mainWindow) {
        mainWindow.setSize(900, 700);
        mainWindow.setSkipTaskbar(true);
    }
}

function loadMainApp(isPremium) {
    if (!mainWindow) return;

    // Resize for main app
    mainWindow.setSize(900, 700);
    mainWindow.center();

    // Hide from taskbar if premium (optional, but good for stealth)
    if (isPremium) {
        mainWindow.setSkipTaskbar(true);
    }

    mainWindow.loadFile('index.html');
}

// Custom Protocol Setup (Deep Linking)
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('interviewgenie', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('interviewgenie');
}

// Force Single Instance (Required for Deep Linking on Windows)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }

        // Handle Deep Link on Windows
        const url = commandLine.find(arg => arg.startsWith('interviewgenie://'));
        if (url) handleDeepLink(url);
    });

    app.whenReady().then(() => {
        createWindow();

        // Register global shortcut to toggle visibility
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            if (mainWindow) {
                isVisible = !isVisible;
                if (isVisible) {
                    mainWindow.show();
                } else {
                    mainWindow.hide();
                }
            }
        });


    });
}

function handleDeepLink(url) {
    try {
        console.log('Received deep link:', url);
        // format: interviewgenie://auth?token=JWT&isPremium=true

        const tokenMatch = url.match(/token=([^&]*)/);
        const premiumMatch = url.match(/isPremium=([^&]*)/);

        if (tokenMatch && tokenMatch[1]) {
            const token = tokenMatch[1];
            const isPremium = premiumMatch ? (premiumMatch[1] === 'true') : false;

            console.log('Deep Link Login Success!', token.substring(0, 5) + '...');



            if (mainWindow) {
                // FORCE LOGIN: Inject token directly into LocalStorage
                // We use a template string for valid JS execution in renderer
                const script = `
                    localStorage.setItem('auth-token', '${token}');
                    localStorage.setItem('is-premium', '${isPremium}');
                    localStorage.setItem('user-data', JSON.stringify({ email: 'Google User', isPremium: ${isPremium} }));
                    console.log('Token injected by Main Process');
                `;

                mainWindow.webContents.executeJavaScript(script).then(() => {
                    console.log('Token injected. Reloading to App...');
                    mainWindow.loadFile('index.html');

                    if (mainWindow.isMinimized()) mainWindow.restore();
                    mainWindow.focus();
                }).catch(err => {
                    console.error('Failed to inject token:', err);
                });
            }
        }
    } catch (e) {
        console.error('Deep Link Error:', e);
    }
}

app.on('window-all-closed', () => {
    app.quit();
});

// IPC handlers
ipcMain.on('close-app', () => {
    app.quit();
});

ipcMain.on('minimize-app', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// Restart/Logout Logic
ipcMain.on('logout', () => {
    if (mainWindow) {
        // Keep current size
        mainWindow.loadFile('login.html');
    }
});

ipcMain.on('set-opacity', (event, opacity) => {
    if (mainWindow) {
        mainWindow.setOpacity(opacity);
    }
});

// Screen Capture Handler (Full Screen)
ipcMain.handle('capture-screen', async () => {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 1920, height: 1080 }
        });

        // Return the first screen's image as base64
        if (sources.length > 0) {
            return sources[0].thumbnail.toDataURL().split(',')[1];
        }
        throw new Error('No screen sources found');
    } catch (error) {
        console.error('Screen capture error:', error);
        throw error;
    }
});

// Area Capture Handler (Behind App)
ipcMain.handle('capture-area', async () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    // 1. Hide window
    mainWindow.hide();

    // 2. Wait briefly for hide to take effect
    await new Promise(r => setTimeout(r, 100)); // Increased wait time slightly

    try {
        // 3. Capture full screen
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width, height }
        });

        const primarySource = sources[0]; // Usually the first one
        const image = primarySource.thumbnail;

        // 4. Show window again immediately
        mainWindow.show();

        // 5. Crop the image to window bounds
        // We need to get the window bounds relative to the screen
        const winBounds = mainWindow.getBounds();

        // Create a native image from the screenshot
        const cropRect = {
            x: winBounds.x,
            y: winBounds.y,
            width: winBounds.width,
            height: winBounds.height
        };

        // Ensure crop bounds are valid
        if (cropRect.x < 0) cropRect.x = 0;
        if (cropRect.y < 0) cropRect.y = 0;
        if (cropRect.x + cropRect.width > width) cropRect.width = width - cropRect.x;
        if (cropRect.y + cropRect.height > height) cropRect.height = height - cropRect.y;

        const croppedImage = image.crop(cropRect);
        return croppedImage.toDataURL().split(',')[1];

    } catch (error) {
        mainWindow.show(); // Ensure window comes back
        console.error('Capture failed:', error);
        throw error;
    }
});

// Handle getting desktop source ID for audio
ipcMain.handle('get-desktop-source-id', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    // Return the first screen's ID (usually the primary display)
    if (sources.length > 0) {
        return sources[0].id;
    }
    throw new Error('No screen sources found');
});
