// PWA Service Worker for PocketBizz
const CACHE_NAME = 'pocketbizz-v1.0.0';
const OFFLINE_URL = '/';

// Resources to cache for offline functionality
const CACHE_RESOURCES = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/js/pwa.js',
    '/static/js/offline.js',
    '/static/js/voice_input.js',
    '/static/manifest.json',
    '/static/icons/pocketbizz-icon.svg'
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
    console.log('PWA Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching core PWA resources');
                return cache.addAll(CACHE_RESOURCES);
            })
            .catch((error) => {
                console.error('Failed to cache resources:', error);
            })
    );
    
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('PWA Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    self.clients.claim();
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // If both cache and network fail, return offline page
                if (event.request.destination === 'document') {
                    return caches.match(OFFLINE_URL);
                }
            })
    );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-transactions') {
        console.log('Background sync: syncing transactions');
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Sync offline transactions when online
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                payload: 'sync-transactions'
            });
        });
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}