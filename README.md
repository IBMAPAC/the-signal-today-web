# 📡 The Signal Today - Web Version

An AI-powered intelligence briefing app for enterprise technology leaders. This web version runs on GitHub Pages and provides:

- **52 Curated RSS Sources** across 7 categories
- **Industry & Client Matching** with configurable priorities
- **Cross-Reference Detection** for trending topics
- **AI-Powered Digests** via Claude API
- **Action-Oriented Summaries** framed for client conversations

## 🚀 Quick Start

### Deploy to GitHub Pages

1. **Fork or Clone this Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/the-signal-today-web.git
   cd the-signal-today-web
   ```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Navigate to **Settings** → **Pages**
   - Under "Source", select **main** branch
   - Click **Save**
   - Your site will be available at `https://YOUR_USERNAME.github.io/the-signal-today-web/`

### Configure Claude API (Optional but Recommended)

1. Get your API key from [console.anthropic.com](https://console.anthropic.com/)
2. Open the app and click **⚙️ Settings**
3. Enter your API key in the **Claude AI** section
4. Click **Save Settings**

> **Note:** The API key is stored in your browser's localStorage and never sent to any server except Anthropic's API.

## 📱 Features

### Daily Digest
- Fetches articles from 52 curated RSS sources
- Scores articles based on relevance, industry match, and client mentions
- Generates AI-powered action briefs (with Claude API key)
- Enforces time budget (default: 15 minutes)

### Categories
| Category | Sources | Focus |
|----------|---------|-------|
| 🤖 AI & Agentic | 6 | Enterprise AI, LLMs, agents |
| 🛡️ Sovereignty & Regulation | 7 | Privacy, compliance, governance |
| 🌏 APAC Enterprise | 9 | Regional tech news |
| 🇨🇳 China & Geopolitics | 4 | US-China dynamics |
| ⚔️ Competitive Landscape | 9 | Microsoft, AWS, Google, consultancies |
| 🏗️ Architecture & Platform | 7 | Cloud native, Kubernetes, platforms |
| 💭 Strategic Perspectives | 10 | Analysts, thought leadership |

### Industry Priorities
Configure tier-based boosts for your focus industries:
- **Tier 1 (+30%)**: Financial Services, Government, Manufacturing, Energy, Retail
- **Tier 2 (+20%)**: Telecommunications, Healthcare
- **Tier 3 (+10%)**: Technology

### Client Watchlist
Add companies to monitor (+25% boost when mentioned):
- DBS, OCBC, UOB, Singtel, Telstra, ANZ, Commonwealth Bank, etc.

## 🔧 Configuration

### Settings
Access via the ⚙️ button:

| Setting | Default | Description |
|---------|---------|-------------|
| Claude API Key | - | For AI-powered digests |
| Daily Minutes | 15 | Reading time budget |
| Weekly Articles | 5 | Max articles for weekly digest |
| Industry Priorities | Tier 1-3 | Boost relevance by industry |
| Client Watchlist | 13 defaults | Companies to monitor |

### Data Storage
All data is stored in browser localStorage:
- `signal_api_key` - Claude API key (encrypted in browser)
- `signal_sources` - RSS source configuration
- `signal_industries` - Industry priorities
- `signal_clients` - Client watchlist
- `signal_articles` - Cached articles
- `signal_digest` - Last generated digest

## 🛠️ Development

### Local Development
```bash
# Start a local server
python -m http.server 8000
# or
npx serve .

# Open http://localhost:8000
```

### Project Structure
```
the-signal-today-web/
├── index.html      # Main HTML structure
├── style.css       # Styling (supports dark mode)
├── sources.js      # Default sources & configuration
├── app.js          # Application logic
└── README.md       # Documentation
```

### Adding Sources
Edit `sources.js` to add new RSS feeds:
```javascript
{
    name: "Source Name",
    url: "https://example.com/feed.xml",
    category: "AI & Agentic",
    priority: 1,  // 1=high, 2=medium, 3=low
    credibilityScore: 0.90,
    digestType: "daily",  // daily, weekly, or both
    enabled: true
}
```

## 🔒 Privacy & Security

- **No server-side storage** - All data stays in your browser
- **API key security** - Only sent to Anthropic's API
- **CORS proxy** - Uses allorigins.win for RSS fetching
- **No tracking** - No analytics or third-party scripts

## 📝 License

MIT License - Feel free to fork and customize for your needs.

## 🙏 Credits

Built for Field CTOs and technical leaders who need to stay informed without drowning in noise.

---

**Questions?** Open an issue on GitHub.
