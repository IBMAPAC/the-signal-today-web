// =============================================
// The Signal Today - Optimized Sources Configuration
// Version 2.0 - Comprehensive APAC Field CTO Coverage
// =============================================

const DEFAULT_SOURCES = [
    // ============================================
    // 🤖 AI & AGENTIC (9 sources)
    // ============================================
    {
        name: "Import AI",
        url: "https://importai.substack.com/feed",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
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
        priority: 2,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Anthropic",
        url: "https://www.anthropic.com/news/rss",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "OpenAI Blog",
        url: "https://openai.com/blog/rss.xml",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "Google AI Blog",
        url: "https://blog.google/technology/ai/rss/",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Nvidia AI Blog",
        url: "https://blogs.nvidia.com/feed/",
        category: "AI & Agentic",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "both",
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
        name: "AI Snake Oil",
        url: "https://www.aisnakeoil.com/feed",
        category: "AI & Agentic",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 🛡️ SOVEREIGNTY & REGULATION (12 sources)
    // ============================================
    {
        name: "IAPP Privacy",
        url: "https://iapp.org/feed/",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
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
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Euractiv Digital",
        url: "https://www.euractiv.com/sections/digital/feed/",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "BIS",
        url: "https://www.bis.org/doclist/all_rss.rss",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "NIST Cybersecurity",
        url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "MAS Media Releases",
        url: "https://www.mas.gov.sg/rss/news-and-publications.xml",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "PDPC Singapore",
        url: "https://www.pdpc.gov.sg/rss/news",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "RBI India",
        url: "https://rbi.org.in/pressreleases_rss.aspx",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "APRA",
        url: "https://www.apra.gov.au/rss.xml",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "CSO Online",
        url: "https://www.csoonline.com/feed/",
        category: "Sovereignty & Regulation",
        priority: 3,
        credibilityScore: 0.75,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Dark Reading",
        url: "https://www.darkreading.com/rss.xml",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // 🌏 APAC ENTERPRISE (14 sources)
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
        digestType: "both",
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
        credibilityScore: 0.75,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Channel Asia",
        url: "https://www.channelasia.tech/rss/feed.xml",
        category: "APAC Enterprise",
        priority: 3,
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Economic Times Tech",
        url: "https://tech.economictimes.indiatimes.com/rss/latest",
        category: "APAC Enterprise",
        priority: 1,
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
        name: "Korea Herald Tech",
        url: "https://www.koreaherald.com/rss/tech.xml",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "The Ken",
        url: "https://the-ken.com/feed/",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "e27",
        url: "https://e27.co/feed/",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "daily",
        enabled: true
    },
    {
        name: "DealStreetAsia",
        url: "https://www.dealstreetasia.com/feed/",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "both",
        enabled: true
    },
    {
        name: "Tech in Asia",
        url: "https://www.techinasia.com/feed",
        category: "APAC Enterprise",
        priority: 3,
        credibilityScore: 0.75,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Nikkei Asia Tech",
        url: "https://asia.nikkei.com/rss/feed/Technology",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },

    // ============================================
    // 🇨🇳 CHINA & TECH GEOPOLITICS (6 sources)
    // ============================================
    {
        name: "SCMP Tech",
        url: "https://www.scmp.com/rss/5/feed",
        category: "China & Geopolitics",
        priority: 1,
        credibilityScore: 0.75,
        digestType: "daily",
        enabled: true
    },
    {
        name: "ChinaTalk",
        url: "https://chinatalk.substack.com/feed",
        category: "China & Geopolitics",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "DigiChina",
        url: "https://digichina.stanford.edu/feed/",
        category: "China & Geopolitics",
        priority: 1,
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
    {
        name: "Protocol China",
        url: "https://www.protocol.com/china/rss.xml",
        category: "China & Geopolitics",
        priority: 2,
        credibilityScore: 0.85,
        digestType: "both",
        enabled: true
    },
    {
        name: "Asia Times",
        url: "https://asiatimes.com/feed/",
        category: "China & Geopolitics",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "daily",
        enabled: true
    },

    // ============================================
    // ⚔️ COMPETITIVE LANDSCAPE (14 sources)
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
        credibilityScore: 0.80,
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
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },
    {
        name: "AWS News Blog",
        url: "https://aws.amazon.com/blogs/aws/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Google Cloud Blog",
        url: "https://cloud.google.com/blog/feed",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Salesforce Blog",
        url: "https://www.salesforce.com/blog/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },
    {
        name: "ServiceNow Blog",
        url: "https://www.servicenow.com/blogs.xml",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },
    {
        name: "SAP News",
        url: "https://news.sap.com/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Oracle Blog",
        url: "https://blogs.oracle.com/feed",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.70,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Accenture Newsroom",
        url: "https://newsroom.accenture.com/rss/news.xml",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Deloitte Insights",
        url: "https://www2.deloitte.com/us/en/insights/rss-feeds/deloitte-insights.rss",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "weekly",
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
    {
        name: "TCS Perspectives",
        url: "https://www.tcs.com/rss/insights",
        category: "Competitive Landscape",
        priority: 3,
        credibilityScore: 0.70,
        digestType: "weekly",
        enabled: true
    },

    // ============================================
    // 🏗️ ARCHITECTURE & PLATFORM (9 sources)
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
        name: "Databricks Blog",
        url: "https://www.databricks.com/blog/feed",
        category: "Architecture & Platform",
        priority: 1,
        credibilityScore: 0.80,
        digestType: "both",
        enabled: true
    },
    {
        name: "Snowflake Blog",
        url: "https://www.snowflake.com/blog/feed/",
        category: "Architecture & Platform",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Thoughtworks Insights",
        url: "https://www.thoughtworks.com/insights/rss",
        category: "Architecture & Platform",
        priority: 2,
        credibilityScore: 0.90,
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
        credibilityScore: 0.85,
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
// EXPANDED CLIENT WATCHLIST
// ============================================
const DEFAULT_CLIENTS = [
    // Singapore
    "DBS", "OCBC", "UOB", "Singtel", "CapitaLand", "ST Engineering", "Singapore Airlines", "SIA", "PSA",
    // Australia
    "Commonwealth Bank", "CBA", "ANZ", "Westpac", "NAB", "Telstra", "BHP", "Rio Tinto", "Woolworths", "Qantas", "AGL",
    // Korea
    "Samsung", "SK", "LG", "Hyundai", "Kia", "POSCO", "KT",
    // India
    "Reliance", "Tata", "HDFC", "ICICI", "Infosys", "Wipro", "TCS",
    // ASEAN
    "CIMB", "Maybank", "Grab", "Sea Limited", "Gojek", "AirAsia", "Petronas", "PTT",
    // Japan (regional coverage)
    "NTT", "SoftBank", "Toyota", "Sony",
    // China (competitors/partners)
    "Alibaba", "Tencent", "Huawei", "ByteDance"
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
    "Architecture & Platform": { emoji: "🏗️", color: "#4f46e5", weight: 0.95 }
};

// ============================================
// CROSS-REFERENCE THEMES FOR SIGNAL DETECTION
// ============================================
const CROSS_REFERENCE_THEMES = {
    'AI Governance': ['ai governance', 'ai regulation', 'ai act', 'ai safety', 'responsible ai', 'ai ethics', 'ai risk', 'ai audit'],
    'Cloud Competition': ['azure', 'aws', 'google cloud', 'cloud pricing', 'multi-cloud', 'hybrid cloud', 'cloud market share', 'cloud revenue'],
    'Data Sovereignty': ['data sovereignty', 'data localization', 'gdpr', 'data residency', 'cross-border data', 'data protection', 'privacy regulation'],
    'Agentic AI': ['ai agent', 'agentic', 'autonomous agent', 'multi-agent', 'agent framework', 'agent orchestration', 'tool use'],
    'Generative AI': ['generative ai', 'genai', 'llm', 'large language model', 'chatgpt', 'claude', 'gemini', 'copilot', 'foundation model'],
    'Cybersecurity': ['ransomware', 'cyber attack', 'data breach', 'zero trust', 'security vulnerability', 'threat actor', 'apt'],
    'Digital Banking': ['digital bank', 'neobank', 'open banking', 'banking api', 'fintech disruption', 'embedded finance'],
    'Enterprise AI Adoption': ['ai adoption', 'ai transformation', 'enterprise ai', 'ai strategy', 'ai implementation', 'ai roi'],
    'Hybrid Cloud': ['hybrid cloud', 'multicloud', 'cloud repatriation', 'on-premise', 'private cloud', 'sovereign cloud'],
    'AI Infrastructure': ['gpu', 'nvidia', 'tpu', 'inference', 'training cluster', 'ai chip', 'accelerator', 'cuda'],
    'Platform Engineering': ['platform engineering', 'developer experience', 'internal developer', 'golden path', 'developer productivity'],
    'API Economy': ['api economy', 'api management', 'api gateway', 'open api', 'api monetization', 'api strategy'],
    'Sustainability Tech': ['green it', 'sustainable tech', 'carbon footprint', 'esg reporting', 'climate tech', 'net zero tech'],
    'Talent & Skills': ['ai talent', 'tech talent', 'skills gap', 'upskilling', 'workforce transformation', 'hiring'],
    'M&A Activity': ['acquisition', 'merger', 'acquired', 'strategic investment', 'buyout', 'ipo', 'spac'],
    'APAC Expansion': ['apac expansion', 'asia pacific', 'singapore hub', 'regional headquarters', 'apac growth', 'asia strategy']
};
