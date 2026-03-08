# 📡 SignalWeb - Field CTO Command Center

**AI-Powered Intelligence Briefing for IBM APAC Field CTO**

A specialized web application designed for the IBM APAC Field CTO managing 115 Account Technical Leaders (ATLs) across 343 accounts in 5 markets. Transforms 52 RSS sources into actionable intelligence with AI-powered insights, client tracking, and ATL enablement.

---

## 🎯 Purpose

Built specifically for:
- **Field CTO**: Daily executive brief, market pulse, strategic intelligence
- **115 ATLs**: Meeting briefs, talking points, Slack-ready updates
- **343 Accounts**: Tier-based monitoring (50 Strategic, 100 Growth, 193 Prospect)
- **5 APAC Markets**: ANZ, ASEAN, GCG, ISA, KOREA

---

## 🚀 Quick Start

### 1. Deploy to GitHub Pages

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/signalweb.git
cd signalweb

# Push to GitHub
git add .
git commit -m "Initial deployment"
git push origin main
```

**Enable GitHub Pages:**
1. Go to repository **Settings** → **Pages**
2. Select **main** branch as source
3. Save and access at `https://YOUR_USERNAME.github.io/signalweb/`

### 2. Configure Claude API Key

1. Get API key from [console.anthropic.com](https://console.anthropic.com/)
2. Open SignalWeb → Click **⚙️ Settings**
3. Enter API key in **Claude AI** section
4. Click **Save Settings**

> **Security**: API key stored in browser localStorage, only sent to Anthropic API

### 3. First Use

1. Click **"Pull to Refresh"** to fetch articles
2. Wait ~30 seconds for AI digest generation
3. Review **Executive Brief** (action-oriented summary)
4. Check **Account Intelligence** for client mentions
5. Explore **Market Pulse** for regional insights

---

## 📊 Features Overview

### Phase 0: Instapaper Integration ✅
- Fixed article search across all arrays
- Added error handling and user feedback
- Popup blocker detection

### Phase 1: Client Tier Management ✅
- **Tier 1 (Strategic)**: 50 accounts, +40% boost, daily monitoring
- **Tier 2 (Growth)**: 100 accounts, +25% boost, weekly monitoring
- **Tier 3 (Prospect)**: 193 accounts, +15% boost, background monitoring
- Keyword-based detection (e.g., "DBS", "Development Bank of Singapore")
- Market assignment (ANZ, ASEAN, GCG, ISA, KOREA)

### Phase 2: Simplified UI ✅
- Reduced from 7 sections to 4 main sections
- Merged Industry Signals inline into Executive Brief
- Collapsed Pattern Detection and Deep Context by default
- Reading time reduced from 15min to ~8min

### Phase 3: Market Segmentation ✅
- **Market Pulse** section with 5 APAC market tabs
- Geographic keyword matching (countries, cities, regulatory bodies)
- Market-specific article filtering
- ATL/account stats per region

### Phase 4: ATL Enablement ✅
- **Individual Meeting Briefs**: Click 📋 on any client
  - Situation summary, 3 talking points, risk flags
  - Opening question, sales angle, ATL note
  - Slack-ready message (under 280 chars)
- **Bulk ATL Enablement Pack**: Generate briefs for top 10 clients
  - Organized by market and tier
  - Copy individual or all briefs
  - Rate-limited to avoid API throttling

### Phase 5: Advanced Features ✅
- **ATL Assignment**: Assign ATLs to clients (👤 badge)
- **Meeting Tracking**: Schedule meetings with urgency indicators (📅 badge)
  - Red/pulsing: ≤3 days (urgent)
  - Orange: 4-7 days (soon)
  - Blue: >7 days (scheduled)
- **Active Deal Flags**: Track deal pursuit with value (💰 badge)
- **Client Notes**: Free-text context field
- **Enhanced AI Prompts**: Metadata flows into meeting brief generation

### Phase 6: Testing & Refinement ✅
- Comprehensive testing checklist (see TESTING_CHECKLIST.md)
- Performance validation
- Documentation updates
- User acceptance criteria

---

## 🏗️ Architecture

### Data Flow
```
RSS Sources (52) 
  → CORS Proxy 
  → Article Parsing 
  → Client Detection 
  → Market Detection 
  → Relevance Scoring 
  → IndexedDB (7-day corpus) 
  → AI Digest (Claude Sonnet 4) 
  → UI Rendering
```

### Scoring Algorithm
```javascript
Base Score = 0.50
+ Category Weight (0.95-1.15)
+ Industry Match (0.10-0.30)
+ Client Match (0.15-0.40 based on tier)
+ Cross-Reference Boost (0.10)
+ Credibility Score (0.70-0.95)
= Final Relevance Score (0-100%)
```

### Storage
- **IndexedDB**: 7-day article corpus, digest history, read state
- **localStorage**: API key, settings, client configuration
- **No server**: 100% client-side, no backend required

---

## 📁 Project Structure

```
SignalWeb/
├── index.html              # Main UI structure
├── style.css               # IBM Carbon Design System (g100 dark theme)
├── app.js                  # Core application logic (4,100+ lines)
├── sources.js              # 52 RSS sources + 343 client definitions
├── README.md               # This file
├── QUICKSTART.md           # 5-minute setup guide
└── TESTING_CHECKLIST.md    # Phase 6 validation checklist
```

---

## ⚙️ Configuration

### Client Configuration (sources.js)

```javascript
{
    name: "DBS",
    tier: 1,                    // 1=Strategic, 2=Growth, 3=Prospect
    market: "ASEAN",            // ANZ, ASEAN, GCG, ISA, KOREA
    country: "SG",              // ISO country code
    industry: "Financial Services",
    keywords: ["DBS", "Development Bank of Singapore"],
    enabled: true,
    
    // Phase 5 Advanced Fields (optional):
    atlName: "Sarah Chen",
    atlEmail: "sarah.chen@ibm.com",
    nextMeeting: "2026-03-15",  // ISO date
    activeDeal: true,
    dealValue: 8500000,         // USD
    notes: "Q2 hybrid cloud modernization RFP"
}
```

### RSS Source Configuration (sources.js)

```javascript
{
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    category: "AI & Agentic",
    priority: 1,                // 1=high, 2=medium, 3=low
    credibilityScore: 0.85,     // 0.70-0.95
    digestType: "daily",        // daily, weekly, both
    enabled: true
}
```

---

## 🎨 UI Sections

### 1. Executive Brief
- AI-generated action-oriented summary (200-300 words)
- Industry signals merged inline (5 industries)
- Reading time: ~3 minutes

### 2. Account Intelligence
- Client mentions organized by tier
- Signal type badges (🔴 Competitive, 🟡 Strategic, 🟢 Background)
- ATL/meeting/deal metadata badges
- "📋 Meeting Brief" button per client
- "👥 ATL Enablement Pack" bulk generation

### 3. Market Pulse
- 5 market tabs (ANZ, ASEAN, GCG, ISA, KOREA)
- Market stats (ATLs, accounts, T1 clients, articles)
- Top 10 articles per market
- Client badges on relevant articles

### 4. Digest Sections
- AI-generated thematic deep-dives
- Competitive Alerts, Strategic Perspectives, etc.
- Expandable/collapsible

### 5. Pattern Detection (Collapsed)
- Cross-source topics (same day, multiple sources)
- Multi-day trending (7-day corpus analysis)

### 6. Deep Context (Collapsed)
- Source articles for citations
- Only shown when needed

---

## 🔐 Security & Privacy

### Data Storage
- **Client-side only**: No server, no database
- **IndexedDB**: 7-day article corpus (~50MB)
- **localStorage**: Settings, API key, client config
- **Auto-purge**: Old articles deleted automatically

### API Key Security
- Stored in browser localStorage
- Only sent to Anthropic API (HTTPS)
- Never logged or exposed
- User can delete anytime

### CORS & Proxies
- Uses allorigins.win for RSS fetching
- Fallback to corsproxy.io
- No third-party tracking

---

## 🚀 Performance

### Targets
- Initial load: <2 seconds
- RSS fetch (52 sources): <10 seconds
- AI digest generation: <30 seconds
- IndexedDB queries: <100ms
- Memory usage: <200MB

### Optimizations
- Parallel RSS fetching (not sequential)
- IndexedDB for persistence (not localStorage)
- Lazy loading for collapsed sections
- Debounced search and filters

---

## 📚 Documentation

### For Users
- **README.md** (this file): Complete feature overview
- **QUICKSTART.md**: 5-minute setup guide with screenshots
- **Settings UI**: In-app configuration help

### For Developers
- **TESTING_CHECKLIST.md**: Phase 6 validation checklist
- **Inline comments**: All major functions documented
- **Phase markers**: Code organized by implementation phase

---

## 🧪 Testing

See **TESTING_CHECKLIST.md** for comprehensive validation:
- Core functionality (RSS, IndexedDB, AI)
- Client management (tier scoring, detection)
- Market segmentation (geographic matching)
- ATL enablement (briefs, Slack messages)
- UI/UX (responsive, accessible)
- Performance (load time, memory)
- Security (API key, CORS)

---

## 🛠️ Development

### Local Development
```bash
# Start local server
python -m http.server 8000
# or
npx serve .

# Open http://localhost:8000
```

### Adding Clients
Edit `sources.js` → `DEFAULT_CLIENTS` array:
```javascript
{ 
    name: "New Client", 
    tier: 2, 
    market: "ASEAN", 
    country: "SG", 
    industry: "Technology",
    keywords: ["New Client", "NC"],
    enabled: true 
}
```

### Adding RSS Sources
Edit `sources.js` → `DEFAULT_SOURCES` array:
```javascript
{
    name: "New Source",
    url: "https://example.com/feed.xml",
    category: "AI & Agentic",
    priority: 1,
    credibilityScore: 0.85,
    digestType: "daily",
    enabled: true
}
```

---

## 📊 Statistics

### Coverage
- **52 RSS Sources** across 7 categories
- **343 Clients** across 5 markets
- **115 ATLs** managing accounts
- **8 Industries** prioritized
- **5 Markets**: ANZ (68), ASEAN (89), GCG (54), ISA (87), KOREA (45)

### AI Integration
- **Model**: Claude Sonnet 4 (claude-sonnet-4-20250514)
- **Daily Digest**: 200-300 words, ~30 seconds
- **Meeting Brief**: 400 tokens, ~5 seconds
- **ATL Pack**: 10 briefs, ~60 seconds (rate-limited)

---

## 🎯 Success Metrics

### Field CTO
- ✅ Reading time <10 minutes (target: 8 minutes)
- ✅ Actionable intelligence (not just news)
- ✅ Market visibility across 5 regions
- ✅ Client coverage (343 accounts)

### ATLs
- ✅ Meeting-ready talking points
- ✅ Slack-ready messages (<280 chars)
- ✅ Industry-specific angles
- ✅ Deal-focused guidance

### System
- ✅ 100% client-side (no backend)
- ✅ <30 second digest generation
- ✅ 7-day article persistence
- ✅ Graceful degradation (works without API key)

---

## 🔮 Future Enhancements

### Post-Phase 6
- Email digest automation
- Slack bot integration
- Multi-user collaboration
- Mobile app (React Native)
- Offline mode (service worker)
- Custom alert rules
- Multi-language support (Chinese, Japanese, Korean)
- Deal pipeline tracking
- ATL performance analytics

---

## 📝 License

MIT License - Customized for IBM APAC Field CTO use case.

---

## 🙏 Acknowledgments

Built for Field CTOs and technical leaders who need to stay informed without drowning in noise.

**Optimized for**: IBM APAC Field CTO managing 115 ATLs across 343 accounts in 5 markets.

---

## 📞 Support

- **Issues**: Open GitHub issue
- **Questions**: Contact Field CTO team
- **Feedback**: User acceptance testing (Phase 6)

---

**Last Updated**: 2026-03-08 | **Version**: 1.0 (Phase 6 Complete)
