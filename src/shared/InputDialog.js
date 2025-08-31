class InputDialog {
    constructor(options = {}) {
        this.options = {
            title: 'Update Values',
            fields: [
                { name: 'activity', label: 'Activity', type: 'number', min: 0, max: 200, value: 0 },
                { name: 'calls', label: 'Calls', type: 'number', min: 0, max: 100, value: 0 },
                { name: 'backlog', label: 'Backlog', type: 'number', min: 0, max: 1000, value: 0 }
            ],
            onSave: null,
            onCancel: null,
            ...options
        };
        this.overlay = null;
        this.inputs = {};
        this.eventListeners = [];
    }

    show() {
        if (this.overlay) {
            this.hide();
        }

        this.createOverlay();
        this.attachEventListeners();
        this.focusFirstInput();
    }

    hide() {
        if (this.overlay && this.overlay.parentNode) {
            this.cleanupEventListeners();
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
            this.inputs = {};
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'input-dialog-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 3000;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        `;

        const dialog = document.createElement('div');
        dialog.className = 'input-dialog';
        dialog.style.cssText = `
            background: white;
            padding: 8px;
            width: 100%;
            height: 100%;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        dialog.innerHTML = this.createDialogHTML();
        this.overlay.appendChild(dialog);
        document.body.appendChild(this.overlay);

        // Store input references
        this.options.fields.forEach(field => {
            this.inputs[field.name] = document.getElementById(`${field.name}Input`);
        });
    }

    createDialogHTML() {
        const fieldsHTML = this.options.fields.map(field => `
            <span style="font-size:10px;font-weight:bold;color:#333;white-space:nowrap;">${field.label}:</span>
            <input type="${field.type}" 
                   id="${field.name}Input" 
                   value="${field.value}" 
                   min="${field.min}" 
                   max="${field.max}"
                   style="width:40px;padding:2px;text-align:center;border:1px solid #007acc;border-radius:2px;font-size:10px;">
        `).join('');

        return `
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                ${fieldsHTML}
                <button id="saveButton" 
                        style="background:#007acc;color:white;border:none;padding:2px 6px;border-radius:2px;cursor:pointer;font-size:9px;">
                    Save
                </button>
                <button id="cancelButton" 
                        style="background:#ccc;color:#333;border:none;padding:2px 6px;border-radius:2px;cursor:pointer;font-size:9px;">
                    Cancel
                </button>
            </div>
        `;
    }

    attachEventListeners() {
        // Save button
        const saveButton = document.getElementById('saveButton');
        const saveHandler = e => {
            e.stopPropagation();
            this.handleSave();
        };
        saveButton.addEventListener('click', saveHandler);
        this.eventListeners.push({ element: saveButton, event: 'click', handler: saveHandler });

        // Cancel button
        const cancelButton = document.getElementById('cancelButton');
        const cancelHandler = e => {
            e.stopPropagation();
            this.handleCancel();
        };
        cancelButton.addEventListener('click', cancelHandler);
        this.eventListeners.push({ element: cancelButton, event: 'click', handler: cancelHandler });

        // Keyboard navigation
        const inputs = Object.values(this.inputs);
        inputs.forEach((input, index) => {
            const keyHandler = e => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const nextIndex = e.shiftKey
                        ? (index - 1 + inputs.length) % inputs.length
                        : (index + 1) % inputs.length;
                    inputs[nextIndex].focus();
                    inputs[nextIndex].select();
                } else if (e.key === 'Enter') {
                    this.handleSave();
                } else if (e.key === 'Escape') {
                    this.handleCancel();
                }
            };
            input.addEventListener('keydown', keyHandler);
            this.eventListeners.push({ element: input, event: 'keydown', handler: keyHandler });
        });

        // Click outside to close
        const overlayHandler = e => {
            if (e.target === this.overlay) {
                this.handleCancel();
            }
        };
        this.overlay.addEventListener('click', overlayHandler);
        this.eventListeners.push({ element: this.overlay, event: 'click', handler: overlayHandler });
    }

    cleanupEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
    }

    focusFirstInput() {
        const firstInput = Object.values(this.inputs)[0];
        if (firstInput) {
            firstInput.focus();
            firstInput.select();
        }
    }

    getValues() {
        const values = {};
        this.options.fields.forEach(field => {
            const input = this.inputs[field.name];
            if (input) {
                let value = input.value;
                if (field.type === 'number') {
                    value = parseInt(value) || 0;
                    // Validate range
                    value = Math.min(Math.max(value, field.min), field.max);
                }
                values[field.name] = value;
            }
        });

        return values;
    }

    setValues(values) {
        Object.entries(values).forEach(([key, value]) => {
            if (this.inputs[key]) {
                this.inputs[key].value = value;
            }
        });
    }

    validateValues() {
        const values = {};
        const errors = [];

        this.options.fields.forEach(field => {
            const input = this.inputs[field.name];
            if (input) {
                let value = input.value;
                if (field.type === 'number') {
                    const numValue = parseInt(value);
                    if (isNaN(numValue)) {
                        errors.push(`${field.label} must be a valid number`);
                        value = 0; // Use fallback for return value
                    } else {
                        value = Math.min(Math.max(numValue, field.min), field.max);
                    }
                }
                values[field.name] = value;
            }
        });

        return { values, errors };
    }

    handleSave() {
        try {
            const { values, errors } = this.validateValues();

            if (errors.length > 0) {
                this.showError(errors.join('\n'));

                return;
            }

            if (this.options.onSave) {
                this.options.onSave(values);
            }
            this.hide();
        } catch (error) {
            console.error('Error in InputDialog.handleSave:', error);
            this.showError('An error occurred while saving');
        }
    }

    handleCancel() {
        try {
            if (this.options.onCancel) {
                this.options.onCancel();
            }
            this.hide();
        } catch (error) {
            console.error('Error in InputDialog.handleCancel:', error);
            this.hide(); // Force hide even if callback fails
        }
    }

    showError(message) {
        // Simple error display - could be enhanced with better UI
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #ff4444;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            z-index: 4000;
            font-size: 11px;
            max-width: 200px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    // Static method for quick usage
    static show(options) {
        const dialog = new InputDialog(options);
        dialog.show();

        return dialog;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputDialog;
} else if (typeof window !== 'undefined') {
    window.InputDialog = InputDialog;
}
