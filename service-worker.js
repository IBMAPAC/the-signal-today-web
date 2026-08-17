// =============================================
// The Signal Today — Service Worker
// Handles background feed pre-fetching via
// Periodic Background Sync so feeds are warm
// when the user opens the app, with zero extra
// AI/Claude token cost.
// =============================================

const SW_VERSION        = 'signal-sw-v1';
const FEED_CACHE_NAME   = 'signal-bg-feeds-v1';
const BG_SYNC_TAG       = 'signal-bg-fetch';

// CORS proxies — keep in sync with app.js CORS_PROXIES
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
];

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
    // Activate new SW immediately without waiting for old tabs to close
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Take control of all open clients immediately
            self.clients.claim(),
            // Prune old cache versions
            caches.keys().then(keys =>
                Promise.all(keys
                    .filter(k => k.startsWith('signal-bg-feeds-') && k !== FEED_CACHE_NAME)
                    .map(k => caches.delete(k))
                )
            )
        ])
    );
});

// ── Periodic Background Sync ─────────────────────────────────────────────────

self.addEventListener('periodicsync', (event) => {
    if (event.tag === BG_SYNC_TAG) {
        event.waitUntil(backgroundFetchFeeds());
    }
});

// ── Message bus (app → SW) ───────────────────────────────────────────────────

self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    if (type === 'UPDATE_SOURCES') {
        // App sends its current enabled sources so we know what to fetch
        storeSources(payload.sources);
    }

    if (type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ── Core: background feed fetch ──────────────────────────────────────────────

async function backgroundFetchFeeds() {
    const sources = await loadSources();
    if (!sources || sources.length === 0) {
        console.log('[SW] No sources stored — skipping background fetch');
        return;
    }

    const enabledSources = sources.filter(s => s.enabled !== false);
    console.log(`[SW] Background fetch: ${enabledSources.length} sources`);

    const cache  = await caches.open(FEED_CACHE_NAME);
    let   fetched = 0;

    // Fetch all sources in parallel (10 s timeout per source)
    const results = await Promise.allSettled(
        enabledSources.map(source => fetchFeedForSource(source, cache))
    );

    for (const r of results) {
        if (r.status === 'fulfilled' && r.value) fetched++;
    }

    console.log(`[SW] Background fetch complete: ${fetched}/${enabledSources.length} succeeded`);

    // Record when this background fetch last ran
    await storeLastBgFetch(new Date().toISOString());

    // Notify any open app tabs so they can pick up fresh data without a full reload
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const client of clients) {
        client.postMessage({ type: 'BG_FEEDS_READY', fetchedCount: fetched });
    }

    // Show a notification only if no app tab is currently visible
    const visibleClients = clients.filter(c => c.visibilityState === 'visible');
    if (visibleClients.length === 0 && fetched > 0) {
        self.registration.showNotification('📡 Signal Today', {
            body: 'Your feeds have been refreshed — tap to view the latest digest.',
            tag:  'signal-bg-refresh',          // replaces any previous notification
            renotify: false,
            silent: true,                        // no sound — informational only
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📡</text></svg>'
        });
    }
}

// ── Feed fetching ─────────────────────────────────────────────────────────────

async function fetchFeedForSource(source, cache) {
    const cacheKey = new Request(`https://signal.internal/feed?url=${encodeURIComponent(source.url)}`);

    // Skip if cached entry is less than 30 minutes old (avoid redundant fetches if
    // the OS fires the periodic sync more frequently than expected)
    const existing = await cache.match(cacheKey);
    if (existing) {
        const cachedAt = existing.headers.get('X-SW-Cached-At');
        if (cachedAt && Date.now() - new Date(cachedAt).getTime() < 30 * 60 * 1000) {
            return true; // Still fresh — skip
        }
    }

    // Try proxies in order, stop at first success
    for (const proxy of CORS_PROXIES) {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(proxy + encodeURIComponent(source.url), {
                headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // Store raw XML text as a synthetic Response in the cache so the
            // app's fetch intercept (or explicit cache lookup) can retrieve it.
            const text = await response.text();
            const syntheticResponse = new Response(text, {
                headers: {
                    'Content-Type': 'application/xml; charset=utf-8',
                    'X-SW-Cached-At': new Date().toISOString(),
                    'X-SW-Source-Name': source.name || ''
                }
            });
            await cache.put(cacheKey, syntheticResponse);
            return true;

        } catch {
            clearTimeout(timeoutId);
            // Try next proxy
        }
    }

    return false; // All proxies failed for this source
}

// ── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            // Focus existing tab if open
            for (const client of clients) {
                if ('focus' in client) return client.focus();
            }
            // Otherwise open a new tab
            if (self.clients.openWindow) return self.clients.openWindow('/');
        })
    );
});

// ── Helpers: source storage (via Cache API — localStorage not available in SW) ──

const META_CACHE   = 'signal-sw-meta-v1';
const SOURCES_KEY  = 'https://signal.internal/meta/sources';
const BG_FETCH_KEY = 'https://signal.internal/meta/last-bg-fetch';

async function storeSources(sources) {
    try {
        const cache = await caches.open(META_CACHE);
        await cache.put(
            new Request(SOURCES_KEY),
            new Response(JSON.stringify(sources), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } catch (e) {
        console.warn('[SW] Could not store sources:', e);
    }
}

async function loadSources() {
    try {
        const cache = await caches.open(META_CACHE);
        const res   = await cache.match(new Request(SOURCES_KEY));
        if (!res) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function storeLastBgFetch(isoString) {
    try {
        const cache = await caches.open(META_CACHE);
        await cache.put(
            new Request(BG_FETCH_KEY),
            new Response(JSON.stringify({ ts: isoString }), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    } catch { /* non-critical */ }
}
