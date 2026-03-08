// =============================================
// The Signal Today - Database Layer
// IndexedDB persistence with localStorage fallback
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

    // Load all digests (for trend detection)
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

// =============================================
// Storage Constants
// =============================================

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
    ARTICLE_RATINGS: 'signal_article_ratings',
    SOURCE_SCORE_DRIFT: 'signal_score_drift'
};

// =============================================
// Utility Functions
// =============================================

// Escape HTML entities to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

// Feed cache to avoid refetching within 2 minutes
const feedCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// CORS proxy fallback chain
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
];

// Made with Bob
