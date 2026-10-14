// =============================================
// The Signal Today - Optimized Sources Configuration
// Version 3.6 - 84 Working Feeds
// =============================================

const DEFAULT_SOURCES = [
    // ============================================
    // 🤖 AI & AGENTIC (9 sources — replaced RTInsights MLOps + ClearML with Anthropic + LangChain)
    // ============================================
    {
        name: "MIT Tech Review",
        url: "https://www.technologyreview.com/feed/",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "Import AI",
        url: "https://importai.substack.com/feed",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.92,
        digestType: "daily",
        enabled: true
    },
    {
        name: "AI Snake Oil",
        url: "https://www.aisnakeoil.com/feed",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
     {
        name: "Nvidia AI Blog",
        url: "https://blogs.nvidia.com/feed/",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.82,
        digestType: "both",
        enabled: true
    },
    {
        name: "OpenAI Blog",
        url: "https://openai.com/news/rss.xml",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Hugging Face Blog",
        url: "https://huggingface.co/blog/feed.xml",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "The Next Platform",
        url: "https://www.nextplatform.com/feed/",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Anthropic News",
        url: "https://anthropic.substack.com/feed",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },
    {
        name: "LangChain Blog",
        url: "https://blog.langchain.dev/rss/",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 🛡️ CYBERSECURITY & SOVEREIGNTY (9 sources — added OAIC Australia + MediaNama India for APAC regulatory coverage)
    // ============================================
    {
        name: "NIST Cybersecurity",
        url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml",
        category: "Cybersecurity & Sovereignty",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "Dark Reading",
        url: "https://www.darkreading.com/rss.xml",
        category: "Cybersecurity & Sovereignty",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Krebs on Security",
        url: "https://krebsonsecurity.com/feed/",
        category: "Cybersecurity & Sovereignty",
        priority: 1,
        credibilityScore: 0.92,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Computerworld",
        url: "https://www.computerworld.com/feed/",
        category: "Cybersecurity & Sovereignty",
        priority: 1,
        credibilityScore: 0.86,
        digestType: "daily",
        enabled: true
    },
    {
        name: "CRN Security",
        url: "https://www.crn.com/news/security/rss.xml",
        category: "Cybersecurity & Sovereignty",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "CISA Alerts",
        url: "https://www.cisa.gov/news.xml",
        category: "Cybersecurity & Sovereignty",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "daily",
        enabled: true
    },
    {
        name: "NCSC UK",
        url: "https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml",
        category: "Cybersecurity & Sovereignty",
        priority: 2,
        credibilityScore: 0.92,
        digestType: "daily",
        enabled: true
    },
    {
        name: "OAIC Australia",
        url: "https://www.oaic.gov.au/site-configuration/rss",
        category: "Cybersecurity & Sovereignty",
        priority: 1,
        credibilityScore: 0.93,
        digestType: "both",
        enabled: true
    },
    {
        name: "MediaNama",
        url: "https://medianama.com/feed/",
        category: "Cybersecurity & Sovereignty",
        priority: 1,
        credibilityScore: 0.86,
        digestType: "both",
        enabled: true
    },

    // ============================================
    // 🌏 APAC REGIONAL (27 sources — added Nikkei Asia, GovInsider, Business Times SG, Fintech News SG, TechNode; removed TechCrunch SEA/ASEAN duplicates, ASEAN News Today, Strategy+Business duplicate, e27)
    // ============================================
    {
        name: "Rest of World",
        url: "https://restofworld.org/feed/latest/",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.92,
        digestType: "both",
        enabled: true
    },
    {
        name: "The Ken",
        url: "https://the-ken.com/feed/",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "DigiChina Stanford",
        url: "https://digichina.stanford.edu/feed/",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.92,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "SCMP",
        url: "https://www.scmp.com/rss/5/feed",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "TechCrunch Japan",
        url: "https://techcrunch.com/tag/japan/feed/",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Korea Herald Tech",
        url: "https://www.koreaherald.com/rss/tech.xml",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "iTnews Australia",
        url: "https://www.itnews.com.au/RSS/rss.ashx",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "iTnews Asia",
        url: "https://www.itnews.asia/RSS/rss.ashx",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.86,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Yonhap News",
        url: "https://en.yna.co.kr/RSS/news.xml",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "LiveMint Tech",
        url: "https://livemint.com/rss/technology",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "LiveMint AI",
        url: "https://livemint.com/rss/AI",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "ET CIO India",
        url: "https://cio.economictimes.indiatimes.com/rss",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Digital News Asia",
        url: "https://www.digitalnewsasia.com/rss.xml",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Economic Times Tech",
        url: "https://tech.economictimes.indiatimes.com/rss/latest",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "ABC News Tech",
        url: "https://www.abc.net.au/news/feed/2942460/rss.xml",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Bangkok Post Tech",
        url: "https://www.bangkokpost.com/rss/data/tech.xml",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "TechCrunch Asia",
        url: "https://techcrunch.com/tag/asia/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "KrASIA",
        url: "https://console.kr-asia.com/feed",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "GovInsider",
        url: "https://govinsider.asia/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "ChinaTalk",
        url: "https://chinatalk.substack.com/feed",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.88,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Trivium China",
        url: "https://triviumchina.com/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Asia Times",
        url: "https://asiatimes.com/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Katadata",
        url: "https://katadata.co.id/rss",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "DailySocial",
        url: "https://dailysocial.id/feed",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "VnExpress Tech",
        url: "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "YourStory",
        url: "https://yourstory.com/feed",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "TechNode",
        url: "https://technode.com/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "IT Brief New Zealand",
        url: "https://itbrief.co.nz/feed",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "PanDaily",
        url: "https://pandaily.com/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "The Diplomat",
        url: "https://thediplomat.com/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "The Business Times SG",
        url: "https://www.businesstimes.com.sg/rss/all",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Fintech News Singapore",
        url: "https://fintechnews.sg/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Korea IT Times",
        url: "https://www.koreaittimes.com/rss/S1N1.xml",
        category: "APAC Regional",
        priority: 3,
        credibilityScore: 0.78,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // 🏢 ENTERPRISE TECH (13 sources — IDC retained; removed Gartner Newsroom, ZDNet, The Register Cloud, 3x TechRepublic → 1)
    // ============================================
    {
        name: "MIT Sloan Review",
        url: "https://sloanreview.mit.edu/feed/",
        category: "Enterprise Tech",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Forrester",
        url: "https://www.forrester.com/blogs/feed/",
        category: "Enterprise Tech",
        priority: 1,
        credibilityScore: 0.93,
        digestType: "both",
        enabled: true
    },
    {
        name: "The Register",
        url: "https://www.theregister.com/headlines.atom",
        category: "Enterprise Tech",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "InformationWeek",
        url: "https://www.informationweek.com/rss.xml",
        category: "Enterprise Tech",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "InfoWorld",
        url: "https://www.infoworld.com/feed/",
        category: "Enterprise Tech",
        priority: 1,
        credibilityScore: 0.86,
        digestType: "daily",
        enabled: true
    },
    {
        name: "CIO Dive",
        url: "https://www.ciodive.com/feeds/news/",
        category: "Enterprise Tech",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "IDC Blog",
        url: "https://blogs.idc.com/feed/",
        category: "Enterprise Tech",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Computer Weekly All",
        url: "https://www.computerweekly.com/rss/All-Computer-Weekly-content.xml",
        category: "Enterprise Tech",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "SiliconANGLE",
        url: "https://siliconangle.com/feed/",
        category: "Enterprise Tech",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "CloudWars",
        url: "https://cloudwars.com/feed/",
        category: "Enterprise Tech",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "TechRepublic",
        url: "https://www.techrepublic.com/rssfeeds/articles/",
        category: "Enterprise Tech",
        priority: 3,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Wired Business",
        url: "https://www.wired.com/feed/category/business/latest/rss",
        category: "Enterprise Tech",
        priority: 3,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // ⚔️ COMPETITIVE LANDSCAPE (8 sources — replaced unofficial Azure Feeds with official Azure Blog)
    // ============================================
    {
        name: "AWS Blog",
        url: "https://aws.amazon.com/blogs/aws/feed/",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.88,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Azure DevOps Blog",
        url: "https://devblogs.microsoft.com/devops/feed/",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.88,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Microsoft Security",
        url: "https://www.microsoft.com/en-us/security/blog/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Google AI Blog",
        url: "https://blog.google/technology/ai/rss/",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.86,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Salesforce Blog",
        url: "https://www.salesforce.com/blog/feed/",
        category: "Competitive Landscape",
        priority: 3,
        credibilityScore: 0.80,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "SAP News",
        url: "https://news.sap.com/feed/",
        category: "Competitive Landscape",
        priority: 3,
        credibilityScore: 0.80,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Azure Blog",
        url: "https://azure.microsoft.com/en-us/blog/feed/",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.88,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "AWS Enterprise Strategy",
        url: "https://aws.amazon.com/blogs/enterprise-strategy/feed/",
        category: "Competitive Landscape",
        priority: 3,
        credibilityScore: 0.82,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 🏗️ ARCHITECTURE & PLATFORM (6 sources)
    // ============================================
    {
        name: "InfoQ",
        url: "https://feed.infoq.com/",
        category: "Architecture & Platform",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "The New Stack",
        url: "https://thenewstack.io/feed/",
        category: "Architecture & Platform",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "both",
        enabled: true
    },
    {
        name: "SemiAnalysis",
        url: "https://semianalysis.substack.com/feed",
        category: "Architecture & Platform",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "CNCF Blog",
        url: "https://www.cncf.io/blog/feed/",
        category: "Architecture & Platform",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Platform Engineering",
        url: "https://platformengineering.org/blog/rss.xml",
        category: "Architecture & Platform",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "both",
        enabled: true
    },
    {
        name: "DevOps.com",
        url: "https://devops.com/feed/",
        category: "Architecture & Platform",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 📊 STRATEGIC ANALYSIS (6 sources)
    // ============================================
    {
        name: "Stratechery",
        url: "https://stratechery.com/feed/",
        category: "Strategic Analysis",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "Ben Evans",
        url: "https://www.ben-evans.com/benedictevans?format=rss",
        category: "Strategic Analysis",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "McKinsey Insights",
        url: "https://www.mckinsey.com/insights/rss/",
        category: "Strategic Analysis",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "HBR Technology",
        url: "https://hbr.org/topic/subject/technology-and-analytics/feed",
        category: "Strategic Analysis",
        priority: 1,
        credibilityScore: 0.93,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Constellation Research",
        url: "https://www.constellationr.com/feed",
        category: "Strategic Analysis",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Capgemini Insights",
        url: "https://www.capgemini.com/feed/",
        category: "Strategic Analysis",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 🔵 IBM & PARTNERS (4 sources — IBM Research, Red Hat Blog, OpenShift Blog, IBM Newsroom; removed IBM Think Blog — no RSS)
    // ============================================
    {
        name: "IBM Research",
        url: "https://research.ibm.com/rss",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.92,
        digestType: "both",
        enabled: true
    },
    {
        name: "Red Hat Blog",
        url: "https://www.redhat.com/en/rss/blog",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "both",
        enabled: true
    },
    {
        name: "OpenShift Blog",
        url: "https://www.redhat.com/en/rss/blog/channel/red-hat-openshift",
        category: "IBM & Partners",
        priority: 2,
        credibilityScore: 0.86,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "IBM Newsroom",
        url: "https://newsroom.ibm.com/announcements?pagetemplate=rss",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.92,
        digestType: "daily",
        enabled: true
    }
];

// ============================================
// DEFAULT INDUSTRY PRIORITIES
// ============================================
const DEFAULT_INDUSTRIES = [
    { name: "Financial Services", emoji: "🏦", tier: 1, enabled: true },
    { name: "Government", emoji: "🏛️", tier: 1, enabled: true },
    { name: "Manufacturing", emoji: "🏭", tier: 1, enabled: true },
    { name: "Energy", emoji: "⚡", tier: 1, enabled: true },
    { name: "Retail", emoji: "🛒", tier: 1, enabled: true },
    { name: "Telecommunications", emoji: "📡", tier: 2, enabled: true },
    { name: "Healthcare", emoji: "🏥", tier: 2, enabled: true },
    { name: "Technology", emoji: "💻", tier: 3, enabled: true }
];

// ============================================
// MARKET CONFIGURATION
// Maps countries to IBM APAC markets
// ============================================
const MARKET_COUNTRIES = {
    'ANZ': ['AU', 'NZ'],
    'ASEAN': ['SG', 'MY', 'TH', 'ID', 'PH', 'VN', 'MM', 'KH', 'LA', 'BN'],
    'GCG': ['HK', 'TW', 'CN', 'MO'],  // Greater China Group
    'ISA': ['IN', 'BD', 'LK', 'PK', 'NP'],  // India & South Asia
    'KOREA': ['KR'],
    'JAPAN': ['JP']  // Japan often separate in IBM structure
};

// Helper to get market from country code
function getMarketFromCountry(countryCode) {
    for (const [market, countries] of Object.entries(MARKET_COUNTRIES)) {
        if (countries.includes(countryCode)) return market;
    }
    return 'OTHER';
}

// ============================================
// EXPANDED CLIENT WATCHLIST — WITH MARKETS
// Tier 1 = Strategic (daily monitoring)
// Tier 2 = Growth (weekly monitoring)
// Tier 3 = Prospect / Background
// ============================================
const DEFAULT_CLIENTS = [
    // ─── ANZ MARKET ───────────────────────────────────
    { name: "ANZ", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "George Yiapanis", aliases: ["ANZ Group","ANZ Bank","Australia and New Zealand Banking Group"] },
    { name: "AU Defence", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "Paul Cusch", aliases: ["Department of Defence","Australian Defence Force"] },
    { name: "AU Treasury", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "Matthew Robinson", aliases: ["Department of the Treasury","Australian Treasury"] },
    { name: "Bendigo Bank", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Guy Sharon", aliases: ["Bendigo and Adelaide Bank"] },
    { name: "BHP", tier: 1, country: "AU", market: "ANZ", industry: "Energy", atl: "Sitthichai Rernglertpricha", aliases: ["BHP Group","BHP Billiton"] },
    { name: "CBA", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Ariel Polanco", aliases: ["Commonwealth Bank","CommBank","Commonwealth Bank of Australia"] },
    { name: "Citizen Services AU", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "Jaysen Ollerenshaw" },
    { name: "Coles", tier: 1, country: "AU", market: "ANZ", industry: "Retail", atl: "Craig Spiteri", aliases: ["Coles Group"] },
    { name: "DXC", tier: 1, country: "AU", market: "ANZ", industry: "Technology", atl: "Nima Moghadam", aliases: ["DXC Technology"] },
    { name: "FIS", tier: 1, country: "AU", market: "ANZ", industry: "Technology", atl: "John Heap", aliases: ["Fidelity National Information Services"] },
    { name: "Fonterra", tier: 1, country: "NZ", market: "ANZ", industry: "Retail", atl: "Libby Lavrova", aliases: ["Fonterra Co-operative Group"] },
    { name: "IAG", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Erol Gurcinar", aliases: ["Insurance Australia Group"] },
    { name: "IRD", tier: 1, country: "NZ", market: "ANZ", industry: "Government", atl: "Tony Michael Buswell", aliases: ["Inland Revenue"] },
    { name: "Macquarie", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Erol Gurcinar", aliases: ["Macquarie Group"] },
    { name: "Mater", tier: 1, country: "AU", market: "ANZ", industry: "Healthcare", atl: "Nima Moghadam", aliases: ["Mater Health","Mater Group"] },
    { name: "Mutual Marketplace", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Nima Moghadam" },
    { name: "NAB", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "John Heap", aliases: ["National Australia Bank"] },
    { name: "National Security AU", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "David Centellas" },
    { name: "NSW Govt", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "Matthew Robinson", aliases: ["NSW Government"] },
    { name: "NT Government (DCDD)", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "Sam Paisley", aliases: ["NT Government","Department of Corporate and Digital Development"] },
    { name: "Qantas", tier: 1, country: "AU", market: "ANZ", industry: "Transportation & Logistics", atl: "Craig Spiteri", aliases: ["Qantas Airways"] },
    { name: "QBE", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Ariel Polanco", aliases: ["QBE Insurance"] },
    { name: "Revenue Services AU", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "Sharon Choo" },
    { name: "Rio Tinto", tier: 1, country: "AU", market: "ANZ", industry: "Energy", atl: "Nick Merrett", aliases: ["Rio Tinto Group"] },
    { name: "Spark", tier: 1, country: "NZ", market: "ANZ", industry: "Telecommunications", atl: "Glen Stenbeck", aliases: ["Spark New Zealand"] },
    { name: "Suncorp", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Guy Sharon", aliases: ["Suncorp Group","Suncorp-Metway"] },
    { name: "Telstra", tier: 1, country: "AU", market: "ANZ", industry: "Telecommunications", atl: "Daniel Gagic", aliases: ["Telstra Group","Telstra Corporation"] },
    { name: "VIC Police", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "Sam Paisley", aliases: ["Victoria Police"] },
    { name: "Wesfarmers", tier: 1, country: "AU", market: "ANZ", industry: "Retail", atl: "Sitthichai Rernglertpricha" },
    { name: "Westpac AU", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", atl: "David Arnold", aliases: ["Westpac","Westpac Banking Corporation"] },
    { name: "Westpac NZ", tier: 1, country: "NZ", market: "ANZ", industry: "Financial Services", atl: "David Arnold", aliases: ["Westpac New Zealand"] },
    { name: "Woolworths", tier: 1, country: "AU", market: "ANZ", industry: "Retail", atl: "Craig Spiteri", aliases: ["Woolworths Group"] },
    { name: "WorkSafe VIC", tier: 1, country: "AU", market: "ANZ", industry: "Government", atl: "Sam Paisley", aliases: ["WorkSafe Victoria"] },
    { name: "ACC", tier: 2, country: "NZ", market: "ANZ", industry: "Government", atl: "Tony Michael Buswell", aliases: ["Accident Compensation Corporation"] },
    { name: "AIA NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Financial Services", atl: "Glen Stenbeck", aliases: ["AIA New Zealand"] },
    { name: "Air NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Transportation & Logistics", atl: "Glen Stenbeck", aliases: ["Air New Zealand"] },
    { name: "ANZ NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Financial Services", atl: "Felipe Frossard", aliases: ["ANZ New Zealand"] },
    { name: "Ausgrid", tier: 2, country: "AU", market: "ANZ", industry: "Energy", atl: "Ben Ma" },
    { name: "AusPost", tier: 2, country: "AU", market: "ANZ", industry: "Government", atl: "David Nemirovsky", aliases: ["Australia Post"] },
    { name: "CBA NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Financial Services", atl: "Felipe Frossard", aliases: ["ASB Bank"] },
    { name: "CSL", tier: 2, country: "AU", market: "ANZ", industry: "Healthcare", atl: "James Ormrod", aliases: ["CSL Limited"] },
    { name: "Fletcher", tier: 2, country: "NZ", market: "ANZ", industry: "Manufacturing", atl: "Stuart Sweetman", aliases: ["Fletcher Building"] },
    { name: "Fortescue", tier: 2, country: "AU", market: "ANZ", industry: "Energy", atl: "Drew Johnson", aliases: ["Fortescue Metals Group"] },
    { name: "Genesis", tier: 2, country: "NZ", market: "ANZ", industry: "Energy", atl: "Libby Lavrova", aliases: ["Genesis Energy"] },
    { name: "Health NZ (Te Whatu Ora)", tier: 2, country: "NZ", market: "ANZ", industry: "Healthcare", atl: "Libby Lavrova", aliases: ["Health New Zealand","Te Whatu Ora"] },
    { name: "IAG NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Financial Services", atl: "Libby Lavrova", aliases: ["IAG New Zealand"] },
    { name: "NAB NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Financial Services", atl: "Felipe Frossard", aliases: ["Bank of New Zealand","BNZ"] },
    { name: "NBN", tier: 2, country: "AU", market: "ANZ", industry: "Telecommunications", atl: "Nick Merrett", aliases: ["NBN Co"] },
    { name: "NZ Police", tier: 2, country: "NZ", market: "ANZ", industry: "Government", atl: "Tony Michael Buswell", aliases: ["New Zealand Police"] },
    { name: "NZDF", tier: 2, country: "NZ", market: "ANZ", industry: "Government", atl: "Tony Michael Buswell", aliases: ["New Zealand Defence Force"] },
    { name: "One NZ (Vodafone)", tier: 2, country: "NZ", market: "ANZ", industry: "Telecommunications", atl: "Stuart Sweetman", aliases: ["One NZ","Vodafone New Zealand"] },
    { name: "Optus", tier: 2, country: "AU", market: "ANZ", industry: "Telecommunications", atl: "Keith Byrne", aliases: ["Singtel Optus"] },
    { name: "QBE NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Financial Services", atl: "Libby Lavrova", aliases: ["QBE New Zealand"] },
    { name: "QLD Health", tier: 2, country: "AU", market: "ANZ", industry: "Healthcare", atl: "Valery Kornienko", aliases: ["Queensland Health"] },
    { name: "SA Health", tier: 2, country: "AU", market: "ANZ", industry: "Healthcare", atl: "Felicia Eng" },
    { name: "Suncorp NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Financial Services", atl: "Glen Stenbeck", aliases: ["Suncorp New Zealand","Vero Insurance"] },
    { name: "Sydney Water", tier: 2, country: "AU", market: "ANZ", industry: "Energy", atl: "Ben Ma", aliases: ["Sydney Water Corporation"] },
    { name: "Transurban", tier: 2, country: "AU", market: "ANZ", industry: "Transportation & Logistics", atl: "David Nemirovsky", aliases: ["Transurban Group"] },
    { name: "VIC Health", tier: 2, country: "AU", market: "ANZ", industry: "Healthcare", atl: "Felicia Eng" },
    { name: "Xero", tier: 2, country: "NZ", market: "ANZ", industry: "Technology", atl: "Glen Stenbeck" },
    { name: "AIA AU", tier: 3, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Wanita Sherchan", aliases: ["AIA Australia"] },
    { name: "ALS", tier: 3, country: "AU", market: "ANZ", industry: "Professional Services", atl: "Valery Kornienko", aliases: ["ALS Limited"] },
    { name: "Amcor", tier: 3, country: "AU", market: "ANZ", industry: "Manufacturing", atl: "David Nemirovsky" },
    { name: "API (Priceline)", tier: 3, country: "AU", market: "ANZ", industry: "Healthcare", atl: "Felicia Eng", aliases: ["Australian Pharmaceutical Industries","Priceline Pharmacy"] },
    { name: "BAE Systems", tier: 3, country: "AU", market: "ANZ", industry: "Manufacturing", atl: "Rejith Ravindran", aliases: ["BAE Systems Australia"] },
    { name: "BlueScope", tier: 3, country: "AU", market: "ANZ", industry: "Manufacturing", atl: "James Ormrod", aliases: ["BlueScope Steel"] },
    { name: "BOQ", tier: 3, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Tim Yaftali", aliases: ["Bank of Queensland"] },
    { name: "Boral", tier: 3, country: "AU", market: "ANZ", industry: "Manufacturing", atl: "Monadil Syed" },
    { name: "Brambles", tier: 3, country: "AU", market: "ANZ", industry: "Transportation & Logistics", atl: "Monadil Syed", aliases: ["CHEP"] },
    { name: "Bupa", tier: 3, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Wanita Sherchan", aliases: ["Bupa Australia"] },
    { name: "Coates", tier: 3, country: "AU", market: "ANZ", industry: "Manufacturing", atl: "Monadil Syed", aliases: ["Coates Hire"] },
    { name: "Crown", tier: 3, country: "AU", market: "ANZ", industry: "Media & Entertainment", atl: "James Ormrod", aliases: ["Crown Resorts","Crown Melbourne"] },
    { name: "Datacom", tier: 3, country: "NZ", market: "ANZ", industry: "Technology", atl: "Stuart Sweetman", aliases: ["Datacom Group"] },
    { name: "David Jones", tier: 3, country: "AU", market: "ANZ", industry: "Retail", atl: "Rejith Ravindran" },
    { name: "Deakin", tier: 3, country: "AU", market: "ANZ", industry: "Government", atl: "James Ormrod", aliases: ["Deakin University"] },
    { name: "Downer", tier: 3, country: "AU", market: "ANZ", industry: "Manufacturing", atl: "Ben Ma", aliases: ["Downer EDI","Downer Group"] },
    { name: "Endeavour", tier: 3, country: "AU", market: "ANZ", industry: "Retail", atl: "James Kwan", aliases: ["Endeavour Group"] },
    { name: "Ergon", tier: 3, country: "AU", market: "ANZ", industry: "Energy", atl: "Valery Kornienko", aliases: ["Ergon Energy"] },
    { name: "Flight Centre", tier: 3, country: "AU", market: "ANZ", industry: "Transportation & Logistics", atl: "Valery Kornienko", aliases: ["Flight Centre Travel Group"] },
    { name: "Foodstuffs South Island", tier: 3, country: "NZ", market: "ANZ", industry: "Retail", atl: "Libby Lavrova", aliases: ["Foodstuffs"] },
    { name: "Insignia Financial (IOOF)", tier: 3, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Wanita Sherchan", aliases: ["Insignia Financial","IOOF"] },
    { name: "JB Hi-Fi", tier: 3, country: "AU", market: "ANZ", industry: "Retail", atl: "Rejith Ravindran" },
    { name: "Just Jeans (Premier)", tier: 3, country: "AU", market: "ANZ", industry: "Retail", atl: "Rejith Ravindran", aliases: ["Just Jeans","Premier Investments"] },
    { name: "Lendlease", tier: 3, country: "AU", market: "ANZ", industry: "Manufacturing", aliases: ["Lend Lease"] },
    { name: "Linfox", tier: 3, country: "AU", market: "ANZ", industry: "Transportation & Logistics", atl: "Rejith Ravindran" },
    { name: "Metcash", tier: 3, country: "AU", market: "ANZ", industry: "Retail", atl: "Tim Yaftali" },
    { name: "MoE NZ", tier: 3, country: "NZ", market: "ANZ", industry: "Government", atl: "Tony Michael Buswell", aliases: ["Ministry of Education New Zealand"] },
    { name: "Monash", tier: 3, country: "AU", market: "ANZ", industry: "Government", atl: "James Ormrod", aliases: ["Monash University"] },
    { name: "MSD (Social Welfare)", tier: 3, country: "NZ", market: "ANZ", industry: "Government", atl: "Tony Michael Buswell", aliases: ["Ministry of Social Development"] },
    { name: "Myer", tier: 3, country: "AU", market: "ANZ", industry: "Retail", atl: "Aharon Rossano" },
    { name: "NRE Tas", tier: 3, country: "AU", market: "ANZ", industry: "Government", atl: "James Ormrod", aliases: ["Department of Natural Resources and Environment Tasmania"] },
    { name: "QLD Transport", tier: 3, country: "AU", market: "ANZ", industry: "Government", atl: "Valery Kornienko", aliases: ["Queensland Transport","Department of Transport and Main Roads"] },
    { name: "Ramsay", tier: 3, country: "AU", market: "ANZ", industry: "Healthcare", atl: "James Kwan", aliases: ["Ramsay Health Care"] },
    { name: "Repco (GPC)", tier: 3, country: "AU", market: "ANZ", industry: "Retail", atl: "Aharon Rossano", aliases: ["Repco","Genuine Parts Company"] },
    { name: "ResMed", tier: 3, country: "AU", market: "ANZ", industry: "Healthcare", atl: "James Kwan" },
    { name: "Sky NZ", tier: 3, country: "NZ", market: "ANZ", industry: "Media & Entertainment", atl: "Stuart Sweetman", aliases: ["Sky Network Television","Sky TV"] },
    { name: "Sonic", tier: 3, country: "AU", market: "ANZ", industry: "Healthcare", atl: "Keith Byrne", aliases: ["Sonic Healthcare"] },
    { name: "South32", tier: 3, country: "AU", market: "ANZ", industry: "Energy", atl: "Drew Johnson" },
    { name: "St John of God", tier: 3, country: "AU", market: "ANZ", industry: "Healthcare", atl: "Drew Johnson", aliases: ["St John of God Health Care"] },
    { name: "Symbion (EBOS)", tier: 3, country: "AU", market: "ANZ", industry: "Healthcare", atl: "Felicia Eng", aliases: ["Symbion","EBOS Group"] },
    { name: "Tatts (Lottery Corp)", tier: 3, country: "AU", market: "ANZ", industry: "Media & Entertainment", atl: "Nick Merrett", aliases: ["Tatts Group","The Lottery Corporation"] },
    { name: "Telecom Fiji", tier: 3, country: "NZ", market: "ANZ", industry: "Telecommunications", atl: "Stuart Sweetman" },
    { name: "The Warehouse", tier: 3, country: "NZ", market: "ANZ", industry: "Retail", atl: "Libby Lavrova", aliases: ["The Warehouse Group"] },
    { name: "Toll", tier: 3, country: "AU", market: "ANZ", industry: "Transportation & Logistics", atl: "Aharon Rossano", aliases: ["Toll Group","Toll Holdings"] },
    { name: "Trustpower", tier: 3, country: "NZ", market: "ANZ", industry: "Energy", atl: "Libby Lavrova" },
    { name: "UNSW", tier: 3, country: "AU", market: "ANZ", industry: "Government", atl: "Tim Yaftali", aliases: ["University of New South Wales"] },
    { name: "UoA", tier: 3, country: "NZ", market: "ANZ", industry: "Government", atl: "Stuart Sweetman", aliases: ["University of Auckland"] },
    { name: "UQ", tier: 3, country: "AU", market: "ANZ", industry: "Government", atl: "Valery Kornienko", aliases: ["University of Queensland"] },
    { name: "Ventia", tier: 3, country: "AU", market: "ANZ", industry: "Professional Services", aliases: ["Ventia Services Group"] },
    { name: "VIC Education", tier: 3, country: "AU", market: "ANZ", industry: "Government", atl: "Rejith Ravindran", aliases: ["Victorian Department of Education"] },
    { name: "Vodafone Fiji", tier: 3, country: "NZ", market: "ANZ", industry: "Telecommunications", atl: "Stuart Sweetman" },
    { name: "WesTrac", tier: 3, country: "AU", market: "ANZ", industry: "Manufacturing", atl: "Drew Johnson" },
    { name: "Worley", tier: 3, country: "AU", market: "ANZ", industry: "Professional Services", aliases: ["WorleyParsons"] },
    { name: "Zespri", tier: 3, country: "NZ", market: "ANZ", industry: "Retail", atl: "Glen Stenbeck", aliases: ["Zespri International"] },
    { name: "Zurich", tier: 3, country: "AU", market: "ANZ", industry: "Financial Services", atl: "Keith Byrne", aliases: ["Zurich Insurance","Zurich Australia"] },

    // ─── ASEAN MARKET ───────────────────────────────────
    { name: "Bangkok Bank", tier: 1, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Voravit Lertgitipongpant" },
    { name: "BCA", tier: 1, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Adi Wijaya S", aliases: ["Bank Central Asia"] },
    { name: "BDO", tier: 1, country: "PH", market: "ASEAN", industry: "Financial Services", atl: "JJ Franco", aliases: ["BDO Unibank","Banco de Oro"] },
    { name: "BI", tier: 1, country: "ID", market: "ASEAN", industry: "Government", atl: "Okta Riveranda", aliases: ["Bank Indonesia"] },
    { name: "BNM", tier: 1, country: "MY", market: "ASEAN", industry: "Government", atl: "Liak Kuan Tan", aliases: ["Bank Negara Malaysia","Central Bank of Malaysia"] },
    { name: "BOT", tier: 1, country: "TH", market: "ASEAN", industry: "Government", atl: "Phornthep Suratanavongkul", aliases: ["Bank of Thailand"] },
    { name: "BRI", tier: 1, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Okta Riveranda", aliases: ["Bank Rakyat Indonesia"] },
    { name: "CP Group", tier: 1, country: "TH", market: "ASEAN", industry: "Conglomerate", atl: "Kanoksak Ratchapat", aliases: ["Charoen Pokphand Group","C.P. Group"] },
    { name: "DBS", tier: 1, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Chandran Kumar", aliases: ["DBS Bank","DBS Group"] },
    { name: "EVN", tier: 1, country: "VN", market: "ASEAN", industry: "Energy", atl: "Son Ngo Quang", aliases: ["Vietnam Electricity"] },
    { name: "GIC", tier: 1, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Dineshkumar Ramnath Barai", aliases: ["Government of Singapore Investment Corporation"] },
    { name: "KBank", tier: 1, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Voravit Lertgitipongpant", aliases: ["Kasikornbank"] },
    { name: "Mandiri", tier: 1, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Rekiardi Rekiardi", aliases: ["Bank Mandiri"] },
    { name: "MAS", tier: 1, country: "SG", market: "ASEAN", industry: "Government", atl: "Chandran Kumar", aliases: ["Monetary Authority of Singapore"] },
    { name: "MHA Singapore", tier: 1, country: "SG", market: "ASEAN", industry: "Government", atl: "Nicole Chua", aliases: ["Ministry of Home Affairs Singapore"] },
    { name: "MOM", tier: 1, country: "SG", market: "ASEAN", industry: "Government", atl: "Nicole Chua", aliases: ["Ministry of Manpower"] },
    { name: "OCBC", tier: 1, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Sandesh Udupa", aliases: ["OCBC Bank","Oversea-Chinese Banking Corporation"] },
    { name: "Pertamina", tier: 1, country: "ID", market: "ASEAN", industry: "Energy", atl: "Alvian Zulkhaizar" },
    { name: "PETRONAS", tier: 1, country: "MY", market: "ASEAN", industry: "Energy", atl: "Chee Kin Chan", aliases: ["Petroliam Nasional"] },
    { name: "Petrovietnam (PVN)", tier: 1, country: "VN", market: "ASEAN", industry: "Energy", atl: "Hung Pham Manh", aliases: ["Petrovietnam","PVN"] },
    { name: "PLDT", tier: 1, country: "PH", market: "ASEAN", industry: "Telecommunications", atl: "Otep Lim", aliases: ["Philippine Long Distance Telephone"] },
    { name: "PSA", tier: 1, country: "SG", market: "ASEAN", industry: "Transportation & Logistics", atl: "Agnes Siu Yan Chau", aliases: ["PSA International","Port of Singapore Authority"] },
    { name: "PTT", tier: 1, country: "TH", market: "ASEAN", industry: "Energy", atl: "Preecha Khomvilai", aliases: ["PTT Public Company"] },
    { name: "SCB", tier: 1, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Voravit Lertgitipongpant", aliases: ["Siam Commercial Bank","SCBX"] },
    { name: "Singtel", tier: 1, country: "SG", market: "ASEAN", industry: "Telecommunications", atl: "Yang Kwang Goh", aliases: ["Singapore Telecommunications"] },
    { name: "SM", tier: 1, country: "PH", market: "ASEAN", industry: "Retail", atl: "JJ Franco", aliases: ["SM Investments"] },
    { name: "UOB", tier: 1, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Sandesh Udupa", aliases: ["United Overseas Bank"] },
    { name: "Vietcombank", tier: 1, country: "VN", market: "ASEAN", industry: "Financial Services", atl: "Hung Pham Manh", aliases: ["Bank for Foreign Trade of Vietnam"] },
    { name: "Viettel", tier: 1, country: "VN", market: "ASEAN", industry: "Telecommunications", atl: "Manh Linh Nguyen", aliases: ["Viettel Group"] },
    { name: "Aboitiz", tier: 2, country: "PH", market: "ASEAN", industry: "Conglomerate", atl: "JJ Franco", aliases: ["Aboitiz Equity Ventures","Aboitiz Group"] },
    { name: "Agribank", tier: 2, country: "VN", market: "ASEAN", industry: "Financial Services", atl: "Hung Pham Manh", aliases: ["Vietnam Bank for Agriculture and Rural Development"] },
    { name: "AIS", tier: 2, country: "TH", market: "ASEAN", industry: "Telecommunications", atl: "Phornthep Suratanavongkul", aliases: ["Advanced Info Service"] },
    { name: "AmBank", tier: 2, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Yuh Shyang Lai", aliases: ["AmBank Group"] },
    { name: "Astra", tier: 2, country: "ID", market: "ASEAN", industry: "Conglomerate", atl: "Alvian Zulkhaizar", aliases: ["Astra International"] },
    { name: "Axiata", tier: 2, country: "MY", market: "ASEAN", industry: "Telecommunications", atl: "Sheau Pei Wong", aliases: ["Axiata Group"] },
    { name: "BDMS", tier: 2, country: "TH", market: "ASEAN", industry: "Healthcare", atl: "Preecha Khomvilai", aliases: ["Bangkok Dusit Medical Services"] },
    { name: "BIDV", tier: 2, country: "VN", market: "ASEAN", industry: "Financial Services", atl: "Son Ngo Quang", aliases: ["Bank for Investment and Development of Vietnam"] },
    { name: "BNI", tier: 2, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Glen Christian", aliases: ["Bank Negara Indonesia"] },
    { name: "BPI", tier: 2, country: "PH", market: "ASEAN", industry: "Financial Services", atl: "Arnold Byron Lua", aliases: ["Bank of the Philippine Islands"] },
    { name: "BPJS", tier: 2, country: "ID", market: "ASEAN", industry: "Government", atl: "Glen Christian", aliases: ["BPJS Kesehatan","BPJS Ketenagakerjaan"] },
    { name: "Central", tier: 2, country: "TH", market: "ASEAN", industry: "Retail", atl: "Kanoksak Ratchapat", aliases: ["Central Group"] },
    { name: "CIMB", tier: 2, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Chun-Yin Wong", aliases: ["CIMB Group","CIMB Bank"] },
    { name: "Citi", tier: 2, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Arnab De Adhikari", aliases: ["Citigroup","Citibank"] },
    { name: "Danantara", tier: 2, country: "ID", market: "ASEAN", industry: "Government", atl: "Adi Wijaya S", aliases: ["Daya Anagata Nusantara"] },
    { name: "DSTA", tier: 2, country: "SG", market: "ASEAN", industry: "Government", atl: "Manish Shah", aliases: ["Defence Science and Technology Agency"] },
    { name: "Globe", tier: 2, country: "PH", market: "ASEAN", industry: "Telecommunications", atl: "Otep Lim", aliases: ["Globe Telecom"] },
    { name: "Hong Leong", tier: 2, country: "MY", market: "ASEAN", industry: "Conglomerate", atl: "Liak Kuan Tan", aliases: ["Hong Leong Group","Hong Leong Bank"] },
    { name: "IVL", tier: 2, country: "TH", market: "ASEAN", industry: "Energy", atl: "Preecha Khomvilai", aliases: ["Indorama Ventures"] },
    { name: "Kemenkeu", tier: 2, country: "ID", market: "ASEAN", industry: "Government", atl: "Rekiardi Rekiardi", aliases: ["Ministry of Finance Indonesia"] },
    { name: "Keppel", tier: 2, country: "SG", market: "ASEAN", industry: "Conglomerate", atl: "Yang Kwang Goh", aliases: ["Keppel Corporation"] },
    { name: "KTB", tier: 2, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Phornthep Suratanavongkul", aliases: ["Krungthai Bank","Krung Thai Bank"] },
    { name: "LandBank", tier: 2, country: "PH", market: "ASEAN", industry: "Financial Services", atl: "Eric Ortiz", aliases: ["Land Bank of the Philippines"] },
    { name: "LTA", tier: 2, country: "SG", market: "ASEAN", industry: "Government", atl: "Yang Kwang Goh", aliases: ["Land Transport Authority"] },
    { name: "MAHB", tier: 2, country: "MY", market: "ASEAN", industry: "Transportation & Logistics", aliases: ["Malaysia Airports"] },
    { name: "Malaysia Airlines (MAB)", tier: 2, country: "MY", market: "ASEAN", industry: "Transportation & Logistics", aliases: ["Malaysia Airlines","Malaysia Aviation Group"] },
    { name: "Maybank", tier: 2, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Chun-Yin Wong", aliases: ["Malayan Banking","Maybank Group"] },
    { name: "MEA Thailand", tier: 2, country: "TH", market: "ASEAN", industry: "Energy", atl: "Kanoksak Ratchapat", aliases: ["Metropolitan Electricity Authority"] },
    { name: "Metrobank", tier: 2, country: "PH", market: "ASEAN", industry: "Financial Services", atl: "Eric Ortiz", aliases: ["Metropolitan Bank and Trust"] },
    { name: "MoF Malaysia", tier: 2, country: "MY", market: "ASEAN", industry: "Government", atl: "Sheau Pei Wong", aliases: ["Ministry of Finance Malaysia"] },
    { name: "MOF Singapore", tier: 2, country: "SG", market: "ASEAN", industry: "Government", atl: "Yang Kwang Goh", aliases: ["Ministry of Finance Singapore"] },
    { name: "MoF Thailand", tier: 2, country: "TH", market: "ASEAN", industry: "Government", atl: "Supot Sombutphotiudom", aliases: ["Ministry of Finance Thailand"] },
    { name: "MOH Singapore", tier: 2, country: "SG", market: "ASEAN", industry: "Government", atl: "Dineshkumar Ramnath Barai", aliases: ["Ministry of Health Singapore"] },
    { name: "MUFG TH", tier: 2, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Phornthep Suratanavongkul", aliases: ["MUFG Thailand"] },
    { name: "NUS", tier: 2, country: "SG", market: "ASEAN", industry: "Government", atl: "Agnes Siu Yan Chau", aliases: ["National University of Singapore"] },
    { name: "PEA", tier: 2, country: "TH", market: "ASEAN", industry: "Energy", atl: "Kanoksak Ratchapat", aliases: ["Provincial Electricity Authority"] },
    { name: "PLN", tier: 2, country: "ID", market: "ASEAN", industry: "Energy", atl: "Satria Wicaksana Adhipurusa", aliases: ["Perusahaan Listrik Negara"] },
    { name: "Public Bank", tier: 2, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Liak Kuan Tan", aliases: ["Public Bank Berhad"] },
    { name: "RHB", tier: 2, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Kevin Khaw", aliases: ["RHB Bank"] },
    { name: "Salim", tier: 2, country: "ID", market: "ASEAN", industry: "Conglomerate", atl: "Okta Riveranda", aliases: ["Salim Group"] },
    { name: "San Miguel", tier: 2, country: "PH", market: "ASEAN", industry: "Conglomerate", atl: "JJ Franco", aliases: ["San Miguel Corporation"] },
    { name: "SCG", tier: 2, country: "TH", market: "ASEAN", industry: "Manufacturing", atl: "Supot Sombutphotiudom", aliases: ["Siam Cement Group"] },
    { name: "SIA", tier: 2, country: "SG", market: "ASEAN", industry: "Transportation & Logistics", atl: "Agnes Siu Yan Chau", aliases: ["Singapore Airlines"] },
    { name: "Sinar Mas", tier: 2, country: "ID", market: "ASEAN", industry: "Conglomerate", atl: "Glen Christian", aliases: ["Sinar Mas Group"] },
    { name: "StanChart", tier: 2, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Arnab De Adhikari", aliases: ["Standard Chartered"] },
    { name: "Techcombank", tier: 2, country: "VN", market: "ASEAN", industry: "Financial Services", atl: "Hung Pham Manh", aliases: ["Vietnam Technological and Commercial Joint Stock Bank"] },
    { name: "Telkom", tier: 2, country: "ID", market: "ASEAN", industry: "Telecommunications", atl: "Adi Wijaya S", aliases: ["Telkom Indonesia"] },
    { name: "Thai Life", tier: 2, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Satit Pongbundit", aliases: ["Thai Life Insurance"] },
    { name: "TM", tier: 2, country: "MY", market: "ASEAN", industry: "Telecommunications", atl: "Emily Hui", aliases: ["Telekom Malaysia"] },
    { name: "TNB", tier: 2, country: "MY", market: "ASEAN", industry: "Energy", atl: "Emily Hui", aliases: ["Tenaga Nasional"] },
    { name: "UOB MY", tier: 2, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Chun-Yin Wong", aliases: ["UOB Malaysia"] },
    { name: "VietinBank", tier: 2, country: "VN", market: "ASEAN", industry: "Financial Services", atl: "Manh Linh Nguyen", aliases: ["Vietnam Bank for Industry and Trade"] },
    { name: "Vingroup", tier: 2, country: "VN", market: "ASEAN", industry: "Conglomerate", atl: "Manh Linh Nguyen" },
    { name: "VNPT", tier: 2, country: "VN", market: "ASEAN", industry: "Telecommunications", atl: "Hung Pham Manh", aliases: ["Vietnam Posts and Telecommunications"] },
    { name: "Affin", tier: 3, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Kevin Khaw", aliases: ["Affin Bank"] },
    { name: "Al Rajhi Malaysia", tier: 3, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Sheau Pei Wong", aliases: ["Al Rajhi Bank Malaysia"] },
    { name: "Alliance Bank", tier: 3, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Sheau Pei Wong", aliases: ["Alliance Bank Malaysia"] },
    { name: "Allianz Ayudhya", tier: 3, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Voravit Lertgitipongpant", aliases: ["Allianz Ayudhya Assurance"] },
    { name: "Bank Islam", tier: 3, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Emily Hui", aliases: ["Bank Islam Malaysia"] },
    { name: "BSN", tier: 3, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Yuh Shyang Lai", aliases: ["Bank Simpanan Nasional"] },
    { name: "BTN", tier: 3, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Rekiardi Rekiardi", aliases: ["Bank Tabungan Negara"] },
    { name: "Chinabank", tier: 3, country: "PH", market: "ASEAN", industry: "Financial Services", atl: "JJ Franco", aliases: ["China Banking Corporation"] },
    { name: "CIMB ID", tier: 3, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Alvian Zulkhaizar", aliases: ["CIMB Niaga"] },
    { name: "Danamon", tier: 3, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Okta Riveranda", aliases: ["Bank Danamon"] },
    { name: "Delta Thailand (DET)", tier: 3, country: "TH", market: "ASEAN", industry: "Technology", atl: "Preecha Khomvilai", aliases: ["Delta Electronics Thailand"] },
    { name: "ESDM", tier: 3, country: "ID", market: "ASEAN", industry: "Government", atl: "Glen Christian", aliases: ["Ministry of Energy and Mineral Resources Indonesia"] },
    { name: "Garuda", tier: 3, country: "ID", market: "ASEAN", industry: "Transportation & Logistics", atl: "Adi Wijaya S", aliases: ["Garuda Indonesia"] },
    { name: "GH Bank", tier: 3, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Preecha Khomvilai", aliases: ["Government Housing Bank"] },
    { name: "Global House", tier: 3, country: "TH", market: "ASEAN", industry: "Retail", atl: "Supot Sombutphotiudom", aliases: ["Siam Global House"] },
    { name: "HomePro", tier: 3, country: "TH", market: "ASEAN", industry: "Retail", atl: "Supot Sombutphotiudom", aliases: ["Home Product Center"] },
    { name: "ITMX", tier: 3, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Satit Pongbundit", aliases: ["National ITMX"] },
    { name: "Jollibee", tier: 3, country: "PH", market: "ASEAN", industry: "Retail", atl: "JJ Franco", aliases: ["Jollibee Foods Corporation"] },
    { name: "JPM (PM Dept)", tier: 3, country: "MY", market: "ASEAN", industry: "Government", aliases: ["Jabatan Perdana Menteri","Prime Minister's Department Malaysia"] },
    { name: "Kemendagri", tier: 3, country: "MY", market: "ASEAN", industry: "Government", atl: "Chee Kin Chan", aliases: ["Kementerian Dalam Negeri","Ministry of Home Affairs Malaysia"] },
    { name: "KKP", tier: 3, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Satit Pongbundit", aliases: ["Kiatnakin Phatra"] },
    { name: "Maybank ID", tier: 3, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Satria Wicaksana Adhipurusa", aliases: ["Maybank Indonesia"] },
    { name: "MB Bank", tier: 3, country: "VN", market: "ASEAN", industry: "Financial Services", atl: "Son Ngo Quang", aliases: ["Military Commercial Joint Stock Bank"] },
    { name: "Metro Pacific", tier: 3, country: "PH", market: "ASEAN", industry: "Conglomerate", atl: "Otep Lim", aliases: ["Metro Pacific Investments"] },
    { name: "MND", tier: 3, country: "SG", market: "ASEAN", industry: "Government", atl: "Yang Kwang Goh", aliases: ["Ministry of National Development"] },
    { name: "MoF Vietnam", tier: 3, country: "VN", market: "ASEAN", industry: "Government", atl: "Manh Linh Nguyen", aliases: ["Ministry of Finance Vietnam"] },
    { name: "MoT Malaysia", tier: 3, country: "MY", market: "ASEAN", industry: "Government", atl: "Chee Kin Chan", aliases: ["Ministry of Transport Malaysia"] },
    { name: "MPS (A27)", tier: 3, country: "VN", market: "ASEAN", industry: "Government", atl: "Son Ngo Quang", aliases: ["Ministry of Public Security Vietnam"] },
    { name: "MSE Singapore", tier: 3, country: "SG", market: "ASEAN", industry: "Government", atl: "Agnes Siu Yan Chau", aliases: ["Ministry of Sustainability and the Environment"] },
    { name: "MUFG", tier: 3, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Manish Shah", aliases: ["Mitsubishi UFJ Financial Group"] },
    { name: "OCBC MY", tier: 3, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Kevin Khaw", aliases: ["OCBC Malaysia"] },
    { name: "Permata", tier: 3, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Rekiardi Rekiardi", aliases: ["Bank Permata","PermataBank"] },
    { name: "Perodua", tier: 3, country: "MY", market: "ASEAN", industry: "Manufacturing", atl: "Kevin Khaw", aliases: ["Perusahaan Otomobil Kedua"] },
    { name: "PNB Philippines", tier: 3, country: "PH", market: "ASEAN", industry: "Financial Services", atl: "Eric Ortiz", aliases: ["Philippine National Bank"] },
    { name: "Prudential", tier: 3, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Arnab De Adhikari", aliases: ["Prudential plc"] },
    { name: "RCBC", tier: 3, country: "PH", market: "ASEAN", industry: "Financial Services", atl: "Arnold Byron Lua", aliases: ["Rizal Commercial Banking Corporation"] },
    { name: "Sands", tier: 3, country: "SG", market: "ASEAN", industry: "Media & Entertainment", atl: "Dineshkumar Ramnath Barai", aliases: ["Marina Bay Sands","Las Vegas Sands"] },
    { name: "SATS", tier: 3, country: "SG", market: "ASEAN", industry: "Transportation & Logistics", atl: "Agnes Siu Yan Chau" },
    { name: "Security Bank", tier: 3, country: "PH", market: "ASEAN", industry: "Financial Services", atl: "Arnold Byron Lua", aliases: ["Security Bank Corporation"] },
    { name: "Siriraj", tier: 3, country: "TH", market: "ASEAN", industry: "Healthcare", atl: "Preecha Khomvilai", aliases: ["Siriraj Hospital"] },
    { name: "StarHub", tier: 3, country: "SG", market: "ASEAN", industry: "Telecommunications", atl: "Manish Shah" },
    { name: "Stomo Life", tier: 3, country: "SG", market: "ASEAN", industry: "Financial Services", atl: "Agnes Siu Yan Chau" },
    { name: "Sunway", tier: 3, country: "MY", market: "ASEAN", industry: "Conglomerate", atl: "Liak Kuan Tan", aliases: ["Sunway Group"] },
    { name: "Takaful Malaysia", tier: 3, country: "MY", market: "ASEAN", industry: "Financial Services", atl: "Yuh Shyang Lai", aliases: ["Syarikat Takaful Malaysia"] },
    { name: "TCC", tier: 3, country: "TH", market: "ASEAN", industry: "Conglomerate", atl: "Supot Sombutphotiudom", aliases: ["TCC Group"] },
    { name: "Thanachart", tier: 3, country: "TH", market: "ASEAN", industry: "Financial Services", atl: "Satit Pongbundit", aliases: ["Thanachart Bank"] },
    { name: "The Mall", tier: 3, country: "TH", market: "ASEAN", industry: "Retail", atl: "Satit Pongbundit", aliases: ["The Mall Group"] },
    { name: "TPBank", tier: 3, country: "VN", market: "ASEAN", industry: "Financial Services", atl: "Hung Pham Manh", aliases: ["Tien Phong Bank"] },
    { name: "Trakindo", tier: 3, country: "ID", market: "ASEAN", industry: "Manufacturing", atl: "Satria Wicaksana Adhipurusa", aliases: ["Trakindo Utama"] },
    { name: "UOB ID", tier: 3, country: "ID", market: "ASEAN", industry: "Financial Services", atl: "Satria Wicaksana Adhipurusa", aliases: ["UOB Indonesia"] },
    { name: "VIB", tier: 3, country: "VN", market: "ASEAN", industry: "Financial Services", atl: "Son Ngo Quang", aliases: ["Vietnam International Bank"] },
    { name: "YTL", tier: 3, country: "MY", market: "ASEAN", industry: "Conglomerate", atl: "Yuh Shyang Lai", aliases: ["YTL Corporation"] },

    // ─── GCG MARKET ───────────────────────────────────
    { name: "Alibaba", tier: 1, country: "CN", market: "GCG", industry: "Technology", atl: "Wu Xu", aliases: ["Alibaba Group"] },
    { name: "BEA", tier: 1, country: "HK", market: "GCG", industry: "Financial Services", atl: "Victor Lam", aliases: ["Bank of East Asia"] },
    { name: "BOCHK", tier: 1, country: "HK", market: "GCG", industry: "Financial Services", atl: "Victor Lam", aliases: ["Bank of China (Hong Kong)"] },
    { name: "Cathay FHC", tier: 1, country: "TW", market: "GCG", industry: "Financial Services", atl: "Spencer Hsieh", aliases: ["Cathay Financial Holdings","Cathay United Bank"] },
    { name: "Chunghwa Post", tier: 1, country: "TW", market: "GCG", industry: "Government", atl: "Joe Wang" },
    { name: "CK Hutchison", tier: 1, country: "HK", market: "GCG", industry: "Conglomerate", atl: "Gavin Tin", aliases: ["CK Hutchison Holdings"] },
    { name: "CTBC", tier: 1, country: "TW", market: "GCG", industry: "Financial Services", atl: "Richard Yen", aliases: ["CTBC Financial Holding","CTBC Bank"] },
    { name: "HKEX", tier: 1, country: "HK", market: "GCG", industry: "Financial Services", atl: "Victor Lam", aliases: ["Hong Kong Exchanges and Clearing"] },
    { name: "HKMA", tier: 1, country: "HK", market: "GCG", industry: "Government", atl: "Alwyn Tse", aliases: ["Hong Kong Monetary Authority"] },
    { name: "HSBC HK", tier: 1, country: "HK", market: "GCG", industry: "Financial Services", atl: "Yin Ling Ng", aliases: ["HSBC","Hongkong and Shanghai Banking Corporation"] },
    { name: "Lenovo", tier: 1, country: "CN", market: "GCG", industry: "Technology", atl: "Jun Zhu", aliases: ["Lenovo Group"] },
    { name: "MediaTek", tier: 1, country: "TW", market: "GCG", industry: "Technology", atl: "Andy YH Wang" },
    { name: "MTR", tier: 1, country: "HK", market: "GCG", industry: "Transportation & Logistics", atl: "Anthony Lam", aliases: ["MTR Corporation"] },
    { name: "Taiwan FHC", tier: 1, country: "TW", market: "GCG", industry: "Financial Services", atl: "Joe Wang", aliases: ["Taiwan Financial Holdings","Bank of Taiwan"] },
    { name: "TBB", tier: 1, country: "TW", market: "GCG", industry: "Financial Services", atl: "Richard Yen", aliases: ["Taiwan Business Bank"] },
    { name: "TCB", tier: 1, country: "TW", market: "GCG", industry: "Financial Services", atl: "Lucas Fang", aliases: ["Taiwan Cooperative Bank"] },
    { name: "Tencent", tier: 1, country: "CN", market: "GCG", industry: "Technology", atl: "Le Tian", aliases: ["Tencent Holdings"] },
    { name: "TSMC", tier: 1, country: "TW", market: "GCG", industry: "Technology", atl: "Joe Wang", aliases: ["Taiwan Semiconductor Manufacturing"] },
    { name: "Yuanta", tier: 1, country: "TW", market: "GCG", industry: "Financial Services", atl: "Lucas Fang", aliases: ["Yuanta Financial Holding"] },
    { name: "AAHK", tier: 2, country: "HK", market: "GCG", industry: "Transportation & Logistics", atl: "Anthony Lam", aliases: ["Airport Authority Hong Kong"] },
    { name: "AIA", tier: 2, country: "HK", market: "GCG", industry: "Financial Services", atl: "Timothy Yuen", aliases: ["AIA Group"] },
    { name: "ASE", tier: 2, country: "TW", market: "GCG", industry: "Technology", atl: "Diamond Tsai", aliases: ["ASE Technology","Advanced Semiconductor Engineering"] },
    { name: "AXA", tier: 2, country: "HK", market: "GCG", industry: "Financial Services", atl: "Timothy Yuen", aliases: ["AXA Hong Kong"] },
    { name: "Baidu", tier: 2, country: "CN", market: "GCG", industry: "Technology", atl: "You Qing Rao" },
    { name: "BoCom", tier: 2, country: "HK", market: "GCG", industry: "Financial Services", atl: "Gordon Fung", aliases: ["Bank of Communications"] },
    { name: "CITIC", tier: 2, country: "HK", market: "GCG", industry: "Conglomerate", atl: "Gavin Tin", aliases: ["CITIC Group","CITIC Limited"] },
    { name: "CPC Taiwan", tier: 2, country: "TW", market: "GCG", industry: "Energy", atl: "Diamond Tsai", aliases: ["CPC Corporation"] },
    { name: "E.SUN", tier: 2, country: "TW", market: "GCG", industry: "Financial Services", atl: "Paul Chang", aliases: ["E.SUN Financial Holding","E.SUN Bank"] },
    { name: "Evergreen", tier: 2, country: "TW", market: "GCG", industry: "Transportation & Logistics", atl: "Andy YH Wang", aliases: ["Evergreen Marine","Evergreen Group"] },
    { name: "FISC", tier: 2, country: "TW", market: "GCG", industry: "Financial Services", atl: "Fission Lin", aliases: ["Financial Information Service Co"] },
    { name: "FPG", tier: 2, country: "TW", market: "GCG", industry: "Energy", atl: "Kimi Shih", aliases: ["Formosa Plastics Group"] },
    { name: "Fubon", tier: 2, country: "TW", market: "GCG", industry: "Financial Services", atl: "Fission Lin", aliases: ["Fubon Financial Holding","Taipei Fubon Bank"] },
    { name: "H3C", tier: 2, country: "CN", market: "GCG", industry: "Technology", atl: "Wu Xu", aliases: ["H3C Technologies","New H3C"] },
    { name: "HA", tier: 2, country: "HK", market: "GCG", industry: "Healthcare", atl: "Hammond Leung", aliases: ["Hospital Authority"] },
    { name: "HKICL", tier: 2, country: "HK", market: "GCG", industry: "Financial Services", atl: "Alwyn Tse", aliases: ["Hong Kong Interbank Clearing"] },
    { name: "HKJC", tier: 2, country: "HK", market: "GCG", industry: "Media & Entertainment", atl: "Stephen Poon", aliases: ["Hong Kong Jockey Club"] },
    { name: "Jardines", tier: 2, country: "HK", market: "GCG", industry: "Conglomerate", atl: "YK Chiu", aliases: ["Jardine Matheson"] },
    { name: "JD", tier: 2, country: "CN", market: "GCG", industry: "Retail", atl: "Jun Zhu", aliases: ["JD.com"] },
    { name: "Mega Bank", tier: 2, country: "TW", market: "GCG", industry: "Financial Services", atl: "Victor Chen", aliases: ["Mega International Commercial Bank","Mega Financial Holding"] },
    { name: "OCBC HK", tier: 2, country: "HK", market: "GCG", industry: "Financial Services", atl: "Gordon Fung", aliases: ["OCBC Bank (Hong Kong)"] },
    { name: "Pegatron", tier: 2, country: "TW", market: "GCG", industry: "Technology", atl: "Andy YH Wang" },
    { name: "Prudential HK", tier: 2, country: "HK", market: "GCG", industry: "Financial Services", atl: "Gavin Tin", aliases: ["Prudential Hong Kong"] },
    { name: "Public Bank HK", tier: 2, country: "HK", market: "GCG", industry: "Financial Services", atl: "Hammond Leung", aliases: ["Public Bank (Hong Kong)"] },
    { name: "Quanta", tier: 2, country: "TW", market: "GCG", industry: "Technology", atl: "Kimi Shih", aliases: ["Quanta Computer"] },
    { name: "Swire", tier: 2, country: "HK", market: "GCG", industry: "Conglomerate", atl: "Anthony Lam", aliases: ["John Swire & Sons","Swire Pacific"] },
    { name: "UMC", tier: 2, country: "TW", market: "GCG", industry: "Technology", atl: "Sean Hsueh", aliases: ["United Microelectronics"] },
    { name: "Wistron", tier: 2, country: "TW", market: "GCG", industry: "Technology", atl: "Diamond Tsai" },
    { name: "Xiaomi", tier: 2, country: "CN", market: "GCG", industry: "Technology", atl: "You Qing Rao", aliases: ["Xiaomi Corporation"] },
    { name: "ZTE", tier: 2, country: "CN", market: "GCG", industry: "Telecommunications", atl: "Jun Zhu", aliases: ["ZTE Corporation"] },
    { name: "AEON Credit (HK)", tier: 3, country: "HK", market: "GCG", industry: "Retail", atl: "Hammond Leung", aliases: ["AEON Credit Service"] },
    { name: "ASUS", tier: 3, country: "TW", market: "GCG", industry: "Technology", atl: "Sean Hsueh", aliases: ["ASUSTeK"] },
    { name: "AUO", tier: 3, country: "TW", market: "GCG", industry: "Technology", atl: "Diamond Tsai", aliases: ["AU Optronics"] },
    { name: "BNU (CGD Macau)", tier: 3, country: "HK", market: "GCG", industry: "Financial Services", atl: "YK Chiu", aliases: ["Banco Nacional Ultramarino","Caixa Geral de Depositos"] },
    { name: "BOC", tier: 3, country: "HK", market: "GCG", industry: "Financial Services", atl: "Gordon Fung", aliases: ["Bank of China Macau"] },
    { name: "CDF", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Fission Lin", aliases: ["China Development Financial"] },
    { name: "CHB", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Kimi Shih", aliases: ["Chang Hwa Bank"] },
    { name: "Cloudnine Info Tech", tier: 3, country: "CN", market: "GCG", industry: "Technology", atl: "Wu Xu" },
    { name: "Compal", tier: 3, country: "TW", market: "GCG", industry: "Technology", atl: "Sean Hsueh", aliases: ["Compal Electronics"] },
    { name: "CSC", tier: 3, country: "TW", market: "GCG", industry: "Manufacturing", atl: "Kimi Shih", aliases: ["China Steel"] },
    { name: "Dah Sing", tier: 3, country: "HK", market: "GCG", industry: "Financial Services", atl: "Alwyn Tse", aliases: ["Dah Sing Financial","Dah Sing Bank"] },
    { name: "Delta", tier: 3, country: "TW", market: "GCG", industry: "Technology", atl: "Diamond Tsai", aliases: ["Delta Electronics"] },
    { name: "Douyin", tier: 3, country: "CN", market: "GCG", industry: "Media & Entertainment", atl: "Wu Xu", aliases: ["ByteDance"] },
    { name: "First FHC", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Victor Chen", aliases: ["First Financial Holding","First Bank"] },
    { name: "Fubon HK", tier: 3, country: "HK", market: "GCG", industry: "Financial Services", atl: "Stephen Poon", aliases: ["Fubon Bank (Hong Kong)"] },
    { name: "Fung Group", tier: 3, country: "HK", market: "GCG", industry: "Conglomerate", atl: "Gavin Tin", aliases: ["Fung Holdings","Li & Fung"] },
    { name: "FWD", tier: 3, country: "HK", market: "GCG", industry: "Financial Services", atl: "Timothy Yuen", aliases: ["FWD Group"] },
    { name: "Great Eagle", tier: 3, country: "HK", market: "GCG", industry: "Real Estate", atl: "YK Chiu", aliases: ["Great Eagle Holdings"] },
    { name: "HK Immigration", tier: 3, country: "HK", market: "GCG", industry: "Government", atl: "Hammond Leung", aliases: ["Immigration Department Hong Kong"] },
    { name: "Hua Nan", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Victor Chen", aliases: ["Hua Nan Financial Holdings"] },
    { name: "Hunan Crazy Primitive Man", tier: 3, country: "CN", market: "GCG", industry: "Technology", atl: "Le Tian" },
    { name: "Innolux", tier: 3, country: "TW", market: "GCG", industry: "Technology", atl: "Andy YH Wang", aliases: ["Chimei Innolux"] },
    { name: "Inventec", tier: 3, country: "TW", market: "GCG", industry: "Technology", atl: "Sean Hsueh" },
    { name: "JUCC", tier: 3, country: "HK", market: "GCG", industry: "Government", atl: "Stephen Poon", aliases: ["Joint Universities Computer Centre"] },
    { name: "Kingsoft Qijian", tier: 3, country: "CN", market: "GCG", industry: "Technology", atl: "You Qing Rao" },
    { name: "Kuaishou", tier: 3, country: "CN", market: "GCG", industry: "Media & Entertainment", atl: "You Qing Rao", aliases: ["Kuaishou Technology"] },
    { name: "Land Bank of Taiwan", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Kimi Shih" },
    { name: "Macronix", tier: 3, country: "TW", market: "GCG", industry: "Technology", atl: "Kimi Shih", aliases: ["Macronix International"] },
    { name: "OPPO", tier: 3, country: "CN", market: "GCG", industry: "Technology", atl: "Le Tian", aliases: ["OPPO Electronics"] },
    { name: "SCSB", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Paul Chang", aliases: ["Shanghai Commercial & Savings Bank"] },
    { name: "Shanghai Commercial Bank", tier: 3, country: "HK", market: "GCG", industry: "Financial Services", atl: "Stephen Poon" },
    { name: "Shin Kong", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Spencer Hsieh", aliases: ["Shin Kong Financial Holding"] },
    { name: "SMFG", tier: 3, country: "HK", market: "GCG", industry: "Financial Services", atl: "Anthony Lam", aliases: ["Sumitomo Mitsui Financial Group","SMBC"] },
    { name: "Sun Hung Kai (SHK)", tier: 3, country: "HK", market: "GCG", industry: "Financial Services", atl: "YK Chiu", aliases: ["Sun Hung Kai & Co","Sun Hung Kai Securities"] },
    { name: "Taishin", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Spencer Hsieh", aliases: ["Taishin Financial Holding"] },
    { name: "Toyou Feiji", tier: 3, country: "CN", market: "GCG", industry: "Technology", atl: "Jun Zhu", aliases: ["Toyou Feiji Electronics"] },
    { name: "TW Govt (Six Cities)", tier: 3, country: "TW", market: "GCG", industry: "Government", atl: "Diamond Tsai" },
    { name: "UBOT", tier: 3, country: "TW", market: "GCG", industry: "Financial Services", atl: "Paul Chang", aliases: ["Union Bank of Taiwan"] },
    { name: "Uni-President", tier: 3, country: "TW", market: "GCG", industry: "Retail", atl: "Andy YH Wang", aliases: ["Uni-President Enterprises"] },
    { name: "Yuexiu Group", tier: 3, country: "HK", market: "GCG", industry: "Conglomerate", atl: "Alwyn Tse", aliases: ["Guangzhou Yuexiu Group"] },

    // ─── ISA MARKET ───────────────────────────────────
    { name: "Adani", tier: 1, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Bhargavi Shukla", aliases: ["Adani Group"] },
    { name: "Axis Bank", tier: 1, country: "IN", market: "ISA", industry: "Financial Services" },
    { name: "BoB", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", atl: "Kaustubha Chandurkar", aliases: ["Bank of Baroda"] },
    { name: "Canara Bank", tier: 1, country: "IN", market: "ISA", industry: "Financial Services" },
    { name: "Central Bank of India", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sundaragopal Venkatraman" },
    { name: "Federal Bank", tier: 1, country: "IN", market: "ISA", industry: "Financial Services" },
    { name: "HDFC Bank", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", aliases: ["HDFC"] },
    { name: "ICICI", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", atl: "Rishav Raj", aliases: ["ICICI Bank"] },
    { name: "Indian Bank", tier: 1, country: "IN", market: "ISA", industry: "Financial Services" },
    { name: "Indian Railways", tier: 1, country: "IN", market: "ISA", industry: "Government", atl: "Vishal Saurav", aliases: ["Ministry of Railways"] },
    { name: "Infosys", tier: 1, country: "IN", market: "ISA", industry: "Technology", atl: "Manoj Nair" },
    { name: "LIC", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", atl: "Nitika Virmani", aliases: ["Life Insurance Corporation of India"] },
    { name: "NPCI", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sunil Prabhu", aliases: ["National Payments Corporation of India"] },
    { name: "RBI", tier: 1, country: "IN", market: "ISA", industry: "Government", atl: "Sundaragopal Venkatraman", aliases: ["Reserve Bank of India"] },
    { name: "Reliance", tier: 1, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Pooja Morani", aliases: ["Reliance Industries"] },
    { name: "SBI", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", atl: "Makarand Zurale", aliases: ["State Bank of India"] },
    { name: "Tata", tier: 1, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Ankit Kumar", aliases: ["Tata Group","Tata Sons"] },
    { name: "TCS", tier: 1, country: "IN", market: "ISA", industry: "Technology", atl: "Rachna Issar", aliases: ["Tata Consultancy Services"] },
    { name: "UIDAI", tier: 1, country: "IN", market: "ISA", industry: "Government", atl: "Prashant Pandey", aliases: ["Aadhaar","Unique Identification Authority of India"] },
    { name: "Union Bank of India", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", atl: "Kaustubha Chandurkar" },
    { name: "Yes Bank", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sundaragopal Venkatraman" },
    { name: "Aditya Birla", tier: 2, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Pooja Morani", aliases: ["Aditya Birla Group"] },
    { name: "Bharti", tier: 2, country: "IN", market: "ISA", industry: "Telecommunications", atl: "Prageetika Sharma", aliases: ["Bharti Airtel","Airtel","Bharti Enterprises"] },
    { name: "BPCL", tier: 2, country: "IN", market: "ISA", industry: "Energy", atl: "Jatin Chaudhary", aliases: ["Bharat Petroleum"] },
    { name: "Govt of Karnataka", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Amit Pishe", aliases: ["Government of Karnataka"] },
    { name: "Govt of Maharashtra", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Ashish Kesarkar", aliases: ["Government of Maharashtra"] },
    { name: "Govt of TN", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Amit Pishe", aliases: ["Government of Tamil Nadu"] },
    { name: "Govt of UP", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Sandeep Sharma", aliases: ["Government of Uttar Pradesh"] },
    { name: "HAL", tier: 2, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Awadhesh Pratap Dwivedi", aliases: ["Hindustan Aeronautics"] },
    { name: "India Post", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Prashant Pandey", aliases: ["Department of Posts"] },
    { name: "IndianOil", tier: 2, country: "IN", market: "ISA", industry: "Energy", atl: "Priya Gupta", aliases: ["Indian Oil Corporation","IOCL"] },
    { name: "IndusInd", tier: 2, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sunil Prabhu", aliases: ["IndusInd Bank"] },
    { name: "ISRO", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Amit Pishe", aliases: ["Indian Space Research Organisation"] },
    { name: "ITC", tier: 2, country: "IN", market: "ISA", industry: "Retail", atl: "Girish Rohini", aliases: ["ITC Limited"] },
    { name: "JSW", tier: 2, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Jatin Chaudhary", aliases: ["JSW Group"] },
    { name: "Kotak", tier: 2, country: "IN", market: "ISA", industry: "Financial Services", atl: "Alok Goyal", aliases: ["Kotak Mahindra Bank"] },
    { name: "L&T", tier: 2, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Pooja Morani", aliases: ["Larsen & Toubro"] },
    { name: "Mahindra (M&M)", tier: 2, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Siddhesh Rane", aliases: ["Mahindra & Mahindra"] },
    { name: "MeitY", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Prashant Pandey", aliases: ["Ministry of Electronics and Information Technology"] },
    { name: "MHA India", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Awadhesh Pratap Dwivedi", aliases: ["Ministry of Home Affairs India"] },
    { name: "MoD India", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Awadhesh Pratap Dwivedi", aliases: ["Ministry of Defence India"] },
    { name: "MoF India", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Prabhat Manocha", aliases: ["Ministry of Finance India"] },
    { name: "NSE", tier: 2, country: "IN", market: "ISA", industry: "Financial Services", atl: "Kapil Kasetwar", aliases: ["National Stock Exchange of India"] },
    { name: "ONGC", tier: 2, country: "IN", market: "ISA", industry: "Energy", atl: "Priya Gupta", aliases: ["Oil and Natural Gas Corporation"] },
    { name: "Paytm (One97)", tier: 2, country: "IN", market: "ISA", industry: "Financial Services", atl: "Prageetika Sharma", aliases: ["Paytm","One97 Communications"] },
    { name: "POWERGRID", tier: 2, country: "IN", market: "ISA", industry: "Energy", atl: "Gauurav Sabharwal", aliases: ["Power Grid Corporation of India"] },
    { name: "SEBI", tier: 2, country: "IN", market: "ISA", industry: "Government", atl: "Kapil Kasetwar", aliases: ["Securities and Exchange Board of India"] },
    { name: "Sun Pharma", tier: 2, country: "IN", market: "ISA", industry: "Healthcare", atl: "Nimish Patgaonkar", aliases: ["Sun Pharmaceutical Industries"] },
    { name: "Vedanta", tier: 2, country: "IN", market: "ISA", industry: "Energy", atl: "Siddhesh Rane" },
    { name: "Vi (Vodafone Idea)", tier: 2, country: "IN", market: "ISA", industry: "Telecommunications", atl: "Nimish Patgaonkar", aliases: ["Vodafone Idea"] },
    { name: "Wipro", tier: 2, country: "IN", market: "ISA", industry: "Technology", atl: "Rachna Issar" },
    { name: "Zomato (Eternal)", tier: 2, country: "IN", market: "ISA", industry: "Retail", atl: "Prageetika Sharma", aliases: ["Zomato","Eternal Ltd"] },
    { name: "Amara Raja", tier: 3, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Sreemukhi Singarayachervu", aliases: ["Amara Raja Batteries"] },
    { name: "Amul (GCMMF)", tier: 3, country: "IN", market: "ISA", industry: "Retail", atl: "Bhargavi Shukla", aliases: ["Amul","Gujarat Cooperative Milk Marketing Federation"] },
    { name: "Ashok Leyland IT", tier: 3, country: "IN", market: "ISA", industry: "Manufacturing", aliases: ["Ashok Leyland"] },
    { name: "Ashok Piramal", tier: 3, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Kapil Kasetwar", aliases: ["Ashok Piramal Group"] },
    { name: "Asian Paints", tier: 3, country: "IN", market: "ISA", industry: "Energy", atl: "Jatin Chaudhary" },
    { name: "BARC", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Ashish Kesarkar", aliases: ["Bhabha Atomic Research Centre"] },
    { name: "BHEL", tier: 3, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Divya Anand", aliases: ["Bharat Heavy Electricals"] },
    { name: "Bisleri", tier: 3, country: "IN", market: "ISA", industry: "Retail", atl: "Nimish Patgaonkar", aliases: ["Bisleri International"] },
    { name: "BOI", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Alok Goyal", aliases: ["Bank of India"] },
    { name: "BSE", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Kapil Kasetwar", aliases: ["Bombay Stock Exchange"] },
    { name: "CCIL", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Nitika Virmani", aliases: ["Clearing Corporation of India"] },
    { name: "Cipla", tier: 3, country: "IN", market: "ISA", industry: "Healthcare", atl: "Nimish Patgaonkar" },
    { name: "CUB", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sreemukhi Singarayachervu", aliases: ["City Union Bank"] },
    { name: "Dabur", tier: 3, country: "IN", market: "ISA", industry: "Retail", atl: "Priya Gupta", aliases: ["Dabur India"] },
    { name: "Dr Reddy's", tier: 3, country: "IN", market: "ISA", industry: "Healthcare", atl: "Sreemukhi Singarayachervu", aliases: ["Dr. Reddy's Laboratories"] },
    { name: "Essel", tier: 3, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Siddhesh Rane", aliases: ["Essel Group"] },
    { name: "EXL", tier: 3, country: "IN", market: "ISA", industry: "Professional Services", atl: "Divya Anand", aliases: ["EXL Service"] },
    { name: "Freshworks", tier: 3, country: "IN", market: "ISA", industry: "Technology" },
    { name: "Genpact", tier: 3, country: "IN", market: "ISA", industry: "Professional Services", atl: "Divya Anand" },
    { name: "Godrej", tier: 3, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Pooja Morani", aliases: ["Godrej Industries","Godrej Group"] },
    { name: "Govt of AP", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Amit Pishe", aliases: ["Government of Andhra Pradesh"] },
    { name: "Govt of Gujarat", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Ashish Kesarkar", aliases: ["Government of Gujarat"] },
    { name: "Govt of MP", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Aditya Jha", aliases: ["Government of Madhya Pradesh"] },
    { name: "Govt of Rajasthan", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Sandeep Sharma", aliases: ["Government of Rajasthan"] },
    { name: "Govt of Telangana", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Amit Pishe", aliases: ["Government of Telangana"] },
    { name: "Govt of WB", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Aditya Jha", aliases: ["Government of West Bengal"] },
    { name: "Hero", tier: 3, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Divya Anand", aliases: ["Hero Group","Hero MotoCorp"] },
    { name: "HPCL", tier: 3, country: "IN", market: "ISA", industry: "Energy", atl: "Jatin Chaudhary", aliases: ["Hindustan Petroleum"] },
    { name: "IDFC", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sunil Prabhu", aliases: ["IDFC First Bank"] },
    { name: "IndiGo (InterGlobe)", tier: 3, country: "IN", market: "ISA", industry: "Transportation & Logistics", atl: "Girish Rohini", aliases: ["IndiGo","InterGlobe Aviation"] },
    { name: "Intas", tier: 3, country: "IN", market: "ISA", industry: "Healthcare", atl: "Bhargavi Shukla", aliases: ["Intas Pharmaceuticals"] },
    { name: "IOB", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sreemukhi Singarayachervu", aliases: ["Indian Overseas Bank"] },
    { name: "Jindal", tier: 3, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Girish Rohini", aliases: ["Jindal Group"] },
    { name: "Jubilant", tier: 3, country: "IN", market: "ISA", industry: "Healthcare", atl: "Priya Gupta", aliases: ["Jubilant Life Sciences","Jubilant Pharmova"] },
    { name: "KPIT", tier: 3, country: "IN", market: "ISA", industry: "Technology", atl: "Kalidas Kumbharkar", aliases: ["KPIT Technologies"] },
    { name: "L&T IT (LTIMindtree)", tier: 3, country: "IN", market: "ISA", industry: "Technology", atl: "Kalidas Kumbharkar", aliases: ["LTIMindtree"] },
    { name: "Lupin", tier: 3, country: "IN", market: "ISA", industry: "Healthcare", atl: "Nimish Patgaonkar" },
    { name: "Mahabank (BoM)", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Kalidas Kumbharkar", aliases: ["Bank of Maharashtra"] },
    { name: "Mankind", tier: 3, country: "IN", market: "ISA", industry: "Healthcare", atl: "Priya Gupta", aliases: ["Mankind Pharma"] },
    { name: "Marico", tier: 3, country: "IN", market: "ISA", industry: "Retail", atl: "Jatin Chaudhary" },
    { name: "Max Financial", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Divya Anand", aliases: ["Max Financial Services"] },
    { name: "MCA India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Prabhat Manocha", aliases: ["Ministry of Corporate Affairs"] },
    { name: "MEA India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Himanshu Gupta", aliases: ["Ministry of External Affairs"] },
    { name: "Meesho", tier: 3, country: "IN", market: "ISA", industry: "Retail", atl: "Jasbir Kaur" },
    { name: "MoA India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Gauurav Sabharwal", aliases: ["Ministry of Agriculture India"] },
    { name: "MoCA India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Vishal Saurav", aliases: ["Ministry of Civil Aviation"] },
    { name: "MoCI India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Prabhat Manocha", aliases: ["Ministry of Commerce and Industry"] },
    { name: "MoES India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Aditya Jha", aliases: ["Ministry of Earth Sciences"] },
    { name: "MoLE India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Himanshu Gupta", aliases: ["Ministry of Labour and Employment"] },
    { name: "MoP India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Gauurav Sabharwal", aliases: ["Ministry of Power"] },
    { name: "MoRD India", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Aditya Jha", aliases: ["Ministry of Rural Development"] },
    { name: "MoRTH", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Vishal Saurav", aliases: ["Ministry of Road Transport and Highways"] },
    { name: "MoSPI", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Himanshu Gupta", aliases: ["Ministry of Statistics and Programme Implementation"] },
    { name: "MoST India (DST)", tier: 3, country: "IN", market: "ISA", industry: "Government", atl: "Sandeep Sharma", aliases: ["Department of Science and Technology","Ministry of Science and Technology"] },
    { name: "Motherson", tier: 3, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Girish Rohini", aliases: ["Samvardhana Motherson","Motherson Sumi"] },
    { name: "Murugappa", tier: 3, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Sreemukhi Singarayachervu", aliases: ["Murugappa Group"] },
    { name: "Muthoot Finance", tier: 3, country: "IN", market: "ISA", industry: "Financial Services" },
    { name: "Muthoot Fincorp (Pappachan)", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", aliases: ["Muthoot Fincorp","Muthoot Pappachan Group"] },
    { name: "National Insurance", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Girish Rohini", aliases: ["National Insurance Company"] },
    { name: "Navi", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Manoj Nair", aliases: ["Navi Technologies"] },
    { name: "New India Assurance", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Alok Goyal" },
    { name: "NHPC", tier: 3, country: "IN", market: "ISA", industry: "Energy", atl: "Gauurav Sabharwal" },
    { name: "NPCIL", tier: 3, country: "IN", market: "ISA", industry: "Energy", atl: "Himanshu Gupta", aliases: ["Nuclear Power Corporation of India"] },
    { name: "NSDL", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Nitika Virmani", aliases: ["National Securities Depository"] },
    { name: "Persistent", tier: 3, country: "IN", market: "ISA", industry: "Technology", atl: "Kalidas Kumbharkar", aliases: ["Persistent Systems"] },
    { name: "Pidilite", tier: 3, country: "IN", market: "ISA", industry: "Energy", atl: "Siddhesh Rane", aliases: ["Pidilite Industries"] },
    { name: "PNB India", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Priya Gupta", aliases: ["Punjab National Bank"] },
    { name: "PNB MetLife", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Kapil Kasetwar" },
    { name: "PolicyBazaar (PB Fintech)", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Prageetika Sharma", aliases: ["PolicyBazaar","PB Fintech"] },
    { name: "RBL Bank", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Nitika Virmani", aliases: ["Ratnakar Bank"] },
    { name: "RPG", tier: 3, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Jatin Chaudhary", aliases: ["RPG Group"] },
    { name: "Shriram", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", aliases: ["Shriram Finance"] },
    { name: "Spandana", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sreemukhi Singarayachervu", aliases: ["Spandana Sphoorty"] },
    { name: "Star Health", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Sreemukhi Singarayachervu", aliases: ["Star Health and Allied Insurance"] },
    { name: "Suzuki", tier: 3, country: "IN", market: "ISA", industry: "Manufacturing", atl: "Divya Anand", aliases: ["Suzuki Motor"] },
    { name: "Swiggy", tier: 3, country: "IN", market: "ISA", industry: "Retail", atl: "Rachna Issar" },
    { name: "TechM", tier: 3, country: "IN", market: "ISA", industry: "Technology", atl: "Kalidas Kumbharkar", aliases: ["Tech Mahindra"] },
    { name: "Telangana Electricity Board", tier: 3, country: "IN", market: "ISA", industry: "Energy", atl: "Amit Pishe" },
    { name: "TVS", tier: 3, country: "IN", market: "ISA", industry: "Manufacturing", aliases: ["TVS Motor"] },
    { name: "UCO Bank", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Girish Rohini" },
    { name: "Unity SFB", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Nitika Virmani", aliases: ["Unity Small Finance Bank"] },
    { name: "Walmart", tier: 3, country: "IN", market: "ISA", industry: "Retail", atl: "Jasbir Kaur", aliases: ["Walmart India"] },
    { name: "Welspun", tier: 3, country: "IN", market: "ISA", industry: "Conglomerate", atl: "Siddhesh Rane", aliases: ["Welspun Group"] },
    { name: "Zepto", tier: 3, country: "IN", market: "ISA", industry: "Retail", atl: "Jasbir Kaur" },
    { name: "Zerodha", tier: 3, country: "IN", market: "ISA", industry: "Financial Services", atl: "Manoj Nair" },
    { name: "Zydus", tier: 3, country: "IN", market: "ISA", industry: "Healthcare", atl: "Bhargavi Shukla", aliases: ["Zydus Cadila","Zydus Lifesciences"] },

    // ─── KOREA MARKET ───────────────────────────────────
    { name: "HMG", tier: 1, country: "KR", market: "KOREA", industry: "Manufacturing", atl: "Dong Young Kim", aliases: ["Hyundai Motor Group","Hyundai Motor"] },
    { name: "KB", tier: 1, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Jeongkwan Lee", aliases: ["KB Financial Group","KB Kookmin Bank"] },
    { name: "LG", tier: 1, country: "KR", market: "KOREA", industry: "Technology", atl: "Keun Jin Yoo", aliases: ["LG Electronics"] },
    { name: "POSCO", tier: 1, country: "KR", market: "KOREA", industry: "Manufacturing", atl: "Dong Young Kim", aliases: ["POSCO Holdings"] },
    { name: "Samsung", tier: 1, country: "KR", market: "KOREA", industry: "Conglomerate", atl: "Sul Hwa Lee", aliases: ["Samsung Group"] },
    { name: "Shinhan", tier: 1, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Sejong Ryu", aliases: ["Shinhan Financial Group"] },
    { name: "SK Group", tier: 1, country: "KR", market: "KOREA", industry: "Conglomerate", atl: "Ki Ho Jang" },
    { name: "Coupang Pay", tier: 2, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Keun Jin Yoo", aliases: ["Coupang"] },
    { name: "GS Group", tier: 2, country: "KR", market: "KOREA", industry: "Conglomerate", atl: "Gwangsu Kim" },
    { name: "Hana", tier: 2, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Ae Young Sun", aliases: ["Hana Financial Group"] },
    { name: "Hanwha", tier: 2, country: "KR", market: "KOREA", industry: "Conglomerate", atl: "Dong Young Kim", aliases: ["Hanwha Group"] },
    { name: "IBK", tier: 2, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Ae Young Sun", aliases: ["Industrial Bank of Korea"] },
    { name: "KEPCO", tier: 2, country: "KR", market: "KOREA", industry: "Energy", atl: "Gwangsu Kim", aliases: ["Korea Electric Power Corporation"] },
    { name: "Korean Air (KAL)", tier: 2, country: "KR", market: "KOREA", industry: "Transportation & Logistics", atl: "Jong Gook Kim", aliases: ["Korean Air"] },
    { name: "KT", tier: 2, country: "KR", market: "KOREA", industry: "Telecommunications", atl: "Jong Gook Kim", aliases: ["KT Corporation"] },
    { name: "Lotte", tier: 2, country: "KR", market: "KOREA", industry: "Retail", atl: "Gwangsu Kim", aliases: ["Lotte Group","Lotte Shopping"] },
    { name: "NongHyup (NH)", tier: 2, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Ae Young Sun", aliases: ["NongHyup","NH Financial Group"] },
    { name: "Shinsegae", tier: 2, country: "KR", market: "KOREA", industry: "Retail", atl: "Jong Gook Kim", aliases: ["Shinsegae Group"] },
    { name: "StanChart KR", tier: 2, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Sejong Ryu", aliases: ["Standard Chartered Korea"] },
    { name: "Woori", tier: 2, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Kyu Bong Lee", aliases: ["Woori Financial Group"] },
    { name: "CJ Group", tier: 3, country: "KR", market: "KOREA", industry: "Conglomerate", atl: "Keun Jin Yoo" },
    { name: "Daishin", tier: 3, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Suk Jae Choi", aliases: ["Daishin Securities"] },
    { name: "DB Group", tier: 3, country: "KR", market: "KOREA", industry: "Conglomerate", atl: "Sejong Ryu" },
    { name: "Doosan", tier: 3, country: "KR", market: "KOREA", industry: "Manufacturing", atl: "Jong Gook Kim", aliases: ["Doosan Group"] },
    { name: "Hankook", tier: 3, country: "KR", market: "KOREA", industry: "Manufacturing", atl: "Jong Gook Kim", aliases: ["Hankook Tire"] },
    { name: "Hanwha Life", tier: 3, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Kyu Bong Lee" },
    { name: "KIS", tier: 3, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Suk Jae Choi", aliases: ["Korea Investment & Securities"] },
    { name: "Kiwoom", tier: 3, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Suk Jae Choi", aliases: ["Kiwoom Securities"] },
    { name: "LS Group", tier: 3, country: "KR", market: "KOREA", industry: "Manufacturing", atl: "Jong Gook Kim" },
    { name: "Meritz", tier: 3, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Kyu Bong Lee", aliases: ["Meritz Financial Group"] },
    { name: "Mirae Asset", tier: 3, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Suk Jae Choi", aliases: ["Mirae Asset Financial Group"] },
    { name: "Taekwang", tier: 3, country: "KR", market: "KOREA", industry: "Conglomerate", atl: "Ae Young Sun", aliases: ["Taekwang Group"] },
    { name: "Tongyang Life", tier: 3, country: "KR", market: "KOREA", industry: "Financial Services", atl: "Kyu Bong Lee", aliases: ["Tongyang Life Insurance"] },
];

// ============================================
// EXPANDED INDUSTRY KEYWORDS
// ============================================
const INDUSTRY_KEYWORDS = {
    "Financial Services": [
        "bank", "banking", "financial", "fintech", "insurance", "payments", "lending", "credit", 
        "wealth", "trading", "investment", "mortgage", "cbdc", "central bank digital", "basel", 
        "regtech", "wealthtech", "insurtech", "kyc", "aml", "swift", "real-time payments", 
        "open banking", "neobank", "digital bank", "core banking", "treasury", "capital markets",
        "asset management", "hedge fund", "private equity", "venture capital", "ipo"
    ],
    "Government": [
        "government", "public sector", "federal", "state", "ministry", "agency", "defense", 
        "military", "citizen", "e-government", "smart city", "govtech", "digital government", 
        "civic tech", "public cloud", "foia", "transparency", "national security", 
        "critical infrastructure", "public safety", "elections", "census", "immigration",
        "social services", "public health", "education department"
    ],
    "Telecommunications": [
        "telecom", "telecommunications", "telco", "5g", "network", "mobile", "wireless", 
        "broadband", "fiber", "carrier", "spectrum", "open ran", "edge computing", 
        "network slicing", "private 5g", "satellite", "starlink", "connectivity",
        "mno", "mvno", "tower", "backhaul", "latency", "bandwidth", "iot connectivity"
    ],
    "Manufacturing": [
        "manufacturing", "factory", "production", "supply chain", "logistics", "automotive", 
        "aerospace", "industrial", "automation", "robotics", "industry 4.0", "digital twin", 
        "iot", "smart factory", "mes", "plm", "erp", "scada", "predictive maintenance",
        "quality control", "lean manufacturing", "just-in-time", "3d printing", "additive"
    ],
    "Energy": [
        "energy", "oil", "gas", "renewable", "solar", "wind", "utility", "power", "grid", 
        "electricity", "nuclear", "mining", "sustainability", "smart grid", "ev charging", 
        "carbon capture", "net zero", "esg", "scope 3", "green hydrogen", "battery storage",
        "lng", "petroleum", "refinery", "upstream", "downstream", "midstream", "decarbonization"
    ],
    "Retail": [
        "retail", "ecommerce", "e-commerce", "consumer", "shopping", "store", "omnichannel", 
        "inventory", "merchandise", "cpg", "fmcg", "grocery", "supermarket", "fashion",
        "luxury", "marketplace", "fulfillment", "last mile", "supply chain retail",
        "pos", "point of sale", "loyalty", "customer experience", "d2c", "direct to consumer"
    ],
    "Healthcare": [
        "healthcare", "health", "hospital", "medical", "pharma", "pharmaceutical", "clinical", 
        "patient", "diagnosis", "biotech", "life sciences", "ehr", "electronic health record",
        "telemedicine", "telehealth", "clinical trial", "fda", "drug discovery", "genomics",
        "medical device", "diagnostics", "vaccine", "therapy", "oncology", "radiology"
    ],
    "Technology": [
        "technology", "software", "saas", "platform", "startup", "venture", "digital", 
        "innovation", "tech company", "silicon valley", "unicorn", "ipo", "tech ipo",
        "developer", "engineering", "product", "agile", "devops", "cloud native"
    ]
};

// ============================================
// CATEGORY CONFIGURATION WITH WEIGHTS
// ============================================
const CATEGORIES = {
    "AI & Agentic": { emoji: "🤖", color: "#7c3aed", weight: 1.15 },
    "Sovereignty & Regulation": { emoji: "🛡️", color: "#dc2626", weight: 1.15 },
    "China & Geopolitics": { emoji: "🇨🇳", color: "#d97706", weight: 1.10 },
    "Competitive Landscape": { emoji: "⚔️", color: "#2563eb", weight: 1.10 },
    "APAC Enterprise": { emoji: "🌏", color: "#059669", weight: 1.05 },
    "Strategic Perspectives": { emoji: "💭", color: "#6b7280", weight: 1.00 },
    "Architecture & Platform": { emoji: "🏗️", color: "#4f46e5", weight: 0.95 },
    "IBM & Partners": { emoji: "🔵", color: "#0f62fe", weight: 1.10 }
};

// ============================================
// CROSS-REFERENCE THEMES FOR SIGNAL DETECTION
// Enhanced for Field CTO context
// ============================================
const CROSS_REFERENCE_THEMES = {
    // === AI/AGENTIC TRANSFORMATION (Wave 1) ===
    'Agentic AI': ['ai agent', 'agentic', 'autonomous agent', 'multi-agent', 'agent framework', 'agent orchestration', 'tool use', 'mcp protocol', 'function calling'],
    'Generative AI Enterprise': ['enterprise genai', 'genai adoption', 'llm deployment', 'foundation model', 'rag', 'retrieval augmented', 'fine-tuning', 'prompt engineering'],
    'AI Governance & Safety': ['ai governance', 'ai regulation', 'ai act', 'ai safety', 'responsible ai', 'ai ethics', 'ai risk', 'ai audit', 'model governance', 'ai compliance'],
    'AI Infrastructure': ['gpu shortage', 'nvidia', 'tpu', 'inference cost', 'training cluster', 'ai chip', 'accelerator', 'ai infrastructure', 'model serving'],
    'Copilot & AI Assistants': ['copilot', 'ai assistant', 'code assistant', 'ai coding', 'developer ai', 'ai productivity', 'ai workplace'],
    
    // === SOVEREIGNTY & REGULATION (Wave 2) ===
    'Data Sovereignty': ['data sovereignty', 'data localization', 'data residency', 'cross-border data', 'data protection', 'privacy regulation', 'pdpa', 'dpdp'],
    'Sovereign Cloud': ['sovereign cloud', 'government cloud', 'classified cloud', 'air-gapped', 'private cloud', 'on-premise', 'cloud repatriation'],
    'Regulatory Compliance APAC': ['mas notice', 'apra prudential', 'hkma circular', 'sebi circular', 'rbi directive', 'operational resilience', 'third party risk'],
    'AI Regulation APAC': ['ai regulation', 'ai governance framework', 'ai ethics guidelines', 'algorithmic accountability', 'ai transparency'],
    
    // === COMPETITIVE LANDSCAPE ===
    'Cloud Competition': ['azure', 'aws', 'google cloud', 'cloud pricing', 'multi-cloud', 'hybrid cloud', 'cloud market share', 'cloud revenue'],
    'Microsoft AI Moves': ['azure openai', 'microsoft ai', 'copilot enterprise', 'azure arc', 'microsoft fabric', 'azure ai foundry', 'microsoft partnership'],
    'AWS AI Moves': ['aws bedrock', 'amazon q', 'aws sagemaker', 'amazon connect', 'aws generative ai', 'aws partnership'],
    'Google Cloud AI Moves': ['vertex ai', 'google workspace ai', 'gemini enterprise', 'google cloud ai', 'google partnership'],
    'Consulting Competition': ['accenture wins', 'deloitte partnership', 'infosys deal', 'wipro contract', 'cognizant agreement', 'capgemini'],
    
    // === IBM & ECOSYSTEM ===
    'watsonx & IBM AI': ['watsonx', 'watson', 'ibm ai', 'ibm cloud', 'ibm consulting', 'ibm partnership', 'ibm contract', 'ibm deal'],
    'Red Hat & Hybrid': ['red hat', 'openshift', 'ansible', 'rhel', 'kubernetes', 'container platform', 'hybrid cloud'],
    
    // === MARKET SIGNALS ===
    'C-Suite Changes': ['new cto', 'new cio', 'appoints', 'names chief', 'cto appointed', 'cio appointed', 'cdo appointed', 'chief ai officer'],
    'Digital Transformation Deals': ['digital transformation', 'cloud migration', 'modernization program', 'rfp', 'tender', 'procurement', 'technology investment'],
    'M&A Activity': ['acquisition', 'merger', 'acquired', 'strategic investment', 'buyout', 'ipo', 'private equity'],
    'APAC Expansion': ['apac expansion', 'asia pacific', 'singapore hub', 'regional headquarters', 'apac growth', 'asia strategy', 'southeast asia'],
    
    // === INDUSTRY DISRUPTION ===
    'Banking Transformation': ['core banking', 'digital bank', 'neobank', 'open banking', 'banking as a service', 'embedded finance', 'payment modernization'],
    'Telco Transformation': ['5g monetization', 'open ran', 'telco cloud', 'network automation', 'bss transformation', 'oss modernization'],
    'Insurance Transformation': ['insurtech', 'claims automation', 'underwriting ai', 'insurance platform', 'embedded insurance'],
    'Government Digitalization': ['smart nation', 'digital government', 'govtech', 'citizen services', 'government cloud'],
    
    // === TECHNOLOGY TRENDS ===
    'Platform Engineering': ['platform engineering', 'developer experience', 'internal developer', 'golden path', 'developer productivity', 'devex'],
    'Observability & AIOps': ['observability', 'aiops', 'sre', 'incident management', 'chaos engineering', 'reliability'],
    'API Economy': ['api economy', 'api management', 'api gateway', 'api monetization', 'api strategy', 'api-first'],
    'Sustainability Tech': ['green it', 'sustainable tech', 'carbon footprint', 'esg reporting', 'climate tech', 'net zero tech'],
    
    // === RISK SIGNALS ===
    'Cybersecurity Threats': ['ransomware', 'cyber attack', 'data breach', 'zero trust', 'security vulnerability', 'threat actor', 'apt', 'supply chain attack'],
    'Economic Headwinds': ['cost cutting', 'layoffs', 'restructuring', 'budget reduction', 'hiring freeze', 'downsizing'],
    'Talent & Skills': ['ai talent', 'tech talent', 'skills gap', 'upskilling', 'workforce transformation', 'hiring challenge'],

    // === OPEN-SOURCE VULNERABILITY GAP (Conv L — Lightwell qualifier) ===
    // These signals route to a qualifying question, never opened cold
    'Open Source Vulnerability': ['cve', 'vulnerability', 'open source risk', 'dependency risk', 'software supply chain', 'sbom', 'software bill of materials', 'pinned dependency', 'cannot upgrade', 'patch backport', 'open source exposure', 'community kafka', 'community terraform', 'community ansible', 'patch to production', 'remediation cycle', 'security exception', 'private fork']
};

// ============================================
// DEAL RELEVANCE SIGNALS — FIELD CTO ENHANCED
// Used for deal-relevance scoring layer in app.js
// ============================================
const DEAL_RELEVANCE_SIGNALS = {
    // Competitor keywords — co-occurrence with a client = competitive threat
    COMPETITOR_KEYWORDS: [
        // Hyperscalers
        'microsoft', 'azure', 'aws', 'amazon web services', 'google cloud', 'gcp',
        // AI-specific products
        'azure openai', 'copilot', 'github copilot', 'microsoft copilot', 'amazon bedrock', 'amazon q',
        'vertex ai', 'gemini', 'google gemini', 'duet ai', 'openai', 'chatgpt', 'anthropic', 'claude',
        // Data platforms
        'snowflake', 'databricks', 'palantir', 'datadog', 'splunk', 'elastic',
        // Cloud/Infra
        'vmware', 'hashicorp', 'terraform', 'nutanix',
        // Consulting/SI
        'accenture', 'deloitte', 'mckinsey', 'pwc', 'kpmg', 'ey consulting',
        'infosys', 'wipro', 'cognizant', 'capgemini', 'dxc technology', 'tcs', 'hcl', 'tech mahindra',
        'kyndryl',
        // Regional competitors
        'alibaba cloud', 'aliyun', 'tencent cloud', 'ntt data', 'fujitsu',
        // Automation
        'servicenow', 'salesforce', 'sap', 'oracle cloud', 'uipath', 'automation anywhere',
        // Security
        'crowdstrike', 'palo alto', 'zscaler', 'okta', 'cyberark'
    ],
    // C-suite change keywords — signals new decision-maker, potential re-evaluation
    CSUITE_KEYWORDS: [
        'new cto', 'new cio', 'new cdo', 'appoints', 'names chief', 
        'chief technology officer', 'chief information officer', 'chief digital officer',
        'chief data officer', 'cdo appointed', 'cto appointed', 'cio appointed',
        'technology leadership', 'digital leadership', 'it leadership change',
        'executive appointment', 'joins as', 'promoted to', 'group cto',
        'chief ai officer', 'caio', 'head of technology', 'head of digital',
        'vp engineering', 'vp technology', 'svp technology', 'evp technology',
        'chief analytics officer', 'chief automation officer', 'chief security officer', 'ciso'
    ],
    // Regulatory keywords — compliance pressure = IBM opportunity (APAC-specific)
    REGULATORY_KEYWORDS: [
        // ASEAN
        'mas notice', 'mas guidelines', 'mas consultation', 'pdpc advisory', 'pdpc enforcement',
        'imda guideline', 'bsp circular', 'ojk regulation', 'bi regulation', 'bank indonesia',
        'sec thailand', 'bot thailand', 'bnm malaysia', 'bank negara', 'pdpa thailand', 'pdpa singapore',
        'pdpa malaysia', 'cybersecurity act singapore',
        // ANZ
        'apra prudential', 'apra cps', 'cps 230', 'cps 234', 'cps 220', 'asic guidance', 'asic rg',
        'oaic', 'privacy act australia', 'cdr rules', 'consumer data right',
        'rbnz', 'fma new zealand', 'privacy commissioner nz', 'nzism',
        // GCG
        'hkma circular', 'hkma guideline', 'sfc hong kong', 'pipl china', 'pipl', 'cac china',
        'mlr china', 'dsl china', 'fsc taiwan', 'ndpc taiwan', 'pdpo hong kong',
        // ISA
        'sebi circular', 'rbi master direction', 'rbi guideline', 'meity notification', 'dpdp act',
        'cert-in directive', 'irdai', 'npci guidelines', 'pfrda', 'digital india act',
        // KOREA
        'fsc korea', 'fss korea', 'kisa', 'pipa korea', 'mydata korea', 'k-isms',
        // Global/Regional
        'ai act', 'ai regulation', 'ai governance framework', 'responsible ai',
        'compliance deadline', 'regulatory requirement', 'mandatory', 'non-compliance', 
        'regulatory fine', 'enforcement action', 'data protection law',
        'cloud regulation', 'operational resilience', 'dora', 'third party risk', 'outsourcing guidelines',
        'critical infrastructure', 'essential services', 'systemically important'
    ],
    // IBM product/solution keywords — direct IBM relevance
    IBM_KEYWORDS: [
        // watsonx family
        'watsonx', 'watsonx.ai', 'watsonx.data', 'watsonx.governance', 'watson',
        'watsonx assistant', 'watsonx orchestrate', 'watsonx code assistant',
        'granite', 'granite model',
        // Cloud & Platform
        'ibm cloud', 'ibm cloud satellite', 'cloud pak', 'cp4d', 'cloud pak for data',
        'cp4i', 'cloud pak for integration', 'cp4ba', 'cloud pak for business automation',
        // Red Hat
        'red hat', 'openshift', 'ansible', 'rhel', 'red hat enterprise linux',
        'openshift ai', 'ansible automation platform', 'red hat insights',
        // Security
        'ibm security', 'qradar', 'guardium', 'verify', 'maas360', 'trusteer',
        'ibm concert', 'concert', 'randori', 'reaqta',
        // Infrastructure
        'ibm z', 'ibm power', 'linuxone', 'ibm storage', 'ibm spectrum', 'ibm flashsystem',
        // Observability & FinOps
        'instana', 'turbonomic', 'apptio', 'cloudability',
        // Lightwell (Conv L — open-source vulnerability remediation, Red Hat + IBM)
        'lightwell', 'lightwell network', 'clearinghouse premier',
        // Other
        'ibm quantum', 'ibm research', 'ibm institute', 'ibm garage',
        'ibm consulting', 'ibm automation', 'sterling', 'aspera', 'databand',
        'envizi', 'sustainability', 'ibm sustainability'
    ],
    // Opportunity keywords — signals active buying intent
    OPPORTUNITY_KEYWORDS: [
        'digital transformation', 'ai strategy', 'genai strategy', 'cloud migration', 'modernization',
        'rfp', 'request for proposal', 'rfi', 'request for information', 'tender', 'procurement',
        'technology investment', 'it budget', 'digital initiative', 'technology roadmap',
        'vendor selection', 'vendor evaluation', 'technology selection',
        'proof of concept', 'poc', 'pilot program', 'strategic partnership', 'technology refresh',
        'multi-year contract', 'enterprise agreement', 'platform consolidation',
        'legacy modernization', 'mainframe modernization', 'core banking transformation',
        'data platform', 'ai platform', 'automation platform', 'integration platform',
        'cloud repatriation', 'hybrid cloud strategy', 'multi-cloud strategy',
        'cost optimization', 'finops', 'cloud cost', 'sustainability initiative'
    ]
};

// ============================================
// FIELD CTO ACTION TRIGGERS
// Signals requiring Field CTO attention/action
// ============================================
const FIELD_CTO_ACTION_TRIGGERS = {
    // Immediate escalation — contact client executive this week
    ESCALATION_TRIGGERS: [
        'cto appointed', 'cio appointed', 'cdo appointed', 'chief ai officer',
        'digital transformation announced', 'cloud strategy announced',
        'vendor review', 'technology refresh', 'rfp issued', 'tender announced',
        'strategic review', 'board approved', 'budget approved', 'investment approved',
        'partnership with microsoft', 'partnership with aws', 'partnership with google',
        'signs with accenture', 'signs with deloitte', 'selects azure', 'selects aws',
        'competitive win', 'competitive loss', 'ibm contract', 'ibm partnership'
    ],
    // ATL briefing required — ensure ATL is aware and prepared
    ATL_BRIEFING_TRIGGERS: [
        'cost cutting', 'layoffs', 'restructuring', 'merger', 'acquisition',
        'new regulations', 'compliance requirements', 'regulatory action',
        'cybersecurity incident', 'data breach', 'ransomware attack',
        'earnings miss', 'profit warning', 'revenue decline',
        'new product launch', 'market expansion', 'regional headquarters',
        'leadership change', 'board changes', 'activist investor'
    ],
    // Market-wide impact — affects multiple accounts
    MARKET_SIGNALS: [
        'industry-wide', 'sector-wide', 'across the industry', 'banking sector',
        'financial services industry', 'telecom industry', 'healthcare sector',
        'government mandate', 'central bank directive', 'regulatory overhaul',
        'market disruption', 'industry transformation', 'paradigm shift'
    ],
    // IBM positioning opportunity — leverage IBM strengths
    IBM_POSITIONING: [
        'hybrid cloud', 'data sovereignty', 'ai governance', 'responsible ai',
        'mainframe', 'core banking', 'mission critical', 'high availability',
        'regulated industry', 'compliance', 'security', 'zero trust',
        'automation', 'aiops', 'observability', 'finops',
        'open source', 'kubernetes', 'containers', 'openshift',
        'data fabric', 'data mesh', 'data lakehouse', 'data integration'
    ]
};

// ============================================
// COMPETITIVE POSITIONING MAP
// IBM solutions vs competitor offerings
// Used by generateGTMDigest() and renderATLEnablement()
// ============================================
const COMPETITIVE_POSITIONING = {
    // AI & ML - Microsoft
    'azure openai': { ibm: 'watsonx.ai', angle: 'Enterprise AI governance + data privacy' },
    'copilot': { ibm: 'IBM Bob', angle: 'Whole lifecycle + governed spend + on-premises path (GA target 30 Sep 2026)' },
    'github copilot': { ibm: 'IBM Bob', angle: 'Whole lifecycle + governed spend; who owns the bill and can the code stay on your ground' },
    'microsoft copilot': { ibm: 'watsonx Orchestrate', angle: 'Process automation + enterprise integration' },
    'dynamics 365 copilot': { ibm: 'watsonx Orchestrate', angle: 'Open ecosystem + hybrid deployment' },
    
    // AI & ML - AWS
    'bedrock': { ibm: 'watsonx.ai', angle: 'Hybrid deployment + model flexibility' },
    'amazon bedrock': { ibm: 'watsonx.ai', angle: 'On-prem option + data sovereignty' },
    'sagemaker': { ibm: 'watsonx.ai + Cloud Pak for Data', angle: 'Governed AI lifecycle' },
    'amazon q': { ibm: 'watsonx Assistant', angle: 'Enterprise knowledge + hybrid deployment' },
    'aws trainium': { ibm: 'watsonx.ai', angle: 'Model portability + multi-cloud' },
    
    // AI & ML - Google
    'vertex ai': { ibm: 'watsonx.ai', angle: 'Open models + enterprise integration' },
    'gemini': { ibm: 'watsonx.ai', angle: 'Enterprise governance + data residency' },
    'google gemini': { ibm: 'watsonx.ai', angle: 'Hybrid deployment + regulatory compliance' },
    'duet ai': { ibm: 'IBM Bob', angle: 'Whole lifecycle + governed spend + on-premises path' },
    
    // AI & ML - Others
    'openai': { ibm: 'watsonx.ai', angle: 'Enterprise governance + data privacy + hybrid' },
    'chatgpt enterprise': { ibm: 'watsonx Assistant', angle: 'On-prem deployment + data sovereignty' },
    'anthropic': { ibm: 'watsonx.ai', angle: 'Model choice + enterprise governance' },
    'claude enterprise': { ibm: 'watsonx.ai', angle: 'Hybrid deployment + compliance' },
    'cohere': { ibm: 'watsonx.ai', angle: 'Enterprise scale + governance' },
    
    // Data Platforms
    'databricks': { ibm: 'watsonx.data', angle: 'Cost optimization + governance' },
    'snowflake': { ibm: 'watsonx.data', angle: 'Hybrid deployment + AI integration' },
    'palantir': { ibm: 'watsonx.data + watsonx.ai', angle: 'Open architecture + cost' },
    'datadog': { ibm: 'Instana', angle: 'AI-powered observability + hybrid' },
    'splunk': { ibm: 'QRadar + Instana', angle: 'Unified security + observability' },
    
    // Cloud & Infrastructure
    'azure arc': { ibm: 'Red Hat OpenShift', angle: 'True hybrid + multi-cloud portability' },
    'aws outposts': { ibm: 'IBM Cloud Satellite', angle: 'Edge + sovereign deployment' },
    'anthos': { ibm: 'Red Hat OpenShift', angle: 'Enterprise support + ecosystem' },
    'vmware': { ibm: 'Red Hat OpenShift Virtualization', angle: 'Modernization path + Kubernetes' },
    'vmware tanzu': { ibm: 'Red Hat OpenShift', angle: 'Enterprise Kubernetes + support' },
    'hashicorp': { ibm: 'Red Hat Ansible + OpenShift', angle: 'Enterprise automation + support' },
    
    // Automation & Integration
    'power automate': { ibm: 'watsonx Orchestrate', angle: 'AI-powered automation + enterprise scale' },
    'power platform': { ibm: 'watsonx Orchestrate + Automation', angle: 'Enterprise integration + governance' },
    'servicenow': { ibm: 'watsonx Orchestrate', angle: 'Deep integration + process mining' },
    'uipath': { ibm: 'watsonx Orchestrate', angle: 'AI-first automation + enterprise' },
    'automation anywhere': { ibm: 'watsonx Orchestrate', angle: 'Intelligent automation + scale' },
    'mulesoft': { ibm: 'webMethods', angle: 'Agent control plane + total estate cost, not one connector\'s features' },
    'workato': { ibm: 'webMethods', angle: 'Governed fabric the agents act on, not connectivity rented inside a platform' },

    // AI Coding (Conv 5 — IBM Bob)
    'cursor': { ibm: 'IBM Bob', angle: 'Whole lifecycle + governed spend; who owns the bill and can the code stay on your ground' },

    // Security
    'sentinel': { ibm: 'QRadar SIEM', angle: 'AI-powered threat intelligence' },
    'microsoft sentinel': { ibm: 'QRadar SIEM', angle: 'Hybrid SIEM + threat intelligence' },
    'crowdstrike': { ibm: 'IBM Security', angle: 'Managed detection + response' },
    'palo alto': { ibm: 'IBM Security', angle: 'Integrated security + consulting' },
    'zscaler': { ibm: 'IBM Security', angle: 'Zero trust + enterprise integration' },

    // Open-source vulnerability remediation (Conv L — Lightwell qualifier)
    'snyk': { ibm: 'Lightwell / Concert', angle: 'Scanning is not fixing; Lightwell supplies the signed fix at the version they already run — treat as complementary, not either/or' },
    'chainguard': { ibm: 'Lightwell / Concert', angle: 'Scanning is not fixing; Lightwell supplies the signed fix at the version they already run — treat as complementary, not either/or' },
    'athena security': { ibm: 'Lightwell / Concert', angle: 'Scanning is not fixing; Lightwell supplies the signed fix at the version they already run — treat as complementary, not either/or' },
    
    // Consulting & SI
    'accenture': { ibm: 'IBM Consulting', angle: 'Technology depth + IBM stack expertise' },
    'deloitte': { ibm: 'IBM Consulting', angle: 'Technology-led transformation' },
    'infosys': { ibm: 'IBM Consulting', angle: 'Strategic advisory + co-creation' },
    'wipro': { ibm: 'IBM Consulting', angle: 'Deep tech expertise + innovation' },
    'cognizant': { ibm: 'IBM Consulting', angle: 'Industry expertise + IBM ecosystem' },
    'tcs': { ibm: 'IBM Consulting', angle: 'Strategic transformation + IP' },
    'capgemini': { ibm: 'IBM Consulting', angle: 'Technology-first approach' },
    'kyndryl': { ibm: 'IBM Consulting + Technology', angle: 'End-to-end IBM stack' }
};

// ============================================
// APAC MARKET CONTEXT
// Market-specific keywords and priorities
// Used by renderATLEnablement() for market signal routing
// ============================================
const APAC_MARKET_CONTEXT = {
    ANZ: {
        // Country names (for geographic routing)
        countries: ['australia', 'australian', 'new zealand', 'nz', 'kiwi', 'sydney', 'melbourne', 'brisbane', 'perth', 'auckland', 'wellington'],
        // Regulators (highest priority for market assignment)
        regulators: ['apra', 'asic', 'oaic', 'accc', 'rba', 'austrac', 'rbnz', 'fma', 'comcom', 'cdr'],
        // Market priorities (current regulatory/business themes)
        priorities: ['open banking', 'consumer data right', 'cdr', 'operational resilience', 'climate risk', 'scams prevention', 'cps 230', 'cps 234', 'prudential standard', 'financial accountability'],
        // Watchwords (entities, initiatives, market-specific terms)
        watchwords: ['big four banks', 'superannuation', 'nbn', 'asx', 'nzx', 'anz region', 'trans-tasman', 'afterpay', 'buy now pay later'],
        // Key industries in this market
        industries: ['Financial Services', 'Energy', 'Telecommunications', 'Healthcare', 'Retail']
    },
    ASEAN: {
        countries: ['singapore', 'singaporean', 'malaysia', 'malaysian', 'indonesia', 'indonesian', 'thailand', 'thai', 'philippines', 'filipino', 'vietnam', 'vietnamese'],
        regulators: ['mas', 'pdpc', 'imda', 'bnm', 'bank negara', 'sc malaysia', 'ojk', 'bi', 'bank indonesia', 'bsp', 'sec philippines', 'bot', 'sec thailand', 'sbv'],
        priorities: ['digital banking license', 'e-payment', 'paynow', 'promptpay', 'qris', 'financial inclusion', 'data localization', 'cross-border payments', 'sgfindex', 'project greenprint'],
        watchwords: ['asean', 'regional integration', 'digital economy', 'smart nation', 'industry 4.0', 'sea region', 'southeast asia', 'grab', 'gojek', 'sea limited', 'shopee'],
        industries: ['Financial Services', 'Telecommunications', 'Energy', 'Transportation & Logistics', 'Technology']
    },
    GCG: {
        countries: ['hong kong', 'hk', 'taiwan', 'taiwanese', 'china', 'chinese', 'macau', 'shenzhen', 'guangzhou', 'taipei'],
        regulators: ['hkma', 'sfc', 'pcpd', 'ia', 'mpfa', 'fsc taiwan', 'cac', 'pboc', 'csrc', 'cbirc', 'miit', 'samr'],
        priorities: ['greater bay area', 'gba', 'wealth connect', 'fintech sandbox', 'virtual bank', 'data cross-border', 'pipl', 'cross-boundary', 'southbound', 'northbound'],
        watchwords: ['cross-boundary', 'renminbi', 'rmb', 'digital yuan', 'e-cny', 'hkex', 'hsi', 'taiex', 'alibaba', 'tencent', 'huawei', 'tsmc', 'foxconn'],
        industries: ['Financial Services', 'Technology', 'Manufacturing', 'Transportation & Logistics']
    },
    ISA: {
        countries: ['india', 'indian', 'sri lanka', 'sri lankan', 'pakistan', 'pakistani', 'bangladesh', 'bangladeshi', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'pune'],
        regulators: ['rbi', 'sebi', 'irdai', 'pfrda', 'cert-in', 'meity', 'npci', 'ibbi', 'cbsl', 'sbp', 'bb'],
        priorities: ['upi', 'unified payments', 'account aggregator', 'digital rupee', 'e-rupi', 'dpdp act', 'data localization', 'ocen', 'ondc', 'aadhaar'],
        watchwords: ['digital india', 'make in india', 'fintech hub', 'startup india', 'gift city', 'ifsc', 'nse', 'bse', 'sensex', 'nifty', 'jio', 'reliance', 'tata', 'infosys', 'wipro', 'tcs'],
        industries: ['Financial Services', 'Technology', 'Telecommunications', 'Manufacturing', 'Energy']
    },
    KOREA: {
        countries: ['korea', 'korean', 'south korea', 'rok', 'seoul', 'busan', 'incheon'],
        regulators: ['fsc korea', 'fss', 'kisa', 'pipc', 'bok', 'bank of korea', 'kdic', 'kftc', 'msit'],
        priorities: ['mydata', 'open banking', 'digital asset', 'cbdc', 'ai ethics', 'k-data', 'data dam', 'regulatory sandbox'],
        watchwords: ['k-finance', 'new deal', 'digital new deal', 'chaebol', 'kospi', 'kosdaq', 'samsung', 'sk', 'lg', 'hyundai', 'kakao', 'naver', 'k-startup'],
        industries: ['Technology', 'Manufacturing', 'Financial Services', 'Telecommunications']
    }
};

// ============================================
// DEEP READS SOURCE CLASSIFICATION
// Sources that provide strategic, long-form content
// Used by renderDeepReads() for source selection
// ============================================
const DEEP_READS_SOURCES = {
    // Primary strategic sources (always include) — names match DEFAULT_SOURCES
    PRIMARY: [
        'McKinsey Insights', 'MIT Sloan Review',
        'Ben Evans', 'Stratechery', 'SemiAnalysis', 'Capgemini Insights'
    ],
    // Research & Analysis (high quality, include when relevant)
    RESEARCH: [
        'Constellation Research', 'Forrester', 'IDC Blog', 'MIT Tech Review',
        'Rest of World', 'Import AI', 'AI Snake Oil'
    ],
    // IBM & Industry (include for IBM-relevant topics)
    IBM_ADJACENT: [
        'IBM Newsroom', 'IBM Research', 'Red Hat Blog',
        'OpenShift Blog', 'The Register', 'Computer Weekly All'
    ],
    // Categories that indicate strategic content
    STRATEGIC_CATEGORIES: [
        'Strategic', 'Leadership', 'Research', 'Analysis', 'Long Read'
    ]
};

// ============================================
// COUNTRY TO MARKET MAPPING
// Used for geographic signal routing
// ============================================
const COUNTRY_MARKET_MAP = {
    // ANZ
    'AU': 'ANZ', 'NZ': 'ANZ',
    // ASEAN
    'SG': 'ASEAN', 'MY': 'ASEAN', 'ID': 'ASEAN', 'TH': 'ASEAN', 'PH': 'ASEAN', 'VN': 'ASEAN',
    // GCG
    'HK': 'GCG', 'TW': 'GCG', 'CN': 'GCG', 'MO': 'GCG',
    // ISA
    'IN': 'ISA', 'LK': 'ISA', 'PK': 'ISA', 'BD': 'ISA', 'NP': 'ISA',
    // KOREA
    'KR': 'KOREA'
};

// ============================================
// HELPER FUNCTIONS
// Utilities for signal detection and routing
// ============================================

/**
 * Look up IBM competitive positioning for a given text
 * @param {string} text - Article title or content to search
 * @returns {object|null} - { competitor, ibm, angle } or null
 */
function getCompetitivePosition(text) {
    const lowerText = text.toLowerCase();
    for (const [competitor, position] of Object.entries(COMPETITIVE_POSITIONING)) {
        if (lowerText.includes(competitor.toLowerCase())) {
            return {
                competitor: competitor,
                ibm: position.ibm,
                angle: position.angle
            };
        }
    }
    return null;
}

/**
 * Detect which APAC market a text refers to based on countries/cities
 * @param {string} text - Article title or content to search
 * @returns {string|null} - Market code (ANZ, ASEAN, GCG, ISA, KOREA) or null
 */
function detectMarketFromText(text) {
    const lowerText = text.toLowerCase();
    for (const [market, context] of Object.entries(APAC_MARKET_CONTEXT)) {
        // Check countries first (most specific)
        if (context.countries?.some(c => lowerText.includes(c))) {
            return market;
        }
        // Then check regulators
        if (context.regulators?.some(r => lowerText.includes(r))) {
            return market;
        }
    }
    return null;
}

// Made with Bob
