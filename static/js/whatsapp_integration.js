/**
 * WhatsApp Integration System for PocketBizz
 * Provides WhatsApp support links and notifications
 */

class WhatsAppIntegration {
    constructor() {
        this.supportNumber = '+60123456789'; // Replace with actual support number
        this.businessNumber = '+60123456789'; // Replace with business number
        
        this.initializeWhatsAppLinks();
        this.setupWhatsAppNotifications();
        this.addWhatsAppFloatingButton();
    }
    
    initializeWhatsAppLinks() {
        // Update all WhatsApp links in the application
        const whatsappLinks = document.querySelectorAll('a[href*="whatsapp"], a[href="#whatsapp"]');
        
        whatsappLinks.forEach(link => {
            const message = this.getContextualMessage(link);
            link.href = this.generateWhatsAppURL(message);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        });
    }
    
    getContextualMessage(element) {
        const page = this.getCurrentPage();
        
        // Default messages based on context
        const messages = {
            landing: 'Salam, saya berminat dengan PocketBizz. Boleh explain lebih detail?',
            support: 'Salam, saya perlukan bantuan dengan PocketBizz.',
            pricing: 'Salam, saya nak tanya tentang pricing PocketBizz.',
            features: 'Salam, boleh explain features PocketBizz?',
            error: 'Salam, saya menghadapi masalah dengan PocketBizz. Boleh bantu?',
            general: 'Salam, saya nak tanya tentang PocketBizz.'
        };
        
        // Check for specific context in the element or its parent
        const context = element.getAttribute('data-whatsapp-context') || 
                       element.closest('[data-whatsapp-context]')?.getAttribute('data-whatsapp-context') ||
                       page;
        
        return messages[context] || messages.general;
    }
    
    getCurrentPage() {
        const path = window.location.pathname;
        
        if (path.includes('landing')) return 'landing';
        if (path.includes('pricing')) return 'pricing';
        if (path.includes('features')) return 'features';
        if (path.includes('support')) return 'support';
        
        return 'general';
    }
    
    generateWhatsAppURL(message) {
        const baseURL = 'https://wa.me/';
        const encodedMessage = encodeURIComponent(message);
        return `${baseURL}${this.supportNumber}?text=${encodedMessage}`;
    }
    
    setupWhatsAppNotifications() {
        // Show WhatsApp support notification for first-time users
        if (this.isFirstTimeUser()) {
            setTimeout(() => {
                this.showWhatsAppWelcomeNotification();
            }, 5000); // Show after 5 seconds
        }
        
        // Show WhatsApp help on errors
        this.setupErrorHandling();
    }
    
    isFirstTimeUser() {
        return !localStorage.getItem('pocketbizz_visited');
    }
    
    markUserAsVisited() {
        localStorage.setItem('pocketbizz_visited', 'true');
    }
    
    showWhatsAppWelcomeNotification() {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-20 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-40';
        notification.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                </div>
                <div class="flex-1">
                    <h4 class="font-semibold mb-1">👋 Selamat datang ke PocketBizz!</h4>
                    <p class="text-sm mb-3">Ada soalan? WhatsApp kami untuk bantuan 24/7 dalam Bahasa Malaysia.</p>
                    <button onclick="this.parentElement.parentElement.parentElement.remove(); window.open('${this.generateWhatsAppURL('Salam, saya baru guna PocketBizz. Boleh guide saya?')}', '_blank')" 
                            class="bg-white text-green-500 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-100">
                        💬 Chat Sekarang
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="ml-2 text-green-200 hover:text-white text-sm">
                        Tutup
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
                this.markUserAsVisited();
            }
        }, 15000);
    }
    
    setupErrorHandling() {
        // Listen for application errors
        window.addEventListener('error', (event) => {
            setTimeout(() => {
                this.showErrorWhatsAppSupport(event.message);
            }, 2000);
        });
        
        // Listen for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            setTimeout(() => {
                this.showErrorWhatsAppSupport(event.reason);
            }, 2000);
        });
    }
    
    showErrorWhatsAppSupport(errorMessage) {
        // Don't show multiple error notifications
        if (document.querySelector('.whatsapp-error-notification')) return;
        
        const notification = document.createElement('div');
        notification.className = 'whatsapp-error-notification fixed bottom-20 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm z-50';
        notification.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <i data-feather="alert-circle" class="w-5 h-5"></i>
                </div>
                <div class="flex-1">
                    <h4 class="font-semibold mb-1">Menghadapi masalah?</h4>
                    <p class="text-sm mb-3">WhatsApp support team kami untuk bantuan segera.</p>
                    <button onclick="this.parentElement.parentElement.parentElement.remove(); window.open('${this.generateWhatsAppURL(`Salam, saya menghadapi error: ${errorMessage}. Boleh bantu?`)}', '_blank')" 
                            class="bg-white text-red-500 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-100">
                        🆘 Minta Bantuan
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="ml-2 text-red-200 hover:text-white text-sm">
                        Tutup
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }
    
    addWhatsAppFloatingButton() {
        // Add floating WhatsApp button for easy access
        const floatingBtn = document.createElement('div');
        floatingBtn.className = 'fixed bottom-4 left-4 z-30';
        floatingBtn.innerHTML = `
            <button id="whatsappFloatingBtn" 
                    class="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110"
                    title="WhatsApp Support">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
            </button>
        `;
        
        document.body.appendChild(floatingBtn);
        
        // Add click handler
        document.getElementById('whatsappFloatingBtn').addEventListener('click', () => {
            const message = this.getContextualMessage({ getAttribute: () => 'support' });
            window.open(this.generateWhatsAppURL(message), '_blank');
        });
    }
    
    // Utility function to send specific WhatsApp messages
    sendWhatsAppMessage(message, context = 'general') {
        const url = this.generateWhatsAppURL(message);
        window.open(url, '_blank');
    }
    
    // Function to share transaction via WhatsApp (for future use)
    shareTransactionViaWhatsApp(transactionData) {
        const message = `*PocketBizz Transaction*\n\n` +
                       `Jenis: ${transactionData.type === 'income' ? '💰 Pendapatan' : '💸 Perbelanjaan'}\n` +
                       `Jumlah: RM ${transactionData.amount}\n` +
                       `Keterangan: ${transactionData.description}\n` +
                       `Saluran: ${transactionData.channel}\n` +
                       `Tarikh: ${new Date(transactionData.date).toLocaleDateString('ms-MY')}\n\n` +
                       `_Dihantar dari PocketBizz App_`;
        
        this.sendWhatsAppMessage(message, 'share');
    }
}

// Initialize WhatsApp integration
document.addEventListener('DOMContentLoaded', function() {
    const whatsappIntegration = new WhatsAppIntegration();
    
    // Make it globally available
    window.whatsappIntegration = whatsappIntegration;
});