// =============================================
// The Signal Today - Web Application
// =============================================

const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
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
    TREND_HISTORY: 'signal_trend_history'
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
        
        this.init();
    }

    async init() {
        this.loadFromStorage();
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
        
        // Load articles
        const savedArticles = localStorage.getItem(STORAGE_KEYS.ARTICLES);
        this.articles = savedArticles ? JSON.parse(savedArticles) : [];
        
        // Load digest
        const savedDigest = localStorage.getItem(STORAGE_KEYS.DIGEST);
        this.digest = savedDigest ? JSON.parse(savedDigest) : null;
        
        // Load settings
        const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    }

    saveToStorage() {
        localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(this.sources));
        localStorage.setItem(STORAGE_KEYS.INDUSTRIES, JSON.stringify(this.industries));
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(this.clients));
        localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(this.articles));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
        if (this.digest) {
            localStorage.setItem(STORAGE_KEYS.DIGEST, JSON.stringify(this.digest));
        }
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
        // Show actual total vs budget (not capped) so user knows how far over budget they are
        badge.textContent = `${totalMinutes}/${this.settings.dailyMinutes} min`;
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

        const startTime = performance.now();

        try {
            this.showLoading('Fetching articles from RSS feeds...');
            
            // Fetch articles from RSS feeds
            const enabledSources = this.sources.filter(s => s.enabled);
            console.log(`📡 Fetching from ${enabledSources.length} sources`);
            
            const fetchedArticles = await this.fetchArticles(enabledSources);
            console.log(`📰 Fetched ${fetchedArticles.length} articles in ${Math.round(performance.now() - startTime)}ms`);
            
            this.showLoading(`Scoring ${fetchedArticles.length} articles...`);
            
            // Score articles
            const scoredArticles = this.scoreArticles(fetchedArticles);
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
                this.showLoading('Generating AI-powered digest...');
                await this.generateAIDigest(apiKey);
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
            
            // Cache successful result
            feedCache.set(cacheKey, { articles, timestamp: Date.now() });
            
            return articles;
        } catch (error) {
            // All proxies failed
            console.warn(`All proxies failed for ${source.name}`);
            return [];
        }
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
            
            // Try 1: Standard <link>URL</link> with possible whitespace
            const linkMatch = itemContent.match(/<link[^>]*>\s*(?:<!\[CDATA\[)?\s*(https?:\/\/[^\s<>\[\]]+)\s*(?:\]\]>)?\s*<\/link>/i);
            if (linkMatch) {
                link = linkMatch[1].trim();
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
                    }
                }
            }
            
            // Try 3: guid as fallback
            if (!link) {
                const guidMatch = itemContent.match(/<guid[^>]*>\s*(?:<!\[CDATA\[)?\s*(https?:\/\/[^\s<>\[\]]+)\s*(?:\]\]>)?\s*<\/guid>/i);
                if (guidMatch) {
                    link = guidMatch[1].trim();
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
            description = description.replace(/<[^>]*>/g, '').substring(0, 500);
            description = this.decodeHtmlEntities(description);
            
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
            
            // Enhanced scoring formula
            let score = 0.20; // Lower base score
            
            // Priority boost (unchanged)
            if (article.priority === 1) score += 0.20;
            else if (article.priority === 2) score += 0.10;
            
            // Credibility (increased weight, wider range)
            // Old: (credibility - 0.7) * 0.3 = max +0.075
            // New: (credibility - 0.5) * 0.4 = max +0.18
            score += (article.credibilityScore - 0.5) * 0.4;
            
            // Category weight (NEW)
            const categoryWeight = CATEGORIES[article.category]?.weight || 1.0;
            score *= categoryWeight;
            
            // Recency boost (NEW)
            const hoursOld = (Date.now() - new Date(article.publishedDate).getTime()) / 3600000;
            if (hoursOld < 4) score += 0.12;        // Breaking news (< 4 hours)
            else if (hoursOld < 8) score += 0.08;   // Very recent (< 8 hours)
            else if (hoursOld < 12) score += 0.05;  // Same day morning/afternoon
            else if (hoursOld < 24) score += 0.02;  // Within 24 hours
            // No boost for older articles
            
            // Industry match (unchanged)
            if (industryMatch) {
                const tierBoost = { 1: 0.30, 2: 0.20, 3: 0.10 };
                score += tierBoost[industryMatch.tier] || 0;
                article.matchedIndustry = industryMatch.name;
            }
            
            // Client match - tier-weighted boost
            if (allClients.length > 0) {
                const topClient = allClients[0];
                const clientObj = this.clients.find(c => (typeof c === 'string' ? c : c.name) === topClient);
                const clientTier = (clientObj && typeof clientObj === 'object') ? clientObj.tier : 2;
                const tierBoost = { 1: 0.35, 2: 0.25, 3: 0.15 }[clientTier] || 0.25;
                score += tierBoost;
                article.matchedClient = topClient;
                article.allMatchedClients = allClients;
            }
            
            // Cross-reference boost
            score += crossRefBoost;
            
            // Deal relevance scoring layer
            const dealBoost = this.calculateDealRelevance(text, allClients);
            score += dealBoost;
            
            // Signal type classification
            article.signalType = this.classifySignalType(text, allClients);
            
            // Estimate reading time
            const wordCount = (article.summary || '').split(/\s+/).length;
            article.estimatedReadingMinutes = Math.max(1, Math.min(10, Math.ceil(wordCount / 150)));
            
            article.relevanceScore = Math.min(1, score);
            return article;
        });
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
        // Works with both structured objects {name, tier} and legacy strings.
        // Uses word boundary matching to avoid false positives
        // e.g., "SK" shouldn't match "risk", "ANZ" shouldn't match "organization"
        const matches = [];
        
        for (const clientEntry of this.clients) {
            const clientName = typeof clientEntry === 'string' ? clientEntry : clientEntry.name;
            const clientLower = clientName.toLowerCase();
            
            let isMatch = false;
            
            if (clientName.length <= 3) {
                const regex = new RegExp(`\\b${this.escapeRegex(clientLower)}\\b`, 'i');
                isMatch = regex.test(text);
            } else {
                const regex = new RegExp(`\\b${this.escapeRegex(clientLower)}`, 'i');
                isMatch = regex.test(text);
            }
            
            if (isMatch) {
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

    async generateAIDigest(apiKey) {
        const topArticles = this.dailyArticles.slice(0, 20);
        
        const articleList = topArticles.map((a, i) =>
            `[${i + 1}] Source: ${a.sourceName} | URL: ${a.url}\nTitle: ${a.title}\nSummary: ${a.summary?.substring(0, 200) || 'No summary'}`
        ).join('\n\n');

        // Inject "This Week's Context" if set
        const contextBlock = this.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT (prioritize relevance to these meetings/deals):\n${this.settings.thisWeekContext}\n`
            : '';

        const prompt = `You are the intelligence briefer for the Field CTO of IBM Asia Pacific.
${contextBlock}
YOUR JOB IS NOT TO SUMMARIZE NEWS. Your job is to answer:
1. What should I BRING UP in client meetings today?
2. What COMPETITIVE THREAT requires immediate attention?
3. What REGULATORY CHANGE affects my clients?
4. What OPPORTUNITY should I act on this week?

CONTEXT:
- Role: Field CTO leading 100+ Account Technical Leaders across 343 enterprise accounts in APAC
- Focus: Dual-wave thesis (AI/Agentic transformation + Sovereignty/Regulation)
- Priority Industries: Financial Services, Government, Manufacturing, Energy, Retail
- Competitors: Microsoft Azure, Google Cloud, AWS, Accenture, Deloitte, Alibaba Cloud, NTT Data, Infosys, Wipro

CRITICAL CITATION RULES:
1. ALWAYS use the actual Source Name in citations, NOT generic "Source"
2. Format: [Actual Source Name](URL) - e.g., [MIT Tech Review](https://...)
3. Every factual claim MUST have a citation with the real source name

CRITICAL FRAMING RULES:
1. Frame EVERY insight as an ACTION, not information
2. BAD: "Microsoft announced new Azure AI services"
3. GOOD: "COMPETITIVE ALERT: Microsoft's new Azure AI [CIO Dive](url) could affect your banking deals. ACTION: Lead with IBM's on-prem sovereignty in your next DBS conversation."

Return ONLY valid JSON:
{
    "executiveSummary": "3-4 ACTION-ORIENTED sentences with [Source Name](URL) citations.",
    "sections": [
        {
            "title": "Competitive Alerts",
            "emoji": "🚨",
            "summary": "Competitive threats with [Source Name](URL) citations.",
            "readingTimeMinutes": 3
        },
        {
            "title": "Industry Opportunities",
            "emoji": "💰",
            "summary": "Opportunities with [Source Name](URL) citations.",
            "readingTimeMinutes": 3
        },
        {
            "title": "Regulatory Watch",
            "emoji": "🛡️",
            "summary": "Regulatory updates with [Source Name](URL) citations.",
            "readingTimeMinutes": 3
        },
        {
            "title": "AI & Agentic",
            "emoji": "🤖",
            "summary": "AI developments with [Source Name](URL) citations.",
            "readingTimeMinutes": 3
        }
    ],
    "conversationStarters": [
        "Specific opener with [Source Name](URL) citation."
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
        // Use cached crossRefs computed during scoring (avoids recomputing O(articles×themes×keywords))
        this.renderCrossSourceSignals(this.crossRefs);
        
        // Render industry intelligence
        this.renderIndustryIntelligence();
        
        // Render client watch
        this.renderClientWatch();
        
        // Render executive summary
        if (this.digest) {
            document.getElementById('executive-summary').innerHTML = this.formatMarkdownLinks(this.digest.executiveSummary);
            
            // Render sections
            this.renderSections(this.digest.sections || []);
            
            // Render conversation starters
            this.renderStarters(this.digest.conversationStarters || []);
        }
        
        // Render daily articles
        this.renderDailyArticles();
    }

    renderWeeklyTab() {
        // Weekly stats
        const totalReadingTime = this.weeklyArticles.reduce((sum, a) => sum + (a.estimatedReadingMinutes || 3), 0);
        const uniqueSources = [...new Set(this.weeklyArticles.map(a => a.sourceName))].length;
        
        document.getElementById('weekly-article-count').textContent = this.weeklyArticles.length;
        document.getElementById('weekly-reading-time').textContent = totalReadingTime;
        document.getElementById('weekly-source-count').textContent = uniqueSources;
        
        // Group by category
        const byCategory = {};
        for (const article of this.weeklyArticles) {
            if (!byCategory[article.category]) {
                byCategory[article.category] = [];
            }
            byCategory[article.category].push(article);
        }
        
        // Render categories
        const categoriesHtml = Object.entries(byCategory).map(([category, articles]) => {
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
        
        // All weekly articles
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

    renderIndustryIntelligence() {
        const section = document.getElementById('industry-section');
        const list = document.getElementById('industry-list');
        const count = document.getElementById('industry-count');
        
        // Group articles by industry
        const industryArticles = this.dailyArticles.filter(a => a.matchedIndustry);
        
        if (industryArticles.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        count.textContent = industryArticles.length;
        
        // Group by industry
        const byIndustry = {};
        for (const article of industryArticles) {
            const ind = article.matchedIndustry;
            if (!byIndustry[ind]) {
                byIndustry[ind] = [];
            }
            byIndustry[ind].push(article);
        }
        
        // For each industry, cluster by industry-specific themes
        list.innerHTML = Object.entries(byIndustry).map(([industry, articles]) => {
            const industryInfo = this.industries.find(i => i.name === industry) || { emoji: '🏢' };
            
            // Use industry-specific theme clustering
            const themes = this.clusterByIndustryTheme(industry, articles);
            
            return `
                <div class="industry-group">
                    <div class="industry-group-header">
                        <span>${industryInfo.emoji || '🏢'}</span>
                        <span class="industry-group-name">${this.escapeHtml(industry)}</span>
                        <span class="industry-group-count">${articles.length} articles</span>
                    </div>
                    ${themes.map(theme => `
                        <div class="industry-theme">
                            <div class="industry-theme-name">${this.escapeHtml(theme.name)} (${theme.articles.length})</div>
                            <div class="industry-theme-articles">
                                ${theme.articles.slice(0, 3).map(a => {
                                    const safeId = this.escapeAttr(a.id);
                                    const shortTitle = a.title.substring(0, 60) + (a.title.length > 60 ? '...' : '');
                                    return `<a href="javascript:void(0)" onclick="app.openArticle('${safeId}')" title="${this.escapeAttr(a.title)}"><strong>${this.escapeHtml(a.sourceName)}:</strong> ${this.escapeHtml(shortTitle)}</a>`;
                                }).join('<br>')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    clusterByIndustryTheme(industry, articles) {
        // Industry-specific theme keywords
        const industryThemes = {
            "Financial Services": {
                'Digital Banking & Payments': ['digital bank', 'neobank', 'payment', 'mobile banking', 'real-time', 'swift', 'cbdc'],
                'Risk & Compliance': ['risk', 'compliance', 'regulation', 'kyc', 'aml', 'basel', 'audit'],
                'Wealth & Investment': ['wealth', 'investment', 'trading', 'asset management', 'portfolio'],
                'AI in Finance': ['ai', 'machine learning', 'fraud', 'credit scoring', 'automation'],
                'Open Banking': ['open banking', 'api', 'fintech', 'embedded finance']
            },
            "Government": {
                'Digital Services': ['digital government', 'e-government', 'citizen', 'portal', 'online services'],
                'Smart City': ['smart city', 'urban', 'infrastructure', 'iot', 'sensors'],
                'Security & Defense': ['security', 'defense', 'military', 'cyber', 'national security'],
                'Public Cloud': ['cloud', 'data center', 'sovereign', 'migration'],
                'AI in Government': ['ai', 'automation', 'analytics', 'decision support']
            },
            "Manufacturing": {
                'Industry 4.0': ['industry 4.0', 'smart factory', 'automation', 'robotics', 'iot'],
                'Supply Chain': ['supply chain', 'logistics', 'inventory', 'warehouse', 'distribution'],
                'Quality & Maintenance': ['quality', 'predictive maintenance', 'inspection', 'defect'],
                'Digital Twin': ['digital twin', 'simulation', 'modeling', '3d'],
                'Sustainability': ['sustainability', 'carbon', 'emissions', 'green', 'circular']
            },
            "Energy": {
                'Renewable Energy': ['renewable', 'solar', 'wind', 'clean energy', 'green'],
                'Grid & Utilities': ['grid', 'smart grid', 'utility', 'distribution', 'transmission'],
                'Oil & Gas': ['oil', 'gas', 'petroleum', 'lng', 'drilling', 'refinery'],
                'Sustainability & ESG': ['sustainability', 'esg', 'carbon', 'net zero', 'emissions'],
                'Energy Storage': ['battery', 'storage', 'ev charging', 'hydrogen']
            },
            "Retail": {
                'E-commerce': ['ecommerce', 'e-commerce', 'online', 'marketplace', 'digital commerce'],
                'Customer Experience': ['customer experience', 'personalization', 'loyalty', 'engagement'],
                'Supply Chain & Fulfillment': ['supply chain', 'fulfillment', 'last mile', 'inventory', 'warehouse'],
                'Omnichannel': ['omnichannel', 'store', 'pos', 'click and collect'],
                'AI in Retail': ['ai', 'recommendation', 'demand forecasting', 'pricing']
            },
            "Telecommunications": {
                '5G & Network': ['5g', 'network', 'spectrum', 'coverage', 'open ran'],
                'Edge & Cloud': ['edge computing', 'cloud', 'data center', 'latency'],
                'IoT & Connectivity': ['iot', 'connectivity', 'device', 'sensor', 'm2m'],
                'Digital Services': ['digital services', 'streaming', 'content', 'platform'],
                'Enterprise Solutions': ['enterprise', 'b2b', 'private 5g', 'managed services']
            },
            "Healthcare": {
                'Digital Health': ['digital health', 'telehealth', 'telemedicine', 'remote', 'virtual care'],
                'Clinical & Research': ['clinical', 'trial', 'research', 'drug discovery', 'genomics'],
                'AI in Healthcare': ['ai', 'machine learning', 'diagnosis', 'imaging', 'radiology'],
                'Patient Experience': ['patient', 'experience', 'engagement', 'portal', 'app'],
                'Data & Interoperability': ['ehr', 'health record', 'interoperability', 'data exchange', 'fhir']
            },
            "Technology": {
                'Cloud & Infrastructure': ['cloud', 'infrastructure', 'data center', 'saas', 'paas'],
                'AI & ML': ['ai', 'machine learning', 'llm', 'genai', 'model'],
                'Developer & Platform': ['developer', 'platform', 'api', 'devops', 'agile'],
                'Security': ['security', 'cyber', 'threat', 'vulnerability', 'zero trust'],
                'Startup & Investment': ['startup', 'funding', 'vc', 'investment', 'acquisition']
            }
        };
        
        const themes = industryThemes[industry] || {
            'General News': ['news', 'announcement', 'update']
        };
        
        const result = [];
        const assigned = new Set();
        
        // Match articles to themes
        for (const [themeName, keywords] of Object.entries(themes)) {
            const matching = articles.filter(a => {
                if (assigned.has(a.id)) return false;
                const text = `${a.title} ${a.summary}`.toLowerCase();
                return keywords.some(kw => text.includes(kw));
            });
            
            if (matching.length > 0) {
                result.push({ name: themeName, articles: matching });
                matching.forEach(a => assigned.add(a.id));
            }
        }
        
        // Add remaining as "Other [Industry] News"
        const remaining = articles.filter(a => !assigned.has(a.id));
        if (remaining.length > 0) {
            result.push({ name: `Other ${industry} News`, articles: remaining });
        }
        
        return result.filter(t => t.articles.length > 0);
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
            
            return `
                <div class="client-group">
                    <div class="client-name-row">
                        ${tierLabel}
                        <span class="client-name">${this.escapeHtml(clientName)}</span>
                        <span class="signal-type-badge ${badge.cssClass}">${badge.emoji} ${badge.label}</span>
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

    renderArticleItem(article) {
        const scoreClass = article.relevanceScore >= 0.7 ? 'high' : article.relevanceScore >= 0.5 ? 'medium' : '';
        const safeId = this.escapeAttr(article.id);
        const readClass = article.isRead ? ' article-read' : '';
        
        return `
            <div class="article-item${readClass}" onclick="app.openArticle('${safeId}')">
                <div class="article-item-header">
                    <span class="article-item-source">${this.escapeHtml(article.sourceName)}</span>
                    <div class="article-item-actions">
                        <button class="quick-save-btn" onclick="quickSaveToInstapaper('${safeId}', event)" title="Save to Instapaper">📥</button>
                        <span class="article-item-score ${scoreClass}">${Math.round(article.relevanceScore * 100)}%</span>
                    </div>
                </div>
                <div class="article-item-title">${this.escapeHtml(article.title)}</div>
                <div class="article-item-summary">${this.escapeHtml(article.summary?.substring(0, 150) || '')}</div>
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
        
        // Mark as read
        article.isRead = true;
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
        
        const prompt = `You are briefing the IBM APAC Field CTO. Analyze this article and provide a concise intelligence brief.

Article: ${article.title}
Source: ${article.sourceName}
Summary: ${article.summary || 'No summary available'}
URL: ${article.url}

Provide EXACTLY this JSON structure:
{
    "keyFacts": ["Fact 1 (one sentence)", "Fact 2 (one sentence)", "Fact 3 (one sentence)"],
    "ibmAngle": "One sentence on how this relates to IBM's position or opportunity in APAC.",
    "conversationOpener": "One specific question to ask a client CTO about this topic."
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
                    max_tokens: 600,
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
                        <div class="deep-read-label">🔵 IBM Angle</div>
                        <div class="deep-read-text">${this.escapeHtml(result.ibmAngle || '')}</div>
                    </div>
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
        
        const articleList = clientArticles.map((a, i) =>
            `[${i + 1}] ${a.sourceName}: ${a.title}\n${a.summary?.substring(0, 200) || ''}`
        ).join('\n\n');
        
        const contextBlock = this.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT:\n${this.settings.thisWeekContext}\n`
            : '';
        
        const prompt = `You are preparing a meeting brief for the IBM APAC Field CTO who is meeting with ${clientName}.
${contextBlock}
Recent news about ${clientName}:
${articleList || 'No recent news found.'}

Return ONLY valid JSON:
{
    "situationSummary": "2-3 sentences on ${clientName}'s current situation based on the news.",
    "talkingPoints": ["Point 1 with IBM angle", "Point 2 with IBM angle", "Point 3 with IBM angle"],
    "riskFlags": ["Risk or concern to be aware of (if any)"],
    "openingQuestion": "One specific opening question to build rapport and uncover needs."
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
                const brief = JSON.parse(jsonMatch[0]);
                bodyEl.innerHTML = `
                    <div class="meeting-brief-section">
                        <div class="meeting-brief-label">📊 Situation</div>
                        <div class="meeting-brief-text">${this.escapeHtml(brief.situationSummary || '')}</div>
                    </div>
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
    const article = app.articles.find(a => a.id === articleId);
    if (article) {
        saveArticleToInstapaper(article.url, article.title);
    }
}

// Instapaper integration uses the bookmarklet-style URL only.
// Credential-based API calls through third-party CORS proxies were removed because
// they exposed the user's password to proxy operators in plaintext GET query strings.
function saveArticleToInstapaper(url, title) {
    const instapaperUrl = `https://www.instapaper.com/hello2?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    window.open(instapaperUrl, '_blank', 'noopener,noreferrer,width=500,height=600');
}

function quickSaveToInstapaper(articleId, event) {
    // Prevent opening the article modal
    if (event) {
        event.stopPropagation();
    }
    
    const article = app.articles.find(a => a.id === articleId);
    if (!article) return;
    
    saveArticleToInstapaper(article.url, article.title);
    
    // Visual feedback
    const btn = event?.target;
    if (btn) {
        btn.textContent = '✓';
        btn.classList.add('saved');
        setTimeout(() => {
            btn.textContent = '📥';
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
