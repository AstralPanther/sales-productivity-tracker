class ActivityTracker {
    constructor() {
        this.data = null;
        this.updateInterval = null;
        this.init();
    }

    async init() {
        console.log('ActivityTracker.init() called');
        await this.loadData();
        console.log('Data loaded:', this.data);
        
        // Check if this is first run or needs setup
        await this.checkInitialSetup();
        
        this.setupEventListeners();
        console.log('Event listeners set up');
        this.updateTimeMarkers(); // Create time markers and notches on startup
        this.startUpdateLoop();
        this.updateDisplay();
        console.log('Initialization complete');
    }

    async loadData() {
        try {
            console.log('Loading data via electronAPI...');
            if (!window.electronAPI) {
                throw new Error('electronAPI not available');
            }
            this.data = await window.electronAPI.getData();
            
            // Load calls data from localStorage (temporary solution)
            const savedCalls = localStorage.getItem('currentCalls');
            if (savedCalls) {
                this.data.currentCalls = parseInt(savedCalls) || 0;
            } else {
                this.data.currentCalls = 0;
            }
            
            // Ensure callsTarget exists
            if (!this.data.callsTarget) {
                this.data.callsTarget = 20;
            }
            
            console.log('Data loaded successfully:', this.data);
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback data
            this.data = {
                date: new Date().toDateString(),
                shiftStart: "09:00",
                shiftEnd: "17:00", 
                target: 50,
                callsTarget: 20,
                currentPoints: 0,
                currentCalls: 0,
                lastUpdated: new Date().toISOString()
            };
            
            // Load calls data from localStorage (temporary solution)
            const savedCalls = localStorage.getItem('currentCalls');
            if (savedCalls) {
                this.data.currentCalls = parseInt(savedCalls) || 0;
            }
        }
    }

    async checkInitialSetup() {
        // Check if user needs to set up shift times
        const isFirstRun = !localStorage.getItem('shiftSetupComplete');
        
        if (isFirstRun) {
            console.log('First run detected, prompting for shift setup');
            await this.showShiftSetupDialog();
            localStorage.setItem('shiftSetupComplete', 'true');
        }
    }

    async showShiftSetupDialog() {
        return new Promise((resolve) => {
            console.log('showShiftSetupDialog called');
            // Create full-window setup dialog that matches window dimensions  
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:white;z-index:5000;display:flex;align-items:center;justify-content:center;border-radius:4px;';
            
            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:white;padding:8px;width:100%;height:100%;text-align:center;font-size:11px;-webkit-app-region:no-drag;display:flex;align-items:center;justify-content:center;';
            
            const isFirstRun = !localStorage.getItem('shiftSetupComplete');
            const title = isFirstRun ? 'Welcome to Activity Points Tracker!' : 'Settings';
            const subtitle = isFirstRun ? 'Let\'s set up your daily shift schedule.' : 'Update your shift schedule and daily target.';
            
            // 3-column layout with vertical stacking to optimize 400x80px space
            dialog.innerHTML = `
                <div style="display:flex;align-items:stretch;height:100%;width:100%;padding:8px 12px;overflow:hidden;gap:16px;">
                    
                    <!-- Column 1: Times -->
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
                        <!-- Lock button positioned to the right, vertically centered -->
                        <button id="endTimeLock" 
                                style="background:#f0f0f0;border:1px solid #ccc;cursor:pointer;font-size:12px;padding:3px 6px;color:#333;border-radius:3px;flex-shrink:0;" 
                                title="Lock/unlock">🔒</button>
                    </div>
                    
                    <!-- Column 2: Targets -->
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
                    </div>
                    
                    <!-- Column 3: Actions -->
                    <div style="display:flex;flex-direction:column;justify-content:center;gap:6px;flex:0 0 auto;">
                        <button id="setupComplete" 
                                style="background:#007acc;color:white;border:none;padding:8px 16px;border-radius:3px;cursor:pointer;font-size:12px;font-weight:500;">Save</button>
                        <button id="setupCancel" 
                                style="background:#ccc;color:#333;border:none;padding:8px 16px;border-radius:3px;cursor:pointer;font-size:12px;font-weight:500;">Cancel</button>
                    </div>
                    
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Auto-calculate end time when start time changes
            const startTimeInput = document.getElementById('setupShiftStart');
            const endTimeInput = document.getElementById('setupShiftEnd');
            const lockButton = document.getElementById('endTimeLock');
            let isEndTimeLocked = true; // Start locked
            
            console.log('Lock button debug:', {
                startTimeInput: !!startTimeInput,
                endTimeInput: !!endTimeInput,
                lockButton: !!lockButton,
                lockButtonElement: lockButton,
                isFirstRun: isFirstRun
            });
            
            if (!lockButton) {
                console.error('Lock button not found in DOM!');
                console.log('Dialog HTML:', dialog.innerHTML);
            }
            
            const updateEndTime = () => {
                if (!isEndTimeLocked) return; // Don't auto-update if unlocked
                
                const startTime = startTimeInput.value;
                if (startTime) {
                    const [hours, minutes] = startTime.split(':').map(Number);
                    const startDate = new Date();
                    startDate.setHours(hours, minutes, 0, 0);
                    
                    // Add 8 hours
                    const endDate = new Date(startDate.getTime() + (8 * 60 * 60 * 1000));
                    
                    // Format as HH:MM
                    const endHours = endDate.getHours().toString().padStart(2, '0');
                    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
                    
                    endTimeInput.value = `${endHours}:${endMinutes}`;
                }
            };
            
            const toggleEndTimeLock = () => {
                isEndTimeLocked = !isEndTimeLocked;
                if (isEndTimeLocked) {
                    // Lock: readonly, gray background, locked icon
                    endTimeInput.readOnly = true;
                    endTimeInput.style.background = '#f8f8f8';
                    lockButton.textContent = '🔒';
                    lockButton.title = 'Click to unlock end time editing';
                    updateEndTime(); // Recalculate when locking
                } else {
                    // Unlock: editable, white background, unlocked icon  
                    endTimeInput.readOnly = false;
                    endTimeInput.style.background = 'white';
                    lockButton.textContent = '🔓';
                    lockButton.title = 'Click to lock end time (auto +8hrs)';
                }
            };
            
            // Lock button functionality
            lockButton.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleEndTimeLock();
            });
            
            // Initial calculation
            updateEndTime();
            
            // Update when start time changes (only if locked)
            startTimeInput.addEventListener('change', updateEndTime);
            startTimeInput.addEventListener('input', updateEndTime);
            
            const completeButton = document.getElementById('setupComplete');
            console.log('Setup complete button:', completeButton);
            
            const self = this; // Capture 'this' context
            completeButton.addEventListener('click', async (e) => {
                console.log('Setup complete button clicked');
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    const shiftStart = document.getElementById('setupShiftStart').value;
                    const shiftEnd = document.getElementById('setupShiftEnd').value;
                    const activityTarget = parseInt(document.getElementById('setupTarget').value);
                    const callsTarget = parseInt(document.getElementById('setupCallsTarget').value);
                    
                    console.log('Setup values:', { shiftStart, shiftEnd, activityTarget, callsTarget });
                    
                    // Update data using captured context
                    const updatedData = await window.electronAPI.updateSettings({ 
                        shiftStart, 
                        shiftEnd, 
                        target: activityTarget 
                    });
                    
                    // Save calls target locally for now
                    localStorage.setItem('callsTarget', callsTarget.toString());
                    self.data = updatedData; // Update local data
                    console.log('Settings updated');
                    
                    // Update time markers
                    self.updateTimeMarkers();
                    console.log('Time markers updated');
                    
                    // Clean up
                    document.body.removeChild(overlay);
                    console.log('Setup dialog closed');
                    resolve();
                } catch (error) {
                    console.error('Error in setup complete:', error);
                }
            });
            
            // Add cancel button handler
            const cancelButton = document.getElementById('setupCancel');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    console.log('Setup cancelled');
                    document.body.removeChild(overlay);
                    resolve();
                });
            }
        });
    }

    setupEventListeners() {
        // Click either progress bar to update both metrics
        const activityBar = document.getElementById('activityBar');
        const callsBar = document.getElementById('callsBar');
        
        if (activityBar) {
            activityBar.addEventListener('click', (e) => {
                console.log('Activity bar clicked');
                e.preventDefault();
                this.showCombinedInput();
            });
        }
        
        if (callsBar) {
            callsBar.addEventListener('click', (e) => {
                console.log('Calls bar clicked');
                e.preventDefault();
                this.showCombinedInput();
            });
        }

        // Right-click to open settings - clear cache first to force fresh dialog
        document.addEventListener('contextmenu', async (e) => {
            e.preventDefault();
            // Force clear localStorage cache to regenerate dialog
            localStorage.removeItem('shiftSetupComplete');
            await window.electronAPI.clearSetupCache();
            this.showShiftSetupDialog();
        });

        // Add manual window dragging as backup to CSS dragging
        this.setupWindowDragging();
    }

    setupWindowDragging() {
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };

        // Make draggable areas (everywhere except progress bars)
        document.body.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on progress bars or dialogs
            if (e.target.closest('#activityBar') || e.target.closest('#callsBar') || e.target.closest('[style*="z-index"]')) {
                return;
            }
            
            isDragging = true;
            dragStart = { x: e.clientX, y: e.clientY };
            window.electronAPI.startDrag();
        });

        document.body.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - dragStart.x;
            const deltaY = e.clientY - dragStart.y;
            
            window.electronAPI.moveWindow({ x: deltaX, y: deltaY });
            dragStart = { x: e.clientX, y: e.clientY };
        });

        document.body.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    startUpdateLoop() {
        // Update every 5 minutes to keep time indicator current
        this.updateInterval = setInterval(() => {
            this.updateDisplay();
        }, 5 * 60 * 1000);
    }

    updateDisplay(testHour = null) {
        this.updateProgressBar();
        this.updateTimeIndicator(testHour);
        this.updatePointsDisplay();
    }
    
    // Test function for console debugging
    testTime(hour) {
        console.log(`Testing with hour: ${hour}`);
        this.updateDisplay(hour);
    }
    
    // Reset setup for testing
    resetSetup() {
        localStorage.removeItem('shiftSetupComplete');
        location.reload();
    }

    updateProgressBar() {
        // Update Activity Progress Bar
        const activityFill = document.getElementById('activityFill');
        const activityProgressPercent = (this.data.currentPoints / this.data.target) * 100;
        
        if (activityFill) {
            activityFill.style.display = 'block';
            activityFill.style.visibility = 'visible';
            activityFill.style.width = `${Math.min(activityProgressPercent, 100)}%`;
            
            // Color coding for activity based on expected progress
            const expectedPoints = this.calculateExpectedPoints();
            const activityRatio = this.data.currentPoints / expectedPoints;
            
            activityFill.className = 'activity-fill';
            if (activityRatio >= 1.0) {
                activityFill.classList.add('ahead');
            } else if (activityRatio >= 0.9) {
                activityFill.classList.add('close');
            } else {
                activityFill.classList.add('behind');
            }
        }
        
        // Update Calls Progress Bar
        const callsFill = document.getElementById('callsFill');
        const callsProgressPercent = (this.data.currentCalls / this.data.callsTarget) * 100;
        
        if (callsFill) {
            callsFill.style.display = 'block';
            callsFill.style.visibility = 'visible';
            callsFill.style.width = `${Math.min(callsProgressPercent, 100)}%`;
            
            // Color coding for calls based on expected progress
            const expectedCalls = this.calculateExpectedCalls();
            const callsRatio = this.data.currentCalls / expectedCalls;
            
            callsFill.className = 'activity-fill';
            if (callsRatio >= 1.0) {
                callsFill.classList.add('ahead');
            } else if (callsRatio >= 0.9) {
                callsFill.classList.add('close');
            } else {
                callsFill.classList.add('behind');
            }
        }
    }

    updateTimeIndicator(testHour = null) {
        const now = new Date();
        const currentHour = testHour !== null ? testHour : now.getHours();
        const currentMinute = now.getMinutes();
        
        console.log('Updating time indicator:');
        console.log('- Current hour:', currentHour, '(test mode:', testHour !== null, ')');
        console.log('- Current minute:', currentMinute);
        
        const shiftStart = this.parseTime(this.data.shiftStart);
        const shiftEnd = this.parseTime(this.data.shiftEnd);
        
        // Calculate position based on time progression through shift
        const shiftDurationMinutes = (shiftEnd.hour - shiftStart.hour) * 60 + (shiftEnd.minute - shiftStart.minute);
        const currentMinutesSinceStart = (currentHour - shiftStart.hour) * 60 + (currentMinute - shiftStart.minute);
        
        let timePercent = 0;
        if (currentMinutesSinceStart >= 0 && currentMinutesSinceStart <= shiftDurationMinutes) {
            timePercent = (currentMinutesSinceStart / shiftDurationMinutes) * 100;
        } else if (currentMinutesSinceStart > shiftDurationMinutes) {
            timePercent = 100;
        }
        
        // Update both expected lines
        const expectedLine1 = document.getElementById('expectedLine1');
        const expectedLine2 = document.getElementById('expectedLine2');
        
        if (expectedLine1) {
            expectedLine1.style.left = `${timePercent}%`;
        }
        if (expectedLine2) {
            expectedLine2.style.left = `${timePercent}%`;
        }
        
        console.log('- Shift start:', shiftStart);
        console.log('- Shift end:', shiftEnd);
        console.log('- Time percent:', timePercent);
        console.log('- Expected line position:', `${timePercent}%`);
    }

    updatePointsDisplay() {
        const activityDisplay = document.getElementById('activityDisplay');
        const callsDisplay = document.getElementById('callsDisplay');
        
        if (activityDisplay) {
            activityDisplay.textContent = `${this.data.currentPoints}/${this.data.target}`;
        }
        
        if (callsDisplay) {
            callsDisplay.textContent = `${this.data.currentCalls}/${this.data.callsTarget}`;
        }
    }

    calculateExpectedPoints() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const shiftStart = this.parseTime(this.data.shiftStart);
        const shiftEnd = this.parseTime(this.data.shiftEnd);
        
        const shiftDurationMinutes = (shiftEnd.hour - shiftStart.hour) * 60 + (shiftEnd.minute - shiftStart.minute);
        const currentMinutesSinceStart = (currentHour - shiftStart.hour) * 60 + (currentMinute - shiftStart.minute);
        
        if (currentMinutesSinceStart <= 0) {
            return 0;
        } else if (currentMinutesSinceStart >= shiftDurationMinutes) {
            return this.data.target;
        } else {
            const progressRatio = currentMinutesSinceStart / shiftDurationMinutes;
            return Math.round(this.data.target * progressRatio);
        }
    }

    calculateExpectedCalls() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const shiftStart = this.parseTime(this.data.shiftStart);
        const shiftEnd = this.parseTime(this.data.shiftEnd);
        
        const shiftDurationMinutes = (shiftEnd.hour - shiftStart.hour) * 60 + (shiftEnd.minute - shiftStart.minute);
        const currentMinutesSinceStart = (currentHour - shiftStart.hour) * 60 + (currentMinute - shiftStart.minute);
        
        if (currentMinutesSinceStart <= 0) {
            return 0;
        } else if (currentMinutesSinceStart >= shiftDurationMinutes) {
            return this.data.callsTarget;
        } else {
            const progressRatio = currentMinutesSinceStart / shiftDurationMinutes;
            return Math.round(this.data.callsTarget * progressRatio);
        }
    }

    parseTime(timeString) {
        const [hour, minute] = timeString.split(':').map(Number);
        return { hour, minute };
    }

    showCombinedInput() {
        console.log('showCombinedInput called');
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:white;z-index:3000;display:flex;align-items:center;justify-content:center;border-radius:4px;';
        
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;padding:8px;width:100%;height:100%;text-align:center;display:flex;align-items:center;justify-content:center;';
        
        dialog.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-size:11px;font-weight:bold;color:#333;white-space:nowrap;">Activity:</span>
                <input type="number" id="activityInput" value="${this.data.currentPoints}" min="0" max="200" 
                       style="width:50px;padding:3px;text-align:center;border:1px solid #007acc;border-radius:2px;font-size:11px;">
                <span style="font-size:11px;font-weight:bold;color:#333;white-space:nowrap;">Calls:</span>
                <input type="number" id="callsInput" value="${this.data.currentCalls}" min="0" max="100" 
                       style="width:50px;padding:3px;text-align:center;border:1px solid #007acc;border-radius:2px;font-size:11px;">
                <button id="saveBoth" style="background:#007acc;color:white;border:none;padding:3px 8px;border-radius:2px;cursor:pointer;font-size:10px;">Save</button>
                <button id="cancelBoth" style="background:#ccc;color:#333;border:none;padding:3px 8px;border-radius:2px;cursor:pointer;font-size:10px;">Cancel</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const activityInput = document.getElementById('activityInput');
        const callsInput = document.getElementById('callsInput');
        
        // Focus first input and select text
        activityInput.focus();
        activityInput.select();
        
        const cleanup = () => {
            document.body.removeChild(overlay);
        };
        
        const saveValues = () => {
            const points = parseInt(activityInput.value);
            const calls = parseInt(callsInput.value);
            
            console.log('User entered - Activity:', points, 'Calls:', calls);
            
            if (!isNaN(points)) {
                this.updateActivityPoints(points);
            }
            if (!isNaN(calls)) {
                this.updateCalls(calls);
            }
            cleanup();
        };
        
        document.getElementById('saveBoth').addEventListener('click', saveValues);
        document.getElementById('cancelBoth').addEventListener('click', cleanup);
        
        // Tab between fields and Enter to save
        activityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                callsInput.focus();
                callsInput.select();
            } else if (e.key === 'Enter') {
                saveValues();
            } else if (e.key === 'Escape') {
                cleanup();
            }
        });
        
        callsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                activityInput.focus();
                activityInput.select();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                // Tab from last field - could focus Save button or loop back
                activityInput.focus();
                activityInput.select();
            } else if (e.key === 'Enter') {
                saveValues();
            } else if (e.key === 'Escape') {
                cleanup();
            }
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup();
        });
    }

    async updateActivityPoints(points) {
        this.data.currentPoints = points;
        this.data = await window.electronAPI.updatePoints(points);
        
        // Ensure callsTarget and currentCalls are preserved after update
        if (!this.data.callsTarget) {
            this.data.callsTarget = 20;
        }
        if (!this.data.currentCalls) {
            const savedCalls = localStorage.getItem('currentCalls');
            this.data.currentCalls = savedCalls ? parseInt(savedCalls) || 0 : 0;
        }
        
        this.updateDisplay();
    }

    async updateCalls(calls) {
        this.data.currentCalls = calls;
        // For now, save calls data locally - we may need to extend the main process later
        localStorage.setItem('currentCalls', calls.toString());
        this.updateDisplay();
    }

    // Context menu and settings panel methods removed - right-click now directly opens setup dialog

    updateTimeMarkers() {
        const shiftStart = this.parseTime(this.data.shiftStart);
        const shiftEnd = this.parseTime(this.data.shiftEnd);
        const shiftDurationHours = shiftEnd.hour - shiftStart.hour;
        
        // Clear existing markers
        const markersContainer = document.querySelector('.time-markers');
        markersContainer.innerHTML = '';
        
        // Create markers using same positioning logic as notches
        const totalMarkers = shiftDurationHours + 1; // Including start and end
        
        for (let i = 0; i <= shiftDurationHours; i++) {
            const marker = document.createElement('span');
            marker.className = 'time-marker';
            
            const hour = shiftStart.hour + i;
            const hourStr = hour.toString().padStart(2, '0');
            marker.textContent = hourStr;
            marker.style.fontWeight = 'bold';
            
            // Position marker using same logic as notches
            let percentPosition;
            if (totalMarkers === 1) {
                percentPosition = 50; // Single marker in center
            } else {
                percentPosition = (i / (totalMarkers - 1)) * 100;
            }
            
            marker.style.left = `${percentPosition}%`;
            console.log(`Positioning time marker ${hourStr} at ${percentPosition}%`);
            
            markersContainer.appendChild(marker);
        }
        
        // Hour notches removed - time scale alignment is now perfect
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