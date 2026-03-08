# 📡 The Signal Today - Web Version

An AI-powered intelligence briefing app designed for the **Field CTO of IBM Asia Pacific**, leading 115 ATLs across 343 accounts in 5 markets.

## 🎯 4-Section Layout

| Section | Purpose | Timeframe | AI Analysis |
|---------|---------|-----------|-------------|
| **⚡ Today's Signals** | "Act on this TODAY" | Last 24-48h | Action + IBM angle + competitive alert |
| **📍 Client Radar** | Account-specific intelligence | Real-time | Brief ATL action per client |
| **📢 ATL Enablement** | Team communication | This week | Slack-ready talking points |
| **📚 Deep Reads** | Strategic internalization | 7-14 days | Thesis + leadership implication + CxO question |

### Today's Signals vs Deep Reads

| Aspect | ⚡ Today's Signals | 📚 Deep Reads |
|--------|-------------------|---------------|
| **Question** | "What do I do TODAY?" | "What should I be thinking about?" |
| **Output** | 3-5 actionable items | 3-5 strategic pieces |
| **Format** | Headline + Action + IBM Angle | Thesis + Implication + CxO Question |
| **Use case** | ATL brief, client meeting prep | Board prep, offsite thinking, CxO conversations |
| **Wave tag** | AI WAVE or SOVEREIGNTY WAVE | Time horizon (6mo / 12mo / 2-3yr) |

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

### Configure Claude API

1. Get API key from [console.anthropic.com](https://console.anthropic.com/)
2. Open app → **⚙️ Settings** → Enter API key
3. AI synthesis for Today's Signals and Deep Reads now enabled

## 👥 Client Portfolio Management

Click **👥 Clients** to access full client management:

| Feature | Description |
|---------|-------------|
| **Market Tabs** | Filter by ANZ, ASEAN, GCG, ISA, Korea |
| **Bulk Tier Assignment** | Select multiple → Set Tier 1/2/3 |
| **ATL Assignment** | Link client to ATL name |
| **CSV Import/Export** | Bulk manage 343+ accounts |

### CSV Format
```
Name,Market,Country,Industry,Tier,ATL
DBS,ASEAN,SG,Financial Services,1,John Smith
Telstra,ANZ,AU,Telecommunications,1,Jane Doe
```

### Client Tiers
- **Tier 1 (Strategic)**: +35% boost, daily monitoring
- **Tier 2 (Growth)**: +25% boost, weekly monitoring
- **Tier 3 (Prospect)**: +15% boost, background tracking

## 📊 RSS Sources

**99 curated sources** across 8 categories:

| Category | Sources | Deep Read Priority |
|----------|---------|-------------------|
| 🤖 AI & Agentic | 9 | Medium |
| 🛡️ Sovereignty & Regulation | 19 | High |
| 🌏 APAC Enterprise | 22 | Low |
| 🇨🇳 China & Geopolitics | 6 | Medium |
| ⚔️ Competitive Landscape | 23 | Medium |
| 🏗️ Architecture & Platform | 8 | High |
| 💭 Strategic Perspectives | 7 | **Highest** |
| 🔵 IBM & Partners | 5 | Low |

## 🔧 Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Claude API Key | — | Enables AI synthesis |
| This Week's Context | — | Meetings/deals for prioritization |
| Industry Priorities | Tier 1-3 | Boost by industry |

## 📱 Responsive Design

Optimized for Mac, iPad, and iPhone with 44px touch targets (Apple HIG).

## 🛠️ Technical

### Storage
- **IndexedDB**: 7-day article corpus, 14-day digest history
- **localStorage**: Settings, clients, sources

### AI Prompts
All AI prompts use **dynamic client lists** from your configured watchlist. No hardcoded client names.

---

**Live**: https://ibmapac.github.io/the-signal-today-web/
