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
            console.log('Data loaded successfully:', this.data);
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback data
            this.data = {
                date: new Date().toDateString(),
                shiftStart: "09:00",
                shiftEnd: "17:00", 
                target: 50,
                currentPoints: 0,
                lastUpdated: new Date().toISOString()
            };
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
            
            // Simplified layout for compact window
            dialog.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;">
                    <div style="display:flex;align-items:center;gap:6px;justify-content:center;">
                        <div style="display:flex;align-items:center;gap:2px;">
                            <label style="font-size:9px;color:#555;">Start:</label>
                            <input type="time" id="setupShiftStart" value="${this.data.shiftStart}" style="width:60px;padding:1px;border:1px solid #ddd;border-radius:2px;font-size:8px;">
                        </div>
                        <div style="display:flex;align-items:center;gap:2px;">
                            <label style="font-size:9px;color:#555;">End:</label>
                            <input type="time" id="setupShiftEnd" value="${this.data.shiftEnd}" style="width:60px;padding:1px;border:1px solid #ddd;border-radius:2px;background:#f8f8f8;font-size:8px;" readonly>
                            <button id="endTimeLock" style="background:#f0f0f0;border:1px solid #ccc;cursor:pointer;font-size:10px;padding:1px 2px;color:#333;border-radius:2px;" title="Click to unlock end time editing">🔒</button>
                        </div>
                        <div style="display:flex;align-items:center;gap:2px;">
                            <label style="font-size:9px;color:#555;">Target:</label>
                            <input type="number" id="setupTarget" value="${this.data.target}" min="1" max="200" style="width:40px;padding:1px;border:1px solid #ddd;border-radius:2px;font-size:8px;text-align:center;">
                        </div>
                        <button id="setupComplete" style="background:#007acc;color:white;border:none;padding:2px 6px;border-radius:2px;cursor:pointer;font-size:8px;font-weight:bold;">Save</button>
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
                    const target = parseInt(document.getElementById('setupTarget').value);
                    
                    console.log('Setup values:', { shiftStart, shiftEnd, target });
                    
                    // Update data using captured context
                    const updatedData = await window.electronAPI.updateSettings({ shiftStart, shiftEnd, target });
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
        });
    }

    setupEventListeners() {
        // Click to update points
        const progressBar = document.getElementById('progressBar');
        console.log('Setting up listeners, progressBar found:', !!progressBar);
        
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                console.log('Progress bar clicked');
                e.preventDefault();
                this.showPointsInput();
            });
        } else {
            console.error('progressBar element not found!');
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

        // Make draggable areas (everywhere except progress bar)
        document.body.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on progress bar or dialogs
            if (e.target.closest('#progressBar') || e.target.closest('[style*="z-index"]')) {
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
        const activityFill = document.getElementById('activityFill');
        const progressPercent = (this.data.currentPoints / this.data.target) * 100;
        
        console.log('Updating progress bar:');
        console.log('- Element found:', !!activityFill);
        console.log('- Element:', activityFill);
        console.log('- Current points:', this.data.currentPoints);
        console.log('- Target:', this.data.target);
        console.log('- Progress percent:', progressPercent);
        
        if (!activityFill) {
            console.error('activityFill element not found!');
            return;
        }
        
        // Force visibility and debugging styles
        activityFill.style.display = 'block';
        activityFill.style.visibility = 'visible';
        activityFill.style.width = `${Math.min(progressPercent, 100)}%`;
        console.log('- Set width to:', `${Math.min(progressPercent, 100)}%`);
        console.log('- Element computed style width:', window.getComputedStyle(activityFill).width);
        console.log('- Element computed style background:', window.getComputedStyle(activityFill).background);
        
        // Color coding based on expected progress
        const expectedPoints = this.calculateExpectedPoints();
        const ratio = this.data.currentPoints / expectedPoints;
        
        console.log('- Expected points:', expectedPoints);
        console.log('- Ratio (actual/expected):', ratio);
        
        activityFill.className = 'activity-fill';
        if (ratio >= 1.0) {
            activityFill.classList.add('ahead');
            console.log('- Color: GREEN (ahead)');
        } else if (ratio >= 0.9) {
            activityFill.classList.add('close');
            console.log('- Color: YELLOW (close)');
        } else {
            activityFill.classList.add('behind');
            console.log('- Color: RED (behind)');
        }
        
        console.log('- Final element classes:', activityFill.className);
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
        
        const expectedLine = document.getElementById('expectedLine');
        expectedLine.style.left = `${timePercent}%`;
        
        console.log('- Shift start:', shiftStart);
        console.log('- Shift end:', shiftEnd);
        console.log('- Time percent:', timePercent);
        console.log('- Expected line position:', `${timePercent}%`);
    }

    updatePointsDisplay() {
        const display = document.getElementById('pointsDisplay');
        display.textContent = `${this.data.currentPoints}/${this.data.target}`;
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

    parseTime(timeString) {
        const [hour, minute] = timeString.split(':').map(Number);
        return { hour, minute };
    }

    showPointsInput() {
        console.log('showPointsInput called');
        // Create full-window input dialog that matches window dimensions
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:white;z-index:3000;display:flex;align-items:center;justify-content:center;border-radius:4px;';
        
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;padding:8px;width:100%;height:100%;text-align:center;display:flex;align-items:center;justify-content:center;';
        
        dialog.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;font-weight:bold;color:#333;white-space:nowrap;">Points:</span>
                <input type="number" id="pointsInput" value="${this.data.currentPoints}" min="0" max="200" 
                       style="width:60px;padding:3px;text-align:center;border:1px solid #007acc;border-radius:2px;font-size:11px;">
                <button id="savePoints" style="background:#007acc;color:white;border:none;padding:3px 8px;border-radius:2px;cursor:pointer;font-size:10px;">Save</button>
                <button id="cancelPoints" style="background:#ccc;color:#333;border:none;padding:3px 8px;border-radius:2px;cursor:pointer;font-size:10px;">Cancel</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const input = document.getElementById('pointsInput');
        input.focus();
        input.select();
        
        const cleanup = () => {
            document.body.removeChild(overlay);
        };
        
        document.getElementById('savePoints').addEventListener('click', () => {
            const points = parseInt(input.value);
            console.log('User entered:', points);
            if (!isNaN(points)) {
                this.updatePoints(points);
            }
            cleanup();
        });
        
        document.getElementById('cancelPoints').addEventListener('click', cleanup);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const points = parseInt(input.value);
                if (!isNaN(points)) {
                    this.updatePoints(points);
                }
                cleanup();
            } else if (e.key === 'Escape') {
                cleanup();
            }
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup();
        });
    }

    async updatePoints(points) {
        this.data = await window.electronAPI.updatePoints(points);
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