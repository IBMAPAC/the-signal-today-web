// =============================================
// The Signal Today - Scoring Engine
// Article relevance scoring with industry, client, and signal detection
// =============================================

class ScoringEngine {
    constructor(app) {
        this.app = app; // Reference to main SignalApp instance
    }

    // ==========================================
    // Main Scoring Function
    // ==========================================

    scoreArticles(articles) {
        // Compute and cache cross-references once; reused in rendering
        const crossRefs = this.detectCrossReferences(articles);
        
        return articles.map(article => {
            const text = `${article.title} ${article.summary}`.toLowerCase();
            
            // Calculate scores
            const industryMatch = this.detectIndustry(text);
            const allClients = this.detectAllClients(text);
            const crossRefBoost = this.getCrossRefBoost(article, crossRefs);
            
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
                article.matchedIndustries = [industryMatch.name];
            }
            
            // Client match - tier-weighted boost
            bd.client = 0;
            article.matchedClients = []; // Always initialize as array
            if (allClients.length > 0) {
                const topClient = allClients[0];
                const clientObj = this.app.clients.find(c => (typeof c === 'string' ? c : c.name) === topClient);
                const clientTier = (clientObj && typeof clientObj === 'object') ? clientObj.tier : 2;
                bd.client = { 1: 0.35, 2: 0.25, 3: 0.15 }[clientTier] || 0.25;
                bd.clientName = topClient;
                score += bd.client;
                article.matchedClient = topClient;
                article.matchedClients = allClients;
            }
            
            // Cross-reference boost
            bd.crossRef = parseFloat(crossRefBoost.toFixed(3));
            score += bd.crossRef;
            
            // Deal relevance scoring layer
            const dealBoost = this.calculateDealRelevance(text, allClients);
            bd.deal = parseFloat(dealBoost.toFixed(3));
            score += bd.deal;
            
            // Feedback drift (capped ±0.15)
            const drift = this.app.sourceScoreDrift[article.sourceName] || 0;
            bd.drift = parseFloat(Math.max(-0.15, Math.min(0.15, drift)).toFixed(3));
            score += bd.drift;
            
            bd.total = parseFloat(Math.min(1, score).toFixed(3));
            article.scoreBreakdown = bd;
            
            // Signal type classification
            article.signalType = this.classifySignalType(text, allClients);
            
            // Estimate reading time
            const wordCount = (article.summary || '').split(/\s+/).length;
            article.estimatedReadingMinutes = Math.max(1, Math.min(10, Math.ceil(wordCount / 150)));
            
            // Normalize property names for rendering consistency
            article.source = article.sourceName;
            article.date = article.publishedDate;
            
            article.relevanceScore = bd.total;
            return article;
        });
    }

    // ==========================================
    // Industry Detection
    // ==========================================

    detectIndustry(text) {
        // Score all industries and return the best match
        let bestMatch = null;
        let bestScore = 0;
        
        for (const industry of this.app.industries) {
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

    // ==========================================
    // Client Detection
    // ==========================================

    detectAllClients(text) {
        // Return all matched client names for an article
        const matches = [];
        const textLower = text.toLowerCase();
        
        for (const clientEntry of this.app.clients) {
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

    // ==========================================
    // Deal Relevance Scoring
    // ==========================================

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

    // ==========================================
    // Signal Type Classification
    // ==========================================

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

    // ==========================================
    // Cross-Reference Detection
    // ==========================================

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

    getCrossRefBoost(article, crossRefs) {
        let boost = 0;
        for (const ref of crossRefs) {
            if (ref.articleIds.includes(article.id)) {
                boost += Math.min(0.15, ref.sourceCount * 0.05);
            }
        }
        return Math.min(0.3, boost);
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

    // ==========================================
    // Article Fingerprinting (for caching)
    // ==========================================

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
}

// =============================================
// Category Weights
// =============================================

const CATEGORIES = {
    "AI & Agentic": { weight: 1.2, emoji: "🤖" },
    "Sovereignty & Regulation": { weight: 1.3, emoji: "🛡️" },
    "APAC Enterprise": { weight: 1.1, emoji: "🌏" },
    "China & Geopolitics": { weight: 1.15, emoji: "🇨🇳" },
    "Competitive Landscape": { weight: 1.1, emoji: "⚔️" },
    "Architecture & Platform": { weight: 1.0, emoji: "🏗️" },
    "Strategic Perspectives": { weight: 1.25, emoji: "💭" },
    "IBM & Partners": { weight: 0.9, emoji: "🔵" }
};

// Made with Bob
