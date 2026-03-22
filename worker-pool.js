// =============================================
// Worker Pool
// Manages parallel processing with Web Workers
// Version 1.0 - Phase 3 Task 3.1
// =============================================

/**
 * WorkerPool
 * 
 * Manages a pool of Web Workers for parallel processing:
 * - Tier 1 & 2 analysis in workers (CPU-intensive)
 * - Parallel Tier 3 API calls (I/O-bound)
 * - Queue management for rate limiting
 * - Automatic worker lifecycle management
 */
class WorkerPool {
    constructor(config = {}) {
        this.config = {
            maxWorkers: config.maxWorkers || navigator.hardwareConcurrency || 4,
            maxConcurrentAPI: config.maxConcurrentAPI || 5,
            workerScript: config.workerScript || 'analysis-worker.js',
            enableWorkers: config.enableWorkers !== false // Default: true
        };
        
        // Worker pool
        this.workers = [];
        this.availableWorkers = [];
        this.workerTasks = new Map(); // workerId -> task
        
        // API call queue
        this.apiQueue = [];
        this.activeAPICalls = 0;
        
        // Statistics
        this.stats = {
            tasksCompleted: 0,
            tasksQueued: 0,
            apiCallsCompleted: 0,
            apiCallsQueued: 0,
            averageTaskTime: 0,
            averageAPITime: 0
        };
        
        // Initialize workers if enabled
        if (this.config.enableWorkers && typeof Worker !== 'undefined') {
            this.initializeWorkers();
        }
    }
    
    /**
     * Initialize worker pool
     */
    initializeWorkers() {
        try {
            for (let i = 0; i < this.config.maxWorkers; i++) {
                const worker = new Worker(this.config.workerScript);
                worker.id = i;
                
                worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
                worker.onerror = (e) => this.handleWorkerError(worker, e);
                
                this.workers.push(worker);
                this.availableWorkers.push(worker);
            }
            
            console.log(`WorkerPool initialized with ${this.config.maxWorkers} workers`);
        } catch (error) {
            console.warn('Failed to initialize workers:', error);
            this.config.enableWorkers = false;
        }
    }
    
    /**
     * Process article with Tier 1 & 2 analysis in worker
     * @param {Object} article - Article to analyze
     * @param {Array} clients - List of clients
     * @param {Object} patterns - Keyword and context patterns
     * @returns {Promise<Object>} Analysis result
     */
    async processInWorker(article, clients, patterns) {
        if (!this.config.enableWorkers) {
            // Fallback to main thread
            return this.processInMainThread(article, clients, patterns);
        }
        
        return new Promise((resolve, reject) => {
            const task = {
                id: Date.now() + Math.random(),
                article,
                clients,
                patterns,
                resolve,
                reject,
                startTime: Date.now()
            };
            
            const worker = this.getAvailableWorker();
            
            if (worker) {
                this.executeTask(worker, task);
            } else {
                // Queue task if no workers available
                this.stats.tasksQueued++;
                this.queueTask(task);
            }
        });
    }
    
    /**
     * Get available worker from pool
     */
    getAvailableWorker() {
        return this.availableWorkers.shift();
    }
    
    /**
     * Execute task on worker
     */
    executeTask(worker, task) {
        this.workerTasks.set(worker.id, task);
        
        worker.postMessage({
            type: 'analyze',
            data: {
                article: task.article,
                clients: task.clients,
                patterns: task.patterns
            }
        });
    }
    
    /**
     * Queue task for later execution
     */
    queueTask(task) {
        // Simple FIFO queue
        // Could be enhanced with priority queue
        this.apiQueue.push(task);
    }
    
    /**
     * Handle worker message
     */
    handleWorkerMessage(worker, event) {
        const task = this.workerTasks.get(worker.id);
        
        if (!task) {
            console.warn('Received message from worker with no task');
            return;
        }
        
        const { type, data, error } = event.data;
        
        if (type === 'result') {
            // Task completed successfully
            const duration = Date.now() - task.startTime;
            this.updateStats('task', duration);
            
            task.resolve(data);
            this.releaseWorker(worker);
        } else if (type === 'error') {
            // Task failed
            task.reject(new Error(error));
            this.releaseWorker(worker);
        }
    }
    
    /**
     * Handle worker error
     */
    handleWorkerError(worker, error) {
        console.error('Worker error:', error);
        
        const task = this.workerTasks.get(worker.id);
        if (task) {
            task.reject(error);
            this.releaseWorker(worker);
        }
    }
    
    /**
     * Release worker back to pool
     */
    releaseWorker(worker) {
        this.workerTasks.delete(worker.id);
        this.availableWorkers.push(worker);
        
        // Process queued tasks
        if (this.apiQueue.length > 0) {
            const nextTask = this.apiQueue.shift();
            this.stats.tasksQueued--;
            this.executeTask(worker, nextTask);
        }
    }
    
    /**
     * Process in main thread (fallback)
     */
    processInMainThread(article, clients, patterns) {
        // This would call the actual Tier 1 & 2 methods
        // For now, return a placeholder
        return Promise.resolve({
            tier1: { isRelevant: true, patterns: [] },
            tier2: { threatLevel: 50, opportunityScore: 50 }
        });
    }
    
    /**
     * Execute parallel API calls with rate limiting
     * @param {Array} apiCalls - Array of API call functions
     * @returns {Promise<Array>} Results
     */
    async executeParallelAPICalls(apiCalls) {
        const results = [];
        const executing = [];
        
        for (const apiCall of apiCalls) {
            const promise = this.executeAPICall(apiCall).then(result => {
                results.push(result);
                executing.splice(executing.indexOf(promise), 1);
                return result;
            });
            
            executing.push(promise);
            
            // Wait if we've reached max concurrent calls
            if (executing.length >= this.config.maxConcurrentAPI) {
                await Promise.race(executing);
            }
        }
        
        // Wait for remaining calls
        await Promise.all(executing);
        
        return results;
    }
    
    /**
     * Execute single API call with tracking
     */
    async executeAPICall(apiCallFn) {
        this.activeAPICalls++;
        this.stats.apiCallsQueued++;
        
        const startTime = Date.now();
        
        try {
            const result = await apiCallFn();
            const duration = Date.now() - startTime;
            
            this.updateStats('api', duration);
            this.stats.apiCallsCompleted++;
            
            return result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        } finally {
            this.activeAPICalls--;
            this.stats.apiCallsQueued--;
        }
    }
    
    /**
     * Process multiple articles in parallel
     * @param {Array} articles - Articles to process
     * @param {Array} clients - List of clients
     * @param {Object} patterns - Analysis patterns
     * @param {Function} tier3Fn - Tier 3 analysis function
     * @returns {Promise<Array>} Results
     */
    async processArticlesParallel(articles, clients, patterns, tier3Fn) {
        console.log(`Processing ${articles.length} articles in parallel`);
        
        // Step 1: Process Tier 1 & 2 in parallel using workers
        const tier2Promises = articles.map(article => 
            this.processInWorker(article, clients, patterns)
        );
        
        const tier2Results = await Promise.all(tier2Promises);
        
        // Step 2: Identify articles needing Tier 3
        const tier3Articles = [];
        const finalResults = [];
        
        tier2Results.forEach((result, index) => {
            if (result.needsTier3) {
                tier3Articles.push({
                    article: articles[index],
                    tier2Result: result
                });
            } else {
                finalResults[index] = result;
            }
        });
        
        // Step 3: Process Tier 3 in parallel (with rate limiting)
        if (tier3Articles.length > 0) {
            console.log(`Processing ${tier3Articles.length} articles through Tier 3`);
            
            const tier3Calls = tier3Articles.map(({ article, tier2Result }) => 
                () => tier3Fn(article, tier2Result)
            );
            
            const tier3Results = await this.executeParallelAPICalls(tier3Calls);
            
            // Merge Tier 3 results
            let tier3Index = 0;
            tier2Results.forEach((result, index) => {
                if (result.needsTier3) {
                    finalResults[index] = tier3Results[tier3Index++];
                }
            });
        }
        
        return finalResults;
    }
    
    /**
     * Update statistics
     */
    updateStats(type, duration) {
        if (type === 'task') {
            this.stats.tasksCompleted++;
            this.stats.averageTaskTime = 
                (this.stats.averageTaskTime * (this.stats.tasksCompleted - 1) + duration) / 
                this.stats.tasksCompleted;
        } else if (type === 'api') {
            this.stats.averageAPITime = 
                (this.stats.averageAPITime * (this.stats.apiCallsCompleted - 1) + duration) / 
                (this.stats.apiCallsCompleted + 1);
        }
    }
    
    /**
     * Get current statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeWorkers: this.workers.length - this.availableWorkers.length,
            availableWorkers: this.availableWorkers.length,
            queuedTasks: this.apiQueue.length,
            activeAPICalls: this.activeAPICalls,
            config: {
                maxWorkers: this.config.maxWorkers,
                maxConcurrentAPI: this.config.maxConcurrentAPI,
                workersEnabled: this.config.enableWorkers
            }
        };
    }
    
    /**
     * Terminate all workers
     */
    terminate() {
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        this.availableWorkers = [];
        this.workerTasks.clear();
        console.log('WorkerPool terminated');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkerPool;
}

// Made with Bob
