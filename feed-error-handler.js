// =============================================
// FeedErrorHandler - RSS Feed Error Handling
// Circuit breaker pattern for failed sources
// =============================================

class FeedErrorHandler {
    constructor() {
        this.failureCount = {}; // { sourceName: count }
        this.circuitBreaker = {}; // { sourceName: { open: boolean, openedAt: timestamp } }
        this.maxFailures = 3;
        this.resetTimeout = 300000; // 5 minutes
    }

    // Record a failure for a source
    recordFailure(sourceName, error) {
        if (!this.failureCount[sourceName]) {
            this.failureCount[sourceName] = 0;
        }
        this.failureCount[sourceName]++;

        console.warn(`Feed error for ${sourceName}:`, error.message);

        // Open circuit breaker if max failures reached
        if (this.failureCount[sourceName] >= this.maxFailures) {
            this.openCircuit(sourceName);
        }
    }

    // Record a success for a source
    recordSuccess(sourceName) {
        this.failureCount[sourceName] = 0;
        this.closeCircuit(sourceName);
    }

    // Open circuit breaker for a source
    openCircuit(sourceName) {
        this.circuitBreaker[sourceName] = {
            open: true,
            openedAt: Date.now()
        };
        console.warn(`Circuit breaker opened for ${sourceName}`);
    }

    // Close circuit breaker for a source
    closeCircuit(sourceName) {
        if (this.circuitBreaker[sourceName]) {
            this.circuitBreaker[sourceName].open = false;
        }
    }

    // Check if circuit breaker is open for a source
    isCircuitOpen(sourceName) {
        const breaker = this.circuitBreaker[sourceName];
        if (!breaker || !breaker.open) {
            return false;
        }

        // Auto-reset after timeout
        if (Date.now() - breaker.openedAt > this.resetTimeout) {
            this.closeCircuit(sourceName);
            this.failureCount[sourceName] = 0;
            return false;
        }

        return true;
    }

    // Get failed sources
    getFailedSources() {
        return Object.keys(this.circuitBreaker)
            .filter(name => this.circuitBreaker[name].open);
    }

    // Reset all circuit breakers
    resetAll() {
        this.failureCount = {};
        this.circuitBreaker = {};
    }
}

// Made with Bob
