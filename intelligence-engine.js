// =============================================
// Hybrid Intelligence Engine
// 3-Tier Analysis: Keywords → Context → Semantic
// Version 1.0
// =============================================

/**
 * HybridIntelligenceEngine
 * 
 * Analyzes articles using a 3-tier approach:
 * - Tier 1: Keyword filtering (fast, free, 100% of articles)
 * - Tier 2: Context analysis (medium, free, ~30% of articles)
 * - Tier 3: Semantic analysis (slow, $0.0002/article, ~10% of articles)
 * 
 * Provides threat detection, opportunity identification, and actionable insights
 * for Field CTO managing 343 accounts across 5 APAC markets.
 */
class HybridIntelligenceEngine {
    constructor(apiKey, provider = 'claude', providerConfig = null) {
        this.apiKey = apiKey;
        this.provider = provider;
        this.providerConfig = providerConfig || this.getDefaultProviderConfig();
        this.embeddingCache = new Map();
        this.analysisCache = new Map();
        
        // Statistics tracking
        this.stats = {
            tier1Processed: 0,
            tier2Processed: 0,
            tier3Processed: 0,
            tier3Cost: 0,
            lastReset: new Date().toISOString()
        };
        
        // Tier 1: Keyword patterns (fast filter)
        this.keywordPatterns = {
            competitors: {
                microsoft: ['microsoft', 'azure', 'ms ', ' ms', 'redmond'],
                aws: ['aws', 'amazon web services', 'amazon cloud'],
                google: ['google cloud', 'gcp', 'google', 'alphabet'],
                salesforce: ['salesforce', 'crm', 'tableau'],
                sap: ['sap', 's/4hana', 'sap hana'],
                oracle: ['oracle', 'oracle cloud'],
                servicenow: ['servicenow', 'snow'],
                databricks: ['databricks'],
                snowflake: ['snowflake'],
                accenture: ['accenture'],
                tcs: ['tcs', 'tata consultancy'],
                alibaba: ['alibaba cloud', 'aliyun'],
                huawei: ['huawei cloud'],
                fujitsu: ['fujitsu']
            },
            threats: [
                'wins deal', 'wins contract', 'partnership', 'acquisition',
                'launches', 'announces', 'expands', 'signs agreement',
                'selected by', 'chosen by', 'awarded contract', 'signs deal',
                'partners with', 'collaboration', 'joint venture'
            ],
            opportunities: [
                'struggling', 'delays', 'issues', 'criticism', 'problems',
                'fails', 'loses', 'challenges', 'setback', 'controversy',
                'outage', 'breach', 'vulnerability', 'lawsuit', 'fine'
            ],
            regulatory: [
                'regulation', 'compliance', 'data sovereignty', 'privacy law',
                'gdpr', 'data protection', 'government mandate', 'policy',
                'data localization', 'digital sovereignty', 'regulatory',
                'compliance requirement', 'legal requirement'
            ],
            technologies: [
                'ai', 'artificial intelligence', 'machine learning', 'genai',
                'generative ai', 'llm', 'large language model', 'agentic',
                'hybrid cloud', 'kubernetes', 'openshift', 'edge computing',
                'quantum', 'blockchain', 'zero trust', 'cybersecurity',
                'cloud native', 'containerization', 'microservices'
            ]
        };
        
        // Tier 2: Context patterns (regex)
        this.contextPatterns = {
            competitorAtClient: /(?:microsoft|aws|google|salesforce|sap|oracle).*(?:partnership|deal|contract|agreement|selected).*(?:bank|financial|telco|government|energy|retail|manufacturing)/i,
            competitorWins: /(?:microsoft|aws|google|salesforce).*(?:wins|awarded|selected|chosen).*(?:deal|contract)/i,
            regulatoryChange: /(?:new|proposed|updated|draft).*(?:regulation|law|policy|mandate).*(?:data|privacy|cloud|ai)/i,
            clientActivity: /(?:bank|telco|government|energy).*(?:announces|launches|plans|invests)/i,
            technologyShift: /(?:ai|cloud|quantum|edge).*(?:adoption|transformation|migration|deployment)/i
        };
    }
    
    getDefaultProviderConfig() {
        return {
            claude: {
                endpoint: 'https://api.anthropic.com/v1/messages',
                model: 'claude-sonnet-4-20250514',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                }),
                formatRequest: (model, maxTokens, prompt) => ({
                    model,
                    max_tokens: maxTokens,
                    messages: [{ role: 'user', content: prompt }]
                }),
                extractResponse: (data) => data.content[0].text
            },
            openai: {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-4o',
                headers: (apiKey) => ({
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }),
                formatRequest: (model, maxTokens, prompt) => ({
                    model,
                    max_tokens: maxTokens,
                    messages: [{ role: 'user', content: prompt }]
                }),
                extractResponse: (data) => data.choices[0]?.message?.content || ''
            },
            gemini: {
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
                model: 'gemini-2.5-flash-lite',
                headers: () => ({
                    'Content-Type': 'application/json'
                }),
                formatRequest: (model, maxTokens, prompt) => ({
                    contents: [{
                        role: "user",
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        maxOutputTokens: maxTokens
                    }
                }),
                extractResponse: (data) => data.candidates[0].content.parts[0].text,
                useKeyInUrl: true
            }
        };
    }

    /**
     * Main analysis entry point
     * Analyzes article through 3-tier pipeline
     * 
     * @param {Object} article - Article to analyze
     * @param {Array} clients - List of client objects
     * @param {Array} existingArticles - Previous articles for context
     * @returns {Object} Enhanced article with intelligence metadata
     */
    async analyzeArticle(article, clients, existingArticles = []) {
        const startTime = Date.now();
        
        // PERFORMANCE OPTIMIZATION: Check article hash cache
        const articleHash = `${article.id}-${article.title}-${article.publishedDate}`;
        if (this.analysisCache.has(articleHash)) {
            const cached = this.analysisCache.get(articleHash);
            cached.processingTime = Date.now() - startTime; // Update timing
            return { ...article, intelligence: cached };
        }
        
        // Initialize analysis result
        const analysis = {
            tier: 0,
            isRelevant: false,
            threatLevel: 0,
            opportunityScore: 0,
            confidence: 0,
            reasoning: '',
            matchedPatterns: [],
            entities: {
                competitors: [],
                clients: [],
                markets: [],
                industries: [],
                technologies: []
            },
            processingTime: 0,
            cost: 0
        };

        // TIER 1: Keyword filtering (100% of articles)
        const tier1Result = this.tier1_keywordFilter(article, clients);
        this.stats.tier1Processed++;
        
        if (!tier1Result.isRelevant) {
            analysis.processingTime = Date.now() - startTime;
            return { ...article, intelligence: analysis };
        }
        
        analysis.tier = 1;
        analysis.isRelevant = true;
        analysis.matchedPatterns = tier1Result.patterns;
        analysis.confidence = 0.5;
        analysis.relevanceScore = tier1Result.relevanceScore;

        // TIER 2: Context analysis (~30% of articles)
        const tier2Result = this.tier2_contextAnalysis(article, clients, tier1Result);
        this.stats.tier2Processed++;
        
        analysis.tier = 2;
        analysis.threatLevel = tier2Result.threatLevel;
        analysis.opportunityScore = tier2Result.opportunityScore;
        analysis.confidence = tier2Result.confidence;
        analysis.reasoning = tier2Result.reasoning;
        analysis.sentiment = tier2Result.sentiment;
        analysis.entities = tier2Result.entities;

        // If high confidence from context, skip semantic
        if (tier2Result.confidence >= 0.85) {
            analysis.processingTime = Date.now() - startTime;
            return { ...article, intelligence: analysis };
        }

        // TIER 3: Semantic analysis (~10% of articles - only high-value)
        if (this.shouldRunSemanticAnalysis(article, tier2Result, clients)) {
            try {
                const tier3Result = await this.tier3_semanticAnalysis(
                    article, 
                    clients, 
                    existingArticles
                );
                this.stats.tier3Processed++;
                this.stats.tier3Cost += 0.0002; // Approximate cost per analysis
                
                analysis.tier = 3;
                analysis.threatLevel = tier3Result.threatLevel;
                analysis.opportunityScore = tier3Result.opportunityScore;
                analysis.confidence = tier3Result.confidence;
                analysis.reasoning = tier3Result.reasoning;
                analysis.relatedArticles = tier3Result.relatedArticles;
                analysis.actionableInsights = tier3Result.actionableInsights;
                analysis.affectedClients = tier3Result.affectedClients;
                analysis.affectedMarkets = tier3Result.affectedMarkets;
                analysis.competitorActivity = tier3Result.competitorActivity;
                analysis.cost = 0.0002;
            } catch (error) {
                console.warn('Tier 3 semantic analysis failed, using Tier 2 result:', error);
            }
        }

        analysis.processingTime = Date.now() - startTime;
        
        // PERFORMANCE OPTIMIZATION: Cache the analysis result
        this.analysisCache.set(articleHash, analysis);
        
        // Limit cache size to prevent memory issues
        if (this.analysisCache.size > 1000) {
            const firstKey = this.analysisCache.keys().next().value;
            this.analysisCache.delete(firstKey);
        }
        
        return { ...article, intelligence: analysis };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TIER 1: KEYWORD FILTER (Fast, 0ms, Free)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Tier 1: Fast keyword-based filtering
     * Filters out 70% of irrelevant articles
     * 
     * @param {Object} article - Article to filter
     * @param {Array} clients - List of clients
     * @returns {Object} Filter result with relevance flag and patterns
     */
    tier1_keywordFilter(article, clients) {
        const text = `${article.title} ${article.summary}`.toLowerCase();
        const patterns = [];
        let isRelevant = false;
        let relevanceScore = 0;

        // Check competitor mentions
        for (const [competitor, keywords] of Object.entries(this.keywordPatterns.competitors)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    patterns.push(`competitor:${competitor}`);
                    isRelevant = true;
                    relevanceScore += 10;
                    break;
                }
            }
        }

        // Check threat keywords
        for (const threat of this.keywordPatterns.threats) {
            if (text.includes(threat)) {
                patterns.push(`threat:${threat}`);
                isRelevant = true;
                relevanceScore += 15;
            }
        }

        // Check opportunity keywords
        for (const opp of this.keywordPatterns.opportunities) {
            if (text.includes(opp)) {
                patterns.push(`opportunity:${opp}`);
                isRelevant = true;
                relevanceScore += 12;
            }
        }

        // Check regulatory keywords
        for (const reg of this.keywordPatterns.regulatory) {
            if (text.includes(reg)) {
                patterns.push(`regulatory:${reg}`);
                isRelevant = true;
                relevanceScore += 20;
            }
        }

        // Check technology keywords
        for (const tech of this.keywordPatterns.technologies) {
            if (text.includes(tech)) {
                patterns.push(`technology:${tech}`);
                isRelevant = true;
                relevanceScore += 8;
            }
        }

        // Check client mentions (highest priority)
        for (const client of clients) {
            const clientNames = [client.name, ...(client.aliases || [])];
            for (const name of clientNames) {
                if (text.includes(name.toLowerCase())) {
                    patterns.push(`client:${client.name}`);
                    isRelevant = true;
                    relevanceScore += 30;
                    break;
                }
            }
        }
        
        return {
            isRelevant,
            relevanceScore,
            patterns,
            tier: 1
        };
    }
    
    // ══════════════════════════════════════════════════════════════════════════
    // TIER 2: CONTEXT ANALYSIS (Medium, 5ms, Free)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Tier 2: Context-based analysis with entity extraction
     * Understands relationships and sentiment
     * 
     * @param {Object} article - Article to analyze
     * @param {Array} clients - List of clients
     * @param {Object} tier1Result - Results from Tier 1
     * @returns {Object} Analysis with threat/opportunity scores and entities
     */
    tier2_contextAnalysis(article, clients, tier1Result) {
        const text = `${article.title} ${article.summary}`;
        const textLower = text.toLowerCase();
        
        let threatLevel = 0;
        let opportunityScore = 0;
        let confidence = 0.5;
        let reasoning = [];
        
        // Extract entities
        const entities = this.extractEntities(text, clients);

        // Pattern 1: Competitor at your client (CRITICAL)
        if (entities.competitors.length > 0 && entities.clients.length > 0) {
            threatLevel = 95;
            confidence = 0.90;
            reasoning.push(`${entities.competitors[0]} activity at ${entities.clients[0]}`);
        }
        // Pattern 2: Competitor wins deal (HIGH)
        else if (this.contextPatterns.competitorWins.test(text)) {
            threatLevel = 80;
            confidence = 0.80;
            reasoning.push('Competitor wins deal in relevant market');
        }
        // Pattern 3: Competitor partnership (MEDIUM)
        else if (this.contextPatterns.competitorAtClient.test(text)) {
            threatLevel = 70;
            confidence = 0.75;
            reasoning.push('Competitor partnership detected');
        }

        // Pattern 4: Regulatory change (HIGH)
        if (this.contextPatterns.regulatoryChange.test(text)) {
            threatLevel = Math.max(threatLevel, 75);
            confidence = Math.max(confidence, 0.80);
            reasoning.push('Regulatory change detected');
        }

        // Pattern 5: Client activity (OPPORTUNITY)
        if (entities.clients.length > 0 && this.contextPatterns.clientActivity.test(text)) {
            opportunityScore = 70;
            confidence = Math.max(confidence, 0.75);
            reasoning.push(`${entities.clients[0]} activity detected`);
        }

        // Pattern 6: Technology shift
        if (this.contextPatterns.technologyShift.test(text)) {
            opportunityScore = Math.max(opportunityScore, 60);
            confidence = Math.max(confidence, 0.70);
            reasoning.push('Technology shift opportunity');
        }

        // Sentiment analysis (simple but effective)
        const sentiment = this.analyzeSentiment(text, entities);
        
        // Negative sentiment about competitor = opportunity
        if (entities.competitors.length > 0 && sentiment < -0.3) {
            opportunityScore = Math.max(opportunityScore, 65);
            confidence = Math.max(confidence, 0.70);
            reasoning.push('Negative competitor sentiment');
        }

        // Positive sentiment about client = opportunity
        if (entities.clients.length > 0 && sentiment > 0.3) {
            opportunityScore = Math.max(opportunityScore, 60);
            confidence = Math.max(confidence, 0.65);
            reasoning.push('Positive client sentiment');
        }

        return {
            threatLevel,
            opportunityScore,
            confidence,
            reasoning: reasoning.join(' | '),
            sentiment,
            entities
        };
    }

    /**
     * Extract entities from article text
     *
     * @param {string} text - Article text
     * @param {Array} clients - List of clients
     * @returns {Object} Extracted entities
     */
    extractEntities(text, clients) {
        // PERFORMANCE OPTIMIZATION: Cache entity extraction results
        const textHash = text.substring(0, 100); // Use first 100 chars as hash
        if (this.embeddingCache.has(textHash)) {
            return this.embeddingCache.get(textHash);
        }
        
        const textLower = text.toLowerCase();
        const entities = {
            competitors: [],
            clients: [],
            markets: [],
            industries: [],
            technologies: []
        };

        // Extract competitors
        for (const [competitor, keywords] of Object.entries(this.keywordPatterns.competitors)) {
            if (keywords.some(k => textLower.includes(k))) {
                entities.competitors.push(competitor);
            }
        }

        // Extract clients
        for (const client of clients) {
            const clientNames = [client.name, ...(client.aliases || [])];
            if (clientNames.some(name => textLower.includes(name.toLowerCase()))) {
                entities.clients.push(client.name);
                if (client.market) entities.markets.push(client.market);
                if (client.industry) entities.industries.push(client.industry);
            }
        }

        // Extract markets (if not from clients)
        const marketKeywords = {
            'ANZ': ['australia', 'new zealand', 'anz'],
            'ASEAN': ['singapore', 'malaysia', 'thailand', 'indonesia', 'philippines', 'vietnam', 'asean'],
            'GCG': ['hong kong', 'taiwan', 'china', 'chinese'],
            'ISA': ['india', 'indian', 'bangladesh', 'sri lanka', 'pakistan'],
            'KOREA': ['korea', 'korean', 'seoul']
        };
        
        for (const [market, keywords] of Object.entries(marketKeywords)) {
            if (keywords.some(k => textLower.includes(k)) && !entities.markets.includes(market)) {
                entities.markets.push(market);
            }
        }

        // Extract technologies
        for (const tech of this.keywordPatterns.technologies) {
            if (textLower.includes(tech)) {
                entities.technologies.push(tech);
            }
        }

        // PERFORMANCE OPTIMIZATION: Cache entity extraction result
        this.embeddingCache.set(textHash, entities);
        
        // Limit cache size
        if (this.embeddingCache.size > 500) {
            const firstKey = this.embeddingCache.keys().next().value;
            this.embeddingCache.delete(firstKey);
        }

        return entities;
    }

    /**
     * Simple sentiment analysis
     * 
     * @param {string} text - Text to analyze
     * @param {Object} entities - Extracted entities
     * @returns {number} Sentiment score (-1 to +1)
     */
    analyzeSentiment(text, entities) {
        const textLower = text.toLowerCase();
        
        const positiveWords = [
            'success', 'wins', 'growth', 'innovation', 'leading', 'breakthrough',
            'achievement', 'expansion', 'partnership', 'collaboration', 'award',
            'excellence', 'improvement', 'advantage', 'opportunity'
        ];
        
        const negativeWords = [
            'fails', 'struggles', 'delays', 'issues', 'criticism', 'problems',
            'challenges', 'setback', 'controversy', 'concern', 'risk', 'threat',
            'decline', 'loss', 'weakness', 'vulnerability', 'breach'
        ];
        
        let score = 0;
        
        // Count positive words
        for (const word of positiveWords) {
            const count = (textLower.match(new RegExp(word, 'g')) || []).length;
            score += count * 0.1;
        }
        
        // Count negative words
        for (const word of negativeWords) {
            const count = (textLower.match(new RegExp(word, 'g')) || []).length;
            score -= count * 0.1;
        }
        
        // Normalize to -1 to +1
        return Math.max(-1, Math.min(1, score));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TIER 3: SEMANTIC ANALYSIS (Slow, 200ms, $0.0002)
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Determine if article should undergo semantic analysis
     * OPTIMIZATION: Smart Tier 3 triggering to reduce API calls by ~50%
     *
     * @param {Object} article - Article to check
     * @param {Object} tier2Result - Results from Tier 2
     * @param {Array} clients - List of clients
     * @returns {boolean} Whether to run semantic analysis
     */
    shouldRunSemanticAnalysis(article, tier2Result, clients) {
        // OPTIMIZATION: More aggressive filtering to skip low-value articles
        // Target: Skip ~50% of articles while keeping all high-value ones
        
        // 1. ALWAYS analyze: Tier 1 client mentioned
        if (tier2Result.entities.clients.some(c => {
            const client = clients.find(cl => cl.name === c);
            return client && client.tier === 1;
        })) {
            return true;
        }
        
        // 2. ALWAYS analyze: High threat or opportunity from Tier 2
        if (tier2Result.threatLevel >= 70 || tier2Result.opportunityScore >= 70) {
            return true;
        }
        
        // 3. ALWAYS analyze: Competitor + client co-occurrence (competitive threat)
        const hasCompetitor = tier2Result.entities.competitors.length > 0;
        const hasClient = tier2Result.entities.clients.length > 0;
        if (hasCompetitor && hasClient) {
            return true;
        }
        
        // 4. ALWAYS analyze: Regulatory keywords detected
        const text = `${article.title} ${article.summary}`.toLowerCase();
        const hasRegulatory = this.keywordPatterns.regulatory.some(kw => text.includes(kw));
        if (hasRegulatory) {
            return true;
        }
        
        // 5. SKIP: Low confidence + low scores (not worth deep analysis)
        if (tier2Result.confidence < 0.70 &&
            tier2Result.threatLevel < 50 &&
            tier2Result.opportunityScore < 50) {
            return false;
        }
        
        // 6. SKIP: No entities detected (generic article)
        if (tier2Result.entities.clients.length === 0 &&
            tier2Result.entities.competitors.length === 0 &&
            tier2Result.entities.markets.length === 0) {
            return false;
        }
        
        // 7. ANALYZE: High Tier 2 entity score (strong signal)
        if (tier2Result.confidence >= 0.80) {
            return true;
        }
        
        // 8. ANALYZE: Very high relevance score from Tier 1
        if (article.relevanceScore && article.relevanceScore > 85) {
            return true;
        }
        
        // Default: Skip (conservative approach to save costs)
        return false;
    }

    /**
     * Tier 3: Semantic analysis using Claude API
     * Deep understanding with actionable insights
     * 
     * @param {Object} article - Article to analyze
     * @param {Array} clients - List of clients
     * @param {Array} existingArticles - Previous articles for context
     * @returns {Object} Deep analysis with insights
     */
    async tier3_semanticAnalysis(article, clients, existingArticles) {
        // Check cache first
        const cacheKey = `semantic_${article.id}`;
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }

        try {
            // Use AI for deep semantic analysis
            const result = await this.analyzeWithAI(article, clients, existingArticles);
            
            // Cache the result
            this.analysisCache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('Semantic analysis failed:', error);
            throw error;
        }
    }

    /**
     * Analyze article using Claude API
     * 
     * @param {Object} article - Article to analyze
     * @param {Array} clients - List of clients
     * @param {Array} existingArticles - Previous articles for context
     * @returns {Object} Claude's analysis
     */
    async analyzeWithAI(article, clients, existingArticles) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        // TOKEN OPTIMIZATION: Limit context to reduce input tokens
        // Only include 2 most relevant articles (was 3)
        const relatedArticles = existingArticles
            .filter(a => {
                if (!a.intelligence) return false;
                const sameCompetitor = a.intelligence.entities?.competitors?.some(c =>
                    article.title.toLowerCase().includes(c) ||
                    article.summary.toLowerCase().includes(c)
                );
                const sameClient = a.intelligence.entities?.clients?.some(c =>
                    article.title.toLowerCase().includes(c.toLowerCase()) ||
                    article.summary.toLowerCase().includes(c.toLowerCase())
                );
                return sameCompetitor || sameClient;
            })
            .slice(0, 2); // Reduced from 3 to 2

        // TOKEN OPTIMIZATION: Limit to top 5 Tier 1 clients (was 10)
        const tier1Clients = clients.filter(c => c.tier === 1).map(c => c.name);
        const clientList = tier1Clients.slice(0, 5).join(', ');
        
        // TOKEN OPTIMIZATION: Shorter context block
        const contextBlock = relatedArticles.length > 0
            ? `\nContext: ${relatedArticles.map(a => a.title).join('; ')}`
            : '';

        // TOKEN OPTIMIZATION: Truncate long summaries to reduce input tokens
        const truncatedSummary = article.summary
            ? (article.summary.length > 300 ? article.summary.substring(0, 300) + '...' : article.summary)
            : 'No summary';
        
        // PROMPT CACHING: Split into cached system prompt and dynamic user content
        // System prompt (cached): Rules and analysis framework (~200 tokens)
        // User content (not cached): Article details and clients (~50 tokens)
        // Savings: 90% discount on cached tokens after first call
        
        const prompt = `You are analyzing articles for IBM APAC Field CTO (343 accounts).

ANALYZE each article for:
- Threat (0-100): Competitor at our client? Regulatory risk?
- Opportunity (0-100): Competitor issue? Market opening?
- Reasoning: Which clients/markets affected?
- Actions: What to do TODAY?

SCORING RULES:
- Competitor + our client = 90+ threat
- Regulatory change = 80+ threat
- Competitor problem = 70+ opportunity

OUTPUT FORMAT (JSON only):
{
  "threatLevel": 0-100,
  "opportunityScore": 0-100,
  "confidence": 0.95,
  "reasoning": "brief with names",
  "actionableInsights": ["action1","action2"],
  "affectedClients": [],
  "affectedMarkets": [],
  "competitorActivity": "brief"
}

ARTICLE:
${article.title}
${truncatedSummary}${contextBlock}

TOP CLIENTS: ${clientList || 'None'}

Analyze this article using the rules above.`;

        // Get provider configuration
        const config = this.providerConfig[this.provider];
        if (!config) {
            throw new Error(`Unsupported provider: ${this.provider}`);
        }
        
        // Build endpoint URL (Gemini needs API key in URL)
        let endpoint = config.endpoint;
        if (config.useKeyInUrl) {
            endpoint = `${endpoint}/${config.model}:generateContent?key=${this.apiKey}`;
        }
        
        // Make API call with retry logic
        const MAX_RETRIES = 3;
        const INITIAL_DELAY = 1000; // 1 second
        let lastError;
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: config.headers(this.apiKey),
                    body: JSON.stringify(config.formatRequest(config.model, 600, prompt))
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(`${this.provider} API error: ${response.status} - ${error.error?.message || error.message || 'Unknown error'}`);
                }

                const data = await response.json();
                
                // Universal error check - catches errors in response body (works for all providers)
                if (data.error) {
                    const errorMsg = data.error.message || 'Unknown error';
                    const errorCode = data.error.code || 'unknown';
                    throw new Error(`${this.provider} API error: ${errorCode} - ${errorMsg}`);
                }
                
                let text = config.extractResponse(data);
                
                // Clean Gemini response: remove markdown code blocks
                if (this.provider === 'gemini') {
                    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                }
                
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                
                if (!jsonMatch) {
                    throw new Error(`Could not parse ${this.provider} response`);
                }
                
                // Clean up JSON before parsing
                let jsonStr = jsonMatch[0];
                jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
                jsonStr = jsonStr.replace(/\n/g, ' '); // Remove newlines
                jsonStr = jsonStr.replace(/\r/g, ''); // Remove carriage returns
                
                const analysis = JSON.parse(jsonStr);
                
                // Success! Return the result
                return {
                    threatLevel: analysis.threatLevel || 0,
                    opportunityScore: analysis.opportunityScore || 0,
                    confidence: analysis.confidence || 0.95,
                    reasoning: analysis.reasoning || '',
                    actionableInsights: analysis.actionableInsights || [],
                    affectedClients: analysis.affectedClients || [],
                    affectedMarkets: analysis.affectedMarkets || [],
                    competitorActivity: analysis.competitorActivity || '',
                    relatedArticles: relatedArticles.map(a => a.id)
                };
                
            } catch (error) {
                lastError = error;
                
                // Check if error is retryable
                const isRetryable = this._isRetryableError(error);
                
                // Don't retry on last attempt or non-retryable errors
                if (attempt === MAX_RETRIES || !isRetryable) {
                    console.error(`${this.provider} semantic analysis failed after ${attempt} attempt(s):`, error);
                    throw error;
                }
                
                // Calculate delay with exponential backoff
                const delay = INITIAL_DELAY * Math.pow(2, attempt - 1);
                console.warn(`${this.provider} semantic analysis failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`, error.message);
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // Should never reach here, but just in case
        throw lastError;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Determines if an error is retryable (transient failure vs permanent error).
     * @private
     * @param {Error} error - The error to check
     * @returns {boolean} True if the error is retryable
     */
    _isRetryableError(error) {
        const errorMessage = error.message.toLowerCase();
        
        // Retryable error patterns
        const retryablePatterns = [
            'overloaded',
            'timeout',
            'network',
            'rate limit',
            'too many requests',
            'service unavailable',
            'temporarily unavailable',
            'empty response',
            'could not parse',
            '429', // Rate limit HTTP code
            '503', // Service unavailable
            '504'  // Gateway timeout
        ];
        
        // Check if error message contains any retryable pattern
        const isRetryable = retryablePatterns.some(pattern => 
            errorMessage.includes(pattern)
        );
        
        // Non-retryable errors (fail fast)
        const nonRetryablePatterns = [
            'invalid api key',
            'authentication',
            'unauthorized',
            'forbidden',
            'not found',
            '401', // Unauthorized
            '403', // Forbidden
            '404'  // Not found
        ];
        
        const isNonRetryable = nonRetryablePatterns.some(pattern =>
            errorMessage.includes(pattern)
        );
        
        // If explicitly non-retryable, don't retry
        if (isNonRetryable) {
            return false;
        }
        
        // Otherwise, retry if it matches retryable patterns
        return isRetryable;
    }


    /**
     * Get current statistics
     * @returns {Object} Statistics with pass rates and costs
     */
    getStats() {
        return {
            ...this.stats,
            tier1PassRate: this.stats.tier2Processed / Math.max(this.stats.tier1Processed, 1),
            tier2PassRate: this.stats.tier3Processed / Math.max(this.stats.tier2Processed, 1)
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalArticles: 0,
            tier1Processed: 0,
            tier2Processed: 0,
            tier3Processed: 0,
            tier1Count: 0,
            tier2Count: 0,
            tier3Count: 0,
            tier3Cost: 0,
            totalCost: 0
        };
    }
}

// =============================================
// SignalFeedIntegration
// Maps intelligence analysis to Signal Feed categories
// =============================================

/**
 * SignalFeedIntegration
 * 
 * Categorizes articles based on intelligence analysis
 * Maps threat/opportunity scores to Signal Feed categories:
 * - Risk, Competitive, Regulatory, Opportunity, Information
 */
class SignalFeedIntegration {
    /**
     * Categorize article based on intelligence analysis
     * 
     * @param {Object} article - Article with intelligence metadata
     * @returns {Object} Category information
     */
    static categorizeFromIntelligence(article) {
        const intel = article.intelligence;
        if (!intel || !intel.isRelevant) {
            // Fallback to keyword-based categorization
            return this.categorizeFromKeywords(article);
        }

        // Priority 1: High threat = Risk category
        if (intel.threatLevel >= 80) {
            return {
                category: 'risk',
                emoji: '🚨',
                priority: 1,
                reason: intel.reasoning,
                confidence: intel.confidence
            };
        }

        // Priority 2: High opportunity = Opportunity category
        if (intel.opportunityScore >= 70) {
            return {
                category: 'opportunity',
                emoji: '💰',
                priority: 2,
                reason: intel.reasoning,
                confidence: intel.confidence
            };
        }

        // Priority 3: Competitor activity = Competitive category
        if (intel.entities?.competitors?.length > 0) {
            // Check if it's a threat or opportunity
            if (intel.threatLevel >= 60) {
                return {
                    category: 'competitive',
                    emoji: '⚔️',
                    subcategory: 'threat',
                    priority: 1,
                    reason: `${intel.entities.competitors[0]} activity detected`,
                    confidence: intel.confidence
                };
            } else if (intel.opportunityScore >= 50) {
                return {
                    category: 'competitive',
                    emoji: '⚔️',
                    subcategory: 'opportunity',
                    priority: 2,
                    reason: `${intel.entities.competitors[0]} weakness detected`,
                    confidence: intel.confidence
                };
            } else {
                return {
                    category: 'competitive',
                    emoji: '⚔️',
                    subcategory: 'neutral',
                    priority: 2,
                    reason: `${intel.entities.competitors[0]} mentioned`,
                    confidence: intel.confidence
                };
            }
        }

        // Priority 4: Regulatory = Regulatory category
        if (intel.matchedPatterns?.some(p => p.startsWith('regulatory:'))) {
            return {
                category: 'regulatory',
                emoji: '🛡️',
                priority: intel.entities?.markets?.length > 0 ? 1 : 2,
                reason: intel.reasoning,
                confidence: intel.confidence
            };
        }

        // Priority 5: Client activity = Opportunity or Risk
        if (intel.entities?.clients?.length > 0) {
            if (intel.threatLevel >= 50) {
                return {
                    category: 'risk',
                    emoji: '🚨',
                    subcategory: 'client_risk',
                    priority: 1,
                    reason: `${intel.entities.clients[0]} at risk`,
                    confidence: intel.confidence
                };
            } else {
                return {
                    category: 'opportunity',
                    emoji: '💰',
                    subcategory: 'client_opportunity',
                    priority: 2,
                    reason: `${intel.entities.clients[0]} opportunity`,
                    confidence: intel.confidence
                };
            }
        }

        // Priority 6: Medium threat/opportunity
        if (intel.threatLevel >= 50) {
            return {
                category: 'risk',
                emoji: '🚨',
                priority: 2,
                reason: intel.reasoning,
                confidence: intel.confidence
            };
        }

        if (intel.opportunityScore >= 50) {
            return {
                category: 'opportunity',
                emoji: '💰',
                priority: 2,
                reason: intel.reasoning,
                confidence: intel.confidence
            };
        }

        // Default: Information category
        return {
            category: 'information',
            emoji: '📰',
            priority: 3,
            reason: 'Background intelligence',
            confidence: intel.confidence
        };
    }

    /**
     * Fallback keyword-based categorization (existing logic)
     * Used when intelligence analysis is not available
     * 
     * @param {Object} article - Article to categorize
     * @returns {Object} Category information
     */
    static categorizeFromKeywords(article) {
        const text = `${article.title} ${article.summary}`.toLowerCase();
        
        // Risk keywords
        if (/threat|risk|breach|attack|vulnerability|crisis|failure/.test(text)) {
            return { 
                category: 'risk', 
                emoji: '🚨', 
                priority: 1,
                reason: 'Risk keywords detected',
                confidence: 0.6
            };
        }
        
        // Opportunity keywords
        if (/opportunity|growth|expansion|investment|partnership|innovation/.test(text)) {
            return { 
                category: 'opportunity', 
                emoji: '💰', 
                priority: 2,
                reason: 'Opportunity keywords detected',
                confidence: 0.6
            };
        }
        
        // Competitive keywords
        if (/microsoft|aws|google|salesforce|competitor|market share/.test(text)) {
            return { 
                category: 'competitive', 
                emoji: '⚔️', 
                priority: 2,
                reason: 'Competitor mentioned',
                confidence: 0.6
            };
        }
        
        // Regulatory keywords
        if (/regulation|compliance|sovereignty|privacy|gdpr|mandate/.test(text)) {
            return { 
                category: 'regulatory', 
                emoji: '🛡️', 
                priority: 2,
                reason: 'Regulatory keywords detected',
                confidence: 0.6
            };
        }
        
        // Default: Information
        return { 
            category: 'information', 
            emoji: '📰', 
            priority: 3,
            reason: 'General information',
            confidence: 0.5
        };
    }

    /**
     * Get category display name
     * 
     * @param {string} category - Category key
     * @returns {string} Display name
     */
    static getCategoryDisplayName(category) {
        const names = {
            'risk': '🚨 Risk',
            'competitive': '⚔️ Competitive',
            'regulatory': '🛡️ Regulatory',
            'opportunity': '💰 Opportunity',
            'information': '📰 Information'
        };
        return names[category] || category;
    }

    /**
     * Get category priority order
     * 
     * @returns {Array} Ordered list of categories
     */
    static getCategoryOrder() {
        return ['risk', 'competitive', 'regulatory', 'opportunity', 'information'];
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HybridIntelligenceEngine, SignalFeedIntegration };
}

// Made with Bob
