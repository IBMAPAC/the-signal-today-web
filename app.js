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
    LAST_REFRESH: 'signal_last_refresh',
    TREND_HISTORY: 'signal_trend_history',
    ARTICLE_RATINGS: 'signal_article_ratings',   // Per-article 👍/👎 feedback
    SOURCE_SCORE_DRIFT: 'signal_score_drift'      // Accumulated score drift per source
    // INSTAPAPER_EMAIL and INSTAPAPER_PASSWORD removed: storing passwords in localStorage
    // exposes them to XSS and was transmitted via third-party CORS proxies in plaintext.
    // Instapaper integration now uses the bookmarklet URL only (no credentials needed).
};

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
            weeklyCurrencyDays: 7,   // Used for weekly article cutoff window
            thisWeekContext: '',      // Current meetings/deals context for Claude
            autoRefreshTime: '',      // e.g. "06:30" for 6:30 AM auto-refresh
            keyboardShortcuts: true   // Enable/disable keyboard shortcuts
        };
        this.isLoading = false;
        this.currentTab = 'daily';
        this.crossRefs = []; // Cached cross-reference results to avoid recomputation
        this.focusedArticleIndex = -1; // For keyboard navigation
        this.autoRefreshTimer = null;
        this.articleRatings = {};   // { articleId: 1 (👍) | -1 (👎) }
        this.sourceScoreDrift = {}; // { sourceName: delta } — accumulated from ratings
        this.failedSources = [];    // Sources that failed to fetch in the last refresh
        this.debugMode = new URLSearchParams(location.search).get('debug') === '1';
        this.db = new SignalDB();   // IndexedDB persistence layer (Phase 5)
        
        this.init();
    }

    async init() {
        // Open IndexedDB first (non-blocking fallback if unavailable)
        await this.db.open();

        // Load settings, sources, clients, industries, ratings, drift from localStorage
        this.loadFromStorage();

        // Migrate any articles still in localStorage → IDB (one-time)
        await this.db.migrateFromLocalStorage();

        // Load rolling article corpus from IDB (up to 7 days)
        const idbArticles = await this.db.loadArticles();
        if (idbArticles.length > 0) {
            // Merge IDB articles with any already loaded from localStorage
            // (after migration localStorage articles are gone, but guard anyway)
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
            this.categorizeArticles();
            this.renderDigest();
        }
        
        console.log(`📡 The Signal Today initialized with ${this.sources.length} sources`);
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
        
        // Load clients — migrate legacy flat string array to structured objects
        const savedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
        if (savedClients) {
            const parsed = JSON.parse(savedClients);
            // Migration: if stored as flat strings, convert to objects
            if (parsed.length > 0 && typeof parsed[0] === 'string') {
                this.clients = parsed.map(name => ({ name, tier: 2, country: '' }));
            } else {
                this.clients = parsed;
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
        document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
        
        const exportBtn = document.getElementById('export-btn');
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
            const anyModalOpen = !document.getElementById('settings-modal').classList.contains('hidden') ||
                                 !document.getElementById('article-modal').classList.contains('hidden') ||
                                 !(document.getElementById('meeting-brief-modal')?.classList.contains('hidden') ?? true);
            
            switch (e.key) {
                case 'r':
                case 'R':
                    if (!anyModalOpen) { e.preventDefault(); this.refresh(); }
                    break;
                case '1':
                    if (!anyModalOpen) { e.preventDefault(); switchDigestTab('daily'); }
                    break;
                case '2':
                    if (!anyModalOpen) { e.preventDefault(); switchDigestTab('weekly'); }
                    break;
                case 'j':
                case 'J':
                    if (!anyModalOpen) { e.preventDefault(); this.navigateArticles(1); }
                    break;
                case 'k':
                case 'K':
                    if (!anyModalOpen) { e.preventDefault(); this.navigateArticles(-1); }
                    break;
                case 'o':
                case 'O':
                    if (!anyModalOpen && this.focusedArticleIndex >= 0) {
                        e.preventDefault();
                        const articles = this.currentTab === 'daily' ? this.dailyArticles : this.weeklyArticles;
                        const article = articles[this.focusedArticleIndex];
                        if (article) this.openArticle(article.id);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    if (!document.getElementById('article-modal').classList.contains('hidden')) {
                        closeArticle();
                    } else if (!document.getElementById('settings-modal').classList.contains('hidden')) {
                        closeSettings();
                    } else if (document.getElementById('meeting-brief-modal') &&
                               !document.getElementById('meeting-brief-modal').classList.contains('hidden')) {
                        closeMeetingBrief();
                    }
                    break;
                case '?':
                    if (!anyModalOpen) { e.preventDefault(); this.showKeyboardHelp(); }
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
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', options);
    }

    updateReadingTime() {
        const totalMinutes = this.dailyArticles
            .filter(a => !a.isRead)
            .reduce((sum, a) => sum + (a.estimatedReadingMinutes || 2), 0);
        
        const badge = document.getElementById('reading-time');
        // Show unread time vs budget so user knows how far over/under budget they are
        badge.textContent = `~${totalMinutes} min unread`;
        badge.classList.toggle('over-budget', totalMinutes > this.settings.dailyMinutes);
    }

    updateLastRefreshed() {
        const lastRefresh = localStorage.getItem(STORAGE_KEYS.LAST_REFRESH);
        const el = document.getElementById('last-updated');
        
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
            const scoredArticles = this.scoreArticles(dedupedArticles);
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
            
            // Save and render
            localStorage.setItem(STORAGE_KEYS.LAST_REFRESH, new Date().toISOString());
            this.saveToStorage();
            this.renderDigest();
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
                                <button onclick="app.enableSource('${escapedUrl}')" 
                                        class="btn-secondary btn-sm">
                                    Re-enable
                                </button>
                                <button onclick="app.removeDisabledSource('${escapedUrl}')" 
                                        class="btn-danger btn-sm">
                                    Remove
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
                
                <button onclick="app.enableAllSources()" class="btn-primary" style="margin-top: 1rem;">
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

    scoreArticles(articles) {
        // Compute and cache cross-references once; reused in rendering to avoid double computation
        this.crossRefs = this.detectCrossReferences(articles);
        
        return articles.map(article => {
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
            if (industryMatch) {
                const tierBoost = { 1: 0.30, 2: 0.20, 3: 0.10 };
                bd.industry = tierBoost[industryMatch.tier] || 0;
                bd.industryName = industryMatch.name;
                score += bd.industry;
                article.matchedIndustry = industryMatch.name;
            }
            
            // Client match - tier-weighted boost
            // Tier 1 (Strategic): +40%, Tier 2 (Growth): +25%, Tier 3 (Prospect): +15%
            bd.client = 0;
            if (allClients.length > 0) {
                const topClient = allClients[0];
                const clientObj = this.clients.find(c => (typeof c === 'string' ? c : c.name) === topClient);
                const clientTier = (clientObj && typeof clientObj === 'object') ? clientObj.tier : 2;
                
                // Use CLIENT_TIERS from sources.js if available, otherwise fallback to hardcoded values
                const tierBoosts = typeof CLIENT_TIERS !== 'undefined'
                    ? { 1: CLIENT_TIERS[1].boost, 2: CLIENT_TIERS[2].boost, 3: CLIENT_TIERS[3].boost }
                    : { 1: 0.40, 2: 0.25, 3: 0.15 };
                
                bd.client = tierBoosts[clientTier] || 0.25;
                bd.clientName = topClient;
                bd.clientTier = clientTier;
                score += bd.client;
                article.matchedClient = topClient;
                article.allMatchedClients = allClients;
                
                // Add market info if available
                if (clientObj && typeof clientObj === 'object' && clientObj.market) {
                    article.matchedMarket = clientObj.market;
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
            
            bd.total = parseFloat(Math.min(1, score).toFixed(3));
            article.scoreBreakdown = bd;
            
            // Signal type classification
            article.signalType = this.classifySignalType(text, allClients);
            
            // Estimate reading time
            const wordCount = (article.summary || '').split(/\s+/).length;
            article.estimatedReadingMinutes = Math.max(1, Math.min(10, Math.ceil(wordCount / 150)));
            
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
        
        // Highest boost: client + competitor co-occurrence = competitive threat
        if (hasClient && hasCompetitor) boost += 0.35;
        // Client + C-suite change = new decision-maker opportunity
        else if (hasClient && hasCsuite) boost += 0.30;
        // Client + opportunity signal = active buying intent
        else if (hasClient && hasOpportunity) boost += 0.20;
        // Regulatory signal = compliance pressure = IBM opportunity
        if (hasRegulatory) boost += 0.25;
        // IBM keyword = direct relevance
        if (hasIBM) boost += 0.15;
        
        return Math.min(0.40, boost);
    }

    classifySignalType(text, matchedClients) {
        if (typeof DEAL_RELEVANCE_SIGNALS === 'undefined') return 'background';
        
        const hasClient = matchedClients.length > 0;
        const hasCompetitor = DEAL_RELEVANCE_SIGNALS.COMPETITOR_KEYWORDS.some(kw => text.includes(kw));
        const hasCsuite = DEAL_RELEVANCE_SIGNALS.CSUITE_KEYWORDS.some(kw => text.includes(kw));
        const hasRegulatory = DEAL_RELEVANCE_SIGNALS.REGULATORY_KEYWORDS.some(kw => text.includes(kw));
        const hasIBM = DEAL_RELEVANCE_SIGNALS.IBM_KEYWORDS.some(kw => text.includes(kw));
        const hasOpportunity = DEAL_RELEVANCE_SIGNALS.OPPORTUNITY_KEYWORDS.some(kw => text.includes(kw));
        
        if (hasClient && hasCompetitor) return 'risk';
        if (hasClient && hasCsuite) return 'relationship';
        if (hasRegulatory) return 'regulatory';
        if (hasIBM) return 'ibm';
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
        // Works with both structured objects {name, tier, keywords} and legacy strings.
        // Uses keywords array for better matching (e.g., "DBS", "Development Bank of Singapore")
        // Falls back to name-only matching for backward compatibility
        const matches = [];
        
        for (const clientEntry of this.clients) {
            const clientName = typeof clientEntry === 'string' ? clientEntry : clientEntry.name;
            
            // Skip if client is disabled
            if (typeof clientEntry === 'object' && clientEntry.enabled === false) {
                continue;
            }
            
            let isMatch = false;
            
            // Use keywords array if available (new structure)
            if (typeof clientEntry === 'object' && clientEntry.keywords && Array.isArray(clientEntry.keywords)) {
                for (const keyword of clientEntry.keywords) {
                    const keywordLower = keyword.toLowerCase();
                    
                    // For short keywords (<=3 chars), require word boundaries
                    if (keyword.length <= 3) {
                        const regex = new RegExp(`\\b${this.escapeRegex(keywordLower)}\\b`, 'i');
                        if (regex.test(text)) {
                            isMatch = true;
                            break;
                        }
                    } else {
                        // For longer keywords, partial match is OK
                        const regex = new RegExp(`\\b${this.escapeRegex(keywordLower)}`, 'i');
                        if (regex.test(text)) {
                            isMatch = true;
                            break;
                        }
                    }
                }
            } else {
                // Fallback to name-only matching (legacy support)
                const clientLower = clientName.toLowerCase();
                
                if (clientName.length <= 3) {
                    const regex = new RegExp(`\\b${this.escapeRegex(clientLower)}\\b`, 'i');
                    isMatch = regex.test(text);
                } else {
                    const regex = new RegExp(`\\b${this.escapeRegex(clientLower)}`, 'i');
                    isMatch = regex.test(text);
                }
            }
            
            if (isMatch) {
                matches.push(clientName);
            }
        }
        
        return matches;
    }

    detectMarket(text) {
        // Detect which APAC market(s) an article is relevant to based on geographic keywords
        // Returns array of market codes (e.g., ['ANZ', 'ASEAN'])
        const markets = [];
        const textLower = text.toLowerCase();
        
        // Use GEOGRAPHIC_KEYWORDS from sources.js if available
        const geoKeywords = typeof GEOGRAPHIC_KEYWORDS !== 'undefined' ? GEOGRAPHIC_KEYWORDS : {};
        
        for (const [marketCode, keywords] of Object.entries(geoKeywords)) {
            let isMatch = false;
            
            // Check countries
            if (keywords.countries) {
                for (const country of keywords.countries) {
                    if (textLower.includes(country.toLowerCase())) {
                        isMatch = true;
                        break;
                    }
                }
            }
            
            // Check cities
            if (!isMatch && keywords.cities) {
                for (const city of keywords.cities) {
                    const regex = new RegExp(`\\b${this.escapeRegex(city.toLowerCase())}\\b`, 'i');
                    if (regex.test(textLower)) {
                        isMatch = true;
                        break;
                    }
                }
            }
            
            // Check regions
            if (!isMatch && keywords.regions) {
                for (const region of keywords.regions) {
                    if (textLower.includes(region.toLowerCase())) {
                        isMatch = true;
                        break;
                    }
                }
            }
            
            // Check organizations (regulatory bodies, exchanges, etc.)
            if (!isMatch && keywords.organizations) {
                for (const org of keywords.organizations) {
                    if (textLower.includes(org.toLowerCase())) {
                        isMatch = true;
                        break;
                    }
                }
            }
            
            if (isMatch) {
                markets.push(marketCode);
            }
        }
        
        return markets;
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
   watsonx.ai's enterprise governance in your next Samsung or DBS conversation."

CLIENT INTELLIGENCE RULES:
- Articles tagged with a Client name are watchlist client signals
- For Tier 1 clients (DBS, Commonwealth Bank, ANZ, Westpac, NAB, Samsung, Reliance,
  HDFC, ICICI, CIMB, Maybank, Petronas, Singtel, Starhub, Telstra, SK Telecom):
  flag their signals explicitly in executiveSummary or the relevant section
- If thisWeekContext mentions a client by name, that client's signals are MEETING PREP —
  surface them first in executiveSummary
- When a client article reveals a broader industry pattern, reference it in the
  corresponding industrySignals entry as evidence (e.g. "DBS's AI announcement signals...")

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

    renderDigest() {
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('digest-content').classList.remove('hidden');
        
        // Update tab badges
        document.getElementById('daily-count-badge').textContent = this.dailyArticles.length;
        document.getElementById('weekly-count-badge').textContent = this.weeklyArticles.length;
        
        // Render Daily Tab
        this.renderDailyTab();
        
        // Render Weekly Tab
        this.renderWeeklyTab();
        
        this.updateReadingTime();
    }

    renderDailyTab() {
        // 1. Executive Brief — synthesised headline with industry insights inline
        if (this.digest) {
            document.getElementById('executive-summary').innerHTML = this.formatMarkdownLinks(this.digest.executiveSummary);
            
            // Merge Industry Signals inline into Executive Brief
            this.renderIndustrySignalsInline();
        }

        // 2. Account Intelligence — client mentions (conversation starters embedded per client)
        this.renderClientWatch();

        // 3. Market Pulse — geographic intelligence for 5 APAC markets
        this.renderMarketPulse();

        // 4. AI Digest Sections — thematic deep-dives (Competitive Alerts, etc.)
        if (this.digest) {
            this.renderSections(this.digest.sections || []);
        }

        // 5. Pattern Detection — merged cross-source + trending (collapsed by default)
        this.renderPatternDetection();
        
        // 6. Deep Context — optional reference (collapsed by default)
        this.renderDeepContext();
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
                    <div class="weekly-top3-item${readClass}" data-article-id="${safeId}" onclick="app.openArticle('${safeId}')">
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
                                <button class="rating-btn thumb-up${thumbUpClass}" onclick="app.rateArticle('${safeId}', 1, event)" title="👍 Good article">👍</button>
                                <button class="rating-btn thumb-down${thumbDownClass}" onclick="app.rateArticle('${safeId}', -1, event)" title="👎 Not useful">👎</button>
                                <button class="quick-save-btn" onclick="quickSaveToInstapaper('${safeId}', event)" title="Save to Instapaper">📥</button>
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

    renderMarketPulse() {
        // Render market-specific intelligence for 5 APAC regions
        const section = document.getElementById('market-pulse-section');
        if (!section) return;
        
        // Use MARKETS from sources.js if available
        const markets = typeof MARKETS !== 'undefined' ? MARKETS : {
            ANZ: { name: "Australia & New Zealand", countries: ["AU", "NZ"], atls: 23, accounts: 68 },
            ASEAN: { name: "Southeast Asia", countries: ["SG", "MY", "TH", "ID", "PH", "VN", "JP"], atls: 31, accounts: 89 },
            GCG: { name: "Greater China", countries: ["CN", "HK", "TW"], atls: 19, accounts: 54 },
            ISA: { name: "India & South Asia", countries: ["IN", "BD", "LK", "PK"], atls: 28, accounts: 87 },
            KOREA: { name: "South Korea", countries: ["KR"], atls: 14, accounts: 45 }
        };
        
        // Detect market relevance for all articles
        const marketArticles = {};
        for (const [marketCode, marketInfo] of Object.entries(markets)) {
            marketArticles[marketCode] = [];
        }
        
        for (const article of this.dailyArticles) {
            const text = `${article.title} ${article.summary}`.toLowerCase();
            const detectedMarkets = this.detectMarket(text);
            
            for (const marketCode of detectedMarkets) {
                if (marketArticles[marketCode]) {
                    marketArticles[marketCode].push(article);
                }
            }
        }
        
        // Count total articles across all markets
        const totalMarketArticles = Object.values(marketArticles).reduce((sum, arr) => sum + arr.length, 0);
        
        if (totalMarketArticles === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        
        // Render market tabs content
        for (const [marketCode, marketInfo] of Object.entries(markets)) {
            const articles = marketArticles[marketCode] || [];
            const contentDiv = document.getElementById(`market-${marketCode.toLowerCase()}`);
            if (!contentDiv) continue;
            
            // Count clients in this market
            const marketClients = this.clients.filter(c => {
                if (typeof c === 'string') return false;
                return c.market === marketCode && c.enabled !== false;
            });
            
            const tier1Count = marketClients.filter(c => c.tier === 1).length;
            const tier2Count = marketClients.filter(c => c.tier === 2).length;
            const tier3Count = marketClients.filter(c => c.tier === 3).length;
            
            // Render market stats
            const statsHtml = `
                <div class="market-stats">
                    <div class="market-stat">
                        <div class="market-stat-label">ATLs</div>
                        <div class="market-stat-value">${marketInfo.atls}</div>
                    </div>
                    <div class="market-stat">
                        <div class="market-stat-label">Accounts</div>
                        <div class="market-stat-value">${marketInfo.accounts}</div>
                    </div>
                    <div class="market-stat">
                        <div class="market-stat-label">T1 Clients</div>
                        <div class="market-stat-value">${tier1Count}</div>
                    </div>
                    <div class="market-stat">
                        <div class="market-stat-label">Articles Today</div>
                        <div class="market-stat-value">${articles.length}</div>
                    </div>
                </div>
            `;
            
            // Render articles
            let articlesHtml = '';
            if (articles.length === 0) {
                articlesHtml = '<div class="empty-state">No market-specific articles today</div>';
            } else {
                // Sort by relevance score
                const sortedArticles = [...articles].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
                
                // Show top 10 articles per market
                for (const article of sortedArticles.slice(0, 10)) {
                    const safeTitle = this.escapeHtml(article.title);
                    const safeSource = this.escapeHtml(article.sourceName);
                    const safeUrl = this.escapeAttr(article.link);
                    const relevanceScore = article.relevanceScore ? Math.round(article.relevanceScore * 100) : 0;
                    const relevanceClass = relevanceScore >= 70 ? 'high' : relevanceScore >= 50 ? 'medium' : 'low';
                    
                    // Detect clients mentioned in this article
                    const text = `${article.title} ${article.summary}`.toLowerCase();
                    const matchedClients = this.detectAllClients(text);
                    const clientBadges = matchedClients.length > 0 
                        ? matchedClients.slice(0, 3).map(c => `<span class="client-badge">${this.escapeHtml(c)}</span>`).join('')
                        : '';
                    
                    articlesHtml += `
                        <div class="market-article">
                            <div class="market-article-header">
                                <a href="${safeUrl}" target="_blank" class="market-article-title">${safeTitle}</a>
                                <span class="relevance-indicator ${relevanceClass}">${relevanceScore}%</span>
                            </div>
                            <div class="market-article-meta">
                                <span class="source-name">${safeSource}</span>
                                ${clientBadges}
                            </div>
                        </div>
                    `;
                }
            }
            
            contentDiv.innerHTML = statsHtml + articlesHtml;
        }
        
        // Set up tab switching
        const tabs = document.querySelectorAll('.market-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs and contents
                document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.market-content').forEach(c => c.classList.remove('active'));
                
                // Add active to clicked tab and corresponding content
                tab.classList.add('active');
                const marketCode = tab.dataset.market;
                const content = document.getElementById(`market-${marketCode}`);
                if (content) content.classList.add('active');
            });
        });
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
                            <button class="btn-meeting-brief" onclick="app.openMeetingBrief('${safeClientName}')" title="Meeting Brief">📋</button>
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
            
            // Get client object for Phase 5 advanced fields
            const clientObj = this.clients.find(c =>
                (typeof c === 'string' ? c : c.name) === clientName
            );
            
            // Build Phase 5 metadata badges
            let metadataBadges = '';
            if (clientObj && typeof clientObj === 'object') {
                if (clientObj.atlName) {
                    metadataBadges += `<span class="client-meta-badge" title="Assigned ATL">👤 ${this.escapeHtml(clientObj.atlName)}</span>`;
                }
                if (clientObj.nextMeeting) {
                    const meetingDate = new Date(clientObj.nextMeeting);
                    const daysUntil = Math.ceil((meetingDate - new Date()) / (1000 * 60 * 60 * 24));
                    const urgencyClass = daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : '';
                    metadataBadges += `<span class="client-meta-badge meeting-badge ${urgencyClass}" title="Next meeting in ${daysUntil} days">📅 ${meetingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>`;
                }
                if (clientObj.activeDeal) {
                    const dealText = clientObj.dealValue
                        ? `$${(clientObj.dealValue / 1000000).toFixed(1)}M`
                        : 'Active';
                    metadataBadges += `<span class="client-meta-badge deal-badge" title="Active deal pursuit">💰 ${dealText}</span>`;
                }
            }
            
            return `
                <div class="client-group">
                    <div class="client-name-row">
                        ${tierLabel}
                        <span class="client-name">${this.escapeHtml(clientName)}</span>
                        <span class="signal-type-badge ${badge.cssClass}">${badge.emoji} ${badge.label}</span>
                        ${metadataBadges}
                        <button class="btn-meeting-brief" onclick="app.openMeetingBrief('${safeClientName}')" title="Meeting Brief">📋</button>
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
                                <span class="client-article-title" onclick="app.openArticle('${safeId}')" title="${this.escapeAttr(a.title)}">${highlightedTitle}</span>
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
                <button class="starter-copy" onclick="app.copyStarter(${i})" title="Copy">📋</button>
            </div>
        `).join('');
    }

    renderDailyArticles() {
        const list = document.getElementById('articles-list');
        const count = document.getElementById('articles-count');
        
        count.textContent = this.dailyArticles.length;
        
        list.innerHTML = this.dailyArticles.slice(0, 30).map(article => this.renderArticleItem(article)).join('');
    }

    // ==========================================
    // Phase 2: Simplified UI Rendering Functions
    // ==========================================

    renderIndustrySignalsInline() {
        const container = document.getElementById('industry-signals-inline');
        
        // Get industry signals from digest or generate from matched articles
        const industrySignals = this.generateIndustrySignals();
        
        if (industrySignals.length === 0) {
            container.classList.add('hidden');
            return;
        }
        
        container.classList.remove('hidden');
        container.innerHTML = `
            <h3>📊 Industry Signals</h3>
            ${industrySignals.map(signal => `
                <div class="industry-signal-item">
                    <div class="industry-signal-header">
                        <span class="industry-signal-name">${signal.industry}</span>
                    </div>
                    <div class="industry-signal-content">
                        ${this.formatMarkdownLinks(signal.content)}
                    </div>
                </div>
            `).join('')}
        `;
    }

    generateIndustrySignals() {
        // Generate industry-specific signals from matched articles
        const industryArticles = {};
        
        for (const article of this.dailyArticles) {
            if (article.matchedIndustry) {
                if (!industryArticles[article.matchedIndustry]) {
                    industryArticles[article.matchedIndustry] = [];
                }
                industryArticles[article.matchedIndustry].push(article);
            }
        }
        
        // Create signals for top industries
        const signals = [];
        for (const [industry, articles] of Object.entries(industryArticles)) {
            if (articles.length > 0) {
                const topArticle = articles[0];
                signals.push({
                    industry: industry,
                    content: `${articles.length} relevant ${articles.length === 1 ? 'article' : 'articles'} — lead with [${topArticle.sourceName}](${topArticle.url}): ${topArticle.title}`
                });
            }
        }
        
        return signals.slice(0, 3); // Top 3 industries
    }

    renderPatternDetection() {
        const section = document.getElementById('patterns-section');
        const countBadge = document.getElementById('patterns-count');
        
        // Render cross-source signals
        const crossSourceDiv = document.getElementById('cross-source-patterns');
        const signalsList = document.getElementById('signals-list');
        
        if (this.crossRefs && this.crossRefs.length > 0) {
            crossSourceDiv.classList.remove('hidden');
            signalsList.innerHTML = this.crossRefs.slice(0, 10).map(ref => `
                <div class="signal-item">
                    <div class="signal-header">
                        <span class="signal-theme">${this.escapeHtml(ref.topic)}</span>
                        <span class="signal-sources">${ref.sourceCount} sources</span>
                    </div>
                    ${ref.description ? `<div class="signal-description">${this.escapeHtml(ref.description)}</div>` : ''}
                    <div class="signal-source-list">
                        <span class="signal-source-label">Sources:</span>
                        ${ref.articles.slice(0, 5).map(a => 
                            `<a href="${a.url}" target="_blank" rel="noopener noreferrer" class="signal-source-link">${this.escapeHtml(a.sourceName)}</a>`
                        ).join('')}
                    </div>
                </div>
            `).join('');
        } else {
            crossSourceDiv.classList.add('hidden');
        }
        
        // Render trending (will be populated by renderTrendingInline)
        this.renderTrendingInline();
        
        // Update count and visibility
        const totalPatterns = (this.crossRefs?.length || 0) + (this.trendingTopics?.length || 0);
        countBadge.textContent = totalPatterns;
        
        if (totalPatterns > 0) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    }

    async renderTrendingInline() {
        const trendingDiv = document.getElementById('trending-patterns');
        const trendingList = document.getElementById('trending-list');
        
        // Get trending topics from IDB
        const trending = await this.detectMultiDayTrending();
        this.trendingTopics = trending;
        
        if (trending.length > 0) {
            trendingDiv.classList.remove('hidden');
            trendingList.innerHTML = trending.slice(0, 10).map((item, index) => `
                <div class="trending-item">
                    <div class="trending-rank">${index + 1}</div>
                    <div class="trending-content">
                        <div class="trending-topic">${this.escapeHtml(item.topic)}</div>
                        <div class="trending-count">${item.days} days × ${item.sources} sources</div>
                    </div>
                </div>
            `).join('');
        } else {
            trendingDiv.classList.add('hidden');
        }
    }

    renderDeepContext() {
        const section = document.getElementById('deep-context-section');
        const list = document.getElementById('deep-context-list');
        const count = document.getElementById('deep-context-count');
        
        // Show top 20 articles as reference
        const contextArticles = this.dailyArticles.slice(0, 20);
        
        if (contextArticles.length > 0) {
            count.textContent = contextArticles.length;
            list.innerHTML = contextArticles.map(article => this.renderArticleItem(article)).join('');
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
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
            <div class="article-item${readClass}" data-article-id="${safeId}" onclick="app.openArticle('${safeId}')">
                <div class="article-item-header">
                    <span class="article-item-source"${driftHint}>${this.escapeHtml(article.sourceName)}</span>
                    <div class="article-item-actions">
                        <button class="rating-btn thumb-up${thumbUpClass}" onclick="app.rateArticle('${safeId}', 1, event)" title="👍 Good article — rank this source higher">👍</button>
                        <button class="rating-btn thumb-down${thumbDownClass}" onclick="app.rateArticle('${safeId}', -1, event)" title="👎 Not useful — rank this source lower">👎</button>
                        <button class="quick-save-btn" onclick="quickSaveToInstapaper('${safeId}', event)" title="Save to Instapaper">📥</button>
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

    async deepReadArticle(id) {
        const article = this.articles.find(a => a.id === id)
            || this.weeklyArticles.find(a => a.id === id)
            || this.dailyArticles.find(a => a.id === id);
        if (!article) return;
        
        const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        if (!apiKey) return;
        
        const deepReadContent = document.getElementById('deep-read-content');
        const deepReadBtn = document.getElementById('deep-read-btn');
        if (!deepReadContent) return;
        
        deepReadContent.classList.remove('hidden');
        deepReadContent.innerHTML = '<div class="deep-read-loading">🤖 Generating deep read analysis...</div>';
        if (deepReadBtn) deepReadBtn.disabled = true;
        
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
Source: ${article.sourceName} (Category: ${article.category || 'General'})
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
                deepReadContent.innerHTML = `
                    <div class="deep-read-section">
                        <div class="deep-read-label">📌 Key Facts</div>
                        <ul class="deep-read-facts">
                            ${(result.keyFacts || []).map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="deep-read-section">
                        <div class="deep-read-label">⚡ So What</div>
                        <div class="deep-read-text deep-read-so-what">${this.escapeHtml(result.soWhat || '')}</div>
                    </div>
                    <div class="deep-read-section">
                        <div class="deep-read-label">🔵 IBM Angle</div>
                        <div class="deep-read-text">${this.escapeHtml(result.ibmAngle || '')}</div>
                    </div>
                    ${result.clientImplication ? `
                    <div class="deep-read-section">
                        <div class="deep-read-label">👤 Client Implication</div>
                        <div class="deep-read-text deep-read-client">${this.escapeHtml(result.clientImplication)}</div>
                    </div>` : ''}
                    ${result.competitiveWatch ? `
                    <div class="deep-read-section">
                        <div class="deep-read-label">⚔️ Competitive Watch</div>
                        <div class="deep-read-text deep-read-competitive">${this.escapeHtml(result.competitiveWatch)}</div>
                    </div>` : ''}
                    <div class="deep-read-section">
                        <div class="deep-read-label">💬 Conversation Opener</div>
                        <div class="deep-read-text deep-read-opener">${this.escapeHtml(result.conversationOpener || '')}</div>
                    </div>`;
            } else {
                deepReadContent.innerHTML = '<div class="deep-read-error">Could not parse AI response.</div>';
            }
        } catch (error) {
            deepReadContent.innerHTML = `<div class="deep-read-error">Deep read failed: ${this.escapeHtml(error.message)}</div>`;
        } finally {
            if (deepReadBtn) deepReadBtn.disabled = false;
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

        // Phase 5: Extract advanced client metadata
        const atlName = clientObj?.atlName || null;
        const nextMeeting = clientObj?.nextMeeting || null;
        const activeDeal = clientObj?.activeDeal || false;
        const dealValue = clientObj?.dealValue || null;
        const clientNotes = clientObj?.notes || null;

        // Determine if this is a live meeting brief or ATL enablement brief
        const isMeetingThisWeek = !!(nextMeeting || (this.settings.thisWeekContext &&
            this.settings.thisWeekContext.toLowerCase().includes(clientName.toLowerCase())));
        const briefPurpose = isMeetingThisWeek
            ? `LIVE MEETING BRIEF — you are meeting ${clientName} ${nextMeeting ? `on ${nextMeeting}` : 'this week'}`
            : `ATL ENABLEMENT BRIEF — for ${atlName || 'the ATL'} aligned to ${clientName}`;

        // Phase 5: Client metadata block
        const metadataBlock = `
CLIENT METADATA:
- Assigned ATL: ${atlName || 'Not assigned'}
- Next Meeting: ${nextMeeting || 'Not scheduled'}
- Active Deal: ${activeDeal ? `Yes${dealValue ? ` ($${(dealValue / 1000000).toFixed(1)}M)` : ''}` : 'No'}
${clientNotes ? `- Notes: ${clientNotes}` : ''}
`;

        // Industry context block
        const industryBlock = clientIndustry ? `
CLIENT INDUSTRY: ${clientIndustry}
${industrySignal ? `INDUSTRY SIGNAL THIS WEEK: ${industrySignal.headline}
IBM ANGLE FOR ${clientIndustry.toUpperCase()}: ${industrySignal.ibmAngle}` : ''}
Frame all talking points through ${clientIndustry} challenges and priorities.
` : '';
        
        const prompt = `You are preparing a meeting brief for the IBM APAC Field CTO.
Brief purpose: ${briefPurpose}
${metadataBlock}${contextBlock}${industryBlock}
Recent news about ${clientName}:
${articleList || 'No recent news found.'}

BRIEF RULES:
- If LIVE MEETING BRIEF: lead with the most time-sensitive signal; frame talking points as what to say in the room today${nextMeeting ? ` (meeting scheduled for ${nextMeeting})` : ''}
- If ATL ENABLEMENT BRIEF: frame talking points as intelligence ${atlName || 'the ATL'} can use in their next client touchpoint or QBR
${activeDeal ? `- ACTIVE DEAL: This is an active deal pursuit${dealValue ? ` worth $${(dealValue / 1000000).toFixed(1)}M` : ''}. Prioritize deal-closing angles.` : ''}
- talkingPoints: produce EXACTLY 3 points, each framed as a ${clientIndustry || 'enterprise'} challenge with a specific IBM product angle (watsonx.ai, watsonx.governance, IBM Consulting, Red Hat OpenShift, IBM Security, IBM Z, hybrid cloud)
- riskFlags: specific risks only — reputational issues, known competitor relationships, regulatory exposure, C-suite changes, or deal blockers. Omit array if none.
- openingQuestion: frame as a hypothesis to test, not an open-ended probe. Style: "I've been thinking that [observation from the news] — is that consistent with what you're seeing?" Peer CTO tone, not a sales pitch.
- salesAngle: name a specific IBM product AND a specific trigger (regulatory deadline, competitor move, or client news) that makes NOW the right time${activeDeal ? '. Focus on closing this active deal.' : ''}
- atlNote: one sentence for ${atlName || 'the ATL'} aligned to ${clientName} — what to watch for or act on this week, even if the Field CTO is not personally meeting the client
- slackMessage: under 280 characters total

Return ONLY valid JSON, no markdown fences:
{
    "situationSummary": "2-3 sentences on ${clientName}'s current situation.",
    "talkingPoints": ["Exactly 3 points. Each: ${clientIndustry || 'enterprise'} challenge + specific IBM product angle.", "Point 2.", "Point 3."],
    "riskFlags": ["Specific risk only — reputational, competitive, regulatory, C-suite, or deal blocker. Omit array if none."],
    "openingQuestion": "Hypothesis-framed. Peer CTO tone. Not a sales pitch.",
    "salesAngle": "Specific IBM product + specific trigger for why now.",
    "atlNote": "One sentence for ${atlName || 'the ATL'} aligned to ${clientName} — what to watch for or act on this week.",
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
    // ATL Enablement Pack (Phase 4)
    // ==========================================

    async generateATLBriefs(event) {
        // Prevent event bubbling to avoid collapsing the section
        if (event) event.stopPropagation();
        
        const modal = document.getElementById('atl-enablement-modal');
        const bodyEl = document.getElementById('atl-enablement-body');
        const copyBtn = document.getElementById('copy-atl-btn');
        
        if (!modal || !bodyEl) return;
        
        modal.classList.remove('hidden');
        bodyEl.innerHTML = '<div class="meeting-brief-loading">🤖 Generating ATL briefs for all clients with coverage...</div>';
        if (copyBtn) copyBtn.classList.add('hidden');
        
        const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        
        // Get all clients with articles today
        const clientArticles = [];
        for (const article of this.dailyArticles) {
            const text = `${article.title} ${article.summary}`.toLowerCase();
            const matchedClients = this.detectAllClients(text);
            if (matchedClients.length > 0) {
                clientArticles.push({ ...article, matchedClients });
            }
        }
        
        // Group by client
        const byClient = {};
        for (const article of clientArticles) {
            for (const client of article.matchedClients) {
                if (!byClient[client]) byClient[client] = [];
                if (!byClient[client].find(a => a.id === article.id)) {
                    byClient[client].push(article);
                }
            }
        }
        
        if (Object.keys(byClient).length === 0) {
            bodyEl.innerHTML = '<div class="meeting-brief-empty">No client coverage today. ATL briefs are generated when clients appear in the news.</div>';
            return;
        }
        
        if (!apiKey) {
            // No API key: show basic list
            let html = '<div class="atl-brief-section"><p class="meeting-brief-hint">Add a Claude API key in Settings to generate AI-powered ATL briefs.</p>';
            html += '<div class="atl-brief-label">📊 Clients with Coverage Today</div><ul class="meeting-brief-list">';
            for (const [clientName, articles] of Object.entries(byClient)) {
                html += `<li><strong>${this.escapeHtml(clientName)}</strong> — ${articles.length} article${articles.length > 1 ? 's' : ''}</li>`;
            }
            html += '</ul></div>';
            bodyEl.innerHTML = html;
            return;
        }
        
        // Generate briefs for top clients (limit to 10 to avoid rate limits)
        const clientList = Object.entries(byClient)
            .sort((a, b) => b[1].length - a[1].length) // Sort by article count
            .slice(0, 10);
        
        const briefs = [];
        let processedCount = 0;
        
        for (const [clientName, articles] of clientList) {
            processedCount++;
            bodyEl.innerHTML = `<div class="meeting-brief-loading">🤖 Generating brief ${processedCount}/${clientList.length}: ${this.escapeHtml(clientName)}...</div>`;
            
            try {
                const brief = await this.generateSingleATLBrief(clientName, articles, apiKey);
                if (brief) briefs.push({ clientName, brief, articles });
            } catch (error) {
                console.error(`Failed to generate brief for ${clientName}:`, error);
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Render all briefs
        this.renderATLBriefs(briefs);
        
        // Store for copy function
        this._atlBriefs = briefs;
        if (copyBtn) copyBtn.classList.remove('hidden');
    }
    
    async generateSingleATLBrief(clientName, articles, apiKey) {
        // Look up client object
        const clientObj = this.clients.find(c =>
            (typeof c === 'string' ? c : c.name).toLowerCase() === clientName.toLowerCase()
        );
        const clientIndustry = clientObj?.industry || 'Enterprise';
        const clientMarket = clientObj?.market || 'APAC';
        const clientTier = clientObj?.tier || 2;
        
        // Get market info
        const markets = typeof MARKETS !== 'undefined' ? MARKETS : {};
        const marketInfo = markets[clientMarket] || { name: clientMarket, atls: 0 };
        
        const articleList = articles.slice(0, 5).map((a, i) =>
            `[${i + 1}] ${a.sourceName}: ${a.title}\n${a.summary?.substring(0, 250) || ''}`
        ).join('\n\n');
        
        const prompt = `You are preparing an ATL enablement brief for IBM APAC Field CTO's team.
Client: ${clientName} (${clientIndustry}, ${marketInfo.name}, Tier ${clientTier})
Recent news (${articles.length} articles):
${articleList}

BRIEF RULES:
- situationSummary: 1-2 sentences on what's happening with ${clientName} right now
- talkingPoint: ONE specific talking point the ATL can use in their next touchpoint — frame as "${clientIndustry} challenge + IBM product angle"
- slackMessage: Under 280 characters total, ready to send to the ATL. Format: "*${clientName}* — [1-sentence situation] 💡 [talking point]"

Return ONLY valid JSON, no markdown fences:
{
    "situationSummary": "1-2 sentences on ${clientName}'s current situation.",
    "talkingPoint": "${clientIndustry} challenge + specific IBM product angle.",
    "slackMessage": "*${clientName}* — [situation] 💡 [talking point]"
}`;
        
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
                max_tokens: 400,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        const text = data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    }
    
    renderATLBriefs(briefs) {
        const bodyEl = document.getElementById('atl-enablement-body');
        if (!bodyEl) return;
        
        // Group by market
        const byMarket = {};
        for (const { clientName, brief, articles } of briefs) {
            const clientObj = this.clients.find(c =>
                (typeof c === 'string' ? c : c.name).toLowerCase() === clientName.toLowerCase()
            );
            const market = clientObj?.market || 'OTHER';
            if (!byMarket[market]) byMarket[market] = [];
            byMarket[market].push({ clientName, brief, articles, tier: clientObj?.tier || 2 });
        }
        
        let html = '<div class="atl-enablement-summary">';
        html += `<p><strong>${briefs.length} ATL briefs generated</strong> — organized by market and ready to distribute to your team.</p>`;
        html += '</div>';
        
        // Render by market
        const markets = typeof MARKETS !== 'undefined' ? MARKETS : {};
        for (const [marketCode, marketBriefs] of Object.entries(byMarket)) {
            const marketInfo = markets[marketCode] || { name: marketCode };
            html += `<div class="atl-market-section">`;
            html += `<h3 class="atl-market-title">🌏 ${marketInfo.name} (${marketBriefs.length} clients)</h3>`;
            
            // Sort by tier
            marketBriefs.sort((a, b) => a.tier - b.tier);
            
            for (const { clientName, brief, articles, tier } of marketBriefs) {
                const tierLabel = tier === 1 ? '<span class="client-tier-badge tier-1">T1</span>' :
                                 tier === 2 ? '<span class="client-tier-badge tier-2">T2</span>' :
                                              '<span class="client-tier-badge tier-3">T3</span>';
                
                html += `<div class="atl-brief-card">`;
                html += `<div class="atl-brief-header">`;
                html += `${tierLabel} <strong>${this.escapeHtml(clientName)}</strong>`;
                html += `<span class="atl-brief-article-count">${articles.length} article${articles.length > 1 ? 's' : ''}</span>`;
                html += `</div>`;
                html += `<div class="atl-brief-situation">${this.escapeHtml(brief.situationSummary || '')}</div>`;
                html += `<div class="atl-brief-talking-point">💡 ${this.escapeHtml(brief.talkingPoint || '')}</div>`;
                html += `<div class="atl-brief-slack">`;
                html += `<div class="atl-brief-slack-label">Slack Message:</div>`;
                html += `<div class="atl-brief-slack-text">${this.escapeHtml(brief.slackMessage || '')}</div>`;
                html += `<button class="btn-copy-slack-mini" onclick="app.copySingleSlack('${this.escapeAttr(brief.slackMessage || '')}')">📋 Copy</button>`;
                html += `</div>`;
                html += `</div>`;
            }
            
            html += `</div>`;
        }
        
        bodyEl.innerHTML = html;
    }
    
    copyATLBriefs() {
        if (!this._atlBriefs || this._atlBriefs.length === 0) return;
        
        let text = '# ATL Enablement Pack\n\n';
        text += `Generated: ${new Date().toLocaleString()}\n`;
        text += `Total Clients: ${this._atlBriefs.length}\n\n`;
        
        // Group by market
        const byMarket = {};
        for (const { clientName, brief } of this._atlBriefs) {
            const clientObj = this.clients.find(c =>
                (typeof c === 'string' ? c : c.name).toLowerCase() === clientName.toLowerCase()
            );
            const market = clientObj?.market || 'OTHER';
            if (!byMarket[market]) byMarket[market] = [];
            byMarket[market].push({ clientName, brief, tier: clientObj?.tier || 2 });
        }
        
        const markets = typeof MARKETS !== 'undefined' ? MARKETS : {};
        for (const [marketCode, marketBriefs] of Object.entries(byMarket)) {
            const marketInfo = markets[marketCode] || { name: marketCode };
            text += `## ${marketInfo.name}\n\n`;
            
            marketBriefs.sort((a, b) => a.tier - b.tier);
            
            for (const { clientName, brief, tier } of marketBriefs) {
                text += `### ${clientName} (Tier ${tier})\n`;
                text += `${brief.slackMessage}\n\n`;
            }
        }
        
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copy-atl-btn');
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
    
    copySingleSlack(slackMessage) {
        navigator.clipboard.writeText(slackMessage).then(() => {
            showToast('✓ Copied to clipboard');
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
        
        lines.push(`# The Signal Today — ${date}`);
        lines.push('');
        
        // Executive Summary
        if (this.digest?.executiveSummary) {
            lines.push('## ⚡ Action Brief');
            // Strip markdown links to plain text for export
            lines.push(this.digest.executiveSummary.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
            lines.push('');
        }
        
        // Digest Sections
        if (this.digest?.sections?.length > 0) {
            for (const section of this.digest.sections) {
                lines.push(`## ${section.emoji || ''} ${section.title}`);
                lines.push((section.summary || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
                lines.push('');
            }
        }
        
        // Conversation Starters
        if (this.digest?.conversationStarters?.length > 0) {
            lines.push('## 💬 Conversation Openers');
            for (const starter of this.digest.conversationStarters) {
                lines.push(`- ${starter.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}`);
            }
            lines.push('');
        }
        
        // Client Watch
        const clientArticles = this.dailyArticles.filter(a => a.matchedClient);
        if (clientArticles.length > 0) {
            lines.push('## 👁️ Client Watch');
            const byClient = {};
            for (const a of clientArticles) {
                if (!byClient[a.matchedClient]) byClient[a.matchedClient] = [];
                byClient[a.matchedClient].push(a);
            }
            for (const [client, articles] of Object.entries(byClient)) {
                lines.push(`### ${client}`);
                for (const a of articles.slice(0, 3)) {
                    lines.push(`- [${a.sourceName}] ${a.title} — ${a.url}`);
                }
            }
            lines.push('');
        }
        
        // Top Articles
        lines.push('## 📰 Top Daily Articles');
        for (const a of this.dailyArticles.slice(0, 15)) {
            lines.push(`- **${a.sourceName}**: ${a.title} — ${a.url}`);
        }
        
        const content = lines.join('\n');
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signal-brief-${new Date().toISOString().split('T')[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
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

        // Build industry signals block from Phase 1 output
        const industrySignals = this.digest?.industrySignals || [];
        const industryBlock = industrySignals.length > 0
            ? industrySignals.map(s =>
                `${s.industry.toUpperCase()}\nSignal: ${s.headline}\nIBM angle: ${s.ibmAngle}\nAction: ${s.salesAction}`
              ).join('\n\n')
            : 'No industry signals available — run a fresh digest first.';

        // Top 5 weekly articles for the "Top Articles" section
        const topArticles = this.weeklyArticles.slice(0, 5);
        const topArticleList = topArticles.map(a =>
            `- ${a.title} (${a.sourceName}) — ${a.url}`
        ).join('\n');

        // Competitive / regulatory signals from digest sections
        const competitiveSection = (this.digest?.sections || []).find(s =>
            s.title?.toLowerCase().includes('competitive')
        );
        const regulatorySection = (this.digest?.sections || []).find(s =>
            s.title?.toLowerCase().includes('regulatory')
        );
        const crossIndustryBlock = [
            competitiveSection ? `Competitive: ${(competitiveSection.summary || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').substring(0, 400)}` : '',
            regulatorySection ? `Regulatory: ${(regulatorySection.summary || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').substring(0, 400)}` : ''
        ].filter(Boolean).join('\n');

        if (!apiKey) {
            // No API key: produce a basic plain-text digest from available data
            const lines = [
                `Subject: IBM APAC Field CTO — Weekly Intelligence Brief | ${date}`,
                '',
                industryBlock,
                '',
                crossIndustryBlock ? `CROSS-INDUSTRY SIGNALS\n${crossIndustryBlock}` : '',
                '',
                `TOP ARTICLES\n${topArticleList || 'No articles available.'}`
            ].filter(l => l !== undefined);
            const text = lines.join('\n');
            this._lastGTMDigestText = text;
            bodyEl.innerHTML = `<pre class="gtm-digest-text">${this.escapeHtml(text)}</pre>
                <p class="form-hint">Add a Claude API key in Settings for AI-enhanced GTM digests.</p>`;
            if (copyBtn) copyBtn.classList.remove('hidden');
            return;
        }

        // Build client signals block grouped by industry (Tier 1 & 2 only)
        const clientSignalLines = [];
        for (const article of this.dailyArticles.filter(a => a.matchedClient)) {
            const clientObj = this.clients.find(c =>
                (typeof c === 'string' ? c : c.name) === article.matchedClient
            );
            if (!clientObj || (typeof clientObj === 'object' && clientObj.tier > 2)) continue;
            const tier = (typeof clientObj === 'object') ? clientObj.tier : 2;
            const industry = (typeof clientObj === 'object' && clientObj.industry) ? clientObj.industry : 'Other';
            const signalType = article.signalType || 'signal';
            clientSignalLines.push(
                `${article.matchedClient} (${industry}, Tier ${tier}, ${signalType}): ${article.title}`
            );
        }
        const clientSignalBlock = clientSignalLines.length > 0
            ? clientSignalLines.join('\n')
            : 'No Tier 1/2 client signals today.';

        // Inject thisWeekContext (was missing from original GTM prompt)
        const weekContextBlock = this.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT:\n${this.settings.thisWeekContext}\n`
            : '';

        const prompt = `Write a weekly intelligence email FROM the IBM APAC Field CTO TO the GTM sales team.
Write in first person. You are the Field CTO addressing your team directly.
The team is organised by industry vertical. They need to know what to do this week, not just what happened.
Plain text only. No markdown, no bullet symbols, no HTML.
Use ALL CAPS for section headers. Use dashes for list items.
${weekContextBlock}
INDUSTRY SIGNALS AVAILABLE:
${industryBlock}

CLIENT SIGNALS THIS WEEK (Tier 1 & 2 accounts only):
${clientSignalBlock}

CROSS-INDUSTRY CONTEXT:
${crossIndustryBlock || 'No cross-industry signals available.'}

TOP ARTICLES THIS WEEK:
${topArticleList || 'No articles available.'}

Produce EXACTLY this structure (plain text, no markdown):

Subject: IBM APAC Field CTO — Weekly Intelligence Brief | ${date}

WHAT TO LEAD WITH THIS WEEK
[2-3 sentences maximum. State the single IBM message, the market evidence for it, and the call to action for sellers. Tag as [AI WAVE] or [SOVEREIGNTY WAVE].]

[For each industry that has a signal, write a section:]
[INDUSTRY NAME IN CAPS]
Signal: [headline — if a watchlist client is the evidence, name them]
IBM angle: [ibmAngle — be specific about the IBM product/service]
Action: [salesAction — what the GTM seller should do this week, name a client account if relevant]
Client watch: [if any Tier 1/2 clients in this industry had signals today, list them with one-sentence implication for the ATL. Omit this line if no client signals.]

CROSS-INDUSTRY SIGNALS
- [2-3 bullets: competitive alerts or regulatory changes affecting all verticals]

CALL TO ACTION THIS WEEK
- [1-2 specific actions for sellers, tied to the week's signals. Name accounts where possible.]

TOP ARTICLES
[list the top 3-5 articles with title and URL, one per line]`;

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
                    max_tokens: 1500,
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
        document.getElementById('daily-minutes').value = this.settings.dailyMinutes;
        document.getElementById('weekly-articles').value = this.settings.weeklyArticles;
        
        // Populate clients — display as comma-separated names (handle both string and object formats)
        const clientNames = this.clients.map(c => typeof c === 'string' ? c : c.name);
        document.getElementById('clients-input').value = clientNames.join(', ');
        
        // Populate new fields if they exist in the DOM
        const weekContextEl = document.getElementById('week-context');
        if (weekContextEl) weekContextEl.value = this.settings.thisWeekContext || '';
        
        const autoRefreshEl = document.getElementById('auto-refresh-time');
        if (autoRefreshEl) autoRefreshEl.value = this.settings.autoRefreshTime || '';
        
        // Clean up any legacy Instapaper credentials that may have been stored by older versions
        localStorage.removeItem('signal_instapaper_email');
        localStorage.removeItem('signal_instapaper_password');
        
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

    renderIndustrySettings() {
        const container = document.getElementById('industry-settings');
        
        container.innerHTML = this.industries.map((industry, i) => `
            <div class="industry-item">
                <span class="industry-name">${industry.emoji} ${industry.name}</span>
                <div class="industry-tier">
                    <button class="tier-btn tier-1 ${industry.tier === 1 ? 'active' : ''}" 
                            onclick="app.setIndustryTier(${i}, 1)">T1</button>
                    <button class="tier-btn tier-2 ${industry.tier === 2 ? 'active' : ''}" 
                            onclick="app.setIndustryTier(${i}, 2)">T2</button>
                    <button class="tier-btn tier-3 ${industry.tier === 3 ? 'active' : ''}" 
                            onclick="app.setIndustryTier(${i}, 3)">T3</button>
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
    // Update tab buttons
    document.querySelectorAll('.digest-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update tab content
    document.getElementById('daily-tab').classList.toggle('hidden', tab !== 'daily');
    document.getElementById('weekly-tab').classList.toggle('hidden', tab !== 'weekly');
    
    app.currentTab = tab;
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

    // Clamp daily minutes between 5 and 60 (JS-side validation in addition to HTML min/max)
    const rawDailyMinutes = parseInt(document.getElementById('daily-minutes').value) || 15;
    const dailyMinutes = Math.max(5, Math.min(60, rawDailyMinutes));

    // Clamp weekly articles between 3 and 20
    const rawWeeklyArticles = parseInt(document.getElementById('weekly-articles').value) || 5;
    const weeklyArticles = Math.max(3, Math.min(20, rawWeeklyArticles));

    const clientsInput = document.getElementById('clients-input').value;
    
    // Save API key to localStorage (NOTE: stored unencrypted - user was warned in Settings UI)
    if (apiKey) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    } else {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
    
    // Save settings
    app.settings.dailyMinutes = dailyMinutes;
    app.settings.weeklyArticles = weeklyArticles;
    
    // Save new context fields if present in DOM
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
    
    // Parse clients — preserve existing tier/country data for known clients, default T2 for new ones
    // Capture old clients BEFORE reassigning to avoid reading a partially-mutated array
    const oldClients = app.clients.slice();
    const newClientNames = clientsInput.split(',').map(c => c.trim()).filter(c => c);
    app.clients = newClientNames.map(name => {
        const existing = oldClients.find(c => (typeof c === 'string' ? c : c.name) === name);
        if (existing && typeof existing === 'object') return existing;
        return { name, tier: 2, country: '' };
    });
    
    // Save to storage
    app.saveToStorage();
    
    closeSettings();
    app.updateUI();
    
    console.log('✅ Settings saved');
}

function resetSources() {
    if (confirm('Reset all sources to defaults? This will remove any custom sources you added.')) {
        app.sources = [...DEFAULT_SOURCES];
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

function closeATLEnablement() {
    const modal = document.getElementById('atl-enablement-modal');
    if (modal) modal.classList.add('hidden');
}
}

function copyArticleLink() {
    const articleId = document.getElementById('article-modal').dataset.articleId;
    const article = app.articles.find(a => a.id === articleId);
    if (article) {
        navigator.clipboard.writeText(article.url);
        alert('Link copied!');
    }
}

function saveToInstapaper() {
    const articleId = document.getElementById('article-modal').dataset.articleId;
    
    // Search in all article arrays to handle articles in dailyArticles/weeklyArticles
    const article = app.articles.find(a => a.id === articleId)
        || app.dailyArticles.find(a => a.id === articleId)
        || app.weeklyArticles.find(a => a.id === articleId);
    
    if (!article) {
        showToast('❌ Article not found');
        console.error('Instapaper: Article not found:', articleId);
        return;
    }
    
    if (!article.url) {
        showToast('❌ Article URL missing');
        console.error('Instapaper: Article URL missing for:', article.title);
        return;
    }
    
    saveArticleToInstapaper(article.url, article.title);
    showToast('📥 Opening Instapaper...');
}

// Instapaper integration uses the bookmarklet-style URL only.
// Credential-based API calls through third-party CORS proxies were removed because
// they exposed the user's password to proxy operators in plaintext GET query strings.
function saveArticleToInstapaper(url, title) {
    // Use Instapaper's current bookmarklet endpoint (text endpoint)
    // The 'text' endpoint properly saves articles when users are logged in
    const instapaperUrl = `https://www.instapaper.com/text?u=${encodeURIComponent(url)}`;
    
    // Try to open popup
    const popup = window.open(instapaperUrl, '_blank', 'noopener,noreferrer,width=500,height=600');
    
    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup blocked - provide fallback
        showToast('⚠️ Popup blocked. Opening in new tab...');
        // Fallback: open in new tab instead
        setTimeout(() => {
            window.open(instapaperUrl, '_blank');
        }, 100);
    }
}

function quickSaveToInstapaper(articleId, event) {
    // Prevent opening the article modal
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // Search in all article arrays
    const article = app.articles.find(a => a.id === articleId)
        || app.dailyArticles.find(a => a.id === articleId)
        || app.weeklyArticles.find(a => a.id === articleId);
    
    if (!article) {
        showToast('❌ Article not found');
        console.error('Instapaper: Article not found:', articleId);
        return;
    }
    
    if (!article.url) {
        showToast('❌ Article URL missing');
        return;
    }
    
    saveArticleToInstapaper(article.url, article.title);
    
    // Show truncated title in toast
    const truncatedTitle = article.title.length > 50
        ? article.title.substring(0, 50) + '...'
        : article.title;
    showToast(`📥 Saving "${truncatedTitle}" to Instapaper`);
    
    // Visual feedback on button
    const btn = event?.target;
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.classList.add('saved');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('saved');
        }, 2000);
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

// Initialize app
const app = new SignalApp();
