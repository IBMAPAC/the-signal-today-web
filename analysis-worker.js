// =============================================
// Analysis Worker
// Web Worker for parallel Tier 1 & 2 analysis
// Version 1.0 - Phase 3 Task 3.1
// =============================================

/**
 * Analysis Worker
 * 
 * Handles CPU-intensive Tier 1 & 2 analysis in a separate thread:
 * - Tier 1: Keyword pattern matching
 * - Tier 2: Context analysis and scoring
 * - Runs independently without blocking main thread
 */

// Worker message handler
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    if (type === 'analyze') {
        try {
            const result = analyzeArticle(data.article, data.clients, data.patterns);
            self.postMessage({ type: 'result', data: result });
        } catch (error) {
            self.postMessage({ 
                type: 'error', 
                error: error.message || 'Analysis failed' 
            });
        }
    }
};

/**
 * Main analysis function
 */
function analyzeArticle(article, clients, patterns) {
    const startTime = Date.now();
    
    // Tier 1: Keyword filtering
    const tier1Result = performTier1Analysis(article, clients, patterns);
    
    if (!tier1Result.isRelevant) {
        return {
            tier: 1,
            isRelevant: false,
            needsTier3: false,
            processingTime: Date.now() - startTime
        };
    }
    
    // Tier 2: Context analysis
    const tier2Result = performTier2Analysis(article, clients, patterns, tier1Result);
    
    // Determine if Tier 3 is needed
    const needsTier3 = shouldTriggerTier3(tier2Result, tier1Result);
    
    return {
        tier: 2,
        isRelevant: true,
        needsTier3,
        tier1: tier1Result,
        tier2: tier2Result,
        processingTime: Date.now() - startTime
    };
}

/**
 * Tier 1: Keyword Pattern Matching
 */
function performTier1Analysis(article, clients, patterns) {
    const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
    const matchedPatterns = [];
    const matchedClients = new Set();
    
    // Check each client's keywords
    clients.forEach(client => {
        const clientKeywords = patterns.keywords[client.name] || [];
        
        clientKeywords.forEach(keyword => {
            if (text.includes(keyword.toLowerCase())) {
                matchedPatterns.push({
                    client: client.name,
                    keyword,
                    type: 'keyword'
                });
                matchedClients.add(client.name);
            }
        });
    });
    
    // Check technology keywords
    if (patterns.technologies) {
        patterns.technologies.forEach(tech => {
            if (text.includes(tech.toLowerCase())) {
                matchedPatterns.push({
                    keyword: tech,
                    type: 'technology'
                });
            }
        });
    }
    
    // Check threat indicators
    if (patterns.threats) {
        patterns.threats.forEach(threat => {
            if (text.includes(threat.toLowerCase())) {
                matchedPatterns.push({
                    keyword: threat,
                    type: 'threat'
                });
            }
        });
    }
    
    return {
        isRelevant: matchedPatterns.length > 0,
        matchedPatterns,
        matchedClients: Array.from(matchedClients),
        patternCount: matchedPatterns.length
    };
}

/**
 * Tier 2: Context Analysis
 */
function performTier2Analysis(article, clients, patterns, tier1Result) {
    const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();
    
    // Calculate threat level
    const threatLevel = calculateThreatLevel(text, patterns);
    
    // Calculate opportunity score
    const opportunityScore = calculateOpportunityScore(text, patterns);
    
    // Analyze sentiment
    const sentiment = analyzeSentiment(text);
    
    // Calculate relevance score
    const relevanceScore = calculateRelevanceScore(
        tier1Result.patternCount,
        tier1Result.matchedClients.length,
        threatLevel,
        opportunityScore
    );
    
    // Extract entities
    const entities = extractEntities(text, clients);
    
    // Determine article category
    const category = categorizeArticle(text, patterns);
    
    return {
        threatLevel,
        opportunityScore,
        sentiment,
        relevanceScore,
        entities,
        category,
        confidence: calculateConfidence(tier1Result, threatLevel, opportunityScore)
    };
}

/**
 * Calculate threat level (0-100)
 */
function calculateThreatLevel(text, patterns) {
    let score = 0;
    const threatKeywords = patterns.threats || [
        'breach', 'hack', 'vulnerability', 'attack', 'exploit',
        'ransomware', 'malware', 'phishing', 'data leak',
        'security flaw', 'zero-day', 'compromise'
    ];
    
    threatKeywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
            score += 10;
        }
    });
    
    // Check for severity indicators
    const severityWords = ['critical', 'severe', 'major', 'widespread', 'massive'];
    severityWords.forEach(word => {
        if (text.includes(word)) {
            score += 5;
        }
    });
    
    return Math.min(score, 100);
}

/**
 * Calculate opportunity score (0-100)
 */
function calculateOpportunityScore(text, patterns) {
    let score = 0;
    const opportunityKeywords = patterns.opportunities || [
        'partnership', 'acquisition', 'merger', 'investment',
        'funding', 'expansion', 'launch', 'innovation',
        'breakthrough', 'growth', 'market share', 'revenue'
    ];
    
    opportunityKeywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
            score += 10;
        }
    });
    
    // Check for positive indicators
    const positiveWords = ['success', 'leading', 'first', 'best', 'top'];
    positiveWords.forEach(word => {
        if (text.includes(word)) {
            score += 5;
        }
    });
    
    return Math.min(score, 100);
}

/**
 * Analyze sentiment (-1 to 1)
 */
function analyzeSentiment(text) {
    const positiveWords = [
        'success', 'growth', 'innovation', 'leading', 'best',
        'excellent', 'strong', 'positive', 'gain', 'win'
    ];
    
    const negativeWords = [
        'fail', 'loss', 'decline', 'weak', 'poor',
        'negative', 'risk', 'threat', 'problem', 'issue'
    ];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) positiveCount += matches.length;
    });
    
    negativeWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) negativeCount += matches.length;
    });
    
    const total = positiveCount + negativeCount;
    if (total === 0) return 0;
    
    return (positiveCount - negativeCount) / total;
}

/**
 * Calculate relevance score (0-100)
 */
function calculateRelevanceScore(patternCount, clientCount, threatLevel, opportunityScore) {
    // Weighted scoring
    const patternScore = Math.min(patternCount * 10, 40);
    const clientScore = Math.min(clientCount * 15, 30);
    const threatScore = threatLevel * 0.15;
    const opportunityScoreWeighted = opportunityScore * 0.15;
    
    return Math.min(
        patternScore + clientScore + threatScore + opportunityScoreWeighted,
        100
    );
}

/**
 * Extract entities (companies, products, etc.)
 */
function extractEntities(text, clients) {
    const entities = {
        companies: [],
        products: [],
        technologies: []
    };
    
    // Extract client mentions
    clients.forEach(client => {
        const regex = new RegExp(`\\b${client.name}\\b`, 'gi');
        if (regex.test(text)) {
            entities.companies.push(client.name);
        }
    });
    
    // Common tech companies
    const techCompanies = [
        'Microsoft', 'Google', 'Amazon', 'Apple', 'Meta',
        'IBM', 'Oracle', 'SAP', 'Salesforce', 'Adobe'
    ];
    
    techCompanies.forEach(company => {
        const regex = new RegExp(`\\b${company}\\b`, 'gi');
        if (regex.test(text)) {
            entities.companies.push(company);
        }
    });
    
    // Common technologies
    const technologies = [
        'AI', 'Machine Learning', 'Cloud', 'Blockchain',
        'IoT', 'Kubernetes', 'Docker', 'AWS', 'Azure'
    ];
    
    technologies.forEach(tech => {
        const regex = new RegExp(`\\b${tech}\\b`, 'gi');
        if (regex.test(text)) {
            entities.technologies.push(tech);
        }
    });
    
    // Remove duplicates
    entities.companies = [...new Set(entities.companies)];
    entities.technologies = [...new Set(entities.technologies)];
    
    return entities;
}

/**
 * Categorize article
 */
function categorizeArticle(text, patterns) {
    const categories = {
        security: ['security', 'breach', 'hack', 'vulnerability'],
        business: ['merger', 'acquisition', 'partnership', 'revenue'],
        technology: ['ai', 'cloud', 'software', 'platform'],
        market: ['market', 'competition', 'share', 'growth'],
        regulatory: ['regulation', 'compliance', 'law', 'policy']
    };
    
    const scores = {};
    
    Object.keys(categories).forEach(category => {
        let score = 0;
        categories[category].forEach(keyword => {
            if (text.includes(keyword)) {
                score++;
            }
        });
        scores[category] = score;
    });
    
    // Return category with highest score
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'general';
    
    return Object.keys(scores).find(key => scores[key] === maxScore);
}

/**
 * Calculate confidence level (0-100)
 */
function calculateConfidence(tier1Result, threatLevel, opportunityScore) {
    // More patterns = higher confidence
    const patternConfidence = Math.min(tier1Result.patternCount * 10, 40);
    
    // Clear threat or opportunity = higher confidence
    const signalConfidence = Math.max(threatLevel, opportunityScore) * 0.3;
    
    // Multiple clients = higher confidence
    const clientConfidence = Math.min(tier1Result.matchedClients.length * 10, 30);
    
    return Math.min(
        patternConfidence + signalConfidence + clientConfidence,
        100
    );
}

/**
 * Determine if Tier 3 (AI analysis) is needed
 */
function shouldTriggerTier3(tier2Result, tier1Result) {
    // Trigger Tier 3 if:
    // 1. High threat level (>60)
    // 2. High opportunity score (>60)
    // 3. Multiple clients affected (>2)
    // 4. Low confidence but relevant (<50 confidence, >40 relevance)
    
    if (tier2Result.threatLevel > 60) return true;
    if (tier2Result.opportunityScore > 60) return true;
    if (tier1Result.matchedClients.length > 2) return true;
    if (tier2Result.confidence < 50 && tier2Result.relevanceScore > 40) return true;
    
    return false;
}

// Made with Bob
