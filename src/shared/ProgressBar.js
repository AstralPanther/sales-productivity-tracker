class ProgressBar {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            id: 'progressBar',
            label: 'Progress',
            current: 0,
            target: 100,
            type: 'normal', // 'normal' or 'countdown'
            showExpectedLine: true,
            onClick: null,
            ...options
        };

        this.elements = {};
        this.isCountdown = this.options.type === 'countdown';
        this.init();
    }

    init() {
        this.createElements();
        this.attachEventListeners();
        this.update();
    }

    createElements() {
        // Main progress bar container
        this.elements.bar = document.createElement('div');
        this.elements.bar.id = this.options.id;
        this.elements.bar.className = 'progress-bar';

        // Progress fill
        this.elements.fill = document.createElement('div');
        this.elements.fill.id = `${this.options.id}Fill`;
        this.elements.fill.className = 'activity-fill';

        // Expected time line (if enabled)
        if (this.options.showExpectedLine) {
            this.elements.expectedLine = document.createElement('div');
            this.elements.expectedLine.id = `${this.options.id}ExpectedLine`;
            this.elements.expectedLine.className = 'expected-line';
        }

        // Label
        this.elements.label = document.createElement('div');
        this.elements.label.className = 'bar-label';
        this.elements.label.textContent = this.options.label;

        // Progress display
        this.elements.display = document.createElement('div');
        this.elements.display.id = `${this.options.id}Display`;
        this.elements.display.className = 'points-display';

        // Assemble elements
        this.elements.bar.appendChild(this.elements.fill);
        if (this.elements.expectedLine) {
            this.elements.bar.appendChild(this.elements.expectedLine);
        }
        this.elements.bar.appendChild(this.elements.label);
        this.elements.bar.appendChild(this.elements.display);

        this.container.appendChild(this.elements.bar);
    }

    attachEventListeners() {
        if (this.options.onClick) {
            this.elements.bar.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this.options.onClick();
            });
        }
    }

    update(data = {}) {
        const current = data.current ?? this.options.current;
        const target = data.target ?? this.options.target;
        const expectedProgress = data.expectedProgress ?? 0;
        const timePercent = data.timePercent ?? 0;

        // Update stored values
        this.options.current = current;
        this.options.target = target;

        // Calculate progress percentage
        let progressPercent;
        if (this.isCountdown) {
            // For countdown: progress = (target - current) / target
            progressPercent = target > 0 ? Math.max(0, (target - current) / target) * 100 : 0;
        } else {
            // For normal: progress = current / target
            progressPercent = target > 0 ? (current / target) * 100 : 0;
        }

        // Update fill width
        this.elements.fill.style.width = `${Math.min(progressPercent, 100)}%`;

        // Update color based on performance
        this.updateColor(current, target, expectedProgress);

        // Update display text
        this.updateDisplay(current, target);

        // Update expected line position
        if (this.elements.expectedLine) {
            this.elements.expectedLine.style.left = `${timePercent}%`;
        }
    }

    updateColor(current, target, expectedProgress) {
        // Calculate ratios for color determination
        let progressRatio, completionRatio;

        if (this.isCountdown) {
            // For countdown logic
            const remaining = current;
            const expectedRemaining = expectedProgress;
            completionRatio = target > 0 ? (target - remaining) / target : 0;

            if (target - expectedRemaining > 0) {
                progressRatio = (target - remaining) / (target - expectedRemaining);
            } else {
                progressRatio = remaining === 0 ? 1 : 0;
            }
        } else {
            // For normal logic
            progressRatio = expectedProgress > 0 ? current / expectedProgress : (current > 0 ? 1 : 0);
            completionRatio = target > 0 ? current / target : 0;
        }

        // Apply color classes
        this.elements.fill.className = 'activity-fill';

        if (this.isCountdown && current === 0 && target > 0) {
            // Special case: countdown completed
            this.elements.fill.classList.add('complete');
        } else if (completionRatio >= 1.0) {
            this.elements.fill.classList.add('complete'); // Gold
        } else if (progressRatio >= 1.0) {
            this.elements.fill.classList.add('ahead'); // Green
        } else if (progressRatio >= 0.9) {
            this.elements.fill.classList.add('close'); // Yellow
        } else {
            this.elements.fill.classList.add('behind'); // Red
        }
    }

    updateDisplay(current, target) {
        this.elements.display.textContent = `${current}/${target}`;
    }

    setTimePosition(percent) {
        if (this.elements.expectedLine) {
            this.elements.expectedLine.style.left = `${percent}%`;
        }
    }

    setValue(current) {
        this.options.current = current;
        this.update();
    }

    setTarget(target) {
        this.options.target = target;
        this.update();
    }

    setLabel(label) {
        this.options.label = label;
        this.elements.label.textContent = label;
    }

    show() {
        this.elements.bar.style.display = 'flex';
    }

    hide() {
        this.elements.bar.style.display = 'none';
    }

    destroy() {
        if (this.elements.bar && this.elements.bar.parentNode) {
            this.elements.bar.parentNode.removeChild(this.elements.bar);
        }
        this.elements = {};
    }

    // Get progress data for external use
    getProgress() {
        return {
            current: this.options.current,
            target: this.options.target,
            percent: this.isCountdown
                ? Math.max(0, (this.options.target - this.options.current) / this.options.target) * 100
                : (this.options.current / this.options.target) * 100,
            isCountdown: this.isCountdown
        };
    }

    // Static helper to create multiple progress bars
    static createMultiple(container, configs) {
        const bars = {};
        configs.forEach(config => {
            bars[config.id] = new ProgressBar(container, config);
        });

        return bars;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressBar;
} else if (typeof window !== 'undefined') {
    window.ProgressBar = ProgressBar;
}
