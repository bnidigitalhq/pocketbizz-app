/**
 * Voice Input System for PocketBizz
 * Supports Bahasa Malaysia and English recognition
 */

class VoiceInput {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.targetInput = null;
        
        this.initializeVoiceRecognition();
        this.bindEvents();
    }
    
    initializeVoiceRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            console.warn('Speech recognition not supported in this browser');
            return;
        }
        
        // Configure recognition settings
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'ms-MY'; // Bahasa Malaysia primary
        this.recognition.maxAlternatives = 3;
        
        // Event handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI('listening');
        };
        
        this.recognition.onresult = (event) => {
            const result = event.results[0][0].transcript;
            this.processVoiceResult(result);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.updateUI('error', event.error);
            this.isListening = false;
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUI('stopped');
        };
    }
    
    bindEvents() {
        // Voice input button
        const voiceBtn = document.getElementById('voiceInputBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceInput('description');
            });
        }
        
        // Add voice buttons to other forms if they exist
        this.addVoiceButtonsToInputs();
    }
    
    addVoiceButtonsToInputs() {
        const inputs = document.querySelectorAll('input[type="text"], textarea');
        inputs.forEach(input => {
            if (input.id === 'description') return; // Already has voice button
            
            // Add voice button to other text inputs
            if (input.parentElement.classList.contains('relative')) return;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'relative';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            
            const voiceBtn = document.createElement('button');
            voiceBtn.type = 'button';
            voiceBtn.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-primary transition-colors';
            voiceBtn.innerHTML = '<i data-feather="mic" class="w-4 h-4"></i>';
            voiceBtn.title = 'Tekan untuk rekod suara';
            voiceBtn.addEventListener('click', () => {
                this.toggleVoiceInput(input.id || input.name);
            });
            
            wrapper.appendChild(voiceBtn);
            
            // Re-initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        });
    }
    
    toggleVoiceInput(targetInputId) {
        if (!this.recognition) {
            this.showNotification('Browser anda tidak support voice input', 'error');
            return;
        }
        
        this.targetInput = document.getElementById(targetInputId) || document.querySelector(`[name="${targetInputId}"]`);
        
        if (!this.targetInput) {
            console.error('Target input not found:', targetInputId);
            return;
        }
        
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }
    
    startListening() {
        try {
            this.recognition.start();
            this.updateUI('starting');
        } catch (error) {
            console.error('Error starting voice recognition:', error);
            this.showNotification('Tidak dapat memulakan voice input', 'error');
        }
    }
    
    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }
    
    processVoiceResult(transcript) {
        if (!this.targetInput) return;
        
        // Clean up the transcript
        let cleanText = transcript.trim();
        
        // Malaysian-specific text processing
        cleanText = this.processMalaysianText(cleanText);
        
        // Append to existing text or replace
        const currentValue = this.targetInput.value.trim();
        if (currentValue) {
            this.targetInput.value = currentValue + ' ' + cleanText;
        } else {
            this.targetInput.value = cleanText;
        }
        
        this.updateUI('success', cleanText);
        
        // Trigger input event for any listeners
        this.targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    processMalaysianText(text) {
        // Common voice recognition corrections for Malaysian context
        const corrections = {
            'ringgit': 'RM',
            'ringgit malaysia': 'RM',
            'jualan': 'jualan',
            'belanja': 'belanja',
            'shopee': 'Shopee',
            'tiktok': 'TikTok',
            'tik tok': 'TikTok',
            'ejen': 'agent',
            'agen': 'agent',
            'walk in': 'walk-in',
            'online': 'online'
        };
        
        let correctedText = text.toLowerCase();
        
        for (const [wrong, correct] of Object.entries(corrections)) {
            correctedText = correctedText.replace(new RegExp(wrong, 'gi'), correct);
        }
        
        // Capitalize first letter
        return correctedText.charAt(0).toUpperCase() + correctedText.slice(1);
    }
    
    updateUI(status, message = '') {
        const statusDiv = document.getElementById('voiceStatus');
        const statusText = document.getElementById('voiceStatusText');
        const voiceBtn = document.getElementById('voiceInputBtn');
        
        if (!statusDiv || !statusText || !voiceBtn) return;
        
        switch (status) {
            case 'starting':
                statusDiv.classList.remove('hidden');
                statusText.textContent = 'Menyediakan mikrofon...';
                statusText.className = 'text-blue-600';
                voiceBtn.classList.add('text-blue-600');
                break;
                
            case 'listening':
                statusText.textContent = '🎤 Sedang mendengar... (tekan lagi untuk berhenti)';
                statusText.className = 'text-red-600';
                voiceBtn.classList.remove('text-gray-400');
                voiceBtn.classList.add('text-red-600');
                break;
                
            case 'success':
                statusText.textContent = `✅ Berjaya: "${message}"`;
                statusText.className = 'text-green-600';
                setTimeout(() => {
                    statusDiv.classList.add('hidden');
                    voiceBtn.classList.remove('text-red-600', 'text-blue-600');
                    voiceBtn.classList.add('text-gray-400');
                }, 3000);
                break;
                
            case 'error':
                statusText.textContent = `❌ Ralat: ${this.getErrorMessage(message)}`;
                statusText.className = 'text-red-600';
                setTimeout(() => {
                    statusDiv.classList.add('hidden');
                    voiceBtn.classList.remove('text-red-600', 'text-blue-600');
                    voiceBtn.classList.add('text-gray-400');
                }, 3000);
                break;
                
            case 'stopped':
                statusText.textContent = 'Voice input berhenti';
                statusText.className = 'text-gray-600';
                voiceBtn.classList.remove('text-red-600', 'text-blue-600');
                voiceBtn.classList.add('text-gray-400');
                setTimeout(() => {
                    statusDiv.classList.add('hidden');
                }, 2000);
                break;
        }
    }
    
    getErrorMessage(error) {
        switch (error) {
            case 'network':
                return 'Masalah rangkaian. Cuba lagi.';
            case 'not-allowed':
                return 'Mikrofon tidak dibenarkan. Sila enable permission.';
            case 'no-speech':
                return 'Tiada suara dikesan. Cuba lagi.';
            case 'audio-capture':
                return 'Mikrofon tidak tersedia.';
            default:
                return 'Tidak dapat mengenali suara. Cuba lagi.';
        }
    }
    
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialize voice input when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on pages with forms
    if (document.querySelector('form')) {
        new VoiceInput();
    }
});

// Smart auto-complete for transaction descriptions
class SmartAutoComplete {
    constructor() {
        this.commonTransactions = {
            income: [
                'Jualan produk online',
                'Jualan Shopee',
                'Jualan TikTok Shop',
                'Jualan walk-in customer',
                'Commission dari agent',
                'Jualan Lazada',
                'Jualan Instagram',
                'Jualan Facebook',
                'Deposit customer',
                'Refund dari supplier'
            ],
            expense: [
                'Belanja iklan Facebook',
                'Belanja iklan Google',
                'Belanja stok produk',
                'Bayar supplier',
                'Belanja packaging',
                'Postage dan delivery',
                'Bayar komisyen agent',
                'Belanja petrol',
                'Makan dengan client',
                'Bayar sewa kedai',
                'Belanja utilities',
                'Bayar phone bill',
                'Maintenance kenderaan',
                'Belanja office supplies'
            ]
        };
        
        this.initializeAutoComplete();
    }
    
    initializeAutoComplete() {
        const descriptionInput = document.getElementById('description');
        if (!descriptionInput) return;
        
        // Create datalist for autocomplete
        const datalist = document.createElement('datalist');
        datalist.id = 'transaction-suggestions';
        descriptionInput.setAttribute('list', 'transaction-suggestions');
        descriptionInput.parentNode.appendChild(datalist);
        
        // Update suggestions based on transaction type
        this.updateSuggestions();
        
        // Listen for transaction type changes
        const typeButtons = document.querySelectorAll('#incomeBtn, #expenseBtn');
        typeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(() => this.updateSuggestions(), 100);
            });
        });
    }
    
    updateSuggestions() {
        const typeInput = document.getElementById('transactionType');
        const datalist = document.getElementById('transaction-suggestions');
        
        if (!typeInput || !datalist) return;
        
        const currentType = typeInput.value;
        const suggestions = this.commonTransactions[currentType] || [];
        
        // Clear existing options
        datalist.innerHTML = '';
        
        // Add new options
        suggestions.forEach(suggestion => {
            const option = document.createElement('option');
            option.value = suggestion;
            datalist.appendChild(option);
        });
    }
}

// Initialize smart autocomplete
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('description')) {
        new SmartAutoComplete();
    }
});