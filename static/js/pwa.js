// PWA Installation and Management
let deferredPrompt;
let installPromptShown = false;

// Check if app is already installed
function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true ||
           localStorage.getItem('pwa_installed') === 'true';
}

// Show install prompt
function showInstallPrompt() {
    if (installPromptShown || isAppInstalled()) return;
    
    const installBanner = document.createElement('div');
    installBanner.id = 'pwa-install-banner';
    installBanner.className = 'fixed top-0 left-0 right-0 bg-shopee-orange text-white p-4 z-50 shadow-lg';
    installBanner.innerHTML = `
        <div class="flex items-center justify-between max-w-md mx-auto">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span class="text-shopee-orange font-bold text-sm">PB</span>
                </div>
                <div>
                    <div class="font-semibold text-sm">Install PocketBizz</div>
                    <div class="text-xs opacity-90">Add to home screen untuk akses pantas</div>
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="installPWA()" class="bg-white text-shopee-orange px-3 py-1 rounded-lg text-sm font-semibold">
                    Install
                </button>
                <button onclick="dismissInstallPrompt()" class="text-white opacity-75 hover:opacity-100">
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.prepend(installBanner);
    feather.replace();
    installPromptShown = true;
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        dismissInstallPrompt();
    }, 10000);
}

// Install PWA
async function installPWA() {
    if (!deferredPrompt) {
        showManualInstallInstructions();
        return;
    }
    
    try {
        const result = await deferredPrompt.prompt();
        console.log('PWA install result:', result.outcome);
        
        if (result.outcome === 'accepted') {
            localStorage.setItem('pwa_installed', 'true');
        }
        
        deferredPrompt = null;
        dismissInstallPrompt();
    } catch (error) {
        console.error('PWA installation error:', error);
        showManualInstallInstructions();
    }
}

// Show manual install instructions
function showManualInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const instructions = isIOS 
        ? 'Tap Share button, then "Add to Home Screen"'
        : 'Tap menu (⋮) then "Add to Home Screen" or "Install App"';
        
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl p-6 max-w-sm mx-auto">
            <h3 class="font-bold text-lg mb-3">Install PocketBizz</h3>
            <p class="text-gray-600 mb-4">${instructions}</p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    class="w-full bg-shopee-orange text-white py-3 rounded-xl font-semibold">
                OK, Faham
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    dismissInstallPrompt();
}

// Dismiss install prompt
function dismissInstallPrompt() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
        banner.remove();
    }
    installPromptShown = true;
    localStorage.setItem('install_prompt_dismissed', Date.now().toString());
}

// Check if should show install prompt
function shouldShowInstallPrompt() {
    if (isAppInstalled()) return false;
    
    const lastDismissed = localStorage.getItem('install_prompt_dismissed');
    if (lastDismissed) {
        const daysSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) return false; // Wait 7 days before showing again
    }
    
    return true;
}

// PWA Event Listeners
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA install prompt available');
    
    // Show install prompt after user has used app for 30 seconds
    if (shouldShowInstallPrompt()) {
        setTimeout(showInstallPrompt, 5000); // Reduced to 5 seconds for testing
    }
});

// Force show install prompt for testing (remove in production)
setTimeout(() => {
    console.log('PWA Debug: Checking install conditions...');
    console.log('- App installed:', isAppInstalled());
    console.log('- Should show prompt:', shouldShowInstallPrompt());
    console.log('- Deferred prompt available:', !!deferredPrompt);
    
    if (!isAppInstalled() && shouldShowInstallPrompt()) {
        console.log('PWA Debug: Forcing install prompt for testing');
        showInstallPrompt();
    }
}, 3000);

window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
    localStorage.setItem('pwa_installed', 'true');
    deferredPrompt = null;
    dismissInstallPrompt();
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.className = 'fixed top-4 left-4 right-4 bg-green-500 text-white p-4 rounded-xl z-50 text-center';
    successMsg.innerHTML = '✅ PocketBizz berjaya dipasang! Boleh akses dari home screen.';
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
        successMsg.remove();
    }, 5000);
});

// Initialize PWA functionality
document.addEventListener('DOMContentLoaded', function() {
    // Register service worker if not already registered
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ PWA Service Worker registered:', registration.scope);
                window.pwaStatus = {
                    ...window.pwaStatus,
                    serviceWorkerSupported: true
                };
            })
            .catch(error => {
                console.error('❌ PWA Service Worker registration failed:', error);
                // Try fallback path
                return navigator.serviceWorker.register('/static/js/sw.js')
                    .then(registration => {
                        console.log('✅ PWA Service Worker registered (fallback):', registration.scope);
                        window.pwaStatus = {
                            ...window.pwaStatus,
                            serviceWorkerSupported: true
                        };
                    });
            });
    }
    
    // Add PWA status to console
    console.log('PWA Status:', {
        installed: isAppInstalled(),
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        serviceWorkerSupported: 'serviceWorker' in navigator
    });
});