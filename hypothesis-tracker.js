/**
 * ENHANCEMENT 3: Hypothesis Generator
 * 
 * Transforms signals into testable strategic hypotheses with status tracking.
 * Integrates with meeting briefs for validation and follow-up.
 * 
 * Architecture:
 * - Generates hypotheses from high-priority signals
 * - Tracks status: active, confirmed, refuted, expired
 * - 90-day lifecycle with automatic expiry
 * - localStorage persistence
 * - Meeting brief integration
 */

class HypothesisTracker {
    constructor() {
        this.hypotheses = [];
        this.storageKey = 'signal_hypotheses';
        this.load();
    }

    /**
     * Load hypotheses from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.hypotheses = JSON.parse(stored);
                this.cleanupExpired();
            }
        } catch (error) {
            console.error('Failed to load hypotheses:', error);
            this.hypotheses = [];
        }
    }

    /**
     * Save hypotheses to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.hypotheses));
        } catch (error) {
            console.error('Failed to save hypotheses:', error);
        }
    }

    /**
     * Add new hypothesis
     * @param {Object} hypothesis - Hypothesis object from AI
     * @returns {string} - Hypothesis ID
     */
    addHypothesis(hypothesis) {
        const id = `hyp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();
        
        const newHypothesis = {
            id,
            statement: hypothesis.statement,
            rationale: hypothesis.rationale,
            testCriteria: hypothesis.testCriteria || [],
            implications: hypothesis.implications || {},
            relatedSignals: hypothesis.relatedSignals || [],
            status: 'active',
            confidence: hypothesis.confidence || 'medium',
            createdAt: now,
            updatedAt: now,
            expiresAt: now + (90 * 24 * 60 * 60 * 1000), // 90 days
            statusHistory: [{
                status: 'active',
                timestamp: now,
                note: 'Hypothesis generated'
            }]
        };

        this.hypotheses.unshift(newHypothesis);
        this.save();
        return id;
    }

    /**
     * Update hypothesis status
     * @param {string} id - Hypothesis ID
     * @param {string} status - New status (active, confirmed, refuted, expired)
     * @param {string} note - Optional note explaining the status change
     */
    updateStatus(id, status, note = '') {
        const hypothesis = this.hypotheses.find(h => h.id === id);
        if (!hypothesis) {
            console.warn(`Hypothesis ${id} not found`);
            return;
        }

        const now = Date.now();
        hypothesis.status = status;
        hypothesis.updatedAt = now;
        
        hypothesis.statusHistory.push({
            status,
            timestamp: now,
            note
        });

        this.save();
    }

    /**
     * Add evidence to hypothesis
     * @param {string} id - Hypothesis ID
     * @param {Object} evidence - Evidence object with signal reference
     */
    addEvidence(id, evidence) {
        const hypothesis = this.hypotheses.find(h => h.id === id);
        if (!hypothesis) {
            console.warn(`Hypothesis ${id} not found`);
            return;
        }

        if (!hypothesis.evidence) {
            hypothesis.evidence = [];
        }

        hypothesis.evidence.push({
            ...evidence,
            timestamp: Date.now()
        });

        hypothesis.updatedAt = Date.now();
        this.save();
    }

    /**
     * Get hypotheses by status
     * @param {string} status - Status filter (active, confirmed, refuted, expired, all)
     * @returns {Array} - Filtered hypotheses
     */
    getByStatus(status = 'all') {
        if (status === 'all') {
            return this.hypotheses;
        }
        return this.hypotheses.filter(h => h.status === status);
    }

    /**
     * Get active hypotheses (not expired, not refuted)
     * @returns {Array} - Active hypotheses
     */
    getActive() {
        const now = Date.now();
        return this.hypotheses.filter(h => 
            h.status === 'active' && 
            h.expiresAt > now
        );
    }

    /**
     * Get hypotheses for meeting brief
     * @returns {Array} - Hypotheses needing validation
     */
    getForMeetingBrief() {
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        
        // Get active hypotheses created in last 30 days
        return this.hypotheses.filter(h => 
            h.status === 'active' && 
            h.createdAt > thirtyDaysAgo &&
            h.expiresAt > now
        ).sort((a, b) => {
            // Sort by confidence (high > medium > low)
            const confidenceOrder = { high: 3, medium: 2, low: 1 };
            return (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
        });
    }

    /**
     * Get hypothesis by ID
     * @param {string} id - Hypothesis ID
     * @returns {Object|null} - Hypothesis or null
     */
    getById(id) {
        return this.hypotheses.find(h => h.id === id) || null;
    }

    /**
     * Delete hypothesis
     * @param {string} id - Hypothesis ID
     */
    delete(id) {
        this.hypotheses = this.hypotheses.filter(h => h.id !== id);
        this.save();
    }

    /**
     * Cleanup expired hypotheses
     * Automatically marks expired hypotheses and removes old refuted ones
     */
    cleanupExpired() {
        const now = Date.now();
        const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
        let changed = false;

        // Mark expired active hypotheses
        this.hypotheses.forEach(h => {
            if (h.status === 'active' && h.expiresAt <= now) {
                h.status = 'expired';
                h.updatedAt = now;
                h.statusHistory.push({
                    status: 'expired',
                    timestamp: now,
                    note: 'Hypothesis expired after 90 days'
                });
                changed = true;
            }
        });

        // Remove old refuted hypotheses (60+ days old)
        const beforeCount = this.hypotheses.length;
        this.hypotheses = this.hypotheses.filter(h => 
            !(h.status === 'refuted' && h.updatedAt < sixtyDaysAgo)
        );
        
        if (this.hypotheses.length < beforeCount) {
            changed = true;
        }

        if (changed) {
            this.save();
        }
    }

    /**
     * Get statistics
     * @returns {Object} - Hypothesis statistics
     */
    getStats() {
        const now = Date.now();
        const active = this.hypotheses.filter(h => h.status === 'active' && h.expiresAt > now);
        const confirmed = this.hypotheses.filter(h => h.status === 'confirmed');
        const refuted = this.hypotheses.filter(h => h.status === 'refuted');
        const expired = this.hypotheses.filter(h => h.status === 'expired');

        return {
            total: this.hypotheses.length,
            active: active.length,
            confirmed: confirmed.length,
            refuted: refuted.length,
            expired: expired.length,
            confirmationRate: this.hypotheses.length > 0 
                ? Math.round((confirmed.length / this.hypotheses.length) * 100) 
                : 0
        };
    }

    /**
     * Export hypotheses for meeting brief
     * @returns {string} - Formatted text for meeting brief
     */
    exportForMeetingBrief() {
        const hypotheses = this.getForMeetingBrief();
        
        if (hypotheses.length === 0) {
            return 'No active hypotheses requiring validation.';
        }

        let output = '## Strategic Hypotheses for Validation\n\n';
        
        hypotheses.forEach((h, index) => {
            output += `### ${index + 1}. ${h.statement}\n\n`;
            output += `**Confidence:** ${h.confidence.toUpperCase()}\n\n`;
            output += `**Rationale:** ${h.rationale}\n\n`;
            
            if (h.testCriteria && h.testCriteria.length > 0) {
                output += `**Test Criteria:**\n`;
                h.testCriteria.forEach(criterion => {
                    output += `- ${criterion}\n`;
                });
                output += '\n';
            }
            
            if (h.implications) {
                if (h.implications.ifTrue) {
                    output += `**If Confirmed:** ${h.implications.ifTrue}\n\n`;
                }
                if (h.implications.ifFalse) {
                    output += `**If Refuted:** ${h.implications.ifFalse}\n\n`;
                }
            }
            
            output += `**Created:** ${new Date(h.createdAt).toLocaleDateString()}\n`;
            output += `**Expires:** ${new Date(h.expiresAt).toLocaleDateString()}\n\n`;
            output += '---\n\n';
        });

        return output;
    }
}

// Global instance
if (typeof window !== 'undefined') {
    window.HypothesisTracker = HypothesisTracker;
}

// Made with Bob
