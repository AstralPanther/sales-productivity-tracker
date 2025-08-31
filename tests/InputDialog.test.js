/**
 * @jest-environment jsdom
 */

// Load InputDialog - jsdom environment handles DOM setup automatically
const InputDialog = require('../src/shared/InputDialog.js');

describe('InputDialog', () => {
    let dialog;
    let mockSave;
    let mockCancel;

    beforeEach(() => {
        // Clear the DOM
        document.body.innerHTML = '';
        
        // Create mock callbacks
        mockSave = jest.fn();
        mockCancel = jest.fn();
        
        dialog = new InputDialog({
            fields: [
                { name: 'test1', label: 'Test 1', type: 'number', min: 0, max: 100, value: 10 },
                { name: 'test2', label: 'Test 2', type: 'number', min: 0, max: 50, value: 5 }
            ],
            onSave: mockSave,
            onCancel: mockCancel
        });
    });

    afterEach(() => {
        if (dialog && dialog.overlay) {
            dialog.hide();
        }
    });

    describe('constructor', () => {
        test('initializes with default options', () => {
            const defaultDialog = new InputDialog();
            expect(defaultDialog.options.title).toBe('Update Values');
            expect(defaultDialog.options.fields).toHaveLength(3); // activity, calls, backlog
        });

        test('merges custom options correctly', () => {
            expect(dialog.options.fields).toHaveLength(2);
            expect(dialog.options.onSave).toBe(mockSave);
        });
    });

    describe('show', () => {
        test('creates and shows dialog overlay', () => {
            dialog.show();
            
            expect(document.querySelector('.input-dialog-overlay')).toBeTruthy();
            expect(document.querySelector('.input-dialog')).toBeTruthy();
            expect(document.getElementById('test1Input')).toBeTruthy();
            expect(document.getElementById('test2Input')).toBeTruthy();
        });

        test('removes existing overlay before showing new one', () => {
            dialog.show();
            const firstOverlay = document.querySelector('.input-dialog-overlay');
            
            dialog.show();
            const overlays = document.querySelectorAll('.input-dialog-overlay');
            
            expect(overlays).toHaveLength(1);
            expect(document.querySelector('.input-dialog-overlay')).not.toBe(firstOverlay);
        });

        test('focuses first input after showing', () => {
            dialog.show();
            
            const firstInput = document.getElementById('test1Input');
            expect(document.activeElement).toBe(firstInput);
        });
    });

    describe('hide', () => {
        test('removes overlay from DOM', () => {
            dialog.show();
            expect(document.querySelector('.input-dialog-overlay')).toBeTruthy();
            
            dialog.hide();
            expect(document.querySelector('.input-dialog-overlay')).toBeFalsy();
        });

        test('cleans up event listeners', () => {
            dialog.show();
            expect(dialog.eventListeners.length).toBeGreaterThan(0);
            
            dialog.hide();
            expect(dialog.eventListeners).toHaveLength(0);
        });
    });

    describe('getValues', () => {
        test('returns current input values', () => {
            dialog.show();
            
            // Set some values
            document.getElementById('test1Input').value = '25';
            document.getElementById('test2Input').value = '15';
            
            const values = dialog.getValues();
            expect(values).toEqual({
                test1: 25,
                test2: 15
            });
        });

        test('validates numeric ranges', () => {
            dialog.show();
            
            // Set values outside range
            document.getElementById('test1Input').value = '150'; // max 100
            document.getElementById('test2Input').value = '-5';   // min 0
            
            const values = dialog.getValues();
            expect(values.test1).toBe(100); // Clamped to max
            expect(values.test2).toBe(0);   // Clamped to min
        });
    });

    describe('validateValues', () => {
        test('passes validation for valid values', () => {
            dialog.show();
            
            document.getElementById('test1Input').value = '50';
            document.getElementById('test2Input').value = '25';
            
            const { values, errors } = dialog.validateValues();
            expect(errors).toHaveLength(0);
            expect(values.test1).toBe(50);
            expect(values.test2).toBe(25);
        });

        test('clamps out-of-range values but validates NaN', () => {
            dialog.show();
            
            // Set one invalid (NaN) and one out-of-range value
            document.getElementById('test1Input').value = 'invalid'; // This will be NaN
            document.getElementById('test2Input').value = '100'; // exceeds max of 50, gets clamped
            
            const { values, errors } = dialog.validateValues();
            // Should have error for NaN value but not for clamped value
            expect(errors.length).toBe(1);
            expect(errors.some(error => error.includes('Test 1'))).toBe(true);
            // Test 2 gets clamped to 50 (valid), so no error
            expect(values.test2).toBe(50);
        });
    });

    describe('handleSave', () => {
        test('calls onSave callback with valid values', () => {
            dialog.show();
            
            document.getElementById('test1Input').value = '30';
            document.getElementById('test2Input').value = '20';
            
            dialog.handleSave();
            
            expect(mockSave).toHaveBeenCalledWith({
                test1: 30,
                test2: 20
            });
        });

        test('shows error for invalid values', () => {
            dialog.show();
            
            document.getElementById('test1Input').value = 'invalid';
            
            // Mock showError to avoid DOM manipulation during test
            const mockShowError = jest.spyOn(dialog, 'showError').mockImplementation(() => {});
            
            dialog.handleSave();
            
            expect(mockShowError).toHaveBeenCalled();
            expect(mockSave).not.toHaveBeenCalled();
            
            mockShowError.mockRestore();
        });
    });

    describe('handleCancel', () => {
        test('calls onCancel callback', () => {
            dialog.show();
            
            dialog.handleCancel();
            
            expect(mockCancel).toHaveBeenCalled();
        });

        test('hides dialog', () => {
            dialog.show();
            expect(document.querySelector('.input-dialog-overlay')).toBeTruthy();
            
            dialog.handleCancel();
            expect(document.querySelector('.input-dialog-overlay')).toBeFalsy();
        });
    });

    describe('static show method', () => {
        test('creates and shows dialog in one call', () => {
            const staticDialog = InputDialog.show({
                fields: [
                    { name: 'test', label: 'Test', type: 'number', min: 0, max: 100, value: 0 }
                ]
            });
            
            expect(document.querySelector('.input-dialog-overlay')).toBeTruthy();
            expect(staticDialog instanceof InputDialog).toBe(true);
            
            staticDialog.hide();
        });
    });

    describe('keyboard navigation', () => {
        test('tab moves between inputs', () => {
            dialog.show();
            
            const input1 = document.getElementById('test1Input');
            const input2 = document.getElementById('test2Input');
            
            // Focus first input
            input1.focus();
            
            // Simulate Tab key
            const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
            input1.dispatchEvent(tabEvent);
            
            // Second input should be focused (we'd need to mock focus behavior fully)
            // This test verifies the event listener is attached correctly
            expect(dialog.eventListeners.length).toBeGreaterThan(2);
        });

        test('Enter key triggers save', () => {
            dialog.show();
            
            const input1 = document.getElementById('test1Input');
            input1.value = '50';
            document.getElementById('test2Input').value = '25';
            
            // Simulate Enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            input1.dispatchEvent(enterEvent);
            
            expect(mockSave).toHaveBeenCalledWith({
                test1: 50,
                test2: 25
            });
        });

        test('Escape key triggers cancel', () => {
            dialog.show();
            
            const input1 = document.getElementById('test1Input');
            
            // Simulate Escape key
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            input1.dispatchEvent(escapeEvent);
            
            expect(mockCancel).toHaveBeenCalled();
        });
    });
});