// =============================================
// The Signal Today - Web Application
// =============================================

// =============================================
// SignalDB — IndexedDB persistence layer
// Stores a 7-day rolling article corpus and
// 14-day digest history. Survives localStorage
// quota limits (~5 MB) and enables trend
// detection across multiple refresh cycles.
// =============================================

class SignalDB {
    static DB_NAME    = 'signal-today-db';
    static DB_VERSION = 1;
    static STORES     = { ARTICLES: 'articles', DIGESTS: 'digests', READ_STATE: 'readState' };
    static ARTICLE_TTL_DAYS = 7;
    static DIGEST_TTL_DAYS  = 14;

    constructor() {
        this._db = null; // IDBDatabase instance, set after open()
    }

    // Open (or create) the database and run migrations
    open() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(SignalDB.DB_NAME, SignalDB.DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                // articles store: keyed by article id, indexed by publishedDate for TTL purge
                if (!db.objectStoreNames.contains(SignalDB.STORES.ARTICLES)) {
                    const store = db.createObjectStore(SignalDB.STORES.ARTICLES, { keyPath: 'id' });
                    store.createIndex('publishedDate', 'publishedDate', { unique: false });
                    store.createIndex('savedAt', 'savedAt', { unique: false });
                }
                // digests store: keyed by date string YYYY-MM-DD
                if (!db.objectStoreNames.contains(SignalDB.STORES.DIGESTS)) {
                    db.createObjectStore(SignalDB.STORES.DIGESTS, { keyPath: 'date' });
                }
                // readState store: keyed by articleId
                if (!db.objectStoreNames.contains(SignalDB.STORES.READ_STATE)) {
                    db.createObjectStore(SignalDB.STORES.READ_STATE, { keyPath: 'articleId' });
                }
            };

            req.onsuccess = (e) => {
                this._db = e.target.result;
                // Purge stale records on every open (non-blocking)
                this._purgeOldArticles();
                this._purgeOldDigests();
                resolve(this);
            };

            req.onerror = (e) => {
                console.warn('SignalDB: failed to open IndexedDB', e.target.error);
                resolve(this); // Resolve (not reject) so app still works without IDB
            };
        });
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    _tx(storeName, mode = 'readonly') {
        if (!this._db) return null;
        try {
            return this._db.transaction(storeName, mode).objectStore(storeName);
        } catch (e) {
            console.warn('SignalDB: transaction error', e);
            return null;
        }
    }

    _promisify(req) {
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror  = () => reject(req.error);
        });
    }

    _purgeOldArticles() {
        const store = this._tx(SignalDB.STORES.ARTICLES, 'readwrite');
        if (!store) return;
        const cutoff = new Date(Date.now() - SignalDB.ARTICLE_TTL_DAYS * 86400000).toISOString();
        const idx = store.index('publishedDate');
        const range = IDBKeyRange.upperBound(cutoff);
        idx.openCursor(range).onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) { cursor.delete(); cursor.continue(); }
        };
    }

    _purgeOldDigests() {
        const store = this._tx(SignalDB.STORES.DIGESTS, 'readwrite');
        if (!store) return;
        const cutoffDate = new Date(Date.now() - SignalDB.DIGEST_TTL_DAYS * 86400000);
        const cutoffKey = cutoffDate.toISOString().slice(0, 10); // YYYY-MM-DD
        const range = IDBKeyRange.upperBound(cutoffKey);
        store.openCursor(range).onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) { cursor.delete(); cursor.continue(); }
        };
    }

    // Close the database connection
    close() {
        if (this._db) {
            this._db.close();
            this._db = null;
            console.log('SignalDB: database connection closed');
        }
    }

    // ── Articles ──────────────────────────────────────────────────────────────

    // Save (upsert) an array of articles. Strips scoreBreakdown to save space.
    async saveArticles(articles) {
        const store = this._tx(SignalDB.STORES.ARTICLES, 'readwrite');
        if (!store) return;
        const now = new Date().toISOString();
        for (const a of articles) {
            // Omit scoreBreakdown from persisted record (large, recomputed on next score)
            const { scoreBreakdown, ...slim } = a;
            slim.savedAt = now;
            store.put(slim);
        }
    }

    // Load all articles from the rolling corpus (up to 7 days old)
    async loadArticles() {
        const store = this._tx(SignalDB.STORES.ARTICLES, 'readonly');
        if (!store) return [];
        try {
            return await this._promisify(store.getAll());
        } catch (e) {
            console.warn('SignalDB: loadArticles error', e);
            return [];
        }
    }

    // ── Digests ───────────────────────────────────────────────────────────────

    // Save today's digest keyed by YYYY-MM-DD
    async saveDigest(digest) {
        if (!digest) return;
        const store = this._tx(SignalDB.STORES.DIGESTS, 'readwrite');
        if (!store) return;
        const record = { ...digest, date: new Date().toISOString().slice(0, 10) };
        store.put(record);
    }

    // Load the most recent digest (highest date key)
    async loadLatestDigest() {
        const store = this._tx(SignalDB.STORES.DIGESTS, 'readonly');
        if (!store) return null;
        try {
            // Open cursor in descending order to get the latest
            return await new Promise((resolve) => {
                const req = store.openCursor(null, 'prev');
                req.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : null);
                req.onerror   = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    // Load all digests (for trend detection in Phase 6)
    async loadAllDigests() {
        const store = this._tx(SignalDB.STORES.DIGESTS, 'readonly');
        if (!store) return [];
        try {
            return await this._promisify(store.getAll());
        } catch (e) {
            return [];
        }
    }

    // ── Read State ────────────────────────────────────────────────────────────

    // Mark an article as read
    async markRead(articleId) {
        const store = this._tx(SignalDB.STORES.READ_STATE, 'readwrite');
        if (!store) return;
        store.put({ articleId, readAt: new Date().toISOString() });
    }

    // Load the full set of read article IDs as a Set<string>
    async loadReadIds() {
        const store = this._tx(SignalDB.STORES.READ_STATE, 'readonly');
        if (!store) return new Set();
        try {
            const all = await this._promisify(store.getAllKeys());
            return new Set(all.map(String));
        } catch (e) {
            return new Set();
        }
    }

    // ── Migration ─────────────────────────────────────────────────────────────

    // One-time migration: import articles from localStorage into IDB, then remove the key
    async migrateFromLocalStorage() {
        const raw = localStorage.getItem('signal_articles');
        if (!raw) return 0;
        try {
            const articles = JSON.parse(raw);
            if (Array.isArray(articles) && articles.length > 0) {
                await this.saveArticles(articles);
                localStorage.removeItem('signal_articles');
                console.log(`SignalDB: migrated ${articles.length} articles from localStorage → IDB`);
                return articles.length;
            }
        } catch (e) {
            console.warn('SignalDB: migration error', e);
        }
        return 0;
    }
}

// Each proxy entry: { url, format }
//   format 'query-encoded' → appends encodeURIComponent(feedUrl) to url
//   format 'path-raw'      → appends the raw feed URL directly (path-based proxies)
//   format 'feed2json'     → query-encoded; response is JSON Feed, not XML
// Confirmed working as of 2026-08-28. Re-test if all start failing again.
const CORS_PROXIES = [
    { url: 'https://cors-anywhere.fly.dev/', format: 'path-raw' },
    { url: 'https://feed2json.org/convert?url=', format: 'feed2json' },
];

// Feed cache to avoid refetching within 2 minutes (short enough to stay fresh)
const feedCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// PHASE 1: Staggered cache durations for cost optimization
// Different content types have different update frequencies
const CACHE_DURATIONS = {
    INTELLIGENCE: 4 * 60 * 60 * 1000,      // 4 hours - changes frequently
    DAILY_DIGEST: 24 * 60 * 60 * 1000,     // 24 hours - daily strategic content
    MARKET_INSIGHTS: 24 * 60 * 60 * 1000,  // 24 hours - slow-moving market trends
    TODAYS_SIGNALS: 6 * 60 * 60 * 1000,    // 6 hours - mid-frequency
    DEEP_READS: 72 * 60 * 60 * 1000        // 72 hours - weekly strategic reads
};

// =============================================
// API COST OPTIMIZATION - Model Selection & Token Tracking
// =============================================

// Model pricing (per million tokens) - for tracking/display
// AI Provider Configuration
const AI_PROVIDERS = {
    CLAUDE: 'claude',
    OPENAI: 'openai'
};

// Provider-specific model mappings
const PROVIDER_MODELS = {
    claude: {
        HAIKU: 'claude-haiku-4-5-20251001',
        SONNET: 'claude-sonnet-4-5-20250929'
    },
    openai: {
        HAIKU: 'gpt-4o-mini',  // Fast/Cheap tier
        SONNET: 'gpt-4o'       // Strategic/Quality tier
    }
};

// Provider API endpoints
const PROVIDER_ENDPOINTS = {
    claude: 'https://api.anthropic.com/v1/messages',
    openai: 'https://api.openai.com/v1/chat/completions'
};

// Comprehensive pricing for all providers (per million tokens)
const MODEL_PRICING = {
    // Claude models (pricing per million tokens as of 2025)
    'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
    'claude-haiku-4-5-20251001':  { input: 1.00, output:  5.00 },
    
    // OpenAI models (current market rates as of 2026)
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 }
};

// Model selection based on task complexity (tier-based)
const MODEL_TIERS = {
    // Haiku tier for simple, fast tasks (75% cost savings)
    CLASSIFICATION: 'HAIKU',
    EXTRACTION: 'HAIKU',
    SUMMARIZATION_SHORT: 'HAIKU',
    
    // Sonnet tier for complex analysis tasks
    SYNTHESIS: 'SONNET',
    STRATEGIC_ANALYSIS: 'SONNET',
    MULTI_SOURCE_ANALYSIS: 'SONNET'
};

// Token usage tracking for the session
let tokenUsageStats = {
    sessionStart: Date.now(),
    calls: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCost: 0
};

// Load persisted stats
try {
    const saved = localStorage.getItem('signal_token_stats');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Only use if from today
        if (parsed.sessionStart && new Date(parsed.sessionStart).toDateString() === new Date().toDateString()) {
            tokenUsageStats = parsed;
        }
    }
} catch (e) { /* ignore */ }

// Cache performance tracking
let cachePerformanceStats = {
    sessionStart: Date.now(),
    hits: 0,
    misses: 0,
    bySection: {
        'executive-summary': { hits: 0, misses: 0, lastAccess: null },
        'market-insights': { hits: 0, misses: 0, lastAccess: null },
        'action-required': { hits: 0, misses: 0, lastAccess: null },
        'deep-reads': { hits: 0, misses: 0, lastAccess: null }
    }
};

// Load persisted cache stats
try {
    const saved = localStorage.getItem('signal_cache_stats');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Only use if from today
        if (parsed.sessionStart && new Date(parsed.sessionStart).toDateString() === new Date().toDateString()) {
            cachePerformanceStats = parsed;
        }
    }
} catch (e) { /* ignore */ }

/**
 * Track cache access for performance monitoring
 * @param {string} section - Section name (executive-summary, market-insights, etc.)
 * @param {boolean} isHit - Whether cache was hit or missed
 */
function trackCacheAccess(section, isHit) {
    if (isHit) {
        cachePerformanceStats.hits++;
        if (cachePerformanceStats.bySection[section]) {
            cachePerformanceStats.bySection[section].hits++;
            cachePerformanceStats.bySection[section].lastAccess = Date.now();
        }
    } else {
        cachePerformanceStats.misses++;
        if (cachePerformanceStats.bySection[section]) {
            cachePerformanceStats.bySection[section].misses++;
            cachePerformanceStats.bySection[section].lastAccess = Date.now();
        }
    }
    
    // Persist stats
    try {
        localStorage.setItem('signal_cache_stats', JSON.stringify(cachePerformanceStats));
    } catch (e) { /* ignore */ }
}

/**
 * Get cache hit rate for a section or overall
 * @param {string} section - Optional section name
 * @returns {number} Hit rate as percentage (0-100)
 */
function getCacheHitRate(section = null) {
    if (section && cachePerformanceStats.bySection[section]) {
        const stats = cachePerformanceStats.bySection[section];
        const total = stats.hits + stats.misses;
        return total > 0 ? (stats.hits / total * 100) : 0;
    }
    
    const total = cachePerformanceStats.hits + cachePerformanceStats.misses;
    return total > 0 ? (cachePerformanceStats.hits / total * 100) : 0;
}

/**
 * Unified API call helper with model selection, token tracking, and error handling
 * @param {string} taskType - One of MODEL_TIERS keys
 * @param {string} prompt - The prompt to send
 * @param {number} maxTokens - Maximum output tokens
 * @param {string} apiKey - Claude API key
 * @returns {Promise<{text: string, usage: object}>}
 */
/**
 * Get current AI provider and API keys from settings
 */
function getAIProviderSettings() {
    let provider = localStorage.getItem('signal_ai_provider') || AI_PROVIDERS.CLAUDE;
    
    // Migration: Auto-switch Gemini users to Claude
    if (provider === 'gemini') {
        console.log('🔄 Migrating from Gemini to Claude...');
        provider = AI_PROVIDERS.CLAUDE;
        localStorage.setItem('signal_ai_provider', AI_PROVIDERS.CLAUDE);
    }
    
    const apiKeys = {
        claude: localStorage.getItem('signal_claude_api_key') || localStorage.getItem('signal_api_key') || localStorage.getItem('apiKey') || '', // Backward compatibility
        openai: localStorage.getItem('signal_openai_api_key') || ''
    };
    return { provider, apiKeys };
}
// =============================================
// AI Request Queue - Rate Limiting & Throttling
// =============================================

/**
 * AIRequestQueue manages API calls to prevent rate limit errors.
 * Tracks token usage per minute and queues requests when approaching limits.
 * 
 * Features:
 * - Token-based rate limiting (configurable per provider)
 * - Request queuing with sequential processing
 * - Automatic throttling when near limits
 * - Per-provider token tracking
 * - Sliding window rate limiting (60-second windows)
 */
class AIRequestQueue {
    constructor() {
        // Rate limits per provider (tokens per minute)
        // Note: Adjusted based on user's actual tier limits
        this.RATE_LIMITS = {
            [AI_PROVIDERS.CLAUDE]: 7000,   // Buffer below 8,000 hard limit (claude-3-5-sonnet)
            [AI_PROVIDERS.OPENAI]: 28000   // Buffer below 30,000 TPM (user's Tier 2+)
        };
        
        // Safety multiplier for token estimates (accounts for actual usage exceeding maxTokens)
        this.SAFETY_MULTIPLIER = 1.5;
        
        // Token usage tracking per provider (completed requests)
        this.tokenUsage = {
            [AI_PROVIDERS.CLAUDE]: [],
            [AI_PROVIDERS.OPENAI]: []
        };
        
        // In-flight request tracking per provider (prevents race condition)
        this.inFlightTokens = {
            [AI_PROVIDERS.CLAUDE]: 0,
            [AI_PROVIDERS.OPENAI]: 0
        };
        
        // Request queue per provider
        this.queues = {
            [AI_PROVIDERS.CLAUDE]: [],
            [AI_PROVIDERS.OPENAI]: []
        };
        
        // Processing state per provider
        this.processing = {
            [AI_PROVIDERS.CLAUDE]: false,
            [AI_PROVIDERS.OPENAI]: false
        };
    }
    
    /**
     * Add request to queue and process when rate limit allows.
     * @param {string} provider - AI provider
     * @param {Function} requestFn - Async function that makes the API call
     * @param {number} estimatedTokens - Estimated output tokens for this request
     * @returns {Promise} - Resolves with API response
     */
    async enqueue(provider, requestFn, estimatedTokens) {
        return new Promise((resolve, reject) => {
            this.queues[provider].push({
                requestFn,
                estimatedTokens,
                resolve,
                reject
            });
            
            // Start processing if not already running
            if (!this.processing[provider]) {
                this._processQueue(provider);
            }
        });
    }
    
    /**
     * Process queued requests for a provider.
     * @private
     */
    async _processQueue(provider) {
        if (this.processing[provider]) return;
        this.processing[provider] = true;
        
        while (this.queues[provider].length > 0) {
            const request = this.queues[provider][0];
            
            // Apply safety multiplier to estimated tokens
            const safeEstimate = Math.ceil(request.estimatedTokens * this.SAFETY_MULTIPLIER);
            
            // Check if we can make this request without exceeding rate limit
            // Include both completed usage AND in-flight requests
            const currentUsage = this._getCurrentUsage(provider);
            const totalUsage = currentUsage + this.inFlightTokens[provider];
            const rateLimit = this.RATE_LIMITS[provider];
            
            if (totalUsage + safeEstimate > rateLimit) {
                // Wait until we have capacity
                const waitTime = this._calculateWaitTime(provider, safeEstimate);
                console.log(`⏳ Rate limit approaching for ${provider}. Waiting ${Math.round(waitTime/1000)}s before next request...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            
            // Remove from queue and reserve tokens for in-flight request
            this.queues[provider].shift();
            this.inFlightTokens[provider] += safeEstimate;
            
            try {
                const result = await request.requestFn();
                
                // Release reserved tokens and track actual usage
                this.inFlightTokens[provider] -= safeEstimate;
                if (result.usage) {
                    this._recordUsage(provider, result.usage.output_tokens);
                }
                
                request.resolve(result);
            } catch (error) {
                // Release reserved tokens on error
                this.inFlightTokens[provider] -= safeEstimate;
                request.reject(error);
            }
            
            // Small delay between requests to avoid bursts
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.processing[provider] = false;
    }
    
    /**
     * Get current token usage in the last 60 seconds.
     * @private
     */
    _getCurrentUsage(provider) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Remove old entries and sum current usage
        this.tokenUsage[provider] = this.tokenUsage[provider].filter(
            entry => entry.timestamp > oneMinuteAgo
        );
        
        return this.tokenUsage[provider].reduce(
            (sum, entry) => sum + entry.tokens, 0
        );
    }
    
    /**
     * Record token usage for rate limiting.
     * @private
     */
    _recordUsage(provider, tokens) {
        this.tokenUsage[provider].push({
            timestamp: Date.now(),
            tokens: tokens
        });
    }
    
    /**
     * Calculate how long to wait before making next request.
     * @private
     */
    _calculateWaitTime(provider, estimatedTokens) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const rateLimit = this.RATE_LIMITS[provider];
        
        // Find oldest entry that would need to expire to make room
        const sortedUsage = this.tokenUsage[provider]
            .filter(entry => entry.timestamp > oneMinuteAgo)
            .sort((a, b) => a.timestamp - b.timestamp);
        
        let cumulativeTokens = 0;
        for (const entry of sortedUsage) {
            cumulativeTokens += entry.tokens;
            if (cumulativeTokens + estimatedTokens <= rateLimit) {
                // We have enough capacity
                return 100; // Minimal wait
            }
        }
        
        // Need to wait for oldest entries to expire
        if (sortedUsage.length > 0) {
            const oldestEntry = sortedUsage[0];
            const waitTime = (oldestEntry.timestamp + 60000) - now + 1000; // +1s buffer
            return Math.max(waitTime, 1000);
        }
        
        return 1000; // Default 1 second wait
    }
    
    /**
     * Get queue status for monitoring.
     */
    getStatus() {
        return {
            claude: {
                queueLength: this.queues[AI_PROVIDERS.CLAUDE].length,
                currentUsage: this._getCurrentUsage(AI_PROVIDERS.CLAUDE),
                inFlightTokens: this.inFlightTokens[AI_PROVIDERS.CLAUDE],
                rateLimit: this.RATE_LIMITS[AI_PROVIDERS.CLAUDE],
                processing: this.processing[AI_PROVIDERS.CLAUDE]
            },
            openai: {
                queueLength: this.queues[AI_PROVIDERS.OPENAI].length,
                currentUsage: this._getCurrentUsage(AI_PROVIDERS.OPENAI),
                inFlightTokens: this.inFlightTokens[AI_PROVIDERS.OPENAI],
                rateLimit: this.RATE_LIMITS[AI_PROVIDERS.OPENAI],
                processing: this.processing[AI_PROVIDERS.OPENAI]
            }
        };
    }
}

// Global request queue instance
const aiRequestQueue = new AIRequestQueue();


/**
 * Call AI provider with automatic retry logic and exponential backoff.
 * Retries on transient failures (overload, timeout, network issues).
 * 
 * @param {string} taskType - The type of AI task (e.g., 'SYNTHESIS', 'STRATEGIC_ANALYSIS')
 * @param {string} prompt - The prompt to send to the AI
 * @param {number} maxTokens - Maximum tokens for the response
 * @param {string} apiKey - API key (optional, will use settings if not provided)
 * @param {string} provider - AI provider (optional, will use settings if not provided)
 * @returns {Promise<{text: string, usage: {input_tokens: number, output_tokens: number}}>}
 */
async function callAI(taskType, prompt, maxTokens, apiKey = null, provider = null) {
    // Get provider settings
    if (!provider) {
        const settings = getAIProviderSettings();
        provider = settings.provider;
        if (!apiKey) {
            apiKey = settings.apiKeys[provider];
        }
    }
    
    // Validate provider
    const validProviders = Object.values(AI_PROVIDERS);
    if (!validProviders.includes(provider)) {
        throw new Error(`Invalid AI provider: "${provider}". Must be one of: ${validProviders.join(', ')}`);
    }
    
    if (!apiKey) {
        throw new Error(`No API key configured for ${provider}`);
    }
    
    // Enqueue request with rate limiting
    // Estimate output tokens (use maxTokens as upper bound)
    return await aiRequestQueue.enqueue(
        provider,
        async () => {
            // Retry configuration for this specific request
            const MAX_RETRIES = 3;
            const INITIAL_DELAY = 2000; // 2 seconds for 429 errors
            let lastError;
            
            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    return await callAIInternal(taskType, prompt, maxTokens, apiKey, provider);
                } catch (error) {
                    lastError = error;
                    
                    // Check if error is retryable
                    const isRetryable = isRetryableError(error, provider);
                    const is429Error = error.message.includes('429') || error.message.includes('Too Many Requests');
                    
                    // Don't retry on last attempt or non-retryable errors
                    if (attempt === MAX_RETRIES || !isRetryable) {
                        console.error(`${provider} API call failed after ${attempt} attempt(s) (${taskType}):`, error);
                        throw error;
                    }
                    
                    // Calculate delay with exponential backoff
                    // Use longer delays for 429 errors (rate limits)
                    const baseDelay = is429Error ? INITIAL_DELAY : 1000;
                    const delay = baseDelay * Math.pow(2, attempt - 1);
                    console.warn(`${provider} API call failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`, error.message);
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            // Should never reach here, but just in case
            throw lastError;
        },
        maxTokens
    );
}

/**
 * Determines if an error is retryable (transient failure vs permanent error).
 * @private
 */
function isRetryableError(error, provider) {
    const errorMessage = error.message.toLowerCase();
    
    // Retryable error patterns
    const retryablePatterns = [
        'overloaded',
        'timeout',
        'network',
        'rate limit',
        'too many requests',
        'service unavailable',
        'temporarily unavailable',
        'empty response',
        '429', // Rate limit HTTP code
        '503', // Service unavailable
        '504'  // Gateway timeout
    ];
    
    // Check if error message contains any retryable pattern
    const isRetryable = retryablePatterns.some(pattern => 
        errorMessage.includes(pattern)
    );
    
    // Non-retryable errors (fail fast)
    const nonRetryablePatterns = [
        'invalid api key',
        'authentication',
        'unauthorized',
        'forbidden',
        'not found',
        'insufficient_quota',
        'quota_exceeded',
        'billing_hard_limit_reached',
        'insufficient funds',
        'payment required',
        '401', // Unauthorized
        '402', // Payment Required
        '403', // Forbidden
        '404'  // Not found
    ];
    
    const isNonRetryable = nonRetryablePatterns.some(pattern =>
        errorMessage.includes(pattern)
    );
    
    // If explicitly non-retryable, don't retry
    if (isNonRetryable) {
        return false;
    }
    
    // Otherwise, retry if it matches retryable patterns
    return isRetryable;
}

/**
 * Internal function that performs the actual API call without retry logic.
 * Used by callAI() wrapper which handles retries.
 * @private
 */
async function callAIInternal(taskType, prompt, maxTokens, apiKey, provider) {
    const startTime = Date.now();
    
    // Get model tier and actual model name
    const modelTier = MODEL_TIERS[taskType] || MODEL_TIERS.SYNTHESIS;
    const model = PROVIDER_MODELS[provider][modelTier];
    const pricing = MODEL_PRICING[model];
    
    try {
        let response, data, text, usage;
        
        switch (provider) {
            case AI_PROVIDERS.CLAUDE:
                response = await fetch(PROVIDER_ENDPOINTS.claude, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: model,
                        max_tokens: maxTokens,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    const errorMsg = error.error?.message || `Claude API error: ${response.status}`;
                    const errorType = error.error?.type || '';
                    
                    // Check for billing/quota errors
                    if (response.status === 402 ||
                        errorType.includes('insufficient_quota') ||
                        errorType.includes('billing') ||
                        errorMsg.toLowerCase().includes('quota') ||
                        errorMsg.toLowerCase().includes('credit')) {
                        throw new Error(`BILLING_ERROR: ${errorMsg}`);
                    }
                    
                    throw new Error(errorMsg);
                }
                
                data = await response.json();
                
                // Universal error check - catches errors in response body (defense-in-depth)
                if (data.error) {
                    const errorMsg = data.error.message || `Claude API error: ${data.error.code || 'unknown'}`;
                    const errorType = data.error.type || '';
                    
                    // Check for billing/quota errors
                    if (errorType.includes('insufficient_quota') ||
                        errorType.includes('billing') ||
                        errorMsg.toLowerCase().includes('quota') ||
                        errorMsg.toLowerCase().includes('credit')) {
                        throw new Error(`BILLING_ERROR: ${errorMsg}`);
                    }
                    
                    throw new Error(errorMsg);
                }
                
                text = data.content[0]?.text || '';
                usage = {
                    input_tokens: data.usage?.input_tokens || 0,
                    output_tokens: data.usage?.output_tokens || 0
                };
                break;
                
            case AI_PROVIDERS.OPENAI:
                response = await fetch(PROVIDER_ENDPOINTS.openai, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        max_tokens: maxTokens,
                        messages: [{ role: 'user', content: prompt }]
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    const errorMsg = error.error?.message || `OpenAI API error: ${response.status}`;
                    const errorCode = error.error?.code || '';
                    
                    // Check for billing/quota errors
                    if (response.status === 402 ||
                        errorCode.includes('insufficient_quota') ||
                        errorCode.includes('billing') ||
                        errorMsg.toLowerCase().includes('quota') ||
                        errorMsg.toLowerCase().includes('credit') ||
                        errorMsg.toLowerCase().includes('insufficient funds')) {
                        throw new Error(`BILLING_ERROR: ${errorMsg}`);
                    }
                    
                    throw new Error(errorMsg);
                }
                
                data = await response.json();
                
                // Universal error check - catches errors in response body (defense-in-depth)
                if (data.error) {
                    const errorMsg = data.error.message || `OpenAI API error: ${data.error.code || 'unknown'}`;
                    const errorCode = data.error.code || '';
                    
                    // Check for billing/quota errors
                    if (errorCode.includes('insufficient_quota') ||
                        errorCode.includes('billing') ||
                        errorMsg.toLowerCase().includes('quota') ||
                        errorMsg.toLowerCase().includes('credit') ||
                        errorMsg.toLowerCase().includes('insufficient funds')) {
                        throw new Error(`BILLING_ERROR: ${errorMsg}`);
                    }
                    
                    throw new Error(errorMsg);
                }
                
                text = data.choices[0]?.message?.content || '';
                usage = {
                    input_tokens: data.usage?.prompt_tokens || 0,
                    output_tokens: data.usage?.completion_tokens || 0
                };
                break;
                
                
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
        
        // Track usage
        const callCost = (usage.input_tokens * pricing.input / 1000000) +
                         (usage.output_tokens * pricing.output / 1000000);
        
        tokenUsageStats.calls.push({
            timestamp: Date.now(),
            taskType,
            provider,
            model,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cost: callCost,
            duration: Date.now() - startTime
        });
        tokenUsageStats.totalInputTokens += usage.input_tokens;
        tokenUsageStats.totalOutputTokens += usage.output_tokens;
        tokenUsageStats.estimatedCost += callCost;
        
        // Persist stats
        try {
            localStorage.setItem('signal_token_stats', JSON.stringify(tokenUsageStats));
        } catch (e) { /* ignore */ }
        
        return { text, usage };
    } catch (error) {
        console.error(`${provider} API call failed (${taskType}):`, error);
        throw error;
    }
}

/**
 * Legacy function for backward compatibility with Claude-only implementation.
 *
 * @deprecated Since v2.0 - Use callAI() instead with AI_PROVIDERS.CLAUDE
 * @param {string} taskType - The type of AI task (e.g., 'SYNTHESIS', 'STRATEGIC_ANALYSIS')
 * @param {string} prompt - The prompt to send to Claude
 * @param {number} maxTokens - Maximum tokens for the response
 * @param {string} apiKey - Claude API key
 * @returns {Promise<{text: string, usage: {input_tokens: number, output_tokens: number}}>}
 * @example
 * // Old way (deprecated)
 * const result = await callClaudeAPI('SYNTHESIS', prompt, 800, apiKey);
 *
 * // New way (recommended)
 * const result = await callAI('SYNTHESIS', prompt, 800, apiKey, AI_PROVIDERS.CLAUDE);
 */
async function callClaudeAPI(taskType, prompt, maxTokens, apiKey) {
    return callAI(taskType, prompt, maxTokens, apiKey, AI_PROVIDERS.CLAUDE);
}

/**
 * Compress article data for prompts - reduces input tokens by ~40%
 */
function compressArticleForPrompt(article, includeFields = ['title', 'summary', 'source']) {
    const parts = [];
    if (includeFields.includes('title') && article.title) {
        parts.push(article.title);
    }
    if (includeFields.includes('summary') && article.summary) {
        // Truncate summary to first 150 chars
        parts.push(article.summary.substring(0, 150));
    }
    if (includeFields.includes('source') && (article.source || article.sourceName)) {
        parts.push(`[${article.source || article.sourceName}]`);
    }
    if (includeFields.includes('url') && article.url) {
        parts.push(article.url);
    }
    return parts.join(' | ');
}

/**
 * Get provider name from model string
 * @param {string} model - Model name (e.g., 'claude-sonnet-4-20250514', 'gpt-4o')
 * @returns {string} - Provider name ('claude', 'openai', or 'unknown')
 */
function getProviderFromModel(model) {
    if (!model) return 'unknown';
    if (model.includes('claude')) return 'claude';
    if (model.includes('gpt')) return 'openai';
    return 'unknown';
}

/**
 * Get token usage summary for display
 * @param {string|null} providerFilter - Optional provider filter ('claude', 'openai', or null for all)
 * @returns {object} - Usage statistics
 */
function getTokenUsageSummary(providerFilter = null) {
    const today = tokenUsageStats.calls.filter(c =>
        new Date(c.timestamp).toDateString() === new Date().toDateString()
    );
    
    // Filter by provider if specified
    const filtered = providerFilter
        ? today.filter(c => getProviderFromModel(c.model) === providerFilter)
        : today;
    
    const byModel = {};
    filtered.forEach(call => {
        if (!byModel[call.model]) {
            byModel[call.model] = { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
        }
        byModel[call.model].calls++;
        byModel[call.model].inputTokens += call.inputTokens;
        byModel[call.model].outputTokens += call.outputTokens;
        byModel[call.model].cost += call.cost;
    });
    
    return {
        totalCalls: filtered.length,
        totalInputTokens: filtered.reduce((sum, c) => sum + c.inputTokens, 0),
        totalOutputTokens: filtered.reduce((sum, c) => sum + c.outputTokens, 0),
        estimatedCost: filtered.reduce((sum, c) => sum + c.cost, 0),
        byModel,
        providerFilter
    };
}

/**
 * Reset daily token stats (call at midnight or on demand)
 */
function resetTokenStats() {
    tokenUsageStats = {
        sessionStart: Date.now(),
        calls: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        estimatedCost: 0
    };
    localStorage.setItem('signal_token_stats', JSON.stringify(tokenUsageStats));
}

/**
 * Switch between stats tabs (Current Provider vs All Providers)
 * @param {string} tabName - 'current' or 'all'
 */
function switchStatsTab(tabName) {
    window.statsTabState = tabName;
    // Re-render the stats display with the new filter
    if (window.app) {
        window.app.renderIntelligenceStatsInSettings();
    }
}

/**
 * Update section timestamp display
 * @param {string} sectionId - Section identifier (e.g., 'executive-summary', 'market-insights')
 * @param {number} timestamp - Unix timestamp of when content was generated
 * @param {boolean} isCached - Whether content is from cache
 * @param {string} [message] - Optional additional message to display
 */
function updateSectionTimestamp(sectionId, timestamp, isCached, message = '') {
    const el = document.getElementById(`${sectionId}-timestamp`);
    if (!el) return;
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    let timeStr;
    if (diffMins < 1) {
        timeStr = 'just now';
    } else if (diffMins < 60) {
        timeStr = `${diffMins}m ago`;
    } else if (diffHours < 24) {
        timeStr = `${diffHours}h ago`;
    } else {
        timeStr = date.toLocaleDateString();
    }
    
    const cacheIndicator = isCached ? '📦 ' : '✨ ';
    const displayText = message || (isCached ? `cached ${timeStr}` : `updated ${timeStr}`);
    
    el.textContent = `${cacheIndicator}${displayText}`;
    el.title = `Generated: ${date.toLocaleString()}${isCached ? ' (from cache)' : ' (fresh)'}`;
}

const STORAGE_KEYS = {
    API_KEY: 'signal_api_key',
    SOURCES: 'signal_sources',
    INDUSTRIES: 'signal_industries',
    CLIENTS: 'signal_clients',
    ARTICLES: 'signal_articles',
    DIGEST: 'signal_digest',
    SETTINGS: 'signal_settings',
    TODAYS_SIGNALS: 'signal_todays_signals_cache',
    DEEP_READS: 'signal_deep_reads_cache',
    LAST_REFRESH: 'signal_last_refresh',
    TREND_HISTORY: 'signal_trend_history',
    ARTICLE_RATINGS: 'signal_article_ratings',   // Per-article 👍/👎 feedback
    SOURCE_SCORE_DRIFT: 'signal_score_drift',     // Accumulated score drift per source
    SECTION_STATE: 'signal_section_state'         // Persisted section open/close states
};

// Utility: Escape HTML entities to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

class SignalApp {
    constructor() {
        this.articles = [];
        this.dailyArticles = [];
        this.weeklyArticles = [];
        this.digest = null;
        this.sources = [];
        this.industries = [];
        this.clients = [];
        this.settings = {
            dailyMinutes: 15,
            weeklyArticles: 10,
            weeklyCurrencyDays: 7,
            thisWeekContext: '',
            autoRefreshTime: '',
            keyboardShortcuts: true
        };
        this.isLoading = false;
        this.currentTab = 'daily';
        this.crossRefs = [];
        this.focusedArticleIndex = -1;
        this.autoRefreshTimer = null;
        this.articleRatings = {};
        this.sourceScoreDrift = {};
        this.failedSources = [];
        this.debugMode = (typeof window !== 'undefined' && window.location) ?
            new URLSearchParams(window.location.search).get('debug') === '1' : false;
        this.db = new SignalDB();
        
        // New: Market filtering state
        this.currentMarket = 'ALL';
        this.clientManagerMarket = 'ALL';
        this.selectedClients = new Set();
        this.lastBriefATLText = '';
        
        // Intelligence Engine
        this.intelligenceEngine = null;
        this.intelligenceStats = null;
        
        this.init();
    }

    async init() {
        try {
            // Open IndexedDB first (non-blocking fallback if unavailable)
            await this.db.open();

            // Load settings, sources, clients, industries, ratings, drift from localStorage
            this.loadFromStorage();

            // Initialize intelligence engine if API key available
            const settings = getAIProviderSettings();
            const apiKey = settings.apiKeys[settings.provider];
            if (apiKey && typeof HybridIntelligenceEngine !== 'undefined') {
                this.intelligenceEngine = new HybridIntelligenceEngine(apiKey, settings.provider);
                console.log(`🧠 Hybrid Intelligence Engine initialized (${settings.provider})`);
            } else if (!apiKey) {
                console.log('⚠️ Intelligence Engine disabled: No API key configured');
            }

            // Migrate any articles still in localStorage → IDB (one-time)
            await this.db.migrateFromLocalStorage();

            // Load rolling article corpus from IDB (up to 7 days)
            const idbArticles = await this.db.loadArticles();
            if (idbArticles.length > 0) {
                const existingIds = new Set(this.articles.map(a => a.id));
                for (const a of idbArticles) {
                    if (!existingIds.has(a.id)) this.articles.push(a);
                }
                console.log(`SignalDB: loaded ${idbArticles.length} articles from IDB corpus`);
            }

            // Apply persisted read state from IDB to all articles
            const readIds = await this.db.loadReadIds();
            if (readIds.size > 0) {
                for (const a of this.articles) {
                    if (readIds.has(a.id)) a.isRead = true;
                }
            }

            // Load latest digest from IDB if not already in localStorage
            if (!this.digest) {
                this.digest = await this.db.loadLatestDigest();
                if (this.digest) console.log('SignalDB: restored digest from IDB');
            }

            this.updateUI();
            this.bindEvents();
            this.updateDate();
            this.initKeyboardShortcuts();
            this.initAutoRefresh();
            
            // Show cached content if available
            const hasSignalsCache = !!localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
            if (this.digest || this.articles.length > 0 || hasSignalsCache) {
                // Don't re-score cached articles on init - they're already scored
                // Only categorize and render for instant display
                this.categorizeArticles();
                this.renderDigest();
                // Restore section open/close states from localStorage
                // Default: action-required open, all others as last left
                try {
                    const savedStates = JSON.parse(localStorage.getItem(STORAGE_KEYS.SECTION_STATE) || '{}');
                    if (!savedStates.hasOwnProperty('action-required')) {
                        savedStates['action-required'] = true; // open by default
                    }
                    Object.entries(savedStates).forEach(([id, isOpen]) => {
                        const content = document.getElementById(`${id}-content`);
                        const chevron = document.querySelector(`#${id}-section .chevron`);
                        if (content) content.classList.toggle('collapsed', !isOpen);
                        if (chevron) chevron.classList.toggle('collapsed', !isOpen);
                    });
                } catch(e) {}
                // Update intelligence stats if available
                if (typeof updateIntelligenceStats === 'function') {
                    updateIntelligenceStats();
                }
            }
            
            console.log(`📡 The Signal Today initialized with ${this.sources.length} sources`);
        } catch (err) {
            console.error('Init error:', err);
            // Ensure buttons still work even if init fails
            this.bindEvents();
        }
    }

    // ==========================================
    // Storage
    // ==========================================

    loadFromStorage() {
        // Load sources
        const savedSources = localStorage.getItem(STORAGE_KEYS.SOURCES);
        this.sources = savedSources ? JSON.parse(savedSources) : [...DEFAULT_SOURCES];
        
        // Load industries
        const savedIndustries = localStorage.getItem(STORAGE_KEYS.INDUSTRIES);
        this.industries = savedIndustries ? JSON.parse(savedIndustries) : [...DEFAULT_INDUSTRIES];
        
        // Load clients — migrate legacy flat string array to structured objects with markets
        const savedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
        if (savedClients) {
            const parsed = JSON.parse(savedClients);
            // Migration: if stored as flat strings, convert to objects
            if (parsed.length > 0 && typeof parsed[0] === 'string') {
                this.clients = parsed.map(name => ({ name, tier: 2, country: '', market: 'ASEAN' }));
            } else {
                // Ensure all clients have market field (migration from pre-market version)
                this.clients = parsed.map(c => {
                    if (!c.market && c.country) {
                        c.market = typeof getMarketFromCountry === 'function' 
                            ? getMarketFromCountry(c.country) 
                            : 'ASEAN';
                    }
                    return c;
                });
            }
        } else {
            this.clients = [...DEFAULT_CLIENTS];
        }
        
        // NOTE: articles and digest are no longer stored in localStorage.
        // They are loaded from IndexedDB in init() after this.db.open().
        // Legacy signal_articles key is migrated to IDB on first run by
        // migrateFromLocalStorage() and then removed.
        
        // Load settings
        const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        
        // Load article ratings and source score drift (feedback loop)
        const savedRatings = localStorage.getItem(STORAGE_KEYS.ARTICLE_RATINGS);
        this.articleRatings = savedRatings ? JSON.parse(savedRatings) : {};
        
        const savedDrift = localStorage.getItem(STORAGE_KEYS.SOURCE_SCORE_DRIFT);
        this.sourceScoreDrift = savedDrift ? JSON.parse(savedDrift) : {};
    }

    saveToStorage() {
        // localStorage: settings, sources, clients, industries, ratings, drift
        // (articles and digest now live in IndexedDB — no longer written to localStorage)
        localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(this.sources));
        localStorage.setItem(STORAGE_KEYS.INDUSTRIES, JSON.stringify(this.industries));
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(this.clients));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
        localStorage.setItem(STORAGE_KEYS.ARTICLE_RATINGS, JSON.stringify(this.articleRatings));
        localStorage.setItem(STORAGE_KEYS.SOURCE_SCORE_DRIFT, JSON.stringify(this.sourceScoreDrift));

        // IndexedDB: rolling article corpus + digest history (fire-and-forget)
        this.db.saveArticles(this.articles);
        if (this.digest) this.db.saveDigest(this.digest);
    }

    // ==========================================
    // Article Categorization
    // ==========================================

    categorizeArticles() {
        const now = new Date();
        const dailyCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours
        // Use the configurable weeklyCurrencyDays setting (default 7 days)
        const weeklyDays = this.settings.weeklyCurrencyDays || 7;
        const weeklyCutoff = new Date(now.getTime() - weeklyDays * 24 * 60 * 60 * 1000);
        
        // Daily articles: from daily or both sources, within 48 hours
        // Apply source diversity: max 3 per source for daily
        const dailyFiltered = this.articles
            .filter(a => {
                const pubDate = new Date(a.publishedDate);
                const isDaily = a.digestType === 'daily' || a.digestType === 'both';
                return pubDate >= dailyCutoff && isDaily;
            })
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        // Apply max 3 per source for daily diversity
        const dailySourceCount = {};
        this.dailyArticles = [];
        
        for (const article of dailyFiltered) {
            const count = dailySourceCount[article.sourceName] || 0;
            if (count < 3) {
                this.dailyArticles.push(article);
                dailySourceCount[article.sourceName] = count + 1;
            }
        }
        
        // Weekly articles: from weekly or both sources, within 3 months, max 2 per source
        const weeklyFiltered = this.articles
            .filter(a => {
                const pubDate = new Date(a.publishedDate);
                const isWeekly = a.digestType === 'weekly' || a.digestType === 'both';
                return pubDate >= weeklyCutoff && isWeekly;
            })
            .sort((a, b) => {
                // Sort by priority first, then by relevance
                if (a.priority !== b.priority) return a.priority - b.priority;
                return b.relevanceScore - a.relevanceScore;
            });
        
        // Apply max 2 per source for weekly
        const weeklySourceCount = {};
        this.weeklyArticles = [];
        
        for (const article of weeklyFiltered) {
            const count = weeklySourceCount[article.sourceName] || 0;
            if (count < 2) {
                this.weeklyArticles.push(article);
                weeklySourceCount[article.sourceName] = count + 1;
            }
            if (this.weeklyArticles.length >= this.settings.weeklyArticles) break;
        }
    }

    // ==========================================
    // Event Binding
    // ==========================================

    bindEvents() {
        const refreshBtn = document.getElementById('refresh-btn');
        const settingsBtn = document.getElementById('settings-btn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
    }

    // ==========================================
    // Keyboard Shortcuts
    // ==========================================

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if focus is in an input, textarea, or select
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            
            // Skip if any modal is open
            const settingsModal = document.getElementById('settings-modal');
            const articleModal = document.getElementById('article-modal');
            const clientManagerModal = document.getElementById('client-manager-modal');
            const anyModalOpen = (settingsModal && !settingsModal.classList.contains('hidden')) ||
                                 (articleModal && !articleModal.classList.contains('hidden')) ||
                                 (clientManagerModal && !clientManagerModal.classList.contains('hidden'));
            
            switch (e.key) {
                case 'r':
                case 'R':
                    if (!anyModalOpen) { e.preventDefault(); this.refresh(); }
                    break;
                case 'c':
                case 'C':
                    if (!anyModalOpen) { e.preventDefault(); openClientManager(); }
                    break;
                case 's':
                case 'S':
                    if (!anyModalOpen) { e.preventDefault(); this.openSettings(); }
                    break;
                case 'w':
                case 'W':
                    if (!anyModalOpen) { e.preventDefault(); openWeekContextEditor(); }
                    break;
                case 'a':
                case 'A':
                    if (!anyModalOpen) {
                        e.preventDefault();
                        const arSection = document.getElementById('action-required-section');
                        const arContent = document.getElementById('action-required-content');
                        if (arSection && !arSection.classList.contains('hidden')) {
                            if (arContent?.classList.contains('collapsed')) toggleSection('action-required');
                            arSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (document.getElementById('week-context-modal') && !document.getElementById('week-context-modal').classList.contains('hidden')) {
                        closeWeekContextEditor();
                    } else if (articleModal && !articleModal.classList.contains('hidden')) {
                        closeArticle();
                    } else if (settingsModal && !settingsModal.classList.contains('hidden')) {
                        closeSettings();
                    } else if (clientManagerModal && !clientManagerModal.classList.contains('hidden')) {
                        closeClientManager();
                    }
                    break;
            }
        });
    }

    navigateArticles(direction) {
        const articles = this.currentTab === 'daily' ? this.dailyArticles : this.weeklyArticles;
        if (articles.length === 0) return;
        
        this.focusedArticleIndex = Math.max(0, Math.min(articles.length - 1, this.focusedArticleIndex + direction));
        
        document.querySelectorAll('.article-item').forEach((el, i) => {
            el.classList.toggle('keyboard-focused', i === this.focusedArticleIndex);
        });
        
        const focusedEl = document.querySelectorAll('.article-item')[this.focusedArticleIndex];
        focusedEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showKeyboardHelp() {
        const shortcuts = [
            ['R', 'Refresh digest'],
            ['W', 'Set this week\'s context'],
            ['A', 'Jump to Action Required'],
            ['C', 'Open Client Manager'],
            ['S', 'Open Settings'],
            ['J / K', 'Navigate articles down / up'],
            ['O', 'Open focused article'],
            ['Esc', 'Close modal'],
            ['?', 'Show this help']
        ];
        const text = shortcuts.map(([key, desc]) => `${key.padEnd(8)} ${desc}`).join('\n');
        alert(`⌨️ Keyboard Shortcuts\n\n${text}`);
    }

    // ==========================================
    // Auto-Refresh
    // ==========================================

    initAutoRefresh() {
        if (!this.settings.autoRefreshTime) return;
        
        const scheduleNext = () => {
            const now = new Date();
            const [hours, minutes] = this.settings.autoRefreshTime.split(':').map(Number);
            
            const next = new Date(now);
            next.setHours(hours, minutes, 0, 0);
            
            // If the time has already passed today, schedule for tomorrow
            if (next <= now) next.setDate(next.getDate() + 1);
            
            const msUntilRefresh = next.getTime() - now.getTime();
            console.log(`⏰ Auto-refresh scheduled in ${Math.round(msUntilRefresh / 60000)} minutes`);
            
            this.autoRefreshTimer = setTimeout(async () => {
                console.log('⏰ Auto-refresh triggered');
                await this.refresh();
                
                if (Notification.permission === 'granted') {
                    new Notification('📡 Signal Today Updated', {
                        body: `Your daily digest is ready — ${this.dailyArticles.length} articles`,
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📡</text></svg>'
                    });
                }
                
                scheduleNext();
            }, msUntilRefresh);
        };
        
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        scheduleNext();

        // Auto-refresh when tab becomes visible after 2+ hours of inactivity
        document.addEventListener('visibilitychange', () => {
            if (document.hidden || this.isLoading) return;
            const last = localStorage.getItem(STORAGE_KEYS.LAST_REFRESH);
            const age = last ? Date.now() - new Date(last).getTime() : Infinity;
            if (age > 2 * 3600 * 1000) {
                console.log('👁 Tab refocused after >2h — refreshing stale content');
                this.refresh();
            }
        });
    }

    // ==========================================
    // UI Updates
    // ==========================================

    updateUI() {
        this.updateDate();
        this.updateReadingTime();
        this.updateLastRefreshed();
        this.updateSourceHealthBadge();
        updateWeekContextWidget();
    }

    updateSourceHealthBadge() {
        const badge = document.getElementById('source-health-badge');
        if (!badge) return;
        const count = this.failedSources.length;
        if (count === 0) {
            badge.classList.add('hidden');
            badge.removeAttribute('title');
            badge.onclick = null;
            return;
        }
        badge.classList.remove('hidden');
        badge.textContent = `⚠️ ${count} source${count > 1 ? 's' : ''} failed`;
        badge.title = 'Click to see failed sources';
        badge.style.cursor = 'pointer';
        const failed = this.failedSources.slice(); // snapshot
        badge.onclick = () => {
            const names = failed.map(s => `• ${s.name}`).join('\n');
            showToast(`⚠️ Failed sources:\n${names}`);
        };
    }

    updateDate() {
        const el = document.getElementById('current-date');
        if (!el) return;
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        el.textContent = new Date().toLocaleDateString('en-US', options);
    }

    updateReadingTime() {
        const badge = document.getElementById('reading-time');
        if (!badge) return; // Element removed in v2 layout
        
        const totalMinutes = this.dailyArticles
            .filter(a => !a.isRead)
            .reduce((sum, a) => sum + (a.estimatedReadingMinutes || 2), 0);
        
        badge.textContent = `~${totalMinutes} min unread`;
        badge.classList.toggle('over-budget', totalMinutes > this.settings.dailyMinutes);
    }

    updateLastRefreshed() {
        const lastRefresh = localStorage.getItem(STORAGE_KEYS.LAST_REFRESH);
        const el = document.getElementById('last-updated');
        if (!el) return;
        
        if (lastRefresh) {
            const date = new Date(lastRefresh);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            
            let text;
            if (diffMins < 1) text = 'Updated just now';
            else if (diffMins < 60) text = `Updated ${diffMins}m ago`;
            else if (diffHours < 24) text = `Updated ${diffHours}h ago`;
            else text = `Updated ${date.toLocaleDateString()}`;
            
            el.textContent = text;
        } else {
            el.textContent = '';
        }
    }

    showLoading(message = 'Loading...') {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('loading-status').textContent = message;
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('refresh-btn').disabled = true;
        // Only hide digest-content on the very first load (when it's already hidden).
        // During a refresh where content is already visible, keep it showing so the
        // user sees the previous digest rather than a blank screen while fetching.
        const digestContent = document.getElementById('digest-content');
        if (digestContent.classList.contains('hidden')) {
            digestContent.classList.add('hidden');
        }
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('refresh-btn').disabled = false;
    }

    showError(message) {
        // Check if this is a billing/quota error
        const isBillingError = message.includes('BILLING_ERROR:');
        
        if (isBillingError) {
            // Extract the actual error message (remove BILLING_ERROR: prefix)
            const actualError = message.replace('BILLING_ERROR:', '').trim();
            
            // Display user-friendly billing error message
            const billingMessage = `⚠️ AI Provider Credit Exhausted\n\n` +
                `Your AI provider account has run out of credits or reached its quota limit.\n\n` +
                `Please:\n` +
                `• Check your provider's billing dashboard\n` +
                `• Add credits to your account\n` +
                `• Verify your API key is active\n\n` +
                `Technical details: ${actualError}`;
            
            document.getElementById('error').classList.remove('hidden');
            document.getElementById('error-message').textContent = billingMessage;
        } else {
            // Display regular error message
            document.getElementById('error').classList.remove('hidden');
            document.getElementById('error-message').textContent = message;
        }
        
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('empty-state').classList.add('hidden');
    }

    // ==========================================
    // Refresh Flow
    // ==========================================

    async refresh(quickMode = false) {
        if (this.isLoading) return;
        this.isLoading = true;
        this.failedSources = []; // Reset failure list for this refresh run

        const startTime = performance.now();

        try {
            this.showLoading('Fetching articles from RSS feeds...');
            
            // Fetch articles from RSS feeds
            const enabledSources = this.sources.filter(s => s.enabled);
            console.log(`📡 Fetching from ${enabledSources.length} sources`);
            
            const fetchedArticles = await this.fetchArticles(enabledSources);
            console.log(`📰 Fetched ${fetchedArticles.length} articles in ${Math.round(performance.now() - startTime)}ms`);
            
            // Deduplicate before scoring — removes same story from multiple sources
            const dedupedArticles = this.deduplicateArticles(fetchedArticles);
            console.log(`🔁 ${fetchedArticles.length - dedupedArticles.length} duplicates removed → ${dedupedArticles.length} unique articles`);
            
            this.showLoading(`Scoring ${dedupedArticles.length} articles...`);
            
            // Score articles
            const scoredArticles = await this.scoreArticles(dedupedArticles);
            this.articles = scoredArticles
                .filter(a => a.relevanceScore >= 0.1)
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, 200); // Keep top 200
            
            console.log(`🎯 ${this.articles.length} relevant articles`);
            
            // Categorize into daily/weekly
            this.categorizeArticles();

            // ── PROGRESSIVE RENDER STEP 1 ────────────────────────────────────
            // Render immediately from scored articles so the user sees content
            // right away (~20-30s) instead of waiting for all AI calls to finish.
            // Sections that need AI will show a skeleton/updating state and update
            // themselves in place when their AI call resolves.
            localStorage.setItem(STORAGE_KEYS.LAST_REFRESH, new Date().toISOString());
            this.saveToStorage();
            if (!this.digest) this.digest = this.createBasicDigest();
            this.renderDigest(true);
            this.updateUI();
            this.hideLoading();
            this.isLoading = false;
            console.log(`⚡ First render in ${Math.round(performance.now() - startTime)}ms`);
            // ─────────────────────────────────────────────────────────────────

            // ── PROGRESSIVE RENDER STEP 2 ────────────────────────────────────
            // Fire AI enrichment as a detached promise so any failure CANNOT
            // bubble into the outer try/catch and call showError() — which would
            // hide the digest content that Step 1 already rendered above.
            const settings = getAIProviderSettings();
            const apiKey = settings.apiKeys[settings.provider];
            if (apiKey && !quickMode) {
                (async () => {
                    try {
                        // Compute article fingerprint to detect new articles since last digest
                        const fingerprint = this.computeArticleFingerprint(this.dailyArticles);
                        const cachedFingerprint = this.digest?.articleFingerprint;
                        const cachedContext = this.digest?.thisWeekContext;
                        const contextChanged = this.settings.thisWeekContext !== (cachedContext || '');

                        if (cachedFingerprint && fingerprint === cachedFingerprint && !contextChanged) {
                            // No new articles and context unchanged — reuse cached digest
                            console.log('💾 Digest cache hit — no new articles, skipping API call');
                        } else {
                            // Identify new articles not seen in the last digest
                            const cachedIds = new Set(this.digest?.seenArticleIds || []);
                            const newArticles = this.dailyArticles.filter(a => !cachedIds.has(a.id));
                            const newCount = newArticles.length;

                            if (cachedFingerprint && newCount > 0 && newCount < 8 && !contextChanged) {
                                console.log(`🔄 Delta refresh: ${newCount} new articles → merging into existing digest`);
                                await this.mergeDeltaDigest(apiKey, newArticles);
                            } else {
                                console.log(`🤖 Full digest generation (${newCount} new articles, contextChanged=${contextChanged})`);
                                await this.generateAIDigest(apiKey);
                            }

                            // Re-render AI-enriched sections in place
                            this.saveToStorage();
                            renderExecutiveSummary(true);
                            renderMarketInsights(true);
                            renderDeepReads(true);
                            renderClientRisk(); // Fix A: re-render after tier-3 threat scores are populated
                        }

                        const totalTime = Math.round(performance.now() - startTime);
                        console.log(`✅ AI enrichment complete in ${totalTime}ms`);
                    } catch (aiError) {
                        // Log but do NOT call showError() — the digest is already visible
                        console.warn('⚠️ Background AI enrichment failed (digest still shown):', aiError.message);
                    }
                })();
            }

        } catch (error) {
            console.error('Refresh error:', error);
            this.showError(`Failed to refresh: ${error.message}`);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    // ==========================================
    // RSS Fetching
    // ==========================================

    async fetchArticles(sources) {
        const fetchTimeout = 7000; // 7s timeout — auto-disable after 3 failures protects against slow sources

        // Fetch ALL sources in parallel — each has its own AbortController timeout inside
        // fetchFeedWithTimeout, so worst-case wall-clock time is 7s regardless of source count.
        // Previously used serial 15-source batches which meant up to 6 × 10s = 60s worst case.

        // Read source failures once here — avoids one localStorage read + JSON.parse per source
        const sourceFailures = this.getSourceFailures();

        // Track which sources actually attempted a fetch this run (not auto-disabled/cached)
        // so we can detect a global proxy outage and avoid penalising individual sources.
        this.lastFetchAttempted = [];
        this.lastFetchFailed = [];

        this.showLoading(`Fetching ${sources.length} feeds...`);
        const results = await Promise.allSettled(
            sources.map(source => this.fetchFeedWithTimeout(source, fetchTimeout, sourceFailures))
        );

        const articles = [];
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                articles.push(...result.value);
            }
        }

        // ── Global proxy outage detection ────────────────────────────────────────
        // If ≥80% of attempted sources (those not auto-disabled/cached) returned 0 articles,
        // this is almost certainly a proxy outage rather than individual source failures.
        // Roll back the failure increments recorded during this run so sources are not
        // progressively auto-disabled by a temporary proxy problem.
        const attempted = this.lastFetchAttempted.length;
        const failed = this.lastFetchFailed.length;
        if (attempted > 0 && failed / attempted >= 0.8) {
            console.warn(`⚠️ Global proxy outage detected (${failed}/${attempted} sources failed) — rolling back failure counts`);
            for (const { url } of this.lastFetchFailed) {
                this.rollbackSourceFailure(url);
            }
        }

        return articles;
    }

    async fetchFeedWithTimeout(source, timeout, failures = null) {
        // Check if source is auto-disabled (failures pre-read by fetchArticles; fallback for direct calls)
        if (failures === null) failures = this.getSourceFailures();
        if (failures[source.url]?.disabled) {
            console.log(`⏭️ Skipping auto-disabled source: ${source.name}`);
            return [];
        }
        
        // Check cache first
        const cacheKey = source.url;
        const cached = feedCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            return cached.articles;
        }
        
        // Hedged request pattern — stagger proxy launches instead of firing all 5 at once.
        // Proxy 1 starts immediately. If it hasn't responded after HEDGE_DELAY ms, proxy 2
        // launches alongside it, and so on. The moment any proxy succeeds, all others are
        // aborted immediately via a shared AbortController — no wasted connections.
        //
        // Fast proxies (respond < 1s):   only 1 request ever fires.
        // Slow/dead proxy 1:             proxy 2 launches after HEDGE_DELAY, no latency penalty.
        const HEDGE_DELAY = 1500; // ms before launching the next proxy if the previous hasn't won

        // One shared controller — aborting it cancels every in-flight request at once
        const sharedController = new AbortController();
        const overallTimeout = setTimeout(() => sharedController.abort(), timeout);

        const fetchPromises = CORS_PROXIES.map(({ url: proxyUrl, format }, i) => {
            return new Promise((resolve, reject) => {
                // Stagger each proxy launch by i × HEDGE_DELAY
                const hedgeTimer = setTimeout(async () => {
                    // Bail immediately if a winner already aborted the controller
                    if (sharedController.signal.aborted) { reject(new Error('aborted')); return; }
                    try {
                        const fullUrl = format === 'path-raw'
                            ? proxyUrl + source.url
                            : proxyUrl + encodeURIComponent(source.url);
                        const response = await fetch(fullUrl, {
                            headers: { 'Accept': 'application/rss+xml, application/xml, text/xml, application/json' },
                            signal: sharedController.signal
                        });
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        if (format === 'feed2json') {
                            const json = await response.json();
                            resolve(this.parseFeed2Json(json, source));
                        } else {
                            const text = await response.text();
                            resolve(this.parseFeed(text, source));
                        }
                    } catch (error) {
                        reject(error);
                    }
                }, i * HEDGE_DELAY);

                // If the shared controller is aborted before this proxy's hedge timer fires,
                // clean up the timer and reject so Promise.any sees a rejection, not a hang.
                sharedController.signal.addEventListener('abort', () => {
                    clearTimeout(hedgeTimer);
                    reject(new Error('aborted'));
                }, { once: true });
            });
        });

        // Register this source as attempted (for global outage detection in fetchArticles)
        if (this.lastFetchAttempted) this.lastFetchAttempted.push({ url: source.url });

        try {
            // Promise.any resolves with the first successful result
            const articles = await Promise.any(fetchPromises);
            clearTimeout(overallTimeout);
            sharedController.abort(); // cancel any still-running proxy requests immediately

            // ✅ Success - reset failure count
            this.resetSourceFailure(source.url);

            // Cache successful result
            feedCache.set(cacheKey, { articles, timestamp: Date.now() });

            return articles;
        } catch (error) {
            clearTimeout(overallTimeout);
            // All proxies failed — record for source health badge
            console.warn(`❌ All proxies failed for ${source.name}`);

            // Track as failed for global outage detection
            if (this.lastFetchFailed) this.lastFetchFailed.push({ url: source.url, name: source.name });
            
            // Increment failure count
            const newCount = this.incrementSourceFailure(source.url, source.name);
            
            // Auto-disable after 3 consecutive failures
            if (newCount >= 3) {
                this.disableSource(source.url, source.name);
                console.warn(`🚫 Auto-disabled ${source.name} after ${newCount} consecutive failures`);
            }
            
            this.failedSources.push({ name: source.name, url: source.url });
            return [];
        }
    }

    // ==========================================
    // Source Failure Tracking (Phase 8)
    // ==========================================

    getSourceFailures() {
        const stored = localStorage.getItem('source-failures');
        return stored ? JSON.parse(stored) : {};
    }

    incrementSourceFailure(url, name) {
        const failures = this.getSourceFailures();
        if (!failures[url]) {
            failures[url] = { count: 0, name };
        }
        failures[url].count++;
        failures[url].lastFailed = new Date().toISOString();
        localStorage.setItem('source-failures', JSON.stringify(failures));
        return failures[url].count;
    }

    resetSourceFailure(url) {
        const failures = this.getSourceFailures();
        if (failures[url]) {
            delete failures[url];
            localStorage.setItem('source-failures', JSON.stringify(failures));
        }
    }

    // Undo one failure increment — used when a global proxy outage is detected so that
    // a temporary proxy problem doesn't accumulate as source-level failures.
    rollbackSourceFailure(url) {
        const failures = this.getSourceFailures();
        if (!failures[url]) return;
        // Don't touch already-disabled sources — they were disabled by prior runs, not this one
        if (failures[url].disabled) return;
        failures[url].count = Math.max(0, (failures[url].count || 1) - 1);
        if (failures[url].count === 0) {
            delete failures[url];
        }
        localStorage.setItem('source-failures', JSON.stringify(failures));
    }

    disableSource(url, name) {
        const failures = this.getSourceFailures();
        if (!failures[url]) {
            failures[url] = { count: 3, name };
        }
        failures[url].disabled = true;
        failures[url].lastFailed = new Date().toISOString();
        localStorage.setItem('source-failures', JSON.stringify(failures));
        
        // Also mark in sources array
        const source = this.sources.find(s => s.url === url);
        if (source) {
            source.enabled = false;
            this.saveToStorage();
        }
    }

    enableSource(url) {
        const failures = this.getSourceFailures();
        if (failures[url]) {
            delete failures[url];
            localStorage.setItem('source-failures', JSON.stringify(failures));
        }
        
        // Mark as enabled in sources array
        const source = this.sources.find(s => s.url === url);
        if (source) {
            source.enabled = true;
            this.saveToStorage();
        }
        
        // Re-render settings if modal is open
        if (!document.getElementById('settings-modal').classList.contains('hidden')) {
            this.renderDisabledSources();
            renderSourcesList();
            updateSourcesCount();
        }
    }

    enableAllSources() {
        const failures = this.getSourceFailures();
        const disabledUrls = Object.keys(failures).filter(url => failures[url].disabled);
        
        disabledUrls.forEach(url => {
            const source = this.sources.find(s => s.url === url);
            if (source) {
                source.enabled = true;
            }
        });
        
        // Clear all failure data
        localStorage.removeItem('source-failures');
        this.saveToStorage();
        
        // Re-render settings if modal is open
        if (!document.getElementById('settings-modal').classList.contains('hidden')) {
            this.renderDisabledSources();
            renderSourcesList();
            updateSourcesCount();
        }
    }

    removeDisabledSource(url) {
        // Remove from failures tracking
        const failures = this.getSourceFailures();
        if (failures[url]) {
            delete failures[url];
            localStorage.setItem('source-failures', JSON.stringify(failures));
        }
        
        // Remove from sources array
        this.sources = this.sources.filter(s => s.url !== url);
        this.saveToStorage();
        
        // Re-render settings if modal is open
        if (!document.getElementById('settings-modal').classList.contains('hidden')) {
            this.renderDisabledSources();
            renderSourcesList();
            updateSourcesCount();
        }
    }

    formatTimeSince(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    renderDisabledSources() {
        const container = document.getElementById('disabled-sources-container');
        if (!container) return;
        
        const failures = this.getSourceFailures();
        const disabled = Object.entries(failures).filter(([url, data]) => data.disabled);
        
        if (disabled.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = `
            <div class="disabled-sources-section">
                <h3>⚠️ Auto-Disabled Sources (${disabled.length})</h3>
                <p class="help-text">
                    These sources failed 3+ consecutive times and were automatically disabled 
                    to improve refresh performance. You can re-enable them below.
                </p>
                
                ${disabled.map(([url, data]) => {
                    const timeSince = this.formatTimeSince(data.lastFailed);
                    const escapedUrl = this.escapeAttr(url);
                    return `
                        <div class="disabled-source-card">
                            <div class="source-info">
                                <strong>${this.escapeHtml(data.name)}</strong>
                                <span class="failure-info">
                                    Failed ${data.count} times, last: ${timeSince}
                                </span>
                            </div>
                            <div class="source-actions">
                                <button onclick="enableSource('${escapedUrl}')" 
                                        class="btn-secondary btn-sm">
                                    Re-enable
                                </button>
                                <button onclick="removeDisabledSource('${escapedUrl}')" 
                                        class="btn-danger btn-sm">
                                    Remove
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
                
                <button onclick="enableAllSources()" class="btn-primary" style="margin-top: 1rem;">
                    Re-enable All (${disabled.length})
                </button>
            </div>
        `;
    }


    /**
     * Remove duplicate articles from a flat array.
     * Two articles are considered duplicates if:
     *   (a) their normalised URLs are identical, OR
     *   (b) their title bigram Jaccard similarity is >= 0.6
     * When a duplicate pair is found, keep the article from the higher-priority
     * source (lower priority number = higher priority; tie-break on credibilityScore).
     */
    deduplicateArticles(articles) {
        const normaliseUrl = (url) => {
            try {
                const u = new URL(url);
                // Remove tracking params
                ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
                 'ref','source','via','mc_cid','mc_eid','fbclid','gclid'].forEach(p => u.searchParams.delete(p));
                // Normalise: strip www., lowercase host, remove trailing slash
                u.hostname = u.hostname.replace(/^www\./, '');
                u.protocol = 'https:';
                let norm = u.toString().replace(/\/$/, '');
                return norm.toLowerCase();
            } catch {
                return url.toLowerCase().replace(/\/$/, '');
            }
        };

        const titleBigrams = (title) => {
            const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
            const bigrams = new Set();
            for (let i = 0; i < words.length - 1; i++) {
                bigrams.add(words[i] + '_' + words[i + 1]);
            }
            // Also add unigrams for short titles (< 4 words)
            if (words.length < 4) words.forEach(w => bigrams.add(w));
            return bigrams;
        };

        const jaccardSimilarity = (setA, setB) => {
            if (setA.size === 0 && setB.size === 0) return 1;
            if (setA.size === 0 || setB.size === 0) return 0;
            let intersection = 0;
            setA.forEach(item => { if (setB.has(item)) intersection++; });
            return intersection / (setA.size + setB.size - intersection);
        };

        const betterArticle = (a, b) => {
            // Lower priority number = higher priority source
            if (a.priority !== b.priority) return a.priority < b.priority ? a : b;
            return (a.credibilityScore || 0) >= (b.credibilityScore || 0) ? a : b;
        };

        // Pass 1: URL deduplication (O(n), fast)
        const urlMap = new Map(); // normalisedUrl → article
        for (const article of articles) {
            const normUrl = normaliseUrl(article.url);
            if (urlMap.has(normUrl)) {
                urlMap.set(normUrl, betterArticle(urlMap.get(normUrl), article));
            } else {
                urlMap.set(normUrl, article);
            }
        }
        const urlDeduped = Array.from(urlMap.values());

        // Pass 2: Title similarity deduplication (O(n²) but n is small after pass 1)
        // Pre-compute bigrams for all articles
        const bigramCache = urlDeduped.map(a => ({
            article: a,
            bigrams: titleBigrams(a.title || '')
        }));

        const kept = [];
        const dropped = new Set();

        for (let i = 0; i < bigramCache.length; i++) {
            if (dropped.has(i)) continue;
            let winner = bigramCache[i].article;
            for (let j = i + 1; j < bigramCache.length; j++) {
                if (dropped.has(j)) continue;
                const sim = jaccardSimilarity(bigramCache[i].bigrams, bigramCache[j].bigrams);
                if (sim >= 0.6) {
                    winner = betterArticle(winner, bigramCache[j].article);
                    dropped.add(j);
                }
            }
            kept.push(winner);
        }

        return kept;
    }

    // Parse a JSON Feed response from feed2json.org into the same article shape as parseFeed.
    // JSON Feed spec: https://www.jsonfeed.org/version/1.1/
    // feed2json.org returns: { items: [{ guid, url, title, summary, content_html, date_published, author }] }
    parseFeed2Json(json, source) {
        if (!json || !Array.isArray(json.items)) return [];
        const articles = [];
        const seenUrls = new Set();

        for (const item of json.items.slice(0, 20)) {
            try {
                const url = item.url || item.id;
                const title = item.title;
                if (!title || !url || seenUrls.has(url)) continue;
                seenUrls.add(url);

                const rawSummary = item.summary || item.content_html || '';
                const cleanSummary = rawSummary.replace(/<[^>]*>/g, '').substring(0, 500);

                articles.push({
                    id: this.generateId(url),
                    title: this.decodeHtmlEntities(title),
                    url,
                    summary: this.decodeHtmlEntities(cleanSummary),
                    sourceName: source.name,
                    category: source.category,
                    publishedDate: item.date_published
                        ? new Date(item.date_published).toISOString()
                        : new Date().toISOString(),
                    priority: source.priority,
                    credibilityScore: source.credibilityScore,
                    digestType: source.digestType
                });
            } catch (e) {
                // skip malformed item
            }
        }
        return articles;
    }

    parseFeed(xmlText, source) {
        // Use regex-based parsing for all RSS feeds
        // Browser DOMParser treats <link> as HTML void element, breaking RSS link extraction
        // This mimics how iOS's XMLParser works with raw XML text
        
        // Check if it's RSS (has <item> elements) vs Atom (has <entry> elements)
        const isRSS = /<item[\s>]/i.test(xmlText);
        const isAtom = /<entry[\s>]/i.test(xmlText);
        
        if (isRSS) {
            return this.parseFeedWithRegex(xmlText, source);
        }
        
        // For Atom feeds, DOM parsing works fine since they use href attributes
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const articles = [];
        
        // Atom format uses <entry> elements
        const items = doc.querySelectorAll('entry');
        
        if (items.length === 0) {
            // Fallback: if no entries found, try regex parsing
            return this.parseFeedWithRegex(xmlText, source);
        }
        
        // Process up to 20 items per source
        const maxItems = 20;
        let count = 0;
        
        // Track URLs to detect duplicates
        const seenUrls = new Set();
        
        for (const item of items) {
            if (count >= maxItems) break;
            
            try {
                let title = item.querySelector('title')?.textContent?.trim();
                
                // Extract the best URL for this specific article (Atom uses href attributes)
                const link = this.extractBestLink(item);
                
                // Skip if we've already seen this URL (duplicate detection)
                if (link && seenUrls.has(link)) {
                    console.warn(`[${source.name}] Duplicate URL skipped: ${link}`);
                    continue;
                }
                
                const description = item.querySelector('description')?.textContent?.trim() ||
                                   item.querySelector('summary')?.textContent?.trim() ||
                                   item.querySelector('content')?.textContent?.trim() || '';
                const pubDate = item.querySelector('pubDate')?.textContent ||
                               item.querySelector('published')?.textContent ||
                               item.querySelector('updated')?.textContent;
                
                if (title && link) {
                    seenUrls.add(link);
                    
                    // Decode HTML entities in title
                    title = this.decodeHtmlEntities(title);
                    
                    // Clean HTML from description and decode entities
                    let cleanDescription = description.replace(/<[^>]*>/g, '').substring(0, 500);
                    cleanDescription = this.decodeHtmlEntities(cleanDescription);
                    
                    articles.push({
                        id: this.generateId(link),
                        title: title,
                        url: link,
                        summary: cleanDescription,
                        sourceName: source.name,
                        category: source.category,
                        publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                        priority: source.priority,
                        credibilityScore: source.credibilityScore,
                        digestType: source.digestType
                    });
                    count++;
                }
            } catch (e) {
                // Skip malformed items
                console.warn('Error parsing feed item:', e);
            }
        }
        
        return articles;
    }
    
    decodeHtmlEntities(text) {
        if (!text) return '';
        
        // First pass: use textarea trick for standard entities
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        let decoded = textarea.value;
        
        // Second pass: handle any remaining numeric entities
        decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
            return String.fromCharCode(dec);
        });
        
        // Third pass: handle hex entities
        decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
        
        // Handle common named entities that might have been missed
        const namedEntities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&apos;': "'",
            '&nbsp;': ' ',
            '&ndash;': '\u2013',
            '&mdash;': '\u2014',
            '&lsquo;': '\u2018',
            '&rsquo;': '\u2019',
            '&ldquo;': '\u201C',
            '&rdquo;': '\u201D',
            '&hellip;': '\u2026'
        };
        
        for (const [entity, char] of Object.entries(namedEntities)) {
            decoded = decoded.split(entity).join(char);
        }
        
        return decoded;
    }
    
    // Decode XML/HTML entities specifically in URLs
    // Uses string splitting to avoid regex entity encoding issues
    decodeUrlEntities(url) {
        if (!url) return '';
        // Decode XML/HTML entities that commonly appear in feed URLs
        let result = url;
        result = result.split('&amp;').join('&');
        result = result.split('&lt;').join('<');
        result = result.split('&gt;').join('>');
        result = result.split('&quot;').join('"');
        result = result.split('&#39;').join(String.fromCharCode(39));
        result = result.split('&apos;').join(String.fromCharCode(39));
        return result;
    }
    
    // Regex-based RSS parser that bypasses browser DOM quirks
    // This mimics how iOS's XMLParser works with raw XML text
    parseFeedWithRegex(xmlText, source) {
        const articles = [];
        const seenUrls = new Set();
        const maxItems = 20;
        
        // Extract all <item> blocks using regex
        const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
        let itemMatch;
        let count = 0;
        
        while ((itemMatch = itemRegex.exec(xmlText)) !== null && count < maxItems) {
            const itemContent = itemMatch[1];
            
            // Extract title
            const titleMatch = itemContent.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            let title = titleMatch ? titleMatch[1].trim() : '';
            title = this.decodeHtmlEntities(title);
            
            // Extract link - FIXED: allow whitespace around URL
            // Many RSS feeds have newlines/spaces around the URL
            let link = '';
            
            // Try 1: Standard <link>URL</link> with possible whitespace and HTML entities
            // InfoQ and many feeds encode & as & in URLs inside XML
            const linkMatch = itemContent.match(/<link[^>]*>\s*(?:<!\[CDATA\[)?\s*(https?:\/\/[^\s<>\[\]]+)\s*(?:\]\]>)?\s*<\/link>/i);
            if (linkMatch) {
                link = linkMatch[1].trim();
                // Decode XML/HTML entities in URL (e.g. InfoQ encodes & as & in feed URLs)
                link = this.decodeUrlEntities(link);
            }
            
            // Try 2: If no link found, extract raw content and clean it
            if (!link) {
                const rawLinkMatch = itemContent.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
                if (rawLinkMatch) {
                    const rawContent = rawLinkMatch[1].trim();
                    // Extract URL from content (handles CDATA, whitespace, etc.)
                    const urlExtract = rawContent.match(/https?:\/\/[^\s<>\[\]]+/);
                    if (urlExtract) {
                        link = urlExtract[0].trim();
                        // Decode XML/HTML entities in URL
                        link = this.decodeUrlEntities(link);
                    }
                }
            }
            
            // Try 3: guid as fallback
            if (!link) {
                const guidMatch = itemContent.match(/<guid[^>]*>\s*(?:<!\[CDATA\[)?\s*(https?:\/\/[^\s<>\[\]]+)\s*(?:\]\]>)?\s*<\/guid>/i);
                if (guidMatch) {
                    link = guidMatch[1].trim();
                    // Decode XML/HTML entities in URL
                    link = this.decodeUrlEntities(link);
                }
            }
            
            // Extract pubDate
            const dateMatch = itemContent.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
            let pubDate = dateMatch ? dateMatch[1].trim() : '';
            
            // Extract description - handle CDATA correctly: capture content inside CDATA or plain text
            // The (?:\]\]>)? was optional before, which caused "]]>" to appear in output when CDATA was present.
            // Now we use two separate patterns: one for CDATA content, one for plain text.
            const descCdataMatch = itemContent.match(/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i);
            const descPlainMatch = itemContent.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
            const descMatch = descCdataMatch || descPlainMatch;
            let description = descMatch ? descMatch[1].trim() : '';
            // Decode HTML entities FIRST (handles feeds like InfoQ that HTML-encode their HTML content,
            // e.g. <img src="..."><p>text</p> becomes <img src="..."><p>text</p>)
            description = this.decodeHtmlEntities(description);
            // Then strip all HTML tags (both original tags and those revealed by entity decoding)
            description = description.replace(/<[^>]*>/g, '').trim().substring(0, 500);
            
            // Skip duplicates
            if (link && seenUrls.has(link)) {
                continue;
            }
            
            if (title && link) {
                seenUrls.add(link);
                articles.push({
                    id: this.generateId(link),
                    title: title,
                    url: link,
                    summary: description,
                    sourceName: source.name,
                    category: source.category,
                    publishedDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                    priority: source.priority,
                    credibilityScore: source.credibilityScore,
                    digestType: source.digestType
                });
                count++;
            }
        }
        
        console.log(`[${source.name}] Parsed ${articles.length} articles`);
        return articles;
    }
    
    extractBestLink(item) {
        // Get all direct child elements of the item
        const children = item.children;
        
        // APPROACH 1: Find <link> as direct child with text content (standard RSS)
        for (const child of children) {
            const tagName = child.tagName?.toLowerCase();
            if (tagName === 'link') {
                // Check for text content (RSS style)
                const text = child.textContent?.trim();
                if (text && text.startsWith('http') && !text.includes('\n') && text.length < 500) {
                    return text;
                }
                // Check for href attribute (Atom style)
                const href = child.getAttribute('href');
                if (href && href.startsWith('http')) {
                    return href;
                }
            }
        }
        
        // APPROACH 2: Find <guid> as direct child (common in WordPress RSS)
        for (const child of children) {
            const tagName = child.tagName?.toLowerCase();
            if (tagName === 'guid') {
                const guidText = child.textContent?.trim();
                const isPermalink = child.getAttribute('isPermaLink');
                
                // Use guid if it looks like a URL and isn't explicitly NOT a permalink
                if (guidText && guidText.startsWith('http') && isPermalink !== 'false') {
                    return guidText;
                }
            }
        }
        
        // APPROACH 3: Atom-style link with href attribute (any link element)
        const allLinks = item.getElementsByTagName('link');
        for (const link of allLinks) {
            const href = link.getAttribute('href');
            const rel = link.getAttribute('rel');
            
            if (href && href.startsWith('http')) {
                // Prefer rel="alternate" or no rel
                if (!rel || rel === 'alternate') {
                    return href;
                }
            }
        }
        
        // APPROACH 4: Any link with href
        for (const link of allLinks) {
            const href = link.getAttribute('href');
            if (href && href.startsWith('http')) {
                return href;
            }
        }
        
        // APPROACH 5: feedburner:origLink
        try {
            const fbOrigLink = item.getElementsByTagNameNS('http://rssnamespace.org/feedburner/ext/1.0', 'origLink')[0] ||
                              item.getElementsByTagName('feedburner:origLink')[0];
            if (fbOrigLink?.textContent?.trim()) {
                return fbOrigLink.textContent.trim();
            }
        } catch (e) {}
        
        // APPROACH 6: origLink element
        for (const child of children) {
            if (child.tagName?.toLowerCase() === 'origlink') {
                const text = child.textContent?.trim();
                if (text && text.startsWith('http')) {
                    return text;
                }
            }
        }
        
        // APPROACH 7: Extract URL from description/content
        let description = '';
        for (const child of children) {
            const tag = child.tagName?.toLowerCase();
            if (tag === 'description' || tag === 'content' || tag === 'content:encoded') {
                description = child.textContent || '';
                break;
            }
        }
        
        if (description) {
            const urlMatch = description.match(/https?:\/\/[^\s<>"'\]]+/);
            if (urlMatch) {
                const foundUrl = urlMatch[0].replace(/[.,;:!?)]+$/, '');
                if (!foundUrl.includes('/feed') && !foundUrl.includes('/rss')) {
                    return foundUrl;
                }
            }
        }
        
        return null;
    }

    generateId(url) {
        // Use full base64 encoding without truncation to avoid ID collisions.
        // btoa() may throw on non-Latin1 chars in URLs, so we encode first.
        try {
            return btoa(encodeURIComponent(url)).replace(/[^a-zA-Z0-9]/g, '');
        } catch (e) {
            // Fallback: hash the URL string manually
            let hash = 0;
            for (let i = 0; i < url.length; i++) {
                hash = ((hash << 5) - hash) + url.charCodeAt(i);
                hash |= 0;
            }
            return 'id' + Math.abs(hash).toString(36);
        }
    }

    // ==========================================
    // Scoring
    // ==========================================

    async scoreArticles(articles) {
        // Compute and cache cross-references once; reused in rendering to avoid double computation
        this.crossRefs = this.detectCrossReferences(articles);

        // Pre-compile client regexes once for this scoring pass — reused across every article
        // instead of constructing a new RegExp per client per article (~137k → 343 compilations)
        this._clientRegexCache = this.clients.map(clientEntry => {
            const clientName = typeof clientEntry === 'string' ? clientEntry : clientEntry.name;
            const aliases = (typeof clientEntry === 'object' && clientEntry.aliases) ? clientEntry.aliases : [];
            const namesToCheck = [clientName, ...aliases];
            return {
                clientEntry,
                clientName,
                regexes: namesToCheck.map(name => ({
                    name,
                    regex: name.length <= 3
                        ? new RegExp(`\\b${this.escapeRegex(name.toLowerCase())}\\b`, 'i')
                        : new RegExp(`\\b${this.escapeRegex(name.toLowerCase())}`, 'i')
                }))
            };
        });

        // Split articles into new (need full scoring) vs already-scored (loaded from IDB corpus).
        // IDB articles already have relevanceScore, matchedClients, signalType etc — no need to
        // re-run intelligence analysis or regex matching on them every refresh.
        const idbIds = new Set((await this.db.loadArticles()).map(a => a.id));
        const toScore   = articles.filter(a => !a.relevanceScore || !idbIds.has(a.id));
        const preScored = articles.filter(a =>  a.relevanceScore &&  idbIds.has(a.id));
        console.log(`📊 Scoring ${toScore.length} new articles, reusing ${preScored.length} pre-scored from IDB`);

        // Run intelligence analysis on new articles only
        console.log(`🧠 Analyzing ${toScore.length} articles with Hybrid Intelligence...`);
        const analyzedArticles = [];

        // PERFORMANCE OPTIMIZATION: Process articles in parallel batches instead of sequentially
        // This provides 3-5x speedup (10s → 2-3s for 200 articles)
        const BATCH_SIZE = 30; // Process 30 articles simultaneously (increased from 20)
        const startTime = performance.now();

        for (let i = 0; i < toScore.length; i += BATCH_SIZE) {
            const batch = toScore.slice(i, i + BATCH_SIZE);

            // Process batch in parallel using Promise.allSettled for error resilience
            const batchResults = await Promise.allSettled(
                batch.map(article => {
                    if (this.intelligenceEngine) {
                        return this.intelligenceEngine.analyzeArticle(
                            article,
                            this.clients,
                            this.articles // Pass existing articles for context
                        );
                    }
                    return Promise.resolve(article);
                })
            );

            // Collect results with error handling
            for (let j = 0; j < batchResults.length; j++) {
                const result = batchResults[j];
                if (result.status === 'fulfilled') {
                    analyzedArticles.push(result.value);
                } else {
                    console.warn(`Intelligence analysis failed for article ${batch[j].id}:`, result.reason);
                    analyzedArticles.push(batch[j]); // Fallback to original article
                }
            }

            // Update progress indicator
            const progress = Math.min(100, Math.round((i + BATCH_SIZE) / toScore.length * 100));
            this.showLoading(`Analyzing articles... ${progress}% (${analyzedArticles.length}/${toScore.length})`);
        }

        const analysisTime = Math.round(performance.now() - startTime);
        console.log(`⚡ Intelligence analysis completed in ${analysisTime}ms for ${toScore.length} new articles`);

        // Get intelligence stats
        if (this.intelligenceEngine) {
            this.intelligenceStats = await this.intelligenceEngine.getStats();
            console.log('📊 Intelligence Stats:', this.intelligenceStats);
        }

        // Score new articles, then combine with pre-scored IDB articles
        const newlyScored = analyzedArticles.map(article => {
            const text = `${article.title} ${article.summary}`.toLowerCase();

            // Calculate scores
            const industryMatch = this.detectIndustry(text);
            // Use detectAllClients() directly (detectClient() was a duplicate wrapper)
            const allClients = this.detectAllClients(text);
            const crossRefBoost = this.getCrossRefBoost(article, this.crossRefs);
            
            // ── Score components (tracked individually for debug mode) ──
            const bd = {}; // scoreBreakdown accumulator

            // Base score
            bd.base = 0.20;
            let score = bd.base;
            
            // Priority boost
            bd.priority = article.priority === 1 ? 0.20 : article.priority === 2 ? 0.10 : 0;
            score += bd.priority;
            
            // Credibility boost: (credibility - 0.5) * 0.4 → max +0.18
            bd.credibility = parseFloat(((article.credibilityScore - 0.5) * 0.4).toFixed(3));
            score += bd.credibility;
            
            // Category weight multiplier
            const categoryWeight = CATEGORIES[article.category]?.weight || 1.0;
            bd.categoryMult = categoryWeight;
            score *= categoryWeight;
            
            // Recency boost
            const hoursOld = (Date.now() - new Date(article.publishedDate).getTime()) / 3600000;
            bd.recency = hoursOld < 4 ? 0.12 : hoursOld < 8 ? 0.08 : hoursOld < 12 ? 0.05 : hoursOld < 24 ? 0.02 : 0;
            bd.hoursOld = Math.round(hoursOld * 10) / 10;
            score += bd.recency;
            
            // Industry match
            bd.industry = 0;
            article.matchedIndustries = []; // Always initialize as array
            if (industryMatch) {
                const tierBoost = { 1: 0.30, 2: 0.20, 3: 0.10 };
                bd.industry = tierBoost[industryMatch.tier] || 0;
                bd.industryName = industryMatch.name;
                score += bd.industry;
                article.matchedIndustry = industryMatch.name;
                article.matchedIndustries = [industryMatch.name]; // Array for rendering
            }
            
            // Client match - tier-weighted boost
            bd.client = 0;
            article.matchedClients = []; // Always initialize as array
            if (allClients.length > 0) {
                const topClient = allClients[0];
                const clientObj = this.clients.find(c => (typeof c === 'string' ? c : c.name) === topClient);
                const clientTier = (clientObj && typeof clientObj === 'object') ? clientObj.tier : 2;
                bd.client = { 1: 0.35, 2: 0.25, 3: 0.15 }[clientTier] || 0.25;
                bd.clientName = topClient;
                score += bd.client;
                article.matchedClient = topClient;
                article.matchedClients = allClients; // Array for rendering
                
                // Update "Last Signal" timestamp for all matched clients
                for (const clientName of allClients) {
                    const client = this.clients.find(c =>
                        (typeof c === 'string' ? c : c.name) === clientName
                    );
                    if (client && typeof client === 'object') {
                        const articleDate = new Date(article.publishedDate);
                        // Only update if this article is newer than the last recorded signal
                        if (!client.lastMentioned || articleDate > new Date(client.lastMentioned)) {
                            client.lastMentioned = article.publishedDate;
                        }
                    }
                }
            }
            
            // Cross-reference boost
            bd.crossRef = parseFloat(crossRefBoost.toFixed(3));
            score += bd.crossRef;
            
            // Deal relevance scoring layer
            const dealBoost = this.calculateDealRelevance(text, allClients);
            bd.deal = parseFloat(dealBoost.toFixed(3));
            score += bd.deal;
            
            // Feedback drift (capped ±0.15)
            const drift = this.sourceScoreDrift[article.sourceName] || 0;
            bd.drift = parseFloat(Math.max(-0.15, Math.min(0.15, drift)).toFixed(3));
            score += bd.drift;
            
            // Intelligence boost (from Hybrid Intelligence Engine)
            bd.intelligence = 0;
            if (article.intelligence && article.intelligence.isRelevant) {
                const intel = article.intelligence;
                
                // High threat = high priority
                if (intel.threatLevel >= 80) {
                    bd.intelligence += 0.50; // Critical threat
                } else if (intel.threatLevel >= 60) {
                    bd.intelligence += 0.30; // Medium threat
                }
                
                // High opportunity = high priority
                if (intel.opportunityScore >= 70) {
                    bd.intelligence += 0.40; // Strong opportunity
                } else if (intel.opportunityScore >= 50) {
                    bd.intelligence += 0.20; // Medium opportunity
                }
                
                // Tier 3 semantic analysis = highest confidence boost
                if (intel.tier === 3) {
                    bd.intelligence *= 1.2; // 20% boost for semantic analysis
                }
                
                bd.intelligenceTier = intel.tier;
                bd.intelligenceConfidence = intel.confidence;
                score += bd.intelligence;
            }
            
            bd.total = parseFloat(Math.min(1, score).toFixed(3));
            article.scoreBreakdown = bd;
            
            // Signal type classification
            article.signalType = this.classifySignalType(text, allClients);

            // Estimate reading time
            const wordCount = (article.summary || '').split(/\s+/).length;
            article.estimatedReadingMinutes = Math.max(1, Math.min(10, Math.ceil(wordCount / 150)));

            // Normalize property names for rendering consistency
            article.source = article.sourceName; // Alias for rendering
            article.date = article.publishedDate; // Alias for filtering

            article.relevanceScore = bd.total;
            return article;
        });

        // Ensure pre-scored articles also have rendering aliases set
        preScored.forEach(a => {
            if (!a.source) a.source = a.sourceName;
            if (!a.date)   a.date   = a.publishedDate;
        });

        return [...newlyScored, ...preScored];
    }

    // ==========================================
    // Article Feedback (👍/👎 rating + score drift)
    // ==========================================

    rateArticle(id, rating, event) {
        // Stop click from bubbling up to the article-item div (which opens the article)
        if (event) event.stopPropagation();
        
        // rating: 1 (👍) or -1 (👎)
        const article = this.articles.find(a => a.id === id)
            || this.dailyArticles.find(a => a.id === id)
            || this.weeklyArticles.find(a => a.id === id);
        if (!article) return;
        
        const previousRating = this.articleRatings[id] || 0;
        let toastLabel;
        
        // Toggle off if same rating clicked again
        if (previousRating === rating) {
            delete this.articleRatings[id];
            // Reverse the drift contribution
            this.sourceScoreDrift[article.sourceName] =
                (this.sourceScoreDrift[article.sourceName] || 0) - (rating * 0.02);
            toastLabel = '↩️ Rating removed';
        } else {
            // Remove previous rating's drift contribution before applying new one
            if (previousRating !== 0) {
                this.sourceScoreDrift[article.sourceName] =
                    (this.sourceScoreDrift[article.sourceName] || 0) - (previousRating * 0.02);
            }
            this.articleRatings[id] = rating;
            // Each rating nudges the source's drift by ±0.02
            // After ~7 consistent 👍 ratings, a source gets +0.14 boost (near the cap)
            this.sourceScoreDrift[article.sourceName] =
                (this.sourceScoreDrift[article.sourceName] || 0) + (rating * 0.02);
            toastLabel = rating === 1 ? '👍 Noted — this source will rank higher' : '👎 Noted — this source will rank lower';
        }
        
        this.saveToStorage();
        
        // Re-render the article item in place to reflect new rating state
        const articleEl = document.querySelector(`[data-article-id="${this.escapeAttr(id)}"]`);
        if (articleEl) {
            const updatedArticle = this.articles.find(a => a.id === id)
                || this.dailyArticles.find(a => a.id === id)
                || this.weeklyArticles.find(a => a.id === id);
            if (updatedArticle) {
                articleEl.outerHTML = this.renderArticleItem(updatedArticle);
            }
        }
        
        showToast(toastLabel);
    }

    calculateDealRelevance(text, matchedClients) {
        if (typeof DEAL_RELEVANCE_SIGNALS === 'undefined') return 0;
        
        let boost = 0;
        const hasClient = matchedClients.length > 0;
        
        const hasCompetitor = DEAL_RELEVANCE_SIGNALS.COMPETITOR_KEYWORDS.some(kw => text.includes(kw));
        const hasCsuite = DEAL_RELEVANCE_SIGNALS.CSUITE_KEYWORDS.some(kw => text.includes(kw));
        const hasRegulatory = DEAL_RELEVANCE_SIGNALS.REGULATORY_KEYWORDS.some(kw => text.includes(kw));
        const hasIBM = DEAL_RELEVANCE_SIGNALS.IBM_KEYWORDS.some(kw => text.includes(kw));
        const hasOpportunity = DEAL_RELEVANCE_SIGNALS.OPPORTUNITY_KEYWORDS.some(kw => text.includes(kw));
        
        // Check for Field CTO escalation triggers
        const hasEscalation = typeof FIELD_CTO_ACTION_TRIGGERS !== 'undefined' &&
            FIELD_CTO_ACTION_TRIGGERS.ESCALATION_TRIGGERS.some(kw => text.includes(kw));
        const hasMarketSignal = typeof FIELD_CTO_ACTION_TRIGGERS !== 'undefined' &&
            FIELD_CTO_ACTION_TRIGGERS.MARKET_SIGNALS.some(kw => text.includes(kw));
        
        // Highest boost: escalation triggers = immediate Field CTO attention
        if (hasEscalation) boost += 0.40;
        // Client + competitor co-occurrence = competitive threat
        else if (hasClient && hasCompetitor) boost += 0.35;
        // Client + C-suite change = new decision-maker opportunity
        else if (hasClient && hasCsuite) boost += 0.30;
        // Client + opportunity signal = active buying intent
        else if (hasClient && hasOpportunity) boost += 0.20;
        
        // Additional boosts (can stack)
        if (hasMarketSignal) boost += 0.20;
        if (hasRegulatory) boost += 0.25;
        if (hasIBM) boost += 0.15;
        
        return Math.min(0.50, boost);
    }

    classifySignalType(text, matchedClients) {
        if (typeof DEAL_RELEVANCE_SIGNALS === 'undefined') return 'background';
        
        const hasClient = matchedClients.length > 0;
        const hasCompetitor = DEAL_RELEVANCE_SIGNALS.COMPETITOR_KEYWORDS.some(kw => text.includes(kw));
        const hasCsuite = DEAL_RELEVANCE_SIGNALS.CSUITE_KEYWORDS.some(kw => text.includes(kw));
        const hasRegulatory = DEAL_RELEVANCE_SIGNALS.REGULATORY_KEYWORDS.some(kw => text.includes(kw));
        const hasIBM = DEAL_RELEVANCE_SIGNALS.IBM_KEYWORDS.some(kw => text.includes(kw));
        const hasOpportunity = DEAL_RELEVANCE_SIGNALS.OPPORTUNITY_KEYWORDS.some(kw => text.includes(kw));
        
        // Check for Field CTO-specific triggers
        const hasEscalation = typeof FIELD_CTO_ACTION_TRIGGERS !== 'undefined' &&
            FIELD_CTO_ACTION_TRIGGERS.ESCALATION_TRIGGERS.some(kw => text.includes(kw));
        const hasATLBrief = typeof FIELD_CTO_ACTION_TRIGGERS !== 'undefined' &&
            FIELD_CTO_ACTION_TRIGGERS.ATL_BRIEFING_TRIGGERS.some(kw => text.includes(kw));
        const hasPositioning = typeof FIELD_CTO_ACTION_TRIGGERS !== 'undefined' &&
            FIELD_CTO_ACTION_TRIGGERS.IBM_POSITIONING.some(kw => text.includes(kw));
        
        // Priority classification
        if (hasEscalation || (hasClient && hasCompetitor)) return 'risk';
        if (hasClient && hasCsuite) return 'relationship';
        if (hasATLBrief || hasRegulatory) return 'regulatory';
        if (hasIBM || hasPositioning) return 'ibm';
        if (hasClient && hasOpportunity) return 'opportunity';
        if (hasClient) return 'relationship';
        return 'background';
    }

    getSignalTypeBadge(signalType) {
        const badges = {
            'risk':         { emoji: '🔴', label: 'Risk',         cssClass: 'signal-risk' },
            'opportunity':  { emoji: '🟡', label: 'Opportunity',  cssClass: 'signal-opportunity' },
            'relationship': { emoji: '🟢', label: 'Relationship', cssClass: 'signal-relationship' },
            'regulatory':   { emoji: '🛡️', label: 'Regulatory',   cssClass: 'signal-regulatory' },
            'ibm':          { emoji: '🔵', label: 'IBM',          cssClass: 'signal-ibm' },
            'background':   { emoji: '⚪', label: 'Background',   cssClass: 'signal-background' }
        };
        return badges[signalType] || badges['background'];
    }

    detectIndustry(text) {
        // Score all industries and return the best match
        // This prevents generic keywords from incorrectly matching
        let bestMatch = null;
        let bestScore = 0;
        
        for (const industry of this.industries) {
            if (!industry.enabled) continue;
            
            const keywords = INDUSTRY_KEYWORDS[industry.name] || [];
            let matchCount = 0;
            let hasStrongMatch = false;
            
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    matchCount++;
                    // Strong match if keyword is 2+ words (more specific)
                    if (keyword.includes(' ')) {
                        hasStrongMatch = true;
                        matchCount += 2; // Bonus for multi-word matches
                    }
                }
            }
            
            if (matchCount > 0) {
                // Calculate score: matches + tier bonus + strong match bonus
                const tierBonus = (4 - industry.tier) * 2; // T1=6, T2=4, T3=2
                const strongBonus = hasStrongMatch ? 3 : 0;
                const score = matchCount + tierBonus + strongBonus;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = industry;
                }
            }
        }
        
        return bestMatch;
    }

    detectAllClients(text, useContextValidation = true) {
        // ENHANCED: Return all matched client names with context validation
        // Phase 2 improvement: Uses exclusion patterns and context scoring
        // Works with both structured objects {name, tier, aliases} and legacy strings.
        // Uses word boundary matching to avoid false positives
        // e.g., "SK" shouldn't match "risk", "ANZ" shouldn't match "organization"
        //
        // Uses pre-compiled regexes from this._clientRegexCache when called from scoreArticles()
        // (set once per scoring pass), falling back to on-demand compilation otherwise.

        const matches = [];
        const textLower = text.toLowerCase();

        // Client-specific exclusion patterns (Phase 2 enhancement)
        const CLIENT_EXCLUSIONS = {
            'anz': ['organization', 'anzac', 'bonanza', 'stanza', 'extravaganza'],
            'sk': ['risk', 'ask', 'task', 'desk', 'mask', 'skate', 'brisk', 'whisk', 'dusk'],
            'dbs': ['jobs', 'mobs', 'verbs', 'absorbs', 'disturbs'],
            'cba': ['cuba', 'combat', 'acrobat', 'scuba'],
            'axa': ['taxa', 'coaxial', 'relaxation', 'taxation'],
            'aia': ['gaia', 'playa'],
            'ocbc': ['abc', 'cbc']
        };

        // Use pre-compiled cache if available (set by scoreArticles), else compile on demand
        const clientList = this._clientRegexCache || this.clients.map(clientEntry => {
            const clientName = typeof clientEntry === 'string' ? clientEntry : clientEntry.name;
            const aliases = (typeof clientEntry === 'object' && clientEntry.aliases) ? clientEntry.aliases : [];
            const namesToCheck = [clientName, ...aliases];
            return {
                clientEntry,
                clientName,
                regexes: namesToCheck.map(name => ({
                    name,
                    regex: name.length <= 3
                        ? new RegExp(`\\b${this.escapeRegex(name.toLowerCase())}\\b`, 'i')
                        : new RegExp(`\\b${this.escapeRegex(name.toLowerCase())}`, 'i')
                }))
            };
        });

        for (const { clientEntry, clientName, regexes } of clientList) {
            const clientNameLower = clientName.toLowerCase();

            // Check exclusions first
            const exclusions = CLIENT_EXCLUSIONS[clientNameLower] || [];
            if (exclusions.some(excl => textLower.includes(excl))) continue;

            // Test pre-compiled regexes
            let isMatch = false;
            let matchedName = null;
            for (const { name, regex } of regexes) {
                if (regex.test(textLower)) {
                    isMatch = true;
                    matchedName = name;
                    break;
                }
            }

            // Phase 2: Context validation for matched clients
            if (isMatch && useContextValidation) {
                const confidence = this.validateClientContext(textLower, clientEntry, matchedName);
                if (confidence >= 0.6 && !matches.includes(clientName)) matches.push(clientName);
            } else if (isMatch && !matches.includes(clientName)) {
                matches.push(clientName);
            }
        }

        return matches;
    }
    
    validateClientContext(text, client, matchedName) {
        // Phase 2: Context validation for client matches
        // Returns confidence score 0.0-1.0
        let score = 0.7; // Base score for keyword match
        
        const clientObj = typeof client === 'object' ? client : { name: client };
        
        // Boost 1: Industry context (+0.15)
        if (clientObj.industry) {
            const industryKeywords = {
                'Financial Services': ['bank', 'banking', 'financial', 'payment', 'insurance', 'fintech', 'lending', 'credit', 'wealth'],
                'Telecommunications': ['telecom', 'telecommunications', 'mobile', '5g', '4g', 'network', 'broadband', 'carrier', 'wireless'],
                'Government': ['government', 'ministry', 'agency', 'public sector', 'municipal', 'federal', 'state', 'national'],
                'Retail': ['retail', 'ecommerce', 'shopping', 'consumer', 'store', 'merchant', 'supermarket'],
                'Energy': ['energy', 'power', 'utility', 'electricity', 'gas', 'renewable', 'solar', 'wind'],
                'Manufacturing': ['manufacturing', 'factory', 'production', 'industrial', 'assembly', 'automotive'],
                'Healthcare': ['healthcare', 'hospital', 'medical', 'pharma', 'health', 'clinical'],
                'Technology': ['technology', 'software', 'digital', 'tech', 'cloud', 'saas', 'platform'],
                'Transportation & Logistics': ['transport', 'logistics', 'shipping', 'freight', 'delivery', 'airline']
            };
            
            const keywords = industryKeywords[clientObj.industry] || [];
            if (keywords.some(kw => text.includes(kw))) {
                score += 0.15;
            }
        }
        
        // Boost 2: Market/geographic context (+0.1)
        if (clientObj.market) {
            const marketKeywords = {
                'ANZ': ['australia', 'australian', 'new zealand', 'sydney', 'melbourne', 'auckland'],
                'ASEAN': ['singapore', 'singaporean', 'malaysia', 'malaysian', 'indonesia', 'indonesian', 'thailand', 'thai'],
                'GCG': ['hong kong', 'china', 'chinese', 'taiwan', 'taiwanese', 'beijing', 'shanghai'],
                'ISA': ['india', 'indian', 'mumbai', 'delhi', 'bangalore', 'sri lanka'],
                'KOREA': ['korea', 'korean', 'seoul', 'south korea']
            };
            
            const keywords = marketKeywords[clientObj.market] || [];
            if (keywords.some(kw => text.includes(kw))) {
                score += 0.1;
            }
        }
        
        // Boost 3: Country context (+0.05)
        if (clientObj.country) {
            const countryLower = clientObj.country.toLowerCase();
            if (text.includes(countryLower)) {
                score += 0.05;
            }
        }
        
        // Penalty: If matched name is very short (<=2 chars) and no context, reduce confidence
        if (matchedName && matchedName.length <= 2 && score < 0.8) {
            score -= 0.1;
        }
        
        return Math.min(score, 0.95);
    }
    
    validateThemeContext(text, theme, matchedKeywords) {
        // Phase 3: Context validation for cross-reference themes
        // Returns confidence score 0.0-1.0
        
        // Base score from keyword matches
        let score = Math.min(matchedKeywords.length * 0.2, 0.6);
        
        // Theme-specific context patterns
        const themeContexts = {
            'AI Governance': {
                required: ['regulation', 'policy', 'compliance', 'framework', 'ethics', 'governance', 'oversight', 'law', 'act', 'directive'],
                boost: 0.2
            },
            'Cloud Competition': {
                required: ['market share', 'pricing', 'competition', 'vs', 'versus', 'compete', 'rival', 'battle', 'war', 'dominance'],
                boost: 0.2
            },
            'Data Sovereignty': {
                required: ['localization', 'residency', 'cross-border', 'jurisdiction', 'sovereignty', 'compliance', 'regulation', 'law'],
                boost: 0.2
            },
            'Agentic AI': {
                required: ['autonomous', 'agent', 'agentic', 'automation', 'workflow', 'orchestration', 'multi-agent', 'framework'],
                boost: 0.15
            },
            'Generative AI': {
                required: ['generate', 'generation', 'model', 'training', 'inference', 'prompt', 'llm', 'transformer'],
                boost: 0.15
            },
            'Cybersecurity': {
                required: ['attack', 'breach', 'vulnerability', 'threat', 'security', 'hack', 'malware', 'ransomware', 'exploit'],
                boost: 0.2
            },
            'Digital Banking': {
                required: ['bank', 'banking', 'financial', 'fintech', 'payment', 'transaction', 'account', 'customer'],
                boost: 0.15
            },
            'Enterprise AI Adoption': {
                required: ['enterprise', 'adoption', 'implementation', 'deployment', 'transformation', 'strategy', 'business'],
                boost: 0.15
            }
        };
        
        const context = themeContexts[theme];
        if (context) {
            // Check for required context keywords
            const contextMatches = context.required.filter(ctx => text.includes(ctx));
            if (contextMatches.length > 0) {
                score += Math.min(contextMatches.length * 0.1, context.boost);
            } else {
                // No context found - reduce confidence significantly
                score *= 0.5;
            }
        }
        
        // Additional validation: Check if article is primarily about this theme
        // If multiple theme keywords present, it's more likely to be genuinely about the theme
        if (matchedKeywords.length >= 2) {
            score += 0.1;
        }
        
        // Penalty: If only generic keywords matched without specific context
        const genericKeywords = ['ai', 'cloud', 'data', 'digital', 'cyber'];
        const onlyGeneric = matchedKeywords.every(kw =>
            genericKeywords.some(gen => kw.includes(gen))
        );
        if (onlyGeneric && score < 0.7) {
            score *= 0.7;
        }
        
        return Math.min(score, 0.95);
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    detectCrossReferences(articles) {
        // Phase 3: Enhanced with context validation
        // Use the expanded themes from sources.js
        const themes = typeof CROSS_REFERENCE_THEMES !== 'undefined'
            ? CROSS_REFERENCE_THEMES
            : {
                'AI Governance': ['ai governance', 'ai regulation', 'ai act', 'ai safety', 'responsible ai', 'ai ethics'],
                'Cloud Competition': ['azure', 'aws', 'google cloud', 'cloud pricing', 'multi-cloud', 'hybrid cloud'],
                'Data Sovereignty': ['data sovereignty', 'data localization', 'gdpr', 'data residency', 'cross-border data'],
                'Agentic AI': ['ai agent', 'agentic', 'autonomous agent', 'multi-agent', 'agent framework'],
                'Generative AI': ['generative ai', 'genai', 'llm', 'large language model', 'chatgpt', 'claude', 'gemini'],
                'Cybersecurity': ['ransomware', 'cyber attack', 'data breach', 'zero trust', 'security vulnerability'],
                'Digital Banking': ['digital bank', 'neobank', 'open banking', 'banking api', 'fintech'],
                'Enterprise AI Adoption': ['ai adoption', 'ai transformation', 'enterprise ai', 'ai strategy', 'ai implementation']
            };
        
        const topicGroups = [];
        
        for (const [theme, keywords] of Object.entries(themes)) {
            const matchingArticles = [];
            
            // Phase 3: Context-validated matching
            for (const article of articles) {
                const text = `${article.title} ${article.summary}`.toLowerCase();
                
                // Tier 1: Keyword matching
                const keywordMatches = keywords.filter(kw => text.includes(kw));
                if (keywordMatches.length === 0) continue;
                
                // Tier 2: Context validation
                const confidence = this.validateThemeContext(text, theme, keywordMatches);
                
                // Only include if confidence threshold met
                if (confidence >= 0.7) {
                    matchingArticles.push({
                        article: article,
                        confidence: confidence,
                        matchedKeywords: keywordMatches
                    });
                }
            }
            
            const uniqueSources = [...new Set(matchingArticles.map(m => m.article.sourceName))];
            
            // Require at least 2 sources AND average confidence > 0.75
            if (uniqueSources.length >= 2) {
                const avgConfidence = matchingArticles.reduce((sum, m) => sum + m.confidence, 0) / matchingArticles.length;
                
                if (avgConfidence >= 0.75) {
                    // Sort by confidence
                    const sortedArticles = matchingArticles.sort((a, b) => b.confidence - a.confidence);
                    
                    topicGroups.push({
                        theme: theme,
                        keywords: keywords,
                        sourceCount: uniqueSources.length,
                        sources: uniqueSources.slice(0, 4),
                        articles: sortedArticles.slice(0, 5).map(m => m.article),
                        articleIds: sortedArticles.map(m => m.article.id),
                        avgConfidence: avgConfidence,
                        topConfidence: sortedArticles[0]?.confidence || 0
                    });
                }
            }
        }
        
        // Sort by source count, then by confidence
        const sorted = topicGroups.sort((a, b) => {
            if (b.sourceCount !== a.sourceCount) {
                return b.sourceCount - a.sourceCount;
            }
            return b.avgConfidence - a.avgConfidence;
        });
        
        // Trend tracking: store daily signal counts for up to 14 days
        try {
            const trendHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.TREND_HISTORY) || '{}');
            const today = new Date().toDateString();
            for (const group of sorted) {
                if (!trendHistory[group.theme]) trendHistory[group.theme] = [];
                const todayEntry = trendHistory[group.theme].find(e => e.date === today);
                if (!todayEntry) {
                    trendHistory[group.theme].push({ date: today, count: group.sourceCount });
                    // Keep only last 14 days
                    trendHistory[group.theme] = trendHistory[group.theme].slice(-14);
                }
            }
            localStorage.setItem(STORAGE_KEYS.TREND_HISTORY, JSON.stringify(trendHistory));
        } catch (e) {
            // Non-critical: ignore storage errors
        }
        
        return sorted;
    }

    getTrendIndicator(theme) {
        try {
            const trendHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.TREND_HISTORY) || '{}');
            const history = trendHistory[theme] || [];
            if (history.length < 2) return '';
            
            // Check for consecutive days
            const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
            let consecutiveDays = 1;
            for (let i = 1; i < sorted.length; i++) {
                const prev = new Date(sorted[i - 1].date);
                const curr = new Date(sorted[i].date);
                const diffDays = Math.round((prev - curr) / 86400000);
                if (diffDays === 1) consecutiveDays++;
                else break;
            }
            
            const latestCount = sorted[0]?.count || 0;
            if (latestCount > 5) return '<span class="trend-hot">🔥 hot</span>';
            if (consecutiveDays >= 3) return `<span class="trend-rising">↑ ${consecutiveDays}d</span>`;
            return '';
        } catch (e) {
            return '';
        }
    }

    getCrossRefBoost(article, crossRefs) {
        let boost = 0;
        for (const ref of crossRefs) {
            if (ref.articleIds.includes(article.id)) {
                boost += Math.min(0.15, ref.sourceCount * 0.05);
            }
        }
        return Math.min(0.3, boost);
    }

    // ==========================================
    // AI Digest Generation
    // ==========================================

    // ==========================================
    // Prompt Caching (Phase 7)
    // ==========================================

    /**
     * Compute a stable fingerprint for the current daily article set.
     * Uses sorted article IDs joined and hashed — fast, deterministic.
     */
    computeArticleFingerprint(articles) {
        const ids = articles.map(a => a.id).sort().join('|');
        // FNV-1a 32-bit hash — fast, no crypto needed
        let hash = 0x811c9dc5;
        for (let i = 0; i < ids.length; i++) {
            hash ^= ids.charCodeAt(i);
            hash = (hash * 0x01000193) >>> 0;
        }
        return hash.toString(36);
    }

    /**
     * Delta-merge: send only new articles to Claude and ask it to update
     * the existing digest rather than regenerate from scratch.
     * Reduces token usage by ~70% on typical mid-day refreshes.
     */
    async mergeDeltaDigest(apiKey, newArticles) {
        if (!this.digest || newArticles.length === 0) return;

        const newArticleList = newArticles.map((a, i) => {
            const clientTag = a.matchedClient ? ` | Client: ${a.matchedClient}` : '';
            const industryTag = a.matchedIndustry ? ` | Industry: ${a.matchedIndustry}` : '';
            const signalTag = (a.signalType && a.signalType !== 'background') ? ` | Signal: ${a.signalType}` : '';
            return `[${i + 1}] Source: ${a.sourceName}${clientTag}${industryTag}${signalTag} | URL: ${a.url}\nTitle: ${a.title}\nSummary: ${a.summary?.substring(0, 200) || 'No summary'}`;
        }).join('\n\n');

        const contextBlock = this.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT: ${this.settings.thisWeekContext}\n`
            : '';

        const deltaPrompt = `You are the intelligence briefer for the IBM APAC Field CTO.
${contextBlock}
EXISTING DIGEST (generated earlier today):
Executive Summary: ${this.digest.executiveSummary}

NEW ARTICLES SINCE LAST DIGEST (${newArticles.length} articles):
${newArticleList}

TASK: Update the existing digest to incorporate the new articles. Apply the same five-conversation framework as the original digest.

THE FIVE CONVERSATIONS (for context when updating):
- Conv 1 · Govern Your Data (watsonx.data + Confluent)
- Conv 2 · Connect & Automate (watsonx Orchestrate + webMethods)
- Conv 3 · Trust Every Identity (Verify + Vault)
- Conv 4 · Run Anywhere (Terraform + Vault + Cloudability + Concert)
- Conv 5 · Build & Modernise (IBM Bob — on-premises GA target 30 Sep 2026, say "a path to", not "available today")

UPDATE RULES:
- If a new article opens a stronger conversation door, update executiveSummary to name it
- If a new article matches a watchlist client, surface it in executiveSummary and name the conversation door to open with them
- Keep all existing content that is still valid
- Add new conversationStarters only if new articles provide genuinely new hypotheses to test with a client CTO
- Apply the same citation and hypothesis-framing rules as the original digest
- Return ONLY valid JSON with the same structure as the original digest

Return ONLY valid JSON, no markdown fences:
{
    "executiveSummary": "Updated 3-4 sentences incorporating new signals. Name conversation door.",
    "sections": [same structure as original, updated where relevant],
    "conversationStarters": [updated list, max 3, hypothesis-framed],
    "industrySignals": [updated list, omit industries with no signal, include conversationDoor field]
}`;

        try {
            // COST OPTIMIZATION: Use unified API helper with token tracking
            const { text } = await callAI('MULTI_SOURCE_ANALYSIS', deltaPrompt, 1500, apiKey);
            
            // Clean response: remove markdown code blocks if present
            let cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            
            // Try to extract JSON more carefully
            let jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            let jsonStr = jsonMatch[0];
            
            // Clean up common JSON issues from Claude
            // Remove trailing commas before closing brackets/braces
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
            
            // Find the balanced closing brace by counting braces
            let braceCount = 0;
            let endIndex = -1;
            for (let i = 0; i < jsonStr.length; i++) {
                if (jsonStr[i] === '{') braceCount++;
                if (jsonStr[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }
            
            // Truncate to balanced JSON if there's trailing content
            if (endIndex > 0 && endIndex < jsonStr.length - 1) {
                console.log(`Delta merge: Truncating ${jsonStr.length - endIndex - 1} chars of trailing content`);
                jsonStr = jsonStr.substring(0, endIndex + 1);
            }
            
            try {
                const updated = JSON.parse(jsonStr);
                
                // Validate the structure
                if (!updated.executiveSummary || !updated.sections) {
                    throw new Error('Invalid digest structure');
                }
                
                // Preserve fingerprint metadata from the merge
                this.digest = {
                    ...updated,
                    generatedAt: this.digest.generatedAt,
                    updatedAt: new Date().toISOString(),
                    articleFingerprint: this.computeArticleFingerprint(this.dailyArticles),
                    seenArticleIds: this.dailyArticles.map(a => a.id),
                    thisWeekContext: this.settings.thisWeekContext || '',
                    deltaCount: (this.digest.deltaCount || 0) + newArticles.length,
                };
                console.log(`✅ Delta merge complete — ${newArticles.length} new articles incorporated`);
            } catch (parseError) {
                console.error('JSON parse error:', parseError.message);
                console.error('Problematic JSON:', jsonStr.substring(0, 500) + '...');
                throw parseError;
            }
        } catch (error) {
            console.error('Delta merge failed, falling back to full generation:', error);
            await this.generateAIDigest(apiKey);
        }
    }

    async generateAIDigest(apiKey) {
        // Category-aware sampling: take top articles by score, but guarantee at least
        // 1 article per active category so regulatory/ASEAN signals aren't dropped.
        const TOTAL_ARTICLES = 35;
        const byCategory = {};
        for (const article of this.dailyArticles) {
            if (!byCategory[article.category]) byCategory[article.category] = [];
            byCategory[article.category].push(article);
        }
        
        // Seed with the best article from each category (already sorted by score)
        const seeded = new Set();
        const sampledArticles = [];
        for (const articles of Object.values(byCategory)) {
            if (articles.length > 0) {
                sampledArticles.push(articles[0]);
                seeded.add(articles[0].id);
            }
        }
        
        // Fill remaining slots from the top-scored articles not already included
        for (const article of this.dailyArticles) {
            if (sampledArticles.length >= TOTAL_ARTICLES) break;
            if (!seeded.has(article.id)) {
                sampledArticles.push(article);
                seeded.add(article.id);
            }
        }
        
        // Sort final set by score descending so Claude sees highest-value articles first
        sampledArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        // Inject client/industry/signal metadata into each article entry so Claude
        // can connect articles to watchlist clients and industry verticals
        const articleList = sampledArticles.map((a, i) => {
            const clientTag = a.matchedClient ? ` | Client: ${a.matchedClient}` : '';
            const industryTag = a.matchedIndustry ? ` | Industry: ${a.matchedIndustry}` : '';
            const signalTag = (a.signalType && a.signalType !== 'background') ? ` | Signal: ${a.signalType}` : '';
            return `[${i + 1}] Source: ${a.sourceName}${clientTag}${industryTag}${signalTag} | URL: ${a.url}\nTitle: ${a.title}\nSummary: ${a.summary?.substring(0, 250) || 'No summary'}`;
        }).join('\n\n');

        // Inject "This Week's Context" if set
        const contextBlock = this.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT (prioritize relevance to these meetings/deals):\n${this.settings.thisWeekContext}\n`
            : '';

        // Build dynamic Tier 1 client list for prompt
        const tier1Clients = this.clients
            .filter(c => c.tier === 1)
            .map(c => c.name)
            .slice(0, 15); // Limit to avoid prompt bloat
        const tier1ClientList = tier1Clients.length > 0 
            ? tier1Clients.join(', ')
            : 'your configured Tier 1 clients';
        
        // Pick 2 sample clients for examples (or use generic)
        const sampleClients = tier1Clients.length >= 2
            ? `${tier1Clients[0]} or ${tier1Clients[1]}`
            : 'a Tier 1 client';
        const sampleClient = tier1Clients.length > 0 ? tier1Clients[0] : 'a watchlist client';

        const prompt = `You are the intelligence briefer for the IBM APAC Field CTO.
${contextBlock}
YOUR JOB IS NOT TO SUMMARIZE NEWS. Map today's signals to the five client conversations the field runs. Lead with Why Change — the cost of standing still — not a product pitch.

ROLE CONTEXT:
- You lead 115 ATLs across 343 enterprise accounts in Asia Pacific (excluding Japan)
- Joint cockpit model: TSL + ATL together at C-suite altitude
- Priority industries: Financial Services, Government, Manufacturing, Energy, Retail
- Competitors: Microsoft Azure, AWS, Google Cloud, Salesforce, SAP, Oracle, ServiceNow, Databricks, Snowflake

THE FIVE CONVERSATIONS — map every signal to the strongest door:
- Conv 1 · Govern Your Data (watsonx.data + Confluent): Open when AI ambition is slow to ship, data platform sprawl, residency/localisation exposure, or regulated data (bank, insurer, health, public sector). Why change: under 1% of enterprise data is AI-ready.
- Conv 2 · Connect & Automate (watsonx Orchestrate + webMethods): Open when middleware sprawl or M&A integration debt, live agent pilots, or stalled RPA. Why change: agents proliferating with no central record of what acts or what it can reach.
- Conv 3 · Trust Every Identity (Verify + Vault): Open when zero-trust/audit mandate, DORA-style regulation, IAM modernisation, or fast-growing machine/agent identities. Why change: non-human identities now outnumber humans and are the fastest-growing attack surface.
- Conv 4 · Run Anywhere (Terraform + Vault + Cloudability + Concert): Open when multi-cloud or cloud-exit noise, board scrutiny on cloud cost, sovereignty/residency driving workload placement. Why change: "all-in on one provider" is a dependency, not a strategy.
- Conv 5 · Build & Modernise (IBM Bob): Open when large legacy estate, stalled modernisation, ungoverned AI coding spend, or delivery pressure. Why change: legacy debt compounds and AI coding spend runs unmeasured until the quarter it doubles. CLAIM DISCIPLINE: IBM Bob on-premises GA target is 30 Sep 2026 — say "a path to on-premises", never "available today".
- Conv L · Lightwell (QUALIFYING PATH — never open cold): Surfaces from inside the five when articles name open-source CVE exposure a client owns but cannot fix. Qualifying signals: cannot take an upgrade, carrying a security exception or private fork, community Kafka/Terraform/Ansible in production, patch-to-production cycle over 45 days. Two qualifying questions: (1) Can they move to the remediated version? If not → Lightwell backport; if yes → Concert pull-request. (2) How long to production? Under 14 days safe, 15–45 caution, over 45 high risk. Claim discipline: no SLAs, no trial, no pricing; Clearinghouse Premier is gated; scope today is Java/Maven + Python/PyPI only.

COMPETITIVE COUNTERS (use in sections and starters):
- vs Snowflake/Databricks → Conv 1: portability and governance across all data, not inside one estate
- vs MuleSoft/Boomi → Conv 2: total estate cost and agent control plane, not one connector's features
- vs Okta/Entra → Conv 3: human + non-human identity as one fabric; they keep their IAM, we close the machine/agent gap
- vs hyperscaler native stack → Conv 4: portability and lock-in — can you run, govern, and prove the same way everywhere?
- vs GitHub Copilot/Cursor → Conv 5: autocomplete speeds one slice; Bob governs the whole lifecycle and the bill
- vs Snyk/Chainguard/Athena → Conv L: scanning is not fixing; Lightwell supplies the signed fix at the version they already run

RULES:
- Citations: Use actual source names [MIT Tech Review](url), never generic "Source"
- Framing: Frame insights as ACTIONS not summaries. Lead with the cost of standing still
- Client signals: For Tier 1 clients (${tier1ClientList}), flag explicitly in executiveSummary. If thisWeekContext mentions a client meeting, lead with that signal and name the conversation door to open
- Industry signals: Only include if today's articles contain relevant signals. Name client if they're the evidence
- conversationStarters: EXACTLY 3 hypothesis-framed questions the ATL tests with the client CTO — "I've been thinking that [observation from today's articles] — is that consistent with what you're seeing?" Cite a source. Peer CTO tone, not a sales pitch. One per wave where possible.
- Sections: Only include if articles contain relevant signals

Return valid JSON:
{
    "executiveSummary": "3-4 ACTION-ORIENTED sentences. Cite sources. Name the strongest conversation door. If thisWeekContext mentions a client meeting, lead with that signal.",
    "sections": [
        {
            "title": "Competitive Alerts",
            "emoji": "🚨",
            "summary": "Competitive threats with [Source Name](URL) citations. State IBM counter-position from the relevant conversation door. Do not claim IBM can replace — frame as the question the client should be asking."
        },
        {
            "title": "Regulatory & Sovereignty",
            "emoji": "🛡️",
            "summary": "Regulatory and data-residency developments with citations. Map to Conv 1 (data residency), Conv 3 (audit/identity mandate), or Conv 4 (workload placement)."
        },
        {
            "title": "AI & Agentic",
            "emoji": "🤖",
            "summary": "AI and agent developments with citations. Map to Conv 2 (agent control plane), Conv 1 (data the agents need), or Conv 5 (AI coding/modernisation)."
        },
        {
            "title": "Market Signals",
            "emoji": "🌏",
            "summary": "APAC market-specific signals with citations. Name market and matched client if applicable. Name the conversation door."
        }
    ],
    "conversationStarters": [
        "EXACTLY 3 hypothesis-framed starters. Each: I've been thinking that [observation] — is that consistent with what you're seeing? Cite a source. Label which conversation door it opens."
    ],
    "industrySignals": [
        {
            "industry": "Financial Services",
            "emoji": "🏦",
            "headline": "One-sentence signal grounded in today's articles. Name a client if one was matched.",
            "conversationDoor": "Conv 1 | Conv 2 | Conv 3 | Conv 4 | Conv 5 | Conv L",
            "ibmAngle": "Specific IBM product from that conversation door + the Why Change framing for this industry.",
            "salesAction": "Specific ATL action this week. Reference the five-step motion: Open with diagnostic → Why Change → Shape the architecture (product-blind) → Why IBM → agree a Progress step. Name a client account if relevant."
        }
    ]
}

Articles:
${articleList}`;

        try {
            // COST OPTIMIZATION: Use unified API helper with token tracking
            const { text } = await callAI('MULTI_SOURCE_ANALYSIS', prompt, 2500, apiKey);
            
            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                this.digest = JSON.parse(jsonMatch[0]);
                this.digest.generatedAt = new Date().toISOString();
                // Phase 7: store fingerprint + seen IDs for delta detection on next refresh
                this.digest.articleFingerprint = this.computeArticleFingerprint(this.dailyArticles);
                this.digest.seenArticleIds = this.dailyArticles.map(a => a.id);
                this.digest.thisWeekContext = this.settings.thisWeekContext || '';
            } else {
                throw new Error('Could not parse AI response');
            }
        } catch (error) {
            console.error('AI generation failed:', error);
            this.digest = this.createBasicDigest();
            this.digest.executiveSummary = `AI generation failed: ${error.message}. Showing basic digest.`;
        }
    }

    createBasicDigest() {
        const industryArticles = this.dailyArticles.filter(a => a.matchedIndustry);
        const clientArticles = this.dailyArticles.filter(a => a.matchedClient);
        
        return {
            executiveSummary: `Today's digest: ${this.dailyArticles.length} daily articles, ${this.weeklyArticles.length} weekly deep reads. Configure your Claude API key in Settings for AI-powered action briefs.`,
            sections: [
                {
                    title: "Top Stories",
                    emoji: "📰",
                    summary: `${this.dailyArticles.length} articles from ${this.sources.filter(s => s.enabled).length} sources.`,
                    readingTimeMinutes: Math.ceil(this.dailyArticles.slice(0, 10).reduce((sum, a) => sum + a.estimatedReadingMinutes, 0))
                }
            ],
            conversationStarters: [
                "Ask clients about their AI transformation priorities and data sovereignty concerns."
            ],
            generatedAt: new Date().toISOString()
        };
    }

    // ==========================================
    // Rendering
    // ==========================================

    renderDigest(forceRefresh = false) {
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('digest-content').classList.remove('hidden');
        
        // Render the 4-section layout
        this.renderDailyTab(forceRefresh);
    }

    renderDailyTab(forceRefresh = false) {
        // ── Render immediately from scored articles (no AI wait) ──────────────
        // Action Required, Signal Feed, Client Watch and Client Risk all derive
        // from locally-scored articles and render in <1s.
        renderActionRequired();
        renderSignalFeed();
        renderClientRisk();

        // ── AI-enriched sections ──────────────────────────────────────────────
        // renderTodaysSignals fires an AI call that enriches the signal feed
        // with synthesis. It updates the signal list in place when done.
        renderTodaysSignals(forceRefresh).catch((error) => {
            console.error('Signal synthesis failed (non-fatal):', error);
        });

        // Executive summary, market insights and deep reads each manage their
        // own AI calls and update their own DOM sections when ready.
        renderExecutiveSummary(forceRefresh);
        renderMarketInsights(forceRefresh);
        renderDeepReads(forceRefresh);

        // Update portfolio stats
        updateClientManagerCounts();
    }

    // ==========================================
    // Trend Detection (Phase 6)
    // ==========================================

    /**
     * Extract meaningful unigrams and bigrams from an article title.
     * Filters out stop words and very short tokens.
     */
    extractTrendTerms(title) {
        const STOP = new Set([
            'a','an','the','and','or','but','in','on','at','to','for','of','with',
            'is','are','was','were','be','been','has','have','had','will','would',
            'can','could','should','may','might','do','does','did','not','no',
            'it','its','this','that','these','those','by','as','from','into',
            'how','why','what','when','where','who','which','new','says','said',
            'report','reports','via','over','up','out','about','after','before',
            'more','than','just','also','now','all','one','two','three',
        ]);
        const tokens = title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length >= 4 && !STOP.has(t));
        
        const terms = [...tokens]; // unigrams
        // bigrams
        for (let i = 0; i < tokens.length - 1; i++) {
            terms.push(`${tokens[i]} ${tokens[i + 1]}`);
        }
        return terms;
    }

    /**
     * Detect trending topics from the rolling IDB corpus.
     * A trend requires: ≥2 distinct calendar days AND ≥2 distinct sources.
     * Returns top 8 trends sorted by (dayCount × sourceCount) descending.
     */
    detectTrends(currentArticles, historicalArticles) {
        // Combine current + historical, deduplicate by id
        const allById = new Map();
        for (const a of [...historicalArticles, ...currentArticles]) {
            allById.set(a.id, a);
        }
        const all = [...allById.values()];

        // Build term → { days: Set<dateStr>, sources: Set<sourceName>, articles: [] }
        const termMap = new Map();
        const today = new Date().toISOString().slice(0, 10);

        for (const article of all) {
            const dateStr = new Date(article.publishedDate).toISOString().slice(0, 10);
            const terms = this.extractTrendTerms(article.title || '');
            for (const term of terms) {
                if (!termMap.has(term)) {
                    termMap.set(term, { days: new Set(), sources: new Set(), articles: [] });
                }
                const entry = termMap.get(term);
                entry.days.add(dateStr);
                entry.sources.add(article.sourceName);
                // Keep up to 3 representative articles (prefer today's)
                if (entry.articles.length < 3) entry.articles.push(article);
                else if (dateStr === today && !entry.articles.some(a => a.id === article.id)) {
                    entry.articles[2] = article; // Replace oldest with today's
                }
            }
        }

        // Filter: must span ≥2 days AND ≥2 sources
        const trends = [];
        for (const [term, data] of termMap) {
            if (data.days.size >= 2 && data.sources.size >= 2) {
                const dayCount = data.days.size;
                const sourceCount = data.sources.size;
                const hasToday = data.days.has(today);
                // Velocity: hot = today + 3+ sources, rising = today + 2+ days, sustained = older
                const velocity = (hasToday && sourceCount >= 3) ? 'hot'
                               : (hasToday && dayCount >= 2)    ? 'rising'
                               : 'sustained';
                trends.push({
                    term,
                    dayCount,
                    sourceCount,
                    velocity,
                    score: dayCount * sourceCount + (hasToday ? 2 : 0),
                    articles: data.articles,
                });
            }
        }

        // Sort by score desc, return top 8
        return trends.sort((a, b) => b.score - a.score).slice(0, 8);
    }

    async renderTrending() {
        const section = document.getElementById('trending-section');
        if (!section) return;

        // Need historical articles from IDB to detect multi-day trends
        const historicalArticles = await this.db.loadArticles();
        const distinctDays = new Set(
            historicalArticles.map(a => new Date(a.publishedDate).toISOString().slice(0, 10))
        );

        // Need at least 2 distinct days in the corpus to show trends
        if (distinctDays.size < 2) {
            section.classList.add('hidden');
            return;
        }

        const trends = this.detectTrends(this.dailyArticles, historicalArticles);
        if (trends.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        const countEl = document.getElementById('trending-count');
        if (countEl) countEl.textContent = trends.length;

        const list = document.getElementById('trending-list');
        list.innerHTML = trends.map(trend => {
            const velocityBadge = trend.velocity === 'hot'      ? '<span class="trend-badge trend-hot">🔥 Hot</span>'
                                : trend.velocity === 'rising'   ? '<span class="trend-badge trend-rising">📈 Rising</span>'
                                : '<span class="trend-badge trend-sustained">📊 Sustained</span>';
            const articleLinks = trend.articles.map(a =>
                `<a class="trend-article-link" href="${this.escapeAttr(a.url)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(a.title)}</a>`
            ).join('');
            return `
                <div class="trend-item">
                    <div class="trend-item-header">
                        <span class="trend-term">${this.escapeHtml(trend.term)}</span>
                        ${velocityBadge}
                        <span class="trend-meta">${trend.dayCount}d · ${trend.sourceCount} sources</span>
                    </div>
                    <div class="trend-articles">${articleLinks}</div>
                </div>`;
        }).join('');
    }

    renderIndustrySignals() {
        const section = document.getElementById('industry-signals-section');
        const list = document.getElementById('industry-signals-list');
        const countEl = document.getElementById('industry-signals-count');
        if (!section || !list) return;

        const signals = this.digest?.industrySignals;
        if (!signals || signals.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        if (countEl) countEl.textContent = signals.length;

        list.innerHTML = signals.map(s => `
            <div class="industry-signal-item">
                <div class="industry-signal-header">
                    <span class="industry-signal-emoji">${this.escapeHtml(s.emoji || '🏢')}</span>
                    <span class="industry-signal-name">${this.escapeHtml(s.industry || '')}</span>
                </div>
                <div class="industry-signal-headline">${this.escapeHtml(s.headline || '')}</div>
                <div class="industry-signal-ibm">🔵 IBM: ${this.escapeHtml(s.ibmAngle || '')}</div>
                <div class="industry-signal-action">⚡ Action: ${this.escapeHtml(s.salesAction || '')}</div>
            </div>
        `).join('');
    }

    renderWeeklyTab() {
        // Weekly stats
        const totalReadingTime = this.weeklyArticles.reduce((sum, a) => sum + (a.estimatedReadingMinutes || 3), 0);
        const uniqueSources = [...new Set(this.weeklyArticles.map(a => a.sourceName))].length;
        
        document.getElementById('weekly-article-count').textContent = this.weeklyArticles.length;
        document.getElementById('weekly-reading-time').textContent = totalReadingTime;
        document.getElementById('weekly-source-count').textContent = uniqueSources;
        
        // ── Top 3 Must Reads ──────────────────────────────────────────────
        // Pick the 3 highest-scored weekly articles (already sorted by score)
        const top3Section = document.getElementById('weekly-top3-section');
        const top3List = document.getElementById('weekly-top3-list');
        const top3 = this.weeklyArticles.slice(0, 3);
        
        if (top3.length > 0) {
            const medals = ['🥇', '🥈', '🥉'];
            top3List.innerHTML = top3.map((article, i) => {
                const safeId = this.escapeAttr(article.id);
                const categoryInfo = CATEGORIES[article.category] || { emoji: '📰' };
                const readTime = article.estimatedReadingMinutes || 3;
                const scoreClass = article.relevanceScore >= 0.7 ? 'high' : article.relevanceScore >= 0.5 ? 'medium' : '';
                const readClass = article.isRead ? ' article-read' : '';
                const rating = this.articleRatings[article.id] || 0;
                const thumbUpClass = rating === 1 ? ' rating-active' : '';
                const thumbDownClass = rating === -1 ? ' rating-active' : '';
                
                return `
                    <div class="weekly-top3-item${readClass}" data-article-id="${safeId}" onclick="openArticle('${safeId}')">
                        <div class="weekly-top3-medal">${medals[i]}</div>
                        <div class="weekly-top3-body">
                            <div class="weekly-top3-meta">
                                <span class="weekly-top3-source">${this.escapeHtml(article.sourceName)}</span>
                                <span class="weekly-top3-category">${categoryInfo.emoji} ${this.escapeHtml(article.category)}</span>
                                <span class="weekly-top3-time">~${readTime} min read</span>
                                <span class="article-item-score ${scoreClass}">${Math.round(article.relevanceScore * 100)}%</span>
                            </div>
                            <div class="weekly-top3-title">${this.escapeHtml(article.title)}</div>
                            <div class="weekly-top3-summary">${this.escapeHtml(article.summary?.substring(0, 200) || '')}</div>
                            <div class="weekly-top3-actions">
                                <a href="${this.escapeAttr(article.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" onclick="event.stopPropagation()">Read →</a>
                                <button class="rating-btn thumb-up${thumbUpClass}" onclick="rateArticle('${safeId}', 1, event)" title="👍 Good article">👍</button>
                                <button class="rating-btn thumb-down${thumbDownClass}" onclick="rateArticle('${safeId}', -1, event)" title="👎 Not useful">👎</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            top3Section.classList.remove('hidden');
        } else {
            top3Section.classList.add('hidden');
        }
        
        // ── By Category ───────────────────────────────────────────────────
        // Group by category, excluding the top 3 articles to avoid duplication
        const top3Ids = new Set(top3.map(a => a.id));
        const byCategory = {};
        for (const article of this.weeklyArticles) {
            if (top3Ids.has(article.id)) continue; // already shown in top 3
            if (!byCategory[article.category]) {
                byCategory[article.category] = [];
            }
            byCategory[article.category].push(article);
        }
        
        // Render categories (only categories that still have articles after top-3 exclusion)
        const categoriesHtml = Object.entries(byCategory)
            .filter(([, articles]) => articles.length > 0)
            .map(([category, articles]) => {
                const categoryInfo = CATEGORIES[category] || { emoji: '📰' };
                
                return `
                    <div class="weekly-category">
                        <div class="weekly-category-header">
                            <span>${categoryInfo.emoji}</span>
                            <span>${category}</span>
                            <span class="badge">${articles.length}</span>
                        </div>
                        <div class="weekly-category-articles">
                            ${articles.map(a => this.renderArticleItem(a)).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        
        document.getElementById('weekly-categories').innerHTML = categoriesHtml;
        
        // All weekly articles (full list, including top 3, for reference)
        document.getElementById('weekly-articles-count').textContent = this.weeklyArticles.length;
        document.getElementById('weekly-articles-list').innerHTML =
            this.weeklyArticles.map(a => this.renderArticleItem(a)).join('');
    }

    renderCrossSourceSignals(crossRefs) {
        const section = document.getElementById('signals-section');
        const list = document.getElementById('signals-list');
        const count = document.getElementById('signals-count');
        
        if (crossRefs.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        count.textContent = crossRefs.length;
        
        list.innerHTML = crossRefs.slice(0, 5).map(ref => {
            // Generate a description of the signal theme
            const themeDescription = this.generateThemeDescription(ref);
            const trendIndicator = this.getTrendIndicator(ref.theme);
            
            // Group articles by source for cleaner display
            const sourceArticles = {};
            for (const article of ref.articles.slice(0, 5)) {
                if (!sourceArticles[article.sourceName]) {
                    sourceArticles[article.sourceName] = article;
                }
            }
            
            return `
                <div class="signal-item">
                    <div class="signal-header">
                        <span class="signal-theme">${this.escapeHtml(ref.theme)} ${trendIndicator}</span>
                        <span class="signal-sources">📰 ${ref.sourceCount} sources</span>
                    </div>
                    <div class="signal-description">${themeDescription}</div>
                    <div class="signal-source-list">
                        <span class="signal-source-label">Sources:</span>
                        ${Object.entries(sourceArticles).map(([sourceName, article]) => {
                            return `<a class="signal-source-link" href="${this.escapeAttr(article.url)}" target="_blank" rel="noopener noreferrer" title="${this.escapeAttr(article.title)}">${this.escapeHtml(sourceName)}</a>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    generateThemeDescription(ref) {
        // Generate a concise description of what this signal covers
        const themeDescriptions = {
            'AI Governance': 'Multiple sources reporting on AI regulation, safety frameworks, and governance initiatives.',
            'Cloud Competition': 'Cross-source coverage of cloud provider competition, pricing changes, or market dynamics.',
            'Data Sovereignty': 'Converging reports on data localization requirements, privacy regulations, or cross-border data issues.',
            'Agentic AI': 'Multiple perspectives on autonomous AI agents, agent frameworks, or multi-agent systems.',
            'Generative AI': 'Widespread coverage of generative AI developments, model releases, or enterprise adoption.',
            'Cybersecurity': 'Cross-source reporting on security threats, breaches, or defensive measures.',
            'Digital Banking': 'Multiple sources covering digital banking transformation, neobanks, or fintech disruption.',
            'Enterprise AI Adoption': 'Converging coverage on enterprise AI implementation, ROI, or transformation strategies.',
            'Hybrid Cloud': 'Multiple reports on hybrid/multi-cloud strategies, cloud repatriation, or sovereign cloud.',
            'AI Infrastructure': 'Cross-source coverage of GPU supply, AI chips, or compute infrastructure.',
            'Platform Engineering': 'Multiple perspectives on platform engineering, developer experience, or internal platforms.',
            'API Economy': 'Converging reports on API strategy, API management, or API monetization.',
            'Sustainability Tech': 'Multiple sources covering green IT, ESG reporting, or climate technology.',
            'Talent & Skills': 'Cross-source coverage of tech talent, skills gaps, or workforce transformation.',
            'M&A Activity': 'Multiple reports on acquisitions, mergers, or strategic investments in tech.',
            'APAC Expansion': 'Converging coverage of Asia Pacific expansion, regional strategies, or market entry.',
            // IBM-specific themes (keys must match CROSS_REFERENCE_THEMES in sources.js exactly)
            'IBM vs Azure': '🚨 COMPETITIVE ALERT: Multiple sources covering Microsoft Azure/Copilot moves — use IBM\'s on-prem sovereignty and watsonx governance story in your next banking or government conversation.',
            'IBM vs AWS': '🚨 COMPETITIVE ALERT: Multiple sources covering AWS Bedrock/Amazon Q moves — lead with IBM\'s enterprise-grade AI governance and hybrid cloud differentiation.',
            'IBM vs Google Cloud': '🚨 COMPETITIVE ALERT: Multiple sources covering Google Cloud/Vertex AI moves — position IBM watsonx on data sovereignty and regulated-industry compliance.',
            'watsonx & IBM AI': '🔵 IBM watsonx coverage across multiple sources — use for client conversations on enterprise AI governance, data sovereignty, and responsible AI.',
            'APAC Regulatory Compliance': '🛡️ Converging regulatory signals from APAC markets — MAS, APRA, PDPA, or sector-specific compliance requirements affecting your clients.',
            'C-Suite Changes': '🤝 Multiple sources reporting executive changes at enterprise accounts — new CTO/CIO/CDO appointments create relationship opportunities.',
            'Digital Transformation Deals': '💰 Cross-source coverage of enterprise digital transformation announcements — potential IBM opportunities or competitive wins to track.'
        };
        
        // Use predefined description or generate from article titles
        if (themeDescriptions[ref.theme]) {
            return themeDescriptions[ref.theme];
        }
        
        // Fallback: extract key phrases from article titles
        const titles = ref.articles.slice(0, 3).map(a => a.title);
        return `Multiple sources reporting on related developments: ${titles[0]?.substring(0, 80)}...`;
    }

    renderClientWatch() {
        const section = document.getElementById('clients-section');
        const list = document.getElementById('clients-list');
        const count = document.getElementById('clients-count');
        
        // Get all articles with client matches and re-detect to ensure accuracy
        const clientArticles = [];
        for (const article of this.dailyArticles) {
            const text = `${article.title} ${article.summary}`.toLowerCase();
            const matchedClients = this.detectAllClients(text);
            if (matchedClients.length > 0) {
                clientArticles.push({ ...article, matchedClients });
            }
        }
        
        // Group by client - an article can appear under multiple clients
        const byClient = {};
        for (const article of clientArticles) {
            for (const client of article.matchedClients) {
                if (!byClient[client]) byClient[client] = [];
                if (!byClient[client].find(a => a.id === article.id)) {
                    byClient[client].push(article);
                }
            }
        }
        
        // Build tier-grouped client list
        // Tier 1 clients always shown (even with 0 articles)
        const tier1Clients = this.clients
            .filter(c => (typeof c === 'object' ? c.tier : 2) === 1)
            .map(c => typeof c === 'string' ? c : c.name);
        
        // Ensure all T1 clients appear in byClient (even with empty arrays)
        for (const name of tier1Clients) {
            if (!byClient[name]) byClient[name] = [];
        }
        
        const totalWithArticles = Object.values(byClient).filter(a => a.length > 0).length;
        
        if (totalWithArticles === 0 && tier1Clients.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        count.textContent = totalWithArticles;
        
        // Group clients by tier for display
        const clientsByTier = { 1: [], 2: [], 3: [] };
        for (const [clientName, articles] of Object.entries(byClient)) {
            const clientObj = this.clients.find(c => (typeof c === 'string' ? c : c.name) === clientName);
            const tier = (clientObj && typeof clientObj === 'object') ? clientObj.tier : 2;
            clientsByTier[tier].push({ clientName, articles, tier });
        }
        
        // Sort within each tier: clients with articles first, then alphabetically
        for (const tier of [1, 2, 3]) {
            clientsByTier[tier].sort((a, b) => {
                if (b.articles.length !== a.articles.length) return b.articles.length - a.articles.length;
                return a.clientName.localeCompare(b.clientName);
            });
        }
        
        const renderClientGroup = (clientName, articles, tier) => {
            const safeClientName = this.escapeAttr(clientName);
            const tierLabel = tier === 1 ? '<span class="client-tier-badge tier-1">T1</span>' :
                              tier === 2 ? '<span class="client-tier-badge tier-2">T2</span>' :
                                           '<span class="client-tier-badge tier-3">T3</span>';
            
            if (articles.length === 0) {
                return `
                    <div class="client-group client-no-coverage">
                        <div class="client-name-row">
                            ${tierLabel}
                            <span class="client-name">${this.escapeHtml(clientName)}</span>
                            <button class="btn-meeting-brief" onclick="openMeetingBrief('${safeClientName}')" title="Meeting Brief">📋</button>
                        </div>
                        <div class="client-no-coverage-text">No recent coverage</div>
                    </div>`;
            }
            
            // Determine dominant signal type across articles
            const signalCounts = {};
            for (const a of articles) {
                const st = a.signalType || 'background';
                signalCounts[st] = (signalCounts[st] || 0) + 1;
            }
            const dominantSignal = Object.entries(signalCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'background';
            const badge = this.getSignalTypeBadge(dominantSignal);
            
            // Derive dominant conversation door from Tier 3 intelligence
            const convDoorCounts = {};
            for (const a of articles) {
                const door = a.intelligence?.conversationDoor;
                if (a.intelligence?.tier === 3 && door) {
                    convDoorCounts[door] = (convDoorCounts[door] || 0) + 1;
                }
            }
            const dominantConvDoor = Object.keys(convDoorCounts).length > 0
                ? Object.entries(convDoorCounts).sort((a, b) => b[1] - a[1])[0][0]
                : null;
            
            return `
                <div class="client-group">
                    <div class="client-group-signal-strip client-signal-${dominantSignal}">
                        ${badge.emoji} ${badge.label} · ${articles.length} signal${articles.length !== 1 ? 's' : ''}
                    </div>
                    ${dominantConvDoor ? `<div class="client-conv-door">🗣️ ${this.escapeHtml(dominantConvDoor)}</div>` : ''}
                    <div class="client-name-row">
                        ${tierLabel}
                        <span class="client-name">${this.escapeHtml(clientName)}</span>
                        <button class="btn btn-sm btn-primary btn-meeting-brief-primary"
                                onclick="openMeetingBrief('${safeClientName}')">📋 Meeting Brief</button>
                    </div>
                    <div class="client-articles">
                        ${articles.slice(0, 3).map(a => {
                            const safeId = this.escapeAttr(a.id);
                            const shortTitle = a.title.substring(0, 70) + (a.title.length > 70 ? '...' : '');
                            const highlightedTitle = this.highlightClient(shortTitle, clientName);
                            const artBadge = this.getSignalTypeBadge(a.signalType || 'background');
                            return `
                            <div class="client-article">
                                <span class="client-article-source">${this.escapeHtml(a.sourceName)}</span>
                                <span class="client-article-signal" title="${artBadge.label}">${artBadge.emoji}</span>
                                <span class="client-article-title" onclick="openArticle('${safeId}')" title="${this.escapeAttr(a.title)}">${highlightedTitle}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
        };
        
        let html = '';
        
        // Tier 1 section
        if (clientsByTier[1].length > 0) {
            html += `<div class="client-tier-header">⭐ Strategic Accounts (Tier 1)</div>`;
            html += clientsByTier[1].map(({ clientName, articles, tier }) => renderClientGroup(clientName, articles, tier)).join('');
        }
        
        // Tier 2 section (only clients with articles)
        const tier2WithArticles = clientsByTier[2].filter(c => c.articles.length > 0);
        if (tier2WithArticles.length > 0) {
            html += `<div class="client-tier-header">📈 Growth Accounts (Tier 2)</div>`;
            html += tier2WithArticles.map(({ clientName, articles, tier }) => renderClientGroup(clientName, articles, tier)).join('');
        }
        
        // Tier 3 section (only clients with articles)
        const tier3WithArticles = clientsByTier[3].filter(c => c.articles.length > 0);
        if (tier3WithArticles.length > 0) {
            html += `<div class="client-tier-header">🔍 Prospects (Tier 3)</div>`;
            html += tier3WithArticles.map(({ clientName, articles, tier }) => renderClientGroup(clientName, articles, tier)).join('');
        }
        
        list.innerHTML = html;
    }
    
    highlightClient(text, client) {
        // Highlight the client name in the text.
        // escapeHtml() is applied to the full text first, then we wrap matches in <mark>.
        // The replacement uses a function to re-escape the matched text, preventing XSS
        // from user-entered client names that might contain HTML characters.
        const regex = new RegExp(`\\b(${this.escapeRegex(client)})\\b`, 'gi');
        return this.escapeHtml(text).replace(regex, (match) => `<mark>${this.escapeHtml(match)}</mark>`);
    }

    renderSections(sections) {
        const container = document.getElementById('digest-sections');
        
        container.innerHTML = sections.map(section => `
            <section class="card digest-section">
                <div class="card-header">
                    <h2>${section.emoji || '📰'} ${section.title}</h2>
                    <span class="badge">${section.readingTimeMinutes || 3} min</span>
                </div>
                <div class="card-body">
                    <div class="section-summary">${this.formatMarkdownLinks(section.summary || '')}</div>
                </div>
            </section>
        `).join('');
    }

    renderStarters(starters) {
        const section = document.getElementById('starters-section');
        const list = document.getElementById('starters-list');
        
        if (!starters || starters.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        list.innerHTML = starters.map((starter, i) => `
            <div class="starter-item">
                <div class="starter-text">${this.formatMarkdownLinks(starter)}</div>
                <button class="starter-copy" onclick="copyStarter(${i})" title="Copy">📋</button>
            </div>
        `).join('');
    }

    renderDailyArticles() {
        const list = document.getElementById('articles-list');
        const count = document.getElementById('articles-count');
        
        count.textContent = this.dailyArticles.length;
        
        list.innerHTML = this.dailyArticles.slice(0, 30).map(article => this.renderArticleItem(article)).join('');
    }

    renderArticleItem(article) {
        const scoreClass = article.relevanceScore >= 0.7 ? 'high' : article.relevanceScore >= 0.5 ? 'medium' : '';
        const safeId = this.escapeAttr(article.id);
        const readClass = article.isRead ? ' article-read' : '';
        const rating = this.articleRatings[article.id] || 0;
        const thumbUpClass = rating === 1 ? ' rating-active' : '';
        const thumbDownClass = rating === -1 ? ' rating-active' : '';
        // Show source drift hint if non-zero
        const drift = this.sourceScoreDrift[article.sourceName] || 0;
        const driftHint = drift > 0.04 ? ` title="You've rated this source highly — it ranks higher"`
                        : drift < -0.04 ? ` title="You've downrated this source — it ranks lower"`
                        : '';
        
        // Score debug panel — only rendered when ?debug=1 is in the URL
        let debugPanel = '';
        if (this.debugMode && article.scoreBreakdown) {
            const b = article.scoreBreakdown;
            const rows = [
                ['Base',       b.base],
                ['Priority',   b.priority],
                ['Credibility',b.credibility],
                [`Cat ×${b.categoryMult}`, '—'],
                [`Recency (${b.hoursOld}h)`, b.recency],
                [b.industryName ? `Industry: ${b.industryName}` : 'Industry', b.industry],
                [b.clientName  ? `Client: ${b.clientName}`   : 'Client',   b.client],
                ['Cross-ref',  b.crossRef],
                ['Deal',       b.deal],
                ['Drift',      b.drift],
                ['<b>Total</b>', `<b>${b.total}</b>`],
            ].map(([label, val]) =>
                `<tr><td>${label}</td><td>${val}</td></tr>`
            ).join('');
            debugPanel = `<div class="score-debug" onclick="event.stopPropagation()">
                <table>${rows}</table>
            </div>`;
        }
        
        return `
            <div class="article-item${readClass}" data-article-id="${safeId}" onclick="openArticle('${safeId}')">
                <div class="article-item-header">
                    <span class="article-item-source"${driftHint}>${this.escapeHtml(article.sourceName)}</span>
                    <div class="article-item-actions">
                        <button class="rating-btn thumb-up${thumbUpClass}" onclick="rateArticle('${safeId}', 1, event)" title="👍 Good article — rank this source higher">👍</button>
                        <button class="rating-btn thumb-down${thumbDownClass}" onclick="rateArticle('${safeId}', -1, event)" title="👎 Not useful — rank this source lower">👎</button>
                        <span class="article-item-score ${scoreClass}">${Math.round(article.relevanceScore * 100)}%</span>
                    </div>
                </div>
                <div class="article-item-title">${this.escapeHtml(article.title)}</div>
                <div class="article-item-summary">${this.escapeHtml(article.summary?.substring(0, 150) || '')}</div>
                ${debugPanel}
            </div>
        `;
    }

    // ==========================================
    // Article Modal
    // ==========================================

    openArticle(id) {
        // Search all article pools: this.articles is the master list (top 200),
        // but weekly articles are also a subset so this covers both tabs.
        const article = this.articles.find(a => a.id === id)
            || this.weeklyArticles.find(a => a.id === id)
            || this.dailyArticles.find(a => a.id === id);
        if (!article) return;
        
        document.getElementById('article-title').textContent = article.title;
        document.getElementById('article-source').textContent = article.sourceName;
        document.getElementById('article-date').textContent = new Date(article.publishedDate).toLocaleDateString();
        document.getElementById('article-score').textContent = `${Math.round(article.relevanceScore * 100)}% relevant`;
        document.getElementById('article-summary').innerHTML = this.escapeHtml(article.summary || 'No summary available.');
        document.getElementById('article-link').href = article.url;
        
        // Mark as read — persist to IDB read-state store (survives re-fetches)
        article.isRead = true;
        this.db.markRead(id);
        this.saveToStorage();
        this.updateReadingTime();
        // Live-update read state in signal feed without re-render
        try {
            const feedItem = document.querySelector(`.signal-feed-item[data-article-id="${CSS.escape(id)}"]`);
            if (feedItem) feedItem.classList.add('signal-feed-item--read');
        } catch(e) {}
        
        // Show/hide Deep Read button based on API key availability
        const settings = getAIProviderSettings();
        const hasApiKey = !!settings.apiKeys[settings.provider];
        const deepReadBtn = document.getElementById('deep-read-btn');
        if (deepReadBtn) deepReadBtn.classList.toggle('hidden', !hasApiKey);
        
        // Clear previous deep read content
        const deepReadContent = document.getElementById('deep-read-content');
        if (deepReadContent) {
            deepReadContent.classList.add('hidden');
            deepReadContent.innerHTML = '';
        }
        
        document.getElementById('article-modal').classList.remove('hidden');
        document.getElementById('article-modal').dataset.articleId = id;
    }

    async deepReadArticle(id, buttonEl) {
        const article = this.articles.find(a => a.id === id)
            || this.weeklyArticles.find(a => a.id === id)
            || this.dailyArticles.find(a => a.id === id);
        
        if (!article) {
            console.error('Article not found:', id);
            if (buttonEl) alert('Article not found. Please refresh and try again.');
            return;
        }
        
        // Check session cache first — render immediately without an API call
        if (deepReadAnalysisCache.has(id)) {
            const cached = deepReadAnalysisCache.get(id);
            // Find the card's analysis container by article id attribute or button proximity
            const deepReadItem = buttonEl
                ? buttonEl.closest('.deep-read-item')
                : document.querySelector(`.deep-read-item[onclick*="${id}"]`);
            const container = deepReadItem?.querySelector('.deep-read-analysis');
            if (container) {
                container.innerHTML = `
                    <div class="deep-read-section">
                        <div class="deep-read-label">📌 Key Facts</div>
                        <ul class="deep-read-facts">
                            ${(cached.keyFacts || []).map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="deep-read-section">
                        <div class="deep-read-label">⚡ So What</div>
                        <div class="deep-read-text">${this.escapeHtml(cached.soWhat || '')}</div>
                    </div>
                    ${(cached.conversationDoor || cached.pillarMapping) ? `
                    <div class="deep-read-section">
                        <div class="deep-read-label">🗣️ Conversation Door</div>
                        <div class="deep-read-text"><strong>${this.escapeHtml(cached.conversationDoor || cached.pillarMapping)}</strong></div>
                    </div>` : ''}
                    <div class="deep-read-section">
                        <div class="deep-read-label">🔵 IBM Angle</div>
                        <div class="deep-read-text">${this.escapeHtml(cached.ibmAngle || '')}</div>
                    </div>
                    <div class="deep-read-section">
                        <div class="deep-read-label">👤 Client Implication</div>
                        <div class="deep-read-text">${this.escapeHtml(cached.clientImplication || '')}</div>
                    </div>
                    ${cached.competitiveWatch ? `
                    <div class="deep-read-section">
                        <div class="deep-read-label">⚔️ Competitive Watch</div>
                        <div class="deep-read-text">${this.escapeHtml(cached.competitiveWatch)}</div>
                    </div>` : ''}
                    <div class="deep-read-section">
                        <div class="deep-read-label">💬 Conversation Opener</div>
                        <div class="deep-read-text conversation-opener">"${this.escapeHtml(cached.conversationOpener || '')}"</div>
                    </div>
                `;
            }
            if (buttonEl) {
                buttonEl.textContent = '✓ Analysis Generated';
                buttonEl.disabled = true;
            }
            return;
        }
        
        const settings = getAIProviderSettings();
        const apiKey = settings.apiKeys[settings.provider];
        if (!apiKey) {
            if (buttonEl) alert('Please add your API key in Settings to use this feature.');
            return;
        }
        
        // Find the parent deep-read-item and its analysis container
        let container;
        if (buttonEl) {
            const deepReadItem = buttonEl.closest('.deep-read-item');
            if (deepReadItem) {
                container = deepReadItem.querySelector('.deep-read-analysis');
                // Disable button while loading
                buttonEl.disabled = true;
                buttonEl.textContent = '⏳ Generating...';
            }
        } else {
            // Auto-trigger path: find card by article id embedded in onclick
            const deepReadItem = document.querySelector(`.deep-read-item[onclick*="${id}"]`);
            if (deepReadItem) {
                container = deepReadItem.querySelector('.deep-read-analysis');
            }
        }
        
        if (!container) {
            console.error('Could not find .deep-read-analysis container for article:', id);
            return;
        }
        
        container.innerHTML = '<div class="deep-read-loading">🤖 Generating deep analysis...</div>';
        
        // Inject all available article metadata so Claude has full context
        const clientContext = (article.allMatchedClients?.length)
            ? `Watchlist clients mentioned: ${article.allMatchedClients.slice(0, 5).join(', ')}.`
            : 'No watchlist clients matched.';
        const industryContext = article.matchedIndustry ? `Detected industry: ${article.matchedIndustry}.` : '';
        const signalContext = (article.signalType && article.signalType !== 'background')
            ? `Signal type: ${article.signalType}.` : '';
        const weekContext = this.settings.thisWeekContext
            ? `\nThis week's context: ${this.settings.thisWeekContext}` : '';

        const prompt = `You are the intelligence analyst for the IBM APAC Field CTO.
Turn this article into a 60-second strategic brief answering: "What does this mean for IBM APAC, and what should we do TODAY?"

ARTICLE
Title: ${article.title}
Source: ${article.sourceName || article.source} (Category: ${article.category || 'General'})
Summary: ${article.summary || 'No summary available'}
${clientContext}
${industryContext}
${signalContext}${weekContext}

THE FIVE CLIENT CONVERSATIONS — assign the strongest door:
- Conv 1 · Govern Your Data (watsonx.data + Confluent): data platform sprawl, residency/localisation, AI ambition stalled on data. Unconsidered need: governed access is control over where data lives, not just a platform.
- Conv 2 · Connect & Automate (watsonx Orchestrate + webMethods): agent sprawl, middleware debt, M&A integration, stalled RPA. Unconsidered need: one control plane to govern agents already in production, not another way to build them.
- Conv 3 · Trust Every Identity (Verify + Vault): zero-trust/audit mandate, DORA-style regulation, fast-growing machine/agent identities. Unconsidered need: IAM stacks cover people — machines, secrets, and agents are the gap.
- Conv 4 · Run Anywhere (Terraform + Vault + Cloudability + Concert): cloud cost, multi-cloud, workload sovereignty/residency. Unconsidered need: "all-in on one provider" is a dependency, not a strategy.
- Conv 5 · Build & Modernise (IBM Bob): legacy estate, ungoverned AI coding spend, stalled modernisation. Unconsidered need: a coding assistant speeds one slice — planning, testing, modernisation, security, and the bill stay manual. CLAIM: on-premises GA target 30 Sep 2026.
- Conv L · Lightwell (QUALIFYING PATH — never open cold): Route here from inside the five when a client names open-source CVE exposure they own but cannot fix. Qualifying signals: pinned dependency they cannot upgrade, security exception, private fork, community Kafka/Terraform/Ansible, patch-to-production over 45 days. Claim discipline: no SLAs, no trial, no pricing; Premier is gated; Java/Maven + Python/PyPI scope today.

COMPETITIVE COUNTERS — use in ibmAngle:
- vs Snowflake/Databricks → Conv 1: portability + governance across all data, not inside one estate
- vs MuleSoft/Boomi → Conv 2: agent control plane + total estate cost, not a connector's features
- vs Okta/Entra → Conv 3: human + non-human identity as one fabric; they keep their IAM, we close the machine/agent gap
- vs hyperscaler native stack → Conv 4: can you run, govern, and prove the same way everywhere?
- vs GitHub Copilot/Cursor → Conv 5: whole lifecycle and governed spend, not just autocomplete
- vs Snyk/Chainguard/Athena → Conv L: scanning is not fixing; Lightwell supplies the signed fix at the version they already run

FIELD DEFINITIONS:

- keyFacts: 3 facts extracted directly from the article. One sentence each. No interpretation.

- soWhat: The market shift this signals. Why it matters NOW in APAC. Frame the unconsidered need — what the client has not yet realised they need. Do NOT mention IBM here.

- conversationDoor: Which of the five conversations does this article most strongly open? (Conv 1 / Conv 2 / Conv 3 / Conv 4 / Conv 5 / Conv L)

- ibmAngle: Name the SPECIFIC IBM product from the conversationDoor and frame the Why Change — the cost of standing still. Use the competitive counter if a competitor is named in the article.

- clientImplication: Two parts:
  1. For matched clients: What broader trend does this reveal for their next meeting? Which conversation door does it open?
  2. What should the ATL aligned to that client do THIS WEEK using the five-step motion: Open with diagnostic → Why Change → Shape architecture (product-blind) → Why IBM → Progress step.
  If no clients matched: Describe the APAC enterprise type most affected.

- competitiveWatch: Name competitor (AWS, Azure, Google, Salesforce, SAP, Oracle, ServiceNow, Accenture, Databricks, Snowflake, GitHub, MuleSoft, Okta) whose position strengthens or weakens. State the IBM counter-position from the relevant conversation. Empty string if not applicable.

- conversationOpener: Hypothesis for the ATL to test with the client CTO:
  "I've been thinking that [observation from article] — is that consistent with what you're seeing?"
  Peer CTO tone. Not a sales pitch. Not an open-ended probe. Cites the article signal.

Return ONLY valid JSON, no markdown fences:
{
    "keyFacts": ["string", "string", "string"],
    "soWhat": "string",
    "conversationDoor": "Conv 1 or Conv 2 or Conv 3 or Conv 4 or Conv 5 or Conv L",
    "ibmAngle": "string",
    "clientImplication": "string",
    "competitiveWatch": "string",
    "conversationOpener": "string"
}`;
        
        try {
            // COST OPTIMIZATION: Use unified API helper with token tracking
            const { text } = await callAI('STRATEGIC_ANALYSIS', prompt, 800, apiKey);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                // Store in session cache so re-expansion and auto-trigger skip the API call
                deepReadAnalysisCache.set(id, result);
                container.innerHTML = `
                    <div class="deep-read-section">
                        <div class="deep-read-label">📌 Key Facts</div>
                        <ul class="deep-read-facts">
                            ${(result.keyFacts || []).map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="deep-read-section">
                        <div class="deep-read-label">⚡ So What</div>
                        <div class="deep-read-text">${this.escapeHtml(result.soWhat || '')}</div>
                    </div>
                    ${(result.conversationDoor || result.pillarMapping) ? `
                    <div class="deep-read-section">
                        <div class="deep-read-label">🗣️ Conversation Door</div>
                        <div class="deep-read-text"><strong>${this.escapeHtml(result.conversationDoor || result.pillarMapping)}</strong></div>
                    </div>` : ''}
                    <div class="deep-read-section">
                        <div class="deep-read-label">🔵 IBM Angle</div>
                        <div class="deep-read-text">${this.escapeHtml(result.ibmAngle || '')}</div>
                    </div>
                    <div class="deep-read-section">
                        <div class="deep-read-label">👤 Client Implication</div>
                        <div class="deep-read-text">${this.escapeHtml(result.clientImplication || '')}</div>
                    </div>
                    ${result.competitiveWatch ? `
                    <div class="deep-read-section">
                        <div class="deep-read-label">⚔️ Competitive Watch</div>
                        <div class="deep-read-text">${this.escapeHtml(result.competitiveWatch)}</div>
                    </div>` : ''}
                    <div class="deep-read-section">
                        <div class="deep-read-label">💬 Conversation Opener</div>
                        <div class="deep-read-text conversation-opener">"${this.escapeHtml(result.conversationOpener || '')}"</div>
                    </div>
                `;
                
                // Update button to show success
                if (buttonEl) {
                    buttonEl.textContent = '✓ Analysis Generated';
                    buttonEl.disabled = true;
                }
            } else {
                throw new Error('Could not parse response');
            }
        } catch (err) {
            console.error('Deep read error:', err);
            container.innerHTML = `<div class="deep-read-error">❌ Error generating analysis: ${this.escapeHtml(err.message)}</div>`;
            if (buttonEl) {
                buttonEl.textContent = '🔄 Regenerate Analysis';
                buttonEl.disabled = false;
            }
        }
    }

    // ==========================================
    // Meeting Brief
    // ==========================================

    openMeetingBrief(clientName) {
        const modal = document.getElementById('meeting-brief-modal');
        if (!modal) return;
        
        document.getElementById('meeting-brief-client').textContent = clientName;
        document.getElementById('meeting-brief-body').innerHTML = '<div class="meeting-brief-loading">🤖 Generating meeting brief...</div>';
        modal.classList.remove('hidden');
        modal.dataset.clientName = clientName;
        
        this.generateMeetingBrief(clientName);
    }

    async generateMeetingBrief(clientName) {
        const settings = getAIProviderSettings();
        const apiKey = settings.apiKeys[settings.provider];
        const bodyEl = document.getElementById('meeting-brief-body');
        if (!bodyEl) return;

        // Look up client object to get industry (Phase 2)
        const clientObj = this.clients.find(c =>
            (typeof c === 'string' ? c : c.name).toLowerCase() === clientName.toLowerCase()
        );
        const clientIndustry = clientObj?.industry || null;

        // Look up matching industry signal from today's digest (Phase 2)
        const industrySignal = clientIndustry
            ? (this.digest?.industrySignals || []).find(s => s.industry === clientIndustry)
            : null;
        
        // Gather articles mentioning this client — search both dailyArticles and rolling corpus
        const allArticles = [...this.dailyArticles, ...this.articles];
        const seen = new Set();
        const clientArticles = allArticles.filter(a => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            // Use structured matchedClients first (most reliable)
            if (Array.isArray(a.matchedClients)) {
                const names = a.matchedClients.map(c => (typeof c === 'string' ? c : c.name).toLowerCase());
                const aliases = (clientObj?.aliases || []).map(al => al.toLowerCase());
                if (names.includes(clientName.toLowerCase()) ||
                    aliases.some(al => names.includes(al))) return true;
            }
            // Fallback: full-word text search (both start and end boundary)
            const text = `${a.title} ${a.summary}`.toLowerCase();
            return new RegExp(`\\b${this.escapeRegex(clientName.toLowerCase())}\\b`, 'i').test(text);
        }).slice(0, 8);
        
        if (!apiKey) {
            // No API key: render basic brief from articles
            if (clientArticles.length === 0) {
                bodyEl.innerHTML = `<p class="meeting-brief-empty">No recent news coverage found for <strong>${this.escapeHtml(clientName)}</strong>. Add context in Settings → This Week's Context.</p>`;
            } else {
                bodyEl.innerHTML = `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">📰 Recent Coverage (${clientArticles.length} articles)</div>
                        ${clientArticles.map(a => `
                            <div class="meeting-brief-article">
                                <span class="meeting-brief-source">${this.escapeHtml(a.sourceName)}</span>
                                <span class="meeting-brief-title" onclick="closeMeetingBrief(); app.openArticle('${this.escapeAttr(a.id)}')">${this.escapeHtml(a.title)}</span>
                            </div>`).join('')}
                    </div>
                    <p class="meeting-brief-hint">Add a Claude API key in Settings for AI-powered meeting briefs.</p>`;
            }
            return;
        }
        
        // Increase summary truncation 200 → 350 chars for better article context
        const articleList = clientArticles.map((a, i) =>
            `[${i + 1}] ${a.sourceName}: ${a.title}\n${a.summary?.substring(0, 350) || ''}`
        ).join('\n\n');
        
        const contextBlock = this.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT:\n${this.settings.thisWeekContext}\n`
            : '';

        // Determine if this is a live meeting brief or ATL enablement brief
        // Determine live meeting mode: client name or any alias must appear in context
        const resolvedCtx = resolveContextMatches(this.settings.thisWeekContext, this.clients);
        const clientAliases = clientObj?.aliases || [];
        const allClientTerms = [clientName, ...clientAliases];
        const isMeetingThisWeek = !!(this.settings.thisWeekContext &&
            allClientTerms.some(term =>
                resolvedCtx.clientNames.some(resolved =>
                    resolved.toLowerCase() === term.toLowerCase()
                )
            ));
        const briefPurpose = isMeetingThisWeek
            ? `LIVE MEETING BRIEF — you are meeting ${clientName} this week`
            : `ATL ENABLEMENT BRIEF — for the ATL aligned to ${clientName}`;

        // Industry context block
        const industryBlock = clientIndustry ? `
CLIENT INDUSTRY: ${clientIndustry}
${industrySignal ? `INDUSTRY SIGNAL THIS WEEK: ${industrySignal.headline}
IBM ANGLE FOR ${clientIndustry.toUpperCase()}: ${industrySignal.ibmAngle}` : ''}
Frame all talking points through ${clientIndustry} challenges and priorities.
` : '';
        
        const prompt = `You are preparing a meeting brief for the IBM APAC Field CTO.
Goal: Position ATL as "Client CTO" — trusted strategic advisor, not a vendor. The product comes last, discovered never led with.

Brief Purpose: ${briefPurpose}
Client: ${clientName}
${clientIndustry ? `Market: ${clientObj.market || 'APAC'}
Industry: ${clientIndustry}` : ''}
${contextBlock}${industryBlock}
Recent news about ${clientName}:
${articleList || 'No recent news found.'}

THE FIVE CONVERSATIONS — choose the strongest door for this client based on the signals above:
- Conv 1 · Govern Your Data (watsonx.data + Confluent): AI ambition slow to ship, data platform sprawl, residency/localisation exposure, regulated data. Account signals: talks AI but ships slowly; several data platforms; data-residency exposure; bank/insurer/health/public sector.
- Conv 2 · Connect & Automate (watsonx Orchestrate + webMethods): middleware sprawl, M&A integration debt, live agent pilots, stalled RPA. Account signals: visible middleware sprawl; M&A systems still unwired; public agentic ambition; stalled automation programme.
- Conv 3 · Trust Every Identity (Verify + Vault): zero-trust or audit mandate, DORA-style regulation, IAM modernisation, fast-growing agent/machine identities. Account signals: board-level security mandate; regulatory deadline; IAM on the roadmap; agents scaling fast.
- Conv 4 · Run Anywhere (Terraform + Vault + Cloudability + Concert): multi-cloud or cloud-exit noise, board scrutiny on cloud cost, sovereignty/residency driving workload placement. Account signals: cloud cost has become a board question; concentration-risk regulation; multi-cloud or repatriation noise.
- Conv 5 · Build & Modernise (IBM Bob): large legacy estate, stalled modernisation, ungoverned AI coding spend, delivery pressure. Account signals: mainframe/COBOL/ageing core; modernisation announced or stalled; AI coding adoption with unclear governance. CLAIM DISCIPLINE: IBM Bob on-premises GA target 30 Sep 2026 — say "a path to on-premises", never "available today".
- Conv L · Lightwell (QUALIFYING PATH — never open cold): Surfaces when this account names open-source CVE exposure they own but cannot fix. Account signals: pinned dependencies they cannot upgrade; security exceptions being renewed; community Kafka/Terraform/Ansible; patch-to-production over 45 days; scanner output with no remediation owner. Two qualifying questions: (1) Can you move to the remediated version or do you need a fix at your current version? (2) How long does a fix take to reach production? Claim discipline: no SLAs, no trial, no pricing; Clearinghouse Premier is gated; Java/Maven + Python/PyPI scope today; route to your Red Hat counterpart.

COMPETITIVE COUNTERS (use in talkingPoints if a competitor is active at this account):
- vs Snowflake/Databricks → Conv 1: portability + governance across all data, not inside one estate
- vs MuleSoft/Boomi → Conv 2: agent control plane + total estate cost, not one connector's features
- vs Okta/Entra → Conv 3: they keep their IAM for humans; the gap is machines, secrets, and agents
- vs hyperscaler native stack → Conv 4: can you run, govern, and prove the same way everywhere?
- vs GitHub Copilot/Cursor → Conv 5: whole lifecycle + governed spend, not just autocomplete
- vs Snyk/Chainguard/Athena → Conv L: scanning is not fixing; Lightwell supplies the signed fix at the version they already run; treat as complementary, not either/or

THE FIVE-STEP MOTION — structure the ATL's approach:
1. OPEN: TSL + ATL together at C-suite altitude. Lead with a diagnostic question, not a pitch.
2. WHY CHANGE: Surface the cost of standing still. The unconsidered need the client has not yet named.
3. SHAPE: Draw the product-blind architecture bottom-to-top. Hand the pen to the client. Name no product until they point at a layer.
4. WHY IBM: Control built, not granted. IBM delivers the architecture as something the client owns.
5. PROGRESS: Agree a client step — a review, workshop, or PoC. TSL structures the path.

BRIEF STRUCTURE:

1. situationSummary: 2-3 sentences. Lead with the client's most pressing challenge based on the signals. Frame using Why Change language — the cost of standing still. Surface the unconsidered need.

2. conversationDoor: Which of the five conversations to open. State the door and one sentence on why these signals point there.

3. whyChange: The specific cost of standing still for THIS client. One or two sentences. Do not mention IBM.

4. talkingPoints: EXACTLY 3 points. Each structured as: [${clientIndustry || 'enterprise'} challenge] + [why this matters NOW] + [IBM product from the conversation door — named last, after the challenge is clear]. Peer CTO tone. Not a vendor pitch.

5. proofPoint: ONE stat grounded in the runbook or IBM evidence:
   - Conv 1: "Under 1% of enterprise data is AI-ready — the bottleneck is governed access, not the model"
   - Conv 2: "Agents are proliferating across teams with no central record of what acts or what it can reach"
   - Conv 3: "Non-human identities now outnumber humans and grow with every agent deployed"
   - Conv 4: "Where you run decides what you can prove, move, and pay"
   - Conv 5: "A coding assistant speeds one slice — planning, testing, modernisation, and the bill stay manual"

6. riskFlags: Specific risks only — reputational, competitive, regulatory, C-suite changes relevant to this client. Omit if none.

7. openingQuestion: Hypothesis for the ATL to test with the client CTO at the Open step:
   "I've been thinking that [observation grounded in today's signals] — is that consistent with what you're seeing?"
   Peer CTO tone. Tests a point of view. Does not probe or pitch.

8. atlNote: One sentence for the ATL — what to watch for or act on this week using the five-step motion.

9. slackMessage: Under 280 characters. Format:
   *${clientName} — Signal Alert*
   📊 [situation] 💡 [talking point] ⚡ [IBM angle] 💬 Q: [opener]

Return ONLY valid JSON:
{
    "situationSummary": "2-3 sentences, Why Change framing, unconsidered need",
    "conversationDoor": "Conv 1 | Conv 2 | Conv 3 | Conv 4 | Conv 5 — one sentence on why",
    "whyChange": "Cost of standing still for this client, no IBM mention",
    "talkingPoints": ["3 points: challenge + why now + IBM product last"],
    "proofPoint": "One stat from the runbook proof points above",
    "riskFlags": ["Specific risks only, omit array if none"],
    "openingQuestion": "Hypothesis-framed, peer CTO tone, grounded in today's signals",
    "atlNote": "One sentence, five-step motion reference",
    "slackMessage": "Under 280 chars"
}`;
        
        try {
            // COST OPTIMIZATION: Use unified API helper with token tracking
            const { text } = await callAI('STRATEGIC_ANALYSIS', prompt, 900, apiKey);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const brief = JSON.parse(jsonMatch[0]);

                // Store slackMessage for the Copy for Slack button (Phase 2)
                this._lastMeetingBriefSlack = brief.slackMessage || '';

                // Show/hide the Copy for Slack button based on availability
                const slackBtn = document.getElementById('copy-slack-btn');
                if (slackBtn) slackBtn.classList.toggle('hidden', !brief.slackMessage);

                bodyEl.innerHTML = `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">📊 Situation</div>
                        <div class="meeting-brief-text">${this.escapeHtml(brief.situationSummary || '')}</div>
                    </div>
                    ${(brief.conversationDoor || brief.leadPillar) ? `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">🗣️ Conversation Door</div>
                        <div class="meeting-brief-text"><strong>${this.escapeHtml(brief.conversationDoor || brief.leadPillar)}</strong></div>
                    </div>
                    ${brief.whyChange ? `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">⚡ Why Change</div>
                        <div class="meeting-brief-text">${this.escapeHtml(brief.whyChange)}</div>
                    </div>` : ''}` : ''}
                    ${brief.proofPoint ? `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">📊 Proof Point</div>
                        <div class="meeting-brief-text meeting-brief-proof-point">${this.escapeHtml(brief.proofPoint)}</div>
                    </div>` : ''}
                    ${brief.atlNote ? `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">👤 ATL Note</div>
                        <div class="meeting-brief-text meeting-brief-atl-note">${this.escapeHtml(brief.atlNote)}</div>
                    </div>` : ''}
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">💡 Talking Points</div>
                        <ul class="meeting-brief-list">
                            ${(brief.talkingPoints || []).map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}
                        </ul>
                    </div>
                    ${(brief.riskFlags || []).length > 0 ? `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">⚠️ Risk Flags</div>
                        <ul class="meeting-brief-list meeting-brief-risks">
                            ${brief.riskFlags.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">💬 Opening Question</div>
                        <div class="meeting-brief-text meeting-brief-opener">${this.escapeHtml(brief.openingQuestion || '')}</div>
                    </div>
                    ${clientArticles.length > 0 ? `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">📰 Source Articles (${clientArticles.length})</div>
                        ${clientArticles.map(a => `
                            <div class="meeting-brief-article">
                                <span class="meeting-brief-source">${this.escapeHtml(a.sourceName)}</span>
                                <span class="meeting-brief-title" onclick="closeMeetingBrief(); app.openArticle('${this.escapeAttr(a.id)}')">${this.escapeHtml(a.title.substring(0, 80))}${a.title.length > 80 ? '...' : ''}</span>
                            </div>`).join('')}
                    </div>` : ''}`;
            } else {
                bodyEl.innerHTML = '<div class="meeting-brief-error">Could not parse AI response.</div>';
            }
        } catch (error) {
            bodyEl.innerHTML = `<div class="meeting-brief-error">Brief generation failed: ${this.escapeHtml(error.message)}</div>`;
        }
    }

    copyMeetingBriefSlack() {
        const slackText = this._lastMeetingBriefSlack;
        if (!slackText) return;
        navigator.clipboard.writeText(slackText).then(() => {
            const btn = document.getElementById('copy-slack-btn');
            if (btn) {
                const original = btn.textContent;
                btn.textContent = '✓ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 2000);
            }
        });
    }

    // ==========================================
    // Export
    // ==========================================

    exportBrief() {
        if (this.dailyArticles.length === 0 && !this.digest) {
            alert('No digest to export yet. Please refresh first.');
            return;
        }
        
        const lines = [];
        const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        lines.push(`# The Signal Today — Field CTO Brief`);
        lines.push(`## ${date}`);
        lines.push('');
        lines.push('**IBM APAC** | 115 ATLs | 343 Accounts | 5 Markets (ANZ, ASEAN, GCG, ISA, KOREA)');
        lines.push('');
        lines.push('---');
        lines.push('');
        
        // Today's Signals - grouped by action type
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
            if (cached) {
                const { signals } = JSON.parse(cached);
                if (signals && signals.length > 0) {
                    lines.push('## ⚡ TODAY\'S SIGNALS');
                    lines.push('');
                    
                    // Group by action type
                    const escalate = signals.filter(s => s.actionType === 'ESCALATE');
                    const briefAtl = signals.filter(s => s.actionType === 'BRIEF_ATL');
                    const position = signals.filter(s => s.actionType === 'POSITION');
                    const monitor = signals.filter(s => s.actionType === 'MONITOR' || !s.actionType);
                    
                    if (escalate.length > 0) {
                        lines.push('### 🚨 ESCALATE (Action within 48 hours)');
                        lines.push('');
                        for (const signal of escalate) {
                            this._formatSignalForExport(signal, lines);
                        }
                    }
                    
                    if (briefAtl.length > 0) {
                        lines.push('### 📢 BRIEF ATL (Prepare team talking points)');
                        lines.push('');
                        for (const signal of briefAtl) {
                            this._formatSignalForExport(signal, lines);
                        }
                    }
                    
                    if (position.length > 0) {
                        lines.push('### 🎯 POSITION (Develop IBM response)');
                        lines.push('');
                        for (const signal of position) {
                            this._formatSignalForExport(signal, lines);
                        }
                    }
                    
                    if (monitor.length > 0) {
                        lines.push('### 👁️ MONITOR (Track for escalation)');
                        lines.push('');
                        for (const signal of monitor) {
                            this._formatSignalForExport(signal, lines);
                        }
                    }
                }
            }
        } catch (e) { /* ignore cache errors */ }
        
        // Client Radar by Market
        const clientArticles = this.dailyArticles.filter(a => a.matchedClients && a.matchedClients.length > 0);
        if (clientArticles.length > 0) {
            lines.push('## 📍 CLIENT RADAR');
            lines.push('');
            
            // Group by market
            const byMarket = {};
            for (const a of clientArticles) {
                for (const clientName of a.matchedClients) {
                    const clientObj = this.clients.find(c => c.name === clientName);
                    if (!clientObj) continue;
                    const market = clientObj.market || 'OTHER';
                    if (!byMarket[market]) byMarket[market] = {};
                    if (!byMarket[market][clientName]) byMarket[market][clientName] = { client: clientObj, articles: [] };
                    if (!byMarket[market][clientName].articles.some(x => x.id === a.id)) {
                        byMarket[market][clientName].articles.push(a);
                    }
                }
            }
            
            for (const market of ['ANZ', 'ASEAN', 'GCG', 'ISA', 'KOREA']) {
                if (!byMarket[market]) continue;
                const clientCount = Object.keys(byMarket[market]).length;
                lines.push(`### ${market} (${clientCount} clients with signals)`);
                lines.push('');
                
                // Sort by tier
                const sortedClients = Object.entries(byMarket[market])
                    .sort((a, b) => (a[1].client.tier || 2) - (b[1].client.tier || 2));
                
                for (const [clientName, data] of sortedClients) {
                    const { client, articles } = data;
                    const signalType = articles[0]?.signalType || 'signal';
                    const signalEmoji = { risk: '🔴', opportunity: '🟡', relationship: '🟢', regulatory: '🛡️', ibm: '🔵' }[signalType] || '⚪';
                    
                    lines.push(`**${signalEmoji} ${clientName}** — Tier ${client.tier} | ${client.industry || 'N/A'}`);
                    if (client.atl) lines.push(`ATL: ${client.atl}`);
                    for (const a of articles.slice(0, 2)) {
                        lines.push(`- ${a.title} (${a.sourceName})`);
                    }
                    lines.push('');
                }
            }
        }
        
        // Market Insights by Market
        lines.push('## 📢 MARKET INSIGHTS');
        lines.push('');
        lines.push('*Market-specific intelligence briefs*');
        lines.push('');
        
        // Generate brief for each market
        const atlBriefs = this._generateATLBriefsForExport();
        for (const [market, brief] of Object.entries(atlBriefs)) {
            if (brief.length > 0) {
                lines.push(`### ${market}`);
                lines.push('```');
                lines.push(brief);
                lines.push('```');
                lines.push('');
            }
        }
        
        // Deep Reads
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.DEEP_READS);
            if (cached) {
                const { insights } = JSON.parse(cached);
                if (insights && insights.length > 0) {
                    lines.push('## 📚 DEEP READS');
                    lines.push('');
                    lines.push('*Strategic content for CxO conversations*');
                    lines.push('');
                    
                    for (const insight of insights) {
                        lines.push(`### ${insight.title}`);
                        if (insight.timeHorizon) lines.push(`*${insight.timeHorizon} horizon*`);
                        lines.push('');
                        if (insight.strategicThesis) lines.push(`**💡 Strategic Thesis:** ${insight.strategicThesis}`);
                        if (insight.leadershipImplication) lines.push(`**📊 Leadership Implication:** ${insight.leadershipImplication}`);
                        if (insight.cxoQuestion) lines.push(`**🎯 CxO Question:** "${insight.cxoQuestion}"`);
                        lines.push('');
                    }
                }
            }
        } catch (e) { /* ignore cache errors */ }
        
        // Competitive Landscape - use DEAL_RELEVANCE_SIGNALS if available
        const competitorPattern = typeof DEAL_RELEVANCE_SIGNALS !== 'undefined'
            ? new RegExp(DEAL_RELEVANCE_SIGNALS.COMPETITOR_KEYWORDS.slice(0, 30).join('|'), 'i')
            : /microsoft|aws|azure|google cloud|accenture|deloitte|servicenow|salesforce/i;
        
        const competitiveArticles = this.dailyArticles
            .filter(a => a.signalType === 'risk' || competitorPattern.test(a.title))
            .slice(0, 5);
        
        if (competitiveArticles.length > 0) {
            lines.push('## ⚔️ COMPETITIVE LANDSCAPE');
            lines.push('');
            for (const a of competitiveArticles) {
                const competitors = this._extractCompetitors(a.title + ' ' + (a.summary || ''));
                lines.push(`- **${a.title}** (${a.sourceName})`);
                if (competitors.length > 0) {
                    const competitorList = competitors.map(c => {
                        if (c.ibm) {
                            return `${c.name} → IBM: ${c.ibm}`;
                        }
                        return c.name;
                    }).join('; ');
                    lines.push(`  ${competitorList}`);
                }
            }
            lines.push('');
        }
        
        // Footer
        lines.push('---');
        lines.push('');
        lines.push(`*Generated by The Signal Today | ${new Date().toISOString()}*`);
        
        const content = lines.join('\n');
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signal-field-cto-brief-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    _formatSignalForExport(signal, lines) {
        const markets = (signal.affectedMarkets || []).join(', ');
        const wave = signal.wave ? `[${signal.wave}]` : '';
        const competitive = signal.competitive ? `⚔️ ${signal.competitive}` : '';
        
        lines.push(`**${signal.headline}** ${wave} ${competitive}`);
        if (markets) lines.push(`📍 Markets: ${markets}`);
        if (signal.context) lines.push(`${signal.context}`);
        if (signal.action) lines.push(`▶️ **Action:** ${signal.action}`);
        if (signal.talkingPoint) lines.push(`💬 **ATL Talking Point:** "${signal.talkingPoint}"`);
        if (signal.ibmAngle) lines.push(`🔵 **IBM Position:** ${signal.ibmAngle}`);
        lines.push('');
    }
    
    _generateATLBriefsForExport() {
        const briefs = { ANZ: '', ASEAN: '', GCG: '', ISA: '', KOREA: '' };
        const articles = this.dailyArticles.length > 0 ? this.dailyArticles : this.articles.slice(0, 30);
        
        // Group signals by market
        const marketSignals = { ANZ: [], ASEAN: [], GCG: [], ISA: [], KOREA: [] };
        
        for (const article of articles) {
            // Client-specific signals
            if (article.matchedClients && article.matchedClients.length > 0) {
                for (const clientName of article.matchedClients) {
                    const client = this.clients.find(c => c.name === clientName);
                    if (client && marketSignals[client.market]) {
                        marketSignals[client.market].push({
                            type: 'client',
                            prefix: `🎯 ${clientName}`,
                            title: article.title,
                            source: article.sourceName
                        });
                    }
                }
            }
            
            // Industry signals
            if (article.matchedIndustry || article.matchedIndustries?.length > 0) {
                const industry = article.matchedIndustry || article.matchedIndustries[0];
                // Find which markets have clients in this industry
                const marketsForIndustry = [...new Set(
                    this.clients
                        .filter(c => c.industry === industry)
                        .map(c => c.market)
                        .filter(m => marketSignals[m])
                )];
                
                for (const market of marketsForIndustry) {
                    marketSignals[market].push({
                        type: 'industry',
                        prefix: `📌 ${industry}`,
                        title: article.title,
                        source: article.sourceName
                    });
                }
            }
        }
        
        // Format briefs
        for (const [market, signals] of Object.entries(marketSignals)) {
            if (signals.length === 0) continue;
            
            const uniqueSignals = signals
                .filter((s, i, arr) => arr.findIndex(x => x.title === s.title) === i)
                .slice(0, 4);
            
            const date = new Date().toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' });
            const briefLines = [
                `📡 The Signal Today | ${market} | ${date}`,
                ''
            ];
            
            for (const s of uniqueSignals) {
                briefLines.push(`${s.prefix}: ${s.title} (${s.source})`);
            }
            
            briefs[market] = briefLines.join('\n');
        }
        
        return briefs;
    }
    
    _extractCompetitors(text) {
        const competitors = [];
        const lowerText = text.toLowerCase();
        
        // Use COMPETITIVE_POSITIONING from sources.js if available
        if (typeof COMPETITIVE_POSITIONING !== 'undefined') {
            // Group by IBM solution to avoid duplicates
            const found = new Set();
            for (const [competitor, position] of Object.entries(COMPETITIVE_POSITIONING)) {
                if (lowerText.includes(competitor.toLowerCase())) {
                    // Normalize competitor names
                    let name = competitor;
                    if (competitor.includes('azure') || competitor.includes('microsoft')) name = 'Microsoft/Azure';
                    else if (competitor.includes('aws') || competitor.includes('amazon') || competitor.includes('bedrock')) name = 'AWS';
                    else if (competitor.includes('google') || competitor.includes('vertex') || competitor.includes('gemini')) name = 'Google Cloud';
                    else if (competitor === 'copilot' || competitor === 'github copilot') name = 'Microsoft Copilot';
                    else name = competitor.charAt(0).toUpperCase() + competitor.slice(1);
                    
                    if (!found.has(name)) {
                        found.add(name);
                        competitors.push({ name, ibm: position.ibm, angle: position.angle });
                    }
                }
            }
        } else {
            // Fallback to basic patterns
            const competitorPatterns = [
                { pattern: /microsoft|azure/i, name: 'Microsoft/Azure' },
                { pattern: /aws|amazon web services/i, name: 'AWS' },
                { pattern: /google cloud|gcp|vertex ai/i, name: 'Google Cloud' },
                { pattern: /accenture/i, name: 'Accenture' },
                { pattern: /deloitte/i, name: 'Deloitte' }
            ];
            
            for (const { pattern, name } of competitorPatterns) {
                if (pattern.test(text)) {
                    competitors.push({ name, ibm: null, angle: null });
                }
            }
        }
        
        return competitors;
    }

    // ==========================================
    // ATL Briefs Copy All
    // ==========================================

    copyAllMarketBriefs() {
        const briefs = document.querySelectorAll('.market-brief');
        if (briefs.length === 0) {
            showToast('No market briefs to copy');
            return;
        }
        
        const allText = Array.from(briefs).map(brief => {
            return brief.dataset.copyText || brief.textContent.trim();
        }).join('\n\n---\n\n');
        
        navigator.clipboard.writeText(allText).then(() => {
            showToast('All market briefs copied to clipboard');
        }).catch(() => {
            showToast('Failed to copy');
        });
    }

    // ==========================================
    // GTM Weekly Digest (Phase 3)
    // ==========================================

    openGTMDigest() {
        const modal = document.getElementById('gtm-digest-modal');
        if (!modal) return;

        if (this.weeklyArticles.length === 0 && !this.digest) {
            alert('No digest available yet. Please refresh first.');
            return;
        }

        const bodyEl = document.getElementById('gtm-digest-body');
        if (bodyEl) bodyEl.innerHTML = '<div class="meeting-brief-loading">🤖 Generating GTM digest...</div>';

        const copyBtn = document.getElementById('copy-gtm-btn');
        if (copyBtn) copyBtn.classList.add('hidden');

        modal.classList.remove('hidden');
        this.generateGTMDigest();
    }

    async generateGTMDigest() {
        const settings = getAIProviderSettings();
        const apiKey = settings.apiKeys[settings.provider];
        const bodyEl = document.getElementById('gtm-digest-body');
        const copyBtn = document.getElementById('copy-gtm-btn');
        if (!bodyEl) return;

        const date = new Date().toLocaleDateString('en-SG', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Build market-grouped client signals
        const marketSignals = { ANZ: [], ASEAN: [], GCG: [], ISA: [], KOREA: [] };
        for (const article of this.dailyArticles.filter(a => a.matchedClients && a.matchedClients.length > 0)) {
            for (const clientName of article.matchedClients) {
                const clientObj = this.clients.find(c => c.name === clientName);
                if (!clientObj || clientObj.tier > 2) continue;
                const market = clientObj.market || 'ASEAN';
                if (marketSignals[market]) {
                    marketSignals[market].push({
                        client: clientName,
                        tier: clientObj.tier,
                        industry: clientObj.industry || 'Other',
                        title: article.title,
                        signalType: article.signalType || 'signal',
                        url: article.url
                    });
                }
            }
        }
        
        const marketSignalBlock = Object.entries(marketSignals)
            .filter(([_, signals]) => signals.length > 0)
            .map(([market, signals]) => {
                const lines = signals.slice(0, 3).map(s => {
                    const signalEmoji = { risk: '🔴', opportunity: '🟡', relationship: '🟢', regulatory: '🛡️', ibm: '🔵' }[s.signalType] || '⚪';
                    return `- ${signalEmoji} ${s.client} (${s.industry}, Tier ${s.tier}): ${s.title}`;
                });
                return `${market}:\n${lines.join('\n')}`;
            }).join('\n\n') || 'No Tier 1/2 client signals today.';

        // Get Today's Signals from cache for escalation items
        let escalationItems = [];
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
            if (cached) {
                const { signals } = JSON.parse(cached);
                escalationItems = (signals || [])
                    .filter(s => s.actionType === 'ESCALATE' || s.actionType === 'BRIEF_ATL')
                    .map(s => `[${s.actionType}] ${s.headline}: ${s.action}`);
            }
        } catch (e) { /* ignore */ }
        const escalationBlock = escalationItems.length > 0 
            ? escalationItems.join('\n') 
            : 'No escalation items today.';

        // Top 5 weekly articles
        const topArticles = this.weeklyArticles.slice(0, 5);
        const topArticleList = topArticles.map(a =>
            `- ${a.title} (${a.sourceName}) — ${a.url}`
        ).join('\n');

        // Competitive signals with IBM positioning
        const competitiveArticles = this.dailyArticles
            .filter(a => a.signalType === 'risk' || /microsoft|aws|azure|google cloud|accenture|deloitte|servicenow|salesforce|snowflake|databricks/i.test(a.title))
            .slice(0, 3);
        
        const competitiveBlock = competitiveArticles.length > 0
            ? competitiveArticles.map(a => {
                const text = (a.title + ' ' + (a.summary || '')).toLowerCase();
                let ibmPosition = '';
                
                // Use COMPETITIVE_POSITIONING from sources.js
                if (typeof COMPETITIVE_POSITIONING !== 'undefined') {
                    for (const [competitor, position] of Object.entries(COMPETITIVE_POSITIONING)) {
                        if (text.includes(competitor.toLowerCase())) {
                            ibmPosition = ` → IBM: ${position.ibm} (${position.angle})`;
                            break;
                        }
                    }
                }
                
                return `- ${a.title} (${a.sourceName})${ibmPosition}`;
            }).join('\n')
            : 'No competitive signals today.';

        // This week's context
        const weekContextBlock = this.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT:\n${this.settings.thisWeekContext}\n`
            : '';

        if (!apiKey) {
            // No API key: produce a comprehensive plain-text digest
            
            // Get Deep Reads insights if available
            let deepReadsBlock = '';
            try {
                const cached = localStorage.getItem(STORAGE_KEYS.DEEP_READS);
                if (cached) {
                    const { insights } = JSON.parse(cached);
                    if (insights && insights.length > 0) {
                        deepReadsBlock = insights.slice(0, 3).map(i => 
                            `- ${i.title}${i.timeHorizon ? ` (${i.timeHorizon})` : ''}`
                        ).join('\n');
                    }
                }
            } catch (e) { /* ignore */ }
            
            const lines = [
                `Subject: IBM APAC Field CTO — Weekly Intelligence Brief | ${date}`,
                '',
                '================================================================================',
                'FIELD CTO CONTEXT',
                '================================================================================',
                '115 ATLs | 343 Accounts | 5 Markets (ANZ, ASEAN, GCG, ISA, KOREA)',
                'Five Conversations: Govern Data · Connect & Automate · Trust Identity · Run Anywhere · Build & Modernise',
                '',
                '================================================================================',
                'ESCALATION & BRIEFING ITEMS',
                '================================================================================',
                escalationBlock,
                '',
                '================================================================================',
                'CLIENT SIGNALS BY MARKET',
                '================================================================================',
                marketSignalBlock,
                '',
                '================================================================================',
                'COMPETITIVE LANDSCAPE',
                '================================================================================',
                competitiveBlock,
                ''
            ];
            
            if (deepReadsBlock) {
                lines.push('================================================================================');
                lines.push('STRATEGIC READS');
                lines.push('================================================================================');
                lines.push(deepReadsBlock);
                lines.push('');
            }
            
            lines.push('================================================================================');
            lines.push('TOP ARTICLES');
            lines.push('================================================================================');
            lines.push(topArticleList || 'No articles available.');
            lines.push('');
            lines.push('---');
            lines.push('Add a Claude API key in Settings for AI-enhanced GTM digests with');
            lines.push('talking points, IBM positioning, and market-specific actions.');
            
            const text = lines.join('\n');
            this._lastGTMDigestText = text;
            bodyEl.innerHTML = `<pre class="gtm-digest-text">${this.escapeHtml(text)}</pre>
                <p class="form-hint">Add a Claude API key in Settings for AI-enhanced GTM digests with talking points and IBM positioning.</p>`;
            if (copyBtn) copyBtn.classList.remove('hidden');
            return;
        }

        const prompt = `Write a weekly intelligence email FROM the IBM APAC Field CTO TO 115 ATLs across 5 APAC markets.

CONTEXT:
- You ARE the Field CTO leading 115 ATLs engaging 343 enterprise accounts
- Markets: ANZ, ASEAN, GCG, ISA, KOREA
- Each ATL manages 2-3 clients in "cockpit model" with TSL
- Goal: Earn "Client CTO" posture, increase IBM share
- Five Conversations framework: map every signal to the relevant conversation door

VOICE: First person, direct, action-oriented. Senior technical leader, not corporate comms. "Here's what I'm seeing..." not "The following observations..."

FORMAT: Plain text, ALL CAPS headers, dashes for lists, scannable in 60 seconds.
${weekContextBlock}
ESCALATION & BRIEFING ITEMS:
${escalationBlock}

CLIENT SIGNALS BY MARKET:
${marketSignalBlock}

COMPETITIVE LANDSCAPE:
${competitiveBlock}

TOP ARTICLES:
${topArticleList || 'No articles available.'}

Structure (plain text):

Subject: IBM APAC Field CTO — Weekly ATL Intelligence Brief | ${date}

WHAT TO LEAD WITH THIS WEEK
[2-3 sentences. Single IBM message for ATLs. Name the conversation door to open. Specific call to action.]

ESCALATION ITEMS
[If ESCALATE signals: client/market + what ATL should do. If none: "No escalation items this week — but stay close to your Tier 1s."]

ACTION ITEMS BY MARKET
[For each market with signals:]
[MARKET NAME]
- [Client]: [Signal + what ATL should do THIS WEEK]
[Max 3 per market. Skip markets with no signals.]

COMPETITIVE WATCH
[2-3 sentences on threats/opportunities. Name competitors + IBM counter-position + specific solutions.]

ATL TALKING POINTS
[Exactly 3 conversational one-liners for client CTOs. Peer CTO tone, not sales pitch. Max 25 words each. Each should name the conversation door it opens.]
1. [Agentic arc — Conv 2 or Conv 5]
2. [Sovereignty arc — Conv 3 or Conv 4]
3. [IBM strategic positioning — any conversation door]

IBM POSITIONING THIS WEEK
[1-2 sentences on which IBM solutions to emphasize and why.]

CALL TO ACTION
[1-2 specific actions for ALL ATLs. Name IBM asset, conversation type, or follow-up. Start with verbs.]

TOP READS
[3-5 articles: title + URL. After each: ONE sentence on why ATL should care.]`;

        try {
            // COST OPTIMIZATION: Use unified API helper with token tracking
            const { text } = await callAI('MULTI_SOURCE_ANALYSIS', prompt, 1500, apiKey);

            this._lastGTMDigestText = text;
            bodyEl.innerHTML = `<pre class="gtm-digest-text">${this.escapeHtml(text)}</pre>`;
            if (copyBtn) copyBtn.classList.remove('hidden');

        } catch (error) {
            bodyEl.innerHTML = `<div class="meeting-brief-error">GTM digest generation failed: ${this.escapeHtml(error.message)}</div>`;
        }
    }

    copyGTMDigest() {
        const text = this._lastGTMDigestText;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copy-gtm-btn');
            if (btn) {
                const original = btn.textContent;
                btn.textContent = '✓ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 2000);
            }
        });
    }

    copyStarter(index) {
        const starters = this.digest?.conversationStarters || [];
        if (starters[index]) {
            const text = starters[index].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            navigator.clipboard.writeText(text);
            
            const btn = document.querySelectorAll('.starter-copy')[index];
            btn.textContent = '✓';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋';
                btn.classList.remove('copied');
            }, 2000);
        }
    }

    // ==========================================
    // Settings
    // ==========================================

    openSettings() {
        // Get current provider settings with backward compatibility
        const currentProvider = localStorage.getItem('signal_ai_provider') || AI_PROVIDERS.CLAUDE;
        const legacyApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || localStorage.getItem('apiKey');
        
        // Populate provider selector
        const providerSelect = document.getElementById('ai-provider');
        if (providerSelect) {
            providerSelect.value = currentProvider;
        }
        
        // Populate API keys for each provider
        const claudeKeyEl = document.getElementById('claude-api-key');
        if (claudeKeyEl) {
            claudeKeyEl.value = localStorage.getItem('signal_claude_api_key') || legacyApiKey || '';
        }
        
        const openaiKeyEl = document.getElementById('openai-api-key');
        if (openaiKeyEl) {
            openaiKeyEl.value = localStorage.getItem('signal_openai_api_key') || '';
        }
        
        // Show/hide appropriate API key fields
        toggleProviderAPIKeys();
        
        // Populate new fields if they exist in the DOM
        const weekContextEl = document.getElementById('week-context');
        if (weekContextEl) weekContextEl.value = this.settings.thisWeekContext || '';
        
        const autoRefreshEl = document.getElementById('auto-refresh-time');
        if (autoRefreshEl) autoRefreshEl.value = this.settings.autoRefreshTime || '';
        
        // Populate intelligence settings
        const intelligenceEnabledEl = document.getElementById('intelligence-enabled');
        if (intelligenceEnabledEl) {
            intelligenceEnabledEl.checked = this.settings.intelligenceEnabled !== false;
        }
        
        const costLimitEl = document.getElementById('intelligence-cost-limit');
        if (costLimitEl) {
            costLimitEl.value = this.settings.intelligenceCostLimit || 5.00;
        }
        
        const minConfidenceEl = document.getElementById('intelligence-min-confidence');
        const confidenceDisplayEl = document.getElementById('confidence-display');
        if (minConfidenceEl) {
            const confidence = this.settings.intelligenceMinConfidence || 0.7;
            minConfidenceEl.value = confidence;
            if (confidenceDisplayEl) {
                confidenceDisplayEl.textContent = Math.round(confidence * 100) + '%';
            }
            // Update display on slider change
            minConfidenceEl.oninput = function() {
                if (confidenceDisplayEl) {
                    confidenceDisplayEl.textContent = Math.round(this.value * 100) + '%';
                }
            };
        }
        
        // Display intelligence stats in settings
        this.renderIntelligenceStatsInSettings();
        
        // Render industry settings
        this.renderIndustrySettings();
        
        // Render disabled sources (Phase 8)
        this.renderDisabledSources();
        
        // Render sources list
        currentSourceFilter = 'all';
        document.getElementById('sources-category-filter').value = 'all';
        renderSourcesList();
        updateSourcesCount();
        
        document.getElementById('settings-modal').classList.remove('hidden');
        // Auto-focus the active API key field
        setTimeout(() => {
            const provider = localStorage.getItem('signal_ai_provider') || 'claude';
            const keyEl = document.getElementById(`${provider}-api-key`);
            if (keyEl && !keyEl.closest('.hidden')) keyEl.focus();
        }, 50);
    }

    renderIntelligenceStatsInSettings() {
        // Use the new comprehensive performance dashboard
        displayPerformanceStats();

        // Keep the old stats display for backward compatibility
        const container = document.getElementById('settings-intelligence-stats');
        if (!container) return;
        
        const stats = this.intelligenceEngine?.getStats();
        
        // Get current provider settings
        const settings = getAIProviderSettings();
        const currentProvider = settings.provider;
        
        // Get current tab state (default to 'current')
        if (!window.statsTabState) {
            window.statsTabState = 'current';
        }
        
        // Get token usage summary based on active tab
        const providerFilter = window.statsTabState === 'current' ? currentProvider : null;
        const tokenStats = getTokenUsageSummary(providerFilter);
        
        // Use actual stats properties with safe defaults
        const tier3Cost = stats?.tier3Cost || 0;
        const tier1Processed = stats?.tier1Processed || 0;
        const tier2Processed = stats?.tier2Processed || 0;
        const tier3Processed = stats?.tier3Processed || 0;
        
        // Calculate pass rates
        const tier1PassRate = tier1Processed > 0
            ? `${Math.round((tier2Processed / tier1Processed) * 100)}%`
            : 'N/A';
        const tier2PassRate = tier2Processed > 0
            ? `${Math.round((tier3Processed / tier2Processed) * 100)}%`
            : 'N/A';
        
        // Format token usage by model with provider info
        const modelBreakdown = Object.entries(tokenStats.byModel || {}).map(([model, data]) => {
            let modelName = '🤖 AI';
            let provider = '';
            
            // Detect provider and tier from model name
            if (model.includes('claude')) {
                provider = 'Claude';
                modelName = model.includes('haiku') ? '⚡ Haiku' : '🧠 Sonnet';
            } else if (model.includes('gpt')) {
                provider = 'OpenAI';
                modelName = model.includes('mini') ? '⚡ GPT-4o-mini' : '🧠 GPT-4o';
            }
            
            return `
                <div class="stat-item">
                    <div class="stat-label">${modelName} (${provider})</div>
                    <div class="stat-value">${data.calls} calls</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">${modelName} Cost</div>
                    <div class="stat-value">$${data.cost.toFixed(4)}</div>
                </div>
            `;
        }).join('');
        
        const totalCost = tokenStats.estimatedCost + tier3Cost;
        const costFormatted = totalCost < 0.01 ? '<$0.01' : `$${totalCost.toFixed(4)}`;
        
        // Get provider display name
        const providerDisplayName = currentProvider === 'claude' ? 'Claude' : 'OpenAI';
        
        // Check if there's no data for current provider
        const noDataMessage = tokenStats.totalCalls === 0 && window.statsTabState === 'current'
            ? `<div class="stat-item" style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #666;">
                   <p>📊 No usage data yet for ${providerDisplayName}</p>
                   <p style="font-size: 0.9em; margin-top: 8px;">Switch to "All Providers" to see complete history</p>
               </div>`
            : '';
        
        container.innerHTML = `
            <div class="stats-tab-bar">
                <button class="stats-tab ${window.statsTabState === 'current' ? 'active' : ''}"
                        onclick="switchStatsTab('current')">
                    Current Provider (${providerDisplayName})
                </button>
                <button class="stats-tab ${window.statsTabState === 'all' ? 'active' : ''}"
                        onclick="switchStatsTab('all')">
                    All Providers
                </button>
            </div>
            <div class="intelligence-stats-grid">
                ${noDataMessage || `
                <div class="stat-item">
                    <div class="stat-label">📊 Today's API Calls</div>
                    <div class="stat-value">${tokenStats.totalCalls}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">💰 Today's Cost</div>
                    <div class="stat-value">${costFormatted}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">📥 Input Tokens</div>
                    <div class="stat-value">${tokenStats.totalInputTokens.toLocaleString()}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">📤 Output Tokens</div>
                    <div class="stat-value">${tokenStats.totalOutputTokens.toLocaleString()}</div>
                </div>
                ${modelBreakdown}
                <div class="stat-item">
                    <div class="stat-label">🔍 Articles Analyzed</div>
                    <div class="stat-value">${tier1Processed}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">T1→T2 Pass Rate</div>
                    <div class="stat-value">${tier1PassRate}</div>
                </div>
                `}
            </div>
            <p class="form-hint" style="margin-top: 12px;">
                💡 <strong>Cost Optimization:</strong> Haiku ($0.80/1M) for summaries, Sonnet ($3/1M) for strategic analysis.
                Sections auto-cache (8-24h) to avoid redundant calls.
            </p>
            <button class="btn btn-sm btn-secondary" onclick="resetTokenStats(); app.renderIntelligenceStatsInSettings();" style="margin-top: 8px;">
                🔄 Reset Daily Stats
            </button>
        `;
    }

    renderIndustrySettings() {
        const container = document.getElementById('industry-settings');
        
        container.innerHTML = this.industries.map((industry, i) => `
            <div class="industry-item">
                <span class="industry-name">${industry.emoji} ${industry.name}</span>
                <div class="industry-tier">
                    <button class="tier-btn tier-1 ${industry.tier === 1 ? 'active' : ''}" 
                            onclick="setIndustryTier(${i}, 1)">T1</button>
                    <button class="tier-btn tier-2 ${industry.tier === 2 ? 'active' : ''}" 
                            onclick="setIndustryTier(${i}, 2)">T2</button>
                    <button class="tier-btn tier-3 ${industry.tier === 3 ? 'active' : ''}" 
                            onclick="setIndustryTier(${i}, 3)">T3</button>
                </div>
            </div>
        `).join('');
    }

    setIndustryTier(index, tier) {
        this.industries[index].tier = tier;
        this.renderIndustrySettings();
    }

    // ==========================================
    // Utilities
    // ==========================================

    formatMarkdownLinks(text) {
        if (!text) return '';
        // Escape HTML first to prevent XSS from AI-generated content.
        // Only allow https?:// URLs to block javascript: and data: URIs.
        // Link text ($1) comes from the already-escaped string so it is safe.
        const escaped = this.escapeHtml(text);
        return escaped.replace(
            /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeAttr(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/'/g, '&#39;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

}

// ==========================================
// Global Functions
// ==========================================

let currentEditingSourceIndex = null;
let currentSourceFilter = 'all';
let selectedPriority = 2;
let selectedDigestType = 'daily';

function switchDigestTab(tab) {
    // Legacy function - tabs removed in v2 redesign
    // Kept for backwards compatibility in case any code calls it
}

// ==========================================
// SETTINGS TABS
// ==========================================
function switchSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.settings-tab-content').forEach(el => {
        const tabName = el.id.replace('settings-tab-', '');
        el.classList.toggle('hidden', tabName !== tab);
    });
}

function toggleSection(sectionId) {
    const content = document.getElementById(`${sectionId}-content`);
    const chevron = document.querySelector(`#${sectionId}-section .chevron`);
    if (!content) return;
    content.classList.toggle('collapsed');
    chevron?.classList.toggle('collapsed');
    const isNowOpen = !content.classList.contains('collapsed');
    // Persist open/close state
    try {
        const states = JSON.parse(localStorage.getItem(STORAGE_KEYS.SECTION_STATE) || '{}');
        states[sectionId] = isNowOpen;
        localStorage.setItem(STORAGE_KEYS.SECTION_STATE, JSON.stringify(states));
    } catch(e) {}
    // Auto-trigger per-article deep analysis when the Deep Reads section is expanded
    if (sectionId === 'deep-reads' && isNowOpen) {
        autoAnalyseDeepReads(app._deepReadCandidates || []);
    }
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

/**
 * Display performance dashboard in settings
 */
function displayPerformanceStats() {
    const statsContainer = document.getElementById('settings-intelligence-stats');
    if (!statsContainer) return;
    
    // Calculate overall cache hit rate
    const overallHitRate = getCacheHitRate();
    
    // Calculate API stats
    const totalCalls = tokenUsageStats.calls.length;
    const totalCost = tokenUsageStats.estimatedCost;
    const avgResponseTime = totalCalls > 0
        ? tokenUsageStats.calls.reduce((sum, call) => sum + call.duration, 0) / totalCalls
        : 0;
    
    // Group calls by type
    const callsByType = {};
    tokenUsageStats.calls.forEach(call => {
        if (!callsByType[call.taskType]) {
            callsByType[call.taskType] = { count: 0, cost: 0, tokens: 0 };
        }
        callsByType[call.taskType].count++;
        callsByType[call.taskType].cost += call.cost;
        callsByType[call.taskType].tokens += call.inputTokens + call.outputTokens;
    });
    
    // Build HTML
    let html = `
        <div class="perf-stats-grid">
            <div class="perf-stat-card">
                <div class="perf-stat-label">API Calls Today</div>
                <div class="perf-stat-value">${totalCalls}</div>
            </div>
            <div class="perf-stat-card">
                <div class="perf-stat-label">Total Cost</div>
                <div class="perf-stat-value">$${totalCost.toFixed(2)}</div>
            </div>
            <div class="perf-stat-card">
                <div class="perf-stat-label">Avg Response Time</div>
                <div class="perf-stat-value">${avgResponseTime.toFixed(0)}ms</div>
            </div>
            <div class="perf-stat-card">
                <div class="perf-stat-label">Cache Hit Rate</div>
                <div class="perf-stat-value">${overallHitRate.toFixed(1)}%</div>
            </div>
        </div>
        
        <div class="perf-details">
            <h5>API Calls by Type</h5>
            <table class="perf-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Calls</th>
                        <th>Tokens</th>
                        <th>Cost</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    Object.entries(callsByType).forEach(([type, stats]) => {
        html += `
            <tr>
                <td>${type}</td>
                <td>${stats.count}</td>
                <td>${stats.tokens.toLocaleString()}</td>
                <td>$${stats.cost.toFixed(3)}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <h5>Cache Performance by Section</h5>
            <table class="perf-table">
                <thead>
                    <tr>
                        <th>Section</th>
                        <th>Hits</th>
                        <th>Misses</th>
                        <th>Hit Rate</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    Object.entries(cachePerformanceStats.bySection).forEach(([section, stats]) => {
        const total = stats.hits + stats.misses;
        const hitRate = total > 0 ? (stats.hits / total * 100) : 0;
        const sectionName = section.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        html += `
            <tr>
                <td>${sectionName}</td>
                <td>${stats.hits}</td>
                <td>${stats.misses}</td>
                <td>${hitRate.toFixed(1)}%</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <div class="perf-actions">
                <button class="btn btn-sm btn-secondary" onclick="resetPerformanceStats()">Reset Stats</button>
                <button class="btn btn-sm btn-secondary" onclick="exportPerformanceStats()">Export CSV</button>
            </div>
        </div>
    `;
    
    statsContainer.innerHTML = html;
}

/**
 * Reset performance statistics
 */
function resetPerformanceStats() {
    if (!confirm('Reset all performance statistics? This cannot be undone.')) return;
    
    // Reset token stats
    tokenUsageStats = {
        sessionStart: Date.now(),
        calls: [],
        totalInputTokens: 0,
        totalOutputTokens: 0,
        estimatedCost: 0
    };
    localStorage.setItem('signal_token_stats', JSON.stringify(tokenUsageStats));
    
    // Reset cache stats
    cachePerformanceStats = {
        sessionStart: Date.now(),
        hits: 0,
        misses: 0,
        bySection: {
            'executive-summary': { hits: 0, misses: 0, lastAccess: null },
            'market-insights': { hits: 0, misses: 0, lastAccess: null },
            'action-required': { hits: 0, misses: 0, lastAccess: null },
            'deep-reads': { hits: 0, misses: 0, lastAccess: null }
        }
    };
    localStorage.setItem('signal_cache_stats', JSON.stringify(cachePerformanceStats));
    
    // Refresh display
    displayPerformanceStats();
    alert('Performance statistics reset successfully.');
}

/**
 * Export performance statistics as CSV
 */
function exportPerformanceStats() {
    const date = new Date().toISOString().split('T')[0];
    let csv = 'Signal Today Performance Report\n';
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // API Calls Summary
    csv += 'API CALLS SUMMARY\n';
    csv += 'Type,Calls,Input Tokens,Output Tokens,Cost\n';
    
    const callsByType = {};
    tokenUsageStats.calls.forEach(call => {
        if (!callsByType[call.taskType]) {
            callsByType[call.taskType] = { count: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
        }
        callsByType[call.taskType].count++;
        callsByType[call.taskType].inputTokens += call.inputTokens;
        callsByType[call.taskType].outputTokens += call.outputTokens;
        callsByType[call.taskType].cost += call.cost;
    });
    
    Object.entries(callsByType).forEach(([type, stats]) => {
        csv += `${type},${stats.count},${stats.inputTokens},${stats.outputTokens},$${stats.cost.toFixed(4)}\n`;
    });
    
    csv += `\nTOTAL,${tokenUsageStats.calls.length},${tokenUsageStats.totalInputTokens},${tokenUsageStats.totalOutputTokens},$${tokenUsageStats.estimatedCost.toFixed(4)}\n\n`;
    
    // Cache Performance
    csv += 'CACHE PERFORMANCE\n';
    csv += 'Section,Hits,Misses,Hit Rate\n';
    
    Object.entries(cachePerformanceStats.bySection).forEach(([section, stats]) => {
        const total = stats.hits + stats.misses;
        const hitRate = total > 0 ? (stats.hits / total * 100) : 0;
        csv += `${section},${stats.hits},${stats.misses},${hitRate.toFixed(1)}%\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signal-today-performance-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function saveSettings() {
    // Save provider selection
    const providerSelect = document.getElementById('ai-provider');
    if (providerSelect) {
        localStorage.setItem('signal_ai_provider', providerSelect.value);
    }
    
    // Save API keys for each provider
    const claudeKeyEl = document.getElementById('claude-api-key');
    if (claudeKeyEl) {
        const claudeKey = claudeKeyEl.value.trim();
        if (claudeKey) {
            localStorage.setItem('signal_claude_api_key', claudeKey);
            // Also save to legacy key for backward compatibility
            localStorage.setItem(STORAGE_KEYS.API_KEY, claudeKey);
        } else {
            localStorage.removeItem('signal_claude_api_key');
        }
    }
    
    const openaiKeyEl = document.getElementById('openai-api-key');
    if (openaiKeyEl) {
        const openaiKey = openaiKeyEl.value.trim();
        if (openaiKey) {
            localStorage.setItem('signal_openai_api_key', openaiKey);
        } else {
            localStorage.removeItem('signal_openai_api_key');
        }
    }
    
    // Reinitialize intelligence engine with new provider
    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];
    if (apiKey && typeof HybridIntelligenceEngine !== 'undefined') {
        app.intelligenceEngine = new HybridIntelligenceEngine(apiKey, settings.provider);
        console.log(`🧠 Intelligence Engine reinitialized (${settings.provider})`);
    }
    
    // Save context fields if present in DOM
    const weekContextEl = document.getElementById('week-context');
    if (weekContextEl) app.settings.thisWeekContext = weekContextEl.value.trim();
    
    const autoRefreshEl = document.getElementById('auto-refresh-time');
    if (autoRefreshEl) {
        const newTime = autoRefreshEl.value.trim();
        if (newTime !== app.settings.autoRefreshTime) {
            app.settings.autoRefreshTime = newTime;
            // Reschedule auto-refresh with new time
            if (app.autoRefreshTimer) clearTimeout(app.autoRefreshTimer);
            if (newTime) app.initAutoRefresh();
        }
    }
    
    // Save intelligence settings
    const intelligenceEnabledEl = document.getElementById('intelligence-enabled');
    if (intelligenceEnabledEl) {
        app.settings.intelligenceEnabled = intelligenceEnabledEl.checked;
    }
    
    const costLimitEl = document.getElementById('intelligence-cost-limit');
    if (costLimitEl) {
        app.settings.intelligenceCostLimit = parseFloat(costLimitEl.value) || 5.00;
    }
    
    const minConfidenceEl = document.getElementById('intelligence-min-confidence');
    if (minConfidenceEl) {
        app.settings.intelligenceMinConfidence = parseFloat(minConfidenceEl.value) || 0.7;
    }
    
    // Save to storage
    app.saveToStorage();
    updateWeekContextWidget();
    closeSettings();
    app.updateUI();
    
    // Re-render to apply any context changes
    if (app.articles.length > 0) {
        app.renderDigest();
        if (typeof updateIntelligenceStats === 'function') {
            updateIntelligenceStats();
        }
    }
    
    console.log('✅ Settings saved');
}

/**
 * Toggle visibility of API key fields based on selected provider
 */
function toggleProviderAPIKeys() {
    const provider = document.getElementById('ai-provider')?.value || AI_PROVIDERS.CLAUDE;
    const providerHint = document.getElementById('provider-hint');
    
    // Hide all provider API key groups
    document.getElementById('claude-api-key-group')?.classList.add('hidden');
    document.getElementById('openai-api-key-group')?.classList.add('hidden');
    
    // Show the selected provider's API key group
    const selectedGroup = document.getElementById(`${provider}-api-key-group`);
    if (selectedGroup) {
        selectedGroup.classList.remove('hidden');
    }
    
    // Update provider hint text
    if (providerHint) {
        const hints = {
            claude: 'Using Claude Sonnet 4 for strategic analysis, Haiku 3.5 for fast tasks',
            openai: 'Using GPT-4o for strategic analysis, GPT-4o-mini for fast tasks'
        };
        providerHint.textContent = hints[provider] || hints.claude;
    }
}

function resetSources() {
    // iOS Safari can have issues with confirm() - wrap in try-catch
    try {
        const shouldReset = confirm('Reset all sources to defaults? This will remove any custom sources you added.');
        if (shouldReset) {
            // Ensure DEFAULT_SOURCES is available
            if (typeof DEFAULT_SOURCES === 'undefined' || !Array.isArray(DEFAULT_SOURCES)) {
                console.error('DEFAULT_SOURCES not available');
                alert('Error: Could not load default sources. Please refresh the page.');
                return;
            }
            
            app.sources = JSON.parse(JSON.stringify(DEFAULT_SOURCES)); // Deep copy for iOS
            app.saveToStorage();
            renderSourcesList();
            updateSourcesCount();
            
            // Use setTimeout for iOS alert reliability
            setTimeout(() => {
                alert(`Sources reset! Now showing ${app.sources.length} sources.`);
            }, 100);
        }
    } catch (e) {
        console.error('Reset sources error:', e);
        // Fallback: just do the reset without confirm
        app.sources = JSON.parse(JSON.stringify(DEFAULT_SOURCES));
        app.saveToStorage();
        renderSourcesList();
        updateSourcesCount();
        alert('Sources reset to defaults.');
    }
}

async function clearCacheData() {
    const message = '🗑️ Clear Cache Data?\n\n' +
                    'This will remove:\n' +
                    '• All cached digests and summaries\n' +
                    '• All articles (7-day history)\n' +
                    '• All read tracking\n\n' +
                    'Your settings and API keys will be preserved.\n\n' +
                    'Continue?';
    
    if (!confirm(message)) {
        return;
    }
    
    try {
        // Keys to preserve (settings and API keys)
        const keysToKeep = [
            // API Keys
            'signal_api_key',
            'signal_claude_api_key',
            'signal_openai_api_key',
            'signal_ai_provider',
            
            // Core Settings
            'signal_sources',
            'signal_industries',
            'signal_clients',
            'signal_settings',
            
            // User Feedback & Learning
            'signal_article_ratings',
            'signal_score_drift',
            
            // Legacy keys (backward compatibility)
            'apiKey',
            'theme',
            'preferences',
            'selectedMarket',
            'selectedClient',
            'userRole',
            'userName'
        ];
        
        // Save values to preserve
        const preserved = {};
        keysToKeep.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                preserved[key] = value;
            }
        });
        
        // Clear localStorage
        localStorage.clear();
        console.log('✅ localStorage cleared');
        
        // Restore preserved values
        Object.keys(preserved).forEach(key => {
            localStorage.setItem(key, preserved[key]);
        });
        console.log('✅ Settings and API keys restored');
        
        // Clear sessionStorage
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
        
        // Clear IndexedDB (SignalDB) - close connection first, then delete
        try {
            // Close the database connection if it exists
            if (app && app.db && app.db._db) {
                app.db.close();
                console.log('✅ Database connection closed');
            }
            
            // Wait a moment for connection to fully close
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Now delete the database
            await new Promise((resolve, reject) => {
                const dbDeleted = indexedDB.deleteDatabase('signal-today-db');
                
                dbDeleted.onsuccess = () => {
                    console.log('✅ IndexedDB cleared');
                    resolve();
                };
                
                dbDeleted.onerror = (e) => {
                    console.warn('⚠️ IndexedDB could not be cleared:', e);
                    reject(new Error('IndexedDB deletion failed'));
                };
                
                dbDeleted.onblocked = () => {
                    console.warn('⚠️ IndexedDB deletion blocked (database still in use)');
                    reject(new Error('IndexedDB deletion blocked - close all other tabs with this app'));
                };
            });
            
            // Success - show alert and reload
            alert('✅ Cache cleared successfully!\n\nYour settings and API keys have been preserved.\n\nThe page will now reload.');
            setTimeout(() => location.reload(), 500);
            
        } catch (dbError) {
            console.error('❌ Error deleting IndexedDB:', dbError);
            alert('✅ localStorage and sessionStorage cleared.\n\nIndexedDB could not be deleted: ' + dbError.message + '\n\nThe page will now reload.');
            setTimeout(() => location.reload(), 500);
        }
    } catch (e) {
        console.error('❌ Error clearing cache:', e);
        alert('⚠️ Error clearing cache.\n\nPlease try "Clear All Data" or:\nSettings → Safari → Advanced → Website Data → Remove this site');
        setTimeout(() => location.reload(), 500);
    }
}

async function clearAllData() {
    const message = '⚠️ Clear ALL Data?\n\n' +
                    'This will PERMANENTLY delete:\n' +
                    '• All cached digests and summaries\n' +
                    '• All articles (7-day history)\n' +
                    '• All settings and preferences\n' +
                    '• All read tracking\n' +
                    '• API keys (Claude & OpenAI)\n' +
                    '• Custom RSS sources\n\n' +
                    '⚠️ THIS CANNOT BE UNDONE ⚠️\n\n' +
                    'Continue?';
    
    if (!confirm(message)) {
        return;
    }
    
    try {
        // Clear localStorage
        localStorage.clear();
        console.log('✅ localStorage cleared');
        
        // Clear sessionStorage
        sessionStorage.clear();
        console.log('✅ sessionStorage cleared');
        
        // Clear IndexedDB (SignalDB) - close connection first, then delete
        try {
            // Close the database connection if it exists
            if (app && app.db && app.db._db) {
                app.db.close();
                console.log('✅ Database connection closed');
            }
            
            // Wait a moment for connection to fully close
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Now delete the database
            await new Promise((resolve, reject) => {
                const dbDeleted = indexedDB.deleteDatabase('signal-today-db');
                
                dbDeleted.onsuccess = () => {
                    console.log('✅ IndexedDB cleared');
                    resolve();
                };
                
                dbDeleted.onerror = (e) => {
                    console.warn('⚠️ IndexedDB could not be cleared:', e);
                    reject(new Error('IndexedDB deletion failed'));
                };
                
                dbDeleted.onblocked = () => {
                    console.warn('⚠️ IndexedDB deletion blocked (database still in use)');
                    reject(new Error('IndexedDB deletion blocked - close all other tabs with this app'));
                };
            });
            
            // Success - show alert and reload
            alert('✅ All data cleared successfully!\n\nThe page will now reload with default settings.');
            setTimeout(() => location.reload(), 500);
            
        } catch (dbError) {
            console.error('❌ Error deleting IndexedDB:', dbError);
            alert('✅ localStorage and sessionStorage cleared.\n\nIndexedDB could not be deleted: ' + dbError.message + '\n\nFor complete reset, clear Safari Website Data:\nSettings → Safari → Advanced → Website Data\n\nThe page will now reload.');
            setTimeout(() => location.reload(), 500);
        }
    } catch (e) {
        console.error('❌ Error clearing data:', e);
        alert('⚠️ Error clearing data.\n\nPlease try:\nSettings → Safari → Advanced → Website Data → Remove this site');
        setTimeout(() => location.reload(), 500);
    }
}

function closeArticle() {
    document.getElementById('article-modal').classList.add('hidden');
}

function closeMeetingBrief() {
    const modal = document.getElementById('meeting-brief-modal');
    if (modal) modal.classList.add('hidden');
}

function closeGTMDigest() {
    const modal = document.getElementById('gtm-digest-modal');
    if (modal) modal.classList.add('hidden');
}

// Helper: find article across all pools (master list + daily + weekly)
function findArticleById(articleId) {
    return app.articles.find(a => a.id === articleId)
        || app.dailyArticles.find(a => a.id === articleId)
        || app.weeklyArticles.find(a => a.id === articleId);
}

function copyArticleLink() {
    const articleId = document.getElementById('article-modal').dataset.articleId;
    const article = findArticleById(articleId);
    if (article) {
        navigator.clipboard.writeText(article.url);
        showToast('Link copied to clipboard');
    }
}

function showToast(message) {
    // Create toast if doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// ==========================================
// Source Management Functions
// ==========================================

function renderSourcesList() {
    const list = document.getElementById('sources-list');
    const filter = currentSourceFilter;
    
    const filteredSources = filter === 'all' 
        ? app.sources 
        : app.sources.filter(s => s.category === filter);
    
    if (filteredSources.length === 0) {
        list.innerHTML = '<div class="source-item" style="justify-content: center; color: var(--text-tertiary);">No sources in this category</div>';
        return;
    }
    
    list.innerHTML = filteredSources.map((source, index) => {
        const actualIndex = app.sources.indexOf(source);
        const categoryEmoji = CATEGORIES[source.category]?.emoji || '📰';
        
        return `
            <div class="source-item">
                <div class="source-item-toggle">
                    <input type="checkbox" ${source.enabled ? 'checked' : ''} 
                           onclick="event.stopPropagation(); toggleSource(${actualIndex})"
                           title="Enable/Disable">
                </div>
                <div class="source-item-info" onclick="editSource(${actualIndex})">
                    <div class="source-item-name">${source.name}</div>
                    <div class="source-item-meta">
                        <span class="source-item-category">${categoryEmoji} ${source.category}</span>
                        <span class="source-item-priority p${source.priority}">P${source.priority}</span>
                        <span>${source.digestType}</span>
                    </div>
                </div>
                <button class="source-item-edit" onclick="editSource(${actualIndex})" title="Edit">✏️</button>
            </div>
        `;
    }).join('');
}

function filterSources() {
    currentSourceFilter = document.getElementById('sources-category-filter').value;
    renderSourcesList();
}

function updateSourcesCount() {
    const enabledCount = app.sources.filter(s => s.enabled).length;
    const totalCount = app.sources.length;
    document.getElementById('sources-count').textContent = `${enabledCount}/${totalCount} sources enabled`;
}

function toggleSource(index) {
    app.sources[index].enabled = !app.sources[index].enabled;
    app.saveToStorage();
    updateSourcesCount();
}

function addNewSource() {
    currentEditingSourceIndex = null;
    
    // Reset form
    document.getElementById('source-modal-title').textContent = 'Add Source';
    document.getElementById('source-name').value = '';
    document.getElementById('source-url').value = '';
    document.getElementById('source-category').value = 'AI & Agentic';
    document.getElementById('source-credibility').value = 80;
    document.getElementById('credibility-value').textContent = '80%';
    document.getElementById('delete-source-btn').style.display = 'none';
    
    // Reset selectors
    selectedPriority = 2;
    selectedDigestType = 'daily';
    updatePriorityButtons();
    updateDigestTypeButtons();
    
    document.getElementById('source-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('source-name')?.focus(), 50);
}

function editSource(index) {
    currentEditingSourceIndex = index;
    const source = app.sources[index];
    
    document.getElementById('source-modal-title').textContent = 'Edit Source';
    document.getElementById('source-name').value = source.name;
    document.getElementById('source-url').value = source.url;
    document.getElementById('source-category').value = source.category;
    document.getElementById('source-credibility').value = Math.round(source.credibilityScore * 100);
    document.getElementById('credibility-value').textContent = `${Math.round(source.credibilityScore * 100)}%`;
    document.getElementById('delete-source-btn').style.display = 'block';
    
    selectedPriority = source.priority;
    selectedDigestType = source.digestType;
    updatePriorityButtons();
    updateDigestTypeButtons();
    
    document.getElementById('source-modal').classList.remove('hidden');
}

function closeSourceEditor() {
    document.getElementById('source-modal').classList.add('hidden');
    currentEditingSourceIndex = null;
}

function selectPriority(priority) {
    selectedPriority = priority;
    updatePriorityButtons();
}

function updatePriorityButtons() {
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.priority) === selectedPriority);
    });
}

function selectDigestType(type) {
    selectedDigestType = type;
    updateDigestTypeButtons();
}

function updateDigestTypeButtons() {
    document.querySelectorAll('.digest-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === selectedDigestType);
    });
}

function updateCredibilityDisplay() {
    const value = document.getElementById('source-credibility').value;
    document.getElementById('credibility-value').textContent = `${value}%`;
}

function saveSource() {
    const name = document.getElementById('source-name').value.trim();
    const url = document.getElementById('source-url').value.trim();
    const category = document.getElementById('source-category').value;
    const credibility = parseInt(document.getElementById('source-credibility').value) / 100;
    
    // Validation
    if (!name) {
        alert('Please enter a source name');
        return;
    }
    
    if (!url) {
        alert('Please enter a feed URL');
        return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }
    
    const sourceData = {
        name,
        url,
        category,
        priority: selectedPriority,
        credibilityScore: credibility,
        digestType: selectedDigestType,
        enabled: true
    };
    
    if (currentEditingSourceIndex !== null) {
        // Edit existing
        app.sources[currentEditingSourceIndex] = sourceData;
    } else {
        // Check for duplicate URL
        if (app.sources.some(s => s.url.toLowerCase() === url.toLowerCase())) {
            alert('A source with this URL already exists');
            return;
        }
        // Add new
        app.sources.push(sourceData);
    }
    
    app.saveToStorage();
    renderSourcesList();
    updateSourcesCount();
    closeSourceEditor();
}

function deleteCurrentSource() {
    if (currentEditingSourceIndex === null) return;
    
    const source = app.sources[currentEditingSourceIndex];
    if (confirm(`Delete "${source.name}"?`)) {
        app.sources.splice(currentEditingSourceIndex, 1);
        app.saveToStorage();
        renderSourcesList();
        updateSourcesCount();
        closeSourceEditor();
    }
}

// ==========================================
// CLIENT MANAGER FUNCTIONS
// ==========================================

function openClientManager() {
    document.getElementById('client-manager-modal').classList.remove('hidden');
    app.clientManagerMarket = 'ALL';
    app.selectedClients.clear();
    updateClientManagerCounts();
    renderClientTable();
}

function closeClientManager() {
    document.getElementById('client-manager-modal').classList.add('hidden');
    app.selectedClients.clear();
}

function switchClientManagerTab(market) {
    app.clientManagerMarket = market;
    document.querySelectorAll('.cm-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.market === market);
    });
    app.selectedClients.clear();
    document.getElementById('cm-select-all').checked = false;
    updateBulkActionsVisibility();
    renderClientTable();
}

function updateClientManagerCounts() {
    const counts = { ALL: 0, ANZ: 0, ASEAN: 0, GCG: 0, ISA: 0, KOREA: 0 };
    app.clients.forEach(c => {
        counts.ALL++;
        if (counts[c.market] !== undefined) counts[c.market]++;
    });
    Object.keys(counts).forEach(market => {
        const el = document.getElementById(`cm-count-${market.toLowerCase()}`);
        if (el) el.textContent = counts[market];
    });
    // Update portfolio stats in header
    const statsEl = document.getElementById('portfolio-stats');
    if (statsEl) {
        const tier1 = app.clients.filter(c => c.tier === 1).length;
        statsEl.textContent = `${counts.ALL} clients (${tier1} Tier 1)`;
    }
}

function renderClientTable() {
    const tbody = document.getElementById('client-table-body');
    const searchTerm = (document.getElementById('cm-search-input')?.value || '').toLowerCase();
    
    let filtered = app.clients.filter(c => {
        if (app.clientManagerMarket !== 'ALL' && c.market !== app.clientManagerMarket) return false;
        if (searchTerm && !c.name.toLowerCase().includes(searchTerm)) return false;
        return true;
    });
    
    // Sort by tier then name
    filtered.sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name));
    
    tbody.innerHTML = filtered.map((client, idx) => {
        const originalIdx = app.clients.indexOf(client);
        const lastSignal = client.lastMentioned ? formatRelativeDate(new Date(client.lastMentioned)) : '—';
        const isRecent = client.lastMentioned && (Date.now() - new Date(client.lastMentioned).getTime()) < 7 * 24 * 60 * 60 * 1000;
        return `
            <tr data-idx="${originalIdx}">
                <td class="col-checkbox"><input type="checkbox" onchange="toggleClientSelection(${originalIdx})" ${app.selectedClients.has(originalIdx) ? 'checked' : ''}></td>
                <td class="client-name-cell">${escapeHtml(client.name)}</td>
                <td>${client.market || '—'}</td>
                <td>${client.industry || '—'}</td>
                <td><span class="client-tier-badge tier-${client.tier}">Tier ${client.tier}</span></td>
                <td>${escapeHtml(client.atl || '—')}</td>
                <td class="client-last-signal ${isRecent ? 'recent' : ''}">${lastSignal}</td>
                <td class="col-actions">
                    <button class="client-action-btn" onclick="closeClientManager(); openMeetingBrief('${escapeHtml(client.name).replace(/'/g, "\\'")}')" title="Client Brief">📋</button>
                    <button class="client-action-btn" onclick="editClient(${originalIdx})" title="Edit">✏️</button>
                    <button class="client-action-btn" onclick="deleteClient(${originalIdx})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterClientManager() {
    renderClientTable();
}

function toggleClientSelection(idx) {
    if (app.selectedClients.has(idx)) {
        app.selectedClients.delete(idx);
    } else {
        app.selectedClients.add(idx);
    }
    updateBulkActionsVisibility();
}

function toggleSelectAllClients() {
    const selectAll = document.getElementById('cm-select-all').checked;
    const searchTerm = (document.getElementById('cm-search-input')?.value || '').toLowerCase();
    
    app.clients.forEach((client, idx) => {
        if (app.clientManagerMarket !== 'ALL' && client.market !== app.clientManagerMarket) return;
        if (searchTerm && !client.name.toLowerCase().includes(searchTerm)) return;
        
        if (selectAll) {
            app.selectedClients.add(idx);
        } else {
            app.selectedClients.delete(idx);
        }
    });
    updateBulkActionsVisibility();
    renderClientTable();
}

function updateBulkActionsVisibility() {
    const bulkEl = document.getElementById('cm-bulk-actions');
    const countEl = document.getElementById('cm-selected-count');
    if (app.selectedClients.size > 0) {
        bulkEl.classList.remove('hidden');
        countEl.textContent = `${app.selectedClients.size} selected`;
    } else {
        bulkEl.classList.add('hidden');
    }
}

function bulkSetTier(tier) {
    const count = app.selectedClients.size;
    app.selectedClients.forEach(idx => {
        if (app.clients[idx]) app.clients[idx].tier = tier;
    });
    app.saveToStorage();
    app.selectedClients.clear();
    document.getElementById('cm-select-all').checked = false;
    updateBulkActionsVisibility();
    renderClientTable();
    showToast(`Updated ${count} client${count !== 1 ? 's' : ''} to Tier ${tier}`);
}

function bulkDeleteClients() {
    if (!confirm(`Delete ${app.selectedClients.size} clients?`)) return;
    const toDelete = Array.from(app.selectedClients).sort((a, b) => b - a);
    toDelete.forEach(idx => app.clients.splice(idx, 1));
    app.saveToStorage();
    app.selectedClients.clear();
    document.getElementById('cm-select-all').checked = false;
    updateBulkActionsVisibility();
    updateClientManagerCounts();
    renderClientTable();
    showToast('Clients deleted');
}

function openAddClientForm() {
    document.getElementById('client-form-modal').classList.remove('hidden');
    document.getElementById('client-form-title').textContent = 'Add Client';
    document.getElementById('client-form-id').value = '';
    document.getElementById('client-form-name').value = '';
    document.getElementById('client-form-market').value = app.clientManagerMarket !== 'ALL' ? app.clientManagerMarket : '';
    document.getElementById('client-form-country').innerHTML = '<option value="">Select</option>';
    document.getElementById('client-form-industry').value = '';
    document.getElementById('client-form-tier').value = '2';
    document.getElementById('client-form-atl').value = '';
    document.getElementById('client-form-aliases').value = '';
    updateCountryOptions();
    setTimeout(() => document.getElementById('client-form-name')?.focus(), 50);
}

function editClient(idx) {
    const client = app.clients[idx];
    if (!client) return;
    
    document.getElementById('client-form-modal').classList.remove('hidden');
    document.getElementById('client-form-title').textContent = 'Edit Client';
    document.getElementById('client-form-id').value = idx;
    document.getElementById('client-form-name').value = client.name;
    document.getElementById('client-form-market').value = client.market || '';
    updateCountryOptions();
    document.getElementById('client-form-country').value = client.country || '';
    document.getElementById('client-form-industry').value = client.industry || '';
    document.getElementById('client-form-tier').value = client.tier || 2;
    document.getElementById('client-form-atl').value = client.atl || '';
    document.getElementById('client-form-aliases').value = (client.aliases || []).join(', ');
}

function closeClientForm() {
    document.getElementById('client-form-modal').classList.add('hidden');
}

function updateCountryOptions() {
    const market = document.getElementById('client-form-market').value;
    const countrySelect = document.getElementById('client-form-country');
    const currentValue = countrySelect.value;
    
    const countryMap = {
        'ANZ': [['AU', 'Australia'], ['NZ', 'New Zealand']],
        'ASEAN': [['SG', 'Singapore'], ['MY', 'Malaysia'], ['TH', 'Thailand'], ['ID', 'Indonesia'], ['PH', 'Philippines'], ['VN', 'Vietnam']],
        'GCG': [['HK', 'Hong Kong'], ['TW', 'Taiwan'], ['CN', 'China']],
        'ISA': [['IN', 'India'], ['BD', 'Bangladesh'], ['LK', 'Sri Lanka'], ['PK', 'Pakistan']],
        'KOREA': [['KR', 'South Korea']]
    };
    
    const countries = countryMap[market] || [];
    countrySelect.innerHTML = '<option value="">Select</option>' + 
        countries.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
    
    if (countries.some(([code]) => code === currentValue)) {
        countrySelect.value = currentValue;
    }
}

function saveClient() {
    const idxStr = document.getElementById('client-form-id').value;
    const name = document.getElementById('client-form-name').value.trim();
    const market = document.getElementById('client-form-market').value;
    const country = document.getElementById('client-form-country').value;
    const industry = document.getElementById('client-form-industry').value;
    const tier = parseInt(document.getElementById('client-form-tier').value) || 2;
    const atl = document.getElementById('client-form-atl').value.trim();
    const aliasesStr = document.getElementById('client-form-aliases').value;
    const aliases = aliasesStr ? aliasesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    if (!name || !market) {
        showToast('Name and Market are required');
        return;
    }
    
    const clientData = { name, market, country, industry, tier, atl, aliases };
    
    if (idxStr !== '') {
        // Update existing
        const idx = parseInt(idxStr);
        app.clients[idx] = { ...app.clients[idx], ...clientData };
    } else {
        // Add new
        app.clients.push(clientData);
    }
    
    app.saveToStorage();
    updateClientManagerCounts();
    renderClientTable();
    closeClientForm();
    showToast(idxStr ? 'Client updated' : 'Client added');
}

function deleteClient(idx) {
    const client = app.clients[idx];
    if (confirm(`Delete "${client.name}"?`)) {
        app.clients.splice(idx, 1);
        app.saveToStorage();
        updateClientManagerCounts();
        renderClientTable();
        showToast('Client deleted');
    }
}

function importClientsCSV() {
    document.getElementById('csv-import-modal').classList.remove('hidden');
    document.getElementById('csv-import-data').value = '';
    document.getElementById('csv-file-input').value = '';
}

function closeCSVImport() {
    document.getElementById('csv-import-modal').classList.add('hidden');
}

function handleCSVFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('csv-import-data').value = e.target.result;
    };
    reader.readAsText(file);
}

function processCSVImport() {
    const data = document.getElementById('csv-import-data').value.trim();
    if (!data) {
        showToast('No data to import');
        return;
    }
    
    const lines = data.split('\n').filter(l => l.trim());
    let imported = 0;
    
    lines.forEach(line => {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length < 2) return;
        
        const [name, market, country, industry, tierStr, atl] = parts;
        if (!name || !market) return;
        
        // Check for duplicate
        if (app.clients.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
        
        app.clients.push({
            name,
            market: market.toUpperCase(),
            country: country || '',
            industry: industry || '',
            tier: parseInt(tierStr) || 2,
            atl: atl || '',
            aliases: []
        });
        imported++;
    });
    
    app.saveToStorage();
    updateClientManagerCounts();
    renderClientTable();
    closeCSVImport();
    showToast(`Imported ${imported} clients`);
}

function exportClientsCSV() {
    const csv = app.clients.map(c => 
        [c.name, c.market, c.country, c.industry, c.tier, c.atl || ''].join(',')
    ).join('\n');
    
    const blob = new Blob([`Name,Market,Country,Industry,Tier,ATL\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signal-today-clients.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ==========================================
// MARKET FILTERING (Client Radar)
// ==========================================

// Old switchMarket removed - now handled by Signal Feed switchMarket function

function filterClientRadar() {
    // Deprecated - Signal Feed now handles filtering
    renderSignalFeed();
}

function renderClientRadar() {
    const list = document.getElementById('client-radar-list');
    const emptyEl = document.getElementById('client-radar-empty');
    
    const showTier1 = document.getElementById('filter-tier-1')?.checked ?? true;
    const showTier2 = document.getElementById('filter-tier-2')?.checked ?? true;
    const showTier3 = document.getElementById('filter-tier-3')?.checked ?? false;
    
    // Get articles with client matches
    const clientArticles = {};
    const allArticles = [...app.dailyArticles, ...app.articles.filter(a => {
        const articleDate = a.date || a.publishedDate;
        if (!articleDate) return true; // Include if no date
        const age = Date.now() - new Date(articleDate).getTime();
        return age < 48 * 60 * 60 * 1000; // 48 hours for better coverage
    })];
    
    // Debug: check how many articles have matchedClients
    const articlesWithClients = allArticles.filter(a => a.matchedClients && a.matchedClients.length > 0);
    console.log(`Client Radar: ${allArticles.length} total articles, ${articlesWithClients.length} have matchedClients, ${app.clients.length} clients tracked`);
    if (articlesWithClients.length > 0) {
        console.log('Sample matched clients:', articlesWithClients.slice(0, 3).map(a => ({ title: a.title.substring(0, 50), clients: a.matchedClients })));
    }
    
    allArticles.forEach(article => {
        if (!article.matchedClients || article.matchedClients.length === 0) return;
        article.matchedClients.forEach(clientName => {
            const client = app.clients.find(c => 
                c.name.toLowerCase() === clientName.toLowerCase() ||
                (c.aliases || []).some(a => a.toLowerCase() === clientName.toLowerCase())
            );
            if (!client) return;
            if (!clientArticles[client.name]) {
                clientArticles[client.name] = { client, articles: [] };
            }
            if (!clientArticles[client.name].articles.some(a => a.id === article.id)) {
                clientArticles[client.name].articles.push(article);
            }
        });
    });
    
    // Filter by market and tier
    let entries = Object.values(clientArticles).filter(({ client }) => {
        if (app.currentMarket !== 'ALL' && client.market !== app.currentMarket) return false;
        if (client.tier === 1 && !showTier1) return false;
        if (client.tier === 2 && !showTier2) return false;
        if (client.tier === 3 && !showTier3) return false;
        return true;
    });
    
    // Sort by tier then article count
    entries.sort((a, b) => (a.client.tier - b.client.tier) || (b.articles.length - a.articles.length));
    
    // Update count badge
    const countEl = document.getElementById('client-signals-count');
    if (countEl) countEl.textContent = entries.length;
    
    if (entries.length === 0) {
        list.innerHTML = '';
        emptyEl?.classList.remove('hidden');
        return;
    }
    
    emptyEl?.classList.add('hidden');
    
    list.innerHTML = entries.map(({ client, articles }) => {
        // Determine dominant signal type for client
        const signalCounts = { risk: 0, opportunity: 0, competitive: 0, regulatory: 0, relationship: 0 };
        articles.forEach(a => {
            const type = a.signalType || classifySignalType(a);
            if (signalCounts[type] !== undefined) signalCounts[type]++;
        });
        const dominantSignal = Object.entries(signalCounts)
            .sort((a, b) => b[1] - a[1])
            .filter(([_, count]) => count > 0)[0];
        
        const dominantType = dominantSignal ? dominantSignal[0] : 'general';
        const dominantEmoji = {
            'risk': '🔴',
            'opportunity': '🟢',
            'competitive': '⚔️',
            'regulatory': '🛡️',
            'relationship': '🤝',
            'general': '📰'
        }[dominantType];
        
        // Derive dominant conversation door from Tier 3 intelligence
        const convDoorCounts = {};
        for (const a of articles) {
            const door = a.intelligence?.conversationDoor;
            if (a.intelligence?.tier === 3 && door) {
                convDoorCounts[door] = (convDoorCounts[door] || 0) + 1;
            }
        }
        const dominantConvDoor = Object.keys(convDoorCounts).length > 0
            ? Object.entries(convDoorCounts).sort((a, b) => b[1] - a[1])[0][0]
            : null;
        
        return `
        <div class="client-radar-item signal-${dominantType}">
            <div class="client-radar-header">
                <span class="client-radar-name">${escapeHtml(client.name)}</span>
                <div class="client-radar-meta">
                    <span class="client-radar-signal-type" title="${dominantType} signal">${dominantEmoji}</span>
                    <span class="client-radar-tier tier-${client.tier}">Tier ${client.tier}</span>
                    <span class="client-radar-industry">${client.industry || ''}</span>
                </div>
            </div>
            ${dominantConvDoor ? `<div class="client-conv-door">🗣️ ${escapeHtml(dominantConvDoor)}</div>` : ''}
            <div class="client-radar-articles">
                ${articles.slice(0, 3).map(a => {
                    const articleType = a.signalType || classifySignalType(a);
                    const articleEmoji = {
                        'risk': '🔴',
                        'opportunity': '🟢',
                        'competitive': '⚔️',
                        'regulatory': '🛡️',
                        'relationship': '🤝',
                        'ibm': '🔵',
                        'general': '📰'
                    }[articleType] || '📰';
                    
                    return `
                    <div class="client-radar-article">
                        <span class="client-radar-article-signal" title="${articleType}">${articleEmoji}</span>
                        <a class="client-radar-article-link" href="${a.url || '#'}" target="_blank">${escapeHtml(a.title)}</a>
                        <span class="client-radar-article-source">(${escapeHtml(a.source || a.sourceName || 'Source')})</span>
                    </div>`;
                }).join('')}
            </div>
            <div class="client-radar-actions">
                <button class="btn btn-sm btn-brief-atl" onclick="openBriefATL('${escapeHtml(client.name)}')">
                    📤 Brief ATL
                </button>
            </div>
        </div>`;
    }).join('');
}

// ==========================================
// BRIEF ATL MODAL
// ==========================================

async function openBriefATL(clientName) {
    const modal = document.getElementById('brief-atl-modal');
    const titleEl = document.getElementById('brief-atl-title');
    const contentEl = document.getElementById('brief-atl-content');
    
    const client = app.clients.find(c => c.name === clientName);
    if (!client) return;
    
    titleEl.textContent = `Brief ATL: ${clientName}`;
    modal.classList.remove('hidden');
    
    // Get articles for this client
    const allArticles = [...app.dailyArticles, ...app.articles];
    const clientArticles = allArticles.filter(a => 
        a.matchedClients?.some(c => c.toLowerCase() === clientName.toLowerCase() ||
            (client.aliases || []).some(al => al.toLowerCase() === c.toLowerCase()))
    );
    
    if (clientArticles.length === 0) {
        contentEl.innerHTML = '<p>No recent articles for this client.</p>';
        app.lastBriefATLText = '';
        return;
    }
    
    // Check for API key
    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];

    if (!apiKey) {
        // No AI - generate simple brief
        const articleList = clientArticles.slice(0, 5).map(a => 
            `• ${a.title} (${a.source})`
        ).join('\n');
        
        const briefText = `🔔 Client Signal: ${clientName}

${client.atl ? `ATL: ${client.atl}` : ''}
Market: ${client.market} | Industry: ${client.industry || 'N/A'}

Recent coverage:
${articleList}

Review these signals and consider client outreach.`;
        
        contentEl.innerHTML = `<div class="brief-atl-slack">${escapeHtml(briefText)}</div>`;
        app.lastBriefATLText = briefText;
        return;
    }
    
    // AI-powered brief
    contentEl.innerHTML = '<p>Generating AI brief...</p>';

    const articleSummaries = clientArticles.slice(0, 5).map((a, i) =>
        `[${i + 1}] ${a.source || a.sourceName}: ${a.title}\n${a.summary?.substring(0, 200) || 'No summary'}`
    ).join('\n\n');

    const contextBlock = app.settings?.thisWeekContext
        ? `\nTHIS WEEK'S CONTEXT (prioritize relevance):\n${app.settings.thisWeekContext}\n`
        : '';

    // Determine if this is a live meeting brief or ATL enablement brief
    const resolvedCtx = resolveContextMatches(app.settings?.thisWeekContext, app.clients);
    const clientAliases = client?.aliases || [];
    const allClientTerms = [clientName, ...clientAliases];
    const isMeetingThisWeek = !!(app.settings?.thisWeekContext &&
        allClientTerms.some(term =>
            resolvedCtx.clientNames.some(resolved =>
                resolved.toLowerCase() === term.toLowerCase()
            )
        ));
    const briefPurpose = isMeetingThisWeek
        ? `LIVE MEETING BRIEF — you are meeting ${clientName} this week`
        : `ATL ENABLEMENT BRIEF — for the ATL aligned to ${clientName}`;

    const prompt = `You are preparing a brief for the IBM APAC Field CTO.
Goal: Position ATL as "Client CTO" — trusted strategic advisor, not a vendor. The product comes last, discovered never led with.

Brief Purpose: ${briefPurpose}
Client: ${clientName}
Market: ${client.market}
Industry: ${client.industry || 'N/A'}
ATL: ${client.atl || 'Not assigned'}
${contextBlock}
Recent news about ${clientName}:
${articleSummaries}

THE FIVE CONVERSATIONS — choose the strongest door for this client based on the signals above:
- Conv 1 · Govern Your Data (watsonx.data + Confluent): AI ambition stalled on data, platform sprawl, residency exposure
- Conv 2 · Connect & Automate (watsonx Orchestrate + webMethods): agent sprawl, middleware debt, M&A integration, stalled RPA
- Conv 3 · Trust Every Identity (Verify + Vault): zero-trust/audit mandate, DORA-style regulation, machine/agent identity growth
- Conv 4 · Run Anywhere (Terraform + Vault + Cloudability + Concert): cloud cost, multi-cloud, workload sovereignty
- Conv 5 · Build & Modernise (IBM Bob): legacy estate, ungoverned AI coding spend [on-premises GA target 30 Sep 2026]
- Conv L · Lightwell (QUALIFYING PATH — never open cold): open-source CVE exposure the client owns and cannot fix; pinned dependency, community open-source in production, patch-to-production over 45 days

COMPETITIVE COUNTERS (use if a competitor is active at this account):
- vs Snowflake/Databricks → Conv 1: portability + governance across all data, not inside one estate
- vs MuleSoft/Boomi → Conv 2: agent control plane + total estate cost, not one connector's features
- vs Okta/Entra → Conv 3: they keep their IAM for humans; the gap is machines, secrets, and agents
- vs hyperscaler native stack → Conv 4: can you run, govern, and prove the same way everywhere?
- vs GitHub Copilot/Cursor → Conv 5: whole lifecycle + governed spend, not just autocomplete
- vs Snyk/Chainguard/Athena → Conv L: scanning is not fixing; Lightwell supplies the signed fix at the version they already run

THE FIVE-STEP MOTION — structure the ATL's approach:
1. OPEN: TSL + ATL together at C-suite altitude. Lead with a diagnostic question, not a pitch.
2. WHY CHANGE: Surface the cost of standing still. The unconsidered need the client has not yet named.
3. SHAPE: Draw the product-blind architecture bottom-to-top. Name no product until the client points at a layer.
4. WHY IBM: Control built, not granted.
5. PROGRESS: Agree a client step — a review, workshop, or PoC.

Return ONLY valid JSON:
{
    "situationSummary": "2-3 sentences. Lead with client's most pressing challenge. Frame using Why Change language.",
    "conversationDoor": "Conv 1 | Conv 2 | Conv 3 | Conv 4 | Conv 5 | Conv L — one sentence on why these signals point there",
    "whyChange": "One sentence: the cost of standing still for this client. Do not mention IBM.",
    "talkingPoint": "Single talking point: [industry challenge] + [why now] + [IBM product from the conversation door named last]",
    "openingQuestion": "Hypothesis-framed peer CTO opener grounded in today's signals: 'I've been thinking that [observation] — is that consistent with what you're seeing?'",
    "slackMessage": "Under 280 chars. Format: *${clientName} — Signal Alert*\\n📊 [situation] 💡 [talking point] ⚡ [IBM angle] 💬 Q: [opener]"
}`;

    try {
        const { text } = await callAI('STRATEGIC_ANALYSIS', prompt, 600, apiKey);
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const brief = JSON.parse(jsonMatch[0]);

            contentEl.innerHTML = `<div class="brief-atl-slack">
<div class="brief-atl-section"><strong>Situation</strong><p>${escapeHtml(brief.situationSummary || '')}</p></div>
<div class="brief-atl-section"><strong>Conversation Door</strong><p>${escapeHtml(brief.conversationDoor || '')}</p></div>
<div class="brief-atl-section"><strong>Why Change</strong><p>${escapeHtml(brief.whyChange || '')}</p></div>
<div class="brief-atl-section"><strong>Talking Point</strong><p>${escapeHtml(brief.talkingPoint || '')}</p></div>
<div class="brief-atl-section"><strong>Opening Question</strong><p>${escapeHtml(brief.openingQuestion || '')}</p></div>
${brief.slackMessage ? `<div class="brief-atl-section brief-atl-slack-msg"><strong>Slack Message</strong><pre>${escapeHtml(brief.slackMessage)}</pre></div>` : ''}
</div>`;
            app.lastBriefATLText = brief.slackMessage || text;
        } else {
            contentEl.innerHTML = `<div class="brief-atl-slack">${escapeHtml(text)}</div>`;
            app.lastBriefATLText = text;
        }

    } catch (err) {
        contentEl.innerHTML = `<p>Error: ${err.message}</p>`;
        app.lastBriefATLText = '';
    }
}

function closeBriefATL() {
    document.getElementById('brief-atl-modal').classList.add('hidden');
}

function copyBriefATL() {
    if (!app.lastBriefATLText) {
        showToast('No brief to copy');
        return;
    }
    navigator.clipboard.writeText(app.lastBriefATLText).then(() => {
        showToast('Copied to clipboard');
    }).catch(() => {
        showToast('Failed to copy');
    });
}

// ==========================================
// ATL ENABLEMENT RENDERING
// Shows industry signals grouped by market for quick Slack sharing
// ==========================================

function renderMarketInsights(forceRefresh = false) {
    const list = document.getElementById('market-insights-list');
    if (!list) return;
    
    // Check cache first
    const STORAGE_KEY_MARKET = 'signal-today-market-insights-cache';
    if (!forceRefresh) {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_MARKET);
            if (cached) {
                const { briefs, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                if (age < CACHE_DURATIONS.MARKET_INSIGHTS && briefs && briefs.length > 0) {
                    trackCacheAccess('market-insights', true); // Cache HIT
                    list.innerHTML = briefs.map(renderMarketBriefCard).join('');
                    return;
                }
            }
        } catch (e) {
            console.log('Market insights cache error:', e);
        }
    }
    
    trackCacheAccess('market-insights', false); // Cache MISS
    
    // Group signals by market
    const marketSignals = {
        'ANZ': [],
        'ASEAN': [],
        'GCG': [],
        'ISA': [],
        'KOREA': []
    };
    
    // Get today's articles with industry matches
    const todayArticles = app.dailyArticles.length > 0 ? app.dailyArticles : app.articles.slice(0, 30);
    
    // Step 1: Exclusive market assignment - each article goes to ONE market only
    if (typeof APAC_MARKET_CONTEXT !== 'undefined') {
        // Generic terms to exclude from matching (too broad to be useful)
        const GENERIC_TERMS = ['asia pacific', 'apac', 'asia', 'pacific', 'region', 'regional'];
        
        todayArticles.forEach(article => {
            const text = `${article.title} ${article.summary || ''}`.toLowerCase();
            
            // Collect ALL matches from ALL markets with their priorities
            const allMatches = [];
            
            for (const [market, context] of Object.entries(APAC_MARKET_CONTEXT)) {
                if (!marketSignals[market]) continue;
                
                // Priority 1: Countries/cities (geographic routing - HIGHEST PRIORITY)
                // Geographic location is the most definitive indicator of market relevance
                // ENHANCED: Boost priority for specific geographic mentions
                const matchedCountry = context.countries?.find(c => {
                    const term = c.toLowerCase();
                    // Exclude generic terms that are too broad
                    return text.includes(term) && !GENERIC_TERMS.includes(term);
                });
                if (matchedCountry) {
                    // Calculate priority boost based on specificity
                    let priorityScore = 1.0;
                    
                    // Boost for highly specific locations (cities, not just countries)
                    const specificLocations = ['hong kong', 'singapore', 'sydney', 'melbourne',
                                              'mumbai', 'delhi', 'seoul', 'taipei', 'shanghai'];
                    if (specificLocations.includes(matchedCountry.toLowerCase())) {
                        priorityScore = 0.5; // Higher priority (lower number)
                    }
                    
                    // Additional boost if location appears in title (more relevant)
                    if (article.title.toLowerCase().includes(matchedCountry.toLowerCase())) {
                        priorityScore -= 0.2;
                    }
                    
                    allMatches.push({
                        market,
                        priority: Math.max(priorityScore, 0.3), // Minimum 0.3 to stay highest priority
                        signal: matchedCountry,
                        type: 'geographic'
                    });
                }
                
                // Priority 2: Regulators (market-specific, but less definitive than geography)
                // ENHANCED: Add exclusion patterns for ambiguous terms like ASIC
                const matchedRegulator = context.regulators?.find(r => {
                    const regLower = r.toLowerCase();
                    if (!text.includes(regLower)) return false;
                    
                    // ASIC disambiguation: exclude if technology/chip context present
                    if (regLower === 'asic') {
                        const techExclusions = ['chip', 'semiconductor', 'circuit', 'fabrication',
                                               'tsmc', 'nvidia', 'manufacturing', 'foundry', 'wafer',
                                               'asic design', 'asic miner', 'bitcoin asic'];
                        if (techExclusions.some(excl => text.includes(excl))) {
                            return false; // This is about chips, not the Australian regulator
                        }
                        
                        // Validate it's the regulator by checking for regulatory context
                        const regContext = ['commission', 'guidance', 'enforcement', 'compliance',
                                          'australian securities', 'regulator', 'regulatory'];
                        const hasRegContext = regContext.some(ctx => text.includes(ctx));
                        const hasAustraliaContext = text.includes('australia') || text.includes('australian');
                        
                        // Only match if regulatory context OR Australia mentioned
                        return hasRegContext || hasAustraliaContext;
                    }
                    
                    return true;
                });
                
                if (matchedRegulator) {
                    allMatches.push({
                        market,
                        priority: 2,
                        signal: matchedRegulator.toUpperCase(),
                        type: 'regulatory'
                    });
                }
                
                // Priority 3: Market priorities
                const matchedPriority = context.priorities?.find(p => text.includes(p.toLowerCase()));
                if (matchedPriority) {
                    allMatches.push({
                        market,
                        priority: 3,
                        signal: matchedPriority,
                        type: 'priority'
                    });
                }
                
                // Priority 4: Watchwords
                const matchedWatchword = context.watchwords?.find(w => text.includes(w.toLowerCase()));
                if (matchedWatchword) {
                    allMatches.push({
                        market,
                        priority: 4,
                        signal: matchedWatchword,
                        type: 'watchword'
                    });
                }
            }
            
            // Sort by priority (lowest number = highest priority) and take the best match
            if (allMatches.length > 0) {
                allMatches.sort((a, b) => a.priority - b.priority);
                const bestMatch = allMatches[0];
                
                marketSignals[bestMatch.market].push({
                    type: bestMatch.type,
                    signal: bestMatch.signal,
                    article,
                    priority: bestMatch.priority
                });
            }
        });
    }
    
    // Step 2: Add client-specific signals (only if not already assigned)
    todayArticles.forEach(article => {
        if (!article.matchedClients || article.matchedClients.length === 0) return;
        
        // Check if article is already assigned to a market
        const alreadyAssigned = Object.values(marketSignals).some(signals =>
            signals.some(s => s.article?.id === article.id)
        );
        
        if (!alreadyAssigned) {
            // Assign to first matching client's market
            for (const clientName of article.matchedClients) {
                const client = app.clients.find(c => c.name === clientName);
                if (client && marketSignals[client.market]) {
                    marketSignals[client.market].push({
                        type: 'client',
                        signal: clientName,
                        clientTier: client.tier,
                        article,
                        priority: 0
                    });
                    break; // Only assign to ONE market
                }
            }
        }
    });
    
    // Step 3: Sort by priority
    Object.keys(marketSignals).forEach(market => {
        marketSignals[market].sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            if (a.clientTier && b.clientTier) return a.clientTier - b.clientTier;
            return 0;
        });
    });
    
    // Show all 5 markets, even if some have 0 signals
    const activeMarkets = Object.entries(marketSignals)
        .map(([market, signals]) => ({
            market,
            signals: signals.slice(0, 5),
            hasSignals: signals.length > 0
        }));
    
    // Check if ANY market has signals
    const hasAnySignals = activeMarkets.some(m => m.hasSignals);
    
    if (!hasAnySignals) {
        list.innerHTML = '<p class="card-description">No market signals today. Click Refresh to fetch latest articles.</p>';
        return;
    }
    
    // Check for API key
    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];

    if (!apiKey) {
        // Without API: serve existing cache if available, otherwise show article list
        const briefs = activeMarkets.map(({ market, signals, hasSignals }) => {
            try {
                const cached = localStorage.getItem('market_insights_' + market + '_cache');
                if (cached) {
                    const cachedBrief = JSON.parse(cached);
                    if (cachedBrief && cachedBrief.synthesis) return cachedBrief;
                }
            } catch (e) {}
            return {
                market,
                synthesis: hasSignals
                    ? `${signals.length} signals detected for ${market} market today.`
                    : `No signals detected for ${market} market today.`,
                sources: signals.map(s => ({
                    title: s.article.title,
                    url: s.article.url,
                    source: s.article.source || s.article.sourceName
                })),
                copyText: hasSignals ? generateMarketCopyText(market, signals) : `No signals for ${market} today.`,
                hasSignals
            };
        });
        
        list.innerHTML = briefs.map(renderMarketBriefCard).join('');
        cacheMarketInsights(briefs);
        return;
    }
    
    // With API: Generate AI synthesis per market
    list.innerHTML = '<p class="card-description">Synthesizing market insights...</p>';
    generateMarketSynthesis(activeMarkets, apiKey, list);
}

// Helper function to check if market has new articles since last generation
function hasNewArticlesForMarket(market, signals, lastGenerationTime) {
    if (!lastGenerationTime) return true; // First time generation
    
    // Check if any articles in this market are newer than last generation
    return signals.some(s => {
        const article = s.article;
        if (!article) return false;
        
        const articleDate = new Date(article.pubDate || article.isoDate).getTime();
        return articleDate > lastGenerationTime;
    });
}

async function generateMarketSynthesis(activeMarkets, apiKey, listEl) {
    const briefs = [];
    
    // PHASE 2.1: Separate markets into cached vs needs-generation
    const marketsToGenerate = [];
    
    for (const { market, signals, hasSignals } of activeMarkets) {
        // Skip AI synthesis for markets with no signals
        if (!hasSignals) {
            briefs.push({
                market,
                synthesis: `No signals detected for ${market} market today.`,
                sources: [],
                copyText: `No signals for ${market} today.`,
                hasSignals: false
            });
            continue;
        }
        
        // PHASE 1.2: Check if market has new articles since last generation
        const cacheKey = `market_insights_${market}_timestamp`;
        const lastGenTime = parseInt(localStorage.getItem(cacheKey) || '0');
        
        if (!hasNewArticlesForMarket(market, signals, lastGenTime)) {
            // Use cached insight for this market - no new articles
            try {
                const cached = localStorage.getItem(`market_insights_${market}_cache`);
                if (cached) {
                    const cachedBrief = JSON.parse(cached);
                    briefs.push(cachedBrief);
                    console.log(`Using cached insight for ${market} - no new articles`);
                    continue; // Skip API call
                }
            } catch (e) {
                console.log(`Cache read error for ${market}:`, e);
            }
        }
        
        // Market needs generation - add to batch
        marketsToGenerate.push({ market, signals, hasSignals });
    }
    
    // PHASE 2.1: If multiple markets need generation, batch them in ONE API call
    if (marketsToGenerate.length > 0) {
        console.log(`Batching ${marketsToGenerate.length} markets in single API call`);
        
        // Build batched prompt with all markets
        const marketPrompts = marketsToGenerate.map(({ market, signals }) => {
            const articleSummaries = signals.map((s, i) => {
                const a = s.article;
                const clientsStr = (a.matchedClients || []).slice(0, 2).join(', ') || 'none';
                const doorStr = (a.intelligence?.tier === 3 && a.intelligence?.conversationDoor)
                    ? ` | Door: ${a.intelligence.conversationDoor}`
                    : '';
                return `[${i + 1}] "${a.title}" (${a.source || a.sourceName})\nType: ${s.type}, Signal: ${s.signal} | Clients: ${clientsStr}${doorStr}\nSummary: ${(a.summary || '').substring(0, 200)}`;
            }).join('\n\n');
            
            return `## ${market} MARKET
${articleSummaries}`;
        }).join('\n\n---\n\n');
        
        const batchedPrompt = `You are briefing IBM APAC leaders on market intelligence. Lead with Why Change — the cost of standing still — not a product pitch.

TODAY'S SIGNALS BY MARKET:
${marketPrompts}

MARKET CONTEXT:
- ANZ: APRA/ASIC oversight, strong sovereignty focus, mature financial sector
- ASEAN: MAS leadership in AI governance, data localization momentum, digital economy growth
- GCG: HKMA/SFC compliance, cross-border data complexity, China+1 dynamics
- ISA: RBI/SEBI/IRDAI frameworks, Digital India acceleration, manufacturing transformation
- KOREA: FSC oversight, semiconductor leadership, chaebols driving enterprise AI

THE FIVE CONVERSATIONS — assign conversationDoor per market:
- Conv 1 · Govern Your Data (watsonx.data + Confluent): AI ambition stalled on data, platform sprawl, residency exposure
- Conv 2 · Connect & Automate (watsonx Orchestrate + webMethods): agent sprawl, middleware debt, M&A integration, stalled RPA
- Conv 3 · Trust Every Identity (Verify + Vault): zero-trust/audit mandate, DORA-style regulation, machine/agent identity growth
- Conv 4 · Run Anywhere (Terraform + Vault + Cloudability + Concert): cloud cost, multi-cloud, workload sovereignty
- Conv 5 · Build & Modernise (IBM Bob): legacy estate, ungoverned AI coding spend [on-premises GA target 30 Sep 2026]
- Conv L · Lightwell (QUALIFYING PATH — never open cold): open-source CVE exposure the client owns and cannot fix; pinned dependency, private fork, community open-source in production, patch-to-production over 45 days

For EACH market, write ONE synthesized paragraph (3-4 sentences):
1. Open with the key market theme — the cost of standing still for enterprises in that market
2. Connect 2-3 articles into a coherent narrative grounded in that market's regulatory/competitive context
3. State the conversation door to open with accounts showing these signals
4. End with a specific ATL action using the five-step motion: Open (diagnostic question) → Why Change → Shape (product-blind architecture) → Why IBM → Progress (agree a client step)

RULES:
- Sound like a senior technical leader, not a news aggregator
- Reference specific regulators and companies from the articles
- Focus ONLY on each market's implications — do not apply signals from one market to another
- Include ONE actionable ATL takeaway per market
- CRITICAL VALIDATION: Verify geographic accuracy before synthesis:
  * Hong Kong, Taiwan, China, Macau → GCG market ONLY
  * Australia, New Zealand → ANZ market ONLY
  * Singapore, Malaysia, Indonesia, Thailand, Philippines, Vietnam → ASEAN market ONLY
  * India, Sri Lanka, Bangladesh, Pakistan → ISA market ONLY
  * South Korea → KOREA market ONLY
- If article location doesn't match target market, EXCLUDE it entirely

Return JSON:
{
  "markets": {
    "ANZ": {
      "synthesis": "3-4 sentence market brief",
      "conversationDoor": "Conv 1 | Conv 2 | Conv 3 | Conv 4 | Conv 5 | Conv L",
      "keyMessage": "One-sentence ATL action using the five-step motion"
    }
  }
}

Only include markets that were provided in the input above.`;

        try {
            // COST OPTIMIZATION: Use unified API helper with token tracking
            const { text } = await callAI('SYNTHESIS', batchedPrompt, 1000, apiKey);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                
                // Extract results for each market
                marketsToGenerate.forEach(({ market, signals }) => {
                    const marketResult = result.markets?.[market];
                    
                    if (marketResult) {
                        const brief = {
                            market,
                            synthesis: marketResult.synthesis,
                            conversationDoor: marketResult.conversationDoor || marketResult.leadPillar,
                            keyMessage: marketResult.keyMessage,
                            sources: signals.map(s => ({
                                title: s.article.title,
                                url: s.article.url,
                                source: s.article.source || s.article.sourceName
                            })),
                            copyText: generateMarketCopyText(market, signals, marketResult.synthesis, marketResult.keyMessage),
                            hasSignals: true
                        };
                        briefs.push(brief);
                        
                        // Cache the generated insight
                        try {
                            localStorage.setItem(`market_insights_${market}_cache`, JSON.stringify(brief));
                            localStorage.setItem(`market_insights_${market}_timestamp`, Date.now().toString());
                            console.log(`Cached batched insight for ${market}`);
                        } catch (e) {
                            console.log(`Cache write error for ${market}:`, e);
                        }
                    } else {
                        // Fallback if market missing from response
                        briefs.push({
                            market,
                            synthesis: `${signals.length} signals detected for ${market} market.`,
                            sources: signals.map(s => ({
                                title: s.article.title,
                                url: s.article.url,
                                source: s.article.source || s.article.sourceName
                            })),
                            copyText: generateMarketCopyText(market, signals),
                            hasSignals: true
                        });
                    }
                });
            } else {
                throw new Error('No valid JSON in batched response');
            }
        } catch (error) {
            console.error('Batched market synthesis error:', error);
            // Fallback: add basic briefs for all markets that failed
            marketsToGenerate.forEach(({ market, signals }) => {
                briefs.push({
                    market,
                    synthesis: `${signals.length} signals detected for ${market} market. Review sources below.`,
                    sources: signals.map(s => ({
                        title: s.article.title,
                        url: s.article.url,
                        source: s.article.source || s.article.sourceName
                    })),
                    copyText: generateMarketCopyText(market, signals),
                    hasSignals: true
                });
            });
        }
    }
    
    listEl.innerHTML = briefs.map(renderMarketBriefCard).join('');
    cacheMarketInsights(briefs);
    
    // PHASE 3.2: Update timestamp for Market Insights
    updateSectionTimestamp('market-insights', Date.now(), false);
}

function generateMarketCopyText(market, signals, synthesis = null, keyMessage = null) {
    const date = new Date().toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' });
    let text = `📡 The Signal Today | ${market} Market Insights | ${date}\n\n`;
    
    if (synthesis) {
        text += `${synthesis}\n\n`;
    }
    if (keyMessage) {
        text += `💡 Key Message: ${keyMessage}\n\n`;
    }
    
    text += `Sources:\n`;
    signals.forEach(s => {
        const sourceName = s.article.source || s.article.sourceName || 'Source';
        text += `• ${s.article.title} (${sourceName})\n  ${s.article.url || ''}\n`;
    });
    
    return text;
}

function renderMarketBriefCard(brief) {
    const sourcesHtml = (brief.sources || []).map(s =>
        `<a href="${s.url || '#'}" target="_blank" class="market-source-link">${escapeHtml(s.title)}</a> <span class="market-source-name">(${escapeHtml(s.source || 'Source')})</span>`
    ).join('<br>');
    
    const hasSignals = brief.hasSignals !== false && (brief.sources?.length || 0) > 0;
    const opacityClass = hasSignals ? '' : ' market-brief-empty';
    
    return `
        <div class="market-brief${opacityClass}" data-copy-text="${escapeHtml(brief.copyText || '')}">
            <div class="market-brief-header">
                <span class="market-brief-market">${brief.market}</span>
                <span class="market-brief-count">${brief.sources?.length || 0} signals</span>
                ${hasSignals ? `<button class="market-brief-copy" onclick="copyMarketBrief(this, '${brief.market}')" title="Copy to clipboard">📋</button>` : ''}
            </div>
            <div class="market-brief-synthesis">${escapeHtml(brief.synthesis || '')}</div>
            ${brief.conversationDoor ? `<div class="market-brief-lead-pillar">🗣️ <strong>Conversation Door:</strong> ${escapeHtml(brief.conversationDoor)}</div>` : ''}
            ${brief.keyMessage ? `<div class="market-brief-key-message">💡 <strong>Key Message:</strong> ${escapeHtml(brief.keyMessage)}</div>` : ''}
            ${hasSignals ? `
            <div class="market-brief-sources">
                <span class="market-sources-label">Sources:</span>
                ${sourcesHtml}
            </div>
            ` : ''}
        </div>
    `;
}

function cacheMarketInsights(briefs) {
    try {
        localStorage.setItem('signal-today-market-insights-cache', JSON.stringify({
            briefs,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.log('Market insights cache write error:', e);
    }
}

// Classify signal type based on article content
function classifySignalType(article) {
    const text = ` ${(article.title || '')} ${article.summary || ''} `.toLowerCase();
    
    // Helper: check if keyword matches as whole word or phrase
    const hasKeyword = (keywords) => keywords.some(k => {
        // For multi-word phrases, simple includes is fine
        if (k.includes(' ')) return text.includes(k);
        // For single words, check word boundaries
        const pattern = new RegExp(`\\b${k}\\b`, 'i');
        return pattern.test(text);
    });
    
    // Risk signals - threats, breaches, failures (check first - highest priority)
    const riskKeywords = [
        'breach', 'breached', 'hack', 'hacked', 'hacking', 'cyberattack', 'cyber attack', 
        'ransomware', 'malware', 'phishing', 'ddos',
        'outage', 'downtime', 'failure', 'crash', 'crashed', 'disruption',
        'lawsuit', 'sued', 'suing', 'litigation', 'legal action', 'class action',
        'fine', 'fined', 'penalty', 'penalized', 'sanction', 'sanctioned',
        'scandal', 'fraud', 'misconduct', 'investigation', 'probe', 'scrutiny',
        'layoff', 'layoffs', 'job cuts', 'workforce reduction', 'restructuring', 'downsizing',
        'downturn', 'decline', 'slump', 'losses', 'plunge', 'plunges',
        'warning', 'warns', 'warned', 'caution', 'alert',
        'risk', 'threat', 'vulnerable', 'vulnerability', 'exploit', 'security flaw',
        'data leak', 'exposed', 'compromised', 'stolen'
    ];
    if (hasKeyword(riskKeywords)) return 'risk';
    
    // Regulatory signals - policy, compliance, government
    const regulatoryKeywords = [
        'regulation', 'regulations', 'regulatory', 'regulator', 'regulators',
        'compliance', 'compliant', 'non-compliance', 'comply',
        'mandate', 'mandates', 'mandated', 'mandatory', 'requirement',
        'legislation', 'legislative', 'bill passes', 'new law', 'enacted',
        'policy', 'policies', 'government', 'ministry', 'minister',
        'guideline', 'guidelines', 'framework', 'standard', 'standards',
        // APAC regulators (full names to avoid false positives)
        'apra', 'asic', 'accc', 'oaic', 'australian regulator',
        'monetary authority of singapore', 'imda', 'pdpc', 'singapore regulator',
        'sebi', 'reserve bank of india', 'irdai', 'meity', 'indian regulator',
        'korea fsc', 'korean regulator', 'kisa', 'pipc',
        'hkma', 'hong kong regulator', 'sfc',
        'bank indonesia', 'ojk', 'kominfo',
        'bank negara malaysia',
        // Global regulations
        'dora regulation', 'ai act', 'eu ai act', 'gdpr', 'ccpa', 'sox compliance', 'basel',
        'data protection', 'privacy law', 'data sovereignty', 'data localization', 'data residency'
    ];
    if (hasKeyword(regulatoryKeywords)) return 'regulatory';
    
    // Competitive signals - competitor moves, market dynamics
    const competitiveKeywords = [
        // Major cloud/tech competitors (use full names where possible)
        'amazon web services', 'azure', 'microsoft cloud', 'microsoft azure',
        'google cloud', 'alibaba cloud', 'huawei cloud', 'tencent cloud',
        // Enterprise software
        'salesforce', 'oracle cloud', 'sap', 'workday', 'servicenow', 'snowflake', 'databricks',
        // AI competitors
        'openai', 'anthropic', 'google gemini', 'meta ai', 'nvidia',
        // Consulting/SI competitors
        'accenture', 'deloitte', 'pwc', 'kpmg', 'capgemini', 'infosys', 'tcs', 'wipro', 'cognizant',
        // Deal signals
        'partnership', 'partners with', 'partnering', 'strategic alliance',
        'wins contract', 'awarded contract', 'wins deal', 'secures deal',
        'acquisition', 'acquires', 'acquired', 'merger', 'merges', 'takeover',
        'market share', 'competitive', 'competitor', 'rivals', 'versus', ' vs ',
        'beats', 'overtakes', 'surpasses', 'outperforms'
    ];
    if (hasKeyword(competitiveKeywords)) return 'competitive';
    
    // Opportunity signals - growth, investment, transformation
    const opportunityKeywords = [
        'investment', 'investing', 'invests', 'invested', 'funding', 'funded', 'raises', 'raise capital',
        'expansion', 'expands', 'expanding', 'growth', 'growing', 'grows',
        'launch', 'launches', 'launched', 'unveils', 'announces', 'introduces', 'rolls out',
        'transform', 'transformation', 'transforming', 'digital transformation',
        'modernize', 'modernization', 'modernizing', 'upgrade', 'upgrades', 'revamp',
        'initiative', 'strategy', 'strategic', 'roadmap', 'vision',
        'innovation', 'innovative', 'innovates', 'breakthrough',
        'pilot', 'pilots', 'proof of concept', 'trial',
        'adoption', 'adopts', 'adopting', 'implements', 'deploys', 'rollout',
        // Technology trends (more specific)
        'artificial intelligence', 'machine learning', 'generative ai', 'genai', 'large language model',
        'cloud migration', 'hybrid cloud', 'multi-cloud', 'cloud-native', 'cloud adoption',
        'automation', 'automates', 'rpa', 'intelligent automation', 'hyperautomation',
        'data platform', 'data fabric', 'data mesh', 'analytics platform', 'data strategy'
    ];
    
    // IBM-specific - check BEFORE opportunity to correctly tag IBM news
    const ibmKeywords = ['ibm', 'watsonx', 'watson', 'red hat', 'openshift', 'ansible', 'instana', 'turbonomic', 'apptio', 'hashicorp', 'terraform', 'vault', 'webMethods', 'Confluent', 'IBM Bob', 'Guardium', 'Concert', 'Maximo', 'Fusion'];
    if (hasKeyword(ibmKeywords)) return 'ibm';
    
    if (hasKeyword(opportunityKeywords)) return 'opportunity';
    
    // Relationship signals - executive changes
    const relationshipKeywords = [
        'appoints', 'appointed', 'names', 'named', 'new ceo', 'new cto', 'new cio', 'new cfo', 'new ciso',
        'executive', 'leadership change', 'joins', 'joining', 'departs', 'departing', 
        'steps down', 'promoted', 'promotion', 'hire', 'hires', 'hired'
    ];
    if (hasKeyword(relationshipKeywords)) return 'relationship';
    
    return 'general';
}

function copyMarketBrief(btn, market) {
    const brief = btn.closest('.market-brief');
    const content = brief.dataset.copyText || brief.querySelector('.market-brief-content')?.textContent || '';
    navigator.clipboard.writeText(content).then(() => {
        btn.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = '📋';
            btn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        btn.textContent = '❌';
        setTimeout(() => {
            btn.textContent = '📋';
        }, 2000);
    });
}

// ==========================================
// EXECUTIVE SUMMARY RENDERING (AI-powered)
// Purpose: "3 things to know today" - synthesized insights
// ==========================================

const STORAGE_KEY_EXEC_SUMMARY = 'signal-today-exec-summary-cache';

async function renderExecutiveSummary(forceRefresh = false) {
    const content = document.getElementById('executive-summary-content');
    const list = document.getElementById('executive-summary-list');
    if (!content || !list) return;
    
    // Check cache first
    if (!forceRefresh) {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_EXEC_SUMMARY);
            if (cached) {
                const { insights, timestamp, articleCount } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                if (age < CACHE_DURATIONS.DAILY_DIGEST && insights && insights.length > 0) {
                    trackCacheAccess('executive-summary', true); // Cache HIT
                    list.innerHTML = insights.map(renderExecutiveInsight).join('');
                    content.querySelector('.executive-summary-intro')?.classList.add('hidden');
                    
                    // PHASE 3.2: Update timestamp for cached content
                    updateSectionTimestamp('executive-summary', timestamp, true);
                    return;
                }
            }
        } catch (e) {
            console.log('Exec summary cache error:', e);
        }
    }
    
    trackCacheAccess('executive-summary', false); // Cache MISS
    
    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];
    const todayArticles = app.dailyArticles.length > 0 ? app.dailyArticles : app.articles.slice(0, 30);
    
    if (todayArticles.length === 0) {
        list.innerHTML = '<p class="card-description">No articles yet. Click Refresh to fetch.</p>';
        return;
    }
    
    // PHASE 3.1: Smart triggering - check if we have enough new articles
    if (!forceRefresh && apiKey) {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_EXEC_SUMMARY);
            if (cached) {
                const { insights, timestamp, articleCount } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                
                // Count new articles since last generation
                const newArticles = todayArticles.filter(a => {
                    const articleDate = new Date(a.pubDate || a.isoDate).getTime();
                    return articleDate > timestamp;
                });
                
                // If cache is still valid AND fewer than 5 new articles, use cache
                if (age < CACHE_DURATIONS.DAILY_DIGEST && newArticles.length < 5) {
                    console.log(`Daily Digest: Only ${newArticles.length} new articles, using cache`);
                    list.innerHTML = insights.map(renderExecutiveInsight).join('');
                    content.querySelector('.executive-summary-intro')?.classList.add('hidden');
                    
                    // PHASE 3.2 & 3.3: Update timestamp and show "no new insights" indicator
                    updateSectionTimestamp('executive-summary', timestamp, true, `No new insights (${newArticles.length} new articles)`);
                    return;
                }
                
                console.log(`Daily Digest: ${newArticles.length} new articles, regenerating`);
            }
        } catch (e) {
            console.log('Smart trigger check error:', e);
        }
    }
    
    // Prepare article data for synthesis
    const topArticles = todayArticles
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 15);
    
    // Calculate weekly trends
    const weeklyTrends = calculateWeeklyTrends(topArticles);
    
    if (!apiKey) {
        // Without API: Generate keyword-based insights
        const insights = generateKeywordBasedInsights(topArticles, weeklyTrends);
        list.innerHTML = insights.map(renderExecutiveInsight).join('');
        content.querySelector('.executive-summary-intro')?.classList.add('hidden');
        cacheExecutiveSummary(insights, todayArticles.length);
        return;
    }
    
    // With API: Generate AI-synthesized insights
    content.querySelector('.executive-summary-intro')?.classList.remove('hidden');
    content.querySelector('.executive-summary-intro').textContent = 'Synthesizing executive insights...';
    
    const articleSummaries = topArticles.slice(0, 12).map((a, i) => {
        const isTier3 = a.intelligence?.tier === 3 && a.intelligence?.conversationDoor;
        if (isTier3) {
            return `[${i + 1}] "${a.title}" (${a.source || a.sourceName})\nDoor: ${a.intelligence.conversationDoor} | Intel: ${(a.intelligence.reasoning || '').substring(0, 100)}\nSummary: ${(a.summary || '').substring(0, 150)}`;
        }
        return `[${i + 1}] "${a.title}" (${a.source || a.sourceName})\nSignal: ${a.signalType || 'general'}, Clients: ${(a.matchedClients || []).join(', ') || 'none'}\nSummary: ${(a.summary || '').substring(0, 150)}`;
    }).join('\n\n');

    const trendContext = weeklyTrends.length > 0
        ? `\nWEEKLY TRENDS:\n${weeklyTrends.map(t => `- ${t.theme}: ${t.direction} (${t.change})`).join('\n')}`
        : '';

    const contextBlock = app.settings?.thisWeekContext
        ? `\nTHIS WEEK'S CONTEXT (prioritize relevance to these meetings/deals):\n${app.settings.thisWeekContext}\n`
        : '';

    const prompt = `You are the intelligence analyst for the IBM APAC Field CTO who leads 115 ATLs across 343 accounts.

TODAY'S TOP ARTICLES:
${articleSummaries}
${trendContext}
${contextBlock}
MISSION: Generate EXACTLY 3 executive insights for the "Client CTO" role.

Each insight must:
1. SYNTHESIZE multiple articles into ONE actionable insight
2. Answer "So what does this mean for IBM APAC?"
3. Name the conversation door it opens (Conv 1 / Conv 2 / Conv 3 / Conv 4 / Conv 5)
4. Include specific action or positioning recommendation

FRAMEWORK REMINDERS:
- Under 1% of enterprise data is AI-ready — governed access is the bottleneck, not the model
- Position ATLs as "Client CTOs"—strategic advisors, not vendors

COMPETITIVE COUNTERS (use in sections and starters):
- vs Snowflake/Databricks → Conv 1: portability and governance across all data, not inside one estate
- vs MuleSoft/Boomi → Conv 2: total estate cost and agent control plane, not one connector's features
- vs Okta/Entra → Conv 3: human + non-human identity as one fabric; they keep their IAM, we close the machine/agent gap
- vs hyperscaler native stack → Conv 4: portability and lock-in — can you run, govern, and prove the same way everywhere?
- vs GitHub Copilot/Cursor → Conv 5: autocomplete speeds one slice; Bob governs the whole lifecycle and the bill
- vs Snyk/Chainguard/Athena → Conv L: scanning is not fixing; Lightwell supplies the signed fix at the version they already run

Return JSON array, no markdown fences:
[
  {
    "headline": "Sharp, memorable (8 words max)",
    "synthesis": "2-3 sentences: what's happening, why it matters for IBM APAC, what to do",
    "conversationDoor": "Conv 1 or Conv 2 or Conv 3 or Conv 4 or Conv 5 or Conv L",
    "sourceIndices": [1, 3, 5]
  }
]

RULES:
- Each insight must reference at least 2 articles
- ONE insight must directly reference a Tier 3 intelligence finding (Door + Intel fields) if any articles have them
- ONE insight should address competitive positioning
- ONE insight should be actionable THIS WEEK
- Be specific about APAC markets when relevant
- Refer to signals by their topic, not their index number
- The synthesis should read naturally without referencing article numbers`;

    try {
        // COST OPTIMIZATION: Use unified API helper with token tracking
        const { text } = await callAI('SYNTHESIS', prompt, 1000, apiKey);
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            const synthesized = JSON.parse(jsonMatch[0]);
            
            // Map sourceIndices to actual article data
            const insights = synthesized.map(insight => ({
                ...insight,
                sources: (insight.sourceIndices || []).map(idx => {
                    const article = topArticles[idx - 1];
                    if (!article) return null;
                    return {
                        title: article.title,
                        url: article.url,
                        source: article.source || article.sourceName
                    };
                }).filter(Boolean)
            }));
            
            cacheExecutiveSummary(insights, todayArticles.length);
            list.innerHTML = insights.map(renderExecutiveInsight).join('');
            content.querySelector('.executive-summary-intro')?.classList.add('hidden');
            
            // PHASE 3.2: Update timestamp
            updateSectionTimestamp('executive-summary', Date.now(), false);
        } else {
            throw new Error('Could not parse AI response');
        }
    } catch (error) {
        console.error('Executive summary error:', error);
        // Fallback to keyword-based
        const insights = generateKeywordBasedInsights(topArticles, weeklyTrends);
        list.innerHTML = insights.map(renderExecutiveInsight).join('');
        content.querySelector('.executive-summary-intro')?.classList.add('hidden');
        cacheExecutiveSummary(insights, todayArticles.length);
    }
}

// ==========================================
// COPY: Today's Brief to clipboard
// ==========================================
function copyExecutiveSummary() {
    let text = `📊 Today's Brief — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n`;
    try {
        const cached = localStorage.getItem(STORAGE_KEY_EXEC_SUMMARY);
        if (!cached) { showToast('No brief to copy'); return; }
        const { insights } = JSON.parse(cached);
        if (!insights?.length) { showToast('No brief to copy'); return; }
        insights.forEach(ins => {
            if (ins.conversationDoor) text += `[${ins.conversationDoor}]\n`;
            text += `${ins.headline}\n`;
            if (ins.synthesis) text += `${ins.synthesis}\n`;
            text += '\n';
        });
    } catch(e) { showToast('Copy failed'); return; }
    navigator.clipboard.writeText(text.trim()).then(() => showToast("✅ Today's Brief copied"));
}

function calculateWeeklyTrends(articles) {
    // Compare themes in current articles vs stored weekly data
    const trends = [];
    const themeCounts = {};
    
    // Count current themes
    const themeKeywords = {
        'AI/Agentic': ['ai', 'artificial intelligence', 'agentic', 'llm', 'generative'],
        'Sovereignty': ['sovereignty', 'data localization', 'regulation', 'compliance'],
        'Competitive': ['aws', 'azure', 'google cloud', 'microsoft', 'salesforce'],
        'Executive': ['ceo', 'cto', 'cio', 'appoints', 'announces']
    };
    
    articles.forEach(a => {
        const text = `${a.title} ${a.summary || ''}`.toLowerCase();
        Object.entries(themeKeywords).forEach(([theme, keywords]) => {
            if (keywords.some(k => text.includes(k))) {
                themeCounts[theme] = (themeCounts[theme] || 0) + 1;
            }
        });
    });
    
    // Compare to last week (simplified - could be enhanced with actual historical data)
    Object.entries(themeCounts).forEach(([theme, count]) => {
        if (count >= 3) {
            trends.push({
                theme,
                direction: 'elevated',
                change: `${count} signals today`
            });
        }
    });
    
    return trends.slice(0, 3);
}

function generateKeywordBasedInsights(articles, trends) {
    const insights = [];
    
    // Group articles by signal type
    const byType = { risk: [], opportunity: [], competitive: [], regulatory: [] };
    articles.forEach(a => {
        const type = a.signalType || classifySignalType(a);
        if (byType[type]) byType[type].push(a);
    });
    
    // Helper to extract key themes from articles
    const extractThemes = (articleList) => {
        const themes = new Set();
        const competitors = new Set();
        const clients = new Set();
        
        articleList.forEach(a => {
            // Extract competitors
            const text = `${a.title} ${a.summary || ''}`.toLowerCase();
            ['microsoft', 'aws', 'google', 'salesforce', 'oracle', 'sap'].forEach(comp => {
                if (text.includes(comp)) competitors.add(comp.charAt(0).toUpperCase() + comp.slice(1));
            });
            
            // Extract clients if available
            if (a.matchedClients && a.matchedClients.length > 0) {
                a.matchedClients.forEach(c => clients.add(c));
            }
            
            // Extract key themes
            if (text.includes('ai') || text.includes('artificial intelligence')) themes.add('AI');
            if (text.includes('cloud')) themes.add('cloud');
            if (text.includes('security') || text.includes('cybersecurity')) themes.add('security');
            if (text.includes('regulation') || text.includes('compliance')) themes.add('regulation');
            if (text.includes('data sovereignty')) themes.add('data sovereignty');
        });
        
        return { themes: Array.from(themes), competitors: Array.from(competitors), clients: Array.from(clients) };
    };
    
    // Insight 1: Top risk or regulatory signal
    const riskArticles = [...byType.risk, ...byType.regulatory].slice(0, 3);
    if (riskArticles.length > 0) {
        const { themes, competitors, clients } = extractThemes(riskArticles);
        const topArticle = riskArticles[0];
        
        let synthesis = '';
        if (themes.length > 0) {
            synthesis = `${themes.join(' and ')} ${themes.length > 1 ? 'developments' : 'development'} creating ${riskArticles.length > 1 ? 'multiple risk signals' : 'a risk signal'}. `;
        } else {
            synthesis = `${riskArticles.length} ${riskArticles.length > 1 ? 'articles signal' : 'article signals'} regulatory or risk themes. `;
        }
        
        if (competitors.length > 0) {
            synthesis += `${competitors.join(', ')} ${competitors.length > 1 ? 'are' : 'is'} mentioned. `;
        }
        
        if (clients.length > 0) {
            synthesis += `Affects ${clients.slice(0, 2).join(', ')}${clients.length > 2 ? ` and ${clients.length - 2} others` : ''}. `;
        }
        
        synthesis += 'Review for client exposure and IBM positioning opportunities.';
        
        insights.push({
            headline: themes.length > 0 ? `${themes[0]} Risk Signals` : 'Regulatory & Risk Signals',
            synthesis: synthesis,
            signalType: 'risk',
            sources: riskArticles.map(a => ({
                title: a.title,
                url: a.url,
                source: a.source || a.sourceName
            }))
        });
    }
    
    // Insight 2: Competitive landscape
    const compArticles = byType.competitive.slice(0, 3);
    if (compArticles.length > 0) {
        const { themes, competitors, clients } = extractThemes(compArticles);
        
        let synthesis = '';
        if (competitors.length > 0) {
            synthesis = `${competitors.join(', ')} ${competitors.length > 1 ? 'are' : 'is'} active in ${themes.length > 0 ? themes.join(' and ') : 'the market'}. `;
        } else {
            synthesis = `${compArticles.length} competitive ${compArticles.length > 1 ? 'signals' : 'signal'} detected. `;
        }
        
        if (clients.length > 0) {
            synthesis += `Potential impact on ${clients.slice(0, 2).join(', ')}${clients.length > 2 ? ` and ${clients.length - 2} others` : ''}. `;
        }
        
        synthesis += 'Monitor for IBM counter-positioning opportunities.';
        
        insights.push({
            headline: competitors.length > 0 ? `${competitors[0]} Competitive Activity` : 'Competitive Movement',
            synthesis: synthesis,
            signalType: 'competitive',
            sources: compArticles.map(a => ({
                title: a.title,
                url: a.url,
                source: a.source || a.sourceName
            }))
        });
    }
    
    // Insight 3: Opportunity signals
    const oppArticles = byType.opportunity.slice(0, 3);
    if (oppArticles.length > 0) {
        const { themes, competitors, clients } = extractThemes(oppArticles);
        
        let synthesis = '';
        if (themes.length > 0) {
            synthesis = `${themes.join(' and ')} ${themes.length > 1 ? 'opportunities' : 'opportunity'} identified. `;
        } else {
            synthesis = `${oppArticles.length} opportunity ${oppArticles.length > 1 ? 'signals' : 'signal'} detected. `;
        }
        
        if (competitors.length > 0) {
            synthesis += `${competitors.join(', ')} ${competitors.length > 1 ? 'face' : 'faces'} challenges. `;
        }
        
        if (clients.length > 0) {
            synthesis += `Target ${clients.slice(0, 2).join(', ')}${clients.length > 2 ? ` and ${clients.length - 2} others` : ''} for outreach. `;
        } else {
            synthesis += 'Brief relevant ATLs for proactive outreach this week.';
        }
        
        insights.push({
            headline: themes.length > 0 ? `${themes[0]} Growth Opportunities` : 'Growth Opportunities',
            synthesis: synthesis,
            signalType: 'opportunity',
            sources: oppArticles.map(a => ({
                title: a.title,
                url: a.url,
                source: a.source || a.sourceName
            }))
        });
    }
    
    // Ensure we have at least 3 insights
    if (insights.length < 3 && articles.length > 0) {
        const remaining = articles.filter(a =>
            !insights.some(i => i.sources?.some(s => s.title === a.title))
        ).slice(0, 3);
        
        if (remaining.length > 0) {
            const { themes, competitors } = extractThemes(remaining);
            
            let synthesis = '';
            if (themes.length > 0) {
                synthesis = `${themes.join(', ')} trends emerging. `;
            } else {
                synthesis = `${remaining.length} additional ${remaining.length > 1 ? 'signals' : 'signal'} detected. `;
            }
            
            if (competitors.length > 0) {
                synthesis += `Mentions ${competitors.join(', ')}. `;
            }
            
            synthesis += 'Monitor for strategic implications.';
            
            insights.push({
                headline: themes.length > 0 ? `${themes[0]} Trends` : 'Additional Signals',
                synthesis: synthesis,
                signalType: 'general',
                sources: remaining.map(a => ({
                    title: a.title,
                    url: a.url,
                    source: a.source || a.sourceName
                }))
            });
        }
    }
    
    return insights.slice(0, 3);
}

function renderExecutiveInsight(insight) {
    const typeEmoji = {
        'risk': '🔴',
        'opportunity': '🟢',
        'competitive': '⚔️',
        'regulatory': '🛡️',
        'general': '📌'
    }[insight.signalType] || '📌';
    
    const typeClass = insight.signalType || 'general';
    
    const sourcesHtml = (insight.sources || []).map(s =>
        `<a href="${s.url || '#'}" target="_blank" class="exec-source-link">${escapeHtml(s.title)}</a> <span class="exec-source-name">(${escapeHtml(s.source || 'Source')})</span>`
    ).join('<br>');
    
    const convDoorBadge = insight.conversationDoor ? `<span class="insight-badge">${escapeHtml(insight.conversationDoor)}</span>` : '';

    return `
        <div class="executive-insight ${typeClass}">
            <div class="executive-insight-header">
                <span class="executive-insight-type">${typeEmoji}</span>
                <span class="executive-insight-headline">${escapeHtml(insight.headline)}</span>
            </div>
            ${convDoorBadge ? `<div class="executive-insight-badges">${convDoorBadge}</div>` : ''}
            <div class="executive-insight-synthesis">${escapeHtml(insight.synthesis)}</div>
            <div class="executive-insight-sources">
                <span class="executive-sources-label">Sources:</span>
                ${sourcesHtml}
            </div>
        </div>
    `;
}

function cacheExecutiveSummary(insights, articleCount = 0) {
    try {
        localStorage.setItem(STORAGE_KEY_EXEC_SUMMARY, JSON.stringify({
            insights,
            timestamp: Date.now(),
            articleCount
        }));
    } catch (e) {
        console.log('Exec summary cache write error:', e);
    }
}

// ==========================================
// TODAY'S SIGNALS RENDERING (AI-powered)
// Purpose: "Act on this TODAY" - tactical, immediate
// ==========================================

async function renderTodaysSignals(forceRefresh = false) {
    // Note: Using signal-feed elements since signals-list doesn't exist in HTML
    const list = document.getElementById('signal-feed-list');
    const countEl = document.getElementById('signal-feed-count');
    // signals-intro doesn't exist in current HTML, so we'll skip intro text updates
    const introEl = null;
    
    if (!list) {
        console.warn('renderTodaysSignals: signal-feed-list element not found, skipping signal generation');
        return;
    }
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
            if (cached) {
                const { signals, timestamp, articlesData } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                // Show cached if less than configured duration and has content
                if (age < CACHE_DURATIONS.TODAYS_SIGNALS && signals && signals.length > 0) {
                    if (countEl) countEl.textContent = signals.length;
                    if (introEl) introEl.textContent = `${signals.length} actionable signals (${formatTimeAgo(timestamp)})`;
                    list.innerHTML = signals.map((s, i) => renderCachedSignal(s, articlesData?.[i])).join('');
                    return;
                }
            }
        } catch (e) {
            console.log('Signal cache read error:', e);
        }
    }
    
    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];
    
    // COST OPTIMIZATION: Smart triggering - check for new high-priority articles
    if (!forceRefresh && apiKey) {
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
            if (cached) {
                const { signals, timestamp, articlesData } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                
                // Count new high-priority articles since last generation
                const todayArticles = app.dailyArticles.length > 0 ? app.dailyArticles : app.articles;
                const newPriorityArticles = todayArticles.filter(a => {
                    const articleDate = new Date(a.pubDate || a.isoDate).getTime();
                    if (articleDate <= timestamp) return false;
                    
                    // High priority: client matches, competitive signals, or high relevance
                    return (a.matchedClients && a.matchedClients.length > 0) ||
                           a.signalType === 'competitor' ||
                           /aws|azure|google cloud|microsoft|salesforce|servicenow/i.test(a.title) ||
                           (a.relevanceScore || 0) > 70;
                });
                
                // If cache valid AND fewer than 3 new priority articles, use cache
                if (age < CACHE_DURATIONS.TODAYS_SIGNALS && newPriorityArticles.length < 3) {
                    console.log(`Today's Signals: Only ${newPriorityArticles.length} new priority articles, using cache`);
                    if (countEl) countEl.textContent = signals.length;
                    if (introEl) introEl.textContent = `${signals.length} actionable signals (cached, ${newPriorityArticles.length} new)`;
                    list.innerHTML = signals.map((s, i) => renderCachedSignal(s, articlesData?.[i])).join('');
                    return;
                }
                
                console.log(`Today's Signals: ${newPriorityArticles.length} new priority articles, regenerating`);
            }
        } catch (e) {
            console.log('Signals smart trigger check error:', e);
        }
    }

    
    // Gather raw signals from cross-refs and high-priority articles
    const rawSignals = [];
    
    // 1. Cross-source signals (themes appearing in multiple sources)
    if (app.crossRefs && app.crossRefs.length > 0) {
        app.crossRefs.slice(0, 3).forEach(ref => {
            rawSignals.push({
                type: 'cross-ref',
                headline: ref.theme,
                sources: ref.sources || [],
                articles: ref.articles || [],
                industries: ref.industries || [],
                clients: ref.clients || []
            });
        });
    }
    
    // 2. High-score client articles (Tier 1 priority)
    const clientArticles = (app.dailyArticles.length > 0 ? app.dailyArticles : app.articles)
        .filter(a => a.matchedClients && a.matchedClients.length > 0)
        .slice(0, 3);
    
    clientArticles.forEach(article => {
        if (!rawSignals.some(s => s.articles?.some(a => a.id === article.id))) {
            rawSignals.push({
                type: 'client',
                headline: article.title,
                summary: article.summary || '',
                sources: [article.source],
                articles: [article],
                industries: article.matchedIndustries || [],
                clients: article.matchedClients || []
            });
        }
    });
    
    // 3. Competitive signals (AWS, Azure, Google, etc.)
    const competitiveArticles = (app.dailyArticles.length > 0 ? app.dailyArticles : app.articles)
        .filter(a => a.signalType === 'competitor' || 
            /aws|azure|google cloud|microsoft|salesforce|servicenow/i.test(a.title))
        .slice(0, 2);
    
    competitiveArticles.forEach(article => {
        if (!rawSignals.some(s => s.articles?.some(a => a.id === article.id))) {
            rawSignals.push({
                type: 'competitive',
                headline: article.title,
                summary: article.summary || '',
                sources: [article.source],
                articles: [article],
                industries: article.matchedIndustries || [],
                clients: []
            });
        }
    });
    
    // 4. Add top daily articles if not enough signals
    if (rawSignals.length < 3) {
        const topArticles = (app.dailyArticles.length > 0 ? app.dailyArticles : app.articles)
            .filter(a => !rawSignals.some(s => s.articles?.some(sa => sa.id === a.id)))
            .slice(0, 5 - rawSignals.length);
        
        topArticles.forEach(article => {
            rawSignals.push({
                type: 'news',
                headline: article.title,
                summary: article.summary || '',
                sources: [article.source],
                articles: [article],
                industries: article.matchedIndustries || [],
                clients: article.matchedClients || []
            });
        });
    }
    
    countEl.textContent = Math.min(rawSignals.length, 5);
    
    if (rawSignals.length === 0) {
        if (introEl) introEl.textContent = 'Click Refresh to generate signals.';
        list.innerHTML = '<p class="card-description">No signals yet. Click Refresh to fetch latest news and generate actionable intelligence.</p>';
        return;
    }
    
    // Without API key: render basic signals with article context
    if (!apiKey) {
        if (introEl) introEl.textContent = `${rawSignals.length} signals detected. Add API key for AI synthesis.`;
        list.innerHTML = rawSignals.slice(0, 5).map(signal => renderBasicSignal(signal)).join('');
        // Cache basic signals too
        cacheSignals(rawSignals.slice(0, 5).map(s => ({
            headline: s.headline,
            summary: s.summary || '',
            sources: s.sources,
            type: s.type
        })), rawSignals.slice(0, 5));
        return;
    }
    
    // With API key: generate AI-powered synthesis
    if (introEl) introEl.textContent = 'Synthesizing actionable intelligence...';
    
    // PHASE 2.2 & 2.3: Extract key entities instead of full context
    const signalSummaries = rawSignals.slice(0, 5).map(s => {
        const entities = extractKeyEntities(s);
        const clientInfo = s.clients.length > 0 ? ` [Clients: ${s.clients.slice(0, 3).join(', ')}]` : '';
        return `- ${s.headline} (${s.sources.join(', ')})${clientInfo}\n  Entities: ${entities}`;
    }).join('\n\n');
    
    const tier1Clients = app.clients.filter(c => c.tier === 1).map(c => c.name).slice(0, 10).join(', ');
    
    // Identify which markets have signals
    const marketsInSignals = [...new Set(rawSignals.flatMap(s =>
        (s.clients || []).map(clientName => {
            const client = app.clients.find(c => c.name === clientName);
            return client?.market || null;
        }).filter(Boolean)
    ))];
    
    const prompt = `You are the strategic intelligence briefer for the IBM APAC Field CTO who leads 115 ATLs across 343 enterprise accounts in 5 markets: ANZ, ASEAN, GCG, ISA, KOREA.

TODAY'S RAW SIGNALS:
${signalSummaries}

CONTEXT:
- Tier 1 clients: ${tier1Clients || 'See watchlist'}
- Markets with signals: ${marketsInSignals.length > 0 ? marketsInSignals.join(', ') : 'All markets'}
- Five Conversations framework: map every signal to the relevant conversation door
- Goal: Earn "Client CTO" posture — trusted strategic advisor, not a vendor
- APAC Geographic Scope: ANZ (Australia/New Zealand), ASEAN (Singapore/Malaysia/Indonesia/Thailand/Philippines/Vietnam), GCG (Hong Kong/Taiwan/China), ISA (India/Sri Lanka/Bangladesh), KOREA (South Korea)

THE FIVE CLIENT CONVERSATIONS — assign conversationDoor to each signal:
- Conv 1 · Govern Your Data (watsonx.data + Confluent): data platform sprawl, residency, AI ambition stalled on data
- Conv 2 · Connect & Automate (watsonx Orchestrate + webMethods): agent sprawl, middleware debt, M&A integration, stalled RPA
- Conv 3 · Trust Every Identity (Verify + Vault): zero-trust/audit mandate, DORA-style regulation, machine/agent identity growth
- Conv 4 · Run Anywhere (Terraform + Vault + Cloudability + Concert): cloud cost, multi-cloud, workload sovereignty/residency
- Conv 5 · Build & Modernise (IBM Bob): legacy estate, modernisation debt, ungoverned AI coding spend [NOTE: on-premises GA 30 Sep 2026]
- Conv L · Lightwell (QUALIFYING PATH — never open cold): open-source CVE exposure the client owns and cannot fix; pinned dependency, private fork, community Kafka/Terraform/Ansible, patch-to-production over 45 days; scanner with no remediation owner

ACTION TYPES — use the runbook definitions:
- ESCALATE: Contact TSL + client exec within 48h (C-suite change, competitive threat to a named account, deal signal)
- BRIEF_ATL: Prepare ATL team with talking points (industry trend, regulatory change, competitive move)
- POSITION: Develop IBM counter-positioning (competitor wins a deal or announces capability)
- MONITOR: Track for escalation (early signal, pattern forming, geography outside matched client markets)

COMPETITIVE COUNTERS — use in ibmAngle:
- vs Snowflake/Databricks → Conv 1: portability + governance across the whole estate, not inside one platform
- vs MuleSoft/Boomi → Conv 2: agent control plane + total estate cost, not one connector's features
- vs Okta/Entra → Conv 3: human + non-human identity as one fabric; the gap is machines, secrets, and agents
- vs hyperscaler native stack → Conv 4: run, govern, and prove the same way everywhere, not just on one provider
- vs GitHub Copilot/Cursor → Conv 5: whole lifecycle and governed spend, not just autocomplete

CRITICAL GEOGRAPHIC VALIDATION RULES:
1. ONLY suggest actions for clients whose PRIMARY market matches the event location:
   - Europe events → Do NOT suggest ANZ/ASEAN/GCG/ISA/KOREA clients
   - Americas events → Do NOT suggest APAC clients
   - ANZ events → ONLY suggest Australian/New Zealand clients (e.g., Telstra, ANZ Bank, Westpac)
   - ASEAN events → ONLY suggest Singapore/Malaysia/Indonesia/Thailand/Philippines/Vietnam clients (e.g., DBS, Singtel, PLDT)
   - GCG events → ONLY suggest Hong Kong/Taiwan/China clients
   - ISA events → ONLY suggest India/Sri Lanka/Bangladesh clients
   - KOREA events → ONLY suggest South Korean clients

2. If event location doesn't match any client markets:
   - Set actionType to MONITOR
   - Note "Event outside client markets" in context
   - Do NOT fabricate client connections

Analyze each signal IN ORDER. Return JSON array with one entry per signal in SAME ORDER:
[
  {
    "headline": "Action verb + 10 words max",
    "context": "2-3 sentences: what happened, who is affected, why it matters for APAC now",
    "wave": "AI or SOVEREIGNTY or COMPETITIVE",
    "actionType": "ESCALATE or BRIEF_ATL or POSITION or MONITOR",
    "action": "Specific action using runbook motion: who does what, by when. Reference the conversation door.",
    "affectedMarkets": ["ANZ", "ASEAN", "GCG", "ISA", "KOREA"],
    "conversationDoor": "Conv 1 | Conv 2 | Conv 3 | Conv 4 | Conv 5 | Conv L",
    "ibmAngle": "Specific IBM product from the conversation door + the Why Change framing. Use competitive counter if a competitor is named.",
    "talkingPoint": "Hypothesis for ATL to test with client CTO: 'I've been thinking that [observation] — is that consistent with what you're seeing?' Peer CTO tone, not a pitch.",
    "competitive": "Competitor name or null"
  }
]

Return valid JSON array, max 5 signals, in the SAME ORDER as input signals.`;

    let claudeResponse = null;
    try {
        // COST OPTIMIZATION: Use unified API helper with token tracking
        const { text } = await callAI('STRATEGIC_ANALYSIS', prompt, 2000, apiKey);
        claudeResponse = text;
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            // Clean up JSON before parsing (remove trailing commas, fix common issues)
            let jsonStr = jsonMatch[0];
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
            jsonStr = jsonStr.replace(/\n/g, ' '); // Remove newlines
            jsonStr = jsonStr.replace(/\r/g, ''); // Remove carriage returns
            
            // Additional cleanup for common Claude formatting issues
            jsonStr = jsonStr.replace(/"\s*or\s*"/g, '" or "'); // Fix "or" spacing in values
            jsonStr = jsonStr.replace(/(['"])\s*or\s*(['"])/g, '$1 or $2'); // Normalize or operators
            
            const synthesized = JSON.parse(jsonStr);
            if (introEl) introEl.textContent = `${synthesized.length} actionable signals for today`;
            
            // Cache the synthesized signals with article data
            cacheSignals(synthesized, rawSignals.slice(0, 5));
            
            list.innerHTML = synthesized.map((signal, idx) => {
                const rawSignal = rawSignals[idx] || {};
                return renderSynthesizedSignal(signal, rawSignal);
            }).join('');
        } else {
            throw new Error('No valid JSON in response');
        }
    } catch (err) {
        console.error('Signal synthesis error:', err);
        console.error('Error details:', err.message);
        // Log the actual response for debugging
        if (err.message.includes('JSON') && claudeResponse) {
            console.error('Raw Claude response excerpt:', claudeResponse.substring(0, 500));
        }
        if (introEl) introEl.textContent = `${rawSignals.length} signals (AI synthesis unavailable)`;
        list.innerHTML = rawSignals.slice(0, 5).map(signal => renderBasicSignal(signal)).join('');
    }
}

// PHASE 2.3: Extract key entities from signal for context reduction
function extractKeyEntities(signal) {
    // Combine headline and summary for entity extraction
    const text = `${signal.headline} ${signal.summary || ''}`.toLowerCase();
    
    const entities = [];
    
    // Companies (common tech/enterprise names)
    const companies = ['aws', 'microsoft', 'azure', 'google', 'salesforce', 'oracle', 'sap', 'servicenow',
                      'ibm', 'red hat', 'accenture', 'deloitte', 'pwc', 'ey', 'kpmg', 'tcs', 'infosys',
                      'nvidia', 'intel', 'amd', 'cisco', 'vmware', 'dell', 'hp', 'lenovo'];
    companies.forEach(company => {
        if (text.includes(company)) entities.push(company.toUpperCase());
    });
    
    // Technologies
    const techs = ['ai', 'artificial intelligence', 'machine learning', 'cloud', 'kubernetes', 'openshift',
                  'quantum', 'blockchain', 'cybersecurity', 'data center', 'edge computing', 'iot',
                  'generative ai', 'llm', 'agentic', 'automation', 'analytics'];
    techs.forEach(tech => {
        if (text.includes(tech)) entities.push(tech.toUpperCase());
    });
    
    // Regulatory/governance terms
    const regulatory = ['regulation', 'compliance', 'sovereignty', 'gdpr', 'privacy', 'security',
                       'audit', 'governance', 'risk', 'data localization'];
    regulatory.forEach(term => {
        if (text.includes(term)) entities.push(term.toUpperCase());
    });
    
    // Industries
    const industries = signal.industries || [];
    industries.forEach(ind => entities.push(ind));
    
    // Deduplicate and limit to top 5 entities
    const uniqueEntities = [...new Set(entities)].slice(0, 5);
    
    return uniqueEntities.length > 0 ? uniqueEntities.join(', ') : 'General tech news';
}

function cacheSignals(signals, rawSignals) {
    try {
        const articlesData = rawSignals.map(s => ({
            articles: (s.articles || []).map(a => ({
                id: a.id,
                source: a.source || a.sourceName || 'Unknown Source',
                url: a.url,
                title: a.title
            }))
        }));
        localStorage.setItem(STORAGE_KEYS.TODAYS_SIGNALS, JSON.stringify({
            signals,
            articlesData,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.log('Signal cache write error:', e);
    }
}

// ==========================================
// CONTEXT MATCHING — resolveContextMatches
// Resolves free-text week context against client names/aliases,
// market geography synonyms, and industry keywords.
// Returns { clientNames: [], markets: [], industries: [] }
// Called once per render pass; result passed into per-signal checks.
// ==========================================

/**
 * Resolve a free-text context string against the client list.
 * Returns canonical client names, market codes, and industry names
 * that appear in the context text.
 *
 * @param {string} contextText - Raw thisWeekContext string
 * @param {Array}  clients     - app.clients array
 * @returns {{ clientNames: string[], markets: string[], industries: string[] }}
 */
function resolveContextMatches(contextText, clients) {
    if (!contextText) return { clientNames: [], markets: [], industries: [] };

    const ctx = contextText.toLowerCase();

    // Exclusion patterns replicated from detectAllClients to avoid false positives
    const CLIENT_EXCLUSIONS = {
        'anz': ['organization', 'anzac', 'bonanza', 'stanza', 'extravaganza'],
        'sk':  ['risk', 'ask', 'task', 'desk', 'mask', 'skate', 'brisk', 'whisk', 'dusk'],
        'dbs': ['jobs', 'mobs', 'verbs', 'absorbs', 'disturbs'],
        'cba': ['cuba', 'combat', 'acrobat', 'scuba'],
        'axa': ['taxa', 'coaxial', 'relaxation', 'taxation'],
        'aia': ['gaia', 'playa'],
        'ocbc': ['abc', 'cbc']
    };

    // Helper: word-boundary test (safe for special chars)
    const wbTest = (text, term) => {
        try {
            return new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text);
        } catch (e) {
            return text.toLowerCase().includes(term.toLowerCase());
        }
    };

    // --- Pass 1: Client name + alias matching ---
    const clientNames = [];
    for (const client of (clients || [])) {
        if (typeof client !== 'object' || !client.name) continue;
        const nameLower = client.name.toLowerCase();

        // Check exclusions first
        const exclusions = CLIENT_EXCLUSIONS[nameLower] || [];
        if (exclusions.some(excl => ctx.includes(excl))) continue;

        const namesToCheck = [client.name, ...(client.aliases || [])];
        if (namesToCheck.some(n => wbTest(ctx, n))) {
            clientNames.push(client.name);
        }
    }

    // --- Pass 2: Geography synonym → market code ---
    const MARKET_SYNONYMS = {
        ANZ:   ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'canberra',
                'new zealand', 'auckland', 'wellington', 'nz', 'au'],
        ASEAN: ['singapore', 'sg', 'malaysia', 'kl', 'kuala lumpur', 'thailand', 'bangkok',
                'indonesia', 'jakarta', 'philippines', 'manila', 'vietnam', 'hanoi',
                'ho chi minh', 'myanmar', 'asean', 'sea'],
        GCG:   ['china', 'beijing', 'shanghai', 'shenzhen', 'hong kong', 'hk', 'taiwan',
                'taipei', 'greater china', 'gcg'],
        ISA:   ['india', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai',
                'hyderabad', 'south asia', 'bangladesh', 'sri lanka', 'isa'],
        KOREA: ['korea', 'korean', 'seoul', 'busan']
    };

    const markets = [];
    for (const [market, synonyms] of Object.entries(MARKET_SYNONYMS)) {
        if (synonyms.some(s => wbTest(ctx, s))) {
            markets.push(market);
        }
    }

    // --- Pass 3: Industry keyword matching ---
    const INDUSTRY_SYNONYMS = {
        'Financial Services':   ['banking', 'bank', 'fintech', 'financial'],
        'Telecommunications':   ['telco', 'telecom', 'telecommunications'],
        'Manufacturing':        ['manufacturing', 'factory', 'industrial'],
        'Government':           ['government', 'govt', 'public sector', 'ministry'],
        'Energy':               ['energy', 'utilities', 'power', 'oil', 'gas'],
        'Retail':               ['retail', 'consumer'],
        'Healthcare':           ['healthcare', 'health', 'hospital', 'pharma'],
        'Technology':           ['technology', 'tech', 'software', 'saas']
    };

    const industries = [];
    for (const [industry, synonyms] of Object.entries(INDUSTRY_SYNONYMS)) {
        if (synonyms.some(s => wbTest(ctx, s))) {
            industries.push(industry);
        }
    }

    return { clientNames, markets, industries };
}


// ==========================================
// ACTION REQUIRED - 3-Tier Priority System
// ==========================================

function renderActionRequired() {
    const section = document.getElementById('action-required-section');
    const list = document.getElementById('action-required-list');
    const countEl = document.getElementById('action-required-count');
    if (!section || !list) return;
    
    // Read from cached signals
    let signals = [];
    let articlesData = [];
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
        if (cached) {
            const data = JSON.parse(cached);
            signals = data.signals || [];
            articlesData = data.articlesData || [];
        }
    } catch (e) {
        console.log('Action required cache read error:', e);
    }
    
    // Get This Week's Context for meeting detection
    const weekContext = app.settings?.thisWeekContext || '';
    const contextLower = weekContext.toLowerCase();

    // Resolve context once against client list (aliases, geography, industry)
    const resolved = resolveContextMatches(weekContext, app.clients || []);

    // Helper: Check if signal is related to This Week's Context
    const isContextRelated = (signal) => {
        if (!weekContext) return false;

        const searchText = `${signal.headline} ${signal.context} ${signal.action}`.toLowerCase();

        // 1. Resolved client names (canonical + aliases)
        if (resolved.clientNames.some(name => searchText.includes(name.toLowerCase()))) return true;

        // 2. Resolved market codes and geography
        if (resolved.markets.some(market => searchText.includes(market.toLowerCase()))) return true;

        // 3. Resolved industry keywords
        if (resolved.industries.some(ind => searchText.includes(ind.toLowerCase()))) return true;

        // 4. Fallback: keyword overlap (at least 2 significant words > 4 chars)
        const contextWords = contextLower.split(/\s+/).filter(w => w.length > 4);
        const signalWords = searchText.split(/\s+/).filter(w => w.length > 4);
        const matches = contextWords.filter(w => signalWords.includes(w));
        return matches.length >= 2;
    };
    
    // Group signals by priority tier and mark context-related ones
    const allSignals = signals.map((signal, idx) => ({
        signal,
        articleData: articlesData[idx],
        isContextRelated: isContextRelated(signal)
    }));
    
    // Sort within each tier: context-related first
    const sortByContext = (a, b) => {
        if (a.isContextRelated && !b.isContextRelated) return -1;
        if (!a.isContextRelated && b.isContextRelated) return 1;
        return 0;
    };
    
    const criticalSignals = allSignals
        .filter(({ signal }) => signal.actionType === 'ESCALATE')
        .sort(sortByContext);
    
    const highSignals = allSignals
        .filter(({ signal }) => signal.actionType === 'BRIEF_ATL' || signal.actionType === 'POSITION')
        .sort(sortByContext);
    
    const watchSignals = allSignals
        .filter(({ signal }) => signal.actionType === 'MONITOR' || !signal.actionType)
        .sort(sortByContext);
    
    const totalCount = criticalSignals.length + highSignals.length + watchSignals.length;
    
    if (totalCount === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    countEl.textContent = totalCount;
    
    // Helper function to render a signal item
    const renderSignalItem = ({ signal, articleData, isContextRelated }) => {
        const articles = articleData?.articles || [];
        const sourcesHtml = articles.length > 0
            ? articles.map(a => `<a class="action-source-link" href="${a.url || '#'}" target="_blank">${escapeHtml(a.title)}</a> <span class="action-source-name">(${escapeHtml(a.source || 'Source')})</span>`).join('<br>')
            : '';
        
        // Action type styling
        const actionStyles = {
            'ESCALATE': { icon: '🚨', label: 'ESCALATE', class: 'action-escalate' },
            'BRIEF_ATL': { icon: '📢', label: 'BRIEF ATL', class: 'action-brief' },
            'POSITION': { icon: '🎯', label: 'POSITION', class: 'action-position' },
            'MONITOR': { icon: '👁️', label: 'MONITOR', class: 'action-monitor' }
        };
        const style = actionStyles[signal.actionType] || actionStyles['MONITOR'];
        
        // Meeting prep badge if context-related
        const meetingBadge = isContextRelated && weekContext
            ? `<span class="action-meeting-badge">🎯 MEETING PREP</span>`
            : '';
        
        // Markets affected
        const marketsHtml = (signal.affectedMarkets || []).length > 0
            ? signal.affectedMarkets.map(m => `<span class="action-market-tag">${m}</span>`).join(' ')
            : '';
        
        // Context note if related to This Week's Context
        const contextNote = isContextRelated && weekContext
            ? `<div class="action-context-note">📅 <strong>Related to:</strong> ${escapeHtml(weekContext.substring(0, 100))}${weekContext.length > 100 ? '...' : ''}</div>`
            : '';
        
        return `
            <div class="action-required-item ${style.class} ${isContextRelated ? 'context-related' : ''}">
                <div class="action-required-header">
                    <span class="action-required-badge ${style.class}">${style.icon} ${style.label}</span>
                    ${meetingBadge}
                    ${marketsHtml}
                </div>
                <div class="action-required-headline">${escapeHtml(signal.headline)}</div>
                ${contextNote}
                <div class="action-required-context">${escapeHtml(signal.context || '')}</div>
                <div class="action-required-action">
                    <strong>→ Action:</strong> ${escapeHtml(signal.action || '')}
                </div>
                ${signal.talkingPoint ? `<div class="action-required-talking-point"><strong>💬</strong> "${escapeHtml(signal.talkingPoint)}"</div>` : ''}
                <div class="action-required-ibm"><strong>IBM:</strong> ${escapeHtml(signal.ibmAngle || '')}</div>
                ${sourcesHtml ? `<div class="action-required-sources">${sourcesHtml}</div>` : ''}
            </div>
        `;
    };
    
    // Build HTML with collapsible sections
    let html = '';
    
    // CRITICAL Section (ESCALATE) - Always expanded
    if (criticalSignals.length > 0) {
        html += `
            <div class="action-priority-section critical">
                <div class="action-priority-header" onclick="toggleActionSection('critical')">
                    <span class="action-priority-icon">🚨</span>
                    <span class="action-priority-title">CRITICAL</span>
                    <span class="action-priority-subtitle">Action within 48 hours</span>
                    <span class="action-priority-count">${criticalSignals.length}</span>
                    <span class="action-priority-toggle">▼</span>
                </div>
                <div class="action-priority-content expanded">
                    ${criticalSignals.map(renderSignalItem).join('')}
                </div>
            </div>
        `;
    }
    
    // HIGH Section (BRIEF_ATL + POSITION) - Collapsed by default
    if (highSignals.length > 0) {
        html += `
            <div class="action-priority-section high">
                <div class="action-priority-header" onclick="toggleActionSection('high')">
                    <span class="action-priority-icon">⚡</span>
                    <span class="action-priority-title">HIGH</span>
                    <span class="action-priority-subtitle">Brief team / Develop positioning</span>
                    <span class="action-priority-count">${highSignals.length}</span>
                    <span class="action-priority-toggle">▶</span>
                </div>
                <div class="action-priority-content collapsed">
                    ${highSignals.map(renderSignalItem).join('')}
                </div>
            </div>
        `;
    }
    
    // WATCH Section (MONITOR) - Collapsed by default
    if (watchSignals.length > 0) {
        html += `
            <div class="action-priority-section watch">
                <div class="action-priority-header" onclick="toggleActionSection('watch')">
                    <span class="action-priority-icon">👁️</span>
                    <span class="action-priority-title">WATCH</span>
                    <span class="action-priority-subtitle">Track for escalation</span>
                    <span class="action-priority-count">${watchSignals.length}</span>
                    <span class="action-priority-toggle">▶</span>
                </div>
                <div class="action-priority-content collapsed">
                    ${watchSignals.map(renderSignalItem).join('')}
                </div>
            </div>
        `;
    }
    
    list.innerHTML = html;
}

// Toggle action section expand/collapse
function toggleActionSection(sectionType) {
    const section = document.querySelector(`.action-priority-section.${sectionType}`);
    if (!section) return;
    
    const content = section.querySelector('.action-priority-content');
    const toggle = section.querySelector('.action-priority-toggle');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        content.classList.add('expanded');
        toggle.textContent = '▼';
    } else {
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        toggle.textContent = '▶';
    }
}

// ==========================================
// COPY: Action Required to clipboard
// ==========================================
function copyActionRequired() {
    let text = `🚨 Action Required — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n`;
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
        if (!cached) { showToast('No signals to copy'); return; }
        const data = JSON.parse(cached);
        const signals = data.signals || [];
        if (!signals.length) { showToast('No signals to copy'); return; }

        const actionLabels = {
            'ESCALATE':  '🚨 ESCALATE',
            'BRIEF_ATL': '📢 BRIEF ATL',
            'POSITION':  '🎯 POSITION',
            'MONITOR':   '👁️ MONITOR'
        };

        signals.forEach(signal => {
            const label = actionLabels[signal.actionType] || '👁️ MONITOR';
            text += `${label}: ${signal.headline}\n`;
            if (signal.context)      text += `Context: ${signal.context}\n`;
            if (signal.action)       text += `→ Action: ${signal.action}\n`;
            if (signal.talkingPoint) text += `💬 "${signal.talkingPoint}"\n`;
            if (signal.ibmAngle)     text += `IBM: ${signal.ibmAngle}\n`;
            text += '\n';
        });
    } catch(e) { showToast('Copy failed'); return; }
    navigator.clipboard.writeText(text.trim()).then(() => showToast('✅ Action Required copied'));
}

// ==========================================
// UNIFIED SIGNAL FEED - Phase 2
// ==========================================

// Global filter state for Signal Feed
let signalFeedFilters = {
    market: 'ALL',
    client: 'ALL',
    signalType: 'ALL',
    priority: 'all'      // all, high, strategic, tactical
};

// Store enriched articles for filtering
let signalFeedArticles = [];

// Detect APAC markets from article content
function detectMarketsFromContent(text) {
    const markets = [];
    const lowerText = ` ${text.toLowerCase()} `; // Add spaces for word boundary matching
    
    // Helper: check if any keyword matches
    const hasAny = (keywords) => keywords.some(k => lowerText.includes(k.toLowerCase()));
    
    // ANZ - Australia, New Zealand
    const anzKeywords = [
        'australia', 'australian', 'sydney', 'melbourne', 'brisbane', 'perth', 'canberra', 'adelaide',
        'apra', 'asic', 'accc', 'oaic', 'asx',
        'new zealand', 'auckland', 'wellington', 'rbnz',
        'commonwealth bank', 'westpac', 'anz bank', 'nab bank', 'macquarie',
        'telstra', 'optus', 'woolworths', 'coles', 'qantas'
    ];
    if (hasAny(anzKeywords)) markets.push('ANZ');
    
    // ASEAN - Southeast Asia
    const aseanKeywords = [
        'singapore', 'singaporean', 'monetary authority of singapore', 'imda', 'pdpc', 'govtech singapore',
        'malaysia', 'malaysian', 'kuala lumpur', 'bank negara', 'cyberjaya',
        'indonesia', 'indonesian', 'jakarta', 'ojk', 'kominfo', 'bank indonesia',
        'thailand', 'thai', 'bangkok', 'bank of thailand',
        'vietnam', 'vietnamese', 'hanoi', 'ho chi minh', 'saigon',
        'philippines', 'filipino', 'manila', 'bangko sentral',
        'brunei', 'asean',
        'dbs bank', 'ocbc', 'uob bank', 'grab', 'sea limited', 'gojek', 'shopee',
        'singtel', 'starhub', 'maybank', 'cimb', 'public bank'
    ];
    if (hasAny(aseanKeywords)) markets.push('ASEAN');
    
    // GCG - Greater China (includes Hong Kong, Taiwan)
    const gcgKeywords = [
        'china', 'chinese', 'beijing', 'shanghai', 'shenzhen', 'guangzhou', 'hangzhou', 'chengdu',
        'hong kong', 'hkma', 'hong kong regulator',
        'taiwan', 'taiwanese', 'taipei',
        'macau', 'greater china',
        'alibaba', 'tencent', 'baidu', 'huawei', 'bytedance', 'xiaomi', 'jd.com',
        'hsbc hong kong', 'bank of china', 'icbc', 'china construction bank',
        'cathay pacific', 'china mobile', 'china telecom'
    ];
    if (hasAny(gcgKeywords)) markets.push('GCG');
    
    // ISA - India, South Asia
    const isaKeywords = [
        'india', 'indian', 'mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru', 
        'hyderabad', 'chennai', 'pune', 'kolkata', 'ahmedabad',
        'reserve bank of india', 'sebi', 'irdai', 'npci', 'meity', 'upi',
        'pakistan', 'sri lanka', 'bangladesh', 'nepal',
        'tata', 'reliance', 'infosys', 'wipro', 'tcs', 'hcl tech', 'hdfc', 'icici', 
        'axis bank', 'sbi', 'bharti airtel', 'jio', 'mahindra', 'bajaj'
    ];
    if (hasAny(isaKeywords)) markets.push('ISA');
    
    // KOREA
    const koreaKeywords = [
        'korea', 'korean', 'seoul', 'busan', 'south korea',
        'korea fsc', 'korea fss', 'kisa', 'pipc',
        'samsung', 'sk hynix', 'sk telecom', 'lg electronics', 'lg display',
        'hyundai', 'kia', 'posco', 'naver', 'kakao',
        'kdb', 'kb financial', 'shinhan', 'hana bank', 'woori',
        'korean air', 'asiana', 'kt corporation', 'lotte'
    ];
    if (hasAny(koreaKeywords)) markets.push('KOREA');
    
    return markets;
}

function renderSignalFeed() {
    const list = document.getElementById('signal-feed-list');
    const countEl = document.getElementById('signal-feed-count');
    const emptyEl = document.getElementById('signal-feed-empty');
    const chipContainer = document.getElementById('client-chip-filters');
    
    if (!list) return;
    
    // Step 1: Build deduplicated article index with all enrichment
    const articleIndex = new Map();
    
    // Get all articles from daily and general feeds
    const allArticles = [
        ...app.dailyArticles,
        ...app.articles.filter(a => {
            const articleDate = a.date || a.publishedDate;
            if (!articleDate) return true;
            const age = Date.now() - new Date(articleDate).getTime();
            return age < 48 * 60 * 60 * 1000; // 48 hours
        })
    ];
    
    // Get cached signals for IBM angles and talking points
    let cachedSignals = [];
    let cachedArticlesData = [];
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
        if (cached) {
            const data = JSON.parse(cached);
            cachedSignals = data.signals || [];
            cachedArticlesData = data.articlesData || [];
        }
    } catch (e) {
        console.log('Signal feed cache read error:', e);
    }
    
    // Build article-to-signal mapping for IBM angles
    const articleToSignal = new Map();
    cachedSignals.forEach((signal, idx) => {
        const articles = cachedArticlesData[idx]?.articles || [];
        articles.forEach(a => {
            if (a.id) {
                articleToSignal.set(a.id, signal);
            }
        });
    });
    
    // Enrich each article
    allArticles.forEach(article => {
        if (!article.id || articleIndex.has(article.id)) return;
        
        // Signal type - re-classify if 'background' or not set
        let signalType = article.signalType;
        if (!signalType || signalType === 'background' || signalType === 'general') {
            signalType = classifySignalType(article);
        }
        
        // Matched clients with tier info
        const matchedClients = (article.matchedClients || []).map(clientName => {
            const client = app.clients.find(c => 
                c.name.toLowerCase() === clientName.toLowerCase() ||
                (c.aliases || []).some(a => a.toLowerCase() === clientName.toLowerCase())
            );
            return client ? { name: client.name, tier: client.tier, market: client.market } : null;
        }).filter(Boolean);
        
        // Markets from matched clients
        const marketsFromClients = matchedClients.map(c => c.market).filter(Boolean);
        
        // Detect markets from article content (countries, cities, regulators)
        const articleText = `${article.title} ${article.summary || ''}`.toLowerCase();
        const marketsFromContent = detectMarketsFromContent(articleText);
        
        // Combine and deduplicate markets
        const markets = [...new Set([...marketsFromClients, ...marketsFromContent])];
        
        // Get IBM angle and talking point from cached signals
        const matchedSignal = articleToSignal.get(article.id);
        
        articleIndex.set(article.id, {
            ...article,
            signalType,
            matchedClients,
            markets,
            actionType: matchedSignal?.actionType || null,
            ibmAngle: matchedSignal?.ibmAngle || null,
            talkingPoint: matchedSignal?.talkingPoint || null,
            action: matchedSignal?.action || null,
            context: matchedSignal?.context || article.summary || ''
        });
    });
    
    signalFeedArticles = Array.from(articleIndex.values());
    
    // Step 2: Build client chips
    const clientCounts = {};
    signalFeedArticles.forEach(article => {
        article.matchedClients.forEach(c => {
            clientCounts[c.name] = (clientCounts[c.name] || 0) + 1;
        });
    });
    
    // Sort by count, then name
    const sortedClients = Object.entries(clientCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 15); // Top 15 clients
    
    if (chipContainer) {
        chipContainer.innerHTML = `
            <button class="client-chip ${signalFeedFilters.client === 'ALL' ? 'active' : ''}" 
                    data-client="ALL" onclick="filterByClient('ALL')">
                All Clients <span class="chip-count">${signalFeedArticles.length}</span>
            </button>
            ${sortedClients.map(([name, count]) => `
                <button class="client-chip ${signalFeedFilters.client === name ? 'active' : ''}" 
                        data-client="${escapeHtml(name)}" onclick="filterByClient('${escapeHtml(name)}')">
                    ${escapeHtml(name)} <span class="chip-count">${count}</span>
                </button>
            `).join('')}
        `;
    }
    
    // Step 3: Apply filters
    let filtered = signalFeedArticles;
    
    // Market filter
    if (signalFeedFilters.market !== 'ALL') {
        filtered = filtered.filter(a =>
            a.markets.includes(signalFeedFilters.market) ||
            a.matchedClients.some(c => c.market === signalFeedFilters.market)
        );
    }
    
    // Client filter
    if (signalFeedFilters.client !== 'ALL') {
        filtered = filtered.filter(a =>
            a.matchedClients.some(c => c.name === signalFeedFilters.client)
        );
    }
    
    // Priority filter (NEW)
    if (signalFeedFilters.priority !== 'all') {
        filtered = filtered.filter(a => {
            const threat = a.intelligence?.threatLevel || 0;
            const opportunity = a.intelligence?.opportunityScore || 0;
            const hasStrategicTech = a.intelligence?.technologies?.length > 0;
            const isStrategic = hasStrategicTech || opportunity >= 60;
            const isTactical = threat >= 60 || a.matchedClients?.length > 0;
            
            switch (signalFeedFilters.priority) {
                case 'high':
                    // High priority: threat >= 70 OR opportunity >= 70 OR has action
                    return threat >= 70 || opportunity >= 70 || a.actionType;
                case 'strategic':
                    // Strategic only: has technologies OR high opportunity OR innovation-related
                    return isStrategic;
                case 'tactical':
                    // Tactical only: high threat OR matched clients OR competitive
                    return isTactical;
                default:
                    return true;
            }
        });
    }
    
    // Step 4: Update count
    if (countEl) countEl.textContent = filtered.length;
    
    // Step 5: Render
    if (filtered.length === 0) {
        list.innerHTML = '';
        emptyEl?.classList.remove('hidden');
        return;
    }
    
    emptyEl?.classList.add('hidden');
    
    // Step 6: Group by category using Intelligence Engine
    const categories = [
        { key: 'risk', label: 'Risk', emoji: '🚨', description: 'Threats requiring immediate attention' },
        { key: 'competitive', label: 'Competitive', emoji: '⚔️', description: 'Competitor moves and market dynamics' },
        { key: 'regulatory', label: 'Regulatory', emoji: '🛡️', description: 'Policy, compliance, and governance' },
        { key: 'opportunity', label: 'Opportunity', emoji: '💰', description: 'Growth and positioning opportunities' },
        { key: 'information', label: 'Information', emoji: '📰', description: 'Industry news and updates' }
    ];
    
    // Group articles using intelligence-based categorization
    const grouped = {};
    categories.forEach(cat => grouped[cat.key] = []);
    
    filtered.forEach(article => {
        // Use SignalFeedIntegration for intelligent categorization
        let category;
        if (typeof SignalFeedIntegration !== 'undefined' && article.intelligence) {
            const catInfo = SignalFeedIntegration.categorizeFromIntelligence(article);
            category = catInfo.category;
            // Store category info on article for rendering
            article.intelligenceCategory = catInfo;
        } else {
            // Fallback to existing signal type mapping
            const typeMapping = {
                'risk': 'risk',
                'opportunity': 'opportunity',
                'competitive': 'competitive',
                'regulatory': 'regulatory',
                'relationship': 'information',
                'ibm': 'information',
                'general': 'information',
                'background': 'information'
            };
            category = typeMapping[article.signalType] || 'information';
        }
        
        if (grouped[category]) {
            grouped[category].push(article);
        } else {
            // Fallback to information if category not found
            grouped['information'].push(article);
        }
    });
    
    // Sort within each group: intelligence threat/opportunity first, then action items, then relevance
    Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => {
            // Priority 1: Intelligence threat level (high threats first)
            const aThreat = a.intelligence?.threatLevel || 0;
            const bThreat = b.intelligence?.threatLevel || 0;
            if (aThreat >= 80 || bThreat >= 80) {
                if (aThreat !== bThreat) return bThreat - aThreat;
            }
            
            // Priority 2: Intelligence opportunity score
            const aOpp = a.intelligence?.opportunityScore || 0;
            const bOpp = b.intelligence?.opportunityScore || 0;
            if (aOpp >= 70 || bOpp >= 70) {
                if (aOpp !== bOpp) return bOpp - aOpp;
            }
            
            // Priority 3: Action items
            const aUrgent = a.actionType === 'ESCALATE' ? 2 : a.actionType === 'BRIEF_ATL' ? 1 : 0;
            const bUrgent = b.actionType === 'ESCALATE' ? 2 : b.actionType === 'BRIEF_ATL' ? 1 : 0;
            if (aUrgent !== bUrgent) return bUrgent - aUrgent;
            
            // Priority 4: Relevance score
            return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        });
    });
    
    // Render grouped view — synthesised signals at top, categories collapsed by default
    const synthesisedHtml = renderSynthesisedSignalsBlock();
    const categoriesHtml = categories.map(cat => {
        const articles = grouped[cat.key];
        if (articles.length === 0) return '';
        
        const previewArticles = articles.slice(0, 2);
        const hiddenArticles  = articles.slice(2);
        const hasMore = hiddenArticles.length > 0;
        
        return `
            <div class="signal-category" data-category="${cat.key}">
                <div class="signal-category-header" onclick="toggleSignalCategory('${cat.key}')">
                    <span class="signal-category-emoji">${cat.emoji}</span>
                    <span class="signal-category-label">${cat.label} · ${articles.length}</span>
                    <span class="signal-category-count">${articles.length}</span>
                    <span class="signal-category-chevron">▶</span>
                </div>
                <div class="signal-category-body collapsed">
                    <div class="signal-category-items">
                        ${previewArticles.map(article => renderSignalFeedItem(article)).join('')}
                    </div>
                    ${hasMore ? `
                        <div class="signal-category-more">
                            <div class="signal-category-hidden" id="signal-hidden-${cat.key}" style="display:none">
                                ${hiddenArticles.map(article => renderSignalFeedItem(article)).join('')}
                            </div>
                            <button class="signal-category-show-more" onclick="showMoreInCategory('${cat.key}')">
                                Show ${hiddenArticles.length} more ${cat.label.toLowerCase()} signal${hiddenArticles.length !== 1 ? 's' : ''}
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    list.innerHTML = synthesisedHtml + categoriesHtml;
    updateSectionTimestamp('signal-feed', Date.now(), false);
}

function renderSynthesisedSignalsBlock() {
    let cachedSignals = [];
    let cachedArticlesData = [];
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
        if (!cached) return '';
        const data = JSON.parse(cached);
        cachedSignals = data.signals || [];
        cachedArticlesData = data.articlesData || [];
    } catch (e) {
        return '';
    }
    
    if (cachedSignals.length === 0) return '';
    
    // Apply market + client filters
    const filtered = cachedSignals.filter((signal, idx) => {
        // Market filter
        if (signalFeedFilters.market !== 'ALL') {
            const markets = signal.affectedMarkets || [];
            if (!markets.includes(signalFeedFilters.market)) return false;
        }
        
        // Client filter — check article IDs in this signal's source articles
        if (signalFeedFilters.client !== 'ALL') {
            const articleIds = (cachedArticlesData[idx]?.articles || []).map(a => a.id).filter(Boolean);
            const hasClient = articleIds.some(id => {
                const article = signalFeedArticles.find(a => a.id === id);
                return article?.matchedClients?.some(c => c.name === signalFeedFilters.client);
            });
            if (!hasClient) return false;
        }
        
        return true;
    });
    
    if (filtered.length === 0) return '';
    
    const cardsHtml = filtered.map((signal, idx) => {
        const origIdx = cachedSignals.indexOf(signal);
        return renderCachedSignal(signal, cachedArticlesData[origIdx]);
    }).join('');
    
    return `
        <div class="synthesised-signals-block">
            <div class="synthesised-signals-header">🎯 Today's Signals</div>
            ${cardsHtml}
        </div>
    `;
}

function renderSignalFeedItem(article) {
    const signalEmoji = {
        'risk': '🔴',
        'opportunity': '🟢',
        'competitive': '⚔️',
        'regulatory': '🛡️',
        'relationship': '🤝',
        'ibm': '🔵',
        'general': '📰'
    }[article.signalType] || '📰';
    
    // Client tags
    const clientTags = article.matchedClients.slice(0, 4).map(c => 
        `<span class="signal-feed-tag client" title="Tier ${c.tier}">${escapeHtml(c.name)}</span>`
    ).join('');
    
    // Market tags
    const marketTags = article.markets.slice(0, 3).map(m => 
        `<span class="signal-feed-tag market">${m}</span>`
    ).join('');
    
    // Action tag if applicable (all 4 types)
    const actionTagMap = {
        'ESCALATE': { class: 'escalate', label: '🚨 ESCALATE' },
        'BRIEF_ATL': { class: 'brief', label: '📢 BRIEF ATL' },
        'POSITION': { class: 'position', label: '🎯 POSITION' },
        'MONITOR': { class: 'monitor', label: '👁️ MONITOR' }
    };
    const actionInfo = actionTagMap[article.actionType];
    const actionTag = actionInfo
        ? `<span class="signal-feed-tag action action-${actionInfo.class}">${actionInfo.label}</span>`
        : '';
    
    // Summary text (prefer context from signal synthesis)
    const summaryText = article.context || article.summary || '';
    
    // Build details section (initially hidden)
    const hasDetails = article.ibmAngle || article.talkingPoint || article.action || article.intelligence?.whyChange;
    const detailsHtml = hasDetails ? `
        <div class="signal-feed-details">
            ${article.action ? `
                <div class="signal-feed-detail-row">
                    <span class="signal-feed-detail-label">Action</span>
                    <div class="signal-feed-detail-text">${escapeHtml(article.action)}</div>
                </div>
            ` : ''}
            ${article.intelligence?.whyChange ? `
                <div class="signal-feed-detail-row">
                    <span class="signal-feed-detail-label">Why Change</span>
                    <div class="signal-feed-detail-text why-change">${escapeHtml(article.intelligence.whyChange)}</div>
                </div>
            ` : ''}
            ${article.ibmAngle ? `
                <div class="signal-feed-detail-row">
                    <span class="signal-feed-detail-label">IBM Position</span>
                    <div class="signal-feed-detail-text ibm">${escapeHtml(article.ibmAngle)}</div>
                </div>
            ` : ''}
            ${article.talkingPoint ? `
                <div class="signal-feed-detail-row">
                    <span class="signal-feed-detail-label">ATL Talking Point</span>
                    <div class="signal-feed-detail-text talking-point">"${escapeHtml(article.talkingPoint)}"</div>
                </div>
            ` : ''}
        </div>
    ` : '';
    
    // Read state — dim if already read
    const isRead = Array.isArray(app.articles) && app.articles.some(a => a.id === article.id && a.isRead);

    const urgencyClass = article.actionType === 'ESCALATE'  ? ' signal-urgency-critical'
                       : article.actionType === 'BRIEF_ATL' ? ' signal-urgency-high'
                       : article.actionType === 'POSITION'  ? ' signal-urgency-position'
                       : '';

    return `
        <div class="signal-feed-item signal-${article.signalType}${isRead ? ' signal-feed-item--read' : ''}${urgencyClass}" data-article-id="${article.id}">
            <div class="signal-feed-header">
                <span class="signal-feed-type" title="${article.signalType}">${signalEmoji}</span>
                <div class="signal-feed-headline">
                    <a href="${article.url || '#'}" target="_blank" rel="noopener">${escapeHtml(article.title)}</a>
                </div>
            </div>
            
            <div class="signal-feed-tags">
                ${actionTag}
                ${clientTags}
                ${marketTags}
            </div>
            
            ${article.intelligence ? renderIntelligenceBadges(article.intelligence) : ''}

            ${article.intelligence?.clientContext ? `<div class="signal-intelligence-client-context"><strong>🎯 YOUR CLIENT:</strong> ${escapeHtml(article.intelligence.clientContext)}</div>` : ''}

            ${article.intelligence?.reasoning ? `<div class="signal-intelligence-reasoning"><strong>Analysis:</strong> ${escapeHtml(article.intelligence.reasoning)}</div>` : ''}

            ${article.intelligence?.actionableInsights?.length > 0 ? `
                <div class="signal-intelligence-actions">
                    <strong>Actions:</strong>
                    <ul>
                        ${article.intelligence.actionableInsights.map(insight => {
                            if (!insight || typeof insight === 'string') {
                                return `<li>${escapeHtml(insight || '')}</li>`;
                            }
                            const urgencyMap = {
                                'CRITICAL': 'action-escalate',
                                'HIGH':     'action-brief',
                                'MEDIUM':   'action-position',
                                'LOW':      'action-monitor'
                            };
                            const urgencyClass = urgencyMap[insight.urgency] || 'action-monitor';
                            const urgencyBadge = insight.urgency
                                ? `<span class="action-required-badge ${urgencyClass}" style="font-size:0.65rem;padding:1px 6px;margin-right:6px;">${escapeHtml(insight.urgency)}</span>`
                                : '';
                            const timeline = insight.timeline
                                ? `<span style="font-size:0.75rem;color:var(--cds-text-secondary);margin-left:6px;">${escapeHtml(insight.timeline)}</span>`
                                : '';
                            const ibmAngle = insight.ibmAngle
                                ? `<div class="action-required-ibm" style="margin-top:4px;font-size:0.8rem;">${escapeHtml(insight.ibmAngle)}</div>`
                                : '';
                            return `<li style="margin-bottom:8px;">
                                ${urgencyBadge}${escapeHtml(insight.action || '')}${timeline}
                                ${ibmAngle}
                            </li>`;
                        }).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${summaryText ? `<div class="signal-feed-summary">${escapeHtml(summaryText.substring(0, 200))}${summaryText.length > 200 ? '...' : ''}</div>` : ''}
            
            <div class="signal-feed-source">
                <a class="signal-feed-source-link" href="${article.url || '#'}" target="_blank">${escapeHtml(article.sourceName || article.source || 'Source')}</a>
                ${article.date ? `<span class="signal-feed-source-name">• ${formatRelativeDate(new Date(article.date))}</span>` : ''}
            </div>
            
            ${detailsHtml}
            
            ${hasDetails ? `
                <div class="signal-feed-actions">
                    <button class="signal-feed-expand" onclick="toggleSignalFeedItem(this)">Show IBM angle & talking points</button>
                    ${article.matchedClients.length > 0 ? `
                        <button class="btn btn-sm btn-brief-atl" onclick="openBriefATL('${escapeHtml(article.matchedClients[0].name)}')">📤 Brief ATL</button>
                        <button class="btn btn-sm btn-meeting-brief" onclick="app.openMeetingBrief('${escapeHtml(article.matchedClients[0].name)}')">📋 Meeting Brief</button>
                    ` : ''}
                </div>
            ` : article.matchedClients.length > 0 ? `
                <div class="signal-feed-actions">
                    <button class="btn btn-sm btn-brief-atl" onclick="openBriefATL('${escapeHtml(article.matchedClients[0].name)}')">📤 Brief ATL</button>
                    <button class="btn btn-sm btn-meeting-brief" onclick="app.openMeetingBrief('${escapeHtml(article.matchedClients[0].name)}')">📋 Meeting Brief</button>
                </div>
            ` : ''}
        </div>
    `;

/**
 * Render intelligence badges for an article
 * Shows tier, threat level, opportunity score, and confidence
 */
function renderIntelligenceBadges(intelligence) {
    if (!intelligence || !intelligence.isRelevant) return '';
    
    const badges = [];
    
    // Tier badge
    const tierColors = {
        3: 'purple',  // Semantic analysis
        2: 'blue',    // Context analysis
        1: 'gray'     // Keyword filtering
    };
    const tierColor = tierColors[intelligence.tier] || 'gray';
    badges.push(`<span class="intel-badge intel-tier intel-tier-${tierColor}" title="Analysis Tier ${intelligence.tier}">T${intelligence.tier}</span>`);
    
    // Threat badge
    if (intelligence.threatLevel >= 60) {
        const level = intelligence.threatLevel >= 80 ? 'high' : 'medium';
        badges.push(`<span class="intel-badge intel-threat intel-threat-${level}" title="Threat Level">⚠️ ${intelligence.threatLevel}</span>`);
    }
    
    // Opportunity badge
    if (intelligence.opportunityScore >= 60) {
        const level = intelligence.opportunityScore >= 70 ? 'high' : 'medium';
        badges.push(`<span class="intel-badge intel-opportunity intel-opportunity-${level}" title="Opportunity Score">💰 ${intelligence.opportunityScore}</span>`);
    }
    
    // Confidence badge (only for Tier 3 semantic analysis)
    if (intelligence.tier === 3 && intelligence.confidence >= 0.8) {
        badges.push(`<span class="intel-badge intel-confidence" title="Confidence Score">${Math.round(intelligence.confidence * 100)}%</span>`);
    }
    
    return `<div class="intelligence-badges">${badges.join('')}</div>`;

/**
 * Update intelligence stats display in header
 * Shows threat count, opportunity count, and API cost
 */
async function updateIntelligenceStats() {
    const statsContainer = document.getElementById('intelligence-stats');
    if (!statsContainer) return;
    
    // Get intelligence engine stats
    const stats = await app.intelligenceEngine?.getStats();
    if (!stats) {
        statsContainer.classList.add('hidden');
        return;
    }
    
    // Count high-priority threats and opportunities from articles
    let highThreats = 0;
    let highOpportunities = 0;
    
    if (app.articles) {
        app.articles.forEach(article => {
            if (article.intelligence?.isRelevant) {
                if (article.intelligence.threatLevel >= 70) highThreats++;
                if (article.intelligence.opportunityScore >= 70) highOpportunities++;
            }
        });
    }
    
    // Format cost
    const costFormatted = stats.totalCost < 0.01 
        ? '<$0.01' 
        : `$${stats.totalCost.toFixed(2)}`;
    
    // Build stats HTML
    const statsHtml = `
        <div class="intel-stat">
            <div class="intel-stat-label">Threats</div>
            <div class="intel-stat-value threat">${highThreats}</div>
        </div>
        <div class="intel-stat">
            <div class="intel-stat-label">Opportunities</div>
            <div class="intel-stat-value opportunity">${highOpportunities}</div>
        </div>
        <div class="intel-stat">
            <div class="intel-stat-label">Tier 3 Calls</div>
            <div class="intel-stat-value">${stats.tier3Count}</div>
        </div>
        <div class="intel-stat">
            <div class="intel-stat-label">API Cost</div>
            <div class="intel-stat-value cost">${costFormatted}</div>
        </div>
    `;
    
    statsContainer.innerHTML = statsHtml;
    statsContainer.classList.remove('hidden');
}
}
}

function toggleSignalFeedItem(btn) {
    const item = btn.closest('.signal-feed-item');
    if (!item) return;
    
    const isExpanded = item.classList.toggle('expanded');
    btn.textContent = isExpanded ? 'Hide details' : 'Show IBM angle & talking points';
}

function toggleSignalCategory(categoryKey) {
    const category = document.querySelector(`.signal-category[data-category="${categoryKey}"]`);
    if (!category) return;
    
    const body = category.querySelector('.signal-category-body');
    const chevron = category.querySelector('.signal-category-chevron');
    
    const isCollapsed = body?.classList.toggle('collapsed');
    category.classList.toggle('expanded', !isCollapsed);
    
    if (chevron) {
        chevron.textContent = isCollapsed ? '▶' : '▼';
    }
}

function showMoreInCategory(categoryKey) {
    // Reveal pre-rendered hidden articles and hide the button
    const hidden = document.getElementById(`signal-hidden-${categoryKey}`);
    if (hidden) {
        hidden.style.display = '';
        const btn = hidden.nextElementSibling;
        if (btn) btn.style.display = 'none';
        return;
    }
    // Fallback: legacy approach for any edge case
    const typeMapping = {
        'risk': 'risk',
        'opportunity': 'opportunity',
        'competitive': 'competitive',
        'regulatory': 'regulatory',
        'relationship': 'general',
        'ibm': 'general',
        'general': 'general',
        'background': 'general'
    };
    
    // Apply current filters
    let filtered = signalFeedArticles;
    
    if (signalFeedFilters.market !== 'ALL') {
        filtered = filtered.filter(a => 
            a.markets.includes(signalFeedFilters.market) ||
            a.matchedClients.some(c => c.market === signalFeedFilters.market)
        );
    }
    
    if (signalFeedFilters.client !== 'ALL') {
        filtered = filtered.filter(a => 
            a.matchedClients.some(c => c.name === signalFeedFilters.client)
        );
    }
    
    // Get articles for this category
    const categoryArticles = filtered.filter(a => {
        const mappedType = typeMapping[a.signalType] || 'general';
        return mappedType === categoryKey;
    });
    
    // Sort
    categoryArticles.sort((a, b) => {
        const aUrgent = a.actionType === 'ESCALATE' ? 2 : a.actionType === 'BRIEF_ATL' ? 1 : 0;
        const bUrgent = b.actionType === 'ESCALATE' ? 2 : b.actionType === 'BRIEF_ATL' ? 1 : 0;
        if (aUrgent !== bUrgent) return bUrgent - aUrgent;
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
    
    // Find the category container and replace items
    const category = document.querySelector(`.signal-category[data-category="${categoryKey}"]`);
    if (!category) return;
    
    const itemsContainer = category.querySelector('.signal-category-items');
    const moreContainer = category.querySelector('.signal-category-more');
    
    if (itemsContainer) {
        itemsContainer.innerHTML = categoryArticles.map(article => renderSignalFeedItem(article)).join('');
    }
    
    if (moreContainer) {
        moreContainer.remove();
    }
}

function filterByClient(clientName) {
    signalFeedFilters.client = clientName;
    
    // Update chip active states
    document.querySelectorAll('.client-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.client === clientName);
    });
    
    renderSignalFeed();
}

// =============================================
// View Options: Priority Filter
// =============================================

function filterByPriority(priority) {
    signalFeedFilters.priority = priority;
    
    // Update active button state
    document.querySelectorAll('.priority-filter-btn').forEach(btn => {
        if (btn.dataset.priority === priority) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderSignalFeed();
}

function filterBySignalType(type) {
    signalFeedFilters.signalType = type;
    
    // Update button active states
    document.querySelectorAll('.signal-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    
    renderSignalFeed();
}

// Update switchMarket to work with Signal Feed
function switchMarket(market) {
    app.currentMarket = market;
    signalFeedFilters.market = market;
    
    // Update tab active states
    document.querySelectorAll('.market-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.market === market);
    });
    
    renderSignalFeed();
}

function renderSynthesizedSignal(signal, rawSignal) {
    const articles = rawSignal.articles || [];
    const sourcesHtml = articles.length > 0 
        ? articles.map(a => {
            const sourceName = a.source || a.sourceName || 'Source';
            return `<div class="signal-source-item">
                <a class="signal-source-link" href="${a.url || '#'}" target="_blank">${escapeHtml(a.title || signal.headline)}</a>
                <span class="signal-source-name">(${escapeHtml(sourceName)})</span>
            </div>`;
        }).join('')
        : (rawSignal.sources || []).map(s => `<span class="signal-source-name">${escapeHtml(s)}</span>`).join(', ');
    
    // Action type styling
    const actionTypeStyles = {
        'ESCALATE': { emoji: '🚨', class: 'action-escalate', label: 'ESCALATE' },
        'BRIEF_ATL': { emoji: '📢', class: 'action-brief', label: 'BRIEF ATL' },
        'POSITION': { emoji: '🎯', class: 'action-position', label: 'POSITION' },
        'MONITOR': { emoji: '👁️', class: 'action-monitor', label: 'MONITOR' }
    };
    const actionStyle = actionTypeStyles[signal.actionType] || actionTypeStyles['MONITOR'];
    
    // Markets affected
    const marketsHtml = (signal.affectedMarkets || []).length > 0
        ? `<div class="signal-card-markets">${signal.affectedMarkets.map(m => `<span class="market-tag">${m}</span>`).join('')}</div>`
        : '';
    
    return `
        <div class="signal-card ${actionStyle.class}">
            <div class="signal-card-header">
                <div class="signal-card-action-badge ${actionStyle.class}">${actionStyle.emoji} ${actionStyle.label}</div>
                <span class="signal-card-headline">${escapeHtml(signal.headline)}</span>
                <div class="signal-card-tags">
                    <span class="signal-card-tag ${signal.wave === 'AI' ? 'industry' : signal.wave === 'COMPETITIVE' ? 'competitive' : 'client'}">${signal.wave}</span>
                    ${signal.competitive ? `<span class="signal-card-tag competitive">⚔️ ${escapeHtml(signal.competitive)}</span>` : ''}
                </div>
            </div>
            ${marketsHtml}
            ${signal.context ? `<div class="signal-card-context">${escapeHtml(signal.context)}</div>` : ''}
            <div class="signal-card-body"><strong>Action:</strong> ${escapeHtml(signal.action)}</div>
            ${signal.talkingPoint ? `<div class="signal-card-talking-point"><strong>💬 ATL Talking Point:</strong> "${escapeHtml(signal.talkingPoint)}"</div>` : ''}
            <div class="signal-card-ibm"><strong>IBM Position:</strong> ${escapeHtml(signal.ibmAngle)}</div>
            <div class="signal-card-sources">${sourcesHtml || 'No sources'}</div>
        </div>
    `;
}

function renderCachedSignal(signal, articleData) {
    const articles = articleData?.articles || [];
    const sourcesHtml = articles.length > 0
        ? articles.map(a => {
            const sourceName = a.source || a.sourceName || 'Source';
            return `<div class="signal-source-item">
                <a class="signal-source-link" href="${a.url || '#'}" target="_blank">${escapeHtml(a.title || signal.headline)}</a>
                <span class="signal-source-name">(${escapeHtml(sourceName)})</span>
            </div>`;
        }).join('')
        : '';
    
    // Action type styling
    const actionTypeStyles = {
        'ESCALATE': { emoji: '🚨', class: 'action-escalate', label: 'ESCALATE' },
        'BRIEF_ATL': { emoji: '📢', class: 'action-brief', label: 'BRIEF ATL' },
        'POSITION': { emoji: '🎯', class: 'action-position', label: 'POSITION' },
        'MONITOR': { emoji: '👁️', class: 'action-monitor', label: 'MONITOR' }
    };
    const actionStyle = actionTypeStyles[signal.actionType] || actionTypeStyles['MONITOR'];
    
    // Markets affected
    const marketsHtml = (signal.affectedMarkets || []).length > 0
        ? `<div class="signal-card-markets">${signal.affectedMarkets.map(m => `<span class="market-tag">${m}</span>`).join('')}</div>`
        : '';
    
    return `
        <div class="signal-card ${actionStyle.class}">
            <div class="signal-card-header">
                <div class="signal-card-action-badge ${actionStyle.class}">${actionStyle.emoji} ${actionStyle.label}</div>
                <span class="signal-card-headline">${escapeHtml(signal.headline)}</span>
                <div class="signal-card-tags">
                    <span class="signal-card-tag ${signal.wave === 'AI' ? 'industry' : signal.wave === 'COMPETITIVE' ? 'competitive' : 'client'}">${signal.wave || 'NEWS'}</span>
                    ${signal.competitive ? `<span class="signal-card-tag competitive">⚔️ ${escapeHtml(signal.competitive)}</span>` : ''}
                </div>
            </div>
            ${marketsHtml}
            ${signal.context ? `<div class="signal-card-context">${escapeHtml(signal.context)}</div>` : ''}
            ${signal.action ? `<div class="signal-card-body"><strong>Action:</strong> ${escapeHtml(signal.action)}</div>` : ''}
            ${signal.talkingPoint ? `<div class="signal-card-talking-point"><strong>💬 ATL Talking Point:</strong> "${escapeHtml(signal.talkingPoint)}"</div>` : ''}
            ${signal.ibmAngle ? `<div class="signal-card-ibm"><strong>IBM Position:</strong> ${escapeHtml(signal.ibmAngle)}</div>` : ''}
            <div class="signal-card-sources">${sourcesHtml || 'No sources'}</div>
        </div>
    `;
}

function renderBasicSignal(signal) {
    const tagHtml = [
        ...(signal.industries || []).map(t => `<span class="signal-card-tag industry">${escapeHtml(t)}</span>`),
        ...(signal.clients || []).map(c => `<span class="signal-card-tag client">${escapeHtml(c)}</span>`),
        signal.type === 'competitive' ? '<span class="signal-card-tag competitive">⚔️ Competitive</span>' : ''
    ].join('');
    
    const articles = signal.articles || [];
    const sourcesHtml = articles.length > 0
        ? articles.map(a => {
            const sourceName = a.source || a.sourceName || 'Source';
            return `<div class="signal-source-item">
                <a class="signal-source-link" href="${a.url || '#'}" target="_blank">${escapeHtml(a.title || signal.headline)}</a>
                <span class="signal-source-name">(${escapeHtml(sourceName)})</span>
            </div>`;
        }).join('')
        : (signal.sources || []).map(s => `<span class="signal-source-name">${escapeHtml(s)}</span>`).join(', ');
    
    return `
        <div class="signal-card">
            <div class="signal-card-header">
                <span class="signal-card-headline">${escapeHtml(signal.headline)}</span>
                <div class="signal-card-tags">${tagHtml}</div>
            </div>
            ${signal.summary ? `<div class="signal-card-context">${escapeHtml(signal.summary.substring(0, 200))}</div>` : ''}
            <div class="signal-card-sources">${sourcesHtml || 'No sources'}</div>
        </div>
    `;
}

// Session cache for per-article deep analysis results (keyed by article ID)
const deepReadAnalysisCache = new Map();

// ==========================================
// DEEP READS RENDERING (AI-powered with caching)
// Purpose: "Internalize for strategic conversations"
// Long-form thinking for CxO/board-level discourse
// 
// REFRESH RULE: Deep Reads are refreshed when:
// 1. User clicks Refresh button (forceRefresh = true)
// 2. Cache is older than 24 hours (strategic content has longer shelf life)
// 3. Source articles come from weeklyArticles (7-14 day lookback)
// ==========================================

async function renderDeepReads(forceRefresh = false) {
    const list = document.getElementById('deep-reads-list');
    const countEl = document.getElementById('deep-reads-count');
    if (!list) return;
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.DEEP_READS);
            if (cached) {
                const { insights, articlesData, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                // Show cached if less than 72 hours old (strategic content has longer shelf life)
                if (age < 72 * 60 * 60 * 1000 && insights && insights.length > 0) {
                    trackCacheAccess('deep-reads', true); // Cache HIT
                    countEl.textContent = insights.length;
                    list.innerHTML = insights.map((insight, idx) =>
                        renderCachedDeepRead(insight, articlesData?.[idx])
                    ).join('');
                    app._deepReadCandidates = (articlesData || []).slice(0, 3);
                    return;
                }
            }
        } catch (e) {
            console.log('Deep reads cache read error:', e);
        }
    }
    
    trackCacheAccess('deep-reads', false); // Cache MISS
    
    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];
    
    /**
     * Score article for Deep Reads selection based on multiple criteria
     * @param {Object} article - Article object
     * @returns {number} Score from 0-100
     */
    function scoreArticleForDeepRead(article) {
        let score = 0;
        
        // 1. Strategic Category (0-30 points)
        if (article.category === 'Strategic Perspectives') score += 30;
        else if (article.category === 'Architecture & Platform') score += 25;
        else if (article.category === 'Industry Trends') score += 20;
        else if (article.category === 'AI & Machine Learning') score += 18;
        else if (article.category === 'Cloud & Infrastructure') score += 15;
        
        // 2. Source Credibility (0-25 points)
        const premiumSources = ['a16z', 'Benedict Evans', 'Stratechery', 'MIT Technology Review', 'Harvard Business Review'];
        const goodSources = ['TechCrunch', 'The Verge', 'Ars Technica', 'The Information'];
        
        if (premiumSources.some(s => article.source?.includes(s))) score += 25;
        else if (goodSources.some(s => article.source?.includes(s))) score += 15;
        else score += 5; // Base points for any source
        
        // 3. Content Depth (0-20 points)
        const contentLength = article.content?.length || article.summary?.length || 0;
        if (contentLength > 3000) score += 20;
        else if (contentLength > 1500) score += 15;
        else if (contentLength > 800) score += 10;
        else score += 5;
        
        // 4. Recency (0-15 points)
        const pubDate = new Date(article.pubDate || article.isoDate);
        const ageInDays = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays <= 3) score += 15;
        else if (ageInDays <= 7) score += 10;
        else if (ageInDays <= 14) score += 5;
        
        // 5. Relevance Score (0-10 points)
        score += Math.min((article.relevanceScore || 0) / 10, 10);
        
        return Math.round(score);
    }
    
    /**
     * Select diverse articles from scored candidates
     * @param {Array} scoredCandidates - Array of {article, score} objects
     * @param {number} count - Number of articles to select
     * @returns {Array} Selected articles
     */
    function selectDiverseArticles(scoredCandidates, count = 3) {
        const selected = [];
        const usedCategories = new Set();
        const usedSources = new Set();
        
        for (const {article, score} of scoredCandidates) {
            if (selected.length >= count) break;
            
            const categoryKey = article.category;
            const sourceKey = article.source?.split(' ')[0]; // First word of source
            
            // First article: always take highest score
            if (selected.length === 0) {
                selected.push(article);
                usedCategories.add(categoryKey);
                usedSources.add(sourceKey);
                console.log(`Deep Reads: Selected #1 - "${article.title}" (score: ${score}, ${categoryKey}, ${article.source})`);
                continue;
            }
            
            // Subsequent articles: prefer different category/source
            const isDifferentCategory = !usedCategories.has(categoryKey);
            const isDifferentSource = !usedSources.has(sourceKey);
            
            // Accept if: different category OR different source OR last slot
            if (isDifferentCategory || isDifferentSource || selected.length === count - 1) {
                selected.push(article);
                usedCategories.add(categoryKey);
                usedSources.add(sourceKey);
                console.log(`Deep Reads: Selected #${selected.length} - "${article.title}" (score: ${score}, ${categoryKey}, ${article.source})`);
            } else {
                console.log(`Deep Reads: Skipped "${article.title}" (score: ${score}) - duplicate category/source`);
            }
        }
        
        return selected;
    }
    
    // Select deep read candidates: strategic sources, analyst content, thought leadership
    // RULE: Pulls from weeklyArticles (7-14 day lookback) for strategic, longer-form content
    const strategicCategories = ['Strategic Perspectives', 'Architecture & Platform'];
    const strategicSources = ['a16z', 'Benedict Evans', 'Stratechery', 'MIT Technology Review', 'Harvard Business Review'];
    
    // Initial filtering: strategic category OR analyst source OR high relevance
    let candidates = app.weeklyArticles.length > 0
        ? app.weeklyArticles
        : app.articles.filter(a => {
            const isStrategic = strategicCategories.includes(a.category);
            const isAnalyst = strategicSources.some(s => a.source?.includes(s));
            const isHighValue = (a.relevanceScore || 0) > 60;
            return isStrategic || isAnalyst || isHighValue;
        });
    
    // Score and sort candidates
    const scoredCandidates = candidates
        .map(a => ({ article: a, score: scoreArticleForDeepRead(a) }))
        .sort((a, b) => b.score - a.score);
    
    console.log(`Deep Reads: Scored ${scoredCandidates.length} candidates, top score: ${scoredCandidates[0]?.score || 0}`);
    
    // Select top 3 diverse articles
    candidates = selectDiverseArticles(scoredCandidates, 3);
    
    countEl.textContent = Math.min(candidates.length, 3);
    
    // COST OPTIMIZATION: Smart triggering - check for new strategic articles
    if (!forceRefresh && apiKey) {
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.DEEP_READS);
            if (cached) {
                const { insights, timestamp, articlesData } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                
                // Count new strategic articles since last generation
                const newStrategicArticles = candidates.filter(a => {
                    const articleDate = new Date(a.pubDate || a.isoDate).getTime();
                    return articleDate > timestamp;
                });
                
                // If cache valid AND fewer than 2 new strategic articles, use cache
                if (age < 72 * 60 * 60 * 1000 && newStrategicArticles.length < 2) {
                    console.log(`Deep Reads: Only ${newStrategicArticles.length} new strategic articles, using cache`);
                    trackCacheAccess('deep-reads', true); // Cache HIT (smart trigger)
                    list.innerHTML = insights.map((insight, idx) =>
                        renderCachedDeepRead(insight, articlesData?.[idx])
                    ).join('');
                    app._deepReadCandidates = candidates.slice(0, 3);
                    return;
                }
                
                console.log(`Deep Reads: ${newStrategicArticles.length} new strategic articles, regenerating`);
            }
        } catch (e) {
            console.log('Deep reads smart trigger check error:', e);
        }
    }
    
    if (candidates.length === 0) {
        list.innerHTML = '<p class="card-description">No strategic content this week. Click Refresh to fetch latest articles.</p>';
        return;
    }
    
    // Without API key: render basic list and cache it
    if (!apiKey) {
        const basicInsights = candidates.slice(0, 3).map(a => ({
            title: a.title,
            source: a.source,
            summary: a.summary || '',
            timeHorizon: 'TBD'
        }));
        cacheDeepReads(basicInsights, candidates.slice(0, 3));
        list.innerHTML = candidates.slice(0, 3).map(article => renderBasicDeepRead(article)).join('');
        return;
    }
    
    // With API key: generate strategic synthesis
    list.innerHTML = '<p class="card-description">Synthesizing strategic insights...</p>';
    
    const articleSummaries = candidates.slice(0, 3).map((a, i) =>
        `[${i + 1}] "${a.title}" (${a.source})\nContent: ${a.content?.substring(0, 500) || a.summary?.substring(0, 500) || 'No content available'}`
    ).join('\n\n');
    
    const prompt = `You are preparing a strategic reading brief for the IBM APAC Field CTO who leads 115 ATLs across 343 enterprise accounts.

Long-form articles for strategic thinking — content for CxO conversations, board discussions, QBRs.

ARTICLES:
${articleSummaries}

CONTEXT: Elevate tactical to strategic. Translate tech trends to business impact for CFOs/CEOs. Build ATL team capability. Five Conversations framework: map signals to conversation doors (Conv 1–5 + Conv L).

ANALYSIS FRAMEWORK:
1. Extract technical specifications (numbers, metrics, capabilities) - be specific
2. Identify the problem being solved (constraints, limitations, challenges mentioned in article)
3. Explain the solution approach (how it works, what's novel)
4. Connect to business impact (cost, speed, capability, risk)

CRITICAL EXTRACTION RULES:
- Capture ALL quantitative metrics (X% faster, Y tokens, Z parameters, throughput numbers)
- Identify technical constraints explicitly mentioned (e.g., context explosion, thinking tax, goal drift)
- Extract specific capabilities (context window size, parameter counts, performance benchmarks)
- Note problem-solution pairs stated in the article
- Include architectural innovations (active vs total parameters, memory management approaches)

Return ONLY a valid JSON array (exactly 3 articles). Do not include any text before or after the JSON:
[
  {
    "title": "Original article title",
    "strategicThesis": "Big idea in one powerful sentence capturing the core innovation and its market impact",
    "technicalBreakthrough": "Key technical specs/metrics that enable the breakthrough (e.g., '15x token efficiency, 1M context window, 12B active parameters')",
    "problemSolved": "What constraint or limitation does this overcome? (e.g., 'Eliminates goal drift in multi-agent workflows by maintaining full state in 1M token context')",
    "leadershipImplication": "What this means for CTOs/CIOs making investment decisions",
    "cxoQuestion": "Provocative question for CxO discussion (thought-provoking, not sales-y)",
    "timeHorizon": "6 months" | "12 months" | "2-3 years"
  }
]

IMPORTANT: Return ONLY the JSON array. No explanatory text, no markdown code blocks, no additional commentary. Start with [ and end with ].`;

    try {
        // COST OPTIMIZATION: Use unified API helper with token tracking
        const { text } = await callAI('STRATEGIC_ANALYSIS', prompt, 900, apiKey);
        
        // Clean response: remove markdown code blocks if present
        let cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        
        // Try to extract JSON (array first, then object as fallback)
        let jsonMatch = cleanedText.match(/\[[\s\S]*\]/) || cleanedText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            console.error('Deep Reads: No JSON found in response');
            console.error('Response (first 500 chars):', cleanedText.substring(0, 500));
            throw new Error('No valid JSON in response');
        }
        
        // Clean up JSON before parsing
        let jsonStr = jsonMatch[0];
        
        // Remove trailing commas before closing brackets
        jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');
        
        // Count brackets to find first balanced closing bracket
        const isArray = jsonStr[0] === '[';
        const openChar = isArray ? '[' : '{';
        const closeChar = isArray ? ']' : '}';
        let bracketCount = 0;
        let firstBalanced = -1;
        
        for (let i = 0; i < jsonStr.length; i++) {
            if (jsonStr[i] === openChar) bracketCount++;
            if (jsonStr[i] === closeChar) {
                bracketCount--;
                if (bracketCount === 0 && firstBalanced === -1) {
                    firstBalanced = i;
                    // Don't break - continue to see what follows
                }
            }
        }
        
        // Validate what comes after the first balanced point
        if (firstBalanced > 0 && firstBalanced < jsonStr.length - 1) {
            const remaining = jsonStr.substring(firstBalanced + 1).trim();
            
            // Check if remaining looks like valid JSON continuation
            if (remaining.startsWith(',') || remaining.startsWith('{') || remaining.startsWith('[')) {
                // Valid JSON continuation - keep full response
                console.log('Deep Reads: Detected valid JSON continuation, keeping full response');
            } else if (remaining.length > 0) {
                // Trailing text - truncate it
                console.log(`Deep Reads: Truncating ${remaining.length} chars of trailing text`);
                jsonStr = jsonStr.substring(0, firstBalanced + 1);
            }
        }
        
        let synthesized;
        try {
            synthesized = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('Deep Reads JSON parse error:', parseError.message);
            console.error('Problematic JSON substring:', jsonStr.substring(Math.max(0, 280), 320));
            console.error('Full JSON (first 500 chars):', jsonStr.substring(0, 500));
            throw new Error(`JSON parse failed: ${parseError.message}`);
        }
        
        // Validate it's an array
        if (!Array.isArray(synthesized)) {
            console.warn('Deep Reads: Response is not an array, wrapping in array');
            synthesized = [synthesized];
        }
        
        // Cache the synthesized insights with article data
        cacheDeepReads(synthesized, candidates.slice(0, 3));
        
        list.innerHTML = synthesized.map((insight, idx) => {
            const article = candidates[idx];
            if (!article) return '';
            
            return renderSynthesizedDeepRead(insight, article);
        }).join('');
        app._deepReadCandidates = candidates.slice(0, 3);
        
    } catch (err) {
        console.error('Deep read synthesis error:', err);
        list.innerHTML = candidates.slice(0, 5).map(article => renderBasicDeepRead(article)).join('');
    }
}

function autoAnalyseDeepReads(candidates) {
    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];
    if (!apiKey || !candidates || candidates.length === 0) return;
    candidates.forEach((article, idx) => {
        if (!article?.id || deepReadAnalysisCache.has(article.id)) return;
        setTimeout(() => {
            app.deepReadArticle(article.id, null);
        }, idx * 600);
    });
}

function cacheDeepReads(insights, articles) {
    try {
        const articlesData = articles.map(a => ({
            id: a.id,
            source: a.source,
            url: a.url,
            title: a.title,
            summary: a.summary
        }));
        localStorage.setItem(STORAGE_KEYS.DEEP_READS, JSON.stringify({
            insights,
            articlesData,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.log('Deep reads cache write error:', e);
    }
    updateSectionTimestamp('deep-reads', Date.now(), false);
}

// ==========================================
// COPY: Deep Reads to clipboard
// ==========================================
function copyDeepReads() {
    let text = `📚 Deep Reads — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n`;
    try {
        const cached = localStorage.getItem(STORAGE_KEYS.DEEP_READS);
        if (!cached) { showToast('No deep reads to copy'); return; }
        const { insights, articlesData } = JSON.parse(cached);
        if (!insights?.length) { showToast('No deep reads to copy'); return; }
        insights.forEach((ins, i) => {
            const art = articlesData?.[i] || {};
            text += `${ins.title || art.title || ''}\n`;
            if (art.source) text += `Source: ${art.source}\n`;
            if (ins.strategicThesis)       text += `💡 Thesis: ${ins.strategicThesis}\n`;
            if (ins.leadershipImplication) text += `📊 Implication: ${ins.leadershipImplication}\n`;
            if (ins.cxoQuestion)           text += `🎯 CxO Q: "${ins.cxoQuestion}"\n`;
            text += '\n';
        });
    } catch(e) { showToast('Copy failed'); return; }
    navigator.clipboard.writeText(text.trim()).then(() => showToast('✅ Deep Reads copied'));
}

function renderSynthesizedDeepRead(insight, article) {
    return `
        <div class="deep-read-item" onclick="openArticle('${article.id || ''}')">
            <div class="deep-read-item-header">
                <a class="deep-read-item-source" href="${article.url || '#'}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(article.source || article.sourceName || '')}</a>
                <span class="deep-read-item-time">${escapeHtml(insight.timeHorizon)} horizon</span>
            </div>
            <div class="deep-read-item-title">${escapeHtml(insight.title)}</div>
            <div class="deep-read-strategic">
                <div class="deep-read-thesis"><strong>💡 Strategic Thesis:</strong> ${escapeHtml(insight.strategicThesis)}</div>
                ${insight.technicalBreakthrough ? `<div class="deep-read-technical"><strong>🔬 Technical Breakthrough:</strong> ${escapeHtml(insight.technicalBreakthrough)}</div>` : ''}
                ${insight.problemSolved ? `<div class="deep-read-problem"><strong>⚡ Problem Solved:</strong> ${escapeHtml(insight.problemSolved)}</div>` : ''}
                <div class="deep-read-implication"><strong>📊 Leadership Implication:</strong> ${escapeHtml(insight.leadershipImplication || '')}</div>
                <div class="deep-read-question"><strong>🎯 CxO Question:</strong> "${escapeHtml(insight.cxoQuestion || '')}"</div>
            </div>
            <div class="deep-read-item-action">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.deepReadArticle('${article.id || ''}', this)">🔄 Regenerate Analysis</button>
            </div>
            <div class="deep-read-analysis"></div>
        </div>
    `;
}

function renderCachedDeepRead(insight, articleData) {
    const article = articleData || {};
    const articleId = article.id || '';
    return `
        <div class="deep-read-item" onclick="openArticle('${articleId}')">
            <div class="deep-read-item-header">
                <a class="deep-read-item-source" href="${article.url || '#'}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(article.source || insight.source || '')}</a>
                <span class="deep-read-item-time">${escapeHtml(insight.timeHorizon || 'TBD')} horizon</span>
            </div>
            <div class="deep-read-item-title">${escapeHtml(insight.title || article.title || '')}</div>
            ${insight.strategicThesis ? `
            <div class="deep-read-strategic">
                <div class="deep-read-thesis"><strong>💡 Strategic Thesis:</strong> ${escapeHtml(insight.strategicThesis)}</div>
                ${insight.technicalBreakthrough ? `<div class="deep-read-technical"><strong>🔬 Technical Breakthrough:</strong> ${escapeHtml(insight.technicalBreakthrough)}</div>` : ''}
                ${insight.problemSolved ? `<div class="deep-read-problem"><strong>⚡ Problem Solved:</strong> ${escapeHtml(insight.problemSolved)}</div>` : ''}
                <div class="deep-read-implication"><strong>📊 Leadership Implication:</strong> ${escapeHtml(insight.leadershipImplication || '')}</div>
                <div class="deep-read-question"><strong>🎯 CxO Question:</strong> "${escapeHtml(insight.cxoQuestion || '')}"</div>
            </div>
            ` : `<div class="deep-read-item-summary">${escapeHtml(insight.summary || article.summary || '')}</div>`}
            <div class="deep-read-item-action">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.deepReadArticle('${articleId}', this)">🔄 Regenerate Analysis</button>
            </div>
            <div class="deep-read-analysis"></div>
        </div>
    `;
}

function renderBasicDeepRead(article) {
    return `
        <div class="deep-read-item" onclick="openArticle('${article.id || ''}')">
            <div class="deep-read-item-header">
                <a class="deep-read-item-source" href="${article.url || '#'}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(article.source || article.sourceName || '')}</a>
                <span class="deep-read-item-time">${article.readingTime || '5'} min</span>
            </div>
            <div class="deep-read-item-title">${escapeHtml(article.title)}</div>
            <div class="deep-read-item-summary">${escapeHtml(article.summary || '')}</div>
            <div class="deep-read-item-action">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.deepReadArticle('${article.id || ''}', this)">🤖 Generate Deep Analysis</button>
            </div>
        </div>
    `;
}

// ==========================================
// HELPER: Format relative date
// ==========================================

function formatRelativeDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString();
}

function formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
}

// ==========================================
// WEEK CONTEXT EDITOR
// ==========================================
function openWeekContextEditor() {
    const modal = document.getElementById('week-context-modal');
    if (!modal) return;
    const ta = document.getElementById('week-context-inline');
    if (ta) {
        ta.value = app?.settings?.thisWeekContext || '';
        // Live detection hint as user types
        ta.oninput = () => {
            const hint = document.getElementById('week-context-hint');
            if (!hint) return;
            const r = resolveContextMatches(ta.value, app?.clients || []);
            const parts = [];
            if (r.clientNames.length > 0) parts.push(r.clientNames.map(n => {
                const c = (app?.clients || []).find(cl => cl.name === n);
                return c?.market ? `${n} (${c.market})` : n;
            }).join(', '));
            if (r.markets.length > 0 && r.clientNames.length === 0) parts.push(r.markets.join(', '));
            if (r.industries.length > 0 && r.clientNames.length === 0) parts.push(r.industries.join(', '));
            hint.textContent = parts.length > 0 ? `Detected: ${parts.join(' · ')}` : '';
        };
        // Run once on open to show current state
        ta.oninput();
    }
    modal.classList.remove('hidden');
    setTimeout(() => ta?.focus(), 50);
}
function closeWeekContextEditor() {
    document.getElementById('week-context-modal')?.classList.add('hidden');
}
function saveWeekContext() {
    const ta = document.getElementById('week-context-inline');
    if (!ta) return;
    app.settings.thisWeekContext = ta.value.trim();
    // Clear live hint before closing
    const hint = document.getElementById('week-context-hint');
    if (hint) hint.textContent = '';
    // Sync to settings modal textarea if open
    const settingsTa = document.getElementById('week-context');
    if (settingsTa) settingsTa.value = app.settings.thisWeekContext;
    app.saveToStorage();
    updateWeekContextWidget();
    closeWeekContextEditor();
    // Re-render context-dependent sections
    if (app.articles.length > 0) {
        renderActionRequired();
        renderExecutiveSummary(true);
    }
    showToast('✅ Context saved');
}
function updateWeekContextWidget() {
    const label = document.getElementById('week-context-label');
    if (!label) return;
    const ctx = app?.settings?.thisWeekContext || '';
    if (!ctx) {
        label.textContent = "Set this week's context";
        return;
    }
    // Show resolved matches if any, else raw text
    const resolved = resolveContextMatches(ctx, app?.clients || []);
    if (resolved.clientNames.length > 0 || resolved.markets.length > 0) {
        const parts = [];
        if (resolved.clientNames.length > 0) parts.push(resolved.clientNames.slice(0, 2).join(' · '));
        if (resolved.markets.length > 0 && resolved.clientNames.length === 0) parts.push(resolved.markets.slice(0, 2).join(' · '));
        label.textContent = parts.join(' · ');
    } else {
        label.textContent = ctx.length > 55 ? ctx.substring(0, 52) + '…' : ctx;
    }
}

// ==========================================
// CLIENT RISK SCORES — Sprint 5
// ==========================================
function calculateClientRiskScores() {
    const scores = {};
    const now = Date.now();
    const ONE_DAY = 86400000;
    // Fix B: use app.articles only — dailyArticles is a subset of articles so
    // combining both causes every article to be counted twice per client.
    const allArticles = app?.articles || [];
    const seen = new Set();

    (app?.clients || []).forEach(client => {
        const name = typeof client === 'string' ? client : client.name;
        if (!name) return;
        const matched = allArticles.filter(a => {
            if (seen.has(a.id + name)) return false;
            const clients = a.matchedClients || [];
            const isMatch = clients.some(c => {
                const cn = typeof c === 'string' ? c : c.name;
                return cn?.toLowerCase() === name.toLowerCase();
            });
            if (isMatch) seen.add(a.id + name);
            return isMatch;
        });
        if (matched.length === 0) return;
        let weightedSum = 0, totalWeight = 0;
        matched.forEach(a => {
            const threat = a.intelligence?.threatLevel || 0;
            const age = (now - new Date(a.publishedDate || a.date || 0).getTime()) / ONE_DAY;
            const weight = age < 1 ? 3 : age < 2 ? 2 : 1;
            weightedSum += threat * weight;
            totalWeight += weight;
        });
        const rawScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
        // Fix C: floor score at 1 for clients with matched articles but no threat signal yet
        // (tier-3 may not have run; client still has coverage worth showing as stable)
        const score = rawScore > 0 ? rawScore : 1;
        const counts = {};
        matched.forEach(a => { const t = a.signalType || 'background'; counts[t] = (counts[t]||0)+1; });
        const dominant = Object.entries(counts).sort((x,y)=>y[1]-x[1])[0]?.[0] || 'background';
        scores[name] = {
            score,
            level: score >= 81 ? 'critical' : score >= 61 ? 'elevated' : score >= 31 ? 'watch' : 'stable',
            emoji: score >= 81 ? '🔴' : score >= 61 ? '🟠' : score >= 31 ? '🟡' : '🟢',
            signalCount: matched.length,
            dominantType: dominant
        };
    });
    return scores;
}

function renderClientRisk() {
    const section = document.getElementById('client-risk-section');
    const list = document.getElementById('client-risk-list');
    const countEl = document.getElementById('client-risk-count');
    if (!section || !list) return;

    const scores = calculateClientRiskScores();
    const sorted = Object.entries(scores)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 10);

    if (sorted.length === 0) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');
    if (countEl) countEl.textContent = sorted.length;

    list.innerHTML = sorted.map(([name, data]) => `
        <div class="client-risk-row">
            <span class="client-risk-level">${data.emoji}</span>
            <span class="client-risk-name">${escapeHtml(name)}</span>
            <span class="client-risk-type">${data.dominantType}</span>
            <span class="client-risk-count">${data.signalCount} signal${data.signalCount !== 1 ? 's' : ''}</span>
            <button class="btn btn-sm btn-secondary" onclick="app.openMeetingBrief('${escapeHtml(name)}')">📋 Brief</button>
        </div>
    `).join('');
    updateSectionTimestamp('client-risk', Date.now(), false);
}

// Initialize app
const app = new SignalApp();

// Debug: verify app loaded
console.log('📡 App created:', typeof app.refresh, typeof app.openSettings);

// Expose to global scope for onclick handlers
window.app = app;

// Expose all interactive methods for onclick handlers
// These ensure onclick="methodName()" works reliably across all browsers
window.refreshApp = function() { app.refresh(); };
window.openAppSettings = function() { app.openSettings(); };
window.copyAllMarketBriefs = function() { app.copyAllMarketBriefs(); };
window.exportBrief = function() { app.exportBrief(); };
window.openGTMDigest = function() { app.openGTMDigest(); };
window.deepReadArticle = function(id, btn) { app.deepReadArticle(id, btn); };
window.openArticle = function(id) { app.openArticle(id); };
window.rateArticle = function(id, rating, event) { app.rateArticle(id, rating, event); };
window.openMeetingBrief = function(name) { app.openMeetingBrief(name); };
window.setIndustryTier = function(i, tier) { app.setIndustryTier(i, tier); };
window.enableSource = function(url) { app.enableSource(url); };
window.removeDisabledSource = function(url) { app.removeDisabledSource(url); };
window.enableAllSources = function() { app.enableAllSources(); };
window.copyStarter = function(i) { app.copyStarter(i); };

// New globals from UX enhancement sprints
window.openWeekContextEditor = openWeekContextEditor;
window.closeWeekContextEditor = closeWeekContextEditor;
window.saveWeekContext = saveWeekContext;
window.switchSettingsTab = switchSettingsTab;
window.copyActionRequired = copyActionRequired;
window.copyExecutiveSummary = copyExecutiveSummary;
window.copyDeepReads = copyDeepReads;

// Signal Feed filters (Phase 2)
window.filterByClient = filterByClient;
window.filterBySignalType = filterBySignalType;
window.switchMarket = switchMarket;
window.toggleSignalFeedItem = toggleSignalFeedItem;
window.toggleSignalCategory = toggleSignalCategory;
window.showMoreInCategory = showMoreInCategory;
window.openBriefATL = openBriefATL;
