/**
 * clients.js - Client Management Module
 * 
 * Handles all client portfolio management functionality for The Signal Today.
 * Extracted from app.js to improve modularity and maintainability.
 * 
 * Key responsibilities:
 * - Client CRUD operations (Create, Read, Update, Delete)
 * - Client Manager modal and table rendering
 * - CSV import/export functionality
 * - Bulk operations (tier assignment, deletion)
 * - Market-based filtering and search
 * - Brief ATL modal for client-specific intelligence
 * - Country options management by market
 * 
 * Dependencies: Requires app instance with access to clients array, articles, settings
 */

class ClientManager {
    constructor(app) {
        this.app = app;
    }

    // ==========================================
    // Client Manager Modal
    // ==========================================

    openClientManager() {
        document.getElementById('client-manager-modal').classList.remove('hidden');
        this.app.clientManagerMarket = 'ALL';
        this.app.selectedClients.clear();
        updateClientManagerCounts();
        renderClientTable();
    }

    closeClientManager() {
        document.getElementById('client-manager-modal').classList.add('hidden');
        this.app.selectedClients.clear();
    }

    switchClientManagerTab(market) {
        this.app.clientManagerMarket = market;
        document.querySelectorAll('.cm-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.market === market);
        });
        this.app.selectedClients.clear();
        document.getElementById('cm-select-all').checked = false;
        updateBulkActionsVisibility();
        renderClientTable();
    }

    updateClientManagerCounts() {
        const counts = { ALL: 0, ANZ: 0, ASEAN: 0, GCG: 0, ISA: 0, KOREA: 0 };
        this.app.clients.forEach(c => {
            counts.ALL++;
            if (counts[c.market] !== undefined) counts[c.market]++;
        });
        Object.keys(counts).forEach(market => {
            const el = document.getElementById(`cm-count-${market.toLowerCase()}`);
            if (el) el.textContent = counts[market];
        });
        // Update portfolio stats in header
        const statsEl = document.getElementById('portfolio-stats');
        if (statsEl) {
            const tier1 = this.app.clients.filter(c => c.tier === 1).length;
            statsEl.textContent = `${counts.ALL} clients (${tier1} Tier 1)`;
        }
    }

    renderClientTable() {
        const tbody = document.getElementById('client-table-body');
        const searchTerm = (document.getElementById('cm-search-input')?.value || '').toLowerCase();
        
        let filtered = this.app.clients.filter(c => {
            if (this.app.clientManagerMarket !== 'ALL' && c.market !== this.app.clientManagerMarket) return false;
            if (searchTerm && !c.name.toLowerCase().includes(searchTerm)) return false;
            return true;
        });
        
        // Sort by tier then name
        filtered.sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name));
        
        tbody.innerHTML = filtered.map((client, idx) => {
            const originalIdx = this.app.clients.indexOf(client);
            const lastSignal = client.lastMentioned ? formatRelativeDate(new Date(client.lastMentioned)) : '—';
            const isRecent = client.lastMentioned && (Date.now() - new Date(client.lastMentioned).getTime()) < 7 * 24 * 60 * 60 * 1000;
            return `
                <tr data-idx="${originalIdx}">
                    <td class="col-checkbox"><input type="checkbox" onchange="toggleClientSelection(${originalIdx})" ${this.app.selectedClients.has(originalIdx) ? 'checked' : ''}></td>
                    <td class="client-name-cell">${escapeHtml(client.name)}</td>
                    <td>${client.market || '—'}</td>
                    <td>${client.industry || '—'}</td>
                    <td><span class="client-tier-badge tier-${client.tier}">Tier ${client.tier}</span></td>
                    <td>${escapeHtml(client.atl || '—')}</td>
                    <td class="client-last-signal ${isRecent ? 'recent' : ''}">${lastSignal}</td>
                    <td class="col-actions">
                        <button class="client-action-btn" onclick="editClient(${originalIdx})" title="Edit">✏️</button>
                        <button class="client-action-btn" onclick="deleteClient(${originalIdx})" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterClientManager() {
        renderClientTable();
    }

    toggleClientSelection(idx) {
        if (this.app.selectedClients.has(idx)) {
            this.app.selectedClients.delete(idx);
        } else {
            this.app.selectedClients.add(idx);
        }
        updateBulkActionsVisibility();
    }

    toggleSelectAllClients() {
        const selectAll = document.getElementById('cm-select-all').checked;
        const searchTerm = (document.getElementById('cm-search-input')?.value || '').toLowerCase();
        
        this.app.clients.forEach((client, idx) => {
            if (this.app.clientManagerMarket !== 'ALL' && client.market !== this.app.clientManagerMarket) return;
            if (searchTerm && !client.name.toLowerCase().includes(searchTerm)) return;
            
            if (selectAll) {
                this.app.selectedClients.add(idx);
            } else {
                this.app.selectedClients.delete(idx);
            }
        });
        updateBulkActionsVisibility();
        renderClientTable();
    }

    updateBulkActionsVisibility() {
        const bulkEl = document.getElementById('cm-bulk-actions');
        const countEl = document.getElementById('cm-selected-count');
        if (this.app.selectedClients.size > 0) {
            bulkEl.classList.remove('hidden');
            countEl.textContent = `${this.app.selectedClients.size} selected`;
        } else {
            bulkEl.classList.add('hidden');
        }
    }

    // ==========================================
    // Bulk Operations
    // ==========================================

    bulkSetTier(tier) {
        this.app.selectedClients.forEach(idx => {
            if (this.app.clients[idx]) this.app.clients[idx].tier = tier;
        });
        this.app.saveToStorage();
        this.app.selectedClients.clear();
        document.getElementById('cm-select-all').checked = false;
        updateBulkActionsVisibility();
        renderClientTable();
        showToast(`Updated ${this.app.selectedClients.size} clients to Tier ${tier}`);
    }

    bulkDeleteClients() {
        if (!confirm(`Delete ${this.app.selectedClients.size} clients?`)) return;
        const toDelete = Array.from(this.app.selectedClients).sort((a, b) => b - a);
        toDelete.forEach(idx => this.app.clients.splice(idx, 1));
        this.app.saveToStorage();
        this.app.selectedClients.clear();
        document.getElementById('cm-select-all').checked = false;
        updateBulkActionsVisibility();
        updateClientManagerCounts();
        renderClientTable();
        showToast('Clients deleted');
    }

    // ==========================================
    // Client Form (Add/Edit)
    // ==========================================

    openAddClientForm() {
        document.getElementById('client-form-modal').classList.remove('hidden');
        document.getElementById('client-form-title').textContent = 'Add Client';
        document.getElementById('client-form-id').value = '';
        document.getElementById('client-form-name').value = '';
        document.getElementById('client-form-market').value = this.app.clientManagerMarket !== 'ALL' ? this.app.clientManagerMarket : '';
        document.getElementById('client-form-country').innerHTML = '<option value="">Select</option>';
        document.getElementById('client-form-industry').value = '';
        document.getElementById('client-form-tier').value = '2';
        document.getElementById('client-form-atl').value = '';
        document.getElementById('client-form-aliases').value = '';
        updateCountryOptions();
    }

    editClient(idx) {
        const client = this.app.clients[idx];
        if (!client) return;
        
        document.getElementById('client-form-modal').classList.remove('hidden');
        document.getElementById('client-form-title').textContent = 'Edit Client';
        document.getElementById('client-form-id').value = idx;
        document.getElementById('client-form-name').value = client.name;
        document.getElementById('client-form-market').value = client.market || '';
        updateCountryOptions();
        document.getElementById('client-form-country').value = client.country || '';
        document.getElementById('client-form-industry').value = client.industry || '';
        document.getElementById('client-form-tier').value = client.tier || 2;
        document.getElementById('client-form-atl').value = client.atl || '';
        document.getElementById('client-form-aliases').value = (client.aliases || []).join(', ');
    }

    closeClientForm() {
        document.getElementById('client-form-modal').classList.add('hidden');
    }

    updateCountryOptions() {
        const market = document.getElementById('client-form-market').value;
        const countrySelect = document.getElementById('client-form-country');
        const currentValue = countrySelect.value;
        
        const countryMap = {
            'ANZ': [['AU', 'Australia'], ['NZ', 'New Zealand']],
            'ASEAN': [['SG', 'Singapore'], ['MY', 'Malaysia'], ['TH', 'Thailand'], ['ID', 'Indonesia'], ['PH', 'Philippines'], ['VN', 'Vietnam']],
            'GCG': [['HK', 'Hong Kong'], ['TW', 'Taiwan'], ['CN', 'China']],
            'ISA': [['IN', 'India'], ['BD', 'Bangladesh'], ['LK', 'Sri Lanka'], ['PK', 'Pakistan']],
            'KOREA': [['KR', 'South Korea']]
        };
        
        const countries = countryMap[market] || [];
        countrySelect.innerHTML = '<option value="">Select</option>' + 
            countries.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
        
        if (countries.some(([code]) => code === currentValue)) {
            countrySelect.value = currentValue;
        }
    }

    saveClient() {
        const idxStr = document.getElementById('client-form-id').value;
        const name = document.getElementById('client-form-name').value.trim();
        const market = document.getElementById('client-form-market').value;
        const country = document.getElementById('client-form-country').value;
        const industry = document.getElementById('client-form-industry').value;
        const tier = parseInt(document.getElementById('client-form-tier').value) || 2;
        const atl = document.getElementById('client-form-atl').value.trim();
        const aliasesStr = document.getElementById('client-form-aliases').value;
        const aliases = aliasesStr ? aliasesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        
        if (!name || !market) {
            showToast('Name and Market are required');
            return;
        }
        
        const clientData = { name, market, country, industry, tier, atl, aliases };
        
        if (idxStr !== '') {
            // Update existing
            const idx = parseInt(idxStr);
            this.app.clients[idx] = { ...this.app.clients[idx], ...clientData };
        } else {
            // Add new
            this.app.clients.push(clientData);
        }
        
        this.app.saveToStorage();
        updateClientManagerCounts();
        renderClientTable();
        this.closeClientForm();
        showToast(idxStr ? 'Client updated' : 'Client added');
    }

    deleteClient(idx) {
        const client = this.app.clients[idx];
        if (confirm(`Delete "${client.name}"?`)) {
            this.app.clients.splice(idx, 1);
            this.app.saveToStorage();
            updateClientManagerCounts();
            renderClientTable();
            showToast('Client deleted');
        }
    }

    // ==========================================
    // CSV Import/Export
    // ==========================================

    importClientsCSV() {
        document.getElementById('csv-import-modal').classList.remove('hidden');
        document.getElementById('csv-import-data').value = '';
        document.getElementById('csv-file-input').value = '';
    }

    closeCSVImport() {
        document.getElementById('csv-import-modal').classList.add('hidden');
    }

    handleCSVFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('csv-import-data').value = e.target.result;
        };
        reader.readAsText(file);
    }

    processCSVImport() {
        const data = document.getElementById('csv-import-data').value.trim();
        if (!data) {
            showToast('No data to import');
            return;
        }
        
        const lines = data.split('\n').filter(l => l.trim());
        let imported = 0;
        
        lines.forEach(line => {
            const parts = line.split(',').map(s => s.trim());
            if (parts.length < 2) return;
            
            const [name, market, country, industry, tierStr, atl] = parts;
            if (!name || !market) return;
            
            // Check for duplicate
            if (this.app.clients.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
            
            this.app.clients.push({
                name,
                market: market.toUpperCase(),
                country: country || '',
                industry: industry || '',
                tier: parseInt(tierStr) || 2,
                atl: atl || '',
                aliases: []
            });
            imported++;
        });
        
        this.app.saveToStorage();
        updateClientManagerCounts();
        renderClientTable();
        this.closeCSVImport();
        showToast(`Imported ${imported} clients`);
    }

    exportClientsCSV() {
        const csv = this.app.clients.map(c => 
            [c.name, c.market, c.country, c.industry, c.tier, c.atl || ''].join(',')
        ).join('\n');
        
        const blob = new Blob([`Name,Market,Country,Industry,Tier,ATL\n${csv}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signal-today-clients.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    // ==========================================
    // Client Radar (Market-based view)
    // ==========================================

    switchMarket(market) {
        this.app.currentMarket = market;
        document.querySelectorAll('.market-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.market === market);
        });
        renderClientRadar();
    }

    filterClientRadar() {
        renderClientRadar();
    }

    renderClientRadar() {
        const list = document.getElementById('client-radar-list');
        const emptyEl = document.getElementById('client-radar-empty');
        
        const showTier1 = document.getElementById('filter-tier-1')?.checked ?? true;
        const showTier2 = document.getElementById('filter-tier-2')?.checked ?? true;
        const showTier3 = document.getElementById('filter-tier-3')?.checked ?? false;
        
        // Get articles with client matches
        const clientArticles = {};
        const allArticles = [...this.app.dailyArticles, ...this.app.articles.filter(a => {
            const articleDate = a.date || a.publishedDate;
            if (!articleDate) return true;
            const age = Date.now() - new Date(articleDate).getTime();
            return age < 48 * 60 * 60 * 1000; // 48 hours
        })];
        
        allArticles.forEach(article => {
            if (!article.matchedClients || article.matchedClients.length === 0) return;
            article.matchedClients.forEach(clientName => {
                const client = this.app.clients.find(c => 
                    c.name.toLowerCase() === clientName.toLowerCase() ||
                    (c.aliases || []).some(a => a.toLowerCase() === clientName.toLowerCase())
                );
                if (!client) return;
                if (!clientArticles[client.name]) {
                    clientArticles[client.name] = { client, articles: [] };
                }
                if (!clientArticles[client.name].articles.some(a => a.id === article.id)) {
                    clientArticles[client.name].articles.push(article);
                }
            });
        });
        
        // Filter by market and tier
        let entries = Object.values(clientArticles).filter(({ client }) => {
            if (this.app.currentMarket !== 'ALL' && client.market !== this.app.currentMarket) return false;
            if (client.tier === 1 && !showTier1) return false;
            if (client.tier === 2 && !showTier2) return false;
            if (client.tier === 3 && !showTier3) return false;
            return true;
        });
        
        // Sort by tier then article count
        entries.sort((a, b) => (a.client.tier - b.client.tier) || (b.articles.length - a.articles.length));
        
        // Update count badge
        const countEl = document.getElementById('client-signals-count');
        if (countEl) countEl.textContent = entries.length;
        
        if (entries.length === 0) {
            list.innerHTML = '';
            emptyEl?.classList.remove('hidden');
            return;
        }
        
        emptyEl?.classList.add('hidden');
        
        list.innerHTML = entries.map(({ client, articles }) => `
            <div class="client-radar-item">
                <div class="client-radar-header">
                    <span class="client-radar-name">${escapeHtml(client.name)}</span>
                    <div class="client-radar-meta">
                        <span class="client-radar-tier tier-${client.tier}">Tier ${client.tier}</span>
                        <span class="client-radar-industry">${client.industry || ''}</span>
                    </div>
                </div>
                <div class="client-radar-articles">
                    ${articles.slice(0, 3).map(a => `
                        <div class="client-radar-article">
                            <a class="client-radar-article-link" href="${a.url || '#'}" target="_blank">${escapeHtml(a.title)}</a>
                            <span class="client-radar-article-source">(${escapeHtml(a.source || a.sourceName || 'Source')})</span>
                        </div>
                    `).join('')}
                </div>
                <div class="client-radar-actions">
                    <button class="btn btn-sm btn-brief-atl" onclick="openBriefATL('${escapeHtml(client.name)}')">
                        📤 Brief ATL
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ==========================================
    // Brief ATL Modal
    // ==========================================

    async openBriefATL(clientName) {
        const modal = document.getElementById('brief-atl-modal');
        const titleEl = document.getElementById('brief-atl-title');
        const contentEl = document.getElementById('brief-atl-content');
        
        const client = this.app.clients.find(c => c.name === clientName);
        if (!client) return;
        
        titleEl.textContent = `Brief ATL: ${clientName}`;
        modal.classList.remove('hidden');
        
        // Get articles for this client
        const allArticles = [...this.app.dailyArticles, ...this.app.articles];
        const clientArticles = allArticles.filter(a => 
            a.matchedClients?.some(c => c.toLowerCase() === clientName.toLowerCase() ||
                (client.aliases || []).some(al => al.toLowerCase() === c.toLowerCase()))
        );
        
        if (clientArticles.length === 0) {
            contentEl.innerHTML = '<p>No recent articles for this client.</p>';
            this.app.lastBriefATLText = '';
            return;
        }
        
        // Check for API key
        const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
        
        if (!apiKey) {
            // No AI - generate simple brief
            const articleList = clientArticles.slice(0, 5).map(a => 
                `• ${a.title} (${a.source})`
            ).join('\n');
            
            const briefText = `🔔 Client Signal: ${clientName}

${client.atl ? `ATL: ${client.atl}` : ''}
Market: ${client.market} | Industry: ${client.industry || 'N/A'}

Recent coverage:
${articleList}

Review these signals and consider client outreach.`;
            
            contentEl.innerHTML = `<div class="brief-atl-slack">${escapeHtml(briefText)}</div>`;
            this.app.lastBriefATLText = briefText;
            return;
        }
        
        // AI-powered brief
        contentEl.innerHTML = '<p>Generating AI brief...</p>';
        
        const articleSummaries = clientArticles.slice(0, 5).map(a => 
            `- "${a.title}" (${a.source}): ${a.summary || 'No summary'}`
        ).join('\n');
        
        const prompt = `You are helping a Field CTO brief their Account Technical Leader (ATL) about a client. Generate a concise Slack message.

Client: ${clientName}
Market: ${client.market}
Industry: ${client.industry || 'N/A'}
ATL: ${client.atl || 'Not assigned'}

Recent articles:
${articleSummaries}

Write a brief Slack message (max 150 words) that:
1. Summarizes the key signal(s) about this client
2. Suggests an IBM angle or conversation starter
3. Recommends a specific action for the ATL

Format for Slack (use emoji sparingly). Start with "🔔 Client Signal: ${clientName}"`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 500,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            
            const data = await response.json();
            const briefText = data.content?.[0]?.text || 'Failed to generate brief';
            
            contentEl.innerHTML = `<div class="brief-atl-slack">${escapeHtml(briefText)}</div>`;
            this.app.lastBriefATLText = briefText;
            
        } catch (err) {
            contentEl.innerHTML = `<p>Error: ${err.message}</p>`;
            this.app.lastBriefATLText = '';
        }
    }

    closeBriefATL() {
        document.getElementById('brief-atl-modal').classList.add('hidden');
    }

    copyBriefATL() {
        if (!this.app.lastBriefATLText) {
            showToast('No brief to copy');
            return;
        }
        navigator.clipboard.writeText(this.app.lastBriefATLText).then(() => {
            showToast('Copied to clipboard');
        }).catch(() => {
            showToast('Failed to copy');
        });
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientManager;
}

// Made with Bob
