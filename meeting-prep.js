/**
 * Meeting Prep System
 * Manages upcoming meetings and associated signals for Field CTO
 * Part of Phase 2: UI Consolidation & Command Center
 */

class MeetingPrep {
    constructor() {
        this.meetings = [];
        this.loadFromStorage();
    }

    /**
     * Load meetings from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('signal_meetings');
            if (stored) {
                this.meetings = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load meetings:', error);
            this.meetings = [];
        }
    }

    /**
     * Save meetings to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('signal_meetings', JSON.stringify(this.meetings));
        } catch (error) {
            console.error('Failed to save meetings:', error);
        }
    }

    /**
     * Create a new meeting
     * @param {string} clientName - Client name
     * @param {string} date - Meeting date (ISO format)
     * @param {string} purpose - Meeting purpose/topic
     * @param {string} attendees - Attendees list
     * @returns {Object} Created meeting
     */
    createMeeting(clientName, date, purpose = '', attendees = '') {
        const meeting = {
            id: this.generateId(),
            clientName,
            date,
            purpose,
            attendees,
            signals: [],
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.meetings.push(meeting);
        this.saveToStorage();
        return meeting;
    }

    /**
     * Update meeting details
     * @param {string} meetingId - Meeting ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} Updated meeting or null
     */
    updateMeeting(meetingId, updates) {
        const meeting = this.meetings.find(m => m.id === meetingId);
        if (meeting) {
            Object.assign(meeting, updates, {
                updatedAt: new Date().toISOString()
            });
            this.saveToStorage();
            return meeting;
        }
        return null;
    }

    /**
     * Delete a meeting
     * @param {string} meetingId - Meeting ID
     * @returns {boolean} Success status
     */
    deleteMeeting(meetingId) {
        const index = this.meetings.findIndex(m => m.id === meetingId);
        if (index !== -1) {
            this.meetings.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Add signal to meeting
     * @param {string} meetingId - Meeting ID
     * @param {Object} signal - Signal object with article data
     * @returns {boolean} Success status
     */
    addSignal(meetingId, signal) {
        const meeting = this.meetings.find(m => m.id === meetingId);
        if (meeting) {
            // Check if signal already exists
            if (!meeting.signals.find(s => s.articleId === signal.articleId)) {
                meeting.signals.push({
                    articleId: signal.articleId,
                    title: signal.title,
                    source: signal.source,
                    url: signal.url,
                    summary: signal.summary,
                    relevance: signal.relevance || '',
                    addedAt: new Date().toISOString()
                });
                meeting.updatedAt = new Date().toISOString();
                this.saveToStorage();
                return true;
            }
        }
        return false;
    }

    /**
     * Remove signal from meeting
     * @param {string} meetingId - Meeting ID
     * @param {string} articleId - Article ID
     * @returns {boolean} Success status
     */
    removeSignal(meetingId, articleId) {
        const meeting = this.meetings.find(m => m.id === meetingId);
        if (meeting) {
            const index = meeting.signals.findIndex(s => s.articleId === articleId);
            if (index !== -1) {
                meeting.signals.splice(index, 1);
                meeting.updatedAt = new Date().toISOString();
                this.saveToStorage();
                return true;
            }
        }
        return false;
    }

    /**
     * Get upcoming meetings (next 30 days)
     * @returns {Array} Upcoming meetings sorted by date
     */
    getUpcomingMeetings() {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        return this.meetings
            .filter(m => {
                const meetingDate = new Date(m.date);
                return meetingDate >= now && meetingDate <= thirtyDaysFromNow;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    /**
     * Get past meetings
     * @returns {Array} Past meetings sorted by date (most recent first)
     */
    getPastMeetings() {
        const now = new Date();
        
        return this.meetings
            .filter(m => new Date(m.date) < now)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Get meeting by ID
     * @param {string} meetingId - Meeting ID
     * @returns {Object|null} Meeting or null
     */
    getMeeting(meetingId) {
        return this.meetings.find(m => m.id === meetingId) || null;
    }

    /**
     * Get meetings for a specific client
     * @param {string} clientName - Client name
     * @returns {Array} Meetings for the client
     */
    getMeetingsByClient(clientName) {
        return this.meetings
            .filter(m => m.clientName.toLowerCase() === clientName.toLowerCase())
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Generate meeting briefing
     * @param {string} meetingId - Meeting ID
     * @returns {string} Formatted briefing text
     */
    generateBriefing(meetingId) {
        const meeting = this.getMeeting(meetingId);
        if (!meeting) return '';

        const dateStr = new Date(meeting.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let briefing = `# Meeting Briefing: ${meeting.clientName}\n\n`;
        briefing += `**Date:** ${dateStr}\n`;
        if (meeting.purpose) briefing += `**Purpose:** ${meeting.purpose}\n`;
        if (meeting.attendees) briefing += `**Attendees:** ${meeting.attendees}\n`;
        briefing += `\n---\n\n`;

        if (meeting.signals.length > 0) {
            briefing += `## Recent Signals (${meeting.signals.length})\n\n`;
            meeting.signals.forEach((signal, index) => {
                briefing += `### ${index + 1}. ${signal.title}\n\n`;
                briefing += `**Source:** ${signal.source}\n`;
                if (signal.relevance) briefing += `**Relevance:** ${signal.relevance}\n`;
                briefing += `\n${signal.summary}\n\n`;
                briefing += `[Read more](${signal.url})\n\n`;
                briefing += `---\n\n`;
            });
        } else {
            briefing += `## No signals added yet\n\n`;
            briefing += `Add relevant signals from your daily digest to prepare for this meeting.\n\n`;
        }

        if (meeting.notes) {
            briefing += `## Notes\n\n${meeting.notes}\n\n`;
        }

        return briefing;
    }

    /**
     * Export meeting briefing as markdown
     * @param {string} meetingId - Meeting ID
     * @returns {Blob} Markdown file blob
     */
    exportBriefing(meetingId) {
        const briefing = this.generateBriefing(meetingId);
        const meeting = this.getMeeting(meetingId);
        const filename = `meeting-brief-${meeting.clientName.replace(/\s+/g, '-')}-${meeting.date}.md`;
        
        return {
            blob: new Blob([briefing], { type: 'text/markdown' }),
            filename
        };
    }

    /**
     * Get statistics
     * @returns {Object} Meeting statistics
     */
    getStatistics() {
        const upcoming = this.getUpcomingMeetings();
        const past = this.getPastMeetings();
        const totalSignals = this.meetings.reduce((sum, m) => sum + m.signals.length, 0);
        
        return {
            totalMeetings: this.meetings.length,
            upcomingMeetings: upcoming.length,
            pastMeetings: past.length,
            totalSignals,
            avgSignalsPerMeeting: this.meetings.length > 0 
                ? (totalSignals / this.meetings.length).toFixed(1) 
                : 0
        };
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all meetings (for testing/reset)
     */
    clearAll() {
        this.meetings = [];
        this.saveToStorage();
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeetingPrep;
}

// Made with Bob
