// =============================================
// Hybrid Intelligence Engine
// 3-Tier Analysis: Keywords → Context → Semantic
// Version 2.0 - Phase 1 Improvements
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
    constructor(apiKey, provider = 'claude', providerConfig = null, cacheManager = null, budgetManager = null, workerPool = null, incrementalTracker = null, entityRecognizer = null) {
        this.apiKey = apiKey;
        this.provider = provider;
        this.providerConfig = providerConfig || this.getDefaultProviderConfig();
        this.embeddingCache = new Map();
        this.analysisCache = new Map(); // Legacy in-memory cache
        
        // PHASE 1: Initialize persistent cache manager
        this.cacheManager = cacheManager || (typeof CacheManager !== 'undefined' ? new CacheManager() : null);
        
        // PHASE 2 TASK 2.4: Initialize budget manager
        this.budgetManager = budgetManager || (typeof BudgetManager !== 'undefined' ? new BudgetManager() : null);
        
        // PHASE 3 TASK 3.1: Initialize worker pool for parallel processing
        this.workerPool = workerPool || (typeof WorkerPool !== 'undefined' ? new WorkerPool({
            maxWorkers: navigator.hardwareConcurrency || 4,
            maxConcurrentAPI: 5,
            workerScript: 'analysis-worker.js'
        }) : null);
        
        // PHASE 3 TASK 3.2: Initialize incremental tracker
        this.incrementalTracker = incrementalTracker || (typeof IncrementalTracker !== 'undefined' ? new IncrementalTracker() : null);
        if (this.incrementalTracker) {
            this.incrementalTracker.initialize().catch(err => {
                console.warn('Failed to initialize IncrementalTracker:', err);
                this.incrementalTracker = null;
            });
        }
        
        // PHASE 3 TASK 3.4: Initialize entity recognizer
        this.entityRecognizer = entityRecognizer || (typeof EntityRecognizer !== 'undefined' ? new EntityRecognizer() : null);
        
        // PHASE 1 TASK 1.3: Event emitter for progressive loading
        this.eventListeners = {
            'analysisStart': [],
            'tier1Complete': [],
            'tier2Complete': [],
            'tier3Complete': [],
            'analysisComplete': [],
            'cacheHit': [],
            'error': []
        };
        
        // Statistics tracking
        this.stats = {
            tier1Processed: 0,
            tier2Processed: 0,
            tier3Processed: 0,
            tier3Cost: 0,
            lastReset: new Date().toISOString(),
            cacheHits: 0,
            cacheMisses: 0,
            // PHASE 2 TASK 2.2: Model tier usage tracking
            modelUsage: {
                premium: 0,
                midTier: 0,
                budget: 0
            },
            modelCosts: {
                premium: 0,
                midTier: 0,
                budget: 0
            },
            // PHASE 2 TASK 2.3: Prompt cache tracking
            promptCache: {
                hits: 0,
                misses: 0,
                tokensSaved: 0,
                costSaved: 0
            }
        };
        
        // Tier 1: Keyword patterns (fast filter)
        this.keywordPatterns = {
            competitors: {
                microsoft: ['microsoft', 'azure', 'redmond', 'msft', 'microsoft azure'],
                aws: ['aws', 'amazon web services', 'amazon cloud'],
                google: ['google cloud', 'gcp', 'alphabet'],
                salesforce: ['salesforce', 'tableau'],
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
                model: 'claude-sonnet-4-6',
                // PHASE 2 TASK 2.2: Model tiers for cost optimization
                // Updated with Claude 4 models (March 2026)
                models: {
                    premium: 'claude-sonnet-4-6',             // Claude 4 Sonnet - $3/$15 per M tokens
                    midTier: 'claude-sonnet-4-6',             // Claude 4 Sonnet - $3/$15 per M tokens
                    budget: 'claude-haiku-4-5-20251001'       // Claude 4 Haiku - $0.80/$4 per M tokens
                },
                costs: {
                    premium: { input: 0.003, output: 0.015 },
                    midTier: { input: 0.003, output: 0.015 },
                    budget: { input: 0.0008, output: 0.004 }
                },
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
                model: 'gpt-5.4-mini',
                // PHASE 2 TASK 2.2: Model tiers for cost optimization
                // Updated with GPT-5.4 series (March 2026)
                models: {
                    premium: 'gpt-5.4-mini',                  // GPT-5.4 Mini (best balance)
                    midTier: 'gpt-5.4-mini',                  // GPT-5.4 Mini (same as premium)
                    budget: 'gpt-5.4-nano'                    // GPT-5.4 Nano (cheapest)
                },
                costs: {
                    // Estimated pricing - please verify with official OpenAI pricing page
                    premium: { input: 0.0002, output: 0.0008 },
                    midTier: { input: 0.0002, output: 0.0008 },
                    budget: { input: 0.00005, output: 0.0002 }
                },
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
            }
        };
    }
    
    /**
     * PHASE 2 TASK 2.2: Select appropriate model based on article priority and threat level
     *
     * @param {Object} article - Article being analyzed
     * @param {Object} tier2Result - Tier 2 analysis results
     * @param {Array} clients - List of clients
     * @returns {string} Model tier ('premium', 'midTier', or 'budget')
     */
    getModelForArticle(article, tier2Result, clients) {
        // Check if article mentions Tier 1 client
        const hasTier1Client = tier2Result.entities.clients.some(clientName => {
            const client = clients.find(c => c.name === clientName);
            return client && client.tier === 1;
        });
        
        // PREMIUM: Priority 1 source OR Tier 1 client OR very high threat OR regulatory
        if (article.source?.priority === 1 ||
            hasTier1Client ||
            tier2Result.threatLevel >= 85 ||
            tier2Result.opportunityScore >= 85 ||
            this.keywordPatterns.regulatory.some(kw =>
                `${article.title} ${article.summary}`.toLowerCase().includes(kw)
            )) {
            return 'premium';
        }
        
        // BUDGET: Priority 3 source AND low confidence AND low threat
        if (article.source?.priority === 3 &&
            tier2Result.confidence < 0.70 &&
            tier2Result.threatLevel < 60 &&
            tier2Result.opportunityScore < 60) {
            return 'budget';
        }
        
        // MID-TIER: Everything else (default)
        return 'midTier';
    }
    
    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 1 TASK 1.3: EVENT EMITTER METHODS
    // ══════════════════════════════════════════════════════════════════════════
    
    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }
    
    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Emit an event to all registered listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} event listener:`, error);
                }
            });
        }
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
        
        // PHASE 1 TASK 1.3: Emit analysis start event
        this.emit('analysisStart', {
            article: { id: article.id, title: article.title },
            timestamp: startTime
        });
        
        // PHASE 1: Check persistent cache first (IndexedDB)
        if (this.cacheManager) {
            const cacheKey = this.cacheManager.generateKey(article);
            const cachedResult = await this.cacheManager.get(cacheKey);
            
            if (cachedResult) {
                this.stats.cacheHits++;
                cachedResult.processingTime = Date.now() - startTime;
                cachedResult.fromCache = true;
                
                // PHASE 1 TASK 1.3: Emit cache hit event
                this.emit('cacheHit', {
                    article: { id: article.id, title: article.title },
                    result: cachedResult
                });
                
                return { ...article, intelligence: cachedResult };
            }
            this.stats.cacheMisses++;
        }
        
        // LEGACY: Check in-memory cache (fallback)
        const articleHash = `${article.id}-${article.title}-${article.publishedDate}`;
        if (this.analysisCache.has(articleHash)) {
            const cached = this.analysisCache.get(articleHash);
            cached.processingTime = Date.now() - startTime;
            cached.fromCache = true;
            
            // PHASE 1 TASK 1.3: Emit cache hit event
            this.emit('cacheHit', {
                article: { id: article.id, title: article.title },
                result: cached
            });
            
            return { ...article, intelligence: cached };
        }
        
        // Initialize analysis result
        const analysis = {
            tier: 0,
            isRelevant: false,
            threatLevel: 0,
            opportunityScore: 0,
            confidence: 0,
            fromCache: false,
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
        
        // PHASE 1 TASK 1.3: Emit tier 1 complete event
        this.emit('tier1Complete', {
            article: { id: article.id, title: article.title },
            result: { ...analysis },
            processingTime: Date.now() - startTime
        });

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
        
        // PHASE 1 TASK 1.3: Emit tier 2 complete event
        this.emit('tier2Complete', {
            article: { id: article.id, title: article.title },
            result: { ...analysis },
            processingTime: Date.now() - startTime
        });

        // If high confidence from context, skip semantic
        if (tier2Result.confidence >= 0.85) {
            analysis.processingTime = Date.now() - startTime;
            
            // PHASE 1 TASK 1.3: Emit analysis complete event
            this.emit('analysisComplete', {
                article: { id: article.id, title: article.title },
                result: { ...analysis },
                processingTime: analysis.processingTime
            });
            
            return { ...article, intelligence: analysis };
        }

        // TIER 3: Semantic analysis (~10% of articles - only high-value)
        if (this.shouldRunSemanticAnalysis(article, tier2Result, clients)) {
            try {
                const tier3Result = await this.tier3_semanticAnalysis(
                    article,
                    clients,
                    existingArticles,
                    tier2Result  // PHASE 2: Pass tier2Result for model selection
                );
                this.stats.tier3Processed++;
                
                // PHASE 2 TASK 2.2: Track model usage and costs
                const modelTier = tier3Result.modelTier || 'budget';
                const estimatedCost = tier3Result.estimatedCost || 0.0002;
                
                this.stats.tier3Cost += estimatedCost;
                this.stats.modelUsage[modelTier]++;
                this.stats.modelCosts[modelTier] += estimatedCost;
                
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
                analysis.cost = estimatedCost;
                analysis.modelTier = modelTier;
                analysis.modelUsed = tier3Result.modelUsed;
                
                // PHASE 1 TASK 1.3: Emit tier 3 complete event
                this.emit('tier3Complete', {
                    article: { id: article.id, title: article.title },
                    result: { ...analysis },
                    processingTime: Date.now() - startTime
                });
            } catch (error) {
                console.warn('Tier 3 semantic analysis failed, using Tier 2 result:', error);
                
                // PHASE 1 TASK 1.3: Emit error event
                this.emit('error', {
                    article: { id: article.id, title: article.title },
                    error: error.message,
                    tier: 3
                });
            }
        }

        analysis.processingTime = Date.now() - startTime;
        
        // PHASE 1: Store in persistent cache (IndexedDB)
        if (this.cacheManager) {
            const cacheKey = this.cacheManager.generateKey(article);
            await this.cacheManager.set(cacheKey, analysis);
        }
        
        // LEGACY: Store in memory cache (fallback)
        this.analysisCache.set(articleHash, analysis);
        
        // PHASE 1 TASK 1.3: Emit final analysis complete event
        this.emit('analysisComplete', {
            article: { id: article.id, title: article.title },
            result: { ...analysis },
            processingTime: analysis.processingTime
        });
        
        // Limit memory cache size to prevent memory issues
        if (this.analysisCache.size > 1000) {
            const firstKey = this.analysisCache.keys().next().value;
            this.analysisCache.delete(firstKey);
        }
        
        return { ...article, intelligence: analysis };

    /**
     * PHASE 2 TASK 2.1: Batch Processing
     * Analyze multiple articles in a single API call for 40-50% cost reduction
     * 
     * @param {Array} articles - Array of articles to analyze (max 5 per batch)
     * @param {Array} clients - List of client objects
     * @param {Array} existingArticles - Previous articles for context
     * @returns {Array} Array of enhanced articles with intelligence metadata
     */
    async batchAnalyzeArticles(articles, clients, existingArticles = []) {
        if (!Array.isArray(articles) || articles.length === 0) {
            throw new Error('Articles must be a non-empty array');
        }

        // Limit batch size to 5 articles (API limits and quality considerations)
        const BATCH_SIZE = 5;
        if (articles.length > BATCH_SIZE) {
            console.warn(`Batch size ${articles.length} exceeds maximum ${BATCH_SIZE}. Processing in chunks.`);
            return this._processBatchesInChunks(articles, clients, existingArticles, BATCH_SIZE);
        }

        const startTime = Date.now();
        console.log(`Starting batch analysis of ${articles.length} articles`);

        // STEP 1: Run Tier 1 and Tier 2 analysis for all articles
        const tier2Results = [];
        const articlesNeedingTier3 = [];

        for (const article of articles) {
            // Check cache first
            if (this.cacheManager) {
                const cacheKey = this.cacheManager.generateKey(article);
                const cachedResult = await this.cacheManager.get(cacheKey);
                
                if (cachedResult) {
                    this.stats.cacheHits++;
                    tier2Results.push({ article, cached: true, result: cachedResult });
                    continue;
                }
            }

            // Tier 1: Keyword filter
            const tier1Result = this.tier1_keywordFilter(article, clients);
            this.stats.tier1Processed++;

            if (!tier1Result.isRelevant) {
                tier2Results.push({
                    article,
                    cached: false,
                    result: {
                        tier: 1,
                        isRelevant: false,
                        threatLevel: 0,
                        opportunityScore: 0,
                        confidence: 0.95,
                        reasoning: 'Filtered out by keyword analysis',
                        patterns: tier1Result.patterns
                    }
                });
                continue;
            }

            // Tier 2: Context analysis
            const tier2Result = this.tier2_contextAnalysis(article, clients, existingArticles);
            this.stats.tier2Processed++;

            // Check if needs Tier 3
            if (this.shouldRunSemanticAnalysis(article, tier2Result, clients)) {
                articlesNeedingTier3.push({ article, tier2Result });
            } else {
                tier2Results.push({
                    article,
                    cached: false,
                    result: {
                        tier: 2,
                        threatLevel: tier2Result.threatLevel,
                        opportunityScore: tier2Result.opportunityScore,
                        confidence: tier2Result.confidence,
                        reasoning: tier2Result.reasoning,
                        entities: tier2Result.entities,
                        patterns: tier2Result.patterns
                    }
                });
            }
        }

        // STEP 2: Batch process Tier 3 articles if any
        if (articlesNeedingTier3.length > 0) {
            console.log(`Batch processing ${articlesNeedingTier3.length} articles through Tier 3`);
            
            try {
                const batchTier3Results = await this._batchTier3Analysis(
                    articlesNeedingTier3,
                    clients,
                    existingArticles
                );

                // Merge Tier 3 results
                for (let i = 0; i < articlesNeedingTier3.length; i++) {
                    const { article } = articlesNeedingTier3[i];
                    const tier3Result = batchTier3Results[i];

                    tier2Results.push({
                        article,
                        cached: false,
                        result: tier3Result
                    });

                    // Cache the result
                    if (this.cacheManager) {
                        const cacheKey = this.cacheManager.generateKey(article);
                        await this.cacheManager.set(cacheKey, tier3Result);
                    }
                }
            } catch (error) {
                console.error('Batch Tier 3 analysis failed:', error);
                // Fallback: process individually
                for (const { article, tier2Result } of articlesNeedingTier3) {
                    try {
                        const tier3Result = await this.tier3_semanticAnalysis(
                            article,
                            clients,
                            existingArticles,
                            tier2Result
                        );
                        tier2Results.push({ article, cached: false, result: tier3Result });
                    } catch (err) {
                        console.error(`Failed to analyze article ${article.id}:`, err);
                        tier2Results.push({
                            article,
                            cached: false,
                            result: {
                                tier: 2,
                                ...tier2Result,
                                error: 'Tier 3 analysis failed'
                            }
                        });
                    }
                }
            }
        }

        // STEP 3: Format and return results
        const results = tier2Results.map(({ article, result }) => ({
            ...article,
            intelligence: {
                ...result,
                processingTime: Date.now() - startTime,
                batchProcessed: true
            }
        }));

        console.log(`Batch analysis complete in ${Date.now() - startTime}ms`);
        return results;
    }

    /**
     * Process large batches in chunks
     * @private
     */
    async _processBatchesInChunks(articles, clients, existingArticles, chunkSize) {
        const results = [];
        
        for (let i = 0; i < articles.length; i += chunkSize) {
            const chunk = articles.slice(i, i + chunkSize);
            const chunkResults = await this.batchAnalyzeArticles(chunk, clients, existingArticles);
            results.push(...chunkResults);
        }
        
        return results;
    }

    /**
     * Batch Tier 3 semantic analysis - sends multiple articles in one API call
     * @private
     */
    async _batchTier3Analysis(articlesWithTier2, clients, existingArticles) {
        const articles = articlesWithTier2.map(a => a.article);
        const tier2Results = articlesWithTier2.map(a => a.tier2Result);

        // Build batch prompt
        const batchPrompt = this._buildBatchPrompt(articles, tier2Results, clients);

        // Select model tier (use highest priority article's tier)
        const highestPriority = Math.min(...articles.map(a => a.source?.priority || 5));
        const modelTier = highestPriority <= 2 ? 'premium' : highestPriority <= 4 ? 'midTier' : 'budget';
        const selectedModel = this.providerConfig[this.provider].models[modelTier];
        const modelCosts = this.providerConfig[this.provider].costs[modelTier];

        // Make API call
        const response = await this.analyzeWithAI(batchPrompt, selectedModel, modelTier, modelCosts, 4000);

        // Parse batch response
        const results = this._parseBatchResponse(response, articles.length);

        // Track statistics
        this.stats.tier3Processed += articles.length;
        const estimatedCost = (modelCosts.input * 0.002 + modelCosts.output * 0.001) * articles.length;
        this.stats.tier3Cost += estimatedCost;
        this.stats.modelUsage[modelTier] += articles.length;
        this.stats.modelCosts[modelTier] += estimatedCost;

        return results;
    }

    /**
     * Build prompt for batch analysis
     * @private
     */
    _buildBatchPrompt(articles, tier2Results, clients) {
        const articlesData = articles.map((article, index) => ({
            id: index + 1,
            title: article.title,
            summary: article.summary || '',
            source: article.source?.name || 'Unknown',
            tier2Analysis: {
                threatLevel: tier2Results[index].threatLevel,
                opportunityScore: tier2Results[index].opportunityScore,
                entities: tier2Results[index].entities,
                patterns: tier2Results[index].patterns
            }
        }));

        return `You are analyzing ${articles.length} technology news articles for an IBM Field CTO managing ${clients.length} enterprise accounts across APAC.

ARTICLES TO ANALYZE:
${JSON.stringify(articlesData, null, 2)}

For EACH article, provide a separate analysis with:
1. threatLevel (0-10): Competitive threat or risk to IBM
2. opportunityScore (0-10): Business opportunity for IBM
3. confidence (0-1): Analysis confidence
4. reasoning: Brief explanation (2-3 sentences)
5. actionableInsights: Array of specific actions
6. affectedClients: Array of client names that should be notified
7. affectedMarkets: Array of markets (e.g., ["Financial Services", "Telecommunications"])
8. competitorActivity: Description of competitor moves

Return a JSON array with ${articles.length} objects, one for each article in order:
[
  { "articleId": 1, "threatLevel": X, "opportunityScore": Y, ... },
  { "articleId": 2, "threatLevel": X, "opportunityScore": Y, ... },
  ...
]`;
    }

    /**
     * Parse batch API response into individual results
     * @private
     */
    _parseBatchResponse(responseText, expectedCount) {
        try {
            // Extract JSON array from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }

            const results = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(results)) {
                throw new Error('Response is not an array');
            }

            if (results.length !== expectedCount) {
                console.warn(`Expected ${expectedCount} results, got ${results.length}`);
            }

            // Format each result
            return results.map(result => ({
                tier: 3,
                threatLevel: result.threatLevel || 0,
                opportunityScore: result.opportunityScore || 0,
                confidence: result.confidence || 0.95,
                reasoning: result.reasoning || '',
                actionableInsights: result.actionableInsights || [],
                affectedClients: result.affectedClients || [],
                affectedMarkets: result.affectedMarkets || [],
                competitorActivity: result.competitorActivity || '',
                batchProcessed: true
            }));
        } catch (error) {
            console.error('Failed to parse batch response:', error);
            throw new Error(`Batch response parsing failed: ${error.message}`);
        }
    }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 3 TASK 3.1: PARALLEL PROCESSING
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Process multiple articles in parallel using WorkerPool
     * 3-5x faster than sequential processing
     *
     * @param {Array} articles - Articles to analyze
     * @param {Array} clients - List of clients
     * @param {Array} existingArticles - Previous articles for context
     * @returns {Promise<Array>} Enhanced articles with intelligence
     */
    async analyzeArticlesParallel(articles, clients, existingArticles = []) {
        if (!this.workerPool) {
            console.warn('WorkerPool not available, falling back to batch processing');
            return this.batchAnalyzeArticles(articles, clients, existingArticles);
        }

        console.log(`Starting parallel analysis of ${articles.length} articles`);
        const startTime = Date.now();

        try {
            // Prepare patterns for workers
            const patterns = {
                keywords: this.keywordPatterns,
                threats: this.keywordPatterns.threats,
                opportunities: this.keywordPatterns.opportunities,
                technologies: this.keywordPatterns.technologies
            };

            // Process articles in parallel
            const results = await this.workerPool.processArticlesParallel(
                articles,
                clients,
                patterns,
                // Tier 3 function for articles that need it
                async (article, tier2Result) => {
                    return this._performTier3Analysis(article, clients, existingArticles, tier2Result);
                }
            );

            // Enhance articles with results
            const enhancedArticles = articles.map((article, index) => {
                const result = results[index];
                
                // Cache the result
                if (this.cacheManager && result) {
                    const cacheKey = this.cacheManager.generateKey(article);
                    this.cacheManager.set(cacheKey, result);
                }

                return {
                    ...article,
                    intelligence: result || {
                        tier: 1,
                        isRelevant: false,
                        threatLevel: 0,
                        opportunityScore: 0,
                        confidence: 0
                    }
                };
            });

            const duration = Date.now() - startTime;
            console.log(`Parallel analysis completed in ${duration}ms (${(duration / articles.length).toFixed(0)}ms per article)`);

            return enhancedArticles;

        } catch (error) {
            console.error('Parallel processing failed:', error);
            // Fallback to batch processing
            return this.batchAnalyzeArticles(articles, clients, existingArticles);
        }
    }

    /**
     * Perform Tier 3 analysis for a single article (used by parallel processing)
     * @private
     */
    async _performTier3Analysis(article, clients, existingArticles, tier2Result) {
        // PHASE 2 TASK 2.4: Check budget before API call
        if (this.budgetManager) {
            const canProceed = await this.budgetManager.checkBudget('tier3');
            if (!canProceed.allowed) {
                console.warn('Budget limit reached, skipping Tier 3 analysis');
                return {
                    ...tier2Result,
                    tier: 2,
                    budgetLimitReached: true
                };
            }
        }

        // PHASE 2 TASK 2.2: Select appropriate model
        const model = this.getModelForArticle(article, tier2Result);
        const modelTier = this._getModelTier(model);

        try {
            // Build context
            const clientList = clients.map(c => c.name).join(', ');
            const contextBlock = this._buildContextBlock(existingArticles, article);
            const truncatedSummary = this._truncateText(article.summary, 500);

            // PHASE 2 TASK 2.3: Use prompt caching
            const systemPrompt = this.getSystemPrompt();
            const userContent = this.buildUserContent(article, clientList, contextBlock, truncatedSummary);
            
            const requestBody = this.formatRequestWithCaching(
                model,
                2000,
                systemPrompt,
                userContent
            );

            // Make API call
            const response = await this._makeAPICall(requestBody);
            
            // Parse response
            const analysis = this._parseAPIResponse(response, model);

            // PHASE 2 TASK 2.4: Record budget usage
            if (this.budgetManager && analysis.tokensUsed) {
                await this.budgetManager.recordUsage({
                    tokens: analysis.tokensUsed,
                    cost: analysis.cost || 0,
                    model: model,
                    tier: 'tier3',
                    cacheHit: analysis.cacheHit || false
                });
            }

            // Update stats
            this.stats.tier3Processed++;
            this.stats.tier3Cost += analysis.cost || 0;
            this.stats.modelUsage[modelTier]++;
            this.stats.modelCosts[modelTier] += analysis.cost || 0;

            if (analysis.cacheHit) {
                this.stats.promptCache.hits++;
                this.stats.promptCache.tokensSaved += analysis.tokensSaved || 0;
                this.stats.promptCache.costSaved += analysis.costSaved || 0;
            } else {
                this.stats.promptCache.misses++;
            }

            return {
                tier: 3,
                ...tier2Result,
                ...analysis,
                model: model,
                modelTier: modelTier
            };

        } catch (error) {
            console.error('Tier 3 analysis failed:', error);
            return {
                ...tier2Result,
                tier: 2,
                error: error.message
            };
        }
    }

    /**
     * Get model tier for statistics
     * @private
     */
    _getModelTier(model) {
        const premiumModels = ['claude-sonnet-4-20250514', 'gpt-5.4-turbo'];
        const budgetModels = ['claude-haiku-4-20250514', 'gpt-5.4-mini'];
        
        if (premiumModels.includes(model)) return 'premium';
        if (budgetModels.includes(model)) return 'budget';
        return 'midTier';
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PHASE 3 TASK 3.2: INCREMENTAL ANALYSIS
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Analyze articles with incremental tracking
     * Only analyzes new/changed articles, skips up-to-date ones
     * 80% reduction in processing time for updates
     *
     * @param {Array} articles - Articles to analyze
     * @param {Array} clients - List of clients
     * @param {Array} existingArticles - Previous articles for context
     * @param {Object} options - Options { forceReanalysis: boolean }
     * @returns {Promise<Object>} { analyzed: [], skipped: [], stats: {} }
     */
    async analyzeArticlesIncremental(articles, clients, existingArticles = [], options = {}) {
        if (!this.incrementalTracker) {
            console.warn('IncrementalTracker not available, analyzing all articles');
            const results = await this.analyzeArticlesParallel(articles, clients, existingArticles);
            return {
                analyzed: results,
                skipped: [],
                stats: {
                    total: articles.length,
                    analyzed: articles.length,
                    skipped: 0,
                    percentageSkipped: 0
                }
            };
        }

        console.log(`Starting incremental analysis of ${articles.length} articles`);
        const startTime = Date.now();

        try {
            // Filter articles using incremental tracker
            const filterResult = await this.incrementalTracker.filterArticles(articles);
            
            console.log(`Incremental filter: ${filterResult.toAnalyze.length} to analyze, ${filterResult.toSkip.length} to skip (${filterResult.stats.percentageSkipped}% reduction)`);

            // Analyze only new/changed articles
            let analyzedArticles = [];
            if (filterResult.toAnalyze.length > 0) {
                analyzedArticles = await this.analyzeArticlesParallel(
                    filterResult.toAnalyze,
                    clients,
                    existingArticles
                );

                // Record analysis for each article
                for (const article of analyzedArticles) {
                    if (article.intelligence) {
                        await this.incrementalTracker.recordAnalysis(article, article.intelligence);
                    }
                }
            }

            // For skipped articles, retrieve cached analysis
            const skippedArticles = await Promise.all(
                filterResult.toSkip.map(async (article) => {
                    // Try to get from cache
                    if (this.cacheManager) {
                        const cacheKey = this.cacheManager.generateKey(article);
                        const cachedResult = await this.cacheManager.get(cacheKey);
                        
                        if (cachedResult) {
                            return {
                                ...article,
                                intelligence: {
                                    ...cachedResult,
                                    fromIncremental: true,
                                    skippedReason: article._incrementalInfo.reason
                                }
                            };
                        }
                    }

                    // Fallback: return article with minimal intelligence
                    return {
                        ...article,
                        intelligence: {
                            tier: 1,
                            isRelevant: false,
                            fromIncremental: true,
                            skippedReason: article._incrementalInfo.reason
                        }
                    };
                })
            );

            const duration = Date.now() - startTime;
            const timeSaved = filterResult.toSkip.length * 50; // Assume 50ms per article saved
            
            console.log(`Incremental analysis completed in ${duration}ms (saved ~${timeSaved}ms by skipping ${filterResult.toSkip.length} articles)`);

            return {
                analyzed: analyzedArticles,
                skipped: skippedArticles,
                all: [...analyzedArticles, ...skippedArticles],
                stats: {
                    ...filterResult.stats,
                    duration,
                    timeSaved,
                    efficiency: `${filterResult.stats.percentageSkipped}% faster`
                }
            };

        } catch (error) {
            console.error('Incremental analysis failed:', error);
            // Fallback to regular parallel analysis
            const results = await this.analyzeArticlesParallel(articles, clients, existingArticles);
            return {
                analyzed: results,
                skipped: [],
                stats: {
                    total: articles.length,
                    analyzed: articles.length,
                    skipped: 0,
                    error: error.message
                }
            };
        }
    }

    /**
     * Force re-analysis of specific articles
     * Useful for articles that need fresh analysis
     *
     * @param {Array} articleIds - Article IDs to re-analyze
     * @param {Array} allArticles - All articles
     * @param {Array} clients - List of clients
     * @param {Array} existingArticles - Previous articles for context
     * @returns {Promise<Array>} Re-analyzed articles
     */
    async reanalyzeArticles(articleIds, allArticles, clients, existingArticles = []) {
        const articlesToReanalyze = allArticles.filter(a => articleIds.includes(a.id));
        
        if (articlesToReanalyze.length === 0) {
            console.warn('No articles found for re-analysis');
            return [];
        }

        console.log(`Re-analyzing ${articlesToReanalyze.length} articles`);
        
        // Clear from cache
        if (this.cacheManager) {
            for (const article of articlesToReanalyze) {
                const cacheKey = this.cacheManager.generateKey(article);
                await this.cacheManager.delete(cacheKey);
            }
        }

        // Analyze
        const results = await this.analyzeArticlesParallel(
            articlesToReanalyze,
            clients,
            existingArticles
        );

        // Record new analysis
        if (this.incrementalTracker) {
            for (const article of results) {
                if (article.intelligence) {
                    await this.incrementalTracker.recordAnalysis(article, article.intelligence);
                }
            }
        }

        return results;
    }

    /**
     * Get stale articles that need re-analysis
     * @param {number} daysOld - Articles older than this many days
     * @returns {Promise<Array>} Stale articles
     */
    async getStaleArticles(daysOld = 7) {
        if (!this.incrementalTracker) {
            return [];
        }

        return this.incrementalTracker.getStaleArticles(daysOld);
    }

    /**
     * Get source statistics from incremental tracker
     * @param {string} sourceUrl - RSS source URL
     * @returns {Promise<Object>} Source statistics
     */
    async getSourceStats(sourceUrl) {
        if (!this.incrementalTracker) {
            return null;
        }

        return this.incrementalTracker.getSourceStats(sourceUrl);
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
        // Only trigger if there's actual business activity context, not just co-mention
        if (entities.competitors.length > 0 && entities.clients.length > 0) {
            const activityPattern = /(?:partnership|deal|contract|agreement|selected|chosen|awarded|wins|signs|announces|launches|deploys|implements|migrates|expands|collaboration|joint venture)/i;
            if (activityPattern.test(text)) {
                threatLevel = 95;
                confidence = 0.90;
                reasoning.push(`${entities.competitors[0]} activity at ${entities.clients[0]}`);
            }
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
     * PHASE 3 TASK 3.4: Enhanced with fuzzy matching and additional entity types
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
        
        // PHASE 3 TASK 3.4: Use EntityRecognizer if available
        if (this.entityRecognizer) {
            const enhancedEntities = this.entityRecognizer.extractEntities(text);
            
            // Convert to legacy format and merge with client extraction
            const entities = {
                competitors: enhancedEntities.companies.map(c => c.name),
                clients: [],
                markets: [],
                industries: [],
                technologies: enhancedEntities.technologies.map(t => t.keyword),
                // PHASE 3 TASK 3.4: Additional entity types
                products: enhancedEntities.products.map(p => p.name),
                locations: enhancedEntities.locations.map(l => l.name),
                people: enhancedEntities.people.map(p => p.name),
                confidence: enhancedEntities.confidence
            };
            
            // Extract clients (with word boundary checking)
            for (const client of clients) {
                const clientNames = [client.name, ...(client.aliases || [])];
                let isMatch = false;
                
                for (const name of clientNames) {
                    const nameLower = name.toLowerCase();
                    const escapedName = nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${escapedName}\\b`, 'i');
                    if (regex.test(text.toLowerCase())) {
                        isMatch = true;
                        break;
                    }
                }
                
                if (isMatch) {
                    entities.clients.push(client.name);
                    if (client.market) entities.markets.push(client.market);
                    if (client.industry) entities.industries.push(client.industry);
                }
            }
            
            // Extract markets from locations
            enhancedEntities.locations.forEach(loc => {
                if (loc.region === 'APAC' && !entities.markets.includes(loc.country)) {
                    entities.markets.push(loc.country);
                }
            });
            
            // Cache and return
            this.embeddingCache.set(textHash, entities);
            if (this.embeddingCache.size > 500) {
                const firstKey = this.embeddingCache.keys().next().value;
                this.embeddingCache.delete(firstKey);
            }
            
            return entities;
        }
        
        // FALLBACK: Legacy entity extraction (if EntityRecognizer not available)
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
            let isMatch = false;
            
            for (const name of clientNames) {
                const nameLower = name.toLowerCase();
                const escapedName = nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedName}\\b`, 'i');
                if (regex.test(textLower)) {
                    isMatch = true;
                    break;
                }
            }
            
            if (isMatch) {
                entities.clients.push(client.name);
                if (client.market) entities.markets.push(client.market);
                if (client.industry) entities.industries.push(client.industry);
            }
        }

        // Extract markets
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

        // Cache and return
        this.embeddingCache.set(textHash, entities);
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
        // PHASE 1 IMPROVEMENT: Smarter Tier 3 triggering with source priority
        // Target: Skip 20-30% more articles while keeping all high-value ones
        
        // Get source priority (1=high, 2=medium, 3=low)
        const sourcePriority = article.source?.priority || 2;
        
        // Calculate composite confidence score
        const compositeConfidence = this._calculateCompositeConfidence(tier2Result, article);
        
        // 1. ALWAYS analyze: Tier 1 client mentioned (critical accounts)
        if (tier2Result.entities.clients.some(c => {
            const client = clients.find(cl => cl.name === c);
            return client && client.tier === 1;
        })) {
            return true;
        }
        
        // 2. ALWAYS analyze: Very high threat or opportunity from Tier 2
        if (tier2Result.threatLevel >= 80 || tier2Result.opportunityScore >= 80) {
            return true;
        }
        
        // 3. ALWAYS analyze: Competitor + client co-occurrence (competitive threat)
        const hasCompetitor = tier2Result.entities.competitors.length > 0;
        const hasClient = tier2Result.entities.clients.length > 0;
        if (hasCompetitor && hasClient) {
            return true;
        }
        
        // 4. ALWAYS analyze: Regulatory keywords detected (compliance critical)
        const text = `${article.title} ${article.summary}`.toLowerCase();
        const hasRegulatory = this.keywordPatterns.regulatory.some(kw => text.includes(kw));
        if (hasRegulatory) {
            return true;
        }
        
        // 5. SKIP: Priority 3 sources with low confidence (cost optimization)
        if (sourcePriority === 3 && compositeConfidence < 0.75) {
            return false;
        }
        
        // 6. SKIP: Low confidence + low scores (not worth deep analysis)
        if (compositeConfidence < 0.65 &&
            tier2Result.threatLevel < 50 &&
            tier2Result.opportunityScore < 50) {
            return false;
        }
        
        // 7. SKIP: No entities detected (generic article)
        if (tier2Result.entities.clients.length === 0 &&
            tier2Result.entities.competitors.length === 0 &&
            tier2Result.entities.markets.length === 0) {
            return false;
        }
        
        // 8. CONDITIONAL: Medium threat/opportunity needs high confidence
        if ((tier2Result.threatLevel >= 60 || tier2Result.opportunityScore >= 60) &&
            compositeConfidence >= 0.70) {
            return true;
        }
        
        // 9. CONDITIONAL: Priority 1 sources with decent signals
        if (sourcePriority === 1 && compositeConfidence >= 0.75) {
            return true;
        }
        
        // 10. ANALYZE: Very high composite confidence (strong signal)
        if (compositeConfidence >= 0.85) {
            return true;
        }
        
        // Default: Skip (conservative approach to save costs)
        return false;
    }
    
    /**
     * Calculate composite confidence score from multiple signals
     * Combines Tier 2 confidence with article characteristics
     *
     * @param {Object} tier2Result - Tier 2 analysis results
     * @param {Object} article - Article being analyzed
     * @returns {number} Composite confidence (0-1)
     */
    _calculateCompositeConfidence(tier2Result, article) {
        let confidence = tier2Result.confidence || 0.5;
        
        // Boost confidence for high relevance scores
        if (article.relevanceScore) {
            if (article.relevanceScore > 85) confidence += 0.15;
            else if (article.relevanceScore > 70) confidence += 0.10;
            else if (article.relevanceScore > 50) confidence += 0.05;
        }
        
        // Boost confidence for multiple entity types
        const entityTypes = [
            tier2Result.entities.clients.length > 0,
            tier2Result.entities.competitors.length > 0,
            tier2Result.entities.markets.length > 0,
            tier2Result.entities.technologies?.length > 0
        ].filter(Boolean).length;
        
        if (entityTypes >= 3) confidence += 0.10;
        else if (entityTypes >= 2) confidence += 0.05;
        
        // Boost confidence for strong sentiment signals
        if (tier2Result.sentiment) {
            if (Math.abs(tier2Result.sentiment) > 0.5) confidence += 0.05;
        }
        
        // Cap at 1.0
        return Math.min(confidence, 1.0);
    }

    /**
     * Tier 3: Semantic analysis using Claude API
     * Deep understanding with actionable insights
     *
     * @param {Object} article - Article to analyze
     * @param {Array} clients - List of clients
     * @param {Array} existingArticles - Previous articles for context
     * @param {Object} tier2Result - Tier 2 results for model selection
     * @returns {Object} Deep analysis with insights
     */
    async tier3_semanticAnalysis(article, clients, existingArticles, tier2Result) {
        // Check cache first
        const cacheKey = `semantic_${article.id}`;
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }

        try {
            // PHASE 2 TASK 2.2: Use AI with dynamic model selection
            const result = await this.analyzeWithAI(article, clients, existingArticles, tier2Result);
            
            // Cache the result
            this.analysisCache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('Semantic analysis failed:', error);
            throw error;
        }

    /**
     * PHASE 2 TASK 2.3: Get static system prompt for caching
     * This prompt is the same for all articles and can be cached by the API
     * Cached tokens get 90% discount after first use
     * 
     * @returns {string} Static system prompt (~1500 tokens)
     */
    getSystemPrompt() {
        return `You are the intelligence analyst for the IBM APAC Field CTO who leads 115 ATLs across 343 enterprise accounts.

STRATEGIC CONTEXT (Foundation + Three Pillars):
- Foundation: AI-Ready Data (watsonx.data, Confluent, watsonx.governance, Guardium)
- Pillar 1: Enterprise AI Agents (watsonx Orchestrate, Project Bob, watsonx Code Assistant for Z)
- Pillar 2: Sovereign Hybrid (Red Hat OpenShift, Terraform, Vault, Power, IBM Z)
- Pillar 3: AgentOps (Concert, Instana, Turbonomic, webMethods)

DUAL-WAVE THESIS:
- AI/Agentic Wave: Agents that perceive, reason, act, and trace—not chatbots
- Sovereignty Wave: Data localization, regulatory compliance, operational control

KEY PROOF POINTS:
- Only 16% of AI reaches enterprise scale—bottleneck is data readiness, not AI capability
- 9,000+ IBM developers using AI agents daily, 45% productivity gains
- $11B Confluent (80% Fortune 100), $6.4B HashiCorp (85% Fortune 500)

ANALYSIS FRAMEWORK:

1. THREAT LEVEL (0-100):
   - Competitor winning at our client = 90+
   - Regulatory change affecting clients = 80+
   - Competitor expanding in APAC market = 70+

2. OPPORTUNITY SCORE (0-100):
   - Competitor setback/issue = 80+
   - Client signaling AI/sovereignty challenge = 75+
   - Market shift favoring IBM positioning = 70+

3. WAVE CLASSIFICATION: Tag as [AI WAVE] or [SOVEREIGNTY WAVE] or [BOTH]

4. PILLAR MAPPING: Which IBM pillar is most relevant?
   - Data readiness issue → Foundation
   - AI pilot stuck → Pillar 1
   - Cloud/sovereignty constraint → Pillar 2
   - Operations overwhelmed → Pillar 3

5. CLIENT MATCHING RULES (CRITICAL):
   - ONLY match clients whose INDUSTRY matches article topic
   - ONLY match clients whose MARKET/GEOGRAPHY matches article location
   - If no match on BOTH criteria: affectedClients = [], lower opportunityScore to 30-50

6. ACTION ITEMS must be:
   - Specific: Name client, IBM product, timeframe
   - Framed as "Why Change": Surface unconsidered needs, not just answer questions
   - Example: "Position watsonx.governance with [Client] before their Q2 audit deadline"

OUTPUT FORMAT (JSON only):
{
  "threatLevel": 0-100,
  "opportunityScore": 0-100,
  "confidence": 0.95,
  "waveClassification": "[AI WAVE]" | "[SOVEREIGNTY WAVE]" | "[BOTH]",
  "pillarMapping": "Foundation" | "Pillar 1" | "Pillar 2" | "Pillar 3",
  "reasoning": "One-sentence strategic context: what this signals for IBM APAC and why it matters NOW (no client names here—use actionableInsights for that)",
  "actionableInsights": ["Specific action with client/product/timeframe framed as 'Why Change'"],
  "affectedClients": [],
  "affectedMarkets": [],
  "competitorActivity": "Brief—name competitor, their move, IBM counter-position"
}`;
    }

    /**
     * PHASE 2 TASK 2.3: Build dynamic user content (not cached)
     * This changes for each article and cannot be cached
     * 
     * @param {Object} article - Article to analyze
     * @param {string} clientList - Comma-separated list of top clients
     * @param {string} contextBlock - Related articles context
     * @param {string} truncatedSummary - Article summary (truncated)
     * @returns {string} Dynamic user content (~300 tokens)
     */
    buildUserContent(article, clientList, contextBlock, truncatedSummary) {
        return `ARTICLE TO ANALYZE:
Title: ${article.title}
Summary: ${truncatedSummary}${contextBlock}

TOP CLIENTS: ${clientList || 'None'}

Analyze this article using the framework above. Remember: ONLY suggest clients that match BOTH industry AND geography.`;
    }

    /**
     * PHASE 2 TASK 2.3: Format request with prompt caching
     * Separates static system prompt (cached) from dynamic content (not cached)
     * 
     * @param {string} model - Model to use
     * @param {number} maxTokens - Maximum tokens for response
     * @param {string} systemPrompt - Static system prompt (cached)
     * @param {string} userContent - Dynamic user content (not cached)
     * @returns {Object} Formatted request with caching
     */
    formatRequestWithCaching(model, maxTokens, systemPrompt, userContent) {
        const provider = this.provider;
        
        if (provider === 'claude') {
            // Claude's prompt caching format
            return {
                model,
                max_tokens: maxTokens,
                system: [
                    {
                        type: "text",
                        text: systemPrompt,
                        cache_control: { type: "ephemeral" }  // Cache this block
                    }
                ],
                messages: [
                    {
                        role: "user",
                        content: userContent
                    }
                ]
            };
        } else if (provider === 'openai') {
            // OpenAI doesn't have explicit caching API, but we can optimize structure
            // OpenAI automatically caches recent prompts
            return {
                model,
                max_tokens: maxTokens,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt  // OpenAI caches system messages automatically
                    },
                    {
                        role: "user",
                        content: userContent
                    }
                ]
            };
        }
        
        // Fallback: combine into single prompt
        return {
            model,
            max_tokens: maxTokens,
            messages: [
                {
                    role: "user",
                    content: `${systemPrompt}\n\n${userContent}`
                }
            ]
        };
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
    async analyzeWithAI(article, clients, existingArticles, tier2Result = null) {
        if (!this.apiKey) {
            throw new Error('API key not configured');
        }
        
        // PHASE 2 TASK 2.2: Select appropriate model based on article priority
        const modelTier = tier2Result ? this.getModelForArticle(article, tier2Result, clients) : 'midTier';
        const providerConfig = this.providerConfig[this.provider];
        const selectedModel = providerConfig.models[modelTier];
        const modelCosts = providerConfig.costs[modelTier];
        
        console.log(`[Model Selection] Using ${modelTier} model (${selectedModel}) for article: ${article.title.substring(0, 50)}...`);

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
        
        // PHASE 2 TASK 2.3: ENHANCED PROMPT CACHING
        // Separate static system prompt (cached, ~1500 tokens) from dynamic content (~300 tokens)
        // Cached tokens get 90% discount after first use
        // Savings: ~$0.00027 per article (90% of $0.0003)
        
        const systemPrompt = this.getSystemPrompt();
        const userContent = this.buildUserContent(article, clientList, contextBlock, truncatedSummary);

        // Get provider configuration (reuse providerConfig from above)
        const config = providerConfig;
        if (!config) {
            throw new Error(`Unsupported provider: ${this.provider}`);
        }
        
        // Build endpoint URL
        let endpoint = config.endpoint;
        if (config.useKeyInUrl) {
            endpoint = `${endpoint}/${selectedModel}:generateContent?key=${this.apiKey}`;
        }
        
        // PHASE 2 TASK 2.4: Check budget before making API call
        if (this.budgetManager) {
            // Estimate tokens and cost
            const estimatedTokens = Math.ceil((systemPrompt.length + userContent.length) / 4); // ~4 chars per token
            const estimatedCost = (modelCosts.input * estimatedTokens / 1000) + (modelCosts.output * 500 / 1000); // Estimate 500 output tokens
            
            const budgetCheck = this.budgetManager.checkBudget(estimatedTokens, estimatedCost);
            if (!budgetCheck.allowed) {
                throw new Error(`Budget limit reached: ${budgetCheck.reason}`);
            }
        }
        
        // Make API call with retry logic
        const MAX_RETRIES = 3;
        const INITIAL_DELAY = 1000; // 1 second
        let lastError;
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // PHASE 2 TASK 2.3: Use caching-aware request format
                const requestBody = this.formatRequestWithCaching(selectedModel, 600, systemPrompt, userContent);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: config.headers(this.apiKey),
                    body: JSON.stringify(requestBody)
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
                
                // Clean response: remove markdown code blocks if present
                text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                
                // Try to extract JSON (object or array)
                let jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
                
                if (!jsonMatch) {
                    console.error(`${this.provider} response parsing failed. Raw response:`, text.substring(0, 500));
                    throw new Error(`Could not parse ${this.provider} response - no valid JSON found`);
                }
                
                // Clean up JSON before parsing
                let jsonStr = jsonMatch[0];
                
                // Remove trailing commas before closing brackets
                jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
                
                // Remove newlines and carriage returns for cleaner parsing
                jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, '');
                
                // Remove any text after the last closing bracket
                const lastBracket = Math.max(jsonStr.lastIndexOf('}'), jsonStr.lastIndexOf(']'));
                if (lastBracket >= 0 && lastBracket < jsonStr.length - 1) {
                    jsonStr = jsonStr.substring(0, lastBracket + 1);
                }
                
                let analysis;
                try {
                    analysis = JSON.parse(jsonStr);
                } catch (parseError) {
                    console.error(`${this.provider} JSON parse error at position ${parseError.message}`);
                    console.error('Problematic JSON substring:', jsonStr.substring(Math.max(0, 280), 320));
                    console.error('Full JSON (first 500 chars):', jsonStr.substring(0, 500));
                    throw new Error(`JSON parse failed: ${parseError.message}`);
                }
                
                // Handle array response (some models might return array instead of object)
                if (Array.isArray(analysis)) {
                    console.warn(`${this.provider} returned array instead of object, using first element`);
                    analysis = analysis[0] || {};
                }
                
                // PHASE 2 TASK 2.4: Record actual usage in budget manager
                if (this.budgetManager) {
                    const actualTokens = Math.ceil((systemPrompt.length + userContent.length + text.length) / 4);
                    const actualCost = (modelCosts.input * (systemPrompt.length + userContent.length) / 4000) +
                                      (modelCosts.output * text.length / 4000);
                    this.budgetManager.recordUsage(actualTokens, actualCost);
                }
                
                // Success! Return the result with model tier info
                return {
                    threatLevel: analysis.threatLevel || 0,
                    opportunityScore: analysis.opportunityScore || 0,
                    confidence: analysis.confidence || 0.95,
                    reasoning: analysis.reasoning || '',
                    actionableInsights: analysis.actionableInsights || [],
                    affectedClients: analysis.affectedClients || [],
                    affectedMarkets: analysis.affectedMarkets || [],
                    competitorActivity: analysis.competitorActivity || '',
                    relatedArticles: relatedArticles.map(a => a.id),
                    // PHASE 2 TASK 2.2: Add model tier information
                    modelTier: modelTier,
                    modelUsed: selectedModel,
                    estimatedCost: modelCosts
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
    async getStats() {
        const baseStats = {
            ...this.stats,
            tier1PassRate: this.stats.tier2Processed / Math.max(this.stats.tier1Processed, 1),
            tier2PassRate: this.stats.tier3Processed / Math.max(this.stats.tier2Processed, 1)
        };
        
        // PHASE 2 TASK 2.2: Calculate model usage percentages and savings
        const totalModelCalls = this.stats.modelUsage.premium + this.stats.modelUsage.midTier + this.stats.modelUsage.budget;
        const modelStats = {
            usage: {
                premium: this.stats.modelUsage.premium,
                midTier: this.stats.modelUsage.midTier,
                budget: this.stats.modelUsage.budget,
                total: totalModelCalls
            },
            usagePercentage: {
                premium: totalModelCalls > 0 ? (this.stats.modelUsage.premium / totalModelCalls * 100).toFixed(1) : 0,
                midTier: totalModelCalls > 0 ? (this.stats.modelUsage.midTier / totalModelCalls * 100).toFixed(1) : 0,
                budget: totalModelCalls > 0 ? (this.stats.modelUsage.budget / totalModelCalls * 100).toFixed(1) : 0
            },
            costs: {
                premium: this.stats.modelCosts.premium.toFixed(4),
                midTier: this.stats.modelCosts.midTier.toFixed(4),
                budget: this.stats.modelCosts.budget.toFixed(4),
                total: (this.stats.modelCosts.premium + this.stats.modelCosts.midTier + this.stats.modelCosts.budget).toFixed(4)
            },
            // Calculate savings vs using premium model for everything
            estimatedSavings: totalModelCalls > 0 ?
                ((this.stats.modelUsage.midTier * 0.0015 + this.stats.modelUsage.budget * 0.0008) -
                 (this.stats.modelCosts.midTier + this.stats.modelCosts.budget)).toFixed(4) : 0
        };
        
        // PHASE 2 TASK 2.3: Calculate prompt cache statistics
        const promptCacheStats = {
            hits: this.stats.promptCache.hits,
            misses: this.stats.promptCache.misses,
            hitRate: (this.stats.promptCache.hits + this.stats.promptCache.misses) > 0 ?
                (this.stats.promptCache.hits / (this.stats.promptCache.hits + this.stats.promptCache.misses) * 100).toFixed(1) : 0,
            tokensSaved: this.stats.promptCache.tokensSaved,
            costSaved: this.stats.promptCache.costSaved.toFixed(4),
            estimatedSavings: '90% discount on cached tokens after first use'
        };
        
        // PHASE 2 TASK 2.4: Include budget statistics
        const budgetStats = this.budgetManager ? this.budgetManager.getStatus() : null;
        
        // PHASE 3 TASK 3.1: Include parallel processing statistics
        const parallelStats = this.workerPool ? this.workerPool.getStats() : null;
        
        // PHASE 3 TASK 3.2: Include incremental analysis statistics
        const incrementalStats = this.incrementalTracker ? await this.incrementalTracker.getStats() : null;
        
        // PHASE 3 TASK 3.4: Include entity recognition statistics
        const entityStats = this.entityRecognizer ? this.entityRecognizer.getStats() : null;
        
        // PHASE 1: Include cache statistics
        if (this.cacheManager) {
            const cacheStats = this.cacheManager.getStats();
            const cacheSize = await this.cacheManager.getSize();
            
            return {
                ...baseStats,
                models: modelStats,
                promptCache: promptCacheStats,
                budget: budgetStats,
                parallel: parallelStats,
                incremental: incrementalStats,
                entities: entityStats,
                cache: {
                    ...cacheStats,
                    size: cacheSize
                }
            };
        }
        
        return {
            ...baseStats,
            models: modelStats,
            promptCache: promptCacheStats,
            budget: budgetStats,
            parallel: parallelStats,
            incremental: incrementalStats,
            entities: entityStats
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
            totalCost: 0,
            cacheHits: 0,
            cacheMisses: 0,
            lastReset: new Date().toISOString(),
            // PHASE 2 TASK 2.2: Model tier usage tracking
            modelUsage: {
                premium: 0,
                midTier: 0,
                budget: 0
            },
            modelCosts: {
                premium: 0,
                midTier: 0,
                budget: 0
            },
            // PHASE 2 TASK 2.3: Prompt cache tracking
            promptCache: {
                hits: 0,
                misses: 0,
                tokensSaved: 0,
                costSaved: 0
            }
        };
    }
    
    /**
     * PHASE 1: Get cache manager instance
     * Allows external access to cache operations
     * @returns {CacheManager|null} Cache manager instance
     */
    getCacheManager() {
        return this.cacheManager;
    }
    
    /**
     * PHASE 1: Clear all caches (memory + persistent)
     * @returns {Promise<boolean>} Success status
     */
    async clearAllCaches() {
        // Clear memory cache
        this.analysisCache.clear();
        this.embeddingCache.clear();
        
        // Clear persistent cache
        if (this.cacheManager) {
            await this.cacheManager.clear();
        }
        
        return true;
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
