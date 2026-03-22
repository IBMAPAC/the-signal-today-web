// =============================================
// Cache Manager - IndexedDB Persistent Caching
// Phase 1 Improvement: Task 1.2
// =============================================

/**
 * CacheManager
 * 
 * Manages persistent caching of article analysis results using IndexedDB.
 * Features:
 * - 7-day TTL (Time To Live) for cached entries
 * - Automatic cleanup of expired entries
 * - Cache statistics tracking
 * - Fallback to in-memory cache if IndexedDB unavailable
 * 
 * Expected Benefits:
 * - 80% faster page reloads
 * - Instant results for recently analyzed articles
 * - Reduced API costs by avoiding re-analysis
 */
class CacheManager {
    constructor(dbName = 'SignalWebCache', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.memoryCache = new Map(); // Fallback for browsers without IndexedDB
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            deletes: 0,
            errors: 0
        };
        
        // TTL: 7 days in milliseconds
        this.TTL = 7 * 24 * 60 * 60 * 1000;
        
        this.initDB();
    }
    
    /**
     * Initialize IndexedDB connection
     * Creates object store if it doesn't exist
     */
    async initDB() {
        if (!window.indexedDB) {
            console.warn('IndexedDB not available, using memory cache fallback');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                this.stats.errors++;
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                
                // Clean up expired entries on startup
                this.cleanupExpired();
                
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for analysis cache
                if (!db.objectStoreNames.contains('analysisCache')) {
                    const objectStore = db.createObjectStore('analysisCache', { keyPath: 'key' });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                    objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
                }
            };
        });
    }
    
    /**
     * Generate cache key from article
     * 
     * @param {Object} article - Article object
     * @returns {string} Cache key
     */
    generateKey(article) {
        return `article_${article.id}_${article.publishedDate}`;
    }
    
    /**
     * Get cached analysis result
     * 
     * @param {string} key - Cache key
     * @returns {Promise<Object|null>} Cached result or null
     */
    async get(key) {
        // Try IndexedDB first
        if (this.db) {
            try {
                const result = await this._getFromDB(key);
                if (result) {
                    // Check if expired
                    if (Date.now() > result.expiresAt) {
                        await this.delete(key);
                        this.stats.misses++;
                        return null;
                    }
                    this.stats.hits++;
                    return result.data;
                }
            } catch (error) {
                console.error('IndexedDB get error:', error);
                this.stats.errors++;
            }
        }
        
        // Fallback to memory cache
        if (this.memoryCache.has(key)) {
            const cached = this.memoryCache.get(key);
            if (Date.now() > cached.expiresAt) {
                this.memoryCache.delete(key);
                this.stats.misses++;
                return null;
            }
            this.stats.hits++;
            return cached.data;
        }
        
        this.stats.misses++;
        return null;
    }
    
    /**
     * Store analysis result in cache
     * 
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     * @returns {Promise<boolean>} Success status
     */
    async set(key, data, ttl = this.TTL) {
        const timestamp = Date.now();
        const expiresAt = timestamp + ttl;
        
        const cacheEntry = {
            key,
            data,
            timestamp,
            expiresAt
        };
        
        // Try IndexedDB first
        if (this.db) {
            try {
                await this._setInDB(cacheEntry);
                this.stats.writes++;
                return true;
            } catch (error) {
                console.error('IndexedDB set error:', error);
                this.stats.errors++;
            }
        }
        
        // Fallback to memory cache
        this.memoryCache.set(key, cacheEntry);
        this.stats.writes++;
        return true;
    }
    
    /**
     * Delete cached entry
     * 
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        // Delete from IndexedDB
        if (this.db) {
            try {
                await this._deleteFromDB(key);
                this.stats.deletes++;
            } catch (error) {
                console.error('IndexedDB delete error:', error);
                this.stats.errors++;
            }
        }
        
        // Delete from memory cache
        this.memoryCache.delete(key);
        return true;
    }
    
    /**
     * Clear all cached entries
     * 
     * @returns {Promise<boolean>} Success status
     */
    async clear() {
        // Clear IndexedDB
        if (this.db) {
            try {
                await this._clearDB();
            } catch (error) {
                console.error('IndexedDB clear error:', error);
                this.stats.errors++;
            }
        }
        
        // Clear memory cache
        this.memoryCache.clear();
        
        // Reset stats
        this.stats = {
            hits: 0,
            misses: 0,
            writes: 0,
            deletes: 0,
            errors: 0
        };
        
        return true;
    }
    
    /**
     * Clean up expired entries
     * Runs automatically on startup and can be called manually
     * 
     * @returns {Promise<number>} Number of entries deleted
     */
    async cleanupExpired() {
        if (!this.db) return 0;
        
        try {
            const transaction = this.db.transaction(['analysisCache'], 'readwrite');
            const objectStore = transaction.objectStore('analysisCache');
            const index = objectStore.index('expiresAt');
            
            const now = Date.now();
            const range = IDBKeyRange.upperBound(now);
            const request = index.openCursor(range);
            
            let deletedCount = 0;
            
            return new Promise((resolve, reject) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        deletedCount++;
                        cursor.continue();
                    } else {
                        console.log(`Cleaned up ${deletedCount} expired cache entries`);
                        resolve(deletedCount);
                    }
                };
                
                request.onerror = () => {
                    console.error('Cleanup error:', request.error);
                    this.stats.errors++;
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Cleanup error:', error);
            this.stats.errors++;
            return 0;
        }
    }
    
    /**
     * Get cache statistics
     * 
     * @returns {Object} Cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(1) : 0;
        
        return {
            ...this.stats,
            total,
            hitRate: `${hitRate}%`,
            memorySize: this.memoryCache.size
        };
    }
    
    /**
     * Get cache size (number of entries)
     * 
     * @returns {Promise<number>} Number of cached entries
     */
    async getSize() {
        if (!this.db) return this.memoryCache.size;
        
        try {
            const transaction = this.db.transaction(['analysisCache'], 'readonly');
            const objectStore = transaction.objectStore('analysisCache');
            const request = objectStore.count();
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => {
                    this.stats.errors++;
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('Get size error:', error);
            this.stats.errors++;
            return this.memoryCache.size;
        }
    }
    
    // ========================================
    // Private IndexedDB Helper Methods
    // ========================================
    
    _getFromDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['analysisCache'], 'readonly');
            const objectStore = transaction.objectStore('analysisCache');
            const request = objectStore.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    _setInDB(cacheEntry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['analysisCache'], 'readwrite');
            const objectStore = transaction.objectStore('analysisCache');
            const request = objectStore.put(cacheEntry);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    _deleteFromDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['analysisCache'], 'readwrite');
            const objectStore = transaction.objectStore('analysisCache');
            const request = objectStore.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    _clearDB() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['analysisCache'], 'readwrite');
            const objectStore = transaction.objectStore('analysisCache');
            const request = objectStore.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
}

// Made with Bob
