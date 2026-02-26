// =============================================
// The Signal Today - Web Application
// =============================================

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const STORAGE_KEYS = {
    API_KEY: 'signal_api_key',
    SOURCES: 'signal_sources',
    INDUSTRIES: 'signal_industries',
    CLIENTS: 'signal_clients',
    ARTICLES: 'signal_articles',
    DIGEST: 'signal_digest',
    SETTINGS: 'signal_settings',
    LAST_REFRESH: 'signal_last_refresh'
};

class SignalApp {
    constructor() {
        this.articles = [];
        this.digest = null;
        this.sources = [];
        this.industries = [];
        this.clients = [];
        this.settings = {
            dailyMinutes: 15,
            weeklyArticles: 5
        };
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        this.loadFromStorage();
        this.updateUI();
        this.bindEvents();
        this.updateDate();
        
        // Show cached content if available
        if (this.digest) {
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
        
        // Load clients
        const savedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
        this.clients = savedClients ? JSON.parse(savedClients) : [...DEFAULT_CLIENTS];
        
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
    // Event Binding
    // ==========================================

    bindEvents() {
        document.getElementById('refresh-btn').addEventListener('click', () => this.refresh());
        document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
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
        const totalMinutes = this.articles
            .filter(a => !a.isRead)
            .reduce((sum, a) => sum + (a.estimatedReadingMinutes || 2), 0);
        
        const badge = document.getElementById('reading-time');
        badge.textContent = `${Math.min(totalMinutes, this.settings.dailyMinutes)}/${this.settings.dailyMinutes} min`;
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

    async refresh() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            this.showLoading('Fetching articles from RSS feeds...');
            
            // Fetch articles from RSS feeds
            const enabledSources = this.sources.filter(s => s.enabled);
            console.log(`📡 Fetching from ${enabledSources.length} sources`);
            
            const fetchedArticles = await this.fetchArticles(enabledSources);
            console.log(`📰 Fetched ${fetchedArticles.length} articles`);
            
            this.showLoading('Scoring and analyzing articles...');
            
            // Score articles
            const scoredArticles = this.scoreArticles(fetchedArticles);
            this.articles = scoredArticles
                .filter(a => a.relevanceScore >= 0.1)
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, 100); // Keep top 100
            
            console.log(`🎯 ${this.articles.length} relevant articles`);
            
            // Generate AI digest if API key available
            const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
            if (apiKey) {
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
        const batchSize = 5;
        
        for (let i = 0; i < sources.length; i += batchSize) {
            const batch = sources.slice(i, i + batchSize);
            const results = await Promise.allSettled(
                batch.map(source => this.fetchFeed(source))
            );
            
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value) {
                    articles.push(...result.value);
                }
            }
            
            // Update progress
            const progress = Math.min(100, Math.round((i + batchSize) / sources.length * 100));
            this.showLoading(`Fetching feeds... ${progress}%`);
        }
        
        return articles;
    }

    async fetchFeed(source) {
        try {
            const response = await fetch(CORS_PROXY + encodeURIComponent(source.url), {
                headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const text = await response.text();
            return this.parseFeed(text, source);
        } catch (error) {
            console.warn(`Failed to fetch ${source.name}:`, error.message);
            return [];
        }
    }

    parseFeed(xmlText, source) {
        const articles = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        
        // Try RSS format
        let items = doc.querySelectorAll('item');
        
        // Try Atom format
        if (items.length === 0) {
            items = doc.querySelectorAll('entry');
        }
        
        items.forEach(item => {
            try {
                const title = item.querySelector('title')?.textContent?.trim();
                const link = item.querySelector('link')?.textContent?.trim() || 
                            item.querySelector('link')?.getAttribute('href');
                const description = item.querySelector('description')?.textContent?.trim() ||
                                   item.querySelector('summary')?.textContent?.trim() ||
                                   item.querySelector('content')?.textContent?.trim() || '';
                const pubDate = item.querySelector('pubDate')?.textContent ||
                               item.querySelector('published')?.textContent ||
                               item.querySelector('updated')?.textContent;
                
                if (title && link) {
                    // Clean HTML from description
                    const cleanDescription = description.replace(/<[^>]*>/g, '').substring(0, 500);
                    
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
                }
            } catch (e) {
                // Skip malformed items
            }
        });
        
        return articles;
    }

    generateId(url) {
        return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    }

    // ==========================================
    // Scoring
    // ==========================================

    scoreArticles(articles) {
        const crossRefs = this.detectCrossReferences(articles);
        
        return articles.map(article => {
            const text = `${article.title} ${article.summary}`.toLowerCase();
            
            // Calculate scores
            const industryMatch = this.detectIndustry(text);
            const clientMatch = this.detectClient(text);
            const crossRefBoost = this.getCrossRefBoost(article, crossRefs);
            
            // Base scores
            let score = 0.3; // Base relevance
            
            // Priority boost
            if (article.priority === 1) score += 0.2;
            else if (article.priority === 2) score += 0.1;
            
            // Credibility
            score += (article.credibilityScore - 0.7) * 0.3;
            
            // Industry match
            if (industryMatch) {
                const tierBoost = { 1: 0.3, 2: 0.2, 3: 0.1 };
                score += tierBoost[industryMatch.tier] || 0;
                article.matchedIndustry = industryMatch.name;
            }
            
            // Client match
            if (clientMatch) {
                score += 0.25;
                article.matchedClient = clientMatch;
            }
            
            // Cross-reference boost
            score += crossRefBoost;
            
            // Estimate reading time
            const wordCount = (article.summary || '').split(/\s+/).length;
            article.estimatedReadingMinutes = Math.max(1, Math.min(10, Math.ceil(wordCount / 150)));
            
            article.relevanceScore = Math.min(1, score);
            return article;
        });
    }

    detectIndustry(text) {
        for (const industry of this.industries) {
            if (!industry.enabled) continue;
            
            const keywords = INDUSTRY_KEYWORDS[industry.name] || [];
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    return industry;
                }
            }
        }
        return null;
    }

    detectClient(text) {
        for (const client of this.clients) {
            if (text.includes(client.toLowerCase())) {
                return client;
            }
        }
        return null;
    }

    detectCrossReferences(articles) {
        const topicGroups = {};
        const keywords = ['openai', 'anthropic', 'google', 'microsoft', 'aws', 'ai governance', 'data sovereignty'];
        
        for (const keyword of keywords) {
            const matches = articles.filter(a => 
                `${a.title} ${a.summary}`.toLowerCase().includes(keyword)
            );
            
            const uniqueSources = new Set(matches.map(m => m.sourceName));
            if (uniqueSources.size >= 2) {
                topicGroups[keyword] = {
                    topic: keyword,
                    count: uniqueSources.size,
                    articleIds: matches.map(m => m.id)
                };
            }
        }
        
        return Object.values(topicGroups).sort((a, b) => b.count - a.count);
    }

    getCrossRefBoost(article, crossRefs) {
        let boost = 0;
        for (const ref of crossRefs) {
            if (ref.articleIds.includes(article.id)) {
                boost += Math.min(0.15, ref.count * 0.05);
            }
        }
        return Math.min(0.3, boost);
    }

    // ==========================================
    // AI Digest Generation
    // ==========================================

    async generateAIDigest(apiKey) {
        const topArticles = this.articles.slice(0, 20);
        
        const articleList = topArticles.map((a, i) => 
            `[${i + 1}] Source: ${a.sourceName} | URL: ${a.url}\nTitle: ${a.title}\nSummary: ${a.summary?.substring(0, 200) || 'No summary'}`
        ).join('\n\n');

        const prompt = `You are the intelligence briefer for the Field CTO of IBM Asia Pacific.

YOUR JOB IS NOT TO SUMMARIZE NEWS. Your job is to answer:
1. What should I BRING UP in client meetings today?
2. What COMPETITIVE THREAT requires immediate attention?
3. What REGULATORY CHANGE affects my clients?
4. What OPPORTUNITY should I act on this week?

CONTEXT:
- Role: Field CTO leading 100+ Account Technical Leaders across 343 enterprise accounts in APAC
- Focus: Dual-wave thesis (AI/Agentic transformation + Sovereignty/Regulation)
- Priority Industries: Financial Services, Government, Manufacturing, Energy, Retail
- Competitors: Microsoft Azure, Google Cloud, AWS, Accenture, Deloitte

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
        const industryArticles = this.articles.filter(a => a.matchedIndustry);
        const clientArticles = this.articles.filter(a => a.matchedClient);
        
        return {
            executiveSummary: `Today's digest: ${this.articles.length} articles. Configure your Claude API key in Settings for AI-powered action briefs.`,
            sections: [
                {
                    title: "Top Stories",
                    emoji: "📰",
                    summary: `${this.articles.length} articles from ${this.sources.filter(s => s.enabled).length} sources.`,
                    readingTimeMinutes: Math.ceil(this.articles.slice(0, 10).reduce((sum, a) => sum + a.estimatedReadingMinutes, 0))
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
        
        // Render trending topics
        const crossRefs = this.detectCrossReferences(this.articles);
        this.renderTrending(crossRefs);
        
        // Render industry matches
        const industryArticles = this.articles.filter(a => a.matchedIndustry);
        this.renderIndustryMatches(industryArticles);
        
        // Render client mentions
        const clientArticles = this.articles.filter(a => a.matchedClient);
        this.renderClientMentions(clientArticles);
        
        // Render executive summary
        if (this.digest) {
            document.getElementById('executive-summary').innerHTML = this.formatMarkdownLinks(this.digest.executiveSummary);
            
            // Render sections
            this.renderSections(this.digest.sections || []);
            
            // Render conversation starters
            this.renderStarters(this.digest.conversationStarters || []);
        }
        
        // Render all articles
        this.renderArticles();
        
        this.updateReadingTime();
    }

    renderTrending(crossRefs) {
        const section = document.getElementById('trending-section');
        const list = document.getElementById('trending-list');
        const count = document.getElementById('trending-count');
        
        if (crossRefs.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        count.textContent = crossRefs.length;
        
        list.innerHTML = crossRefs.slice(0, 5).map(ref => `
            <div class="trending-item">
                <span class="trending-topic">${this.capitalizeFirst(ref.topic)}</span>
                <div class="trending-meta">
                    <span>📰 ${ref.count} sources</span>
                    <span class="trending-boost">+${Math.round(ref.count * 5)}%</span>
                </div>
            </div>
        `).join('');
    }

    renderIndustryMatches(articles) {
        const section = document.getElementById('industry-section');
        const list = document.getElementById('industry-list');
        const count = document.getElementById('industry-count');
        
        if (articles.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        count.textContent = articles.length;
        
        list.innerHTML = articles.slice(0, 5).map(article => this.renderArticleItem(article)).join('');
    }

    renderClientMentions(articles) {
        const section = document.getElementById('clients-section');
        const list = document.getElementById('clients-list');
        const count = document.getElementById('clients-count');
        
        if (articles.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        count.textContent = articles.length;
        
        list.innerHTML = articles.slice(0, 5).map(article => this.renderArticleItem(article)).join('');
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

    renderArticles() {
        const list = document.getElementById('articles-list');
        const count = document.getElementById('articles-count');
        
        count.textContent = this.articles.length;
        
        list.innerHTML = this.articles.slice(0, 30).map(article => this.renderArticleItem(article)).join('');
    }

    renderArticleItem(article) {
        const scoreClass = article.relevanceScore >= 0.7 ? 'high' : article.relevanceScore >= 0.5 ? 'medium' : '';
        
        return `
            <div class="article-item" onclick="app.openArticle('${article.id}')">
                <div class="article-item-header">
                    <span class="article-item-source">${article.sourceName}</span>
                    <span class="article-item-score ${scoreClass}">${Math.round(article.relevanceScore * 100)}%</span>
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
        const article = this.articles.find(a => a.id === id);
        if (!article) return;
        
        document.getElementById('article-title').textContent = article.title;
        document.getElementById('article-source').textContent = article.sourceName;
        document.getElementById('article-date').textContent = new Date(article.publishedDate).toLocaleDateString();
        document.getElementById('article-score').textContent = `${Math.round(article.relevanceScore * 100)}% relevant`;
        document.getElementById('article-summary').innerHTML = this.escapeHtml(article.summary || 'No summary available.');
        document.getElementById('article-link').href = article.url;
        
        document.getElementById('article-modal').classList.remove('hidden');
        document.getElementById('article-modal').dataset.articleId = id;
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
        document.getElementById('clients-input').value = this.clients.join(', ');
        document.getElementById('sources-count').textContent = `${this.sources.length} sources configured`;
        
        // Render industry settings
        this.renderIndustrySettings();
        
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
        return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// ==========================================
// Global Functions
// ==========================================

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
    const dailyMinutes = parseInt(document.getElementById('daily-minutes').value) || 15;
    const weeklyArticles = parseInt(document.getElementById('weekly-articles').value) || 5;
    const clientsInput = document.getElementById('clients-input').value;
    
    // Save API key
    if (apiKey) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    } else {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
    
    // Save settings
    app.settings.dailyMinutes = dailyMinutes;
    app.settings.weeklyArticles = weeklyArticles;
    
    // Parse clients
    app.clients = clientsInput.split(',').map(c => c.trim()).filter(c => c);
    
    // Save to storage
    app.saveToStorage();
    
    closeSettings();
    app.updateUI();
    
    console.log('✅ Settings saved');
}

function resetSources() {
    if (confirm('Reset all sources to defaults?')) {
        app.sources = [...DEFAULT_SOURCES];
        app.saveToStorage();
        document.getElementById('sources-count').textContent = `${app.sources.length} sources configured`;
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

function copyArticleLink() {
    const articleId = document.getElementById('article-modal').dataset.articleId;
    const article = app.articles.find(a => a.id === articleId);
    if (article) {
        navigator.clipboard.writeText(article.url);
        alert('Link copied!');
    }
}

// Initialize app
const app = new SignalApp();
