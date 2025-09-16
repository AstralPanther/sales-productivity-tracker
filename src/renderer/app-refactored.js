class ActivityTracker {
    constructor() {
        this.dataManager = new DataManager(true); // Electron version
        this.data = null;
        this.updateInterval = null;
        this.progressBars = {};
        this.currentDialog = null;
        this.eventListeners = [];

        this.init();
    }

    async init() {
        console.log('ActivityTracker.init() called');

        try {
            await this.loadData();
            console.log('Data loaded:', this.data);

            await this.checkInitialSetup();
            this.createProgressBars();
            this.setupEventListeners();
            this.updateTimeMarkers();
            this.setupResizeHandler();
            this.startUpdateLoop();
            this.updateDisplay();

            console.log('Initialization complete');
        } catch (error) {
            console.error('Error during initialization:', error);
            this.showError('Failed to initialize application');
        }
    }

    async loadData() {
        try {
            this.data = await this.dataManager.loadData();
        } catch (error) {
            console.error('Error loading data:', error);
            this.data = this.dataManager.getDefaultData();
            this.showError('Failed to load data, using defaults');
        }
    }

    createProgressBars() {
        const container = document.getElementById('progressBarsContainer');
        if (!container) {
            throw new Error('Progress bars container not found');
        }

        const barConfigs = [
            {
                id: 'activityBar',
                label: 'Activity',
                current: this.data.currentPoints,
                target: this.data.target,
                type: 'normal',
                onClick: () => this.showCombinedInput()
            },
            {
                id: 'callsBar',
                label: 'Outbound Calls',
                current: this.data.currentCalls,
                target: this.data.callsTarget,
                type: 'normal',
                onClick: () => this.showCombinedInput()
            },
            {
                id: 'backlogBar',
                label: 'Backlog',
                current: this.data.currentBacklog,
                target: this.data.backlogTarget,
                type: 'countdown',
                onClick: () => this.showCombinedInput()
            },
            {
                id: 'dailyRevenueBar',
                label: 'Daily Revenue',
                current: this.data.currentDailyRevenue,
                target: this.data.dailyRevenueTarget,
                type: 'normal',
                onClick: () => this.showCombinedInput()
            },
            {
                id: 'monthlyRevenueBar',
                label: 'Monthly Revenue',
                current: this.data.currentMonthlyRevenue,
                target: this.data.monthlyRevenueTarget,
                type: 'normal',
                showExpectedLine: true,
                useMonthProgress: true,
                onClick: () => this.showCombinedInput()
            }
        ];

        barConfigs.forEach(config => {
            this.progressBars[config.id] = new ProgressBar(container, config);
        });
    }

    setupEventListeners() {
        // Right-click for settings
        const contextHandler = async e => {
            e.preventDefault();
            await this.showShiftSetupDialog();
        };

        document.addEventListener('contextmenu', contextHandler);
        this.eventListeners.push({
            element: document,
            event: 'contextmenu',
            handler: contextHandler
        });

        // Window dragging
        this.setupWindowDragging();
    }

    setupWindowDragging() {
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };

        const mouseDownHandler = e => {
            // Don't drag if clicking on progress bars or dialogs
            if (e.target.closest('.progress-bar') || e.target.closest('.input-dialog-overlay')) {
                return;
            }

            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            if (window.electronAPI) {
                window.electronAPI.startDrag();
            }
        };

        const mouseMoveHandler = e => {
            if (!isDragging) return;

            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;

            if (window.electronAPI) {
                window.electronAPI.moveWindow({ x: deltaX, y: deltaY });
            }
            dragStart = { x: e.clientX, y: e.clientY };
        };

        const mouseUpHandler = () => {
            isDragging = false;
        };

        document.body.addEventListener('mousedown', mouseDownHandler);
        document.body.addEventListener('mousemove', mouseMoveHandler);
        document.body.addEventListener('mouseup', mouseUpHandler);

        this.eventListeners.push(
            { element: document.body, event: 'mousedown', handler: mouseDownHandler },
            { element: document.body, event: 'mousemove', handler: mouseMoveHandler },
            { element: document.body, event: 'mouseup', handler: mouseUpHandler }
        );
    }

    setupResizeHandler() {
        const resizeHandler = () => {
            this.updateTimeMarkers();
            this.updateDisplay();
        };

        window.addEventListener('resize', resizeHandler);
        this.eventListeners.push({
            element: window,
            event: 'resize',
            handler: resizeHandler
        });
    }

    startUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Update every 5 minutes
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 5 * 60 * 1000);
    }

    updateDisplay() {
        try {
            const timePercent = this.calculateTimePercent();

            // Update activity progress bar
            const expectedPoints = this.dataManager.calculateExpectedProgress(
                this.data.shiftStart,
                this.data.shiftEnd,
                this.data.target
            );

            this.progressBars.activityBar.update({
                current: this.data.currentPoints,
                target: this.data.target,
                expectedProgress: expectedPoints,
                timePercent
            });

            // Update calls progress bar
            const expectedCalls = this.dataManager.calculateExpectedProgress(
                this.data.shiftStart,
                this.data.shiftEnd,
                this.data.callsTarget
            );

            this.progressBars.callsBar.update({
                current: this.data.currentCalls,
                target: this.data.callsTarget,
                expectedProgress: expectedCalls,
                timePercent
            });

            // Update backlog progress bar
            const expectedBacklogRemaining = this.data.backlogTarget > 0
                ? this.data.backlogTarget - this.dataManager.calculateExpectedProgress(
                    this.data.shiftStart,
                    this.data.shiftEnd,
                    this.data.backlogTarget
                )
                : 0;

            this.progressBars.backlogBar.update({
                current: this.data.currentBacklog,
                target: this.data.backlogTarget,
                expectedProgress: expectedBacklogRemaining,
                timePercent
            });

        } catch (error) {
            console.error('Error updating display:', error);
        }
    }

    calculateTimePercent() {
        const now = new Date();
        const startTime = this.dataManager.parseTime(this.data.shiftStart);
        const endTime = this.dataManager.parseTime(this.data.shiftEnd);

        const shiftDurationMinutes = (endTime.hour - startTime.hour) * 60 + (endTime.minute - startTime.minute);
        const currentMinutesSinceStart = (now.getHours() - startTime.hour) * 60 + (now.getMinutes() - startTime.minute);

        if (currentMinutesSinceStart <= 0) return 0;
        if (currentMinutesSinceStart >= shiftDurationMinutes) return 100;

        return (currentMinutesSinceStart / shiftDurationMinutes) * 100;
    }

    async checkInitialSetup() {
        const isFirstRun = !localStorage.getItem('shiftSetupComplete');
        if (isFirstRun) {
            console.log('First run detected, prompting for shift setup');
            await this.showShiftSetupDialog();
            localStorage.setItem('shiftSetupComplete', 'true');
        }
    }

    async showShiftSetupDialog() {
        return new Promise(resolve => {
            // Clean up any existing dialog
            if (this.currentDialog) {
                this.currentDialog.hide();
            }

            const overlay = document.createElement('div');
            overlay.className = 'settings-dialog-overlay';
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
                z-index: 5000;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            `;

            overlay.innerHTML = this.createSettingsDialogHTML();
            document.body.appendChild(overlay);

            this.setupSettingsDialogEvents(overlay, resolve);
        });
    }

    createSettingsDialogHTML() {
        return `
            <div style="display:flex;align-items:stretch;height:100%;width:100%;padding:8px 12px;overflow:hidden;gap:16px;">
                <div style="display:flex;align-items:center;justify-content:center;gap:8px;flex:1;">
                    <div style="display:flex;flex-direction:column;gap:6px;flex:1;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <label style="font-size:12px;color:#555;font-weight:500;min-width:40px;">Start:</label>
                            <input type="time" id="setupShiftStart" value="${this.data.shiftStart}" 
                                   style="padding:4px;border:1px solid #ddd;border-radius:3px;font-size:12px;flex:1;">
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <label style="font-size:12px;color:#555;font-weight:500;min-width:40px;">End:</label>
                            <input type="time" id="setupShiftEnd" value="${this.data.shiftEnd}" 
                                   style="padding:4px;border:1px solid #ddd;border-radius:3px;background:#f8f8f8;font-size:12px;flex:1;" readonly>
                        </div>
                    </div>
                    <button id="endTimeLock" 
                            style="background:#f0f0f0;border:1px solid #ccc;cursor:pointer;font-size:12px;padding:3px 6px;color:#333;border-radius:3px;flex-shrink:0;" 
                            title="Lock/unlock">🔒</button>
                </div>
                
                <div style="display:flex;flex-direction:column;justify-content:center;gap:6px;flex:1;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:12px;">🎯</span>
                        <label style="font-size:12px;color:#555;font-weight:500;min-width:50px;">Activity:</label>
                        <input type="number" id="setupTarget" value="${this.data.target}" min="1" max="200" 
                               style="padding:4px;border:1px solid #ddd;border-radius:3px;font-size:12px;text-align:center;width:50px;">
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:12px;">🎯</span>
                        <label style="font-size:12px;color:#555;font-weight:500;min-width:50px;">Calls:</label>
                        <input type="number" id="setupCallsTarget" value="${this.data.callsTarget || 20}" min="1" max="100" 
                               style="padding:4px;border:1px solid #ddd;border-radius:3px;font-size:12px;text-align:center;width:50px;">
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:12px;">📋</span>
                        <label style="font-size:12px;color:#555;font-weight:500;min-width:50px;">Backlog:</label>
                        <input type="number" id="setupBacklogTarget" value="${this.data.backlogTarget || 0}" min="0" max="1000" 
                               style="padding:4px;border:1px solid #ddd;border-radius:3px;font-size:12px;text-align:center;width:50px;">
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:12px;">💰</span>
                        <label style="font-size:12px;color:#555;font-weight:500;min-width:50px;">Daily Rev:</label>
                        <input type="number" id="setupDailyRevenueTarget" value="${this.data.dailyRevenueTarget || 5000}" min="0" max="100000" step="100"
                               style="padding:4px;border:1px solid #ddd;border-radius:3px;font-size:12px;text-align:center;width:70px;">
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:12px;">📈</span>
                        <label style="font-size:12px;color:#555;font-weight:500;min-width:50px;">Monthly Rev:</label>
                        <input type="number" id="setupMonthlyRevenueTarget" value="${this.data.monthlyRevenueTarget || 50000}" min="0" max="1000000" step="1000"
                               style="padding:4px;border:1px solid #ddd;border-radius:3px;font-size:12px;text-align:center;width:70px;">
                    </div>
                </div>
                
                <div style="display:flex;flex-direction:column;justify-content:center;gap:6px;flex:0 0 auto;">
                    <button id="setupComplete" 
                            style="background:#007acc;color:white;border:none;padding:8px 16px;border-radius:3px;cursor:pointer;font-size:12px;font-weight:500;">Save</button>
                    <button id="setupCancel" 
                            style="background:#ccc;color:#333;border:none;padding:8px 16px;border-radius:3px;cursor:pointer;font-size:12px;font-weight:500;">Cancel</button>
                </div>
            </div>
        `;
    }

    setupSettingsDialogEvents(overlay, resolve) {
        const dialogEventListeners = [];
        let isEndTimeLocked = true;

        // Auto-calculate end time
        const updateEndTime = () => {
            if (!isEndTimeLocked) return;

            const startTime = document.getElementById('setupShiftStart').value;
            if (startTime) {
                const [hours, minutes] = startTime.split(':').map(Number);
                const startDate = new Date();
                startDate.setHours(hours, minutes, 0, 0);

                const endDate = new Date(startDate.getTime() + (8 * 60 * 60 * 1000));
                const endHours = endDate.getHours().toString().padStart(2, '0');
                const endMinutes = endDate.getMinutes().toString().padStart(2, '0');

                document.getElementById('setupShiftEnd').value = `${endHours}:${endMinutes}`;
            }
        };

        // Lock button toggle
        const lockButton = document.getElementById('endTimeLock');
        const toggleEndTimeLock = () => {
            const endTimeInput = document.getElementById('setupShiftEnd');
            isEndTimeLocked = !isEndTimeLocked;

            if (isEndTimeLocked) {
                endTimeInput.readOnly = true;
                endTimeInput.style.background = '#f8f8f8';
                lockButton.textContent = '🔒';
                updateEndTime();
            } else {
                endTimeInput.readOnly = false;
                endTimeInput.style.background = 'white';
                lockButton.textContent = '🔓';
            }
        };

        const lockHandler = e => {
            e.stopPropagation();
            toggleEndTimeLock();
        };
        lockButton.addEventListener('click', lockHandler);
        dialogEventListeners.push({ element: lockButton, event: 'click', handler: lockHandler });

        // Start time change
        const startTimeInput = document.getElementById('setupShiftStart');
        const startTimeHandler = updateEndTime;
        startTimeInput.addEventListener('change', startTimeHandler);
        startTimeInput.addEventListener('input', startTimeHandler);
        dialogEventListeners.push(
            { element: startTimeInput, event: 'change', handler: startTimeHandler },
            { element: startTimeInput, event: 'input', handler: startTimeHandler }
        );

        // Complete button
        const completeButton = document.getElementById('setupComplete');
        const completeHandler = async e => {
            e.preventDefault();
            e.stopPropagation();

            try {
                const settings = {
                    shiftStart: this.dataManager.sanitizeInput(
                        document.getElementById('setupShiftStart').value,
                        'time'
                    ),
                    shiftEnd: this.dataManager.sanitizeInput(
                        document.getElementById('setupShiftEnd').value,
                        'time'
                    ),
                    target: this.dataManager.sanitizeInput(
                        document.getElementById('setupTarget').value,
                        'number',
                        { min: 1, max: 200 }
                    ),
                    callsTarget: this.dataManager.sanitizeInput(
                        document.getElementById('setupCallsTarget').value,
                        'number',
                        { min: 1, max: 100 }
                    ),
                    backlogTarget: this.dataManager.sanitizeInput(
                        document.getElementById('setupBacklogTarget').value,
                        'number',
                        { min: 0, max: 1000 }
                    ),
                    dailyRevenueTarget: this.dataManager.sanitizeInput(
                        document.getElementById('setupDailyRevenueTarget').value,
                        'number',
                        { min: 0, max: 100000 }
                    ),
                    monthlyRevenueTarget: this.dataManager.sanitizeInput(
                        document.getElementById('setupMonthlyRevenueTarget').value,
                        'number',
                        { min: 0, max: 1000000 }
                    )
                };

                this.data = await this.dataManager.updateSettings(settings);

                // Update progress bar targets
                this.progressBars.activityBar.setTarget(this.data.target);
                this.progressBars.callsBar.setTarget(this.data.callsTarget);
                this.progressBars.backlogBar.setTarget(this.data.backlogTarget);

                this.updateTimeMarkers();
                this.updateDisplay();

                // Clean up
                this.cleanupDialogEvents(dialogEventListeners);
                document.body.removeChild(overlay);
                resolve();

            } catch (error) {
                console.error('Error saving settings:', error);
                this.showError('Failed to save settings');
            }
        };
        completeButton.addEventListener('click', completeHandler);
        dialogEventListeners.push({ element: completeButton, event: 'click', handler: completeHandler });

        // Cancel button
        const cancelButton = document.getElementById('setupCancel');
        const cancelHandler = () => {
            this.cleanupDialogEvents(dialogEventListeners);
            document.body.removeChild(overlay);
            resolve();
        };
        cancelButton.addEventListener('click', cancelHandler);
        dialogEventListeners.push({ element: cancelButton, event: 'click', handler: cancelHandler });

        // Initial end time calculation
        updateEndTime();
    }

    showCombinedInput() {
        // Clean up any existing dialog
        if (this.currentDialog) {
            this.currentDialog.hide();
        }

        this.currentDialog = new InputDialog({
            fields: [
                {
                    name: 'activity',
                    label: 'Activity',
                    type: 'number',
                    min: 0,
                    max: 500,
                    value: this.data.currentPoints
                },
                {
                    name: 'calls',
                    label: 'Calls',
                    type: 'number',
                    min: 0,
                    max: 200,
                    value: this.data.currentCalls
                },
                {
                    name: 'backlog',
                    label: 'Backlog',
                    type: 'number',
                    min: 0,
                    max: 2000,
                    value: this.data.currentBacklog
                },
                {
                    name: 'dailyRevenue',
                    label: 'Daily Rev',
                    type: 'number',
                    min: 0,
                    max: 200000,
                    value: this.data.currentDailyRevenue || 0,
                    step: 100
                },
                {
                    name: 'monthlyRevenue',
                    label: 'Monthly Rev',
                    type: 'number',
                    min: 0,
                    max: 2000000,
                    value: this.data.currentMonthlyRevenue || 0,
                    step: 1000
                }
            ],
            onSave: async values => {
                try {
                    // Update all values using combined method
                    const metrics = {
                        currentPoints: values.activity,
                        currentCalls: values.calls,
                        currentBacklog: values.backlog,
                        currentDailyRevenue: values.dailyRevenue,
                        currentMonthlyRevenue: values.monthlyRevenue
                    };
                    
                    await this.dataManager.updateCombined(metrics);

                    // Reload data to get updated values
                    await this.loadData();
                    this.updateDisplay();

                } catch (error) {
                    console.error('Error updating values:', error);
                    this.showError('Failed to update values');
                }
            },
            onCancel: () => {
                console.log('Input cancelled');
            }
        });

        this.currentDialog.show();
    }

    updateTimeMarkers() {
        try {
            const markersContainer = document.querySelector('.time-markers');
            if (!markersContainer) return;

            markersContainer.innerHTML = '';

            const startTime = this.dataManager.parseTime(this.data.shiftStart);
            const endTime = this.dataManager.parseTime(this.data.shiftEnd);
            const shiftDurationHours = endTime.hour - startTime.hour;

            for (let i = 0; i <= shiftDurationHours; i++) {
                const marker = document.createElement('span');
                marker.className = 'time-marker';

                const hour = startTime.hour + i;
                const hourStr = hour.toString().padStart(2, '0');
                marker.textContent = hourStr;

                const percentPosition = shiftDurationHours === 0 ? 50 : (i / shiftDurationHours) * 100;
                marker.style.left = `${percentPosition}%`;

                markersContainer.appendChild(marker);
            }
        } catch (error) {
            console.error('Error updating time markers:', error);
        }
    }

    cleanupDialogEvents(eventListeners) {
        eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #ff4444;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            z-index: 6000;
            font-size: 11px;
            max-width: 250px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    // Test functions for debugging
    testTime(hour) {
        console.log(`Testing with hour: ${hour}`);
        // Mock the current hour for testing
        const originalGetHours = Date.prototype.getHours;
        Date.prototype.getHours = () => hour;
        this.updateDisplay();
        Date.prototype.getHours = originalGetHours;
    }

    resetSetup() {
        localStorage.removeItem('shiftSetupComplete');
        location.reload();
    }

    // Cleanup method for proper disposal
    destroy() {
        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });

        // Clean up progress bars
        Object.values(this.progressBars).forEach(bar => {
            if (bar.destroy) {
                bar.destroy();
            }
        });

        // Clean up current dialog
        if (this.currentDialog) {
            this.currentDialog.hide();
        }

        console.log('ActivityTracker cleaned up');
    }
}

// Initialize the tracker when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ActivityTracker');
    try {
        const tracker = new ActivityTracker();
        console.log('ActivityTracker initialized successfully');

        // Make tracker available globally for testing
        window.tracker = tracker;
        console.log('Tracker available globally as window.tracker');
        console.log('Try: tracker.testTime(14) to test 2PM');
        console.log('Try: tracker.resetSetup() to see setup dialog again');
    } catch (error) {
        console.error('Error initializing ActivityTracker:', error);
    }
});
