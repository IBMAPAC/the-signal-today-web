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
        'microsoft', 'azure', 'aws', 'amazon web services', 'google cloud', 'gcp',
        'accenture', 'deloitte', 'mckinsey', 'pwc', 'kpmg', 'ey consulting',
        'alibaba cloud', 'aliyun', 'tencent cloud', 'ntt data', 'fujitsu', 
        'infosys', 'wipro', 'cognizant', 'capgemini', 'dxc technology',
        'servicenow', 'salesforce', 'sap', 'oracle cloud', 'snowflake', 'databricks',
        'palantir', 'datadog', 'splunk', 'elastic', 'hashicorp', 'vmware'
    ],
    // C-suite change keywords — signals new decision-maker, potential re-evaluation
    CSUITE_KEYWORDS: [
        'new cto', 'new cio', 'new cdo', 'appoints', 'names chief', 
        'chief technology officer', 'chief information officer', 'chief digital officer',
        'chief data officer', 'cdo appointed', 'cto appointed', 'cio appointed',
        'technology leadership', 'digital leadership', 'it leadership change',
        'executive appointment', 'joins as', 'promoted to', 'group cto',
        'chief ai officer', 'caio', 'head of technology', 'head of digital',
        'vp engineering', 'vp technology', 'svp technology', 'evp technology'
    ],
    // Regulatory keywords — compliance pressure = IBM opportunity (APAC-specific)
    REGULATORY_KEYWORDS: [
        // ASEAN
        'mas notice', 'mas guidelines', 'pdpc advisory', 'imda guideline', 'bsp circular',
        'ojk regulation', 'bi regulation', 'bank indonesia', 'sec thailand', 'bot thailand',
        'bnm malaysia', 'bank negara', 'pdpa thailand', 'pdpa singapore',
        // ANZ
        'apra prudential', 'asic guidance', 'oaic', 'privacy act australia', 'cdr rules',
        'rbnz', 'fma new zealand', 'privacy commissioner nz',
        // GCG
        'hkma circular', 'sfc hong kong', 'pipl china', 'cac china', 'mlr china',
        'fsc taiwan', 'ndpc taiwan', 'pdpo hong kong',
        // ISA
        'sebi circular', 'rbi master direction', 'meity notification', 'dpdp act',
        'cert-in directive', 'irdai', 'npci guidelines',
        // KOREA
        'fsc korea', 'kisa', 'pipa korea', 'kdca',
        // General
        'compliance deadline', 'regulatory requirement', 'mandatory', 'non-compliance', 
        'regulatory fine', 'enforcement action', 'data protection law', 'ai regulation', 
        'cloud regulation', 'operational resilience', 'third party risk', 'outsourcing guidelines'
    ],
    // IBM product/solution keywords — direct IBM relevance
    IBM_KEYWORDS: [
        'watsonx', 'watsonx.ai', 'watsonx.data', 'watsonx.governance', 'watson',
        'ibm cloud', 'red hat', 'openshift', 'ansible', 'rhel',
        'ibm consulting', 'ibm security', 'qradar', 'guardium', 'verify', 'maas360',
        'ibm z', 'ibm power', 'linuxone', 'ibm storage', 'ibm spectrum',
        'ibm quantum', 'ibm research', 'ibm institute', 'ibm garage',
        'hybrid cloud ibm', 'ibm ai', 'ibm automation', 'turbonomic', 'instana',
        'apptio', 'concert', 'cp4d', 'cloud pak', 'sterling', 'aspera'
    ],
    // Opportunity keywords — signals active buying intent
    OPPORTUNITY_KEYWORDS: [
        'digital transformation', 'ai strategy', 'cloud migration', 'modernization',
        'rfp', 'request for proposal', 'tender', 'procurement', 'technology investment',
        'it budget', 'digital initiative', 'technology roadmap', 'vendor selection',
        'proof of concept', 'pilot program', 'strategic partnership', 'technology refresh',
        'multi-year contract', 'enterprise agreement', 'platform consolidation',
        'legacy modernization', 'mainframe modernization', 'core banking transformation',
        'data platform', 'ai platform', 'automation platform', 'integration platform'
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
// ============================================
const COMPETITIVE_POSITIONING = {
    // AI & ML
    'azure openai': { ibm: 'watsonx.ai', angle: 'Enterprise AI governance + data privacy' },
    'copilot': { ibm: 'watsonx Code Assistant', angle: 'Enterprise security + on-prem deployment' },
    'bedrock': { ibm: 'watsonx.ai', angle: 'Hybrid deployment + model flexibility' },
    'sagemaker': { ibm: 'watsonx.ai + Cloud Pak for Data', angle: 'Governed AI lifecycle' },
    'vertex ai': { ibm: 'watsonx.ai', angle: 'Open models + enterprise integration' },
    'databricks': { ibm: 'watsonx.data', angle: 'Cost optimization + governance' },
    'snowflake': { ibm: 'watsonx.data', angle: 'Hybrid deployment + AI integration' },
    
    // Cloud & Infrastructure
    'azure arc': { ibm: 'Red Hat OpenShift', angle: 'True hybrid + multi-cloud portability' },
    'aws outposts': { ibm: 'IBM Cloud Satellite', angle: 'Edge + sovereign deployment' },
    'anthos': { ibm: 'Red Hat OpenShift', angle: 'Enterprise support + ecosystem' },
    'vmware': { ibm: 'Red Hat OpenShift Virtualization', angle: 'Modernization path + Kubernetes' },
    
    // Automation & Integration
    'power automate': { ibm: 'IBM Automation', angle: 'Enterprise scale + AI integration' },
    'servicenow': { ibm: 'IBM Automation', angle: 'Deep integration + process mining' },
    'mulesoft': { ibm: 'IBM Integration', angle: 'Hybrid deployment + API management' },
    
    // Security
    'sentinel': { ibm: 'QRadar SIEM', angle: 'AI-powered threat intelligence' },
    'splunk': { ibm: 'QRadar + Instana', angle: 'Unified security + observability' },
    'crowdstrike': { ibm: 'IBM Security', angle: 'Managed detection + response' },
    
    // Consulting
    'accenture': { ibm: 'IBM Consulting', angle: 'Technology depth + IBM stack expertise' },
    'deloitte': { ibm: 'IBM Consulting', angle: 'Technology-led transformation' },
    'infosys': { ibm: 'IBM Consulting', angle: 'Strategic advisory + co-creation' }
};

// ============================================
// APAC MARKET CONTEXT
// Market-specific keywords and priorities
// ============================================
const APAC_MARKET_CONTEXT = {
    ANZ: {
        regulators: ['apra', 'asic', 'oaic', 'accc', 'rba', 'rbnz', 'fma', 'comcom'],
        priorities: ['open banking', 'cdr', 'operational resilience', 'climate risk', 'scams prevention'],
        watchwords: ['big four banks', 'superannuation', 'nbn', 'asx', 'nzx']
    },
    ASEAN: {
        regulators: ['mas', 'pdpc', 'imda', 'bnm', 'sc malaysia', 'ojk', 'bi', 'bsp', 'sec philippines', 'bot', 'sec thailand'],
        priorities: ['digital banking license', 'e-payment', 'financial inclusion', 'data localization', 'cross-border payments'],
        watchwords: ['asean', 'regional integration', 'digital economy', 'smart nation', 'industry 4.0']
    },
    GCG: {
        regulators: ['hkma', 'sfc', 'pcpd', 'fsc taiwan', 'cac', 'pboc', 'csrc'],
        priorities: ['greater bay area', 'wealth connect', 'fintech sandbox', 'virtual bank', 'data cross-border'],
        watchwords: ['gba', 'cross-boundary', 'renminbi', 'digital yuan', 'hkex']
    },
    ISA: {
        regulators: ['rbi', 'sebi', 'irdai', 'cert-in', 'meity', 'npci', 'cbsl', 'sbp'],
        priorities: ['upi', 'account aggregator', 'digital rupee', 'dpdp act', 'data localization'],
        watchwords: ['digital india', 'make in india', 'fintech hub', 'startup india', 'gift city']
    },
    KOREA: {
        regulators: ['fsc', 'fss', 'kisa', 'pipc', 'bok', 'kdic'],
        priorities: ['mydata', 'open banking', 'digital asset', 'cbdc', 'ai ethics'],
        watchwords: ['k-finance', 'new deal', 'digital new deal', 'chaebol', 'kospi', 'kosdaq']
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

// Made with Bob
