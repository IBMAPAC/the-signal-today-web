/**
 * ui.js - UI Rendering Module
 * 
 * Handles all DOM rendering, modal management, and UI updates for The Signal Today.
 * Extracted from app.js to improve modularity and maintainability.
 * 
 * Key responsibilities:
 * - Digest rendering (Today's Signals, Client Radar, ATL Enablement, Deep Reads)
 * - Article rendering and modals
 * - Settings modal and industry configuration
 * - Export functionality
 * - Toast notifications and loading states
 * 
 * Dependencies: Requires app instance with access to articles, clients, digest, settings
 */

class UIRenderer {
    constructor(app) {
        this.app = app;
    }

    // ==========================================
    // Main Rendering
    // ==========================================

    renderDigest(forceRefresh = false) {
        document.getElementById('empty-state').classList.add('hidden');
        document.getElementById('digest-content').classList.remove('hidden');
        
        // Render the 4-section layout
        this.renderDailyTab(forceRefresh);
    }

    renderDailyTab(forceRefresh = false) {
        // NEW 4-SECTION LAYOUT:
        // 1. Today's Signals — synthesized intelligence with IBM angles
        renderTodaysSignals(forceRefresh);
        
        // 2. Client Radar — market-based view with Brief ATL action
        renderClientRadar();
        
        // 3. ATL Enablement — what to tell your 115 ATLs
        renderATLEnablement();
        
        // 4. Deep Reads — collapsed by default
        renderDeepReads(forceRefresh);
        
        // Update portfolio stats
        updateClientManagerCounts();
    }

    // ==========================================
    // Trend Detection
    // ==========================================

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
        const historicalArticles = await this.app.db.loadArticles();
        const distinctDays = new Set(
            historicalArticles.map(a => new Date(a.publishedDate).toISOString().slice(0, 10))
        );

        // Need at least 2 distinct days in the corpus to show trends
        if (distinctDays.size < 2) {
            section.classList.add('hidden');
            return;
        }

        const trends = this.detectTrends(this.app.dailyArticles, historicalArticles);
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
                `<a class="trend-article-link" href="${this.app.escapeAttr(a.url)}" target="_blank" rel="noopener noreferrer">${this.app.escapeHtml(a.title)}</a>`
            ).join('');
            return `
                <div class="trend-item">
                    <div class="trend-item-header">
                        <span class="trend-term">${this.app.escapeHtml(trend.term)}</span>
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

        const signals = this.app.digest?.industrySignals;
        if (!signals || signals.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');
        if (countEl) countEl.textContent = signals.length;

        list.innerHTML = signals.map(s => `
            <div class="industry-signal-item">
                <div class="industry-signal-header">
                    <span class="industry-signal-emoji">${this.app.escapeHtml(s.emoji || '🏢')}</span>
                    <span class="industry-signal-name">${this.app.escapeHtml(s.industry || '')}</span>
                </div>
                <div class="industry-signal-headline">${this.app.escapeHtml(s.headline || '')}</div>
                <div class="industry-signal-ibm">🔵 IBM: ${this.app.escapeHtml(s.ibmAngle || '')}</div>
                <div class="industry-signal-action">⚡ Action: ${this.app.escapeHtml(s.salesAction || '')}</div>
            </div>
        `).join('');
    }

    renderWeeklyTab() {
        // Weekly stats
        const totalReadingTime = this.app.weeklyArticles.reduce((sum, a) => sum + (a.estimatedReadingMinutes || 3), 0);
        const uniqueSources = [...new Set(this.app.weeklyArticles.map(a => a.sourceName))].length;
        
        document.getElementById('weekly-article-count').textContent = this.app.weeklyArticles.length;
        document.getElementById('weekly-reading-time').textContent = totalReadingTime;
        document.getElementById('weekly-source-count').textContent = uniqueSources;
        
        // ── Top 3 Must Reads ──────────────────────────────────────────────
        const top3Section = document.getElementById('weekly-top3-section');
        const top3List = document.getElementById('weekly-top3-list');
        const top3 = this.app.weeklyArticles.slice(0, 3);
        
        if (top3.length > 0) {
            const medals = ['🥇', '🥈', '🥉'];
            top3List.innerHTML = top3.map((article, i) => {
                const safeId = this.app.escapeAttr(article.id);
                const categoryInfo = CATEGORIES[article.category] || { emoji: '📰' };
                const readTime = article.estimatedReadingMinutes || 3;
                const scoreClass = article.relevanceScore >= 0.7 ? 'high' : article.relevanceScore >= 0.5 ? 'medium' : '';
                const readClass = article.isRead ? ' article-read' : '';
                const rating = this.app.articleRatings[article.id] || 0;
                const thumbUpClass = rating === 1 ? ' rating-active' : '';
                const thumbDownClass = rating === -1 ? ' rating-active' : '';
                
                return `
                    <div class="weekly-top3-item${readClass}" data-article-id="${safeId}" onclick="openArticle('${safeId}')">
                        <div class="weekly-top3-medal">${medals[i]}</div>
                        <div class="weekly-top3-body">
                            <div class="weekly-top3-meta">
                                <span class="weekly-top3-source">${this.app.escapeHtml(article.sourceName)}</span>
                                <span class="weekly-top3-category">${categoryInfo.emoji} ${this.app.escapeHtml(article.category)}</span>
                                <span class="weekly-top3-time">~${readTime} min read</span>
                                <span class="article-item-score ${scoreClass}">${Math.round(article.relevanceScore * 100)}%</span>
                            </div>
                            <div class="weekly-top3-title">${this.app.escapeHtml(article.title)}</div>
                            <div class="weekly-top3-summary">${this.app.escapeHtml(article.summary?.substring(0, 200) || '')}</div>
                            <div class="weekly-top3-actions">
                                <a href="${this.app.escapeAttr(article.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" onclick="event.stopPropagation()">Read →</a>
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
        const top3Ids = new Set(top3.map(a => a.id));
        const byCategory = {};
        for (const article of this.app.weeklyArticles) {
            if (top3Ids.has(article.id)) continue;
            if (!byCategory[article.category]) {
                byCategory[article.category] = [];
            }
            byCategory[article.category].push(article);
        }
        
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
        
        // All weekly articles
        document.getElementById('weekly-articles-count').textContent = this.app.weeklyArticles.length;
        document.getElementById('weekly-articles-list').innerHTML =
            this.app.weeklyArticles.map(a => this.renderArticleItem(a)).join('');
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
            const themeDescription = this.generateThemeDescription(ref);
            const trendIndicator = this.app.scorer.getTrendIndicator(ref.theme);
            
            const sourceArticles = {};
            for (const article of ref.articles.slice(0, 5)) {
                if (!sourceArticles[article.sourceName]) {
                    sourceArticles[article.sourceName] = article;
                }
            }
            
            return `
                <div class="signal-item">
                    <div class="signal-header">
                        <span class="signal-theme">${this.app.escapeHtml(ref.theme)} ${trendIndicator}</span>
                        <span class="signal-sources">📰 ${ref.sourceCount} sources</span>
                    </div>
                    <div class="signal-description">${themeDescription}</div>
                    <div class="signal-source-list">
                        <span class="signal-source-label">Sources:</span>
                        ${Object.entries(sourceArticles).map(([sourceName, article]) => {
                            return `<a class="signal-source-link" href="${this.app.escapeAttr(article.url)}" target="_blank" rel="noopener noreferrer" title="${this.app.escapeAttr(article.title)}">${this.app.escapeHtml(sourceName)}</a>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    generateThemeDescription(ref) {
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
            'IBM vs Azure': '🚨 COMPETITIVE ALERT: Multiple sources covering Microsoft Azure/Copilot moves — use IBM\'s on-prem sovereignty and watsonx governance story in your next banking or government conversation.',
            'IBM vs AWS': '🚨 COMPETITIVE ALERT: Multiple sources covering AWS Bedrock/Amazon Q moves — lead with IBM\'s enterprise-grade AI governance and hybrid cloud differentiation.',
            'IBM vs Google Cloud': '🚨 COMPETITIVE ALERT: Multiple sources covering Google Cloud/Vertex AI moves — position IBM watsonx on data sovereignty and regulated-industry compliance.',
            'watsonx & IBM AI': '🔵 IBM watsonx coverage across multiple sources — use for client conversations on enterprise AI governance, data sovereignty, and responsible AI.',
            'APAC Regulatory Compliance': '🛡️ Converging regulatory signals from APAC markets — MAS, APRA, PDPA, or sector-specific compliance requirements affecting your clients.',
            'C-Suite Changes': '🤝 Multiple sources reporting executive changes at enterprise accounts — new CTO/CIO/CDO appointments create relationship opportunities.',
            'Digital Transformation Deals': '💰 Cross-source coverage of enterprise digital transformation announcements — potential IBM opportunities or competitive wins to track.'
        };
        
        if (themeDescriptions[ref.theme]) {
            return themeDescriptions[ref.theme];
        }
        
        const titles = ref.articles.slice(0, 3).map(a => a.title);
        return `Multiple sources reporting on related developments: ${titles[0]?.substring(0, 80)}...`;
    }

    renderClientWatch() {
        const section = document.getElementById('clients-section');
        const list = document.getElementById('clients-list');
        const count = document.getElementById('clients-count');
        
        const clientArticles = [];
        for (const article of this.app.dailyArticles) {
            const text = `${article.title} ${article.summary}`.toLowerCase();
            const matchedClients = this.app.scorer.detectAllClients(text);
            if (matchedClients.length > 0) {
                clientArticles.push({ ...article, matchedClients });
            }
        }
        
        const byClient = {};
        for (const article of clientArticles) {
            for (const client of article.matchedClients) {
                if (!byClient[client]) byClient[client] = [];
                if (!byClient[client].find(a => a.id === article.id)) {
                    byClient[client].push(article);
                }
            }
        }
        
        const tier1Clients = this.app.clients
            .filter(c => (typeof c === 'object' ? c.tier : 2) === 1)
            .map(c => typeof c === 'string' ? c : c.name);
        
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
        
        const clientsByTier = { 1: [], 2: [], 3: [] };
        for (const [clientName, articles] of Object.entries(byClient)) {
            const clientObj = this.app.clients.find(c => (typeof c === 'string' ? c : c.name) === clientName);
            const tier = (clientObj && typeof clientObj === 'object') ? clientObj.tier : 2;
            clientsByTier[tier].push({ clientName, articles, tier });
        }
        
        for (const tier of [1, 2, 3]) {
            clientsByTier[tier].sort((a, b) => {
                if (b.articles.length !== a.articles.length) return b.articles.length - a.articles.length;
                return a.clientName.localeCompare(b.clientName);
            });
        }
        
        const renderClientGroup = (clientName, articles, tier) => {
            const safeClientName = this.app.escapeAttr(clientName);
            const tierLabel = tier === 1 ? '<span class="client-tier-badge tier-1">T1</span>' :
                              tier === 2 ? '<span class="client-tier-badge tier-2">T2</span>' :
                                           '<span class="client-tier-badge tier-3">T3</span>';
            
            if (articles.length === 0) {
                return `
                    <div class="client-group client-no-coverage">
                        <div class="client-name-row">
                            ${tierLabel}
                            <span class="client-name">${this.app.escapeHtml(clientName)}</span>
                            <button class="btn-meeting-brief" onclick="openMeetingBrief('${safeClientName}')" title="Meeting Brief">📋</button>
                        </div>
                        <div class="client-no-coverage-text">No recent coverage</div>
                    </div>`;
            }
            
            const signalCounts = {};
            for (const a of articles) {
                const st = a.signalType || 'background';
                signalCounts[st] = (signalCounts[st] || 0) + 1;
            }
            const dominantSignal = Object.entries(signalCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'background';
            const badge = this.app.scorer.getSignalTypeBadge(dominantSignal);
            
            return `
                <div class="client-group">
                    <div class="client-name-row">
                        ${tierLabel}
                        <span class="client-name">${this.app.escapeHtml(clientName)}</span>
                        <span class="signal-type-badge ${badge.cssClass}">${badge.emoji} ${badge.label}</span>
                        <button class="btn-meeting-brief" onclick="openMeetingBrief('${safeClientName}')" title="Meeting Brief">📋</button>
                    </div>
                    <div class="client-articles">
                        ${articles.slice(0, 3).map(a => {
                            const safeId = this.app.escapeAttr(a.id);
                            const shortTitle = a.title.substring(0, 70) + (a.title.length > 70 ? '...' : '');
                            const highlightedTitle = this.highlightClient(shortTitle, clientName);
                            const artBadge = this.app.scorer.getSignalTypeBadge(a.signalType || 'background');
                            return `
                            <div class="client-article">
                                <span class="client-article-source">${this.app.escapeHtml(a.sourceName)}</span>
                                <span class="client-article-signal" title="${artBadge.label}">${artBadge.emoji}</span>
                                <span class="client-article-title" onclick="openArticle('${safeId}')" title="${this.app.escapeAttr(a.title)}">${highlightedTitle}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
        };
        
        let html = '';
        
        if (clientsByTier[1].length > 0) {
            html += `<div class="client-tier-header">⭐ Strategic Accounts (Tier 1)</div>`;
            html += clientsByTier[1].map(({ clientName, articles, tier }) => renderClientGroup(clientName, articles, tier)).join('');
        }
        
        const tier2WithArticles = clientsByTier[2].filter(c => c.articles.length > 0);
        if (tier2WithArticles.length > 0) {
            html += `<div class="client-tier-header">📈 Growth Accounts (Tier 2)</div>`;
            html += tier2WithArticles.map(({ clientName, articles, tier }) => renderClientGroup(clientName, articles, tier)).join('');
        }
        
        const tier3WithArticles = clientsByTier[3].filter(c => c.articles.length > 0);
        if (tier3WithArticles.length > 0) {
            html += `<div class="client-tier-header">🔍 Prospects (Tier 3)</div>`;
            html += tier3WithArticles.map(({ clientName, articles, tier }) => renderClientGroup(clientName, articles, tier)).join('');
        }
        
        list.innerHTML = html;
    }
    
    highlightClient(text, client) {
        const regex = new RegExp(`\\b(${this.app.escapeRegex(client)})\\b`, 'gi');
        return this.app.escapeHtml(text).replace(regex, (match) => `<mark>${this.app.escapeHtml(match)}</mark>`);
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
                    <div class="section-summary">${this.app.formatMarkdownLinks(section.summary || '')}</div>
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
                <div class="starter-text">${this.app.formatMarkdownLinks(starter)}</div>
                <button class="starter-copy" onclick="copyStarter(${i})" title="Copy">📋</button>
            </div>
        `).join('');
    }

    renderDailyArticles() {
        const list = document.getElementById('articles-list');
        const count = document.getElementById('articles-count');
        
        count.textContent = this.app.dailyArticles.length;
        
        list.innerHTML = this.app.dailyArticles.slice(0, 30).map(article => this.renderArticleItem(article)).join('');
    }

    renderArticleItem(article) {
        const scoreClass = article.relevanceScore >= 0.7 ? 'high' : article.relevanceScore >= 0.5 ? 'medium' : '';
        const safeId = this.app.escapeAttr(article.id);
        const readClass = article.isRead ? ' article-read' : '';
        const rating = this.app.articleRatings[article.id] || 0;
        const thumbUpClass = rating === 1 ? ' rating-active' : '';
        const thumbDownClass = rating === -1 ? ' rating-active' : '';
        const drift = this.app.sourceScoreDrift[article.sourceName] || 0;
        const driftHint = drift > 0.04 ? ` title="You've rated this source highly — it ranks higher"`
                        : drift < -0.04 ? ` title="You've downrated this source — it ranks lower"`
                        : '';
        
        // Score debug panel
        let debugPanel = '';
        if (this.app.debugMode && article.scoreBreakdown) {
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
                    <span class="article-item-source"${driftHint}>${this.app.escapeHtml(article.sourceName)}</span>
                    <div class="article-item-actions">
                        <button class="rating-btn thumb-up${thumbUpClass}" onclick="rateArticle('${safeId}', 1, event)" title="👍 Good article">👍</button>
                        <button class="rating-btn thumb-down${thumbDownClass}" onclick="rateArticle('${safeId}', -1, event)" title="👎 Not useful">👎</button>
                        <span class="article-item-score ${scoreClass}">${Math.round(article.relevanceScore * 100)}%</span>
                    </div>
                </div>
                <div class="article-item-title">${this.app.escapeHtml(article.title)}</div>
                <div class="article-item-summary">${this.app.escapeHtml(article.summary?.substring(0, 150) || '')}</div>
                ${debugPanel}
            </div>
        `;
    }

    // ==========================================
    // Settings
    // ==========================================

    openSettings() {
        document.getElementById('api-key').value = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
        
        const weekContextEl = document.getElementById('week-context');
        if (weekContextEl) weekContextEl.value = this.app.settings.thisWeekContext || '';
        
        const autoRefreshEl = document.getElementById('auto-refresh-time');
        if (autoRefreshEl) autoRefreshEl.value = this.app.settings.autoRefreshTime || '';
        
        this.renderIndustrySettings();
        this.app.renderDisabledSources();
        
        currentSourceFilter = 'all';
        document.getElementById('sources-category-filter').value = 'all';
        renderSourcesList();
        updateSourcesCount();
        
        document.getElementById('settings-modal').classList.remove('hidden');
    }

    renderIndustrySettings() {
        const container = document.getElementById('industry-settings');
        
        container.innerHTML = this.app.industries.map((industry, i) => `
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

    // ==========================================
    // UI State Management
    // ==========================================

    updateUI() {
        // Update any UI elements that depend on app state
        const hasApiKey = !!localStorage.getItem(STORAGE_KEYS.API_KEY);
        // Update UI elements based on API key availability
    }

    showLoading(message = 'Loading...') {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.textContent = message;
            loader.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    showError(message) {
        showToast(message);
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIRenderer;
}

// Made with Bob
