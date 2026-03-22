// =============================================
// Budget Manager
// Token and Cost Budget Management System
// Version 1.0 - Phase 2 Task 2.4
// =============================================

/**
 * BudgetManager
 * 
 * Manages API token and cost budgets with:
 * - Daily and weekly limits
 * - Real-time tracking
 * - Alert system
 * - Budget enforcement
 * - Historical reporting
 */
class BudgetManager {
    constructor(config = {}) {
        // Budget configuration
        this.config = {
            // Daily limits
            dailyTokenLimit: config.dailyTokenLimit || 1000000,  // 1M tokens/day
            dailyCostLimit: config.dailyCostLimit || 10.00,      // $10/day
            
            // Weekly limits
            weeklyTokenLimit: config.weeklyTokenLimit || 5000000, // 5M tokens/week
            weeklyCostLimit: config.weeklyCostLimit || 50.00,     // $50/week
            
            // Alert thresholds (percentage of limit)
            warningThreshold: config.warningThreshold || 0.75,    // 75%
            criticalThreshold: config.criticalThreshold || 0.90,  // 90%
            
            // Enforcement
            enforceHardLimits: config.enforceHardLimits !== false, // Default: true
            
            // Storage
            storageKey: config.storageKey || 'budget_manager_data'
        };
        
        // Current usage tracking
        this.usage = {
            daily: {
                tokens: 0,
                cost: 0,
                requests: 0,
                date: this.getTodayKey()
            },
            weekly: {
                tokens: 0,
                cost: 0,
                requests: 0,
                weekStart: this.getWeekStartKey()
            }
        };
        
        // Alert callbacks
        this.alertCallbacks = {
            warning: [],
            critical: [],
            limitReached: []
        };
        
        // Historical data
        this.history = {
            daily: {},
            weekly: {}
        };
        
        // Initialize from storage
        this.loadFromStorage();
    }
    
    /**
     * Get today's date key (YYYY-MM-DD)
     */
    getTodayKey() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }
    
    /**
     * Get week start key (YYYY-WW)
     */
    getWeekStartKey() {
        const now = new Date();
        const year = now.getFullYear();
        const week = this.getWeekNumber(now);
        return `${year}-W${String(week).padStart(2, '0')}`;
    }
    
    /**
     * Get ISO week number
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    
    /**
     * Check if budget allows the request
     * @param {number} estimatedTokens - Estimated tokens for request
     * @param {number} estimatedCost - Estimated cost for request
     * @returns {Object} { allowed: boolean, reason: string }
     */
    checkBudget(estimatedTokens, estimatedCost) {
        // Check if new day/week
        this.checkAndResetPeriods();
        
        // Check daily limits
        const dailyTokensAfter = this.usage.daily.tokens + estimatedTokens;
        const dailyCostAfter = this.usage.daily.cost + estimatedCost;
        
        if (this.config.enforceHardLimits) {
            if (dailyTokensAfter > this.config.dailyTokenLimit) {
                return {
                    allowed: false,
                    reason: `Daily token limit exceeded (${dailyTokensAfter.toLocaleString()} > ${this.config.dailyTokenLimit.toLocaleString()})`
                };
            }
            
            if (dailyCostAfter > this.config.dailyCostLimit) {
                return {
                    allowed: false,
                    reason: `Daily cost limit exceeded ($${dailyCostAfter.toFixed(2)} > $${this.config.dailyCostLimit.toFixed(2)})`
                };
            }
        }
        
        // Check weekly limits
        const weeklyTokensAfter = this.usage.weekly.tokens + estimatedTokens;
        const weeklyCostAfter = this.usage.weekly.cost + estimatedCost;
        
        if (this.config.enforceHardLimits) {
            if (weeklyTokensAfter > this.config.weeklyTokenLimit) {
                return {
                    allowed: false,
                    reason: `Weekly token limit exceeded (${weeklyTokensAfter.toLocaleString()} > ${this.config.weeklyTokenLimit.toLocaleString()})`
                };
            }
            
            if (weeklyCostAfter > this.config.weeklyCostLimit) {
                return {
                    allowed: false,
                    reason: `Weekly cost limit exceeded ($${weeklyCostAfter.toFixed(2)} > $${this.config.weeklyCostLimit.toFixed(2)})`
                };
            }
        }
        
        // Check for warnings
        this.checkThresholds(dailyTokensAfter, dailyCostAfter, weeklyTokensAfter, weeklyCostAfter);
        
        return { allowed: true, reason: 'Within budget' };
    }
    
    /**
     * Record actual usage
     * @param {number} tokens - Actual tokens used
     * @param {number} cost - Actual cost incurred
     */
    recordUsage(tokens, cost) {
        // Check if new day/week
        this.checkAndResetPeriods();
        
        // Update daily usage
        this.usage.daily.tokens += tokens;
        this.usage.daily.cost += cost;
        this.usage.daily.requests++;
        
        // Update weekly usage
        this.usage.weekly.tokens += tokens;
        this.usage.weekly.cost += cost;
        this.usage.weekly.requests++;
        
        // Save to storage
        this.saveToStorage();
        
        // Check thresholds
        this.checkThresholds(
            this.usage.daily.tokens,
            this.usage.daily.cost,
            this.usage.weekly.tokens,
            this.usage.weekly.cost
        );
    }
    
    /**
     * Check and reset periods if needed
     */
    checkAndResetPeriods() {
        const today = this.getTodayKey();
        const thisWeek = this.getWeekStartKey();
        
        // Check if new day
        if (this.usage.daily.date !== today) {
            // Save yesterday's data to history
            this.history.daily[this.usage.daily.date] = {
                tokens: this.usage.daily.tokens,
                cost: this.usage.daily.cost,
                requests: this.usage.daily.requests
            };
            
            // Reset daily usage
            this.usage.daily = {
                tokens: 0,
                cost: 0,
                requests: 0,
                date: today
            };
        }
        
        // Check if new week
        if (this.usage.weekly.weekStart !== thisWeek) {
            // Save last week's data to history
            this.history.weekly[this.usage.weekly.weekStart] = {
                tokens: this.usage.weekly.tokens,
                cost: this.usage.weekly.cost,
                requests: this.usage.weekly.requests
            };
            
            // Reset weekly usage
            this.usage.weekly = {
                tokens: 0,
                cost: 0,
                requests: 0,
                weekStart: thisWeek
            };
        }
        
        this.saveToStorage();
    }
    
    /**
     * Check thresholds and trigger alerts
     */
    checkThresholds(dailyTokens, dailyCost, weeklyTokens, weeklyCost) {
        // Daily token threshold
        const dailyTokenPercent = dailyTokens / this.config.dailyTokenLimit;
        if (dailyTokenPercent >= this.config.criticalThreshold) {
            this.triggerAlert('critical', {
                type: 'daily_tokens',
                current: dailyTokens,
                limit: this.config.dailyTokenLimit,
                percentage: (dailyTokenPercent * 100).toFixed(1)
            });
        } else if (dailyTokenPercent >= this.config.warningThreshold) {
            this.triggerAlert('warning', {
                type: 'daily_tokens',
                current: dailyTokens,
                limit: this.config.dailyTokenLimit,
                percentage: (dailyTokenPercent * 100).toFixed(1)
            });
        }
        
        // Daily cost threshold
        const dailyCostPercent = dailyCost / this.config.dailyCostLimit;
        if (dailyCostPercent >= this.config.criticalThreshold) {
            this.triggerAlert('critical', {
                type: 'daily_cost',
                current: dailyCost,
                limit: this.config.dailyCostLimit,
                percentage: (dailyCostPercent * 100).toFixed(1)
            });
        } else if (dailyCostPercent >= this.config.warningThreshold) {
            this.triggerAlert('warning', {
                type: 'daily_cost',
                current: dailyCost,
                limit: this.config.dailyCostLimit,
                percentage: (dailyCostPercent * 100).toFixed(1)
            });
        }
        
        // Weekly token threshold
        const weeklyTokenPercent = weeklyTokens / this.config.weeklyTokenLimit;
        if (weeklyTokenPercent >= this.config.criticalThreshold) {
            this.triggerAlert('critical', {
                type: 'weekly_tokens',
                current: weeklyTokens,
                limit: this.config.weeklyTokenLimit,
                percentage: (weeklyTokenPercent * 100).toFixed(1)
            });
        } else if (weeklyTokenPercent >= this.config.warningThreshold) {
            this.triggerAlert('warning', {
                type: 'weekly_tokens',
                current: weeklyTokens,
                limit: this.config.weeklyTokenLimit,
                percentage: (weeklyTokenPercent * 100).toFixed(1)
            });
        }
        
        // Weekly cost threshold
        const weeklyCostPercent = weeklyCost / this.config.weeklyCostLimit;
        if (weeklyCostPercent >= this.config.criticalThreshold) {
            this.triggerAlert('critical', {
                type: 'weekly_cost',
                current: weeklyCost,
                limit: this.config.weeklyCostLimit,
                percentage: (weeklyCostPercent * 100).toFixed(1)
            });
        } else if (weeklyCostPercent >= this.config.warningThreshold) {
            this.triggerAlert('warning', {
                type: 'weekly_cost',
                current: weeklyCost,
                limit: this.config.weeklyCostLimit,
                percentage: (weeklyCostPercent * 100).toFixed(1)
            });
        }
    }
    
    /**
     * Trigger alert
     */
    triggerAlert(level, data) {
        const callbacks = this.alertCallbacks[level] || [];
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${level} alert callback:`, error);
            }
        });
    }
    
    /**
     * Register alert callback
     * @param {string} level - 'warning', 'critical', or 'limitReached'
     * @param {Function} callback - Callback function
     */
    onAlert(level, callback) {
        if (!this.alertCallbacks[level]) {
            this.alertCallbacks[level] = [];
        }
        this.alertCallbacks[level].push(callback);
    }
    
    /**
     * Get current budget status
     */
    getStatus() {
        this.checkAndResetPeriods();
        
        return {
            daily: {
                tokens: {
                    used: this.usage.daily.tokens,
                    limit: this.config.dailyTokenLimit,
                    remaining: Math.max(0, this.config.dailyTokenLimit - this.usage.daily.tokens),
                    percentage: (this.usage.daily.tokens / this.config.dailyTokenLimit * 100).toFixed(1)
                },
                cost: {
                    used: this.usage.daily.cost,
                    limit: this.config.dailyCostLimit,
                    remaining: Math.max(0, this.config.dailyCostLimit - this.usage.daily.cost),
                    percentage: (this.usage.daily.cost / this.config.dailyCostLimit * 100).toFixed(1)
                },
                requests: this.usage.daily.requests,
                date: this.usage.daily.date
            },
            weekly: {
                tokens: {
                    used: this.usage.weekly.tokens,
                    limit: this.config.weeklyTokenLimit,
                    remaining: Math.max(0, this.config.weeklyTokenLimit - this.usage.weekly.tokens),
                    percentage: (this.usage.weekly.tokens / this.config.weeklyTokenLimit * 100).toFixed(1)
                },
                cost: {
                    used: this.usage.weekly.cost,
                    limit: this.config.weeklyCostLimit,
                    remaining: Math.max(0, this.config.weeklyCostLimit - this.usage.weekly.cost),
                    percentage: (this.usage.weekly.cost / this.config.weeklyCostLimit * 100).toFixed(1)
                },
                requests: this.usage.weekly.requests,
                weekStart: this.usage.weekly.weekStart
            },
            config: {
                enforceHardLimits: this.config.enforceHardLimits,
                warningThreshold: (this.config.warningThreshold * 100).toFixed(0) + '%',
                criticalThreshold: (this.config.criticalThreshold * 100).toFixed(0) + '%'
            }
        };
    }
    
    /**
     * Get historical data
     * @param {string} period - 'daily' or 'weekly'
     * @param {number} count - Number of periods to return
     */
    getHistory(period = 'daily', count = 7) {
        const history = this.history[period] || {};
        const keys = Object.keys(history).sort().reverse().slice(0, count);
        
        return keys.map(key => ({
            period: key,
            ...history[key]
        }));
    }
    
    /**
     * Update budget configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveToStorage();
    }
    
    /**
     * Reset budget (for testing or manual reset)
     */
    reset() {
        this.usage = {
            daily: {
                tokens: 0,
                cost: 0,
                requests: 0,
                date: this.getTodayKey()
            },
            weekly: {
                tokens: 0,
                cost: 0,
                requests: 0,
                weekStart: this.getWeekStartKey()
            }
        };
        this.saveToStorage();
    }
    
    /**
     * Save to localStorage
     */
    saveToStorage() {
        try {
            const data = {
                usage: this.usage,
                history: this.history,
                config: this.config
            };
            localStorage.setItem(this.config.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save budget data:', error);
        }
    }
    
    /**
     * Load from localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.config.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                this.usage = parsed.usage || this.usage;
                this.history = parsed.history || this.history;
                // Don't overwrite config, just merge saved config
                if (parsed.config) {
                    this.config = { ...this.config, ...parsed.config };
                }
                
                // Check if periods need reset
                this.checkAndResetPeriods();
            }
        } catch (error) {
            console.error('Failed to load budget data:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BudgetManager;
}

// Made with Bob
