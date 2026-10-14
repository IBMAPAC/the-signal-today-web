# 📡 The Signal Today - Web Version

An AI-powered intelligence briefing app designed for the **Field CTO of IBM Asia Pacific**, who leads ATLs across five markets. It is a static browser app with no backend: it reads RSS feeds, scores and classifies articles, and uses your own Claude or OpenAI API key to synthesise briefings.

## 🧠 Hybrid Intelligence Engine

Articles are categorised in up to three tiers, escalating only when needed (`hybrid-classifier.js`, `intelligence-engine.js`):

| Tier | Method | Cost |
|------|--------|------|
| **T1** | Keyword filter | Free |
| **T2** | Context analysis | Free |
| **T3** | Semantic analysis (Claude or OpenAI) | Per-call API cost |

- 🎯 **Categorisation**: Risk, Opportunity, Competitive, Regulatory, Information
- ⚠️ **Threat scoring** and 💰 **opportunity scoring** (0-100)
- 🔍 **Entity extraction**: competitors, clients, markets, industries
- 🗣️ **Conversation door**: each signal is mapped to one of the Five Conversations (Conv 1-5, plus Conv L)

> The engine can also use `cache-manager.js`, `budget-manager.js`, `worker-pool.js`, `entity-recognizer.js` and `incremental-tracker.js` (persistent caching, budget limits, parallel workers, incremental analysis). These are **not loaded by `index.html`**, so they are inactive in the main app. The engine detects them at runtime and falls back gracefully. See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## 🎯 Page Layout

| Section | Purpose |
|---------|---------|
| **🚨 Action Required** | Items that need a response now (appears only when there are any) |
| **🤖 Agents** | Output of the three refresh-triggered agents (see below) |
| **⚠️ Client Risk** | Watchlist clients exposed to risk signals |
| **📊 Today's Brief** | Executive summary mapped to the Five Conversations |
| **📢 Market Insights** | Per-market briefs with a conversation door and copy-for-Slack text |
| **📡 Signal Feed** | Full scored feed, filterable by client, market, priority and signal type; 👍/👎 per article |
| **📚 Deep Reads** | Strategic long-form pieces: thesis, implication, CxO question |

Additional tools: **👥 Clients** (portfolio manager), **📋 Meeting Brief** per client, **📤 Brief ATL** (Slack-ready), **📧 GTM Digest Email**, **💼 LinkedIn post generator** (#SignalToNoiseAPAC), and **📅 This Week's Context** (meetings and deals used for prioritisation).

## 🤖 Agent Layer

Defined in `agents.js`. The agents run when the page refreshes; there is **no background operation**.

| Agent | What it does | Needs API key |
|-------|--------------|---------------|
| **ATL Brief Agent** | Pre-generates and caches a meeting brief for each Tier 1 client with 2 or more new articles in the last 48 hours, so the Brief modal opens instantly. | Yes |
| **Counter-Positioning Agent** | For competitive articles with relevance of 0.60 or more (capped at 4 per run), drafts an IBM counter-narrative using the conversation-door framework. | Yes |
| **Relationship Pulse** | Flags Tier 1 clients with no mention in 14 or more days. Runs locally with no API call. | No |

Agent results are cached in localStorage (6 hours for briefs and counter-positioning, 2 hours for the pulse).

## 🗺️ Market Coverage

| Market | Countries |
|--------|----------|
| **ANZ** | Australia, New Zealand |
| **ASEAN** | Singapore, Malaysia, Thailand, Indonesia, Philippines, Vietnam |
| **GCG** | Hong Kong, Taiwan, China |
| **ISA** | India, Bangladesh, Sri Lanka, Pakistan |
| **KOREA** | South Korea |

## 🚀 Quick Start

```bash
git clone https://github.com/IBMAPAC/the-signal-today-web.git
cd the-signal-today-web
git push origin main
```

Enable Pages: **Settings → Pages → Source: main branch**

### Configure the AI provider

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/) (Claude) or OpenAI.
2. Open the app → **⚙️ Settings** → **🤖 AI Provider** → choose a provider and enter the key.
3. AI synthesis, the Agents and the briefs are now enabled. Without a key the app falls back to keyword-based summaries.

The key is stored in your browser's localStorage and sent only to the provider you select.

## 👥 Client Portfolio Management

Click **👥 Clients** for client management:

| Feature | Description |
|---------|-------------|
| **Market tabs** | Filter by ANZ, ASEAN, GCG, ISA, Korea |
| **Bulk tier assignment** | Select multiple → set Tier 1/2/3 |
| **CSV import and export** | Bulk manage the watchlist |

The built-in default watchlist (`DEFAULT_CLIENTS` in `sources.js`) has 74 clients. Edit it in the Clients manager or import your own CSV.

### CSV Format
```
Name,Market,Country,Industry,Tier,ATL
DBS,ASEAN,SG,Financial Services,1,John Smith
Telstra,ANZ,AU,Telecommunications,1,Jane Doe
```

### Client Tiers
Tier adds a relevance boost to articles that match a client:

- **Tier 1 (Strategic)**: +0.35
- **Tier 2 (Growth)**: +0.25
- **Tier 3 (Prospect)**: +0.15

## 📊 RSS Sources

**87 curated sources** in `sources.js` across 8 categories (all enabled by default; manage them in Settings → Sources):

| Category | Sources |
|----------|---------|
| 🤖 AI & Agentic | 9 |
| 🛡️ Cybersecurity & Sovereignty | 9 |
| 🌏 APAC Regional | 33 |
| 🏢 Enterprise Tech | 12 |
| ⚔️ Competitive Landscape | 8 |
| 🏗️ Architecture & Platform | 6 |
| 💭 Strategic Analysis | 6 |
| 🔵 IBM & Partners | 4 |

Feeds are fetched from the browser through a chain of public CORS proxies, started staggered so a slow proxy adds no delay. A source that fails 3 times in a row is automatically disabled.

## 🔧 Settings

| Tab | Contents |
|-----|----------|
| **⚙️ General** | AI provider and API keys, Intelligence Engine options, data reset |
| **🏢 Industries** | Industry priority tiers (boost by industry) |
| **📰 Sources** | Add, edit, enable or disable RSS sources |

## 📱 Responsive Design

Optimised for Mac, iPad and iPhone with 44px touch targets (Apple HIG).

## 🛠️ Technical

### Files
Scripts loaded by `index.html`: `sources.js`, `intelligence-engine.js`, `hybrid-classifier.js`, `agents.js`, `app.js`.

### Storage
- **IndexedDB**: 7-day article corpus, 14-day digest history, read state
- **localStorage**: settings, clients, sources, ratings and score drift, section caches, agent caches

### AI Prompts
Prompts build the client list dynamically from your configured watchlist. See `docs/AI_PROMPTS_V2.md`.

### Tests
Browser-based test pages are in `tests/` (open `tests/test-runner.html`). The manual test plan is `docs/test-plan.md`.

---

**Live**: https://ibmapac.github.io/the-signal-today-web/
