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

const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
];

// Feed cache to avoid refetching within 2 minutes (short enough to stay fresh)
const feedCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
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
    SOURCE_SCORE_DRIFT: 'signal_score_drift'      // Accumulated score drift per source
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
            const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
            if (apiKey && typeof HybridIntelligenceEngine !== 'undefined') {
                this.intelligenceEngine = new HybridIntelligenceEngine(apiKey);
                console.log('🧠 Hybrid Intelligence Engine initialized');
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
            if (this.digest || this.articles.length > 0) {
                // Re-score articles to ensure matchedClients/matchedIndustries are set
                // (articles from older IDB versions may not have these properties)
                if (this.articles.length > 0) {
                    console.log(`Re-scoring ${this.articles.length} cached articles for client matching...`);
                    this.articles = await this.scoreArticles(this.articles);
                }
                this.categorizeArticles();
                this.renderDigest();
                updateIntelligenceStats();
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
        const exportBtn = document.getElementById('export-btn');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportBrief());
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
                case 'Escape':
                    e.preventDefault();
                    if (articleModal && !articleModal.classList.contains('hidden')) {
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
            ['1', 'Switch to Daily tab'],
            ['2', 'Switch to Weekly tab'],
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
    }

    // ==========================================
    // UI Updates
    // ==========================================

    updateUI() {
        this.updateDate();
        this.updateReadingTime();
        this.updateLastRefreshed();
        this.updateSourceHealthBadge();
    }

    updateSourceHealthBadge() {
        const badge = document.getElementById('source-health-badge');
        if (!badge) return;
        const count = this.failedSources.length;
        if (count === 0) {
            badge.classList.add('hidden');
            badge.removeAttribute('title');
            return;
        }
        badge.classList.remove('hidden');
        badge.textContent = `⚠️ ${count} source${count > 1 ? 's' : ''} failed`;
        const names = this.failedSources.map(s => `• ${s.name}`).join('\n');
        badge.title = `Failed to fetch:\n${names}`;
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
        document.getElementById('digest-content').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('refresh-btn').disabled = true;
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('refresh-btn').disabled = false;
    }

    showError(message) {
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('error-message').textContent = message;
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
            
            // Generate AI digest if API key available (skip in quick mode)
            const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
            if (apiKey && !quickMode) {
                // Phase 7: compute article fingerprint to detect new articles since last digest
                const fingerprint = this.computeArticleFingerprint(this.dailyArticles);
                const cachedFingerprint = this.digest?.articleFingerprint;
                const cachedContext = this.digest?.thisWeekContext;
                const contextChanged = this.settings.thisWeekContext !== (cachedContext || '');

                if (cachedFingerprint && fingerprint === cachedFingerprint && !contextChanged) {
                    // No new articles and context unchanged — reuse cached digest
                    console.log('💾 Digest cache hit — no new articles, skipping API call');
                    this.showLoading('✅ Digest up to date (no new articles)');
                    // digest already loaded from IDB in init(); nothing to do
                } else {
                    // Identify new articles not seen in the last digest
                    const cachedIds = new Set(this.digest?.seenArticleIds || []);
                    const newArticles = this.dailyArticles.filter(a => !cachedIds.has(a.id));
                    const newCount = newArticles.length;

                    if (cachedFingerprint && newCount > 0 && newCount < 8 && !contextChanged) {
                        // Delta mode: only a few new articles — merge into existing digest
                        console.log(`🔄 Delta refresh: ${newCount} new articles → merging into existing digest`);
                        this.showLoading(`Updating digest with ${newCount} new articles...`);
                        await this.mergeDeltaDigest(apiKey, newArticles);
                    } else {
                        // Full regeneration: first run, many new articles, or context changed
                        console.log(`🤖 Full digest generation (${newCount} new articles, contextChanged=${contextChanged})`);
                        this.showLoading('Generating AI-powered digest...');
                        await this.generateAIDigest(apiKey);
                    }
                }
            } else {
                this.digest = this.createBasicDigest();
            }
            
            // Save and render (forceRefresh = true to regenerate AI synthesis)
            localStorage.setItem(STORAGE_KEYS.LAST_REFRESH, new Date().toISOString());
            this.saveToStorage();
            this.renderDigest(true);
            this.updateUI();
            
            const totalTime = Math.round(performance.now() - startTime);
            console.log(`✅ Refresh completed in ${totalTime}ms`);
            
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
        const articles = [];
        const batchSize = 15; // Parallel batch size for speed
        const fetchTimeout = 10000; // 10 second timeout (generous for slow feeds)
        
        // Process in parallel batches
        for (let i = 0; i < sources.length; i += batchSize) {
            const batch = sources.slice(i, i + batchSize);
            
            // Fetch all in batch simultaneously with timeout
            const results = await Promise.allSettled(
                batch.map(source => this.fetchFeedWithTimeout(source, fetchTimeout))
            );
            
            // Collect successful results
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    articles.push(...result.value);
                }
            }
            
            // Update progress
            const progress = Math.min(100, Math.round((i + batchSize) / sources.length * 100));
            this.showLoading(`Fetching feeds... ${progress}% (${articles.length} articles)`);
        }
        
        return articles;
    }

    async fetchFeedWithTimeout(source, timeout) {
        // Check if source is auto-disabled
        const failures = this.getSourceFailures();
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
        
        // Try all proxies in parallel, use first successful response
        const fetchPromises = CORS_PROXIES.map(async (proxy) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(proxy + encodeURIComponent(source.url), {
                    headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const text = await response.text();
                return this.parseFeed(text, source);
            } catch (error) {
                clearTimeout(timeoutId);
                throw error; // Let Promise.any handle it
            }
        });
        
        try {
            // Promise.any returns first successful result
            const articles = await Promise.any(fetchPromises);
            
            // ✅ Success - reset failure count
            this.resetSourceFailure(source.url);
            
            // Cache successful result
            feedCache.set(cacheKey, { articles, timestamp: Date.now() });
            
            return articles;
        } catch (error) {
            // All proxies failed — record for source health badge
            console.warn(`❌ All proxies failed for ${source.name}`);
            
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
    // Deduplication
    // ==========================================
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
        
        // Run intelligence analysis if engine available
        console.log(`🧠 Analyzing ${articles.length} articles with Hybrid Intelligence...`);
        const analyzedArticles = [];
        
        // PERFORMANCE OPTIMIZATION: Process articles in parallel batches instead of sequentially
        // This provides 3-5x speedup (10s → 2-3s for 200 articles)
        const BATCH_SIZE = 20; // Process 20 articles simultaneously
        const startTime = performance.now();
        
        for (let i = 0; i < articles.length; i += BATCH_SIZE) {
            const batch = articles.slice(i, i + BATCH_SIZE);
            
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
            const progress = Math.min(100, Math.round((i + BATCH_SIZE) / articles.length * 100));
            this.showLoading(`Analyzing articles... ${progress}% (${analyzedArticles.length}/${articles.length})`);
        }
        
        const analysisTime = Math.round(performance.now() - startTime);
        console.log(`⚡ Intelligence analysis completed in ${analysisTime}ms (${Math.round(articles.length / (analysisTime / 1000))} articles/sec)`);
        
        // Get intelligence stats
        if (this.intelligenceEngine) {
            this.intelligenceStats = this.intelligenceEngine.getStats();
            console.log('📊 Intelligence Stats:', this.intelligenceStats);
        }
        
        return analyzedArticles.map(article => {
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

    detectAllClients(text) {
        // Return all matched client names for an article.
        // Works with both structured objects {name, tier, aliases} and legacy strings.
        // Uses word boundary matching to avoid false positives
        // e.g., "SK" shouldn't match "risk", "ANZ" shouldn't match "organization"
        const matches = [];
        const textLower = text.toLowerCase();
        
        for (const clientEntry of this.clients) {
            const clientName = typeof clientEntry === 'string' ? clientEntry : clientEntry.name;
            const aliases = (typeof clientEntry === 'object' && clientEntry.aliases) ? clientEntry.aliases : [];
            
            // Check main name and all aliases
            const namesToCheck = [clientName, ...aliases];
            let isMatch = false;
            
            for (const name of namesToCheck) {
                const nameLower = name.toLowerCase();
                
                if (name.length <= 3) {
                    // Short names need exact word boundary
                    const regex = new RegExp(`\\b${this.escapeRegex(nameLower)}\\b`, 'i');
                    if (regex.test(textLower)) {
                        isMatch = true;
                        break;
                    }
                } else {
                    // Longer names just need word start boundary
                    const regex = new RegExp(`\\b${this.escapeRegex(nameLower)}`, 'i');
                    if (regex.test(textLower)) {
                        isMatch = true;
                        break;
                    }
                }
            }
            
            if (isMatch && !matches.includes(clientName)) {
                matches.push(clientName);
            }
        }
        
        return matches;
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    detectCrossReferences(articles) {
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
            const matchingArticles = articles.filter(a => {
                const text = `${a.title} ${a.summary}`.toLowerCase();
                return keywords.some(kw => text.includes(kw));
            });
            
            const uniqueSources = [...new Set(matchingArticles.map(m => m.sourceName))];
            
            if (uniqueSources.length >= 2) {
                topicGroups.push({
                    theme: theme,
                    keywords: keywords,
                    sourceCount: uniqueSources.length,
                    sources: uniqueSources.slice(0, 4),
                    articles: matchingArticles.slice(0, 5),
                    articleIds: matchingArticles.map(m => m.id)
                });
            }
        }
        
        const sorted = topicGroups.sort((a, b) => b.sourceCount - a.sourceCount);
        
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

        const deltaPrompt = `You are the intelligence briefer for the Field CTO of IBM Asia Pacific.
${contextBlock}
EXISTING DIGEST (generated earlier today):
Executive Summary: ${this.digest.executiveSummary}

NEW ARTICLES SINCE LAST DIGEST (${newArticles.length} articles):
${newArticleList}

TASK: Update the existing digest to incorporate the new articles.
- If a new article adds a significant new signal, update executiveSummary and the relevant section
- If a new article matches a watchlist client, surface it in executiveSummary
- Keep all existing content that is still valid
- Add new conversationStarters only if the new articles provide genuinely new talking points
- Apply the same [AI WAVE] / [SOVEREIGNTY WAVE] tagging and citation rules as the original digest
- Return ONLY valid JSON with the same structure as the original digest

Return ONLY valid JSON, no markdown fences:
{
    "executiveSummary": "Updated 3-4 sentences incorporating new signals",
    "sections": [same structure as original, updated where relevant],
    "conversationStarters": [updated list, max 3],
    "industrySignals": [updated list, omit industries with no signal]
}`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 2000,
                    messages: [{ role: 'user', content: deltaPrompt }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.content[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const updated = JSON.parse(jsonMatch[0]);
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
            } else {
                throw new Error('Could not parse delta merge response');
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

        const prompt = `You are the intelligence briefer for the Field CTO of IBM Asia Pacific.
${contextBlock}
YOUR JOB IS NOT TO SUMMARIZE NEWS. Answer these four questions:
1. What should I BRING UP in client meetings today?
2. What COMPETITIVE THREAT requires immediate attention?
3. What REGULATORY CHANGE affects my clients?
4. What OPPORTUNITY should I act on this week?

ROLE CONTEXT:
- You lead 115 Account Technical Leaders (ATLs) across 343 enterprise accounts in Asia Pacific (excluding Japan)
- Dual-wave thesis: every insight belongs to either the AI/Agentic wave OR the Sovereignty/Regulation wave
- Tag EVERY insight as [AI WAVE] or [SOVEREIGNTY WAVE] — this routes it to the right conversation
- Priority industries: Financial Services, Government, Manufacturing, Energy, Retail
- Competitors: Microsoft Azure, AWS, Google Cloud, Salesforce, SAP, Oracle, ServiceNow, Databricks, Snowflake

CITATION RULES (strictly enforced):
1. ALWAYS cite with the actual source name: [MIT Tech Review](https://...)
2. NEVER use generic "Source" — use the real source name from the article list
3. Every factual claim needs a citation

FRAMING RULES (strictly enforced):
1. Frame EVERY insight as an ACTION, not information
2. BAD: "Microsoft announced new Azure AI services"
3. GOOD: "[AI WAVE] COMPETITIVE ALERT: Microsoft's Azure AI Foundry [Azure Blog](url) now offers
   on-premises deployment — directly challenges IBM's hybrid cloud positioning. ACTION: Lead with
   watsonx.ai's enterprise governance in your next ${sampleClients} conversation."

CLIENT INTELLIGENCE RULES:
- Articles tagged with a Client name are watchlist client signals
- For Tier 1 clients (${tier1ClientList}):
  flag their signals explicitly in executiveSummary or the relevant section
- If thisWeekContext mentions a client by name, that client's signals are MEETING PREP —
  surface them first in executiveSummary
- When a client article reveals a broader industry pattern, reference it in the
  corresponding industrySignals entry as evidence (e.g. "${sampleClient}'s AI announcement signals...")

INDUSTRY SIGNALS RULES:
- Scan today's articles for each Tier 1 industry: Financial Services, Government, Manufacturing, Energy, Retail
- Only produce an industrySignals entry if today's articles contain a relevant signal
- Omit industries with no relevant signal — do not produce filler
- If a watchlist client article is the evidence for an industry signal, name the client in the headline
- salesAction must name a specific client account where possible

SECTION RULES:
- Only include a section if today's articles contain at least one relevant signal
- Omit sections with no content — do not produce generic filler
- Produce EXACTLY 3 conversationStarters — no more, no fewer
- Do NOT include readingTimeMinutes in any section

Return ONLY valid JSON, no markdown fences:
{
    "executiveSummary": "3-4 ACTION-ORIENTED sentences. Tag each [AI WAVE] or [SOVEREIGNTY WAVE]. Cite sources. If thisWeekContext mentions a client meeting, lead with that signal.",
    "sections": [
        {
            "title": "Competitive Alerts",
            "emoji": "🚨",
            "summary": "Competitive threats with [Source Name](URL) citations. Tag [AI WAVE] or [SOVEREIGNTY WAVE]."
        },
        {
            "title": "Industry Opportunities",
            "emoji": "💰",
            "summary": "Opportunities with [Source Name](URL) citations. Tag [AI WAVE] or [SOVEREIGNTY WAVE]."
        },
        {
            "title": "Regulatory Watch",
            "emoji": "🛡️",
            "summary": "Regulatory updates with [Source Name](URL) citations. Tag [SOVEREIGNTY WAVE]."
        },
        {
            "title": "AI & Agentic",
            "emoji": "🤖",
            "summary": "AI developments with [Source Name](URL) citations. Tag [AI WAVE]."
        }
    ],
    "conversationStarters": [
        "Exactly 3 starters. Each must cite a source and demonstrate a point of view, not just a headline."
    ],
    "industrySignals": [
        {
            "industry": "Financial Services",
            "emoji": "🏦",
            "headline": "One-sentence signal grounded in today's articles. Name a client if one was matched.",
            "ibmAngle": "Specific IBM product: watsonx.ai / watsonx.governance / IBM Consulting / Red Hat OpenShift / IBM Security / IBM Z / hybrid cloud.",
            "salesAction": "Specific action for an ATL this week. Name a client account if relevant."
        }
    ]
}

Articles:
${articleList}`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 3000,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.content[0].text;
            
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
        // PHASE 2 LAYOUT:
        // 0. Action Required — Urgent ESCALATE/BRIEF_ATL items at top
        // 1. Today's Brief — 3 key insights (AI-synthesized)
        // 2. Signal Feed — Unified view (replaces Client Radar + All Signals)
        // 3. ATL Enablement — Market briefs (collapsed)
        // 4. Deep Reads — Weekend reading (collapsed)
        
        // Generate signals first (async), then extract Action Required and build Signal Feed
        renderTodaysSignals(forceRefresh).then(() => {
            renderActionRequired();
            renderSignalFeed();
        });
        
        // These can render in parallel
        renderExecutiveSummary(forceRefresh);
        renderATLEnablement(forceRefresh);
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
            'more','than','than','just','also','now','all','one','two','three',
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
            
            return `
                <div class="client-group">
                    <div class="client-name-row">
                        ${tierLabel}
                        <span class="client-name">${this.escapeHtml(clientName)}</span>
                        <span class="signal-type-badge ${badge.cssClass}">${badge.emoji} ${badge.label}</span>
                        <button class="btn-meeting-brief" onclick="openMeetingBrief('${safeClientName}')" title="Meeting Brief">📋</button>
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
        
        // Show/hide Deep Read button based on API key availability
        const hasApiKey = !!localStorage.getItem(STORAGE_KEYS.API_KEY);
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
            alert('Article not found. Please refresh and try again.');
            return;
        }
        
        const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        if (!apiKey) {
            alert('Please add your API key in Settings to use this feature.');
            return;
        }
        
        // Find the parent deep-read-item and create/find the analysis container
        let container;
        if (buttonEl) {
            const deepReadItem = buttonEl.closest('.deep-read-item');
            if (deepReadItem) {
                container = deepReadItem.querySelector('.deep-read-analysis');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'deep-read-analysis';
                    deepReadItem.appendChild(container);
                }
                // Disable button while loading
                buttonEl.disabled = true;
                buttonEl.textContent = '⏳ Generating...';
            }
        }
        
        if (!container) {
            console.error('Could not find container for analysis');
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
Turn this article into a 60-second strategic brief that answers: "What does this mean for IBM APAC, and what should I do about it today?"

ARTICLE
Title: ${article.title}
Source: ${article.sourceName || article.source} (Category: ${article.category || 'General'})
Summary: ${article.summary || 'No summary available'}
${clientContext}
${industryContext}
${signalContext}${weekContext}

FIELD DEFINITIONS:
- keyFacts: 3 facts extracted directly from the article. One sentence each. No interpretation.
- soWhat: The market-level shift this article signals. Why does this matter RIGHT NOW in APAC? Be specific about timing, geography, or competitive dynamics. Do NOT mention IBM here — this is about what is changing in the market.
- ibmAngle: Which specific IBM capability is most relevant (watsonx.ai, watsonx.governance, IBM Consulting, Red Hat OpenShift, IBM Security, IBM Z, hybrid cloud), and why is NOW the right moment to position it?
- clientImplication: Answer TWO questions in one field: (1) If watchlist clients were matched above, does this article reveal a broader industry trend the Field CTO should know before their next meeting with that client? (2) What should the ATL aligned to that client do with this information this week? If no clients matched, describe the APAC enterprise type most affected.
- competitiveWatch: Name any competitor (AWS, Azure, Google, Salesforce, SAP, Oracle, ServiceNow, Accenture, TCS, Alibaba Cloud, Huawei Cloud, Fujitsu) whose position is strengthened or weakened. Return empty string if genuinely not applicable.
- conversationOpener: A question that demonstrates you have a point of view — not just that you read the headline. Frame as a hypothesis: "I've been thinking that [observation from this article] — is that consistent with what you're seeing?" Peer CTO tone. Not a sales pitch.

Return ONLY valid JSON, no markdown fences:
{
    "keyFacts": ["string", "string", "string"],
    "soWhat": "string",
    "ibmAngle": "string",
    "clientImplication": "string",
    "competitiveWatch": "string",
    "conversationOpener": "string"
}`;
        
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 800,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const data = await response.json();
            const text = data.content[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
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
                buttonEl.textContent = '🤖 Generate Deep Analysis';
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
        const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
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
        
        // Gather articles mentioning this client
        const clientArticles = this.dailyArticles.filter(a => {
            const text = `${a.title} ${a.summary}`.toLowerCase();
            const clientLower = clientName.toLowerCase();
            if (clientName.length <= 3) {
                return new RegExp(`\\b${this.escapeRegex(clientLower)}\\b`, 'i').test(text);
            }
            return new RegExp(`\\b${this.escapeRegex(clientLower)}`, 'i').test(text);
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
        const isMeetingThisWeek = !!(this.settings.thisWeekContext &&
            this.settings.thisWeekContext.toLowerCase().includes(clientName.toLowerCase()));
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
Brief purpose: ${briefPurpose}
${contextBlock}${industryBlock}
Recent news about ${clientName}:
${articleList || 'No recent news found.'}

BRIEF RULES:
- If LIVE MEETING BRIEF: lead with the most time-sensitive signal; frame talking points as what to say in the room today
- If ATL ENABLEMENT BRIEF: frame talking points as intelligence the ATL can use in their next client touchpoint or QBR
- talkingPoints: produce EXACTLY 3 points, each framed as a ${clientIndustry || 'enterprise'} challenge with a specific IBM product angle (watsonx.ai, watsonx.governance, IBM Consulting, Red Hat OpenShift, IBM Security, IBM Z, hybrid cloud)
- riskFlags: specific risks only — reputational issues, known competitor relationships, regulatory exposure, C-suite changes, or deal blockers. Omit array if none.
- openingQuestion: frame as a hypothesis to test, not an open-ended probe. Style: "I've been thinking that [observation from the news] — is that consistent with what you're seeing?" Peer CTO tone, not a sales pitch.
- salesAngle: name a specific IBM product AND a specific trigger (regulatory deadline, competitor move, or client news) that makes NOW the right time
- atlNote: one sentence the ATL aligned to ${clientName} should know — what to watch for or act on this week, even if the Field CTO is not personally meeting the client
- slackMessage: under 280 characters total

Return ONLY valid JSON, no markdown fences:
{
    "situationSummary": "2-3 sentences on ${clientName}'s current situation.",
    "talkingPoints": ["Exactly 3 points. Each: ${clientIndustry || 'enterprise'} challenge + specific IBM product angle.", "Point 2.", "Point 3."],
    "riskFlags": ["Specific risk only — reputational, competitive, regulatory, C-suite, or deal blocker. Omit array if none."],
    "openingQuestion": "Hypothesis-framed. Peer CTO tone. Not a sales pitch.",
    "salesAngle": "Specific IBM product + specific trigger for why now.",
    "atlNote": "One sentence for the ATL aligned to ${clientName} — what to watch for or act on this week.",
    "slackMessage": "*${clientName} — Signal Alert*\\n📊 [1-sentence situation]\\n💡 [top talking point]\\n⚡ [sales angle]\\n💬 Q: [opening question]"
}`;
        
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1100,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const data = await response.json();
            const text = data.content[0].text;
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
                    ${brief.salesAngle ? `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">⚡ Sales Angle</div>
                        <div class="meeting-brief-text meeting-brief-sales-angle">${this.escapeHtml(brief.salesAngle)}</div>
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
        
        // ATL Enablement by Market
        lines.push('## 📢 ATL ENABLEMENT');
        lines.push('');
        lines.push('*Copy-ready briefs for Slack/Teams by market*');
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

    copyAllATLBriefs() {
        const briefs = document.querySelectorAll('.atl-brief-content');
        if (briefs.length === 0) {
            showToast('No ATL briefs to copy');
            return;
        }
        
        const allText = Array.from(briefs).map(el => el.textContent.trim()).join('\n\n---\n\n');
        navigator.clipboard.writeText(allText).then(() => {
            showToast('All ATL briefs copied to clipboard');
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
        const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
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
                'Dual-Wave Thesis: AI/Agentic Transformation + Sovereignty/Regulation',
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

        const prompt = `Write a weekly intelligence email FROM the IBM APAC Field CTO TO the 115 Account Technical Leaders (ATLs) across the 5 APAC markets.

ROLE CONTEXT:
- You ARE the Field CTO leading 115 ATLs who directly engage 343 enterprise accounts
- Markets: ANZ (Australia/NZ), ASEAN (SG/MY/TH/ID/PH), GCG (HK/TW/China), ISA (India/South Asia), KOREA
- Each ATL manages 2-3 clients and works in a "cockpit model" with their Technical Sales Leader (TSL)
- Strategic goal: Increase IBM's share of client technology spend by earning "Client CTO" posture
- Dual-wave thesis: AI/Agentic transformation (Wave 1) + Sovereignty/Regulation (Wave 2)

VOICE & TONE:
- Write in first person as the Field CTO addressing your ATL team
- Be direct, action-oriented, and confident but not arrogant
- Sound like a senior technical leader, not a corporate communications team
- Use conversational language — "Here's what I'm seeing..." not "The following observations..."

FORMAT RULES:
- Plain text only. No markdown, no bullet symbols, no HTML.
- Use ALL CAPS for section headers.
- Use dashes for list items.
- Keep it scannable — busy ATLs need to grasp the key points in 60 seconds.
${weekContextBlock}
ESCALATION & BRIEFING ITEMS (action required):
${escalationBlock}

CLIENT SIGNALS BY MARKET (Tier 1 & 2 accounts):
${marketSignalBlock}

COMPETITIVE LANDSCAPE:
${competitiveBlock}

TOP ARTICLES THIS WEEK:
${topArticleList || 'No articles available.'}

Produce EXACTLY this structure (plain text, no markdown):

Subject: IBM APAC Field CTO — Weekly ATL Intelligence Brief | ${date}

WHAT TO LEAD WITH THIS WEEK

[2-3 sentences maximum. State the single IBM message ATLs should lead with this week. Tag it [AI WAVE] or [SOVEREIGNTY WAVE]. Be specific about the call to action.]

ESCALATION ITEMS

[If there are ESCALATE signals: For each one, write the client/market and exactly what the ATL should do. If none, write "No escalation items this week — but stay close to your Tier 1s."]

ACTION ITEMS BY MARKET

[For each market with signals, write:]

[MARKET NAME]
- [Client name]: [One sentence on the signal and what the ATL should do THIS WEEK. Be specific.]
- [Continue for each client signal in that market. Max 3 per market.]

[If a market has no signals, skip it entirely.]

COMPETITIVE WATCH

[2-3 sentences on competitive threats or positioning opportunities. Name specific competitors (Microsoft, AWS, Accenture, etc.) and the IBM counter-position. Reference specific IBM solutions (watsonx.ai, watsonx.governance, Red Hat OpenShift, IBM Consulting).]

ATL TALKING POINTS

[Exactly 3 conversational one-liners ATLs can use with client CTOs this week. These should sound like what a peer CTO would say, not what a sales rep would pitch. Each should be max 25 words.]

1. [Talking point about AI/Agentic wave]
2. [Talking point about Sovereignty/Regulation wave]
3. [Talking point connecting to IBM's strategic positioning]

IBM POSITIONING THIS WEEK

[1-2 sentences on which IBM solutions to emphasize and why. Connect to the week's signals.]

CALL TO ACTION

[1-2 specific actions for ALL ATLs to take this week. Be concrete: name the IBM asset to review, the conversation type to have, or the follow-up to schedule. Start with verbs.]

TOP READS

[List 3-5 articles with title and URL, one per line. After each, add ONE sentence on why an ATL should care — what conversation does it enable?]`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1800,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            const text = data.content[0].text;

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
        // Populate settings
        document.getElementById('api-key').value = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
        
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
    }

    renderIntelligenceStatsInSettings() {
        const container = document.getElementById('settings-intelligence-stats');
        if (!container) return;
        
        const stats = this.intelligenceEngine?.getStats();
        if (!stats) {
            container.innerHTML = '<p class="form-hint">Intelligence engine not initialized</p>';
            return;
        }
        
        // Use actual stats properties with safe defaults
        const tier3Cost = stats.tier3Cost || 0;
        const tier1Processed = stats.tier1Processed || 0;
        const tier2Processed = stats.tier2Processed || 0;
        const tier3Processed = stats.tier3Processed || 0;
        
        const costFormatted = tier3Cost < 0.01 ? '<$0.01' : `$${tier3Cost.toFixed(2)}`;
        const avgCostPerArticle = tier3Processed > 0
            ? `$${(tier3Cost / tier3Processed).toFixed(4)}`
            : '$0.00';
        
        // Calculate pass rates
        const tier1PassRate = tier1Processed > 0
            ? `${Math.round((tier2Processed / tier1Processed) * 100)}%`
            : 'N/A';
        const tier2PassRate = tier2Processed > 0
            ? `${Math.round((tier3Processed / tier2Processed) * 100)}%`
            : 'N/A';
        
        container.innerHTML = `
            <div class="intelligence-stats-grid">
                <div class="stat-item">
                    <div class="stat-label">Total Articles Analyzed</div>
                    <div class="stat-value">${tier1Processed}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Tier 1 → Tier 2 Pass Rate</div>
                    <div class="stat-value">${tier1PassRate}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Tier 2 Analyzed</div>
                    <div class="stat-value">${tier2Processed}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Tier 2 → Tier 3 Pass Rate</div>
                    <div class="stat-value">${tier2PassRate}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Tier 3 (Semantic)</div>
                    <div class="stat-value">${tier3Processed}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Total API Cost</div>
                    <div class="stat-value">${costFormatted}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Avg Cost/Article (T3)</div>
                    <div class="stat-value">${avgCostPerArticle}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Last Reset</div>
                    <div class="stat-value">${stats.lastReset ? new Date(stats.lastReset).toLocaleDateString() : 'N/A'}</div>
                </div>
            </div>
            <p class="form-hint" style="margin-top: 12px;">
                📊 Tier 1 filters all articles with keywords. Tier 2 analyzes context for relevant ones. Tier 3 uses Claude API for high-priority articles (~$0.0002 each).
            </p>
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

function toggleSection(sectionId) {
    const content = document.getElementById(`${sectionId}-content`);
    const chevron = document.querySelector(`#${sectionId}-section .chevron`);
    
    content.classList.toggle('collapsed');
    chevron?.classList.toggle('collapsed');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function saveSettings() {
    const apiKey = document.getElementById('api-key').value.trim();

    // Save API key to localStorage (NOTE: stored unencrypted - user was warned in Settings UI)
    if (apiKey) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    } else {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
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
    
    closeSettings();
    app.updateUI();
    
    // Re-render to apply any context changes
    if (app.articles.length > 0) {
        app.renderDigest();
        updateIntelligenceStats();
    }
    
    console.log('✅ Settings saved');
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

function clearAllData() {
    if (confirm('Clear all data? This cannot be undone.')) {
        localStorage.clear();
        location.reload();
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
    document.querySelectorAll('.digest-btn').forEach(btn => {
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
    app.selectedClients.forEach(idx => {
        if (app.clients[idx]) app.clients[idx].tier = tier;
    });
    app.saveToStorage();
    app.selectedClients.clear();
    document.getElementById('cm-select-all').checked = false;
    updateBulkActionsVisibility();
    renderClientTable();
    showToast(`Updated ${app.selectedClients.size} clients to Tier ${tier}`);
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
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    
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
    
    const articleSummaries = clientArticles.slice(0, 5).map(a => 
        `- "${a.title}" (${a.source}): ${a.summary || 'No summary'}`
    ).join('\n');
    
    const prompt = `You are helping a Field CTO brief their Account Technical Leader (ATL) about a client. Generate a concise Slack message.

Client: ${clientName}
Market: ${client.market}
Industry: ${client.industry || 'N/A'}
ATL: ${client.atl || 'Not assigned'}

Recent articles:
${articleSummaries}

Write a brief Slack message (max 150 words) that:
1. Summarizes the key signal(s) about this client
2. Suggests an IBM angle or conversation starter
3. Recommends a specific action for the ATL

Format for Slack (use emoji sparingly). Start with "🔔 Client Signal: ${clientName}"`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 500,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        const data = await response.json();
        const briefText = data.content?.[0]?.text || 'Failed to generate brief';
        
        contentEl.innerHTML = `<div class="brief-atl-slack">${escapeHtml(briefText)}</div>`;
        app.lastBriefATLText = briefText;
        
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

function renderATLEnablement(forceRefresh = false) {
    const list = document.getElementById('atl-enablement-list');
    if (!list) return;
    
    // Check cache first
    const STORAGE_KEY_ATL = 'signal-today-atl-enablement-cache';
    if (!forceRefresh) {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_ATL);
            if (cached) {
                const { briefs, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                if (age < 8 * 60 * 60 * 1000 && briefs && briefs.length > 0) {
                    list.innerHTML = briefs.map(renderATLBriefCard).join('');
                    return;
                }
            }
        } catch (e) {
            console.log('ATL enablement cache error:', e);
        }
    }
    
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
    
    // Step 1: Detect market-specific signals using APAC_MARKET_CONTEXT
    if (typeof APAC_MARKET_CONTEXT !== 'undefined') {
        todayArticles.forEach(article => {
            const text = `${article.title} ${article.summary || ''}`.toLowerCase();
            
            Object.entries(APAC_MARKET_CONTEXT).forEach(([market, context]) => {
                if (!marketSignals[market]) return;
                
                // Check regulators (highest priority)
                const matchedRegulator = context.regulators?.find(r => text.includes(r.toLowerCase()));
                if (matchedRegulator) {
                    if (!marketSignals[market].some(s => s.article?.id === article.id)) {
                        marketSignals[market].push({
                            type: 'regulatory',
                            signal: matchedRegulator.toUpperCase(),
                            article,
                            priority: 1
                        });
                    }
                    return;
                }
                
                // Check countries/cities (geographic routing)
                const matchedCountry = context.countries?.find(c => text.includes(c.toLowerCase()));
                if (matchedCountry) {
                    if (!marketSignals[market].some(s => s.article?.id === article.id)) {
                        marketSignals[market].push({
                            type: 'geographic',
                            signal: matchedCountry,
                            article,
                            priority: 1.5
                        });
                    }
                    return;
                }
                
                // Check priorities
                const matchedPriority = context.priorities?.find(p => text.includes(p.toLowerCase()));
                if (matchedPriority) {
                    if (!marketSignals[market].some(s => s.article?.id === article.id)) {
                        marketSignals[market].push({
                            type: 'priority',
                            signal: matchedPriority,
                            article,
                            priority: 2
                        });
                    }
                    return;
                }
                
                // Check watchwords
                const matchedWatchword = context.watchwords?.find(w => text.includes(w.toLowerCase()));
                if (matchedWatchword) {
                    if (!marketSignals[market].some(s => s.article?.id === article.id)) {
                        marketSignals[market].push({
                            type: 'watchword',
                            signal: matchedWatchword,
                            article,
                            priority: 3
                        });
                    }
                }
            });
        });
    }
    
    // Step 2: Add client-specific signals
    todayArticles.forEach(article => {
        if (!article.matchedClients || article.matchedClients.length === 0) return;
        
        article.matchedClients.forEach(clientName => {
            const client = app.clients.find(c => c.name === clientName);
            if (client && marketSignals[client.market]) {
                if (!marketSignals[client.market].some(s => s.article?.id === article.id)) {
                    marketSignals[client.market].push({
                        type: 'client',
                        signal: clientName,
                        clientTier: client.tier,
                        article,
                        priority: 0
                    });
                }
            }
        });
    });
    
    // Step 3: Sort by priority
    Object.keys(marketSignals).forEach(market => {
        marketSignals[market].sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            if (a.clientTier && b.clientTier) return a.clientTier - b.clientTier;
            return 0;
        });
    });
    
    // Filter to markets with signals
    const activeMarkets = Object.entries(marketSignals)
        .filter(([_, signals]) => signals.length > 0)
        .map(([market, signals]) => ({ market, signals: signals.slice(0, 5) }));
    
    if (activeMarkets.length === 0) {
        list.innerHTML = '<p class="card-description">No market signals today. Click Refresh to fetch latest articles.</p>';
        return;
    }
    
    // Check for API key
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    
    if (!apiKey) {
        // Without API: Show article list with sources
        const briefs = activeMarkets.map(({ market, signals }) => ({
            market,
            synthesis: `${signals.length} signals detected for ${market} market today.`,
            sources: signals.map(s => ({
                title: s.article.title,
                url: s.article.url,
                source: s.article.source || s.article.sourceName
            })),
            copyText: generateATLCopyText(market, signals)
        }));
        
        list.innerHTML = briefs.map(renderATLBriefCard).join('');
        cacheATLEnablement(briefs);
        return;
    }
    
    // With API: Generate AI synthesis per market
    list.innerHTML = '<p class="card-description">Synthesizing ATL briefs...</p>';
    generateATLSynthesis(activeMarkets, apiKey, list);
}

async function generateATLSynthesis(activeMarkets, apiKey, listEl) {
    const briefs = [];
    
    for (const { market, signals } of activeMarkets) {
        const articleSummaries = signals.map((s, i) => {
            const a = s.article;
            return `[${i + 1}] "${a.title}" (${a.source || a.sourceName})\nType: ${s.type}, Signal: ${s.signal}\nSummary: ${(a.summary || '').substring(0, 100)}`;
        }).join('\n\n');
        
        const prompt = `You are briefing ATLs (Account Technical Leaders) in ${market} market for IBM APAC.

TODAY'S ${market} SIGNALS:
${articleSummaries}

Write ONE synthesized paragraph (3-4 sentences) that:
1. Opens with the key theme for ${market} this week
2. Connects 2-3 of the articles into a coherent narrative
3. Ends with a specific IBM positioning or action point

Rules:
- Sound like a senior technical leader, not a news aggregator
- Reference specific companies/regulators mentioned
- Include ONE actionable takeaway

Return ONLY a JSON object:
{
  "synthesis": "Your 3-4 sentence synthesis here",
  "keyMessage": "One-line key message for ATL to remember"
}`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 300,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            
            const data = await response.json();
            const text = data.content?.[0]?.text || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                briefs.push({
                    market,
                    synthesis: result.synthesis,
                    keyMessage: result.keyMessage,
                    sources: signals.map(s => ({
                        title: s.article.title,
                        url: s.article.url,
                        source: s.article.source || s.article.sourceName
                    })),
                    copyText: generateATLCopyText(market, signals, result.synthesis, result.keyMessage)
                });
            } else {
                // Fallback
                briefs.push({
                    market,
                    synthesis: `${signals.length} signals detected for ${market} market.`,
                    sources: signals.map(s => ({
                        title: s.article.title,
                        url: s.article.url,
                        source: s.article.source || s.article.sourceName
                    })),
                    copyText: generateATLCopyText(market, signals)
                });
            }
        } catch (error) {
            console.error(`ATL synthesis error for ${market}:`, error);
            briefs.push({
                market,
                synthesis: `${signals.length} signals detected for ${market} market. Review sources below.`,
                sources: signals.map(s => ({
                    title: s.article.title,
                    url: s.article.url,
                    source: s.article.source || s.article.sourceName
                })),
                copyText: generateATLCopyText(market, signals)
            });
        }
    }
    
    listEl.innerHTML = briefs.map(renderATLBriefCard).join('');
    cacheATLEnablement(briefs);
}

function generateATLCopyText(market, signals, synthesis = null, keyMessage = null) {
    const date = new Date().toLocaleDateString('en-SG', { weekday: 'short', month: 'short', day: 'numeric' });
    let text = `📡 The Signal Today | ${market} | ${date}\n\n`;
    
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

function renderATLBriefCard(brief) {
    const sourcesHtml = (brief.sources || []).map(s => 
        `<a href="${s.url || '#'}" target="_blank" class="atl-source-link">${escapeHtml(s.title)}</a> <span class="atl-source-name">(${escapeHtml(s.source || 'Source')})</span>`
    ).join('<br>');
    
    return `
        <div class="atl-brief" data-copy-text="${escapeHtml(brief.copyText || '')}">
            <div class="atl-brief-header">
                <span class="atl-brief-market">${brief.market}</span>
                <span class="atl-brief-count">${brief.sources?.length || 0} signals</span>
                <button class="atl-brief-copy" onclick="copyATLBrief(this, '${brief.market}')" title="Copy to clipboard">📋</button>
            </div>
            <div class="atl-brief-synthesis">${escapeHtml(brief.synthesis || '')}</div>
            ${brief.keyMessage ? `<div class="atl-brief-key-message">💡 <strong>Key Message:</strong> ${escapeHtml(brief.keyMessage)}</div>` : ''}
            <div class="atl-brief-sources">
                <span class="atl-sources-label">Sources:</span>
                ${sourcesHtml}
            </div>
        </div>
    `;
}

function cacheATLEnablement(briefs) {
    try {
        localStorage.setItem('signal-today-atl-enablement-cache', JSON.stringify({
            briefs,
            timestamp: Date.now()
        }));
    } catch (e) {
        console.log('ATL enablement cache write error:', e);
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
    const ibmKeywords = ['ibm', 'watsonx', 'watson', 'red hat', 'openshift', 'ansible', 'instana', 'qradar', 'turbonomic', 'apptio'];
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

function copyATLBrief(btn, market) {
    const brief = btn.closest('.atl-brief');
    const content = brief.dataset.copyText || brief.querySelector('.atl-brief-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
        btn.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = '📋';
            btn.classList.remove('copied');
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
                const { insights, timestamp } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                if (age < 8 * 60 * 60 * 1000 && insights && insights.length > 0) {
                    list.innerHTML = insights.map(renderExecutiveInsight).join('');
                    content.querySelector('.executive-summary-intro')?.classList.add('hidden');
                    return;
                }
            }
        } catch (e) {
            console.log('Exec summary cache error:', e);
        }
    }
    
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    const todayArticles = app.dailyArticles.length > 0 ? app.dailyArticles : app.articles.slice(0, 30);
    
    if (todayArticles.length === 0) {
        list.innerHTML = '<p class="card-description">No articles yet. Click Refresh to fetch.</p>';
        return;
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
        cacheExecutiveSummary(insights);
        return;
    }
    
    // With API: Generate AI-synthesized insights
    content.querySelector('.executive-summary-intro')?.classList.remove('hidden');
    content.querySelector('.executive-summary-intro').textContent = 'Synthesizing executive insights...';
    
    const articleSummaries = topArticles.slice(0, 12).map((a, i) => 
        `[${i + 1}] "${a.title}" (${a.source || a.sourceName})\nSignal: ${a.signalType || 'general'}, Clients: ${(a.matchedClients || []).join(', ') || 'none'}\nSummary: ${(a.summary || '').substring(0, 150)}`
    ).join('\n\n');
    
    const trendContext = weeklyTrends.length > 0 
        ? `\nWEEKLY TRENDS:\n${weeklyTrends.map(t => `- ${t.theme}: ${t.direction} (${t.change})`).join('\n')}`
        : '';
    
    const prompt = `You are the intelligence analyst for the IBM APAC Field CTO who leads 115 ATLs across 343 accounts in 5 markets (ANZ, ASEAN, GCG, ISA, Korea).

TODAY'S TOP ARTICLES:
${articleSummaries}
${trendContext}

Generate EXACTLY 3 executive insights. Each insight must:
1. Synthesize multiple articles into ONE actionable insight
2. Answer "So what does this mean for IBM APAC?"
3. Include specific action or positioning recommendation

Return JSON array:
[
  {
    "headline": "Sharp, memorable headline (8 words max)",
    "synthesis": "2-3 sentences synthesizing the insight. What's happening, why it matters for IBM APAC, and what to do about it.",
    "signalType": "risk" | "opportunity" | "competitive" | "regulatory",
    "sourceIndices": [1, 3, 5]
  }
]

Rules:
- Each insight must reference at least 2 articles (use their [index] numbers)
- One insight should be about competitive positioning
- One insight should be actionable this week
- Be specific about APAC markets when relevant

Return ONLY valid JSON array.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 800,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
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
            
            cacheExecutiveSummary(insights);
            list.innerHTML = insights.map(renderExecutiveInsight).join('');
            content.querySelector('.executive-summary-intro')?.classList.add('hidden');
        } else {
            throw new Error('Could not parse AI response');
        }
    } catch (error) {
        console.error('Executive summary error:', error);
        // Fallback to keyword-based
        const insights = generateKeywordBasedInsights(topArticles, weeklyTrends);
        list.innerHTML = insights.map(renderExecutiveInsight).join('');
        content.querySelector('.executive-summary-intro')?.classList.add('hidden');
        cacheExecutiveSummary(insights);
    }
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
    
    // Insight 1: Top risk or regulatory signal
    const riskArticles = [...byType.risk, ...byType.regulatory].slice(0, 3);
    if (riskArticles.length > 0) {
        insights.push({
            headline: 'Regulatory & Risk Signals',
            synthesis: `${riskArticles.length} articles signal regulatory or risk themes today. Review for client exposure and IBM positioning opportunities.`,
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
        insights.push({
            headline: 'Competitive Movement',
            synthesis: `${compArticles.length} competitive signals detected. Monitor for IBM counter-positioning opportunities in affected accounts.`,
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
        insights.push({
            headline: 'Growth Opportunities',
            synthesis: `${oppArticles.length} opportunity signals identified. Brief relevant ATLs for proactive outreach this week.`,
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
            insights.push({
                headline: 'Additional Signals',
                synthesis: `${remaining.length} additional signals worth monitoring for emerging trends.`,
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
    
    return `
        <div class="executive-insight ${typeClass}">
            <div class="executive-insight-header">
                <span class="executive-insight-type">${typeEmoji}</span>
                <span class="executive-insight-headline">${escapeHtml(insight.headline)}</span>
            </div>
            <div class="executive-insight-synthesis">${escapeHtml(insight.synthesis)}</div>
            <div class="executive-insight-sources">
                <span class="executive-sources-label">Sources:</span>
                ${sourcesHtml}
            </div>
        </div>
    `;
}

function cacheExecutiveSummary(insights) {
    try {
        localStorage.setItem(STORAGE_KEY_EXEC_SUMMARY, JSON.stringify({
            insights,
            timestamp: Date.now()
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
    const list = document.getElementById('signals-list');
    const introEl = document.getElementById('signals-intro');
    const countEl = document.getElementById('signals-count');
    if (!list) return;
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
        try {
            const cached = localStorage.getItem(STORAGE_KEYS.TODAYS_SIGNALS);
            if (cached) {
                const { signals, timestamp, articlesData } = JSON.parse(cached);
                const age = Date.now() - timestamp;
                // Show cached if less than 8 hours old and has content
                if (age < 8 * 60 * 60 * 1000 && signals && signals.length > 0) {
                    countEl.textContent = signals.length;
                    introEl.textContent = `${signals.length} actionable signals (${formatTimeAgo(timestamp)})`;
                    list.innerHTML = signals.map((s, i) => renderCachedSignal(s, articlesData?.[i])).join('');
                    return;
                }
            }
        } catch (e) {
            console.log('Signal cache read error:', e);
        }
    }
    
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    
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
        introEl.textContent = 'Click Refresh to generate signals.';
        list.innerHTML = '<p class="card-description">No signals yet. Click Refresh to fetch latest news and generate actionable intelligence.</p>';
        return;
    }
    
    // Without API key: render basic signals with article context
    if (!apiKey) {
        introEl.textContent = `${rawSignals.length} signals detected. Add API key for AI synthesis.`;
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
    introEl.textContent = 'Synthesizing actionable intelligence...';
    
    // Include more context in the prompt
    const signalSummaries = rawSignals.slice(0, 5).map(s => {
        const summary = s.summary || s.articles?.[0]?.summary || '';
        const context = summary ? `\n  Context: ${summary.substring(0, 150)}` : '';
        return `- ${s.headline} (${s.sources.join(', ')})${s.clients.length > 0 ? ` [Clients: ${s.clients.join(', ')}]` : ''}${context}`;
    }).join('\n\n');
    
    const tier1Clients = app.clients.filter(c => c.tier === 1).map(c => c.name).slice(0, 10).join(', ');
    
    // Identify which markets have signals
    const marketsInSignals = [...new Set(rawSignals.flatMap(s => 
        (s.clients || []).map(clientName => {
            const client = app.clients.find(c => c.name === clientName);
            return client?.market || null;
        }).filter(Boolean)
    ))];
    
    const prompt = `You are the strategic intelligence briefer for the IBM APAC Field CTO who leads 115 Account Technical Leaders (ATLs) across 343 enterprise accounts in 5 markets: ANZ, ASEAN, GCG, ISA, and KOREA.

TODAY'S RAW SIGNALS:
${signalSummaries}

FIELD CTO CONTEXT:
- Tier 1 clients (highest priority): ${tier1Clients || 'See watchlist'}
- Markets with signals today: ${marketsInSignals.length > 0 ? marketsInSignals.join(', ') : 'All markets'}
- Dual-wave thesis: AI/Agentic transformation + Sovereignty/Regulation pressure
- Goal: Increase IBM's share of client technology spend by earning "Client CTO" posture

ACTION TYPE DEFINITIONS (use these exact values):
- "ESCALATE" = Contact TSL/client executive within 48 hours (C-suite change, competitive threat, major deal signal)
- "BRIEF_ATL" = Prepare talking points for ATL team in affected market (industry trend, regulatory change)
- "POSITION" = Develop IBM response/counter-positioning (competitor announcement, market shift)
- "MONITOR" = Track for pattern/escalation (early signal, emerging trend)

For each signal, provide a JSON array with EXACTLY this structure:
[
  {
    "headline": "Action-oriented headline (10 words max, lead with verb)",
    "context": "2-3 sentences: What happened, who is affected, why it matters for APAC enterprise clients",
    "wave": "AI" or "SOVEREIGNTY" or "COMPETITIVE",
    "actionType": "ESCALATE" or "BRIEF_ATL" or "POSITION" or "MONITOR",
    "action": "Specific action for Field CTO (who to contact, what to prepare, by when)",
    "affectedMarkets": ["ANZ", "ASEAN", "GCG", "ISA", "KOREA"] — which markets this impacts,
    "ibmAngle": "Specific IBM solution to position: watsonx.ai, watsonx.governance, watsonx.data, Red Hat OpenShift, IBM Consulting, QRadar, Instana, etc.",
    "talkingPoint": "One sentence the ATL can use with client CTO (conversational, not salesy)",
    "competitive": "Competitor name if relevant (Microsoft, AWS, Google, Accenture, etc.) or null"
  }
]

QUALITY RULES:
- Headlines must start with action verb (Brief, Alert, Position, Monitor, Prepare)
- Actions must be specific (name a role, give a timeframe, specify a deliverable)
- Talking points must sound human, not corporate — something you'd actually say to a CTO peer
- IBM angles must map to real IBM products/services, not generic capabilities

Return ONLY valid JSON array, no markdown, max 5 signals, ordered by urgency (ESCALATE first).`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1200,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            const synthesized = JSON.parse(jsonMatch[0]);
            introEl.textContent = `${synthesized.length} actionable signals for today`;
            
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
        introEl.textContent = `${rawSignals.length} signals (AI synthesis unavailable)`;
        list.innerHTML = rawSignals.slice(0, 5).map(signal => renderBasicSignal(signal)).join('');
    }
}

function cacheSignals(signals, rawSignals) {
    try {
        const articlesData = rawSignals.map(s => ({
            articles: (s.articles || []).map(a => ({ id: a.id, source: a.source, url: a.url, title: a.title }))
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
// ACTION REQUIRED - Urgent items at top
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
    
    // Filter for urgent action types: ESCALATE and BRIEF_ATL
    const urgentSignals = signals
        .map((signal, idx) => ({ signal, articleData: articlesData[idx] }))
        .filter(({ signal }) => signal.actionType === 'ESCALATE' || signal.actionType === 'BRIEF_ATL');
    
    if (urgentSignals.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    countEl.textContent = urgentSignals.length;
    
    list.innerHTML = urgentSignals.map(({ signal, articleData }) => {
        const articles = articleData?.articles || [];
        const sourcesHtml = articles.length > 0
            ? articles.map(a => `<a class="action-source-link" href="${a.url || '#'}" target="_blank">${escapeHtml(a.title)}</a> <span class="action-source-name">(${escapeHtml(a.source || 'Source')})</span>`).join('<br>')
            : '';
        
        const isEscalate = signal.actionType === 'ESCALATE';
        const icon = isEscalate ? '🚨' : '📢';
        const label = isEscalate ? 'ESCALATE' : 'BRIEF ATL';
        const cssClass = isEscalate ? 'action-escalate' : 'action-brief';
        
        // Markets affected
        const marketsHtml = (signal.affectedMarkets || []).length > 0
            ? signal.affectedMarkets.map(m => `<span class="action-market-tag">${m}</span>`).join(' ')
            : '';
        
        return `
            <div class="action-required-item ${cssClass}">
                <div class="action-required-header">
                    <span class="action-required-badge ${cssClass}">${icon} ${label}</span>
                    ${marketsHtml}
                </div>
                <div class="action-required-headline">${escapeHtml(signal.headline)}</div>
                <div class="action-required-context">${escapeHtml(signal.context || '')}</div>
                <div class="action-required-action">
                    <strong>→ Action:</strong> ${escapeHtml(signal.action || '')}
                </div>
                ${signal.talkingPoint ? `<div class="action-required-talking-point"><strong>💬</strong> "${escapeHtml(signal.talkingPoint)}"</div>` : ''}
                <div class="action-required-ibm"><strong>IBM:</strong> ${escapeHtml(signal.ibmAngle || '')}</div>
                ${sourcesHtml ? `<div class="action-required-sources">${sourcesHtml}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ==========================================
// UNIFIED SIGNAL FEED - Phase 2
// ==========================================

// Global filter state for Signal Feed
let signalFeedFilters = {
    market: 'ALL',
    client: 'ALL',
    signalType: 'ALL'
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
    
    // Render grouped view
    // All categories collapsed by default, expand only when specific signal type is filtered
    const expandedCategory = signalFeedFilters.signalType !== 'ALL'
        ? (signalFeedFilters.signalType === 'general' ? 'information' : signalFeedFilters.signalType)
        : null;
    
    list.innerHTML = categories.map(cat => {
        const articles = grouped[cat.key];
        if (articles.length === 0) return '';
        
        // Only expand if this specific category is filtered
        const isExpanded = expandedCategory === cat.key;
        const topArticles = articles.slice(0, 5); // Show max 5 per category initially
        const hasMore = articles.length > 5;
        
        return `
            <div class="signal-category ${isExpanded ? 'expanded' : ''}" data-category="${cat.key}">
                <div class="signal-category-header" onclick="toggleSignalCategory('${cat.key}')">
                    <span class="signal-category-emoji">${cat.emoji}</span>
                    <span class="signal-category-label">${cat.label}</span>
                    <span class="signal-category-count">${articles.length}</span>
                    <span class="signal-category-chevron">${isExpanded ? '▲' : '▼'}</span>
                </div>
                <div class="signal-category-body">
                    <div class="signal-category-items">
                        ${topArticles.map(article => renderSignalFeedItem(article)).join('')}
                    </div>
                    ${hasMore ? `
                        <div class="signal-category-more">
                            <button class="signal-category-show-more" onclick="showMoreInCategory('${cat.key}')">
                                Show ${articles.length - 5} more ${cat.label.toLowerCase()} signals
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
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
    
    // Action tag if applicable
    const actionTag = article.actionType 
        ? `<span class="signal-feed-tag action action-${article.actionType === 'ESCALATE' ? 'escalate' : 'brief'}">${article.actionType === 'ESCALATE' ? '🚨 ESCALATE' : '📢 BRIEF ATL'}</span>`
        : '';
    
    // Summary text (prefer context from signal synthesis)
    const summaryText = article.context || article.summary || '';
    
    // Build details section (initially hidden)
    const hasDetails = article.ibmAngle || article.talkingPoint || article.action;
    const detailsHtml = hasDetails ? `
        <div class="signal-feed-details">
            ${article.action ? `
                <div class="signal-feed-detail-row">
                    <span class="signal-feed-detail-label">Action</span>
                    <div class="signal-feed-detail-text">${escapeHtml(article.action)}</div>
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
    
    return `
        <div class="signal-feed-item signal-${article.signalType}" data-article-id="${article.id}">
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
            
            ${article.intelligence?.reasoning ? `<div class="signal-intelligence-reasoning"><strong>Analysis:</strong> ${escapeHtml(article.intelligence.reasoning)}</div>` : ''}
            
            ${article.intelligence?.actionableInsights?.length > 0 ? `
                <div class="signal-intelligence-actions">
                    <strong>Actions:</strong>
                    <ul>
                        ${article.intelligence.actionableInsights.map(insight =>
                            `<li>${escapeHtml(insight)}</li>`
                        ).join('')}
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
                    ${article.matchedClients.length > 0 ? `<button class="btn btn-sm btn-brief-atl" onclick="openBriefATL('${escapeHtml(article.matchedClients[0].name)}')">📤 Brief ATL</button>` : ''}
                </div>
            ` : article.matchedClients.length > 0 ? `
                <div class="signal-feed-actions">
                    <button class="btn btn-sm btn-brief-atl" onclick="openBriefATL('${escapeHtml(article.matchedClients[0].name)}')">📤 Brief ATL</button>
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
function updateIntelligenceStats() {
    const statsContainer = document.getElementById('intelligence-stats');
    if (!statsContainer) return;
    
    // Get intelligence engine stats
    const stats = app.intelligenceEngine?.getStats();
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
    
    const isExpanded = category.classList.toggle('expanded');
    const chevron = category.querySelector('.signal-category-chevron');
    if (chevron) {
        chevron.textContent = isExpanded ? '▲' : '▼';
    }
}

function showMoreInCategory(categoryKey) {
    // Get all articles for this category from signalFeedArticles
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
                // Show cached if less than 24 hours old (strategic content has longer shelf life)
                if (age < 24 * 60 * 60 * 1000 && insights && insights.length > 0) {
                    countEl.textContent = insights.length;
                    list.innerHTML = insights.map((insight, idx) => 
                        renderCachedDeepRead(insight, articlesData?.[idx])
                    ).join('');
                    return;
                }
            }
        } catch (e) {
            console.log('Deep reads cache read error:', e);
        }
    }
    
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    
    // Select deep read candidates: strategic sources, analyst content, thought leadership
    // RULE: Pulls from weeklyArticles (7-14 day lookback) for strategic, longer-form content
    const strategicCategories = ['Strategic Perspectives', 'Architecture & Platform'];
    const strategicSources = ['a16z', 'Benedict Evans', 'Stratechery', 'MIT Technology Review', 'Harvard Business Review'];
    
    // Prioritize: 1) Strategic category, 2) High credibility, 3) Longer content
    let candidates = app.weeklyArticles.length > 0 
        ? app.weeklyArticles 
        : app.articles.filter(a => {
            const isStrategic = strategicCategories.includes(a.category);
            const isAnalyst = strategicSources.some(s => a.source?.includes(s));
            const isHighValue = (a.relevanceScore || 0) > 60;
            return isStrategic || isAnalyst || isHighValue;
        });
    
    // Sort by strategic value (category weight + credibility)
    candidates = candidates.slice(0, 8);
    
    countEl.textContent = Math.min(candidates.length, 5);
    
    if (candidates.length === 0) {
        list.innerHTML = '<p class="card-description">No strategic content this week. Click Refresh to fetch latest articles.</p>';
        return;
    }
    
    // Without API key: render basic list and cache it
    if (!apiKey) {
        const basicInsights = candidates.slice(0, 5).map(a => ({
            title: a.title,
            source: a.source,
            summary: a.summary || '',
            timeHorizon: 'TBD'
        }));
        cacheDeepReads(basicInsights, candidates.slice(0, 5));
        list.innerHTML = candidates.slice(0, 5).map(article => renderBasicDeepRead(article)).join('');
        return;
    }
    
    // With API key: generate strategic synthesis
    list.innerHTML = '<p class="card-description">Synthesizing strategic insights...</p>';
    
    const articleSummaries = candidates.slice(0, 5).map((a, i) => 
        `[${i + 1}] "${a.title}" (${a.source})\nSummary: ${a.summary?.substring(0, 200) || 'No summary'}`
    ).join('\n\n');
    
    const prompt = `You are preparing a strategic reading brief for the IBM APAC Field CTO who leads 115 ATLs across 343 enterprise accounts.

These are long-form articles for strategic thinking — content to internalize for CxO conversations, board discussions, and quarterly business reviews.

ARTICLES:
${articleSummaries}

FIELD CTO CONTEXT:
- Needs perspectives that elevate conversations from tactical to strategic
- Must translate technology trends into business impact for CFOs and CEOs
- Responsible for ATL team development — needs content that builds team capability
- Dual-wave focus: AI/Agentic transformation + Sovereignty/Regulation pressure

For each article, provide a JSON array with this structure:
[
  {
    "title": "Original article title",
    "strategicThesis": "The big idea in one powerful sentence — what market shift does this signal? (Think: 'The mainframe moment for AI governance' or 'Sovereignty becomes the new security')",
    "leadershipImplication": "What this means for technology leaders — the 'so what' for a CTO or CIO making investment decisions",
    "cxoQuestion": "A provocative question for CxO discussion (e.g., 'What happens to your AI strategy when your cloud provider becomes your competitor?')",
    "timeHorizon": "6 months" or "12 months" or "2-3 years"
  }
]

QUALITY RULES:
- Strategic thesis must be memorable and quotable — something worth repeating in a keynote
- Leadership implication must be concrete and actionable — not generic advice
- CxO questions must be genuinely thought-provoking, not leading or sales-y

Return ONLY valid JSON array, no markdown. Max 5 articles.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1200,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            const synthesized = JSON.parse(jsonMatch[0]);
            
            // Cache the synthesized insights with article data
            cacheDeepReads(synthesized, candidates.slice(0, 5));
            
            list.innerHTML = synthesized.map((insight, idx) => {
                const article = candidates[idx];
                if (!article) return '';
                
                return renderSynthesizedDeepRead(insight, article);
            }).join('');
        } else {
            throw new Error('No valid JSON in response');
        }
    } catch (err) {
        console.error('Deep read synthesis error:', err);
        list.innerHTML = candidates.slice(0, 5).map(article => renderBasicDeepRead(article)).join('');
    }
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
}

function renderSynthesizedDeepRead(insight, article) {
    return `
        <div class="deep-read-item" onclick="openArticle('${article.id || ''}')">
            <div class="deep-read-item-header">
                <a class="deep-read-item-source" href="${article.url || '#'}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(article.source)}</a>
                <span class="deep-read-item-time">${escapeHtml(insight.timeHorizon)} horizon</span>
            </div>
            <div class="deep-read-item-title">${escapeHtml(insight.title)}</div>
            <div class="deep-read-strategic">
                <div class="deep-read-thesis"><strong>💡 Strategic Thesis:</strong> ${escapeHtml(insight.strategicThesis)}</div>
                <div class="deep-read-implication"><strong>📊 Leadership Implication:</strong> ${escapeHtml(insight.leadershipImplication || '')}</div>
                <div class="deep-read-question"><strong>🎯 CxO Question:</strong> "${escapeHtml(insight.cxoQuestion || '')}"</div>
            </div>
            <div class="deep-read-item-action">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.deepReadArticle('${article.id || ''}', this)">🤖 Generate Deep Analysis</button>
            </div>
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
                <div class="deep-read-implication"><strong>📊 Leadership Implication:</strong> ${escapeHtml(insight.leadershipImplication || '')}</div>
                <div class="deep-read-question"><strong>🎯 CxO Question:</strong> "${escapeHtml(insight.cxoQuestion || '')}"</div>
            </div>
            ` : `<div class="deep-read-item-summary">${escapeHtml(insight.summary || article.summary || '')}</div>`}
            <div class="deep-read-item-action">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); app.deepReadArticle('${articleId}', this)">🤖 Generate Deep Analysis</button>
            </div>
        </div>
    `;
}

function renderBasicDeepRead(article) {
    return `
        <div class="deep-read-item" onclick="openArticle('${article.id || ''}')">
            <div class="deep-read-item-header">
                <a class="deep-read-item-source" href="${article.url || '#'}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(article.source)}</a>
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
window.copyAllATLBriefs = function() { app.copyAllATLBriefs(); };
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

// Signal Feed filters (Phase 2)
window.filterByClient = filterByClient;
window.filterBySignalType = filterBySignalType;
window.switchMarket = switchMarket;
window.toggleSignalFeedItem = toggleSignalFeedItem;
window.toggleSignalCategory = toggleSignalCategory;
window.showMoreInCategory = showMoreInCategory;
window.openBriefATL = openBriefATL;
