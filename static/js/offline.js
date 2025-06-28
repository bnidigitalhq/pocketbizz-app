/**
 * Offline Mode & Auto-Sync System for PocketBizz
 * Handles offline transaction storage and automatic sync when online
 */

class OfflineManager {
    constructor() {
        this.dbName = 'PocketBizzOffline';
        this.dbVersion = 1;
        this.storeName = 'transactions';
        this.db = null;
        this.isOnline = navigator.onLine;
        
        this.initializeDB();
        this.setupNetworkListeners();
        this.setupOfflineUI();
        this.registerServiceWorker();
    }
    
    async initializeDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB');
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create transactions store
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('synced', 'synced', { unique: false });
                }
            };
        });
    }
    
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateNetworkStatus();
            this.syncOfflineTransactions();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateNetworkStatus();
        });
    }
    
    updateNetworkStatus() {
        const statusIndicator = document.getElementById('networkStatus');
        if (!statusIndicator) {
            this.createNetworkStatusIndicator();
            return;
        }
        
        if (this.isOnline) {
            statusIndicator.className = 'fixed top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm z-50';
            statusIndicator.textContent = '🟢 Online';
            
            // Hide after 3 seconds
            setTimeout(() => {
                statusIndicator.classList.add('hidden');
            }, 3000);
        } else {
            statusIndicator.className = 'fixed top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm z-50';
            statusIndicator.textContent = '🔴 Offline Mode';
            statusIndicator.classList.remove('hidden');
        }
    }
    
    createNetworkStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'networkStatus';
        indicator.className = 'fixed top-4 left-4 bg-gray-500 text-white px-3 py-1 rounded-full text-sm z-50 hidden';
        document.body.appendChild(indicator);
        this.updateNetworkStatus();
    }
    
    setupOfflineUI() {
        // Add offline indicators to forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            this.addOfflineIndicatorToForm(form);
        });
    }
    
    addOfflineIndicatorToForm(form) {
        if (!form.querySelector('[type="submit"]')) return;
        
        const submitBtn = form.querySelector('[type="submit"]');
        const offlineIndicator = document.createElement('div');
        offlineIndicator.className = 'mt-2 text-sm text-amber-600 hidden';
        offlineIndicator.id = 'offlineIndicator';
        offlineIndicator.innerHTML = `
            <div class="flex items-center space-x-2">
                <i data-feather="wifi-off" class="w-4 h-4"></i>
                <span>Data akan disimpan secara tempatan dan sync bila online</span>
            </div>
        `;
        
        submitBtn.parentNode.insertBefore(offlineIndicator, submitBtn.nextSibling);
        
        // Show/hide based on network status
        if (!this.isOnline) {
            offlineIndicator.classList.remove('hidden');
        }
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    async storeOfflineTransaction(transactionData) {
        if (!this.db) {
            await this.initializeDB();
        }
        
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const offlineData = {
            ...transactionData,
            timestamp: new Date().toISOString(),
            synced: false,
            offlineId: Date.now() + Math.random() // Unique offline ID
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(offlineData);
            
            request.onsuccess = () => {
                console.log('Transaction stored offline:', offlineData);
                this.showOfflineSuccessMessage();
                resolve(offlineData);
            };
            
            request.onerror = () => {
                console.error('Failed to store offline transaction');
                reject(request.error);
            };
        });
    }
    
    async getOfflineTransactions() {
        if (!this.db) return [];
        
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('synced');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(false); // Get unsynced transactions
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    async syncOfflineTransactions() {
        if (!this.isOnline) return;
        
        try {
            const offlineTransactions = await this.getOfflineTransactions();
            
            if (offlineTransactions.length === 0) {
                console.log('No offline transactions to sync');
                return;
            }
            
            console.log(`Syncing ${offlineTransactions.length} offline transactions`);
            this.showSyncingMessage(offlineTransactions.length);
            
            let syncedCount = 0;
            
            for (const transaction of offlineTransactions) {
                try {
                    await this.syncSingleTransaction(transaction);
                    await this.markTransactionAsSynced(transaction.id);
                    syncedCount++;
                } catch (error) {
                    console.error('Failed to sync transaction:', transaction, error);
                }
            }
            
            if (syncedCount > 0) {
                this.showSyncSuccessMessage(syncedCount);
                // Refresh page to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.showSyncErrorMessage();
        }
    }
    
    async syncSingleTransaction(transactionData) {
        const formData = new FormData();
        formData.append('type', transactionData.type);
        formData.append('amount', transactionData.amount);
        formData.append('description', transactionData.description);
        formData.append('channel', transactionData.channel);
        formData.append('category', transactionData.category || '');
        
        const response = await fetch('/add_transaction', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    }
    
    async markTransactionAsSynced(transactionId) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.get(transactionId);
            
            request.onsuccess = () => {
                const data = request.result;
                data.synced = true;
                data.syncedAt = new Date().toISOString();
                
                const updateRequest = store.put(data);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    showOfflineSuccessMessage() {
        if (typeof showNotification === 'function') {
            showNotification('✅ Data disimpan secara tempatan. Akan sync bila online.', 'success');
        }
    }
    
    showSyncingMessage(count) {
        if (typeof showNotification === 'function') {
            showNotification(`🔄 Mensync ${count} transaksi offline...`, 'info');
        }
    }
    
    showSyncSuccessMessage(count) {
        if (typeof showNotification === 'function') {
            showNotification(`✅ ${count} transaksi berjaya disync!`, 'success');
        }
    }
    
    showSyncErrorMessage() {
        if (typeof showNotification === 'function') {
            showNotification('❌ Sync gagal. Cuba lagi kemudian.', 'error');
        }
    }
    
    // Intercept form submissions for offline handling
    interceptFormSubmissions() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', async (event) => {
                if (!this.isOnline && this.isTransactionForm(form)) {
                    event.preventDefault();
                    await this.handleOfflineFormSubmission(form);
                }
            });
        });
    }
    
    isTransactionForm(form) {
        return form.querySelector('[name="type"]') && 
               form.querySelector('[name="amount"]') && 
               form.querySelector('[name="description"]');
    }
    
    async handleOfflineFormSubmission(form) {
        const formData = new FormData(form);
        const transactionData = {
            type: formData.get('type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description'),
            channel: formData.get('channel'),
            category: formData.get('category') || ''
        };
        
        try {
            await this.storeOfflineTransaction(transactionData);
            
            // Reset form
            form.reset();
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (error) {
            console.error('Failed to store offline transaction:', error);
            alert('Gagal menyimpan data. Cuba lagi.');
        }
    }
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/static/js/service-worker.js');
                console.log('Service Worker registered successfully:', registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
}

// Initialize offline manager
document.addEventListener('DOMContentLoaded', function() {
    const offlineManager = new OfflineManager();
    
    // Set up form interception after DOM is ready
    setTimeout(() => {
        offlineManager.interceptFormSubmissions();
    }, 500);
    
    // Make it globally available
    window.offlineManager = offlineManager;
});