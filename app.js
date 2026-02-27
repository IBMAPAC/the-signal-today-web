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
        this.dailyArticles = [];
        this.weeklyArticles = [];
        this.digest = null;
        this.sources = [];
        this.industries = [];
        this.clients = [];
        this.settings = {
            dailyMinutes: 15,
            weeklyArticles: 10,
            weeklyCurrencyDays: 7
        };
        this.isLoading = false;
        this.currentTab = 'daily';
        
        this.init();
    }

    async init() {
        this.loadFromStorage();
        this.updateUI();
        this.bindEvents();
        this.updateDate();
        
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
    // Article Categorization
    // ==========================================

    categorizeArticles() {
        const now = new Date();
        const dailyCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weeklyCutoff = new Date(now.getTime() - this.settings.weeklyCurrencyDays * 24 * 60 * 60 * 1000);
        
        // Daily articles: from daily or both sources, within 24 hours
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
        
        // Weekly articles: from weekly or both sources, within week, max 2 per source
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
                .slice(0, 200); // Keep top 200
            
            console.log(`🎯 ${this.articles.length} relevant articles`);
            
            // Categorize into daily/weekly
            this.categorizeArticles();
            
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
            
            // Client match (unchanged)
            if (clientMatch) {
                score += 0.25;
                article.matchedClient = clientMatch;
            }
            
            // Cross-reference boost (unchanged)
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
        
        return topicGroups.sort((a, b) => b.sourceCount - a.sourceCount);
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
        // Render cross-source signals
        const crossRefs = this.detectCrossReferences(this.articles);
        this.renderCrossSourceSignals(crossRefs);
        
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
            // Build a summary of what the theme covers
            const uniqueTitles = [...new Set(ref.articles.slice(0, 3).map(a => a.title))];
            const context = uniqueTitles.map(t => t.substring(0, 60) + (t.length > 60 ? '...' : '')).join('; ');
            
            return `
                <div class="signal-item">
                    <div class="signal-header">
                        <span class="signal-theme">${this.escapeHtml(ref.theme)}</span>
                        <span class="signal-sources">📰 ${ref.sourceCount} sources</span>
                    </div>
                    <div class="signal-context">${this.escapeHtml(context.substring(0, 180))}${context.length > 180 ? '...' : ''}</div>
                    <div class="signal-articles">
                        ${ref.articles.slice(0, 3).map(a => {
                            const safeId = this.escapeAttr(a.id);
                            const shortTitle = a.title.substring(0, 40) + (a.title.length > 40 ? '...' : '');
                            return `<a class="signal-article-link" href="javascript:void(0)" onclick="app.openArticle('${safeId}')" title="${this.escapeAttr(a.title)}">${this.escapeHtml(a.sourceName)}: ${this.escapeHtml(shortTitle)}</a>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
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
        
        // For each industry, cluster by theme
        list.innerHTML = Object.entries(byIndustry).map(([industry, articles]) => {
            const industryInfo = this.industries.find(i => i.name === industry) || { emoji: '🏢' };
            
            // Simple theme clustering based on keywords
            const themes = this.clusterByTheme(articles);
            
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
                                    const shortTitle = a.title.substring(0, 50) + (a.title.length > 50 ? '...' : '');
                                    return `<a href="javascript:void(0)" onclick="app.openArticle('${safeId}')" title="${this.escapeAttr(a.title)}">${this.escapeHtml(shortTitle)}</a>`;
                                }).join(' • ')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    clusterByTheme(articles) {
        // Simple keyword-based clustering
        const themeKeywords = {
            'AI & Automation': ['ai', 'automation', 'machine learning', 'llm', 'genai'],
            'Digital Transformation': ['digital', 'transformation', 'modernization', 'cloud'],
            'Regulatory & Compliance': ['regulation', 'compliance', 'governance', 'policy'],
            'Security & Risk': ['security', 'cyber', 'risk', 'threat', 'vulnerability'],
            'Strategy & Leadership': ['strategy', 'ceo', 'cio', 'leadership', 'investment'],
            'Innovation': ['innovation', 'startup', 'disrupt', 'emerging']
        };
        
        const themes = [];
        const assigned = new Set();
        
        for (const [themeName, keywords] of Object.entries(themeKeywords)) {
            const matching = articles.filter(a => {
                if (assigned.has(a.id)) return false;
                const text = `${a.title} ${a.summary}`.toLowerCase();
                return keywords.some(kw => text.includes(kw));
            });
            
            if (matching.length > 0) {
                themes.push({ name: themeName, articles: matching });
                matching.forEach(a => assigned.add(a.id));
            }
        }
        
        // Add remaining as "Other"
        const remaining = articles.filter(a => !assigned.has(a.id));
        if (remaining.length > 0) {
            themes.push({ name: 'Other News', articles: remaining });
        }
        
        return themes.filter(t => t.articles.length > 0);
    }

    renderClientWatch() {
        const section = document.getElementById('clients-section');
        const list = document.getElementById('clients-list');
        const count = document.getElementById('clients-count');
        
        const clientArticles = this.dailyArticles.filter(a => a.matchedClient);
        
        if (clientArticles.length === 0) {
            section.classList.add('hidden');
            return;
        }
        
        section.classList.remove('hidden');
        count.textContent = clientArticles.length;
        
        // Group by client
        const byClient = {};
        for (const article of clientArticles) {
            const client = article.matchedClient;
            if (!byClient[client]) {
                byClient[client] = [];
            }
            byClient[client].push(article);
        }
        
        list.innerHTML = Object.entries(byClient).map(([client, articles]) => {
            // Determine context hint
            const hasCompetitor = articles.some(a => 
                ['Microsoft', 'AWS', 'Google', 'Accenture', 'Deloitte'].some(c => 
                    `${a.title} ${a.summary}`.toLowerCase().includes(c.toLowerCase())
                )
            );
            const contextHint = hasCompetitor 
                ? '⚠️ Competitor activity detected - review before client meeting'
                : '💡 Recent coverage - potential conversation starter';
            
            return `
                <div class="client-group">
                    <div class="client-name">${this.escapeHtml(client)}</div>
                    <div class="client-context">${contextHint}</div>
                    <div class="client-articles">
                        ${articles.slice(0, 3).map(a => {
                            const safeId = this.escapeAttr(a.id);
                            const shortTitle = a.title.substring(0, 70) + (a.title.length > 70 ? '...' : '');
                            return `
                            <div class="client-article">
                                <span class="client-article-source">${this.escapeHtml(a.sourceName)}</span>
                                <span class="client-article-title" onclick="app.openArticle('${safeId}')" title="${this.escapeAttr(a.title)}">${this.escapeHtml(shortTitle)}</span>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            `;
        }).join('');
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
        
        return `
            <div class="article-item" onclick="app.openArticle('${safeId}')">
                <div class="article-item-header">
                    <span class="article-item-source">${this.escapeHtml(article.sourceName)}</span>
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
        return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
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

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
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

function copyArticleLink() {
    const articleId = document.getElementById('article-modal').dataset.articleId;
    const article = app.articles.find(a => a.id === articleId);
    if (article) {
        navigator.clipboard.writeText(article.url);
        alert('Link copied!');
    }
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
