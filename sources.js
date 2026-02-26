// =============================================
// The Signal Today - Default Sources Configuration
// =============================================

const DEFAULT_SOURCES = [
    // ============================================
    // 🤖 AI & AGENTIC (6 sources)
    // ============================================
    {
        name: "Import AI",
        url: "https://importai.substack.com/feed",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "daily",
        enabled: true
    },
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
        name: "The Batch",
        url: "https://www.deeplearning.ai/the-batch/feed/",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Anthropic",
        url: "https://www.anthropic.com/news/rss",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "daily",
        enabled: true
    },
    {
        name: "OpenAI Blog",
        url: "https://openai.com/blog/rss.xml",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Google AI Blog",
        url: "https://blog.google/technology/ai/rss/",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // 🛡️ SOVEREIGNTY & REGULATION (7 sources)
    // ============================================
    {
        name: "IAPP Privacy",
        url: "https://iapp.org/feed/",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Lawfare",
        url: "https://www.lawfaremedia.org/feed",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "The Record",
        url: "https://therecord.media/feed",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Euractiv Digital",
        url: "https://www.euractiv.com/sections/digital/feed/",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "BIS",
        url: "https://www.bis.org/doclist/all_rss.rss",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "NIST Cybersecurity",
        url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "CSO Online",
        url: "https://www.csoonline.com/feed/",
        category: "Sovereignty & Regulation",
        priority: 3,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // 🌏 APAC ENTERPRISE (9 sources)
    // ============================================
    {
        name: "Computer Weekly APAC",
        url: "https://www.computerweekly.com/rss/Asia-Pacific-IT.xml",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "iTNews Asia",
        url: "https://www.itnews.asia/rss/feed.xml",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "GovInsider",
        url: "https://govinsider.asia/feed/",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Rest of World",
        url: "https://restofworld.org/feed/latest/",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "Tech Wire Asia",
        url: "https://techwireasia.com/feed/",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Channel Asia",
        url: "https://www.channelasia.tech/rss/feed.xml",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Economic Times Tech",
        url: "https://tech.economictimes.indiatimes.com/rss/latest",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "ZDNet Australia",
        url: "https://www.zdnet.com/topic/australia/rss.xml",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Tech in Asia",
        url: "https://www.techinasia.com/feed",
        category: "APAC Enterprise",
        priority: 3,
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // 🇨🇳 CHINA & TECH GEOPOLITICS (4 sources)
    // ============================================
    {
        name: "SCMP Tech",
        url: "https://www.scmp.com/rss/5/feed",
        category: "China & Geopolitics",
        priority: 1,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "ChinaTalk",
        url: "https://chinatalk.substack.com/feed",
        category: "China & Geopolitics",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "DigiChina",
        url: "https://digichina.stanford.edu/feed/",
        category: "China & Geopolitics",
        priority: 2,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Semafor",
        url: "https://www.semafor.com/feed",
        category: "China & Geopolitics",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // ⚔️ COMPETITIVE LANDSCAPE (9 sources)
    // ============================================
    {
        name: "CIO Dive",
        url: "https://www.ciodive.com/feeds/news/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Cloud Wars",
        url: "https://cloudwars.com/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "The Register",
        url: "https://www.theregister.com/headlines.atom",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Microsoft Azure Blog",
        url: "https://azure.microsoft.com/en-us/blog/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "AWS News Blog",
        url: "https://aws.amazon.com/blogs/aws/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Google Cloud Blog",
        url: "https://cloud.google.com/blog/feed",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Accenture Newsroom",
        url: "https://newsroom.accenture.com/rss/news.xml",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Deloitte Insights",
        url: "https://www2.deloitte.com/us/en/insights/rss-feeds/deloitte-insights.rss",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "BCG Publications",
        url: "https://www.bcg.com/publications.rss",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 🏗️ ARCHITECTURE & PLATFORM (7 sources)
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
        name: "Red Hat Blog",
        url: "https://www.redhat.com/en/blog/rss.xml",
        category: "Architecture & Platform",
        priority: 1,
        credibilityScore: 0.90,
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
        priority: 2,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Platform Engineering",
        url: "https://platformengineering.org/blog/rss.xml",
        category: "Architecture & Platform",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "both",
        enabled: true
    },
    {
        name: "DataStax Blog",
        url: "https://www.datastax.com/blog/rss.xml",
        category: "Architecture & Platform",
        priority: 3,
        credibilityScore: 0.80,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 💭 STRATEGIC PERSPECTIVES (10 sources)
    // ============================================
    {
        name: "Stratechery",
        url: "https://stratechery.com/feed/",
        category: "Strategic Perspectives",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "Ben Evans",
        url: "https://www.ben-evans.com/benedictevans?format=rss",
        category: "Strategic Perspectives",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Gartner",
        url: "https://www.gartner.com/en/newsroom/rss",
        category: "Strategic Perspectives",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "IDC",
        url: "https://www.idc.com/rss/press-releases.xml",
        category: "Strategic Perspectives",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "Forrester",
        url: "https://www.forrester.com/blogs/feed/",
        category: "Strategic Perspectives",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "a16z",
        url: "https://a16z.com/feed/",
        category: "Strategic Perspectives",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "McKinsey Digital",
        url: "https://www.mckinsey.com/rss/insights.xml",
        category: "Strategic Perspectives",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "HBR Technology",
        url: "https://hbr.org/topic/technology/feed",
        category: "Strategic Perspectives",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "MIT Sloan Review",
        url: "https://sloanreview.mit.edu/feed/",
        category: "Strategic Perspectives",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Wired Business",
        url: "https://www.wired.com/feed/category/business/latest/rss",
        category: "Strategic Perspectives",
        priority: 3,
        credibilityScore: 0.80,
        digestType: "weekly",
        enabled: true
    }
];

// Default Industry Priorities
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

// Default Clients
const DEFAULT_CLIENTS = [
    "DBS", "OCBC", "UOB", "Singtel", "Telstra", 
    "Commonwealth Bank", "ANZ", "Westpac", "NAB",
    "NTT", "Samsung", "Grab", "Sea Limited"
];

// Industry Keywords for matching
const INDUSTRY_KEYWORDS = {
    "Financial Services": ["bank", "banking", "financial", "fintech", "insurance", "payments", "lending", "credit", "wealth", "trading", "investment", "mortgage"],
    "Government": ["government", "public sector", "federal", "state", "ministry", "agency", "defense", "military", "citizen", "e-government", "smart city"],
    "Telecommunications": ["telecom", "telecommunications", "telco", "5g", "network", "mobile", "wireless", "broadband", "fiber", "carrier", "spectrum"],
    "Manufacturing": ["manufacturing", "factory", "production", "supply chain", "logistics", "automotive", "aerospace", "industrial", "automation", "robotics"],
    "Energy": ["energy", "oil", "gas", "renewable", "solar", "wind", "utility", "power", "grid", "electricity", "nuclear", "mining", "sustainability"],
    "Retail": ["retail", "ecommerce", "e-commerce", "consumer", "shopping", "store", "omnichannel", "inventory", "merchandise", "cpg", "fmcg"],
    "Healthcare": ["healthcare", "health", "hospital", "medical", "pharma", "pharmaceutical", "clinical", "patient", "diagnosis", "biotech", "life sciences"],
    "Technology": ["technology", "software", "saas", "platform", "startup", "venture", "digital", "innovation", "tech company"]
};

// Category configuration
const CATEGORIES = {
    "AI & Agentic": { emoji: "🤖", color: "#7c3aed" },
    "Sovereignty & Regulation": { emoji: "🛡️", color: "#dc2626" },
    "APAC Enterprise": { emoji: "🌏", color: "#059669" },
    "China & Geopolitics": { emoji: "🇨🇳", color: "#d97706" },
    "Competitive Landscape": { emoji: "⚔️", color: "#2563eb" },
    "Architecture & Platform": { emoji: "🏗️", color: "#4f46e5" },
    "Strategic Perspectives": { emoji: "💭", color: "#6b7280" }
};
