class DataManager {
    constructor(isElectron = false) {
        this.isElectron = isElectron;
        this.dataKey = 'activityTracker';
        this.defaultData = this.getDefaultData();
        this.electronAPI = isElectron ? window.electronAPI : null;
    }

    getDefaultData() {
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

    validateData(data) {
        const errors = [];

        // Validate basic structure
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data structure');
        }

        // Validate numeric fields
        const numericFields = {
            target: { min: 1, max: 200 },
            callsTarget: { min: 1, max: 100 },
            backlogTarget: { min: 0, max: 1000 },
            dailyRevenueTarget: { min: 0, max: 100000 },
            monthlyRevenueTarget: { min: 0, max: 1000000 },
            currentPoints: { min: 0, max: 500 },
            currentCalls: { min: 0, max: 200 },
            currentBacklog: { min: 0, max: 2000 },
            currentDailyRevenue: { min: 0, max: 200000 },
            currentMonthlyRevenue: { min: 0, max: 2000000 }
        };

        Object.entries(numericFields).forEach(([field, limits]) => {
            const value = data[field];
            if (typeof value !== 'number' || isNaN(value)) {
                errors.push(`${field} must be a valid number`);
            } else if (value < limits.min || value > limits.max) {
                errors.push(`${field} must be between ${limits.min} and ${limits.max}`);
            }
        });

        // Validate time fields
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(data.shiftStart)) {
            errors.push('Invalid shift start time format');
        }
        if (!timeRegex.test(data.shiftEnd)) {
            errors.push('Invalid shift end time format');
        }

        // Validate date
        if (!data.date || typeof data.date !== 'string') {
            errors.push('Invalid date format');
        }

        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }

        return true;
    }

    sanitizeInput(value, type = 'number', options = {}) {
        switch (type) {
            case 'number': {
                const num = parseInt(value);
                if (isNaN(num)) return options.default || 0;

                return Math.min(Math.max(num, options.min || 0), options.max || 1000);
            }

            case 'time':
                if (typeof value !== 'string' || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                    return options.default || '09:00';
                }

                return value;

            case 'string':
                return String(value).trim();

            default:
                return value;
        }
    }

    async loadData() {
        try {
            let data;

            if (this.isElectron && this.electronAPI) {
                data = await this.electronAPI.getData();
            } else {
                const stored = localStorage.getItem(this.dataKey);
                if (stored) {
                    data = JSON.parse(stored);
                    data = this.checkAndResetForNewDay(data);
                } else {
                    data = this.getDefaultData();
                }
            }

            this.validateData(data);

            return data;
        } catch (error) {
            console.error('Error loading data:', error);

            return this.getDefaultData();
        }
    }

    async saveData(data) {
        try {
            this.validateData(data);
            data.lastUpdated = new Date().toISOString();

            if (this.isElectron && this.electronAPI) {
                return await this.electronAPI.updatePoints(data.currentPoints);
            } else {
                localStorage.setItem(this.dataKey, JSON.stringify(data));

                return data;
            }
        } catch (error) {
            console.error('Error saving data:', error);
            throw error;
        }
    }

    async updatePoints(points) {
        try {
            const sanitizedPoints = this.sanitizeInput(points, 'number', { min: 0, max: 500 });

            if (this.isElectron && this.electronAPI) {
                return await this.electronAPI.updatePoints(sanitizedPoints);
            } else {
                const data = await this.loadData();
                data.currentPoints = sanitizedPoints;

                return await this.saveData(data);
            }
        } catch (error) {
            console.error('Error updating points:', error);
            throw error;
        }
    }

    async updateCombined(metrics) {
        try {
            const sanitizedMetrics = {
                currentPoints: this.sanitizeInput(metrics.currentPoints, 'number', { min: 0, max: 500 }),
                currentCalls: this.sanitizeInput(metrics.currentCalls, 'number', { min: 0, max: 200 }),
                currentBacklog: this.sanitizeInput(metrics.currentBacklog, 'number', { min: 0, max: 2000 }),
                currentDailyRevenue: this.sanitizeInput(metrics.currentDailyRevenue, 'number', { min: 0, max: 200000 }),
                currentMonthlyRevenue: this.sanitizeInput(metrics.currentMonthlyRevenue, 'number', { min: 0, max: 2000000 })
            };

            if (this.isElectron && this.electronAPI) {
                return await this.electronAPI.updateCombined(sanitizedMetrics);
            } else {
                const data = await this.loadData();
                Object.assign(data, sanitizedMetrics);
                return await this.saveData(data);
            }
        } catch (error) {
            console.error('Error updating combined metrics:', error);
            throw error;
        }
    }

    async updateCalls(calls) {
        try {
            const sanitizedCalls = this.sanitizeInput(calls, 'number', { min: 0, max: 200 });
            const data = await this.loadData();
            data.currentCalls = sanitizedCalls;

            if (!this.isElectron) {
                localStorage.setItem('currentCalls', String(sanitizedCalls));
            }

            return await this.saveData(data);
        } catch (error) {
            console.error('Error updating calls:', error);
            throw error;
        }
    }

    async updateBacklog(backlog) {
        try {
            const sanitizedBacklog = this.sanitizeInput(backlog, 'number', { min: 0, max: 2000 });
            const data = await this.loadData();
            data.currentBacklog = sanitizedBacklog;

            if (!this.isElectron) {
                localStorage.setItem('currentBacklog', String(sanitizedBacklog));
            }

            return await this.saveData(data);
        } catch (error) {
            console.error('Error updating backlog:', error);
            throw error;
        }
    }

    async updateSettings(settings) {
        try {
            const data = await this.loadData();

            if (settings.shiftStart) {
                data.shiftStart = this.sanitizeInput(settings.shiftStart, 'time', { default: '09:00' });
            }
            if (settings.shiftEnd) {
                data.shiftEnd = this.sanitizeInput(settings.shiftEnd, 'time', { default: '17:00' });
            }
            if (settings.target !== undefined) {
                data.target = this.sanitizeInput(settings.target, 'number', { min: 1, max: 200 });
            }
            if (settings.callsTarget !== undefined) {
                data.callsTarget = this.sanitizeInput(settings.callsTarget, 'number', { min: 1, max: 100 });
            }
            if (settings.backlogTarget !== undefined) {
                data.backlogTarget = this.sanitizeInput(settings.backlogTarget, 'number', { min: 0, max: 1000 });
            }
            if (settings.dailyRevenueTarget !== undefined) {
                data.dailyRevenueTarget = this.sanitizeInput(settings.dailyRevenueTarget, 'number', { min: 0, max: 100000 });
            }
            if (settings.monthlyRevenueTarget !== undefined) {
                data.monthlyRevenueTarget = this.sanitizeInput(settings.monthlyRevenueTarget, 'number', { min: 0, max: 1000000 });
            }

            if (this.isElectron && this.electronAPI) {
                await this.electronAPI.updateSettings({
                    shiftStart: data.shiftStart,
                    shiftEnd: data.shiftEnd,
                    target: data.target,
                    callsTarget: data.callsTarget,
                    backlogTarget: data.backlogTarget,
                    dailyRevenueTarget: data.dailyRevenueTarget,
                    monthlyRevenueTarget: data.monthlyRevenueTarget
                });
            }

            return await this.saveData(data);
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    checkAndResetForNewDay(data) {
        const today = new Date().toDateString();
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        if (data.date !== today) {
            const newData = this.getDefaultData();
            // Preserve settings
            newData.shiftStart = data.shiftStart;
            newData.shiftEnd = data.shiftEnd;
            newData.target = data.target;
            newData.callsTarget = data.callsTarget;
            newData.backlogTarget = data.backlogTarget;
            newData.dailyRevenueTarget = data.dailyRevenueTarget;
            newData.monthlyRevenueTarget = data.monthlyRevenueTarget;
            
            // Preserve monthly revenue if same month
            if (data.month === currentMonth) {
                newData.currentMonthlyRevenue = data.currentMonthlyRevenue || 0;
            }

            return newData;
        }

        return data;
    }

    // Utility methods for calculations
    parseTime(timeString) {
        const [hour, minute] = timeString.split(':').map(Number);

        return { hour, minute };
    }

    calculateExpectedProgress(shiftStart, shiftEnd, target, testHour = null) {
        const now = new Date();
        const currentHour = testHour !== null ? testHour : now.getHours();
        const currentMinute = testHour !== null ? 0 : now.getMinutes();

        const startTime = this.parseTime(shiftStart);
        const endTime = this.parseTime(shiftEnd);

        const shiftDurationMinutes = (endTime.hour - startTime.hour) * 60 + (endTime.minute - startTime.minute);
        const currentMinutesSinceStart = (currentHour - startTime.hour) * 60 + (currentMinute - startTime.minute);

        if (currentMinutesSinceStart <= 0) {
            return 0;
        } else if (currentMinutesSinceStart >= shiftDurationMinutes) {
            return target;
        } else {
            const progressRatio = currentMinutesSinceStart / shiftDurationMinutes;

            return Math.round(target * progressRatio);
        }
    }

    getProgressRatio(current, expected) {
        if (expected === 0) return current > 0 ? 1 : 0;

        return current / expected;
    }

    getCompletionRatio(current, target) {
        return current / target;
    }

    getColorClass(progressRatio, completionRatio) {
        if (completionRatio >= 1.0) {
            return 'complete'; // Gold
        } else if (progressRatio >= 1.0) {
            return 'ahead'; // Green
        } else if (progressRatio >= 0.9) {
            return 'close'; // Yellow
        } else {
            return 'behind'; // Red
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
} else if (typeof window !== 'undefined') {
    window.DataManager = DataManager;
}
