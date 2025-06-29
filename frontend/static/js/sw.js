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
    '/static/js/whatsapp_integration.js',
    '/static/js/smart_receipt_processor.js',
    '/static/icons/pocketbizz-icon.svg',
    '/static/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/feather-icons',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
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
            .then(() => {
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('PWA Service Worker install failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('PWA Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const request = event.request;
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension requests
    if (request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Try to fetch from network
                return fetch(request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Cache successful responses for static resources
                        if (shouldCache(request.url)) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, responseClone);
                                });
                        }
                        
                        return response;
                    })
                    .catch(() => {
                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        
                        // Return cached fallback for other requests
                        return new Response('Offline - PocketBizz', {
                            status: 200,
                            statusText: 'OK',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Determine if URL should be cached
function shouldCache(url) {
    const uncacheablePatterns = [
        '/api/',
        '/add_transaction',
        '/upload',
        'analytics',
        'admin'
    ];
    
    return !uncacheablePatterns.some(pattern => url.includes(pattern));
}

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'offline-transactions-sync') {
        event.waitUntil(syncOfflineTransactions());
    }
});

// Sync offline transactions when back online
async function syncOfflineTransactions() {
    try {
        // This would communicate with the main app to sync data
        const clients = await self.clients.matchAll();
        
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_OFFLINE_DATA'
            });
        });
        
        console.log('Offline transactions sync initiated');
    } catch (error) {
        console.error('Failed to sync offline transactions:', error);
    }
}

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'PocketBizz notification',
        icon: '/static/icons/pocketbizz-icon.svg',
        badge: '/static/icons/pocketbizz-icon.svg',
        vibrate: [200, 100, 200],
        data: {
            url: '/'
        },
        actions: [
            {
                action: 'open',
                title: 'Open PocketBizz'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('PocketBizz', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            self.clients.matchAll({ type: 'window' })
                .then((clients) => {
                    // Focus existing window if available
                    for (const client of clients) {
                        if (client.url.includes(self.location.origin)) {
                            return client.focus();
                        }
                    }
                    
                    // Open new window
                    return self.clients.openWindow('/');
                })
        );
    }
});

console.log('PWA Service Worker loaded successfully');