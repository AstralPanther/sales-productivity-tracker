const DataManager = require('../src/shared/DataManager.js');

describe('DataManager', () => {
    let dataManager;

    beforeEach(() => {
        dataManager = new DataManager(false); // Web version
    });

    describe('constructor', () => {
        test('initializes with correct default values', () => {
            expect(dataManager.isElectron).toBe(false);
            expect(dataManager.dataKey).toBe('activityTracker');
            expect(dataManager.electronAPI).toBeNull();
        });

        test('initializes for Electron when flag is true', () => {
            const electronDataManager = new DataManager(true);
            expect(electronDataManager.isElectron).toBe(true);
        });
    });

    describe('getDefaultData', () => {
        test('returns valid default data structure', () => {
            const defaultData = dataManager.getDefaultData();
            
            expect(defaultData).toHaveProperty('date');
            expect(defaultData).toHaveProperty('shiftStart', '09:00');
            expect(defaultData).toHaveProperty('shiftEnd', '17:00');
            expect(defaultData).toHaveProperty('target', 50);
            expect(defaultData).toHaveProperty('callsTarget', 20);
            expect(defaultData).toHaveProperty('backlogTarget', 0);
            expect(defaultData).toHaveProperty('currentPoints', 0);
            expect(defaultData).toHaveProperty('currentCalls', 0);
            expect(defaultData).toHaveProperty('currentBacklog', 0);
            expect(defaultData).toHaveProperty('version', '1.0');
        });
    });

    describe('validateData', () => {
        test('validates correct data successfully', () => {
            const validData = dataManager.getDefaultData();
            expect(() => dataManager.validateData(validData)).not.toThrow();
        });

        test('throws error for invalid data structure', () => {
            expect(() => dataManager.validateData(null)).toThrow('Invalid data structure');
            expect(() => dataManager.validateData('string')).toThrow('Invalid data structure');
            expect(() => dataManager.validateData(123)).toThrow('Invalid data structure');
        });

        test('throws error for invalid numeric fields', () => {
            const invalidData = dataManager.getDefaultData();
            invalidData.target = -1;
            expect(() => dataManager.validateData(invalidData)).toThrow('target must be between');
            
            invalidData.target = 50;
            invalidData.currentPoints = 'invalid';
            expect(() => dataManager.validateData(invalidData)).toThrow('currentPoints must be a valid number');
        });

        test('throws error for invalid time format', () => {
            const invalidData = dataManager.getDefaultData();
            invalidData.shiftStart = '25:00';
            expect(() => dataManager.validateData(invalidData)).toThrow('Invalid shift start time format');
        });
    });

    describe('sanitizeInput', () => {
        test('sanitizes numeric inputs correctly', () => {
            expect(dataManager.sanitizeInput('50', 'number')).toBe(50);
            expect(dataManager.sanitizeInput('abc', 'number')).toBe(0);
            expect(dataManager.sanitizeInput('150', 'number', { min: 0, max: 100 })).toBe(100);
            expect(dataManager.sanitizeInput('-10', 'number', { min: 0, max: 100 })).toBe(0);
        });

        test('sanitizes time inputs correctly', () => {
            expect(dataManager.sanitizeInput('09:30', 'time')).toBe('09:30');
            expect(dataManager.sanitizeInput('invalid', 'time')).toBe('09:00');
            expect(dataManager.sanitizeInput('25:00', 'time', { default: '08:00' })).toBe('08:00');
        });

        test('sanitizes string inputs correctly', () => {
            expect(dataManager.sanitizeInput('  test  ', 'string')).toBe('test');
            expect(dataManager.sanitizeInput(123, 'string')).toBe('123');
        });
    });

    describe('parseTime', () => {
        test('parses time strings correctly', () => {
            expect(dataManager.parseTime('09:30')).toEqual({ hour: 9, minute: 30 });
            expect(dataManager.parseTime('17:00')).toEqual({ hour: 17, minute: 0 });
        });
    });

    describe('calculateExpectedProgress', () => {
        test('calculates progress correctly during shift', () => {
            // Mock current time to be 12:00 (3 hours into 8-hour shift)
            const expectedProgress = dataManager.calculateExpectedProgress('09:00', '17:00', 80, 12);
            expect(expectedProgress).toBe(30); // 3/8 * 80 = 30
        });

        test('returns 0 before shift starts', () => {
            const expectedProgress = dataManager.calculateExpectedProgress('09:00', '17:00', 80, 8);
            expect(expectedProgress).toBe(0);
        });

        test('returns target after shift ends', () => {
            const expectedProgress = dataManager.calculateExpectedProgress('09:00', '17:00', 80, 18);
            expect(expectedProgress).toBe(80);
        });
    });

    describe('getColorClass', () => {
        test('returns correct color classes', () => {
            expect(dataManager.getColorClass(1.1, 0.8)).toBe('ahead'); // Ahead of schedule but not complete
            expect(dataManager.getColorClass(0.95, 0.8)).toBe('close'); // Close to expected
            expect(dataManager.getColorClass(0.7, 0.6)).toBe('behind'); // Behind schedule
            expect(dataManager.getColorClass(0.9, 1.1)).toBe('complete'); // Completed target
        });
    });

    describe('checkAndResetForNewDay', () => {
        test('resets data for new day', () => {
            const oldData = {
                date: 'Thu Jan 01 2025',
                shiftStart: '10:00',
                shiftEnd: '18:00',
                target: 60,
                currentPoints: 30
            };

            const today = new Date().toDateString();
            const resetData = dataManager.checkAndResetForNewDay(oldData);
            
            expect(resetData.date).toBe(today);
            expect(resetData.currentPoints).toBe(0);
            expect(resetData.shiftStart).toBe('10:00'); // Preserved
            expect(resetData.target).toBe(60); // Preserved
        });

        test('preserves data for same day', () => {
            const today = new Date().toDateString();
            const currentData = {
                date: today,
                shiftStart: '10:00',
                currentPoints: 30
            };

            const result = dataManager.checkAndResetForNewDay(currentData);
            expect(result).toBe(currentData); // Same object reference
        });
    });
});