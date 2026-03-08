// =============================================
// LazyLoader - Infinite Scroll for Article Lists
// Improves performance for large article lists
// =============================================

class LazyLoader {
    constructor(container, items, renderFunction, options = {}) {
        this.container = container;
        this.items = items;
        this.renderFunction = renderFunction;
        this.batchSize = options.batchSize || 20;
        this.threshold = options.threshold || 500; // pixels from bottom
        this.currentIndex = 0;
        this.isLoading = false;
        this.observer = null;

        this.init();
    }

    init() {
        // Load initial batch
        this.loadMore();

        // Set up intersection observer for infinite scroll
        this.setupObserver();
    }

    setupObserver() {
        // Create sentinel element at the bottom
        const sentinel = document.createElement('div');
        sentinel.className = 'lazy-loader-sentinel';
        sentinel.style.height = '1px';
        this.container.appendChild(sentinel);

        // Observe sentinel
        this.observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !this.isLoading) {
                    this.loadMore();
                }
            },
            { rootMargin: `${this.threshold}px` }
        );

        this.observer.observe(sentinel);
    }

    loadMore() {
        if (this.isLoading || this.currentIndex >= this.items.length) {
            return;
        }

        this.isLoading = true;

        // Get next batch
        const endIndex = Math.min(
            this.currentIndex + this.batchSize,
            this.items.length
        );
        const batch = this.items.slice(this.currentIndex, endIndex);

        // Render batch
        batch.forEach(item => {
            const element = this.renderFunction(item);
            // Insert before sentinel
            const sentinel = this.container.querySelector('.lazy-loader-sentinel');
            if (sentinel) {
                this.container.insertBefore(element, sentinel);
            } else {
                this.container.appendChild(element);
            }
        });

        this.currentIndex = endIndex;
        this.isLoading = false;

        // Show "end of list" message if done
        if (this.currentIndex >= this.items.length) {
            this.showEndMessage();
        }
    }

    showEndMessage() {
        const sentinel = this.container.querySelector('.lazy-loader-sentinel');
        if (sentinel) {
            sentinel.textContent = `Showing all ${this.items.length} articles`;
            sentinel.style.textAlign = 'center';
            sentinel.style.padding = '1rem';
            sentinel.style.color = 'var(--cds-text-secondary)';
            sentinel.style.fontSize = '0.875rem';
        }
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    reset(newItems) {
        this.items = newItems;
        this.currentIndex = 0;
        this.isLoading = false;
        
        // Clear container except sentinel
        const sentinel = this.container.querySelector('.lazy-loader-sentinel');
        this.container.innerHTML = '';
        if (sentinel) {
            this.container.appendChild(sentinel);
        }

        // Load initial batch
        this.loadMore();
    }
}

// Made with Bob
