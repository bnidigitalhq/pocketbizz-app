/**
 * Service Worker for PocketBizz Offline Functionality
 * Provides caching and offline support
 */

const CACHE_NAME = 'pocketbizz-v1';
const STATIC_CACHE = 'pocketbizz-static-v1';

// Files to cache for offline use
const STATIC_FILES = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/js/voice_input.js',
    '/static/js/offline.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/feather-icons/dist/feather.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .catch(error => {
                console.error('Failed to cache static files:', error);
            })
    );
    
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match('/') || caches.match('/static/offline.html');
                })
        );
        return;
    }
    
    // Handle static assets
    if (request.destination === 'style' || 
        request.destination === 'script' || 
        request.destination === 'font') {
        
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(request)
                        .then(fetchResponse => {
                            const responseClone = fetchResponse.clone();
                            caches.open(STATIC_CACHE)
                                .then(cache => {
                                    cache.put(request, responseClone);
                                });
                            return fetchResponse;
                        });
                })
        );
        return;
    }
    
    // Handle API requests
    if (request.url.includes('/api/') || request.method === 'POST') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // Return offline response for failed API calls
                    return new Response(JSON.stringify({
                        error: 'Offline',
                        message: 'Request will be synced when online'
                    }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503
                    });
                })
        );
        return;
    }
    
    // Default: try network first, fallback to cache
    event.respondWith(
        fetch(request)
            .then(response => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseClone);
                        });
                }
                return response;
            })
            .catch(() => {
                return caches.match(request);
            })
    );
});

// Background sync for offline transactions
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync-transactions') {
        console.log('Background sync triggered');
        event.waitUntil(syncOfflineTransactions());
    }
});

async function syncOfflineTransactions() {
    try {
        // This would normally communicate with the offline manager
        // For now, we'll just log that sync was attempted
        console.log('Attempting to sync offline transactions...');
        
        // Send message to main thread to trigger sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                action: 'SYNC_TRANSACTIONS'
            });
        });
        
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications (for future use)
self.addEventListener('push', event => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/static/icons/icon-192x192.png',
        badge: '/static/icons/badge-72x72.png',
        tag: 'pocketbizz-notification',
        actions: [
            {
                action: 'view',
                title: 'Lihat'
            },
            {
                action: 'dismiss',
                title: 'Tutup'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});