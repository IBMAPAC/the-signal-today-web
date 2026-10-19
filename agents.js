// =============================================
// The Signal Today — Agent Layer
// Three refresh-triggered agents:
//   Agent 1: ATL Brief Agent     — proactively pre-generates meeting briefs for
//                                   Tier 1 clients with ≥2 new signals
//   Agent 2: Counter-Positioning — auto-drafts IBM counter-narrative for every
//                                   competitive article above the relevance threshold
//   Agent 3: Relationship Pulse  — detects Tier 1 accounts with no signal in 14+ days
//
// All agents are called from the refresh pipeline in app.js after AI enrichment.
// They write to localStorage and update the Agents panel in the UI.
// No background operation — refresh-triggered only.
// =============================================

const AGENT_STORAGE_KEYS = {
    ATL_BRIEFS:           'agent-atl-briefs',
    COUNTER_POSITIONING:  'agent-counter-positioning',
    RELATIONSHIP_PULSE:   'agent-relationship-pulse'
};

const AGENT_CACHE_TTL = {
    ATL_BRIEFS:           6  * 60 * 60 * 1000,  // 6h — same cadence as Today's Signals
    COUNTER_POSITIONING:  6  * 60 * 60 * 1000,  // 6h
    RELATIONSHIP_PULSE:   2  * 60 * 60 * 1000   // 2h — rechecked on tab refocus
};

// ─────────────────────────────────────────────────────────────
// AGENT 1: ATL Brief Agent
// Scans Tier 1 clients that have ≥2 new articles in the last
// 48h and silently pre-generates + caches a meeting brief for
// each. When the user opens the Brief modal it loads instantly.
// ─────────────────────────────────────────────────────────────

async function runATLBriefAgent(appInstance) {
    if (!appInstance || !appInstance.clients || !appInstance.articles) return;

    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];
    if (!apiKey) return; // No brief generation without API key

    const now = Date.now();
    const cutoff48h = now - 48 * 60 * 60 * 1000;
    const todayKey = new Date().toDateString();

    // Load existing pre-gen cache
    let briefCache = {};
    try {
        const raw = localStorage.getItem(AGENT_STORAGE_KEYS.ATL_BRIEFS);
        if (raw) briefCache = JSON.parse(raw);
    } catch (e) { /* start fresh */ }

    // Identify Tier 1 clients with ≥2 new articles in the last 48h
    const allArticles = [...(appInstance.dailyArticles || []), ...(appInstance.articles || [])];
    const tier1Clients = (appInstance.clients || []).filter(c =>
        (typeof c === 'object') && c.tier === 1 && c.name
    );

    const qualifying = [];
    for (const client of tier1Clients) {
        const name = client.name;
        const cacheEntry = briefCache[name];

        // Skip if we already pre-generated for this client today
        if (cacheEntry && cacheEntry.date === todayKey) continue;

        // Count new articles for this client in the last 48h
        const seen = new Set();
        const newArticles = allArticles.filter(a => {
            if (seen.has(a.id)) return false;
            seen.add(a.id);
            const pubTime = new Date(a.publishedDate || a.pubDate || a.isoDate || 0).getTime();
            if (pubTime < cutoff48h) return false;
            if (!Array.isArray(a.matchedClients)) return false;
            return a.matchedClients.some(c => {
                const cn = typeof c === 'string' ? c : c.name;
                return cn?.toLowerCase() === name.toLowerCase();
            });
        });

        if (newArticles.length >= 2) {
            qualifying.push({ client, newArticles });
        }
    }

    if (qualifying.length === 0) {
        console.log('🤖 ATL Brief Agent: no qualifying clients this cycle');
        return;
    }

    console.log(`🤖 ATL Brief Agent: pre-generating briefs for ${qualifying.length} client(s)`);

    // Pre-generate briefs sequentially to avoid hammering the API
    for (const { client, newArticles } of qualifying) {
        const name = client.name;
        try {
            const brief = await _generateBriefData(appInstance, name, apiKey);
            if (brief) {
                briefCache[name] = { brief, date: todayKey, timestamp: now };
                console.log(`🤖 ATL Brief Agent: cached brief for ${name}`);
            }
        } catch (e) {
            console.warn(`🤖 ATL Brief Agent: failed for ${name}:`, e.message);
        }
    }

    // Persist updated cache
    try {
        localStorage.setItem(AGENT_STORAGE_KEYS.ATL_BRIEFS, JSON.stringify(briefCache));
    } catch (e) {
        console.warn('ATL Brief Agent: storage write failed', e);
    }

    // Mark pre-generated clients with ⚡ badge on their Brief buttons
    _markPreGeneratedBriefButtons(briefCache, todayKey);
    renderAgentsPanel();
}

// Core brief generation — mirrors generateMeetingBrief() but returns structured data
// instead of writing to the DOM directly
async function _generateBriefData(appInstance, clientName, apiKey) {
    const clientObj = (appInstance.clients || []).find(c =>
        (typeof c === 'string' ? c : c.name).toLowerCase() === clientName.toLowerCase()
    );
    const clientIndustry = clientObj?.industry || null;
    const industrySignal = clientIndustry
        ? (appInstance.digest?.industrySignals || []).find(s => s.industry === clientIndustry)
        : null;

    const allArticles = [...(appInstance.dailyArticles || []), ...(appInstance.articles || [])];
    const seen = new Set();
    const clientArticles = allArticles.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        if (Array.isArray(a.matchedClients)) {
            const names = a.matchedClients.map(c => (typeof c === 'string' ? c : c.name).toLowerCase());
            const aliases = (clientObj?.aliases || []).map(al => al.toLowerCase());
            if (names.includes(clientName.toLowerCase()) ||
                aliases.some(al => names.includes(al))) return true;
        }
        const text = `${a.title} ${a.summary}`.toLowerCase();
        return new RegExp(`\\b${clientName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);
    }).slice(0, 8);

    const articleList = clientArticles.map((a, i) =>
        `[${i + 1}] ${a.sourceName}: ${a.title}\n${a.summary?.substring(0, 350) || ''}`
    ).join('\n\n');

    const contextBlock = appInstance.settings?.thisWeekContext
        ? `\nTHIS WEEK'S CONTEXT:\n${appInstance.settings.thisWeekContext}\n`
        : '';

    const industryBlock = clientIndustry ? `
CLIENT INDUSTRY: ${clientIndustry}
${industrySignal ? `INDUSTRY SIGNAL: ${industrySignal.headline}\nIBM ANGLE: ${industrySignal.ibmAngle}` : ''}
` : '';

    const prompt = `You are preparing a meeting brief for the IBM APAC Field CTO.
Client: ${clientName}${clientIndustry ? `\nIndustry: ${clientIndustry}\nMarket: ${clientObj?.market || 'APAC'}` : ''}
${contextBlock}${industryBlock}
Recent signals:
${articleList || 'No recent news.'}

Return ONLY valid JSON:
{
  "situationSummary": "2-3 sentences, Why Change framing, unconsidered need",
  "conversationDoor": "Conv 1-5 or Conv L — one sentence why",
  "whyChange": "Cost of standing still, no IBM mention",
  "talkingPoints": ["3 points: challenge + why now + IBM product last"],
  "proofPoint": "One stat from the IBM runbook",
  "riskFlags": ["Specific risks only, omit if none"],
  "openingQuestion": "Hypothesis-framed, peer CTO tone",
  "atlNote": "One sentence, five-step motion reference",
  "slackMessage": "Under 280 chars"
}`;

    const { text } = await callAI('STRATEGIC_ANALYSIS', prompt, 900, apiKey);
    const jsonMatch = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    let jsonStr = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(jsonStr);
}

// Add ⚡ badge to Brief buttons for pre-generated clients
function _markPreGeneratedBriefButtons(briefCache, todayKey) {
    const rows = document.querySelectorAll('.client-risk-row');
    rows.forEach(row => {
        const nameEl = row.querySelector('.client-risk-name');
        const briefBtn = row.querySelector('button');
        if (!nameEl || !briefBtn) return;
        const name = nameEl.textContent.trim();
        if (briefCache[name]?.date === todayKey) {
            briefBtn.title = 'Pre-generated brief ready';
            if (!briefBtn.querySelector('.agent-ready-dot')) {
                const dot = document.createElement('span');
                dot.className = 'agent-ready-dot';
                dot.textContent = '⚡';
                briefBtn.prepend(dot);
            }
        }
    });
}

// Called from openMeetingBrief() — returns cached brief data if available today
function getPreGeneratedBrief(clientName) {
    try {
        const raw = localStorage.getItem(AGENT_STORAGE_KEYS.ATL_BRIEFS);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        const entry = cache[clientName];
        if (!entry) return null;
        if (entry.date !== new Date().toDateString()) return null;
        return entry.brief;
    } catch (e) {
        return null;
    }
}


// ─────────────────────────────────────────────────────────────
// AGENT 2: Counter-Positioning Agent
// For every competitive article above relevance 0.6, generates
// a structured IBM counter-narrative using the conversation
// door framework. Surfaces in the Agents panel.
// ─────────────────────────────────────────────────────────────

async function runCounterPositioningAgent(appInstance) {
    if (!appInstance || !appInstance.articles) return;

    const settings = getAIProviderSettings();
    const apiKey = settings.apiKeys[settings.provider];

    // Check cache
    try {
        const raw = localStorage.getItem(AGENT_STORAGE_KEYS.COUNTER_POSITIONING);
        if (raw) {
            const { items, timestamp } = JSON.parse(raw);
            const age = Date.now() - timestamp;
            if (age < AGENT_CACHE_TTL.COUNTER_POSITIONING && items && items.length > 0) {
                console.log('🤖 Counter-Positioning Agent: serving cache');
                renderAgentsPanel();
                return;
            }
        }
    } catch (e) { /* regenerate */ }

    // Find competitive articles above threshold
    const allArticles = [...(appInstance.dailyArticles || []), ...(appInstance.articles || [])];
    const seen = new Set();
    const competitiveArticles = allArticles.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        if ((a.relevanceScore || 0) < 0.60) return false;
        return a.signalType === 'competitor' ||
            /\b(aws|azure|google cloud|microsoft|salesforce|servicenow|snowflake|databricks|okta|mulesoft|boomi|github copilot)\b/i
                .test(`${a.title} ${a.summary || ''}`);
    }).slice(0, 4); // Cap at 4 to control API cost

    if (competitiveArticles.length === 0) {
        // Clear stale cache and update panel
        try { localStorage.removeItem(AGENT_STORAGE_KEYS.COUNTER_POSITIONING); } catch (e) {}
        renderAgentsPanel();
        return;
    }

    console.log(`🤖 Counter-Positioning Agent: ${competitiveArticles.length} competitive signal(s)`);

    if (!apiKey) {
        // No API: store basic items (competitor name + article title only)
        const basicItems = competitiveArticles.map(a => ({
            competitor: _extractCompetitorName(a),
            headline: a.title,
            source: a.source || a.sourceName,
            url: a.url,
            conversationDoor: null,
            ibmCounter: null,
            talkingPoint: null,
            affectedClients: (a.matchedClients || []).slice(0, 3)
        }));
        _saveCounterPositioningCache(basicItems);
        renderAgentsPanel();
        return;
    }

    // Build prompt for all competitive articles in one call (cost efficiency)
    const tier1Clients = (appInstance.clients || [])
        .filter(c => typeof c === 'object' && c.tier === 1)
        .map(c => c.name).slice(0, 10).join(', ');

    const signalList = competitiveArticles.map((a, i) => {
        const clients = (a.matchedClients || []).slice(0, 3).join(', ') || 'none matched';
        return `[${i + 1}] ${a.title} (${a.source || a.sourceName})\nClients affected: ${clients}\nSummary: ${(a.summary || '').substring(0, 200)}`;
    }).join('\n\n');

    const prompt = `You are the competitive intelligence analyst for the IBM APAC Field CTO.

COMPETITIVE SIGNALS TODAY:
${signalList}

TIER 1 CLIENTS: ${tier1Clients || 'see watchlist'}

FIVE CONVERSATIONS — assign the strongest IBM response door:
- Conv 1 · Govern Your Data (watsonx.data + Confluent) — vs Snowflake/Databricks
- Conv 2 · Connect & Automate (watsonx Orchestrate + webMethods) — vs MuleSoft/Boomi/ServiceNow
- Conv 3 · Trust Every Identity (Verify + Vault) — vs Okta/Entra/Ping
- Conv 4 · Run Anywhere (Terraform + Vault + Cloudability + Concert) — vs hyperscaler native/AWS/Azure/Google
- Conv 5 · Build & Modernise (IBM Bob) — vs GitHub Copilot/Cursor/Devin
- Conv L · Lightwell (QUALIFYING PATH) — vs Snyk/Chainguard/Athena

COMPETITIVE COUNTERS:
- vs Snowflake/Databricks → portability + governance across the whole estate, not inside one platform
- vs MuleSoft/Boomi → agent control plane + total estate cost, not one connector's features
- vs Okta/Entra → human + non-human identity as one fabric; they keep their IAM, IBM closes the machine/agent gap
- vs hyperscaler native → run, govern, and prove the same way everywhere — concentration is a dependency, not a strategy
- vs GitHub Copilot/Cursor → whole lifecycle + governed spend, not just autocomplete
- vs Snyk/Chainguard → scanning is not fixing; Lightwell supplies the signed fix at the version they already run

For each signal return ONE counter-positioning item. Return ONLY a valid JSON array:
[
  {
    "competitor": "Competitor name",
    "headline": "8 words max — what IBM should do now",
    "conversationDoor": "Conv 1 | Conv 2 | Conv 3 | Conv 4 | Conv 5 | Conv L",
    "ibmCounter": "1 sentence: the specific IBM counter-position using the runbook framing above",
    "talkingPoint": "Hypothesis for ATL to test with client CTO — peer tone, not a pitch",
    "affectedMarkets": ["ANZ", "ASEAN", "GCG", "ISA", "KOREA"],
    "urgency": "HIGH | MEDIUM | LOW"
  }
]

Return valid JSON array only. Max ${competitiveArticles.length} items, same order as input signals.`;

    try {
        const { text } = await callAI('STRATEGIC_ANALYSIS', prompt, 800, apiKey);
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No JSON array in response');

        let jsonStr = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1');
        const synthesized = JSON.parse(jsonStr);

        // Merge AI output with article metadata
        const items = synthesized.map((item, idx) => {
            const article = competitiveArticles[idx];
            return {
                ...item,
                source: article?.source || article?.sourceName || '',
                url: article?.url || '',
                affectedClients: (article?.matchedClients || []).slice(0, 3)
            };
        });

        _saveCounterPositioningCache(items);
        renderAgentsPanel();
        console.log(`🤖 Counter-Positioning Agent: ${items.length} counter(s) generated`);
    } catch (err) {
        console.warn('🤖 Counter-Positioning Agent error:', err.message);
        // Fall back to basic (no-API) items
        const basicItems = competitiveArticles.map(a => ({
            competitor: _extractCompetitorName(a),
            headline: a.title,
            source: a.source || a.sourceName,
            url: a.url,
            conversationDoor: null,
            ibmCounter: null,
            talkingPoint: null,
            affectedClients: (a.matchedClients || []).slice(0, 3)
        }));
        _saveCounterPositioningCache(basicItems);
        renderAgentsPanel();
    }
}

function _extractCompetitorName(article) {
    const text = `${article.title} ${article.summary || ''}`;
    const competitors = ['AWS', 'Azure', 'Microsoft', 'Google Cloud', 'Salesforce',
        'ServiceNow', 'Snowflake', 'Databricks', 'Okta', 'MuleSoft', 'Boomi',
        'GitHub Copilot', 'Cursor'];
    for (const c of competitors) {
        if (new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) return c;
    }
    return 'Competitor';
}

function _saveCounterPositioningCache(items) {
    try {
        localStorage.setItem(AGENT_STORAGE_KEYS.COUNTER_POSITIONING,
            JSON.stringify({ items, timestamp: Date.now() }));
    } catch (e) {
        console.warn('Counter-Positioning Agent: storage write failed', e);
    }
}


// ─────────────────────────────────────────────────────────────
// AGENT 3: Relationship Pulse Agent
// No API call needed. Scans Tier 1 clients whose lastMentioned
// is older than 14 days (or never set). Returns count + list.
// Called on every updateUI() — zero cost, zero latency.
// ─────────────────────────────────────────────────────────────

function runRelationshipPulseAgent(appInstance) {
    if (!appInstance || !appInstance.clients) return;

    const now = Date.now();
    const SILENCE_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

    const silent = [];
    const tier1Clients = (appInstance.clients || []).filter(c =>
        typeof c === 'object' && c.tier === 1 && c.name
    );

    for (const client of tier1Clients) {
        const lastMentioned = client.lastMentioned
            ? new Date(client.lastMentioned).getTime()
            : 0;
        const daysSince = Math.floor((now - lastMentioned) / (24 * 60 * 60 * 1000));

        if (lastMentioned === 0 || daysSince >= 14) {
            silent.push({
                name: client.name,
                market: client.market || '',
                industry: client.industry || '',
                daysSince: lastMentioned === 0 ? null : daysSince
            });
        }
    }

    // Cache result
    try {
        localStorage.setItem(AGENT_STORAGE_KEYS.RELATIONSHIP_PULSE,
            JSON.stringify({ silent, timestamp: now }));
    } catch (e) { /* non-critical */ }

    return silent;
}


// ─────────────────────────────────────────────────────────────
// AGENTS PANEL RENDERER
// Renders the unified Agents card in the digest.
// Called after each agent run and on updateUI().
// ─────────────────────────────────────────────────────────────

function renderAgentsPanel() {
    const section  = document.getElementById('agents-section');
    const list     = document.getElementById('agents-list');
    const cpBadge  = document.getElementById('agents-count-cp');
    const pulseBadge = document.getElementById('agents-count-pulse');
    if (!section || !list) return;

    let html = '';
    let totalItems = 0;

    // ── Counter-Positioning items ──────────────────────────────
    let cpItems = [];
    try {
        const raw = localStorage.getItem(AGENT_STORAGE_KEYS.COUNTER_POSITIONING);
        if (raw) {
            const { items, timestamp } = JSON.parse(raw);
            const age = Date.now() - timestamp;
            if (age < AGENT_CACHE_TTL.COUNTER_POSITIONING) cpItems = items || [];
        }
    } catch (e) { /* empty */ }

    if (cpItems.length > 0) {
        totalItems += cpItems.length;
        html += `<div class="agent-group">
            <div class="agent-group-label">⚔️ Counter-Positioning <span class="agent-badge">${cpItems.length}</span></div>
            ${cpItems.map(item => _renderCounterItem(item)).join('')}
        </div>`;
    }

    // ── Relationship Pulse items ───────────────────────────────
    let pulseItems = [];
    try {
        const raw = localStorage.getItem(AGENT_STORAGE_KEYS.RELATIONSHIP_PULSE);
        if (raw) {
            const { silent, timestamp } = JSON.parse(raw);
            const age = Date.now() - timestamp;
            if (age < AGENT_CACHE_TTL.RELATIONSHIP_PULSE) pulseItems = silent || [];
        }
    } catch (e) { /* empty */ }

    if (pulseItems.length > 0) {
        totalItems += pulseItems.length;
        html += `<div class="agent-group">
            <div class="agent-group-label">🔇 Relationship Pulse <span class="agent-badge">${pulseItems.length}</span>
                <span class="agent-group-sublabel">Tier 1 accounts with no signal in 14+ days</span>
            </div>
            <div class="agent-pulse-list">
                ${pulseItems.map(item => _renderPulseItem(item)).join('')}
            </div>
        </div>`;
    }

    // ── ATL Brief Agent status ─────────────────────────────────
    let preGenCount = 0;
    try {
        const raw = localStorage.getItem(AGENT_STORAGE_KEYS.ATL_BRIEFS);
        if (raw) {
            const cache = JSON.parse(raw);
            const todayKey = new Date().toDateString();
            preGenCount = Object.values(cache).filter(e => e.date === todayKey).length;
        }
    } catch (e) { /* empty */ }

    if (preGenCount > 0) {
        html += `<div class="agent-group">
            <div class="agent-group-label">⚡ ATL Briefs Pre-generated
                <span class="agent-group-sublabel">${preGenCount} brief${preGenCount !== 1 ? 's' : ''} ready — click Brief on any client card</span>
            </div>
        </div>`;
    }

    if (totalItems === 0 && preGenCount === 0) {
        section.classList.add('hidden');
        if (cpBadge)    cpBadge.classList.add('hidden');
        if (pulseBadge) pulseBadge.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    // Update split badges: ⚔️ counter-positioning count + 🔇 pulse count
    if (cpBadge) {
        if (cpItems.length > 0) {
            cpBadge.textContent = `⚔️ ${cpItems.length}`;
            cpBadge.classList.remove('hidden');
        } else {
            cpBadge.classList.add('hidden');
        }
    }
    if (pulseBadge) {
        if (pulseItems.length > 0) {
            pulseBadge.textContent = `🔇 ${pulseItems.length}`;
            pulseBadge.classList.remove('hidden');
        } else {
            pulseBadge.classList.add('hidden');
        }
    }

    list.innerHTML = html;

    // Re-mark pre-generated Brief buttons
    try {
        const raw = localStorage.getItem(AGENT_STORAGE_KEYS.ATL_BRIEFS);
        if (raw) {
            const cache = JSON.parse(raw);
            _markPreGeneratedBriefButtons(cache, new Date().toDateString());
        }
    } catch (e) { /* non-critical */ }
}

function _renderCounterItem(item) {
    const urgencyClass = item.urgency === 'HIGH' ? 'agent-urgency-high'
        : item.urgency === 'MEDIUM' ? 'agent-urgency-medium' : 'agent-urgency-low';
    const urgencyIcon = item.urgency === 'HIGH' ? '🔴' : item.urgency === 'MEDIUM' ? '🟠' : '🟡';

    const clientsHtml = (item.affectedClients || []).length > 0
        ? `<span class="agent-clients">${item.affectedClients.map(c =>
            typeof c === 'string' ? c : c.name).join(' · ')}</span>`
        : '';

    const doorHtml = item.conversationDoor
        ? `<span class="agent-door">${item.conversationDoor}</span>`
        : '';

    const counterHtml = item.ibmCounter
        ? `<div class="agent-counter-text">${escapeHtml(item.ibmCounter)}</div>`
        : '';

    const talkingPointHtml = item.talkingPoint
        ? `<div class="agent-talking-point">"${escapeHtml(item.talkingPoint)}"</div>`
        : '';

    const sourceHtml = item.url
        ? `<a class="agent-source-link" href="${item.url}" target="_blank" rel="noopener">${escapeHtml(item.source || 'Source')}</a>`
        : `<span class="agent-source-link">${escapeHtml(item.source || '')}</span>`;

    return `<div class="agent-item agent-item--competitive ${urgencyClass}">
        <div class="agent-item-header">
            <span class="agent-urgency-icon">${urgencyIcon}</span>
            <span class="agent-competitor">${escapeHtml(item.competitor || 'Competitor')}</span>
            ${doorHtml}
            ${clientsHtml}
        </div>
        <div class="agent-headline">${escapeHtml(item.headline || '')}</div>
        ${counterHtml}
        ${talkingPointHtml}
        <div class="agent-item-footer">${sourceHtml}</div>
    </div>`;
}

function _renderPulseItem(item) {
    const daysText = item.daysSince === null
        ? 'Never appeared in signal feed'
        : `${item.daysSince} day${item.daysSince !== 1 ? 's' : ''} since last signal`;
    const urgencyIcon = item.daysSince === null || item.daysSince >= 30 ? '🔴'
        : item.daysSince >= 21 ? '🟠' : '🟡';

    return `<div class="agent-pulse-item">
        <span class="agent-pulse-icon">${urgencyIcon}</span>
        <span class="agent-pulse-name">${escapeHtml(item.name)}</span>
        <span class="agent-pulse-market">${escapeHtml(item.market)}</span>
        <span class="agent-pulse-days">${daysText}</span>
        <button class="btn btn-sm btn-secondary" onclick="app.openMeetingBrief('${escapeHtml(item.name)}')">Brief</button>
    </div>`;
}


// ─────────────────────────────────────────────────────────────
// ENTRY POINTS
// Called from app.js
// ─────────────────────────────────────────────────────────────

// Called at end of Progressive Render Step 2 (after AI enrichment)
async function runAllAgents(appInstance) {
    if (!appInstance) return;
    console.log('🤖 Running agent suite...');
    try {
        // Relationship Pulse is synchronous — run first for instant panel update
        runRelationshipPulseAgent(appInstance);
        renderAgentsPanel();

        // Fire async agents in parallel — they each update the panel when done
        await Promise.allSettled([
            runCounterPositioningAgent(appInstance),
            runATLBriefAgent(appInstance)
        ]);
    } catch (e) {
        console.warn('🤖 Agent suite error:', e.message);
    }
}

// Called from updateUI() — lightweight, synchronous only
function runLightweightAgents(appInstance) {
    if (!appInstance) return;
    runRelationshipPulseAgent(appInstance);
    renderAgentsPanel();
}
