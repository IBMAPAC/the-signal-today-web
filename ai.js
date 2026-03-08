// =============================================
// The Signal Today - AI Service
// Claude API integration for intelligent digest generation
// =============================================

class AIService {
    constructor(app) {
        this.app = app;
        this.apiEndpoint = 'https://api.anthropic.com/v1/messages';
        this.model = 'claude-sonnet-4-20250514';
    }

    // ==========================================
    // Main Digest Generation
    // ==========================================

    async generateAIDigest(apiKey) {
        // Category-aware sampling: take top articles by score, but guarantee at least
        // 1 article per active category so regulatory/ASEAN signals aren't dropped.
        const TOTAL_ARTICLES = 35;
        const byCategory = {};
        for (const article of this.app.dailyArticles) {
            if (!byCategory[article.category]) byCategory[article.category] = [];
            byCategory[article.category].push(article);
        }
        
        // Seed with the best article from each category (already sorted by score)
        const seeded = new Set();
        const sampledArticles = [];
        for (const articles of Object.values(byCategory)) {
            if (articles.length > 0) {
                sampledArticles.push(articles[0]);
                seeded.add(articles[0].id);
            }
        }
        
        // Fill remaining slots from the top-scored articles not already included
        for (const article of this.app.dailyArticles) {
            if (sampledArticles.length >= TOTAL_ARTICLES) break;
            if (!seeded.has(article.id)) {
                sampledArticles.push(article);
                seeded.add(article.id);
            }
        }
        
        // Sort final set by score descending so Claude sees highest-value articles first
        sampledArticles.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        // Inject client/industry/signal metadata into each article entry
        const articleList = sampledArticles.map((a, i) => {
            const clientTag = a.matchedClient ? ` | Client: ${a.matchedClient}` : '';
            const industryTag = a.matchedIndustry ? ` | Industry: ${a.matchedIndustry}` : '';
            const signalTag = (a.signalType && a.signalType !== 'background') ? ` | Signal: ${a.signalType}` : '';
            return `[${i + 1}] Source: ${a.sourceName}${clientTag}${industryTag}${signalTag} | URL: ${a.url}\nTitle: ${a.title}\nSummary: ${a.summary?.substring(0, 250) || 'No summary'}`;
        }).join('\n\n');

        // Inject "This Week's Context" if set
        const contextBlock = this.app.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT (prioritize relevance to these meetings/deals):\n${this.app.settings.thisWeekContext}\n`
            : '';

        // Build dynamic Tier 1 client list for prompt
        const tier1Clients = this.app.clients
            .filter(c => c.tier === 1)
            .map(c => c.name)
            .slice(0, 15); // Limit to avoid prompt bloat
        const tier1ClientList = tier1Clients.length > 0 
            ? tier1Clients.join(', ')
            : 'your configured Tier 1 clients';
        
        // Pick 2 sample clients for examples (or use generic)
        const sampleClients = tier1Clients.length >= 2
            ? `${tier1Clients[0]} or ${tier1Clients[1]}`
            : 'a Tier 1 client';
        const sampleClient = tier1Clients.length > 0 ? tier1Clients[0] : 'a watchlist client';

        const prompt = `You are the intelligence briefer for the Field CTO of IBM Asia Pacific.
${contextBlock}
YOUR JOB IS NOT TO SUMMARIZE NEWS. Answer these four questions:
1. What should I BRING UP in client meetings today?
2. What COMPETITIVE THREAT requires immediate attention?
3. What REGULATORY CHANGE affects my clients?
4. What OPPORTUNITY should I act on this week?

ROLE CONTEXT:
- You lead 115 Account Technical Leaders (ATLs) across 343 enterprise accounts in Asia Pacific (excluding Japan)
- Dual-wave thesis: every insight belongs to either the AI/Agentic wave OR the Sovereignty/Regulation wave
- Tag EVERY insight as [AI WAVE] or [SOVEREIGNTY WAVE] — this routes it to the right conversation
- Priority industries: Financial Services, Government, Manufacturing, Energy, Retail
- Competitors: Microsoft Azure, AWS, Google Cloud, Salesforce, SAP, Oracle, ServiceNow, Databricks, Snowflake

CITATION RULES (strictly enforced):
1. ALWAYS cite with the actual source name: [MIT Tech Review](https://...)
2. NEVER use generic "Source" — use the real source name from the article list
3. Every factual claim needs a citation

FRAMING RULES (strictly enforced):
1. Frame EVERY insight as an ACTION, not information
2. BAD: "Microsoft announced new Azure AI services"
3. GOOD: "[AI WAVE] COMPETITIVE ALERT: Microsoft's Azure AI Foundry [Azure Blog](url) now offers
   on-premises deployment — directly challenges IBM's hybrid cloud positioning. ACTION: Lead with
   watsonx.ai's enterprise governance in your next ${sampleClients} conversation."

CLIENT INTELLIGENCE RULES:
- Articles tagged with a Client name are watchlist client signals
- For Tier 1 clients (${tier1ClientList}):
  flag their signals explicitly in executiveSummary or the relevant section
- If thisWeekContext mentions a client by name, that client's signals are MEETING PREP —
  surface them first in executiveSummary
- When a client article reveals a broader industry pattern, reference it in the
  corresponding industrySignals entry as evidence (e.g. "${sampleClient}'s AI announcement signals...")

INDUSTRY SIGNALS RULES:
- Scan today's articles for each Tier 1 industry: Financial Services, Government, Manufacturing, Energy, Retail
- Only produce an industrySignals entry if today's articles contain a relevant signal
- Omit industries with no relevant signal — do not produce filler
- If a watchlist client article is the evidence for an industry signal, name the client in the headline
- salesAction must name a specific client account where possible

SECTION RULES:
- Only include a section if today's articles contain at least one relevant signal
- Omit sections with no content — do not produce generic filler
- Produce EXACTLY 3 conversationStarters — no more, no fewer
- Do NOT include readingTimeMinutes in any section

Return ONLY valid JSON, no markdown fences:
{
    "executiveSummary": "3-4 ACTION-ORIENTED sentences. Tag each [AI WAVE] or [SOVEREIGNTY WAVE]. Cite sources. If thisWeekContext mentions a client meeting, lead with that signal.",
    "sections": [
        {
            "title": "Competitive Alerts",
            "emoji": "🚨",
            "summary": "Competitive threats with [Source Name](URL) citations. Tag [AI WAVE] or [SOVEREIGNTY WAVE]."
        },
        {
            "title": "Industry Opportunities",
            "emoji": "💰",
            "summary": "Opportunities with [Source Name](URL) citations. Tag [AI WAVE] or [SOVEREIGNTY WAVE]."
        },
        {
            "title": "Regulatory Watch",
            "emoji": "🛡️",
            "summary": "Regulatory updates with [Source Name](URL) citations. Tag [SOVEREIGNTY WAVE]."
        },
        {
            "title": "AI & Agentic",
            "emoji": "🤖",
            "summary": "AI developments with [Source Name](URL) citations. Tag [AI WAVE]."
        }
    ],
    "conversationStarters": [
        "Exactly 3 starters. Each must cite a source and demonstrate a point of view, not just a headline."
    ],
    "industrySignals": [
        {
            "industry": "Financial Services",
            "emoji": "🏦",
            "headline": "One-sentence signal grounded in today's articles. Name a client if one was matched.",
            "ibmAngle": "Specific IBM product: watsonx.ai / watsonx.governance / IBM Consulting / Red Hat OpenShift / IBM Security / IBM Z / hybrid cloud.",
            "salesAction": "Specific action for an ATL this week. Name a client account if relevant."
        }
    ]
}

Articles:
${articleList}`;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: this.model,
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
                this.app.digest = JSON.parse(jsonMatch[0]);
                this.app.digest.generatedAt = new Date().toISOString();
                // Store fingerprint + seen IDs for delta detection on next refresh
                this.app.digest.articleFingerprint = this.app.scorer.computeArticleFingerprint(this.app.dailyArticles);
                this.app.digest.seenArticleIds = this.app.dailyArticles.map(a => a.id);
                this.app.digest.thisWeekContext = this.app.settings.thisWeekContext || '';
            } else {
                throw new Error('Could not parse AI response');
            }
        } catch (error) {
            console.error('AI generation failed:', error);
            this.app.digest = this.createBasicDigest();
            this.app.digest.executiveSummary = `AI generation failed: ${error.message}. Showing basic digest.`;
        }
    }

    // ==========================================
    // Delta Merge (Incremental Updates)
    // ==========================================

    async mergeDeltaDigest(apiKey, newArticles) {
        if (!this.app.digest || newArticles.length === 0) return;

        const newArticleList = newArticles.map((a, i) => {
            const clientTag = a.matchedClient ? ` | Client: ${a.matchedClient}` : '';
            const industryTag = a.matchedIndustry ? ` | Industry: ${a.matchedIndustry}` : '';
            const signalTag = (a.signalType && a.signalType !== 'background') ? ` | Signal: ${a.signalType}` : '';
            return `[${i + 1}] Source: ${a.sourceName}${clientTag}${industryTag}${signalTag} | URL: ${a.url}\nTitle: ${a.title}\nSummary: ${a.summary?.substring(0, 200) || 'No summary'}`;
        }).join('\n\n');

        const contextBlock = this.app.settings.thisWeekContext
            ? `\nTHIS WEEK'S CONTEXT: ${this.app.settings.thisWeekContext}\n`
            : '';

        const deltaPrompt = `You are the intelligence briefer for the Field CTO of IBM Asia Pacific.
${contextBlock}
EXISTING DIGEST (generated earlier today):
Executive Summary: ${this.app.digest.executiveSummary}

NEW ARTICLES SINCE LAST DIGEST (${newArticles.length} articles):
${newArticleList}

TASK: Update the existing digest to incorporate the new articles.
- If a new article adds a significant new signal, update executiveSummary and the relevant section
- If a new article matches a watchlist client, surface it in executiveSummary
- Keep all existing content that is still valid
- Add new conversationStarters only if the new articles provide genuinely new talking points
- Apply the same [AI WAVE] / [SOVEREIGNTY WAVE] tagging and citation rules as the original digest
- Return ONLY valid JSON with the same structure as the original digest

Return ONLY valid JSON, no markdown fences:
{
    "executiveSummary": "Updated 3-4 sentences incorporating new signals",
    "sections": [same structure as original, updated where relevant],
    "conversationStarters": [updated list, max 3],
    "industrySignals": [updated list, omit industries with no signal]
}`;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 2000,
                    messages: [{ role: 'user', content: deltaPrompt }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.content[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const updated = JSON.parse(jsonMatch[0]);
                // Preserve fingerprint metadata from the merge
                this.app.digest = {
                    ...updated,
                    generatedAt: this.app.digest.generatedAt,
                    updatedAt: new Date().toISOString(),
                    articleFingerprint: this.app.scorer.computeArticleFingerprint(this.app.dailyArticles),
                    seenArticleIds: this.app.dailyArticles.map(a => a.id),
                    thisWeekContext: this.app.settings.thisWeekContext || '',
                    deltaCount: (this.app.digest.deltaCount || 0) + newArticles.length,
                };
                console.log(`✅ Delta merge complete — ${newArticles.length} new articles incorporated`);
            } else {
                throw new Error('Could not parse delta merge response');
            }
        } catch (error) {
            console.error('Delta merge failed, falling back to full generation:', error);
            await this.generateAIDigest(apiKey);
        }
    }

    // ==========================================
    // Basic Digest (Fallback)
    // ==========================================

    createBasicDigest() {
        const industryArticles = this.app.dailyArticles.filter(a => a.matchedIndustry);
        const clientArticles = this.app.dailyArticles.filter(a => a.matchedClient);
        
        return {
            executiveSummary: `Today's digest: ${this.app.dailyArticles.length} daily articles, ${this.app.weeklyArticles.length} weekly deep reads. Configure your Claude API key in Settings for AI-powered action briefs.`,
            sections: [
                {
                    title: "Top Stories",
                    emoji: "📰",
                    summary: `${this.app.dailyArticles.length} articles from ${this.app.sources.filter(s => s.enabled).length} sources.`,
                    readingTimeMinutes: Math.ceil(this.app.dailyArticles.slice(0, 10).reduce((sum, a) => sum + a.estimatedReadingMinutes, 0))
                }
            ],
            conversationStarters: [
                "Ask clients about their AI transformation priorities and data sovereignty concerns."
            ],
            generatedAt: new Date().toISOString()
        };
    }

    // ==========================================
    // Client Brief Generation
    // ==========================================

    async generateClientBrief(apiKey, client, articles) {
        if (!apiKey || articles.length === 0) return null;

        const articleList = articles.map((a, i) => 
            `[${i + 1}] ${a.sourceName}: ${a.title}\n${a.summary?.substring(0, 200) || ''}\nURL: ${a.url}`
        ).join('\n\n');

        const prompt = `You are preparing a meeting brief for the Field CTO of IBM Asia Pacific.

CLIENT: ${client.name}
MARKET: ${client.market || 'APAC'}
INDUSTRY: ${client.industry || 'Enterprise'}
TIER: ${client.tier === 1 ? 'Strategic' : client.tier === 2 ? 'Growth' : 'Prospect'}

ARTICLES MENTIONING THIS CLIENT (${articles.length}):
${articleList}

Generate a concise meeting brief with:
1. KEY SIGNALS: What's happening with this client (2-3 bullets)
2. IBM ANGLE: How IBM can help (specific products/services)
3. TALKING POINTS: 3 conversation starters for the ATL
4. COMPETITIVE INTEL: Any competitor mentions
5. NEXT ACTIONS: Specific follow-ups

Return ONLY valid JSON:
{
    "signals": ["bullet 1", "bullet 2"],
    "ibmAngle": "IBM positioning",
    "talkingPoints": ["point 1", "point 2", "point 3"],
    "competitive": "Competitor intel or null",
    "actions": ["action 1", "action 2"]
}`;

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 1000,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            const text = data.content[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (error) {
            console.error('Client brief generation failed:', error);
            return null;
        }
    }
}

// Made with Bob
