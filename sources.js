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
        url: "https://openai.com/news/rss.xml",
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
        name: "ComputerWeekly IT Security",
        url: "https://www.computerweekly.com/rss/IT-security.xml",
        category: "Sovereignty & Regulation",
        priority: 1,
        credibilityScore: 0.85,
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
        name: "iTnews Australia",
        url: "https://www.itnews.com.au/rss/",
        category: "APAC Enterprise",
        priority: 2,
        credibilityScore: 0.85,
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
        name: "Trivium China",
        url: "https://triviumchina.com/feed/",
        category: "China & Geopolitics",
        priority: 2,
        credibilityScore: 0.90,
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
        name: "Omdia",
        url: "https://omdia.tech.informa.com/rss",
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
        name: "ZDNet Enterprise",
        url: "https://www.zdnet.com/topic/enterprise-software/rss.xml",
        category: "Competitive Landscape",
        priority: 2,
        credibilityScore: 0.80,
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
        url: "https://research.ibm.com/rss",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.90,
        digestType: "both",
        enabled: true
    },
    {
        name: "Red Hat Blog",
        url: "https://www.redhat.com/en/rss/blog",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.85,
        digestType: "both",
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
        name: "SiliconANGLE",
        url: "https://siliconangle.com/feed/",
        category: "IBM & Partners",
        priority: 1,
        credibilityScore: 0.82,
        digestType: "both",
        enabled: true
    },
    {
        name: "OpenShift Blog",
        url: "https://www.redhat.com/en/rss/blog/channel/red-hat-openshift",
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
// CLIENT WATCHLIST - Field CTO Edition
// Tier 1 = Strategic (Top 50 accounts, +40% boost, daily monitoring)
// Tier 2 = Growth (Next 100 accounts, +25% boost, weekly monitoring)
// Tier 3 = Prospect (Remaining 193 accounts, +15% boost, background monitoring)
// Market = ANZ, ASEAN, GCG, ISA, KOREA (for geographic segmentation)
//
// PHASE 5 ADVANCED FIELDS (optional):
// - atlName: Name of assigned ATL (e.g., "John Smith")
// - atlEmail: ATL email for notifications
// - nextMeeting: ISO date string for upcoming meeting (e.g., "2026-03-15")
// - activeDeal: Boolean flag for active deal pursuit
// - dealValue: Estimated deal value in USD (e.g., 5000000)
// - notes: Free-text notes for context
// ============================================
const DEFAULT_CLIENTS = [
    // ========== ASEAN Market (31 ATLs, 89 accounts) ==========
    // Singapore — Tier 1 Strategic
    {
        name: "DBS",
        tier: 1,
        market: "ASEAN",
        country: "SG",
        industry: "Financial Services",
        keywords: ["DBS", "Development Bank of Singapore"],
        enabled: true,
        // Phase 5 fields (example - add to other clients as needed):
        atlName: "Sarah Chen",
        atlEmail: "sarah.chen@ibm.com",
        nextMeeting: "2026-03-15",
        activeDeal: true,
        dealValue: 8500000,
        notes: "Q2 hybrid cloud modernization RFP"
    },
    { name: "OCBC", tier: 1, market: "ASEAN", country: "SG", industry: "Financial Services", keywords: ["OCBC", "Oversea-Chinese Banking"], enabled: true },
    { name: "UOB", tier: 1, market: "ASEAN", country: "SG", industry: "Financial Services", keywords: ["UOB", "United Overseas Bank"], enabled: true },
    { name: "Singtel", tier: 1, market: "ASEAN", country: "SG", industry: "Telecommunications", keywords: ["Singtel", "Singapore Telecommunications"], enabled: true },
    { name: "ST Engineering", tier: 1, market: "ASEAN", country: "SG", industry: "Manufacturing", keywords: ["ST Engineering", "ST Eng"], enabled: true },
    // Singapore — Tier 2 Growth
    { name: "PSA", tier: 2, market: "ASEAN", country: "SG", industry: "Transportation & Logistics", keywords: ["PSA", "Port of Singapore"], enabled: true },
    { name: "CapitaLand", tier: 2, market: "ASEAN", country: "SG", industry: "Real Estate", keywords: ["CapitaLand"], enabled: true },
    { name: "Singapore Airlines", tier: 2, market: "ASEAN", country: "SG", industry: "Transportation & Logistics", keywords: ["Singapore Airlines", "SIA"], enabled: true },
    { name: "Grab", tier: 2, market: "ASEAN", country: "SG", industry: "Technology", keywords: ["Grab"], enabled: true },
    { name: "Sea Limited", tier: 2, market: "ASEAN", country: "SG", industry: "Technology", keywords: ["Sea Limited", "Shopee", "Garena"], enabled: true },
    // Malaysia — Tier 1 Strategic
    { name: "CIMB", tier: 1, market: "ASEAN", country: "MY", industry: "Financial Services", keywords: ["CIMB"], enabled: true },
    { name: "Maybank", tier: 1, market: "ASEAN", country: "MY", industry: "Financial Services", keywords: ["Maybank", "Malayan Banking"], enabled: true },
    { name: "Petronas", tier: 1, market: "ASEAN", country: "MY", industry: "Energy", keywords: ["Petronas"], enabled: true },
    // Malaysia — Tier 2 Growth
    { name: "AirAsia", tier: 2, market: "ASEAN", country: "MY", industry: "Transportation & Logistics", keywords: ["AirAsia"], enabled: true },
    // Indonesia — Tier 2 Growth
    { name: "Gojek", tier: 2, market: "ASEAN", country: "ID", industry: "Technology", keywords: ["Gojek"], enabled: true },
    // Thailand — Tier 2 Growth
    { name: "PTT", tier: 2, market: "ASEAN", country: "TH", industry: "Energy", keywords: ["PTT"], enabled: true },
    
    // ========== ANZ Market (23 ATLs, 68 accounts) ==========
    // Australia — Tier 1 Strategic
    { name: "Commonwealth Bank", tier: 1, market: "ANZ", country: "AU", industry: "Financial Services", keywords: ["Commonwealth Bank", "CBA", "CommBank"], enabled: true },
    { name: "ANZ", tier: 1, market: "ANZ", country: "AU", industry: "Financial Services", keywords: ["ANZ", "Australia and New Zealand Banking"], enabled: true },
    { name: "Westpac", tier: 1, market: "ANZ", country: "AU", industry: "Financial Services", keywords: ["Westpac"], enabled: true },
    { name: "NAB", tier: 1, market: "ANZ", country: "AU", industry: "Financial Services", keywords: ["NAB", "National Australia Bank"], enabled: true },
    { name: "Telstra", tier: 1, market: "ANZ", country: "AU", industry: "Telecommunications", keywords: ["Telstra"], enabled: true },
    // Australia — Tier 2 Growth
    { name: "BHP", tier: 2, market: "ANZ", country: "AU", industry: "Manufacturing", keywords: ["BHP", "BHP Billiton"], enabled: true },
    { name: "Rio Tinto", tier: 2, market: "ANZ", country: "AU", industry: "Manufacturing", keywords: ["Rio Tinto"], enabled: true },
    { name: "Woolworths", tier: 2, market: "ANZ", country: "AU", industry: "Retail", keywords: ["Woolworths"], enabled: true },
    { name: "Qantas", tier: 2, market: "ANZ", country: "AU", industry: "Transportation & Logistics", keywords: ["Qantas"], enabled: true },
    // Australia — Tier 3 Prospect
    { name: "AGL", tier: 3, market: "ANZ", country: "AU", industry: "Energy", keywords: ["AGL", "AGL Energy"], enabled: true },
    
    // ========== KOREA Market (14 ATLs, 45 accounts) ==========
    // Korea — Tier 1 Strategic
    { name: "Samsung", tier: 1, market: "KOREA", country: "KR", industry: "Technology", keywords: ["Samsung"], enabled: true },
    { name: "SK", tier: 1, market: "KOREA", country: "KR", industry: "Technology", keywords: ["SK Group", "SK Telecom", "SK Hynix"], enabled: true },
    // Korea — Tier 2 Growth
    { name: "LG", tier: 2, market: "KOREA", country: "KR", industry: "Manufacturing", keywords: ["LG", "LG Electronics"], enabled: true },
    { name: "Hyundai", tier: 2, market: "KOREA", country: "KR", industry: "Manufacturing", keywords: ["Hyundai"], enabled: true },
    { name: "POSCO", tier: 2, market: "KOREA", country: "KR", industry: "Manufacturing", keywords: ["POSCO"], enabled: true },
    { name: "KT", tier: 2, market: "KOREA", country: "KR", industry: "Telecommunications", keywords: ["KT", "KT Corporation"], enabled: true },
    // Korea — Tier 3 Prospect
    { name: "Kia", tier: 3, market: "KOREA", country: "KR", industry: "Manufacturing", keywords: ["Kia"], enabled: true },
    
    // ========== ISA Market (28 ATLs, 87 accounts) ==========
    // India — Tier 1 Strategic
    { name: "Reliance", tier: 1, market: "ISA", country: "IN", industry: "Energy", keywords: ["Reliance", "Reliance Industries", "Jio"], enabled: true },
    { name: "Tata", tier: 1, market: "ISA", country: "IN", industry: "Manufacturing", keywords: ["Tata", "Tata Group", "TCS"], enabled: true },
    { name: "HDFC", tier: 1, market: "ISA", country: "IN", industry: "Financial Services", keywords: ["HDFC", "HDFC Bank"], enabled: true },
    { name: "ICICI", tier: 1, market: "ISA", country: "IN", industry: "Financial Services", keywords: ["ICICI", "ICICI Bank"], enabled: true },
    // India — Tier 2 Growth
    { name: "TCS", tier: 2, market: "ISA", country: "IN", industry: "Technology", keywords: ["TCS", "Tata Consultancy"], enabled: true },
    
    // ========== GCG Market (19 ATLs, 54 accounts) ==========
    // China — Tier 2 Growth (competitive intelligence)
    { name: "Huawei", tier: 2, market: "GCG", country: "CN", industry: "Technology", keywords: ["Huawei"], enabled: true },
    // China — Tier 3 Prospect (competitive signals)
    { name: "Alibaba", tier: 3, market: "GCG", country: "CN", industry: "Technology", keywords: ["Alibaba", "Alipay"], enabled: true },
    { name: "Tencent", tier: 3, market: "GCG", country: "CN", industry: "Technology", keywords: ["Tencent", "WeChat"], enabled: true },
    { name: "ByteDance", tier: 3, market: "GCG", country: "CN", industry: "Technology", keywords: ["ByteDance", "TikTok"], enabled: true },
    
    // ========== Japan (Not primary market, but monitor) ==========
    { name: "NTT", tier: 2, market: "ASEAN", country: "JP", industry: "Telecommunications", keywords: ["NTT"], enabled: true },
    { name: "SoftBank", tier: 2, market: "ASEAN", country: "JP", industry: "Telecommunications", keywords: ["SoftBank"], enabled: true },
    { name: "Toyota", tier: 2, market: "ASEAN", country: "JP", industry: "Manufacturing", keywords: ["Toyota"], enabled: true },
    { name: "Sony", tier: 3, market: "ASEAN", country: "JP", industry: "Technology", keywords: ["Sony"], enabled: true }
];

// Market definitions for Field CTO's 5 APAC regions
const MARKETS = {
    ANZ: {
        name: "Australia & New Zealand",
        countries: ["AU", "NZ"],
        atls: 23,
        accounts: 68,
        priority: "high"
    },
    ASEAN: {
        name: "Southeast Asia",
        countries: ["SG", "MY", "TH", "ID", "PH", "VN", "JP"],
        atls: 31,
        accounts: 89,
        priority: "high"
    },
    GCG: {
        name: "Greater China",
        countries: ["CN", "HK", "TW"],
        atls: 19,
        accounts: 54,
        priority: "medium"
    },
    ISA: {
        name: "India & South Asia",
        countries: ["IN", "BD", "LK", "PK"],
        atls: 28,
        accounts: 87,
        priority: "high"
    },
    KOREA: {
        name: "South Korea",
        countries: ["KR"],
        atls: 14,
        accounts: 45,
        priority: "medium"
    }
};

// Geographic keyword dictionary for market detection
const GEOGRAPHIC_KEYWORDS = {
    ANZ: {
        countries: ["australia", "australian", "new zealand", "nz", "kiwi"],
        cities: ["sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "auckland", "wellington", "christchurch"],
        regions: ["nsw", "victoria", "queensland", "western australia", "south australia", "tasmania", "act", "northern territory"],
        organizations: ["asx", "rba", "reserve bank of australia", "apra", "asic", "accc", "nzx", "rbnz"]
    },
    ASEAN: {
        countries: ["singapore", "singaporean", "malaysia", "malaysian", "thailand", "thai", "indonesia", "indonesian", 
                   "philippines", "filipino", "vietnam", "vietnamese", "japan", "japanese"],
        cities: ["singapore", "kuala lumpur", "bangkok", "jakarta", "manila", "hanoi", "ho chi minh", "tokyo", "osaka"],
        regions: ["southeast asia", "south east asia", "asean", "sea region"],
        organizations: ["mas", "monetary authority of singapore", "bank negara", "bank of thailand", "bank indonesia", 
                       "bangko sentral", "state bank of vietnam", "boj", "bank of japan", "meti", "imda"]
    },
    GCG: {
        countries: ["china", "chinese", "hong kong", "hk", "taiwan", "taiwanese"],
        cities: ["beijing", "shanghai", "shenzhen", "guangzhou", "chengdu", "hangzhou", "hong kong", "taipei", "taichung"],
        regions: ["greater china", "mainland china", "prc", "people's republic"],
        organizations: ["pboc", "people's bank of china", "csrc", "cbirc", "hkma", "hong kong monetary authority", 
                       "fsc taiwan", "financial supervisory commission"]
    },
    ISA: {
        countries: ["india", "indian", "bangladesh", "bangladeshi", "sri lanka", "sri lankan", "pakistan", "pakistani"],
        cities: ["mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "chennai", "pune", "kolkata", "dhaka", "colombo", "karachi"],
        regions: ["south asia", "indian subcontinent"],
        organizations: ["rbi", "reserve bank of india", "sebi", "irdai", "meity", "bangladesh bank", "central bank of sri lanka", "state bank of pakistan"]
    },
    KOREA: {
        countries: ["korea", "korean", "south korea", "republic of korea", "rok"],
        cities: ["seoul", "busan", "incheon", "daegu", "daejeon", "gwangju"],
        regions: ["korean peninsula"],
        organizations: ["bok", "bank of korea", "fsc", "financial services commission", "fss", "kftc", "msit"]
    }
};

// Client tier definitions
const CLIENT_TIERS = {
    1: { name: "Strategic", boost: 0.40, color: "#FF6B6B", description: "Top 50 accounts - daily monitoring" },
    2: { name: "Growth", boost: 0.25, color: "#4ECDC4", description: "Next 100 accounts - weekly monitoring" },
    3: { name: "Prospect", boost: 0.15, color: "#95E1D3", description: "Remaining 193 accounts - background monitoring" }
};

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
