// =============================================
// The Signal Today - Optimized Sources Configuration
// Version 3.3 - 76 Working Feeds
// =============================================

const DEFAULT_SOURCES = [
    // ============================================
    // 🤖 AI & AGENTIC (9 sources)
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
        digestType: "weekly",
        enabled: true
    },
    {
        name: "OpenAI Blog",
        url: "https://openai.com/news/rss.xml",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "weekly",
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
        name: "Dataconomy",
        url: "https://dataconomy.com/feed",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.82,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "RTInsights MLOps",
        url: "https://rtinsights.com/tag/mlops/feed",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "ClearML Blog",
        url: "https://clear.ml/feed",
        category: "AI & Agentic",
        priority: 3,
        credibilityScore: 0.78,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 🛡️ CYBERSECURITY & SOVEREIGNTY (6 sources)
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
        name: "Computer Weekly Security",
        url: "https://www.computerweekly.com/rss/IT-security.xml",
        category: "Cybersecurity & Sovereignty",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "both",
        enabled: true
    },
    {
        name: "CSO Online",
        url: "https://www.csoonline.com/feed/",
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
        name: "Cyber Security Hub",
        url: "https://www.cshub.com/rss-feeds",
        category: "Cybersecurity & Sovereignty",
        priority: 3,
        credibilityScore: 0.78,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // 🌏 APAC REGIONAL (25 sources)
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
        name: "Tech in Asia",
        url: "https://www.techinasia.com/feed",
        category: "APAC Regional",
        priority: 1,
        credibilityScore: 0.86,
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
        name: "BusinessWorld Philippines",
        url: "https://www.bworldonline.com/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
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
        name: "e27",
        url: "https://e27.co/news/rss",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.82,
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
        name: "ASEAN News Today",
        url: "https://aseannewstoday.com/feed/",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.78,
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
        name: "ChinaTechNews",
        url: "https://www.chinatechnews.com/feed",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.78,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Korea Tech Desk",
        url: "https://koreatechdesk.com/feed",
        category: "APAC Regional",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Korea Tech Today",
        url: "https://koreatechtoday.com/feed",
        category: "APAC Regional",
        priority: 3,
        credibilityScore: 0.78,
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
    // 🏢 ENTERPRISE TECH (15 sources)
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
        name: "CIO.com",
        url: "https://www.cio.com/index.rss",
        category: "Enterprise Tech",
        priority: 1,
        credibilityScore: 0.88,
        digestType: "daily",
        enabled: true
    },
    {
        name: "InfoWorld",
        url: "https://www.infoworld.com/index.rss",
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
        name: "ZDNet Enterprise",
        url: "https://www.zdnet.com/topic/enterprise-software/rss.xml",
        category: "Enterprise Tech",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "daily",
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
        name: "CloudTech",
        url: "https://cloudcomputing-news.net/feed",
        category: "Enterprise Tech",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "TechRepublic Cloud",
        url: "https://www.techrepublic.com/rssfeeds/topic/cloud/",
        category: "Enterprise Tech",
        priority: 3,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "TechRepublic DevOps",
        url: "https://www.techrepublic.com/rssfeeds/topic/devops/",
        category: "Enterprise Tech",
        priority: 3,
        credibilityScore: 0.82,
        digestType: "daily",
        enabled: true
    },
    {
        name: "TechRepublic Articles",
        url: "https://www.techrepublic.com/rssfeeds/articles/",
        category: "Enterprise Tech",
        priority: 3,
        credibilityScore: 0.80,
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
    // ⚔️ COMPETITIVE LANDSCAPE (8 sources)
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
        name: "Azure Blog",
        url: "https://azure.microsoft.com/en-us/blog/feed/",
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
        name: "Azure Feeds",
        url: "https://azurefeeds.com/feed",
        category: "Competitive Landscape",
        priority: 3,
        credibilityScore: 0.80,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "AWS Insider",
        url: "https://awsinsider.net/rss-feeds/awsinsider-net.aspx",
        category: "Competitive Landscape",
        priority: 3,
        credibilityScore: 0.78,
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
    // 📊 STRATEGIC ANALYSIS (5 sources)
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
        name: "Deloitte Tech Trends",
        url: "https://www2.deloitte.com/us/en/pages/technology/articles/tech-trends.html.rss",
        category: "Strategic Analysis",
        priority: 2,
        credibilityScore: 0.86,
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
    {
        name: "Wavestone",
        url: "https://www.wavestone.com/en/feed/",
        category: "Strategic Analysis",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 🔵 IBM & PARTNERS (3 sources)
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
    // Australia
    { name: "Commonwealth Bank", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", aliases: ["CBA", "CommBank"] },
    { name: "ANZ Bank", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", aliases: ["ANZ"] },
    { name: "Westpac", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services" },
    { name: "NAB", tier: 1, country: "AU", market: "ANZ", industry: "Financial Services", aliases: ["National Australia Bank"] },
    { name: "Telstra", tier: 1, country: "AU", market: "ANZ", industry: "Telecommunications" },
    { name: "BHP", tier: 2, country: "AU", market: "ANZ", industry: "Energy", aliases: ["BHP Group", "BHP Billiton"] },
    { name: "Rio Tinto", tier: 2, country: "AU", market: "ANZ", industry: "Manufacturing" },
    { name: "Woolworths", tier: 2, country: "AU", market: "ANZ", industry: "Retail", aliases: ["Woolworths Group"] },
    { name: "Qantas", tier: 2, country: "AU", market: "ANZ", industry: "Transportation & Logistics" },
    { name: "AGL", tier: 3, country: "AU", market: "ANZ", industry: "Energy", aliases: ["AGL Energy"] },
    { name: "Macquarie", tier: 2, country: "AU", market: "ANZ", industry: "Financial Services", aliases: ["Macquarie Group"] },
    { name: "CSL", tier: 2, country: "AU", market: "ANZ", industry: "Healthcare" },
    // New Zealand
    { name: "Spark NZ", tier: 2, country: "NZ", market: "ANZ", industry: "Telecommunications", aliases: ["Spark New Zealand"] },
    { name: "Air New Zealand", tier: 3, country: "NZ", market: "ANZ", industry: "Transportation & Logistics" },
    
    // ─── ASEAN MARKET ─────────────────────────────────
    // Singapore
    { name: "DBS", tier: 1, country: "SG", market: "ASEAN", industry: "Financial Services", aliases: ["DBS Bank", "DBS Group"] },
    { name: "OCBC", tier: 1, country: "SG", market: "ASEAN", industry: "Financial Services", aliases: ["OCBC Bank"] },
    { name: "UOB", tier: 1, country: "SG", market: "ASEAN", industry: "Financial Services", aliases: ["United Overseas Bank"] },
    { name: "Singtel", tier: 1, country: "SG", market: "ASEAN", industry: "Telecommunications", aliases: ["Singapore Telecommunications"] },
    { name: "ST Engineering", tier: 1, country: "SG", market: "ASEAN", industry: "Manufacturing" },
    { name: "PSA", tier: 2, country: "SG", market: "ASEAN", industry: "Transportation & Logistics", aliases: ["PSA International"] },
    { name: "CapitaLand", tier: 2, country: "SG", market: "ASEAN", industry: "Real Estate" },
    { name: "Singapore Airlines", tier: 2, country: "SG", market: "ASEAN", industry: "Transportation & Logistics", aliases: ["SIA"] },
    { name: "Grab", tier: 2, country: "SG", market: "ASEAN", industry: "Technology" },
    { name: "Sea Limited", tier: 2, country: "SG", market: "ASEAN", industry: "Technology", aliases: ["Sea", "Shopee"] },
    // Malaysia
    { name: "Maybank", tier: 1, country: "MY", market: "ASEAN", industry: "Financial Services", aliases: ["Malayan Banking"] },
    { name: "CIMB", tier: 1, country: "MY", market: "ASEAN", industry: "Financial Services", aliases: ["CIMB Group"] },
    { name: "Petronas", tier: 1, country: "MY", market: "ASEAN", industry: "Energy", aliases: ["Petroliam Nasional"] },
    { name: "AirAsia", tier: 2, country: "MY", market: "ASEAN", industry: "Transportation & Logistics" },
    { name: "Tenaga Nasional", tier: 2, country: "MY", market: "ASEAN", industry: "Energy", aliases: ["TNB"] },
    // Thailand
    { name: "PTT", tier: 2, country: "TH", market: "ASEAN", industry: "Energy", aliases: ["PTT Public Company"] },
    { name: "SCB", tier: 2, country: "TH", market: "ASEAN", industry: "Financial Services", aliases: ["Siam Commercial Bank"] },
    { name: "Bangkok Bank", tier: 2, country: "TH", market: "ASEAN", industry: "Financial Services" },
    // Indonesia
    { name: "Bank Central Asia", tier: 2, country: "ID", market: "ASEAN", industry: "Financial Services", aliases: ["BCA"] },
    { name: "Bank Mandiri", tier: 2, country: "ID", market: "ASEAN", industry: "Financial Services" },
    { name: "Telkom Indonesia", tier: 2, country: "ID", market: "ASEAN", industry: "Telecommunications", aliases: ["Telkom"] },
    { name: "Gojek", tier: 2, country: "ID", market: "ASEAN", industry: "Technology" },
    // Philippines
    { name: "BDO", tier: 2, country: "PH", market: "ASEAN", industry: "Financial Services", aliases: ["BDO Unibank"] },
    { name: "PLDT", tier: 2, country: "PH", market: "ASEAN", industry: "Telecommunications" },
    { name: "Globe Telecom", tier: 3, country: "PH", market: "ASEAN", industry: "Telecommunications" },
    
    // ─── GCG MARKET ───────────────────────────────────
    // Hong Kong
    { name: "HSBC", tier: 1, country: "HK", market: "GCG", industry: "Financial Services" },
    { name: "Hang Seng Bank", tier: 2, country: "HK", market: "GCG", industry: "Financial Services" },
    { name: "Cathay Pacific", tier: 2, country: "HK", market: "GCG", industry: "Transportation & Logistics" },
    { name: "CLP", tier: 2, country: "HK", market: "GCG", industry: "Energy", aliases: ["CLP Holdings"] },
    // Taiwan
    { name: "TSMC", tier: 1, country: "TW", market: "GCG", industry: "Technology", aliases: ["Taiwan Semiconductor"] },
    { name: "Foxconn", tier: 2, country: "TW", market: "GCG", industry: "Manufacturing", aliases: ["Hon Hai"] },
    { name: "ASUS", tier: 2, country: "TW", market: "GCG", industry: "Technology" },
    { name: "Acer", tier: 3, country: "TW", market: "GCG", industry: "Technology" },
    // China (competitive intel)
    { name: "Alibaba", tier: 3, country: "CN", market: "GCG", industry: "Technology" },
    { name: "Tencent", tier: 3, country: "CN", market: "GCG", industry: "Technology" },
    { name: "Huawei", tier: 2, country: "CN", market: "GCG", industry: "Technology" },
    { name: "ByteDance", tier: 3, country: "CN", market: "GCG", industry: "Technology" },
    { name: "Baidu", tier: 3, country: "CN", market: "GCG", industry: "Technology" },
    
    // ─── ISA MARKET ───────────────────────────────────
    // India
    { name: "Reliance", tier: 1, country: "IN", market: "ISA", industry: "Energy", aliases: ["Reliance Industries"] },
    { name: "Tata Group", tier: 1, country: "IN", market: "ISA", industry: "Manufacturing", aliases: ["Tata", "Tata Sons"] },
    { name: "HDFC Bank", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", aliases: ["HDFC"] },
    { name: "ICICI Bank", tier: 1, country: "IN", market: "ISA", industry: "Financial Services", aliases: ["ICICI"] },
    { name: "Infosys", tier: 2, country: "IN", market: "ISA", industry: "Technology" },
    { name: "TCS", tier: 2, country: "IN", market: "ISA", industry: "Technology", aliases: ["Tata Consultancy Services"] },
    { name: "Wipro", tier: 2, country: "IN", market: "ISA", industry: "Technology" },
    { name: "SBI", tier: 2, country: "IN", market: "ISA", industry: "Financial Services", aliases: ["State Bank of India"] },
    { name: "Bharti Airtel", tier: 2, country: "IN", market: "ISA", industry: "Telecommunications", aliases: ["Airtel"] },
    { name: "Mahindra", tier: 2, country: "IN", market: "ISA", industry: "Manufacturing", aliases: ["Mahindra Group"] },
    // Bangladesh
    { name: "Grameenphone", tier: 3, country: "BD", market: "ISA", industry: "Telecommunications" },
    
    // ─── KOREA MARKET ─────────────────────────────────
    { name: "Samsung", tier: 1, country: "KR", market: "KOREA", industry: "Technology", aliases: ["Samsung Electronics", "Samsung Group"] },
    { name: "SK Group", tier: 1, country: "KR", market: "KOREA", industry: "Technology", aliases: ["SK", "SK Hynix"] },
    { name: "LG", tier: 2, country: "KR", market: "KOREA", industry: "Manufacturing", aliases: ["LG Electronics", "LG Group"] },
    { name: "Hyundai", tier: 2, country: "KR", market: "KOREA", industry: "Manufacturing", aliases: ["Hyundai Motor", "Hyundai Group"] },
    { name: "Kia", tier: 3, country: "KR", market: "KOREA", industry: "Manufacturing" },
    { name: "POSCO", tier: 2, country: "KR", market: "KOREA", industry: "Manufacturing" },
    { name: "KT", tier: 2, country: "KR", market: "KOREA", industry: "Telecommunications", aliases: ["Korea Telecom"] },
    { name: "Shinhan Bank", tier: 2, country: "KR", market: "KOREA", industry: "Financial Services" },
    { name: "KB Financial", tier: 2, country: "KR", market: "KOREA", industry: "Financial Services", aliases: ["Kookmin Bank"] },
    { name: "Naver", tier: 2, country: "KR", market: "KOREA", industry: "Technology" },
    { name: "Kakao", tier: 2, country: "KR", market: "KOREA", industry: "Technology" }
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
    'Talent & Skills': ['ai talent', 'tech talent', 'skills gap', 'upskilling', 'workforce transformation', 'hiring challenge']
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
    'copilot': { ibm: 'watsonx Code Assistant', angle: 'Enterprise security + on-prem deployment' },
    'github copilot': { ibm: 'watsonx Code Assistant', angle: 'Enterprise governance + IP protection' },
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
    'duet ai': { ibm: 'watsonx Code Assistant', angle: 'Enterprise security + audit trail' },
    
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
    'mulesoft': { ibm: 'IBM Integration', angle: 'Hybrid deployment + API management' },
    'workato': { ibm: 'IBM Integration', angle: 'Enterprise governance + security' },
    
    // Security
    'sentinel': { ibm: 'QRadar SIEM', angle: 'AI-powered threat intelligence' },
    'microsoft sentinel': { ibm: 'QRadar SIEM', angle: 'Hybrid SIEM + threat intelligence' },
    'crowdstrike': { ibm: 'IBM Security', angle: 'Managed detection + response' },
    'palo alto': { ibm: 'IBM Security', angle: 'Integrated security + consulting' },
    'zscaler': { ibm: 'IBM Security', angle: 'Zero trust + enterprise integration' },
    
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
// SIGNAL CLASSIFICATION RULES
// For categorizing detected signals
// ============================================
const SIGNAL_CLASSIFICATION = {
    // Wave 1: AI/Agentic transformation
    AI_WAVE: [
        'generative ai', 'genai', 'llm', 'large language model', 'ai agent', 'agentic',
        'copilot', 'ai assistant', 'chatbot', 'conversational ai', 'ai automation',
        'machine learning', 'deep learning', 'neural network', 'foundation model',
        'ai governance', 'responsible ai', 'ai ethics', 'ai safety', 'ai regulation',
        'ai strategy', 'ai adoption', 'ai transformation', 'ai investment', 'ai platform'
    ],
    // Wave 2: Sovereignty & Regulation
    SOVEREIGNTY_WAVE: [
        'data sovereignty', 'data localization', 'data residency', 'cross-border data',
        'sovereign cloud', 'government cloud', 'classified cloud', 'air-gapped',
        'regulatory compliance', 'gdpr', 'privacy regulation', 'data protection',
        'operational resilience', 'dora', 'third party risk', 'outsourcing',
        'critical infrastructure', 'national security', 'supply chain security'
    ],
    // Competitive threat level
    COMPETITIVE_THREAT: [
        'selects microsoft', 'selects azure', 'selects aws', 'selects google',
        'partnership with microsoft', 'partnership with amazon', 'partnership with google',
        'replaces ibm', 'migrates from ibm', 'moves away from ibm',
        'competitive bid', 'vendor bakeoff', 'platform evaluation'
    ],
    // IBM opportunity
    IBM_OPPORTUNITY: [
        'hybrid cloud', 'multicloud', 'cloud repatriation', 'on-premise',
        'mainframe modernization', 'core transformation', 'mission critical',
        'regulated industry', 'compliance requirements', 'data governance',
        'ai governance', 'responsible ai', 'open source', 'red hat',
        'automation', 'integration', 'security', 'observability'
    ]
};

// ============================================
// DEEP READS SOURCE CLASSIFICATION
// Sources that provide strategic, long-form content
// Used by renderDeepReads() for source selection
// ============================================
const DEEP_READS_SOURCES = {
    // Primary strategic sources (always include)
    PRIMARY: [
        'McKinsey', 'BCG', 'Bain', 'HBR', 'MIT Sloan', 'Wharton',
        'a]16z', 'Andreessen Horowitz', 'Sequoia', 'Benedict Evans',
        'Stratechery', 'Not Boring', 'Platformer'
    ],
    // Research & Analysis (high quality, include when relevant)
    RESEARCH: [
        'Gartner', 'Forrester', 'IDC', 'MIT Tech Review', 'The Information',
        'Protocol', 'Rest of World', 'Economist', 'FT', 'WSJ'
    ],
    // IBM & Industry (include for IBM-relevant topics)
    IBM_ADJACENT: [
        'IBM Newsroom', 'IBM Research', 'Red Hat Blog', 'Think Blog',
        'IBM Institute', 'The Register', 'Computer Weekly'
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

/**
 * Classify which wave (AI or Sovereignty) an article belongs to
 * @param {string} text - Article title or content to search
 * @returns {string|null} - 'AI_WAVE', 'SOVEREIGNTY_WAVE', or null
 */
function classifyWave(text) {
    const lowerText = text.toLowerCase();
    const aiScore = SIGNAL_CLASSIFICATION.AI_WAVE.filter(kw => lowerText.includes(kw)).length;
    const sovScore = SIGNAL_CLASSIFICATION.SOVEREIGNTY_WAVE.filter(kw => lowerText.includes(kw)).length;
    
    if (aiScore > sovScore && aiScore > 0) return 'AI_WAVE';
    if (sovScore > aiScore && sovScore > 0) return 'SOVEREIGNTY_WAVE';
    if (aiScore > 0) return 'AI_WAVE'; // Tie-breaker: AI wave
    return null;
}

// Made with Bob
