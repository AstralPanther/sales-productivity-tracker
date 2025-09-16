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
        height: 125, // Increased to accommodate five progress bars
        minWidth: 300,
        minHeight: 110,
        x: screenWidth - 420, // Position near right side of taskbar area
        y: screenHeight - 135, // Adjusted position for increased height
        frame: true, // Enable frame for resize handles
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: true,
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
    mainWindow.on('minimize', event => {
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
        month: now.toISOString().slice(0, 7),
        shiftStart: '09:00',
        shiftEnd: '17:00',
        target: 50,
        callsTarget: 20,
        backlogTarget: 0,
        dailyRevenueTarget: 5000,
        monthlyRevenueTarget: 50000,
        currentPoints: 0,
        currentCalls: 0,
        currentBacklog: 0,
        currentDailyRevenue: 0,
        currentMonthlyRevenue: 0,
        lastUpdated: now.toISOString(),
        version: '2.0'
    };
}

// Reset data for new day
function checkAndResetForNewDay(data) {
    const today = new Date().toDateString();
    if (data.date !== today) {
        const newData = getDefaultData();
        // Preserve settings
        newData.shiftStart = data.shiftStart || newData.shiftStart;
        newData.shiftEnd = data.shiftEnd || newData.shiftEnd;
        newData.target = data.target || newData.target;
        newData.callsTarget = data.callsTarget || newData.callsTarget;
        newData.backlogTarget = data.backlogTarget || newData.backlogTarget;
        newData.dailyRevenueTarget = data.dailyRevenueTarget || newData.dailyRevenueTarget;
        newData.monthlyRevenueTarget = data.monthlyRevenueTarget || newData.monthlyRevenueTarget;
        
        // Preserve monthly revenue if same month
        const currentMonth = new Date().toISOString().slice(0, 7);
        if (data.month === currentMonth) {
            newData.currentMonthlyRevenue = data.currentMonthlyRevenue || 0;
        }

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

ipcMain.handle('update-combined', async (event, metrics) => {
    const data = loadData();
    data.currentPoints = Math.max(0, parseInt(metrics.currentPoints) || 0);
    data.currentCalls = Math.max(0, parseInt(metrics.currentCalls) || 0);
    data.currentBacklog = Math.max(0, parseInt(metrics.currentBacklog) || 0);
    data.currentDailyRevenue = Math.max(0, parseInt(metrics.currentDailyRevenue) || 0);
    data.currentMonthlyRevenue = Math.max(0, parseInt(metrics.currentMonthlyRevenue) || 0);
    data.lastUpdated = new Date().toISOString();
    saveData(data);

    return data;
});

ipcMain.handle('update-settings', async (event, settings) => {
    const data = loadData();
    data.shiftStart = settings.shiftStart || data.shiftStart;
    data.shiftEnd = settings.shiftEnd || data.shiftEnd;
    data.target = settings.target || data.target;
    data.callsTarget = settings.callsTarget || data.callsTarget;
    data.backlogTarget = settings.backlogTarget || data.backlogTarget;
    data.dailyRevenueTarget = settings.dailyRevenueTarget || data.dailyRevenueTarget;
    data.monthlyRevenueTarget = settings.monthlyRevenueTarget || data.monthlyRevenueTarget;
    data.lastUpdated = new Date().toISOString();
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
