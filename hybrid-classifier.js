// =============================================
// Hybrid Classification System
// 3-Tier Analysis: Keywords → Context → Semantic
// Version 1.0
// =============================================

/**
 * HybridClassifier
 * 
 * Universal classification system that uses a 3-tier approach:
 * - Tier 1: Keyword matching with exclusions (fast, free, 100% of items)
 * - Tier 2: Context validation (medium, free, ~30% of items)
 * - Tier 3: Semantic analysis (slow, $0.0002/item, ~10% of items)
 * 
 * Can classify: clients, markets, regulators, industries, themes
 */
class HybridClassifier {
    constructor(intelligenceEngine = null) {
        this.intelligenceEngine = intelligenceEngine;
        this.cache = new Map();
        this.stats = {
            tier1: 0,
            tier2: 0,
            tier3: 0,
            cacheHits: 0
        };
        
        // Exclusion patterns for ambiguous terms
        this.exclusionPatterns = {
            client: {
                'anz': ['organization', 'anzac', 'bonanza', 'stanza'],
                'sk': ['risk', 'ask', 'task', 'desk', 'mask', 'skate', 'brisk'],
                'dbs': ['jobs', 'mobs', 'verbs', 'absorbs'],
                'cba': ['cuba', 'combat', 'acrobat'],
                'axa': ['taxa', 'coaxial', 'relaxation']
            },
            regulator: {
                'asic': ['basic', 'chip', 'semiconductor', 'circuit', 'fabrication', 'tsmc', 'nvidia', 'manufacturing', 'foundry', 'wafer']
            },
            market: {
                'hong kong': ['hong kong style', 'hong kong flu']
            }
        };
        
        // Context patterns for validation
        this.contextPatterns = {
            client: {
                financial: ['bank', 'banking', 'financial', 'insurance', 'payment', 'fintech', 'lending', 'credit'],
                telco: ['telecom', 'telecommunications', 'mobile', 'network', '5g', '4g', 'broadband', 'carrier'],
                government: ['government', 'ministry', 'agency', 'public sector', 'municipal', 'federal'],
                retail: ['retail', 'ecommerce', 'shopping', 'consumer', 'store', 'merchant'],
                energy: ['energy', 'power', 'utility', 'electricity', 'gas', 'renewable'],
                manufacturing: ['manufacturing', 'factory', 'production', 'industrial', 'assembly']
            },
            regulator: {
                regulatory: ['regulation', 'compliance', 'guidance', 'enforcement', 'commission', 'authority'],
                policy: ['policy', 'mandate', 'requirement', 'standard', 'framework', 'directive'],
                oversight: ['oversight', 'supervision', 'monitoring', 'audit', 'inspection']
            },
            market: {
                geographic: ['country', 'region', 'market', 'economy', 'government', 'national'],
                business: ['company', 'enterprise', 'industry', 'sector', 'business', 'corporate']
            },
            industry: {
                financial: ['bank', 'financial', 'insurance', 'investment', 'trading'],
                technology: ['technology', 'software', 'digital', 'tech', 'it', 'cloud'],
                healthcare: ['healthcare', 'hospital', 'medical', 'pharma', 'health']
            }
        };
    }
    
    /**
     * Main classification entry point
     * @param {string} text - Text to classify
     * @param {Array} candidates - Array of candidates to match against
     * @param {string} type - Classification type: 'client', 'market', 'regulator', 'industry', 'theme'
     * @param {Object} options - { useSemantics: boolean, minConfidence: number }
     * @returns {Array} Sorted array of matches with confidence scores
     */
    async classify(text, candidates, type = 'client', options = {}) {
        const { useSemantics = false, minConfidence = 0.7 } = options;
        
        // Check cache first
        const cacheKey = `${type}-${text.substring(0, 100)}`;
        if (this.cache.has(cacheKey)) {
            this.stats.cacheHits++;
            return this.cache.get(cacheKey);
        }
        
        // TIER 1: Keyword matching with exclusions (0ms, free)
        const keywordMatches = this.tier1_keywordMatch(text, candidates, type);
        this.stats.tier1++;
        
        if (keywordMatches.length === 0) {
            return [];
        }
        
        // If single clear winner, return immediately
        if (keywordMatches.length === 1 && keywordMatches[0].confidence > 0.9) {
            this.cache.set(cacheKey, keywordMatches);
            return keywordMatches;
        }
        
        // TIER 2: Context validation (5ms, free)
        const contextMatches = this.tier2_contextValidation(text, keywordMatches, type);
        this.stats.tier2++;
        
        // Filter by minimum confidence
        const validMatches = contextMatches.filter(m => m.confidence >= minConfidence);
        
        // If single match or clear winner, return
        if (validMatches.length === 1 || 
            (validMatches.length > 1 && validMatches[0].confidence > validMatches[1].confidence + 0.15)) {
            this.cache.set(cacheKey, validMatches);
            return validMatches;
        }
        
        // TIER 3: Semantic analysis for ambiguous cases (200ms, $0.0002)
        if (useSemantics && this.intelligenceEngine && validMatches.length > 1) {
            const semanticResult = await this.tier3_semanticDisambiguation(text, validMatches, type);
            this.stats.tier3++;
            this.cache.set(cacheKey, semanticResult);
            return semanticResult;
        }
        
        // Return context-validated matches
        this.cache.set(cacheKey, validMatches);
        return validMatches;
    }
    
    /**
     * Tier 1: Fast keyword matching with exclusion patterns
     */
    tier1_keywordMatch(text, candidates, type) {
        const matches = [];
        const textLower = text.toLowerCase();
        
        for (const candidate of candidates) {
            const name = typeof candidate === 'string' ? candidate : candidate.name;
            const nameLower = name.toLowerCase();
            
            // Check exclusion patterns first
            const exclusions = this.exclusionPatterns[type]?.[nameLower] || [];
            if (exclusions.some(excl => textLower.includes(excl))) {
                continue; // Skip this candidate
            }
            
            // Word boundary matching
            const regex = name.length <= 3 
                ? new RegExp(`\\b${this.escapeRegex(nameLower)}\\b`, 'i')
                : new RegExp(`\\b${this.escapeRegex(nameLower)}`, 'i');
            
            if (regex.test(textLower)) {
                matches.push({
                    name: name,
                    candidate: candidate,
                    confidence: 0.7,
                    matchType: 'keyword',
                    evidence: `Keyword match: "${name}"`
                });
            }
            
            // Also check aliases if available
            if (typeof candidate === 'object' && candidate.aliases) {
                for (const alias of candidate.aliases) {
                    const aliasLower = alias.toLowerCase();
                    const aliasRegex = alias.length <= 3
                        ? new RegExp(`\\b${this.escapeRegex(aliasLower)}\\b`, 'i')
                        : new RegExp(`\\b${this.escapeRegex(aliasLower)}`, 'i');
                    
                    if (aliasRegex.test(textLower) && !matches.find(m => m.name === name)) {
                        matches.push({
                            name: name,
                            candidate: candidate,
                            confidence: 0.65,
                            matchType: 'alias',
                            evidence: `Alias match: "${alias}"`
                        });
                        break;
                    }
                }
            }
        }
        
        return matches.sort((a, b) => b.confidence - a.confidence);
    }
    
    /**
     * Tier 2: Context validation using co-occurrence patterns
     */
    tier2_contextValidation(text, matches, type) {
        const textLower = text.toLowerCase();
        const patterns = this.contextPatterns[type] || {};
        
        return matches.map(match => {
            let contextScore = 0;
            let evidenceList = [match.evidence];
            
            // Get candidate metadata if available
            const candidate = match.candidate;
            const industry = typeof candidate === 'object' ? candidate.industry : null;
            const market = typeof candidate === 'object' ? candidate.market : null;
            
            // Check for industry context
            if (industry && patterns.hasOwnProperty(industry.toLowerCase().replace(/\s+/g, ''))) {
                const industryKeywords = patterns[industry.toLowerCase().replace(/\s+/g, '')];
                const industryMatches = industryKeywords.filter(kw => textLower.includes(kw));
                if (industryMatches.length > 0) {
                    contextScore += 0.15;
                    evidenceList.push(`Industry context: ${industryMatches.join(', ')}`);
                }
            }
            
            // Check for market context
            if (market && this.contextPatterns.market) {
                const marketKeywords = this.getMarketKeywords(market);
                const marketMatches = marketKeywords.filter(kw => textLower.includes(kw));
                if (marketMatches.length > 0) {
                    contextScore += 0.1;
                    evidenceList.push(`Market context: ${marketMatches.join(', ')}`);
                }
            }
            
            // Check general context patterns for this type
            for (const [category, keywords] of Object.entries(patterns)) {
                const categoryMatches = keywords.filter(kw => textLower.includes(kw));
                if (categoryMatches.length > 0) {
                    contextScore += Math.min(categoryMatches.length * 0.05, 0.15);
                    evidenceList.push(`${category}: ${categoryMatches.slice(0, 3).join(', ')}`);
                }
            }
            
            return {
                ...match,
                confidence: Math.min(match.confidence + contextScore, 0.95),
                matchType: 'context-validated',
                evidence: evidenceList.join(' | ')
            };
        }).sort((a, b) => b.confidence - a.confidence);
    }
    
    /**
     * Tier 3: Semantic disambiguation using AI
     */
    async tier3_semanticDisambiguation(text, matches, type) {
        if (!this.intelligenceEngine) {
            console.warn('Semantic analysis requested but no intelligence engine available');
            return matches;
        }
        
        const candidateNames = matches.map(m => m.name).join(', ');
        const prompt = `Analyze this text and determine which ${type} is most relevant:

Text: "${text.substring(0, 500)}"

Candidates: ${candidateNames}

Context: This is for an intelligence briefing system analyzing news articles for IBM APAC Field CTO.

Return ONLY a JSON object with this structure:
{
  "match": "exact name from candidates list",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

        try {
            const settings = typeof getAIProviderSettings === 'function' ? getAIProviderSettings() : { provider: 'claude' };
            const apiKey = settings.apiKeys?.[settings.provider];
            
            if (!apiKey) {
                console.warn('No API key available for semantic analysis');
                return matches;
            }
            
            const result = await callAI('CLASSIFICATION', prompt, 150, apiKey);
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                return [{
                    name: parsed.match,
                    candidate: matches.find(m => m.name === parsed.match)?.candidate,
                    confidence: parsed.confidence,
                    matchType: 'semantic',
                    evidence: parsed.reasoning
                }];
            }
        } catch (error) {
            console.warn('Semantic disambiguation failed:', error);
        }
        
        // Fallback to context matches
        return matches;
    }
    
    /**
     * Get market-specific keywords for context validation
     */
    getMarketKeywords(market) {
        const marketKeywords = {
            'ANZ': ['australia', 'australian', 'new zealand', 'sydney', 'melbourne', 'auckland'],
            'ASEAN': ['singapore', 'malaysia', 'indonesia', 'thailand', 'philippines', 'vietnam'],
            'GCG': ['hong kong', 'china', 'chinese', 'taiwan', 'taipei', 'shenzhen'],
            'ISA': ['india', 'indian', 'mumbai', 'delhi', 'bangalore', 'sri lanka'],
            'KOREA': ['korea', 'korean', 'seoul', 'south korea']
        };
        return marketKeywords[market] || [];
    }
    
    /**
     * Escape special regex characters
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Get classification statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            tier1Percentage: this.stats.tier1 > 0 ? 100 : 0,
            tier2Percentage: this.stats.tier1 > 0 ? (this.stats.tier2 / this.stats.tier1 * 100).toFixed(1) : 0,
            tier3Percentage: this.stats.tier1 > 0 ? (this.stats.tier3 / this.stats.tier1 * 100).toFixed(1) : 0,
            cacheHitRate: (this.stats.tier1 + this.stats.cacheHits) > 0 
                ? (this.stats.cacheHits / (this.stats.tier1 + this.stats.cacheHits) * 100).toFixed(1) 
                : 0
        };
    }
    
    /**
     * Clear cache and reset stats
     */
    reset() {
        this.cache.clear();
        this.stats = {
            tier1: 0,
            tier2: 0,
            tier3: 0,
            cacheHits: 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridClassifier;
}

// Made with Bob
