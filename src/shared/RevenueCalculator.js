class RevenueCalculator {
    constructor(commissionRate = 0.0025, taxRate = 0.325) {
        this.commissionRate = commissionRate;  // 0.25%
        this.taxRate = taxRate;                 // 32.5%
        this.netRate = commissionRate * (1 - taxRate);  // Final rate after tax
    }
    
    // Calculate net income from gross revenue
    calculateNetIncome(revenue) {
        return revenue * this.netRate;
    }
    
    // Calculate required revenue for desired net income
    calculateRequiredRevenue(netIncome) {
        return netIncome / this.netRate;
    }
    
    // Calculate required revenue for purchase cost
    calculateRevenueForPurchase(purchaseCost) {
        return this.calculateRequiredRevenue(purchaseCost);
    }
}