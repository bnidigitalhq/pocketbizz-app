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
    
    // Initialize Floating Action Button
    initializeFAB();
    
    // Initialize Pull-to-refresh
    initializePullToRefresh();
    
    // Initialize expense alerts
    checkExpenseLimits();
    
    // Initialize premium touch effects
    initializePremiumEffects();
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
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message; // Safe: textContent prevents XSS
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex items-center justify-between';
    
    const closeButton = document.createElement('button');
    closeButton.onclick = () => notification.remove();
    closeButton.className = 'ml-3 text-white hover:text-gray-200';
    closeButton.innerHTML = '<i data-feather="x" class="w-4 h-4"></i>';
    
    buttonContainer.appendChild(messageSpan);
    buttonContainer.appendChild(closeButton);
    notification.appendChild(buttonContainer);
    
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

// Center FAB Functions only
function initializeFAB() {
    // Initialize center FAB only
    initializeCenterFAB();
}

function initializeCenterFAB() {
    const centerFab = document.getElementById('centerFAB');
    const centerMenu = document.getElementById('centerFabMenu');
    const centerFabIcon = document.getElementById('centerFabIcon');
    let isCenterMenuOpen = false;

    if (!centerFab || !centerMenu || !centerFabIcon) return;

    // Add premium touch effects
    centerFab.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
        this.style.boxShadow = '0 10px 25px rgba(238, 77, 45, 0.4)';
    });

    centerFab.addEventListener('mouseleave', function() {
        if (!isCenterMenuOpen) {
            this.style.transform = 'scale(1)';
            this.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }
    });

    centerFab.addEventListener('click', function(e) {
        e.preventDefault();
        isCenterMenuOpen = !isCenterMenuOpen;
        
        if (isCenterMenuOpen) {
            // Open menu with smooth animation
            centerMenu.classList.remove('hidden');
            centerFabIcon.style.transform = 'rotate(45deg)';
            centerFab.style.transform = 'scale(1.1)';
            centerFab.style.boxShadow = '0 15px 35px rgba(238, 77, 45, 0.5)';
            
            // Animate menu appearance
            setTimeout(() => {
                centerMenu.style.opacity = '1';
                centerMenu.style.transform = 'translateX(-50%) translateY(0) scale(1)';
            }, 50);
            
            // Add backdrop blur effect
            addBackdrop();
            
        } else {
            // Close menu
            closeCenterFAB();
        }
    });

    // Close when clicking outside
    document.addEventListener('click', function(event) {
        if (isCenterMenuOpen && !centerFab.contains(event.target) && !centerMenu.contains(event.target)) {
            closeCenterFAB();
        }
    });

    function closeCenterFAB() {
        isCenterMenuOpen = false;
        centerFabIcon.style.transform = 'rotate(0deg)';
        centerFab.style.transform = 'scale(1)';
        centerFab.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        
        centerMenu.style.opacity = '0';
        centerMenu.style.transform = 'translateX(-50%) translateY(10px) scale(0.9)';
        
        setTimeout(() => {
            centerMenu.classList.add('hidden');
        }, 200);
        
        removeBackdrop();
    }

    function addBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.id = 'fabBackdrop';
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-20 z-30 transition-opacity duration-300';
        backdrop.style.opacity = '0';
        document.body.appendChild(backdrop);
        
        setTimeout(() => {
            backdrop.style.opacity = '1';
        }, 50);
        
        backdrop.addEventListener('click', closeCenterFAB);
    }

    function removeBackdrop() {
        const backdrop = document.getElementById('fabBackdrop');
        if (backdrop) {
            backdrop.style.opacity = '0';
            setTimeout(() => {
                backdrop.remove();
            }, 300);
        }
    }

    // Initial setup for center menu
    centerMenu.style.opacity = '0';
    centerMenu.style.transform = 'translateX(-50%) translateY(10px) scale(0.9)';
    centerMenu.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
}

// Pull to Refresh functionality
function initializePullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let refreshTriggered = false;
    const threshold = 80;

    const pullIndicator = createPullIndicator();

    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    });

    document.addEventListener('touchmove', function(e) {
        if (!isPulling) return;

        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;

        if (pullDistance > 0 && pullDistance < 150) {
            e.preventDefault();
            const opacity = Math.min(pullDistance / threshold, 1);
            const rotation = (pullDistance / threshold) * 360;
            
            pullIndicator.style.opacity = opacity;
            pullIndicator.style.transform = `translateY(${pullDistance / 2}px) rotate(${rotation}deg)`;
            
            if (pullDistance > threshold && !refreshTriggered) {
                refreshTriggered = true;
                pullIndicator.style.color = '#10B981';
            }
        }
    });

    document.addEventListener('touchend', function() {
        if (!isPulling) return;
        
        isPulling = false;
        const pullDistance = currentY - startY;
        
        if (pullDistance > threshold && refreshTriggered) {
            // Trigger refresh
            pullIndicator.style.transform = 'translateY(20px) rotate(720deg)';
            showNotification('Refreshing...', 'info');
            
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            // Reset indicator
            pullIndicator.style.opacity = '0';
            pullIndicator.style.transform = 'translateY(-20px)';
        }
        
        refreshTriggered = false;
        startY = 0;
        currentY = 0;
    });
}

function createPullIndicator() {
    const indicator = document.createElement('div');
    indicator.innerHTML = '<i data-feather="refresh-cw"></i>';
    indicator.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 text-gray-600 opacity-0 transition-all duration-300 z-50';
    indicator.style.transform = 'translateX(-50%) translateY(-20px)';
    document.body.appendChild(indicator);
    
    // Replace feather icon
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    return indicator;
}

// Expense Limit Alerts
function checkExpenseLimits() {
    // Get today's expenses from dashboard data
    const expensesElement = document.querySelector('[data-today-expenses]');
    if (!expensesElement) return;
    
    const todayExpenses = parseFloat(expensesElement.textContent.replace('RM', '').replace(',', '')) || 0;
    const monthlyLimit = 5000; // Get from settings in future
    const dailyLimit = monthlyLimit / 30;
    
    // Check daily limit (80% warning, 100% danger)
    if (todayExpenses >= dailyLimit) {
        showNotification('⚠️ Had perbelanjaan harian telah dicapai!', 'error');
    } else if (todayExpenses >= dailyLimit * 0.8) {
        showNotification('🔶 80% had perbelanjaan harian telah dicapai', 'warning');
    }
}

// Dark Mode Toggle
function toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.contains('dark');
    
    if (isDark) {
        body.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
    } else {
        body.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
    }
}

function initializeDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
        document.body.classList.add('dark');
    }
}

// Enhanced Chart Functions
function createMiniChart(canvasId, data, type = 'line') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 100;
    canvas.height = 40;
    
    // Simple line chart implementation
    if (type === 'line' && data.length > 1) {
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = (index / (data.length - 1)) * canvas.width;
            const y = canvas.height - ((value - min) / range) * canvas.height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }
}

// Premium Touch Effects
function initializePremiumEffects() {
    // Add haptic feedback for supported devices
    function hapticFeedback(intensity = 'light') {
        if (navigator.vibrate) {
            const patterns = {
                light: [10],
                medium: [20],
                heavy: [50]
            };
            navigator.vibrate(patterns[intensity] || patterns.light);
        }
    }

    // Add touch effects to all interactive elements
    const interactiveElements = document.querySelectorAll('.premium-button, .nav-item, .ripple');
    
    interactiveElements.forEach(element => {
        // Touch start effect
        element.addEventListener('touchstart', function(e) {
            this.style.transform = 'scale(0.98)';
            hapticFeedback('light');
        }, { passive: true });

        // Touch end effect
        element.addEventListener('touchend', function(e) {
            setTimeout(() => {
                this.style.transform = '';
            }, 100);
        }, { passive: true });

        // Mouse press effect for desktop
        element.addEventListener('mousedown', function(e) {
            this.style.transform = 'scale(0.98)';
        });

        element.addEventListener('mouseup', function(e) {
            setTimeout(() => {
                this.style.transform = '';
            }, 100);
        });

        element.addEventListener('mouseleave', function(e) {
            this.style.transform = '';
        });
    });

    // Add loading states to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="spinner mr-2"></div>Memproses...';
                hapticFeedback('medium');
            }
        });
    });

    // Add smooth focus transitions to inputs
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
            this.parentElement.style.transition = 'transform 0.2s ease';
        });

        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });

    // Add pulse animation to active elements
    const activeElements = document.querySelectorAll('.text-shopee-orange');
    activeElements.forEach(element => {
        element.style.animation = 'pulse 2s infinite';
    });
}

// Add global touch optimization
document.addEventListener('touchstart', function(e) {
    // Prevent 300ms click delay on iOS
}, { passive: true });

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
    throttle,
    toggleDarkMode,
    createMiniChart,
    initializePremiumEffects
};

// Enhanced notification system with admin controls
function checkForNotifications() {
    fetch('/api/check-notifications')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.notifications) {
                data.notifications.forEach((notification, index) => {
                    setTimeout(() => {
                        showEnhancedNotification(notification);
                    }, (index + 1) * 5000); // Stagger notifications by 5 seconds
                });
            }
        })
        .catch(error => {
            console.log('Notification check failed, using fallback');
            checkForNotificationsFallback();
        });
}

// Show enhanced notification from API
function showEnhancedNotification(notification) {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'notification-popup fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border-l-4 border-red-500 p-4 max-w-sm transform transition-all duration-300 translate-x-full';
    
    let actionButton = '';
    if (notification.action === 'backup') {
        actionButton = `<button onclick="handleBackupAction(); this.parentElement.parentElement.remove();" class="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Backup Sekarang</button>`;
    } else if (notification.action === 'whatsapp' && notification.url) {
        actionButton = `<a href="${notification.url}" target="_blank" class="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 inline-block">Hubungi Support</a>`;
    } else if (notification.url) {
        actionButton = `<a href="${notification.url}" class="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 inline-block">Lihat</a>`;
    }
    
    notificationDiv.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <h4 class="font-semibold text-gray-800">${notification.title}</h4>
                <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
                ${actionButton}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600 ml-2">
                <i data-feather="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notificationDiv);
    feather.replace();
    
    // Animate in
    setTimeout(() => {
        notificationDiv.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (notificationDiv.parentNode) {
            notificationDiv.classList.add('translate-x-full');
            setTimeout(() => {
                if (notificationDiv.parentNode) {
                    notificationDiv.remove();
                }
            }, 300);
        }
    }, 10000);
}

// Fallback notification system for old behavior
function checkForNotificationsFallback() {
    const lastBackupCheck = localStorage.getItem('lastBackupReminder');
    const lastWhatsAppReminder = localStorage.getItem('lastWhatsAppReminder');
    const now = Date.now();
    
    // Show backup reminder every 48 hours
    if (!lastBackupCheck || now - parseInt(lastBackupCheck) > 48 * 60 * 60 * 1000) {
        setTimeout(() => {
            showBackupReminder();
            localStorage.setItem('lastBackupReminder', now.toString());
        }, 5000);
    }
    
    // Show WhatsApp support reminder every 72 hours
    if (!lastWhatsAppReminder || now - parseInt(lastWhatsAppReminder) > 72 * 60 * 60 * 1000) {
        setTimeout(() => {
            showWhatsAppSupport();
            localStorage.setItem('lastWhatsAppReminder', now.toString());
        }, 15000);
    }
}

// Handle backup action
function handleBackupAction() {
    showNotification('Backup dimulakan...', 'info');
    // Redirect to admin backup page or trigger backup
    window.location.href = '/admin';
}

// Initialize enhanced notifications
document.addEventListener('DOMContentLoaded', function() {
    // Check for notifications on page load
    checkForNotifications();
    
    // Set up periodic notification checks (every 30 minutes)
    setInterval(checkForNotifications, 30 * 60 * 1000);
});
