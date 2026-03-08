// =============================================
// AccessibilityManager - ARIA and Keyboard Navigation
// Enhances accessibility for screen readers and keyboard users
// =============================================

class AccessibilityManager {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Announce dynamic content changes
        this.setupLiveRegions();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in an input
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.isContentEditable) {
                return;
            }

            // R - Refresh
            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.app.refresh();
                this.announce('Refreshing articles');
            }

            // S - Settings
            if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                this.app.openSettings();
                this.announce('Opening settings');
            }

            // Escape - Close modals
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal:not(.hidden)');
                if (modals.length > 0) {
                    e.preventDefault();
                    modals.forEach(modal => modal.classList.add('hidden'));
                    this.announce('Modal closed');
                }
            }

            // Arrow keys - Navigate articles
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                this.navigateArticles(e.key === 'ArrowDown' ? 1 : -1);
                e.preventDefault();
            }

            // Enter - Open focused article
            if (e.key === 'Enter' && this.app.focusedArticleIndex >= 0) {
                const articles = document.querySelectorAll('.article-item');
                if (articles[this.app.focusedArticleIndex]) {
                    articles[this.app.focusedArticleIndex].click();
                    e.preventDefault();
                }
            }
        });
    }

    setupLiveRegions() {
        // Create ARIA live region for announcements
        if (!document.getElementById('aria-live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'aria-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
        }
    }

    announce(message) {
        const liveRegion = document.getElementById('aria-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }

    navigateArticles(direction) {
        const articles = document.querySelectorAll('.article-item');
        if (articles.length === 0) return;

        // Update focused index
        this.app.focusedArticleIndex += direction;
        
        // Wrap around
        if (this.app.focusedArticleIndex < 0) {
            this.app.focusedArticleIndex = articles.length - 1;
        } else if (this.app.focusedArticleIndex >= articles.length) {
            this.app.focusedArticleIndex = 0;
        }

        // Focus the article
        const article = articles[this.app.focusedArticleIndex];
        if (article) {
            article.focus();
            article.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Announce article title
            const title = article.querySelector('.article-item-title');
            if (title) {
                this.announce(title.textContent);
            }
        }
    }

    // Add ARIA labels to dynamic content
    updateAriaLabels() {
        // Update article count badges
        const badges = document.querySelectorAll('.tab-badge');
        badges.forEach(badge => {
            const count = badge.textContent;
            badge.setAttribute('aria-label', `${count} articles`);
        });

        // Update reading time
        const readingTime = document.getElementById('reading-time');
        if (readingTime) {
            const time = readingTime.textContent;
            readingTime.setAttribute('aria-label', `Estimated reading time: ${time}`);
        }
    }
}

// Made with Bob
