// =============================================
// The Signal Today - Optimized Sources Configuration
// Version 3.0 - Field CTO Intelligence Upgrade
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
    // 🛡️ SOVEREIGNTY & REGULATION (19 sources)
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
    // NEW: APAC Regulators
    {
        name: "HKMA",
        url: "https://www.hkma.gov.hk/eng/rss/press-releases.xml",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "IMDA Singapore",
        url: "https://www.imda.gov.sg/resources/press-releases-factsheets-and-speeches/rss",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "SEBI India",
        url: "https://www.sebi.gov.in/rss/pressreleases.xml",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.95,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "OJK Indonesia",
        url: "https://www.ojk.go.id/en/rss/siaran-pers.xml",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "BSP Philippines",
        url: "https://www.bsp.gov.ph/SitePages/RSS/PressReleases.aspx",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "MeitY India",
        url: "https://www.meity.gov.in/rss.xml",
        category: "Sovereignty & Regulation",
        priority: 2,
        credibilityScore: 0.90,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "ASD Cyber Australia",
        url: "https://www.cyber.gov.au/about-us/news/rss",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
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
    // NEW: ASEAN coverage — Indonesia, Vietnam, Malaysia, Thailand, Philippines
    {
        name: "Katadata Indonesia",
        url: "https://katadata.co.id/rss",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "DailySocial Indonesia",
        url: "https://dailysocial.id/feed",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "daily",
        enabled: true
    },
    {
        name: "VnExpress Tech",
        url: "https://vnexpress.net/rss/khoa-hoc-cong-nghe.rss",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Vietnam Investment Review Tech",
        url: "https://vir.com.vn/rss/technology.rss",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Digital News Asia",
        url: "https://www.digitalnewsasia.com/rss.xml",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "The Edge Malaysia",
        url: "https://theedgemalaysia.com/rss/technology",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Bangkok Post Tech",
        url: "https://www.bangkokpost.com/rss/data/tech.xml",
        category: "APAC Enterprise",
        priority: 1,
        credibilityScore: 0.80,
        digestType: "daily",
        enabled: true
    },
    {
        name: "BusinessWorld Philippines",
        url: "https://www.bworldonline.com/feed/",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "daily",
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
    // ⚔️ COMPETITIVE LANDSCAPE (24 sources)
    // Analyst commentary sources moved here from Strategic Perspectives —
    // they provide competitive intelligence, not just strategic reading.
    // Vendor blogs (Azure/AWS/GCP) retained for signal detection but
    // credibility-scored low (0.60) to reflect marketing bias.
    // ============================================
    // --- Analyst Commentary (highest value competitive intel) ---
    {
        name: "Gartner Blog",
        url: "https://blogs.gartner.com/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "Forrester Blog",
        url: "https://www.forrester.com/blogs/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "IDC Insights",
        url: "https://www.idc.com/rss/press-releases.xml",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.95,
        digestType: "both",
        enabled: true
    },
    {
        name: "451 Research",
        url: "https://451research.com/feed",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    // --- Trade press (independent competitive coverage) ---
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
    // --- Competitor vendor blogs (marketing content — low credibility score) ---
    {
        name: "Microsoft Azure Blog",
        url: "https://azure.microsoft.com/en-us/blog/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.60,
        digestType: "daily",
        enabled: true
    },
    {
        name: "AWS News Blog",
        url: "https://aws.amazon.com/blogs/aws/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.60,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Google Cloud Blog",
        url: "https://cloud.google.com/blog/feed",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.60,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Salesforce Blog",
        url: "https://www.salesforce.com/blog/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.60,
        digestType: "daily",
        enabled: true
    },
    {
        name: "ServiceNow Blog",
        url: "https://www.servicenow.com/blogs.xml",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.60,
        digestType: "daily",
        enabled: true
    },
    {
        name: "SAP News",
        url: "https://news.sap.com/feed/",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.60,
        digestType: "daily",
        enabled: true
    },
    {
        name: "Oracle Blog",
        url: "https://blogs.oracle.com/feed",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.60,
        digestType: "daily",
        enabled: true
    },
    // --- Consulting competitors ---
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
    // --- APAC Competitors ---
    {
        name: "Alibaba Cloud Blog",
        url: "https://www.alibabacloud.com/blog/feed",
        category: "Competitive Landscape",
        priority: 1,
        credibilityScore: 0.60,
        digestType: "daily",
        enabled: true
    },
    {
        name: "NTT Data Insights",
        url: "https://www.nttdata.com/global/en/insights/rss",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Fujitsu Blog",
        url: "https://blog.global.fujitsu.com/feed/",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.75,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Infosys Insights",
        url: "https://www.infosys.com/insights/rss-feeds/insights.xml",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.70,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "Wipro Insights",
        url: "https://www.wipro.com/rss/insights.xml",
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
    // 💭 STRATEGIC PERSPECTIVES (7 sources)
    // Note: Gartner, IDC, Forrester moved to Competitive Landscape —
    // they provide competitive intelligence, not just strategic reading.
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
    },

    // ============================================
    // 🔵 IBM & PARTNERS (5 sources) — NEW
    // ============================================
    {
        name: "IBM Research Blog",
        url: "https://research.ibm.com/blog/rss",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "IBM Institute for Business Value",
        url: "https://www.ibm.com/thought-leadership/institute-business-value/rss",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "weekly",
        enabled: true
    },
    {
        name: "IBM Security Intelligence",
        url: "https://securityintelligence.com/feed/",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "both",
        enabled: true
    },
    {
        name: "IBM watsonx Blog",
        url: "https://www.ibm.com/blog/category/watsonx/feed/",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "both",
        enabled: true
    },
    {
        name: "OpenShift Blog",
        url: "https://www.openshift.com/blog/feed",
        category: "IBM & Partners",
        priority: 2,
        credibilityScore: 0.85,
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
// EXPANDED CLIENT WATCHLIST — WITH TIERS
// Tier 1 = Strategic (daily monitoring, always shown)
// Tier 2 = Growth (weekly monitoring)
// Tier 3 = Prospect / Background
// ============================================
const DEFAULT_CLIENTS = [
    // Singapore — Tier 1
    { name: "DBS", tier: 1, country: "SG" },
    { name: "OCBC", tier: 1, country: "SG" },
    { name: "UOB", tier: 1, country: "SG" },
    { name: "Singtel", tier: 1, country: "SG" },
    { name: "ST Engineering", tier: 1, country: "SG" },
    { name: "PSA", tier: 2, country: "SG" },
    { name: "CapitaLand", tier: 2, country: "SG" },
    { name: "Singapore Airlines", tier: 2, country: "SG" },
    { name: "SIA", tier: 2, country: "SG" },
    // Australia — Tier 1
    { name: "Commonwealth Bank", tier: 1, country: "AU" },
    { name: "CBA", tier: 1, country: "AU" },
    { name: "ANZ", tier: 1, country: "AU" },
    { name: "Westpac", tier: 1, country: "AU" },
    { name: "NAB", tier: 1, country: "AU" },
    { name: "Telstra", tier: 1, country: "AU" },
    { name: "BHP", tier: 2, country: "AU" },
    { name: "Rio Tinto", tier: 2, country: "AU" },
    { name: "Woolworths", tier: 2, country: "AU" },
    { name: "Qantas", tier: 2, country: "AU" },
    { name: "AGL", tier: 3, country: "AU" },
    // Korea — Tier 1/2
    { name: "Samsung", tier: 1, country: "KR" },
    { name: "SK", tier: 1, country: "KR" },
    { name: "LG", tier: 2, country: "KR" },
    { name: "Hyundai", tier: 2, country: "KR" },
    { name: "Kia", tier: 3, country: "KR" },
    { name: "POSCO", tier: 2, country: "KR" },
    { name: "KT", tier: 2, country: "KR" },
    // India — Tier 1/2
    { name: "Reliance", tier: 1, country: "IN" },
    { name: "Tata", tier: 1, country: "IN" },
    { name: "HDFC", tier: 1, country: "IN" },
    { name: "ICICI", tier: 1, country: "IN" },
    { name: "TCS", tier: 2, country: "IN" },
    // ASEAN — Tier 1/2
    { name: "CIMB", tier: 1, country: "MY" },
    { name: "Maybank", tier: 1, country: "MY" },
    { name: "Grab", tier: 2, country: "SG" },
    { name: "Sea Limited", tier: 2, country: "SG" },
    { name: "Gojek", tier: 2, country: "ID" },
    { name: "AirAsia", tier: 2, country: "MY" },
    { name: "Petronas", tier: 1, country: "MY" },
    { name: "PTT", tier: 2, country: "TH" },
    // Japan — Tier 2
    { name: "NTT", tier: 2, country: "JP" },
    { name: "SoftBank", tier: 2, country: "JP" },
    { name: "Toyota", tier: 2, country: "JP" },
    { name: "Sony", tier: 3, country: "JP" },
    // China / Competitors — Tier 3 (monitor as competitive signals)
    { name: "Alibaba", tier: 3, country: "CN" },
    { name: "Tencent", tier: 3, country: "CN" },
    { name: "Huawei", tier: 2, country: "CN" },
    { name: "ByteDance", tier: 3, country: "CN" }
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
    'APAC Expansion': ['apac expansion', 'asia pacific', 'singapore hub', 'regional headquarters', 'apac growth', 'asia strategy'],
    // NEW: IBM-specific competitive intelligence themes
    'IBM vs Azure': ['azure openai', 'microsoft ai', 'copilot enterprise', 'azure arc', 'microsoft fabric', 'azure ai foundry'],
    'IBM vs AWS': ['aws bedrock', 'amazon q', 'aws sagemaker', 'amazon connect', 'aws generative ai'],
    'IBM vs Google Cloud': ['vertex ai', 'google workspace ai', 'gemini enterprise', 'google cloud ai'],
    'watsonx & IBM AI': ['watsonx', 'watson', 'ibm ai', 'ibm cloud', 'ibm consulting', 'ibm z', 'ibm power'],
    'APAC Regulatory Compliance': ['mas notice', 'apra prudential', 'pdpc advisory', 'hkma circular', 'sebi circular', 'ojk regulation', 'bsp circular', 'imda guideline', 'meity notification'],
    'C-Suite Changes': ['new cto', 'new cio', 'appoints', 'names chief', 'chief technology officer', 'chief information officer', 'chief digital officer', 'cdo appointed', 'cto appointed', 'cio appointed'],
    'Digital Transformation Deals': ['digital transformation', 'cloud migration', 'modernization program', 'rfp', 'tender', 'procurement', 'technology investment', 'it budget', 'digital initiative']
};

// ============================================
// DEAL RELEVANCE SIGNALS — NEW
// Used for deal-relevance scoring layer in app.js
// ============================================
const DEAL_RELEVANCE_SIGNALS = {
    // Competitor keywords — co-occurrence with a client = competitive threat
    COMPETITOR_KEYWORDS: [
        'microsoft', 'azure', 'aws', 'amazon web services', 'google cloud', 'gcp',
        'accenture', 'deloitte', 'mckinsey', 'pwc', 'kpmg', 'ey consulting',
        'alibaba cloud', 'aliyun', 'tencent cloud', 'ntt data', 'fujitsu', 
        'infosys', 'wipro', 'cognizant', 'capgemini', 'dxc technology',
        'servicenow', 'salesforce', 'sap', 'oracle cloud'
    ],
    // C-suite change keywords — signals new decision-maker, potential re-evaluation
    CSUITE_KEYWORDS: [
        'new cto', 'new cio', 'new cdo', 'appoints', 'names chief', 
        'chief technology officer', 'chief information officer', 'chief digital officer',
        'chief data officer', 'cdo appointed', 'cto appointed', 'cio appointed',
        'technology leadership', 'digital leadership', 'it leadership change',
        'executive appointment', 'joins as', 'promoted to'
    ],
    // Regulatory keywords — compliance pressure = IBM opportunity
    REGULATORY_KEYWORDS: [
        'mas notice', 'apra prudential', 'pdpc advisory', 'hkma circular',
        'sebi circular', 'ojk regulation', 'bsp circular', 'imda guideline',
        'meity notification', 'compliance deadline', 'regulatory requirement',
        'mandatory', 'non-compliance', 'regulatory fine', 'enforcement action',
        'data protection law', 'ai regulation', 'cloud regulation'
    ],
    // IBM product/solution keywords — direct IBM relevance
    IBM_KEYWORDS: [
        'watsonx', 'watson', 'ibm cloud', 'red hat', 'openshift', 'ansible',
        'ibm consulting', 'ibm security', 'qradar', 'ibm z', 'ibm power',
        'ibm storage', 'ibm quantum', 'ibm research', 'ibm institute',
        'hybrid cloud ibm', 'ibm ai', 'ibm automation'
    ],
    // Opportunity keywords — signals active buying intent
    OPPORTUNITY_KEYWORDS: [
        'digital transformation', 'ai strategy', 'cloud migration', 'modernization',
        'rfp', 'request for proposal', 'tender', 'procurement', 'technology investment',
        'it budget', 'digital initiative', 'technology roadmap', 'vendor selection',
        'proof of concept', 'pilot program', 'strategic partnership', 'technology refresh'
    ]
};

// Made with Bob
