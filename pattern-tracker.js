// =============================================
// Pattern Tracker - Weekly Intelligence
// ENHANCEMENT 2: Detect signal velocity and trends
// =============================================

/**
 * PatternTracker
 * 
 * Tracks daily signal summaries over 14 days to detect:
 * - Competitor mention velocity
 * - Market signal density
 * - Theme emergence
 * - Client signal clustering
 * - Wave momentum (AI vs Sovereignty)
 * - Pillar alignment shifts
 */
class PatternTracker {
    constructor() {
        this.storageKey = 'signal_pattern_history';
        this.windowDays = 14; // Track 2 weeks of history
        this.history = this.loadHistory();
    }

    /**
     * Load pattern history from localStorage
     */
    loadHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const history = JSON.parse(stored);
                // Validate and clean old entries
                return this.pruneOldEntries(history);
            }
        } catch (e) {
            console.warn('Failed to load pattern history:', e);
        }
        return [];
    }

    /**
     * Save pattern history to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.history));
        } catch (e) {
            console.error('Failed to save pattern history:', e);
        }
    }

    /**
     * Remove entries older than windowDays
     */
    pruneOldEntries(history) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.windowDays);
        const cutoffStr = cutoffDate.toISOString().slice(0, 10);
        
        return history.filter(entry => entry.date >= cutoffStr);
    }

    /**
     * Add daily summary to history
     * @param {Array} articles - Today's analyzed articles
     * @param {Array} clients - Client list
     */
    addDailySummary(articles, clients) {
        const today = new Date().toISOString().slice(0, 10);
        
        // Remove existing entry for today (if re-running)
        this.history = this.history.filter(entry => entry.date !== today);
        
        const summary = this.generateDailySummary(articles, clients, today);
        this.history.push(summary);
        
        // Prune old entries
        this.history = this.pruneOldEntries(this.history);
        
        this.save();
        return summary;
    }

    /**
     * Generate daily summary from articles
     */
    generateDailySummary(articles, clients, date) {
        const summary = {
            date: date,
            signalCount: 0,
            competitors: {},
            markets: {},
            themes: {},
            clients: {},
            waveBalance: { AI: 0, SOVEREIGNTY: 0, BOTH: 0 },
            pillarDistribution: { Foundation: 0, 'Pillar 1': 0, 'Pillar 2': 0, 'Pillar 3': 0 }
        };

        // Process each article with intelligence
        articles.forEach(article => {
            if (!article.intelligence || !article.intelligence.isRelevant) return;
            
            summary.signalCount++;
            
            // Track competitors
            const competitors = article.intelligence.entities?.competitors || [];
            competitors.forEach(comp => {
                if (!summary.competitors[comp]) {
                    summary.competitors[comp] = { count: 0, markets: new Set(), sentiment: 'neutral' };
                }
                summary.competitors[comp].count++;
                
                // Add markets
                const markets = article.intelligence.affectedMarkets || [];
                markets.forEach(m => summary.competitors[comp].markets.add(m));
            });
            
            // Track markets
            const markets = article.intelligence.affectedMarkets || [];
            markets.forEach(market => {
                if (!summary.markets[market]) {
                    summary.markets[market] = { count: 0, topThemes: {}, wave: null };
                }
                summary.markets[market].count++;
                
                // Track wave for this market
                if (article.intelligence.waveClassification) {
                    const wave = article.intelligence.waveClassification.replace(/[\[\]]/g, '').trim();
                    if (!summary.markets[market].wave) {
                        summary.markets[market].wave = wave;
                    }
                }
            });
            
            // Track themes (from reasoning and actionable insights)
            const text = `${article.intelligence.reasoning || ''} ${(article.intelligence.actionableInsights || []).join(' ')}`.toLowerCase();
            const themeKeywords = {
                'AI agents': ['agent', 'agentic', 'ai agent', 'autonomous'],
                'data sovereignty': ['sovereignty', 'data localization', 'data residency'],
                'multi-cloud': ['multi-cloud', 'multicloud', 'hybrid cloud'],
                'digital transformation': ['digital transformation', 'digitalization', 'modernization'],
                'cybersecurity': ['security', 'cyber', 'breach', 'threat'],
                'regulation': ['regulation', 'compliance', 'regulatory'],
                'AI governance': ['ai governance', 'responsible ai', 'ai ethics']
            };
            
            Object.entries(themeKeywords).forEach(([theme, keywords]) => {
                if (keywords.some(kw => text.includes(kw))) {
                    if (!summary.themes[theme]) {
                        summary.themes[theme] = { count: 0, trend: 'stable' };
                    }
                    summary.themes[theme].count++;
                }
            });
            
            // Track clients
            const affectedClients = article.intelligence.affectedClients || [];
            affectedClients.forEach(clientName => {
                if (!summary.clients[clientName]) {
                    summary.clients[clientName] = { count: 0, signals: [] };
                }
                summary.clients[clientName].count++;
                summary.clients[clientName].signals.push({
                    title: article.title,
                    date: article.date || date
                });
            });
            
            // Track wave balance
            if (article.intelligence.waveClassification) {
                const wave = article.intelligence.waveClassification.replace(/[\[\]]/g, '').trim();
                if (wave === 'AI WAVE') summary.waveBalance.AI++;
                else if (wave === 'SOVEREIGNTY WAVE') summary.waveBalance.SOVEREIGNTY++;
                else if (wave === 'BOTH') summary.waveBalance.BOTH++;
            }
            
            // Track pillar distribution
            if (article.intelligence.pillarMapping) {
                const pillar = article.intelligence.pillarMapping;
                if (summary.pillarDistribution[pillar] !== undefined) {
                    summary.pillarDistribution[pillar]++;
                }
            }
        });

        // Convert Sets to Arrays for JSON serialization
        Object.keys(summary.competitors).forEach(comp => {
            summary.competitors[comp].markets = Array.from(summary.competitors[comp].markets);
        });

        // Calculate percentages for wave balance
        const totalWave = summary.waveBalance.AI + summary.waveBalance.SOVEREIGNTY + summary.waveBalance.BOTH;
        if (totalWave > 0) {
            summary.waveBalance = {
                AI: Math.round((summary.waveBalance.AI / totalWave) * 100),
                SOVEREIGNTY: Math.round((summary.waveBalance.SOVEREIGNTY / totalWave) * 100),
                BOTH: Math.round((summary.waveBalance.BOTH / totalWave) * 100)
            };
        }

        // Calculate percentages for pillar distribution
        const totalPillar = Object.values(summary.pillarDistribution).reduce((a, b) => a + b, 0);
        if (totalPillar > 0) {
            Object.keys(summary.pillarDistribution).forEach(pillar => {
                summary.pillarDistribution[pillar] = Math.round((summary.pillarDistribution[pillar] / totalPillar) * 100);
            });
        }

        return summary;
    }

    /**
     * Get last N days of history
     */
    getLastNDays(days = 14) {
        return this.history.slice(-days);
    }

    /**
     * Detect patterns in the history
     */
    detectPatterns() {
        if (this.history.length < 2) {
            return null; // Need at least 2 days of data
        }

        const last7Days = this.history.slice(-7);
        const previous7Days = this.history.slice(-14, -7);
        
        const patterns = {
            competitorSurge: this.detectCompetitorSurge(last7Days, previous7Days),
            marketHeat: this.detectMarketHeat(last7Days),
            themeEmergence: this.detectThemeEmergence(last7Days, previous7Days),
            clientClustering: this.detectClientClustering(last7Days),
            waveShift: this.detectWaveShift(last7Days, previous7Days),
            pillarDrift: this.detectPillarDrift(last7Days, previous7Days)
        };

        return patterns;
    }

    /**
     * Detect competitor mention velocity changes
     */
    detectCompetitorSurge(last7Days, previous7Days) {
        const lastWeekCounts = this.aggregateCompetitors(last7Days);
        const prevWeekCounts = this.aggregateCompetitors(previous7Days);
        
        const surges = [];
        
        Object.keys(lastWeekCounts).forEach(competitor => {
            const lastCount = lastWeekCounts[competitor];
            const prevCount = prevWeekCounts[competitor] || 0;
            
            if (prevCount === 0 && lastCount > 0) {
                surges.push({
                    competitor,
                    change: 'NEW',
                    lastWeek: lastCount,
                    prevWeek: 0,
                    percentChange: null
                });
            } else if (prevCount > 0) {
                const percentChange = ((lastCount - prevCount) / prevCount) * 100;
                if (percentChange > 50) { // >50% increase threshold
                    surges.push({
                        competitor,
                        change: 'SURGE',
                        lastWeek: lastCount,
                        prevWeek: prevCount,
                        percentChange: Math.round(percentChange)
                    });
                }
            }
        });
        
        return surges.sort((a, b) => (b.percentChange || 999) - (a.percentChange || 999));
    }

    /**
     * Detect market heat (high signal density)
     */
    detectMarketHeat(last7Days) {
        const last48Hours = this.history.slice(-2); // Assuming daily summaries
        const hotMarkets = [];
        
        const marketCounts = {};
        last48Hours.forEach(day => {
            Object.entries(day.markets).forEach(([market, data]) => {
                marketCounts[market] = (marketCounts[market] || 0) + data.count;
            });
        });
        
        Object.entries(marketCounts).forEach(([market, count]) => {
            if (count >= 3) { // >3 signals in 48h threshold
                hotMarkets.push({ market, count, period: '48h' });
            }
        });
        
        return hotMarkets.sort((a, b) => b.count - a.count);
    }

    /**
     * Detect emerging themes
     */
    detectThemeEmergence(last7Days, previous7Days) {
        const lastWeekThemes = this.aggregateThemes(last7Days);
        const prevWeekThemes = this.aggregateThemes(previous7Days);
        
        const emerging = [];
        
        Object.keys(lastWeekThemes).forEach(theme => {
            const lastCount = lastWeekThemes[theme];
            const prevCount = prevWeekThemes[theme] || 0;
            
            if (prevCount === 0 && lastCount >= 3) { // New theme with 3+ mentions
                emerging.push({
                    theme,
                    status: 'NEW',
                    count: lastCount,
                    weekOverWeek: 'NEW'
                });
            } else if (prevCount > 0) {
                const percentChange = ((lastCount - prevCount) / prevCount) * 100;
                if (percentChange > 40) { // >40% increase
                    emerging.push({
                        theme,
                        status: 'RISING',
                        count: lastCount,
                        weekOverWeek: `+${Math.round(percentChange)}%`
                    });
                }
            }
        });
        
        return emerging.sort((a, b) => b.count - a.count);
    }

    /**
     * Detect client signal clustering
     */
    detectClientClustering(last7Days) {
        const clientCounts = {};
        
        last7Days.forEach(day => {
            Object.entries(day.clients).forEach(([client, data]) => {
                if (!clientCounts[client]) {
                    clientCounts[client] = { count: 0, signals: [] };
                }
                clientCounts[client].count += data.count;
                clientCounts[client].signals.push(...data.signals);
            });
        });
        
        const clusters = [];
        Object.entries(clientCounts).forEach(([client, data]) => {
            if (data.count >= 2) { // 2+ signals in 7 days
                clusters.push({
                    client,
                    count: data.count,
                    period: '7 days',
                    signals: data.signals.slice(0, 3) // Top 3 signals
                });
            }
        });
        
        return clusters.sort((a, b) => b.count - a.count);
    }

    /**
     * Detect wave momentum shifts
     */
    detectWaveShift(last7Days, previous7Days) {
        const lastWave = this.aggregateWave(last7Days);
        const prevWave = this.aggregateWave(previous7Days);
        
        const aiShift = lastWave.AI - prevWave.AI;
        const sovShift = lastWave.SOVEREIGNTY - prevWave.SOVEREIGNTY;
        
        let direction = 'Stable';
        let magnitude = 0;
        
        if (Math.abs(aiShift) > 20 || Math.abs(sovShift) > 20) {
            if (aiShift > 20) {
                direction = 'AI gaining';
                magnitude = aiShift;
            } else if (sovShift > 20) {
                direction = 'Sovereignty gaining';
                magnitude = sovShift;
            }
        }
        
        return {
            direction,
            magnitude: magnitude > 0 ? `+${magnitude}%` : `${magnitude}%`,
            current: lastWave,
            previous: prevWave
        };
    }

    /**
     * Detect pillar distribution changes
     */
    detectPillarDrift(last7Days, previous7Days) {
        const lastPillar = this.aggregatePillar(last7Days);
        const prevPillar = this.aggregatePillar(previous7Days);
        
        const drifts = [];
        
        Object.keys(lastPillar).forEach(pillar => {
            const change = lastPillar[pillar] - prevPillar[pillar];
            if (Math.abs(change) > 15 || lastPillar[pillar] > 40) { // >15% change or >40% concentration
                drifts.push({
                    pillar,
                    current: lastPillar[pillar],
                    previous: prevPillar[pillar],
                    change: change > 0 ? `+${change}%` : `${change}%`,
                    alert: lastPillar[pillar] > 40 ? 'HIGH_CONCENTRATION' : 'SHIFT'
                });
            }
        });
        
        return drifts;
    }

    // Helper aggregation methods
    aggregateCompetitors(days) {
        const counts = {};
        days.forEach(day => {
            Object.entries(day.competitors).forEach(([comp, data]) => {
                counts[comp] = (counts[comp] || 0) + data.count;
            });
        });
        return counts;
    }

    aggregateThemes(days) {
        const counts = {};
        days.forEach(day => {
            Object.entries(day.themes).forEach(([theme, data]) => {
                counts[theme] = (counts[theme] || 0) + data.count;
            });
        });
        return counts;
    }

    aggregateWave(days) {
        let ai = 0, sov = 0, both = 0, total = 0;
        days.forEach(day => {
            ai += day.waveBalance.AI || 0;
            sov += day.waveBalance.SOVEREIGNTY || 0;
            both += day.waveBalance.BOTH || 0;
            total++;
        });
        return {
            AI: Math.round(ai / total),
            SOVEREIGNTY: Math.round(sov / total),
            BOTH: Math.round(both / total)
        };
    }

    aggregatePillar(days) {
        const totals = { Foundation: 0, 'Pillar 1': 0, 'Pillar 2': 0, 'Pillar 3': 0 };
        let count = 0;
        days.forEach(day => {
            Object.entries(day.pillarDistribution).forEach(([pillar, pct]) => {
                totals[pillar] += pct;
            });
            count++;
        });
        Object.keys(totals).forEach(pillar => {
            totals[pillar] = Math.round(totals[pillar] / count);
        });
        return totals;
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            totalDays: this.history.length,
            oldestDate: this.history.length > 0 ? this.history[0].date : null,
            newestDate: this.history.length > 0 ? this.history[this.history.length - 1].date : null,
            totalSignals: this.history.reduce((sum, day) => sum + day.signalCount, 0)
        };
    }
}

// Made with Bob
