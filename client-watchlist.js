// =============================================
// Client Watchlist Management System
// Manages 343 accounts across 3 tiers and 5 markets
// For Field CTO personal intelligence tool
// =============================================

/**
 * Client Watchlist Management
 * @class ClientWatchlist
 */
class ClientWatchlist {
    constructor() {
        this.STORAGE_KEY = 'client_watchlist';
        this.clients = this.loadFromStorage();
    }

    /**
     * Load client watchlist from localStorage
     * @returns {Object} Client data structure
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : {
                tier1: [],
                tier2: [],
                tier3: [],
                metadata: {
                    lastUpdated: null,
                    totalClients: 0,
                    version: '1.0'
                }
            };
        } catch (error) {
            console.error('Failed to load client watchlist:', error);
            return { 
                tier1: [], 
                tier2: [], 
                tier3: [], 
                metadata: { lastUpdated: null, totalClients: 0, version: '1.0' } 
            };
        }
    }

    /**
     * Save client watchlist to localStorage
     */
    saveToStorage() {
        try {
            this.clients.metadata.lastUpdated = new Date().toISOString();
            this.clients.metadata.totalClients = 
                this.clients.tier1.length + 
                this.clients.tier2.length + 
                this.clients.tier3.length;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.clients));
            console.log('✅ Client watchlist saved:', this.clients.metadata.totalClients, 'clients');
        } catch (error) {
            console.error('Failed to save client watchlist:', error);
        }
    }

    /**
     * Generate unique client ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add new client to watchlist
     * @param {string} name - Client name
     * @param {number} tier - Tier level (1, 2, or 3)
     * @param {string} market - Market (ANZ, ASEAN, GCG, ISA, KOREA)
     * @param {string} atl - ATL owner name
     * @param {string} notes - Optional notes
     * @returns {Object} Created client object
     */
    addClient(name, tier, market, atl, notes = '') {
        const client = {
            id: this.generateId(),
            name: name.trim(),
            tier: parseInt(tier),
            market: market,
            atl: atl.trim(),
            notes: notes.trim(),
            addedDate: new Date().toISOString(),
            lastSignalDate: null,
            signalCount: 0
        };

        this.clients[`tier${tier}`].push(client);
        this.saveToStorage();
        console.log(`✅ Added client: ${name} (Tier ${tier}, ${market})`);
        return client;
    }

    /**
     * Update existing client
     * @param {string} clientId - Client ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated client or null
     */
    updateClient(clientId, updates) {
        const client = this.findClient(clientId);
        if (client) {
            Object.assign(client, updates);
            this.saveToStorage();
            console.log(`✅ Updated client: ${client.name}`);
            return client;
        }
        console.warn(`Client not found: ${clientId}`);
        return null;
    }

    /**
     * Delete client from watchlist
     * @param {string} clientId - Client ID
     * @returns {boolean} Success status
     */
    deleteClient(clientId) {
        for (const tier of ['tier1', 'tier2', 'tier3']) {
            const index = this.clients[tier].findIndex(c => c.id === clientId);
            if (index !== -1) {
                const client = this.clients[tier][index];
                this.clients[tier].splice(index, 1);
                this.saveToStorage();
                console.log(`✅ Deleted client: ${client.name}`);
                return true;
            }
        }
        console.warn(`Client not found for deletion: ${clientId}`);
        return false;
    }

    /**
     * Move client to different tier
     * @param {string} clientId - Client ID
     * @param {number} newTier - New tier level (1, 2, or 3)
     * @returns {Object|null} Updated client or null
     */
    moveTier(clientId, newTier) {
        const client = this.findClient(clientId);
        if (client) {
            const oldTier = client.tier;
            this.deleteClient(clientId);
            client.tier = parseInt(newTier);
            client.id = this.generateId(); // New ID for new tier
            this.clients[`tier${newTier}`].push(client);
            this.saveToStorage();
            console.log(`✅ Moved ${client.name} from Tier ${oldTier} to Tier ${newTier}`);
            return client;
        }
        return null;
    }

    /**
     * Find client by ID
     * @param {string} clientId - Client ID
     * @returns {Object|null} Client object or null
     */
    findClient(clientId) {
        for (const tier of ['tier1', 'tier2', 'tier3']) {
            const client = this.clients[tier].find(c => c.id === clientId);
            if (client) return client;
        }
        return null;
    }

    /**
     * Find client by name
     * @param {string} name - Client name
     * @returns {Object|null} Client object or null
     */
    findClientByName(name) {
        const lowerName = name.toLowerCase();
        for (const tier of ['tier1', 'tier2', 'tier3']) {
            const client = this.clients[tier].find(c => 
                c.name.toLowerCase() === lowerName
            );
            if (client) return client;
        }
        return null;
    }

    /**
     * Get all Tier 1 client names
     * @returns {Array<string>} Array of client names
     */
    getTier1Clients() {
        return this.clients.tier1.map(c => c.name);
    }

    /**
     * Get all Tier 2 client names
     * @returns {Array<string>} Array of client names
     */
    getTier2Clients() {
        return this.clients.tier2.map(c => c.name);
    }

    /**
     * Get all Tier 3 client names
     * @returns {Array<string>} Array of client names
     */
    getTier3Clients() {
        return this.clients.tier3.map(c => c.name);
    }

    /**
     * Get all clients across all tiers
     * @returns {Array<Object>} Array of client objects
     */
    getAllClients() {
        return [
            ...this.clients.tier1,
            ...this.clients.tier2,
            ...this.clients.tier3
        ];
    }

    /**
     * Get clients by market
     * @param {string} market - Market name
     * @returns {Array<Object>} Array of client objects
     */
    getClientsByMarket(market) {
        return this.getAllClients().filter(c => c.market === market);
    }

    /**
     * Get clients by ATL owner
     * @param {string} atlName - ATL name
     * @returns {Array<Object>} Array of client objects
     */
    getClientsByATL(atlName) {
        const lowerATL = atlName.toLowerCase();
        return this.getAllClients().filter(c => 
            c.atl.toLowerCase().includes(lowerATL)
        );
    }

    /**
     * Search clients by query
     * @param {string} query - Search query
     * @returns {Array<Object>} Array of matching client objects
     */
    searchClients(query) {
        if (!query || query.trim() === '') {
            return this.getAllClients();
        }
        
        const lowerQuery = query.toLowerCase();
        return this.getAllClients().filter(c => 
            c.name.toLowerCase().includes(lowerQuery) ||
            c.atl.toLowerCase().includes(lowerQuery) ||
            c.market.toLowerCase().includes(lowerQuery) ||
            c.notes.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Record signal for client
     * @param {string} clientName - Client name
     */
    recordSignal(clientName) {
        const client = this.findClientByName(clientName);
        if (client) {
            client.lastSignalDate = new Date().toISOString();
            client.signalCount++;
            this.saveToStorage();
            console.log(`📊 Signal recorded for ${clientName} (Total: ${client.signalCount})`);
        }
    }

    /**
     * Export watchlist to CSV format
     * @returns {string} CSV string
     */
    exportToCSV() {
        const rows = [
            ['Name', 'Tier', 'Market', 'ATL', 'Notes', 'Added Date', 'Last Signal', 'Signal Count']
        ];

        for (const client of this.getAllClients()) {
            rows.push([
                client.name,
                client.tier,
                client.market,
                client.atl,
                client.notes || '',
                new Date(client.addedDate).toLocaleDateString(),
                client.lastSignalDate ? new Date(client.lastSignalDate).toLocaleDateString() : 'Never',
                client.signalCount
            ]);
        }

        return rows.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    /**
     * Import clients from CSV
     * @param {string} csvText - CSV content
     * @returns {Array<Object>} Array of imported clients
     */
    importFromCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const imported = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            try {
                // Parse CSV (handle quoted fields)
                const fields = [];
                let current = '';
                let inQuotes = false;
                
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        fields.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                fields.push(current.trim());

                const [name, tier, market, atl, notes] = fields;

                if (name && tier && market && atl) {
                    const client = this.addClient(name, tier, market, atl, notes || '');
                    imported.push(client);
                }
            } catch (error) {
                console.warn(`Failed to parse CSV line ${i}:`, error);
            }
        }

        console.log(`✅ Imported ${imported.length} clients from CSV`);
        return imported;
    }

    /**
     * Get watchlist statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        return {
            tier1Count: this.clients.tier1.length,
            tier2Count: this.clients.tier2.length,
            tier3Count: this.clients.tier3.length,
            totalClients: this.clients.metadata.totalClients,
            byMarket: {
                ANZ: this.getClientsByMarket('ANZ').length,
                ASEAN: this.getClientsByMarket('ASEAN').length,
                GCG: this.getClientsByMarket('GCG').length,
                ISA: this.getClientsByMarket('ISA').length,
                KOREA: this.getClientsByMarket('KOREA').length
            },
            lastUpdated: this.clients.metadata.lastUpdated,
            version: this.clients.metadata.version
        };
    }

    /**
     * Clear all clients (with confirmation)
     * @returns {boolean} Success status
     */
    clearAll() {
        this.clients = {
            tier1: [],
            tier2: [],
            tier3: [],
            metadata: {
                lastUpdated: new Date().toISOString(),
                totalClients: 0,
                version: '1.0'
            }
        };
        this.saveToStorage();
        console.log('✅ Cleared all clients');
        return true;
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientWatchlist;
}

// Made with Bob