// Main JavaScript file for SME Accounting App

// DOM ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Set current date inputs to today
    setDefaultDates();
    
    // Initialize navigation highlighting
    highlightCurrentNavigation();
    
    // Auto-format currency inputs
    initializeCurrencyInputs();
    
    // Initialize tooltips and popovers
    initializeTooltips();
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });
}

function highlightCurrentNavigation() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath || (currentPath === '/' && href === '/')) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function initializeCurrencyInputs() {
    const currencyInputs = document.querySelectorAll('input[type="number"][name="amount"]');
    
    currencyInputs.forEach(input => {
        // Format on blur
        input.addEventListener('blur', function() {
            if (this.value) {
                this.value = parseFloat(this.value).toFixed(2);
            }
        });
        
        // Prevent negative values
        input.addEventListener('input', function() {
            if (this.value < 0) {
                this.value = 0;
            }
        });
    });
}

function initializeTooltips() {
    // Simple tooltip implementation
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(event) {
    const text = event.target.getAttribute('data-tooltip');
    if (!text) return;
    
    const tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    tooltip.className = 'absolute bg-gray-800 text-white text-xs rounded py-1 px-2 z-50';
    tooltip.textContent = text;
    
    document.body.appendChild(tooltip);
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('ms-MY', {
        style: 'currency',
        currency: 'MYR',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date(date));
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `toast fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        type === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">
                <i data-feather="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Re-initialize feather icons for the new element
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// Form validation helpers
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateAmount(amount) {
    return amount > 0 && !isNaN(amount);
}

function validateRequired(value) {
    return value && value.trim().length > 0;
}

// Local storage helpers
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return null;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

// Network status monitoring
function checkNetworkStatus() {
    return navigator.onLine;
}

window.addEventListener('online', function() {
    showNotification('Sambungan internet dipulihkan', 'success');
    syncOfflineData();
});

window.addEventListener('offline', function() {
    showNotification('Tiada sambungan internet. Data akan disimpan secara tempatan.', 'warning');
});

// Offline data sync (basic implementation)
function syncOfflineData() {
    const offlineData = loadFromLocalStorage('offlineTransactions');
    if (offlineData && offlineData.length > 0) {
        // TODO: Implement sync with server
        console.log('Syncing offline data:', offlineData);
        // Clear offline data after successful sync
        removeFromLocalStorage('offlineTransactions');
    }
}

// Quick action handlers
function quickAddTransaction(type, channel, category = '') {
    // Redirect to add transaction page with pre-filled data
    const params = new URLSearchParams({
        type: type,
        channel: channel,
        category: category
    });
    
    window.location.href = '/add_transaction?' + params.toString();
}

// Performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Export for use in other scripts
window.App = {
    formatCurrency,
    formatDate,
    showNotification,
    confirmAction,
    validateEmail,
    validateAmount,
    validateRequired,
    saveToLocalStorage,
    loadFromLocalStorage,
    removeFromLocalStorage,
    checkNetworkStatus,
    quickAddTransaction,
    debounce,
    throttle
};
