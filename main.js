const { app, BrowserWindow, globalShortcut, ipcMain, desktopCapturer, screen } = require('electron');

// Suppress SSL errors in console (they're harmless)
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('log-level', '3'); // Suppress non-fatal errors

let mainWindow = null;
let isVisible = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Enable screen capture protection
    if (process.platform === 'win32') {
        try {
            mainWindow.setContentProtection(true);
        } catch (e) {
            console.log('Content protection not available');
        }
    }

    mainWindow.loadFile('index.html');

    // Open DevTools for debugging
    // DevTools removed for production

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // Toggle visibility with Ctrl+Shift+I
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

app.on('window-all-closed', () => {
    app.quit();
});

// IPC handlers
ipcMain.on('close-app', () => {
    app.quit();
});

ipcMain.on('minimize-app', () => {
    if (mainWindow) {
        mainWindow.hide();
        isVisible = false;
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
