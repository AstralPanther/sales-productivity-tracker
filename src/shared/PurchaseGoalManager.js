class PurchaseGoalManager {
    constructor(isElectron = false) {
        this.isElectron = isElectron;
        this.goals = [];
        this.calculator = new RevenueCalculator();
        this.storageKey = 'purchaseGoals';
        this.load();
    }
    
    load() {
        try {
            let stored;
            if (this.isElectron) {
                stored = localStorage.getItem(this.storageKey);
            } else {
                stored = localStorage.getItem(this.storageKey);
            }
            
            if (stored) {
                this.goals = JSON.parse(stored);
                this.goals.forEach(goal => {
                    if (!goal.id) goal.id = this.generateId();
                    if (!goal.requiredRevenue) {
                        goal.requiredRevenue = Math.round(this.calculator.calculateRevenueForPurchase(goal.cost));
                    }
                });
            }
        } catch (error) {
            console.error('Error loading purchase goals:', error);
            this.goals = [];
        }
    }
    
    save() {
        try {
            const data = JSON.stringify(this.goals);
            if (this.isElectron) {
                localStorage.setItem(this.storageKey, data);
            } else {
                localStorage.setItem(this.storageKey, data);
            }
        } catch (error) {
            console.error('Error saving purchase goals:', error);
        }
    }
    
    generateId() {
        return 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    addGoal(name, cost) {
        const goal = {
            id: this.generateId(),
            name: name.trim(),
            cost: parseFloat(cost),
            requiredRevenue: Math.round(this.calculator.calculateRevenueForPurchase(cost)),
            purchased: false,
            order: this.goals.length,
            createdAt: new Date().toISOString()
        };
        
        this.goals.push(goal);
        this.save();
        return goal;
    }
    
    removeGoal(goalId) {
        this.goals = this.goals.filter(goal => goal.id !== goalId);
        this.reorderGoals();
        this.save();
    }
    
    updateGoal(goalId, updates) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            if (updates.name !== undefined) goal.name = updates.name.trim();
            if (updates.cost !== undefined) {
                goal.cost = parseFloat(updates.cost);
                goal.requiredRevenue = Math.round(this.calculator.calculateRevenueForPurchase(goal.cost));
            }
            if (updates.purchased !== undefined) goal.purchased = updates.purchased;
            this.save();
        }
        return goal;
    }
    
    reorderGoals() {
        this.goals.forEach((goal, index) => {
            goal.order = index;
        });
        this.save();
    }
    
    moveGoal(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        
        const [movedGoal] = this.goals.splice(fromIndex, 1);
        this.goals.splice(toIndex, 0, movedGoal);
        this.reorderGoals();
    }
    
    getGoalsSorted() {
        return [...this.goals].sort((a, b) => {
            // Purchased goals always come first, then by order
            if (a.purchased && !b.purchased) return -1;
            if (!a.purchased && b.purchased) return 1;
            return a.order - b.order;
        });
    }
    
    calculateProgress(currentRevenue) {
        const sortedGoals = this.getGoalsSorted();
        let cumulativeRevenue = 0;
        
        return sortedGoals.map((goal, index) => {
            const startRevenue = cumulativeRevenue;
            cumulativeRevenue += goal.requiredRevenue;
            
            return {
                ...goal,
                startRevenue,
                endRevenue: cumulativeRevenue,
                progress: Math.max(0, Math.min(1, (currentRevenue - startRevenue) / goal.requiredRevenue)),
                achieved: currentRevenue >= cumulativeRevenue
            };
        });
    }
}