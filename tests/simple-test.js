// Simple test runner for DataManager without Jest dependency
// Run with: node tests/simple-test.js

const DataManager = require('../src/shared/DataManager.js');

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✓ ${message}`);
}

function runTests() {
    console.log('Running DataManager tests...\n');
    
    let passedTests = 0;
    let totalTests = 0;

    function test(name, testFn) {
        totalTests++;
        try {
            testFn();
            passedTests++;
            console.log(`✓ ${name}`);
        } catch (error) {
            console.error(`✗ ${name}: ${error.message}`);
        }
    }

    // Mock localStorage for Node.js environment
    global.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
    };

    const dataManager = new DataManager(false);

    // Test constructor
    test('DataManager constructor initializes correctly', () => {
        assert(dataManager.isElectron === false, 'isElectron should be false');
        assert(dataManager.dataKey === 'activityTracker', 'dataKey should be correct');
        assert(dataManager.electronAPI === null, 'electronAPI should be null for web version');
    });

    // Test getDefaultData
    test('getDefaultData returns valid structure', () => {
        const defaultData = dataManager.getDefaultData();
        assert(typeof defaultData === 'object', 'should return object');
        assert(defaultData.shiftStart === '09:00', 'default shift start should be 09:00');
        assert(defaultData.target === 50, 'default target should be 50');
        assert(defaultData.currentPoints === 0, 'default current points should be 0');
        assert(defaultData.version === '1.0', 'should have version field');
    });

    // Test sanitizeInput
    test('sanitizeInput works for numbers', () => {
        assert(dataManager.sanitizeInput('50', 'number') === 50, 'should parse valid number');
        assert(dataManager.sanitizeInput('abc', 'number') === 0, 'should default invalid number to 0');
        assert(dataManager.sanitizeInput('150', 'number', { min: 0, max: 100 }) === 100, 'should clamp to max');
        assert(dataManager.sanitizeInput('-10', 'number', { min: 0, max: 100 }) === 0, 'should clamp to min');
    });

    // Test sanitizeInput for time
    test('sanitizeInput works for time', () => {
        assert(dataManager.sanitizeInput('09:30', 'time') === '09:30', 'should accept valid time');
        assert(dataManager.sanitizeInput('invalid', 'time') === '09:00', 'should default invalid time');
        assert(dataManager.sanitizeInput('25:00', 'time', { default: '08:00' }) === '08:00', 'should use custom default');
    });

    // Test parseTime
    test('parseTime parses correctly', () => {
        const result = dataManager.parseTime('14:30');
        assert(result.hour === 14, 'should parse hour correctly');
        assert(result.minute === 30, 'should parse minute correctly');
    });

    // Test calculateExpectedProgress
    test('calculateExpectedProgress calculates correctly', () => {
        // Mock current time to 12:00 (3 hours into 8-hour shift from 9-17)
        const progress = dataManager.calculateExpectedProgress('09:00', '17:00', 80, 12);
        assert(progress === 30, 'should calculate 3/8 * 80 = 30');
        
        // Test before shift
        const beforeProgress = dataManager.calculateExpectedProgress('09:00', '17:00', 80, 8);
        assert(beforeProgress === 0, 'should return 0 before shift');
        
        // Test after shift
        const afterProgress = dataManager.calculateExpectedProgress('09:00', '17:00', 80, 18);
        assert(afterProgress === 80, 'should return target after shift');
    });

    // Test getColorClass
    test('getColorClass returns correct classes', () => {
        assert(dataManager.getColorClass(1.1, 0.8) === 'ahead', 'should be ahead when ahead of schedule');
        assert(dataManager.getColorClass(0.95, 0.8) === 'close', 'should be close when near expected');
        assert(dataManager.getColorClass(0.7, 0.6) === 'behind', 'should be behind when behind schedule');
        assert(dataManager.getColorClass(0.9, 1.1) === 'complete', 'should be complete when target exceeded');
    });

    // Test data validation
    test('validateData works correctly', () => {
        const validData = dataManager.getDefaultData();
        try {
            dataManager.validateData(validData);
            assert(true, 'should validate correct data');
        } catch (error) {
            assert(false, 'should not throw for valid data');
        }

        // Test invalid data
        try {
            dataManager.validateData({ target: -1, shiftStart: '09:00', shiftEnd: '17:00', date: 'test' });
            assert(false, 'should throw for invalid data');
        } catch (error) {
            assert(error.message.includes('target must be between'), 'should validate target range');
        }
    });

    // Test checkAndResetForNewDay
    test('checkAndResetForNewDay resets for new day', () => {
        const oldData = {
            date: 'Thu Jan 01 2025',
            shiftStart: '10:00',
            target: 60,
            currentPoints: 30
        };
        
        const resetData = dataManager.checkAndResetForNewDay(oldData);
        const today = new Date().toDateString();
        
        assert(resetData.date === today, 'should update to current date');
        assert(resetData.currentPoints === 0, 'should reset current points');
        assert(resetData.shiftStart === '10:00', 'should preserve shift start');
        assert(resetData.target === 60, 'should preserve target');
    });

    console.log(`\n${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('❌ Some tests failed');
        process.exit(1);
    }
}

if (require.main === module) {
    runTests();
}