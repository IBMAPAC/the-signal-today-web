/**
 * Executive Relevance Scorer
 * Strategic scoring algorithm for Field CTO intelligence
 * Part of Phase 3: Executive Relevance Scoring
 */

class ExecutiveScorer {
    constructor(clientWatchlist) {
        this.clientWatchlist = clientWatchlist;
        
        // Default scoring weights (adjustable in settings)
        this.weights = {
            tier1Client: 50,      // Tier 1 strategic account mention
            tier2Client: 30,      // Tier 2 growth account mention
            tier3Client: 15,      // Tier 3 emerging account mention
            competitive: 25,      // Competitor + IBM mention
            regulatory: 20,       // Regulatory + APAC mention
            strategic: 15,        // Strategic themes (AI, Cloud, Security)
            recency: 10,          // Published in last 24 hours
            sourceQuality: 10     // Premium source (analyst, vendor)
        };
        
        // Load custom weights from storage
        this.loadWeights();
        
        // Strategic themes
        this.strategicThemes = [
            'artificial intelligence', 'ai', 'machine learning', 'generative ai',
            'hybrid cloud', 'cloud native', 'kubernetes', 'containers',
            'cybersecurity', 'zero trust', 'data security', 'compliance',
            'digital transformation', 'automation', 'devops', 'agile',
            'quantum computing', 'edge computing', 'sustainability'
        ];
        
        // Competitors
        this.competitors = [
            'microsoft', 'azure', 'aws', 'amazon web services', 'google cloud',
            'oracle', 'sap', 'salesforce', 'servicenow', 'vmware'
        ];
        
        // Regulatory keywords
        this.regulatoryKeywords = [
            'regulation', 'compliance', 'gdpr', 'privacy', 'data protection',
            'audit', 'governance', 'risk', 'security standard', 'certification'
        ];
        
        // APAC regions
        this.apacRegions = [
            'asia', 'apac', 'asia pacific', 'singapore', 'australia', 'japan',
            'china', 'india', 'korea', 'asean', 'anz', 'hong kong'
        ];
        
        // Premium sources
        this.premiumSources = [
            'gartner', 'forrester', 'idc', 'mckinsey', 'bcg', 'deloitte',
            'accenture', 'mit', 'harvard', 'stanford', 'techcrunch', 'wired'
        ];
    }

    /**
     * Load custom weights from localStorage
     */
    loadWeights() {
        try {
            const stored = localStorage.getItem('signal_scoring_weights');
            if (stored) {
                const custom = JSON.parse(stored);
                Object.assign(this.weights, custom);
            }
        } catch (error) {
            console.error('Failed to load scoring weights:', error);
        }
    }

    /**
     * Save custom weights to localStorage
     */
    saveWeights() {
        try {
            localStorage.setItem('signal_scoring_weights', JSON.stringify(this.weights));
        } catch (error) {
            console.error('Failed to save scoring weights:', error);
        }
    }

    /**
     * Update scoring weights
     * @param {Object} newWeights - New weight values
     */
    updateWeights(newWeights) {
        Object.assign(this.weights, newWeights);
        this.saveWeights();
    }

    /**
     * Reset weights to defaults
     */
    resetWeights() {
        this.weights = {
            tier1Client: 50,
            tier2Client: 30,
            tier3Client: 15,
            competitive: 25,
            regulatory: 20,
            strategic: 15,
            recency: 10,
            sourceQuality: 10
        };
        this.saveWeights();
    }

    /**
     * Score an article for executive relevance
     * @param {Object} article - Article object
     * @returns {Object} Score and breakdown
     */
    scoreArticle(article) {
        const breakdown = {
            tier1Client: 0,
            tier2Client: 0,
            tier3Client: 0,
            competitive: 0,
            regulatory: 0,
            strategic: 0,
            recency: 0,
            sourceQuality: 0,
            reasons: []
        };

        const text = `${article.title} ${article.summary || ''}`.toLowerCase();
        const source = (article.source || '').toLowerCase();

        // Check Tier 1 clients
        const tier1Clients = this.clientWatchlist.getTier1Clients();
        const tier1Matches = tier1Clients.filter(client => 
            text.includes(client.name.toLowerCase())
        );
        if (tier1Matches.length > 0) {
            breakdown.tier1Client = this.weights.tier1Client;
            breakdown.reasons.push(`Tier 1 Strategic: ${tier1Matches.map(c => c.name).join(', ')}`);
        }

        // Check Tier 2 clients
        const tier2Clients = this.clientWatchlist.clients.tier2 || [];
        const tier2Matches = tier2Clients.filter(client => 
            text.includes(client.name.toLowerCase())
        );
        if (tier2Matches.length > 0 && tier1Matches.length === 0) {
            breakdown.tier2Client = this.weights.tier2Client;
            breakdown.reasons.push(`Tier 2 Growth: ${tier2Matches.map(c => c.name).join(', ')}`);
        }

        // Check Tier 3 clients
        const tier3Clients = this.clientWatchlist.clients.tier3 || [];
        const tier3Matches = tier3Clients.filter(client => 
            text.includes(client.name.toLowerCase())
        );
        if (tier3Matches.length > 0 && tier1Matches.length === 0 && tier2Matches.length === 0) {
            breakdown.tier3Client = this.weights.tier3Client;
            breakdown.reasons.push(`Tier 3 Emerging: ${tier3Matches.map(c => c.name).join(', ')}`);
        }

        // Check competitive + IBM
        const hasCompetitor = this.competitors.some(comp => text.includes(comp));
        const hasIBM = text.includes('ibm') || text.includes('watsonx') || text.includes('red hat');
        if (hasCompetitor && hasIBM) {
            breakdown.competitive = this.weights.competitive;
            const matchedCompetitors = this.competitors.filter(comp => text.includes(comp));
            breakdown.reasons.push(`Competitive: IBM vs ${matchedCompetitors.join(', ')}`);
        }

        // Check regulatory + APAC
        const hasRegulatory = this.regulatoryKeywords.some(keyword => text.includes(keyword));
        const hasAPAC = this.apacRegions.some(region => text.includes(region));
        if (hasRegulatory && hasAPAC) {
            breakdown.regulatory = this.weights.regulatory;
            breakdown.reasons.push('Regulatory: APAC compliance/governance');
        }

        // Check strategic themes
        const matchedThemes = this.strategicThemes.filter(theme => text.includes(theme));
        if (matchedThemes.length > 0) {
            breakdown.strategic = this.weights.strategic;
            breakdown.reasons.push(`Strategic: ${matchedThemes.slice(0, 2).join(', ')}`);
        }

        // Check recency (last 24 hours)
        if (article.pubDate) {
            const pubDate = new Date(article.pubDate);
            const now = new Date();
            const hoursSince = (now - pubDate) / (1000 * 60 * 60);
            if (hoursSince <= 24) {
                breakdown.recency = this.weights.recency;
                breakdown.reasons.push('Recency: Published in last 24 hours');
            }
        }

        // Check source quality
        const isPremiumSource = this.premiumSources.some(premium => source.includes(premium));
        if (isPremiumSource) {
            breakdown.sourceQuality = this.weights.sourceQuality;
            breakdown.reasons.push('Source: Premium analyst/vendor');
        }

        // Calculate total score
        const totalScore = Math.min(100, 
            breakdown.tier1Client +
            breakdown.tier2Client +
            breakdown.tier3Client +
            breakdown.competitive +
            breakdown.regulatory +
            breakdown.strategic +
            breakdown.recency +
            breakdown.sourceQuality
        );

        return {
            score: Math.round(totalScore),
            breakdown,
            reasons: breakdown.reasons
        };
    }

    /**
     * Score multiple articles
     * @param {Array} articles - Array of articles
     * @returns {Array} Articles with scores
     */
    scoreArticles(articles) {
        return articles.map(article => {
            const scoring = this.scoreArticle(article);
            return {
                ...article,
                score: scoring.score,
                scoreBreakdown: scoring.breakdown,
                scoreReasons: scoring.reasons
            };
        });
    }

    /**
     * Get scoring statistics
     * @param {Array} articles - Scored articles
     * @returns {Object} Statistics
     */
    getStatistics(articles) {
        if (articles.length === 0) {
            return {
                avgScore: 0,
                highScore: 0,
                lowScore: 0,
                tier1Count: 0,
                tier2Count: 0,
                tier3Count: 0,
                competitiveCount: 0,
                regulatoryCount: 0
            };
        }

        const scores = articles.map(a => a.score || 0);
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

        return {
            avgScore: Math.round(avgScore),
            highScore: Math.max(...scores),
            lowScore: Math.min(...scores),
            tier1Count: articles.filter(a => a.scoreBreakdown?.tier1Client > 0).length,
            tier2Count: articles.filter(a => a.scoreBreakdown?.tier2Client > 0).length,
            tier3Count: articles.filter(a => a.scoreBreakdown?.tier3Client > 0).length,
            competitiveCount: articles.filter(a => a.scoreBreakdown?.competitive > 0).length,
            regulatoryCount: articles.filter(a => a.scoreBreakdown?.regulatory > 0).length
        };
    }

    /**
     * Get top scoring articles
     * @param {Array} articles - Scored articles
     * @param {number} count - Number to return
     * @returns {Array} Top articles
     */
    getTopArticles(articles, count = 10) {
        return articles
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, count);
    }

    /**
     * Get articles by score range
     * @param {Array} articles - Scored articles
     * @param {number} minScore - Minimum score
     * @param {number} maxScore - Maximum score
     * @returns {Array} Filtered articles
     */
    getArticlesByScoreRange(articles, minScore, maxScore) {
        return articles.filter(a => {
            const score = a.score || 0;
            return score >= minScore && score <= maxScore;
        });
    }

    /**
     * Explain score for an article
     * @param {Object} article - Article with scoring
     * @returns {string} Human-readable explanation
     */
    explainScore(article) {
        if (!article.scoreReasons || article.scoreReasons.length === 0) {
            return 'No specific relevance factors identified.';
        }

        let explanation = `This article scored ${article.score}% because:\n\n`;
        article.scoreReasons.forEach((reason, index) => {
            explanation += `${index + 1}. ${reason}\n`;
        });

        return explanation;
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExecutiveScorer;
}

// Made with Bob
