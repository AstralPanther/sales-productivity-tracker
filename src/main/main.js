const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const DATA_FILE = path.join(app.getPath('userData'), 'activity-data.json');

function createWindow() {
    // Get screen dimensions to position in taskbar area
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    mainWindow = new BrowserWindow({
        width: 400,
        height: 48, // Increased from 40px - better balance
        x: screenWidth - 420, // Position near right side of taskbar area
        y: screenHeight - 58, // Position at bottom (taskbar area)
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        transparent: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('src/renderer/index.html');
    
    // Keep window always on top and focused
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    
    // Prevent window from being minimized
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.show();
    });
}

// Load saved data
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            return data;
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
    return getDefaultData();
}

// Save data
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Get default data structure
function getDefaultData() {
    const now = new Date();
    return {
        date: now.toDateString(),
        shiftStart: '09:00',
        shiftEnd: '17:00',
        target: 50,
        currentPoints: 0,
        lastUpdated: now.toISOString()
    };
}

// Reset data for new day
function checkAndResetForNewDay(data) {
    const today = new Date().toDateString();
    if (data.date !== today) {
        const newData = getDefaultData();
        newData.shiftStart = data.shiftStart; // Keep shift settings
        newData.shiftEnd = data.shiftEnd;
        newData.target = data.target;
        return newData;
    }
    return data;
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers
ipcMain.handle('get-data', () => {
    let data = loadData();
    data = checkAndResetForNewDay(data);
    saveData(data);
    return data;
});

ipcMain.handle('update-points', async (event, points) => {
    const data = loadData();
    data.currentPoints = Math.max(0, parseInt(points) || 0);
    data.lastUpdated = new Date().toISOString();
    saveData(data);
    return data;
});

ipcMain.handle('update-settings', async (event, settings) => {
    const data = loadData();
    data.shiftStart = settings.shiftStart || data.shiftStart;
    data.shiftEnd = settings.shiftEnd || data.shiftEnd;
    data.target = settings.target || data.target;
    saveData(data);
    return data;
});

ipcMain.handle('show-points-dialog', async () => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        title: 'Update Activity Points',
        message: 'Enter your current total activity points:',
        buttons: ['Cancel', 'Update'],
        defaultId: 1,
        cancelId: 0
    });
    
    if (result.response === 1) {
        // Show input dialog - we'll use a simple prompt in renderer for now
        return true;
    }
    return false;
});

// Handle window dragging via IPC as alternative to CSS dragging
ipcMain.handle('start-drag', async () => {
    if (mainWindow) {
        mainWindow.setMovable(true);
    }
});

ipcMain.handle('move-window', async (event, { x, y }) => {
    if (mainWindow) {
        const currentBounds = mainWindow.getBounds();
        mainWindow.setBounds({
            x: currentBounds.x + x,
            y: currentBounds.y + y,
            width: currentBounds.width,
            height: currentBounds.height
        });
    }
});

// Clear setup cache to force fresh settings dialog
ipcMain.handle('clear-setup-cache', async () => {
    // This will force the settings dialog to regenerate
    return true;
});