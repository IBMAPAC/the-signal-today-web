// =============================================
// CryptoService - API Key Encryption
// Stub implementation for production
// =============================================

class CryptoService {
    constructor() {
        this.keyName = 'signal_api_key';
    }

    // Store API key (plain text for now, can be enhanced with Web Crypto API)
    async storeKey(key) {
        try {
            localStorage.setItem(this.keyName, key);
            return true;
        } catch (error) {
            console.error('Failed to store API key:', error);
            return false;
        }
    }

    // Retrieve API key
    async retrieveKey() {
        try {
            return localStorage.getItem(this.keyName);
        } catch (error) {
            console.error('Failed to retrieve API key:', error);
            return null;
        }
    }

    // Delete API key
    async deleteKey() {
        try {
            localStorage.removeItem(this.keyName);
            return true;
        } catch (error) {
            console.error('Failed to delete API key:', error);
            return false;
        }
    }
}

// Made with Bob
