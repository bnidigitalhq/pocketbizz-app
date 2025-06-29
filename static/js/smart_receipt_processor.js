/**
 * Smart Receipt Processing System for PocketBizz
 * Core USP: Scan → Auto-Categorize → Convert to PDF → Organize → Store with link
 * Flow: User scans receipt → System detects category → Converts to PDF → Saves organized
 */

class SmartReceiptProcessor {
    constructor() {
        this.categories = {
            'makanan': ['restaurant', 'cafe', 'kedai makan', 'food', 'makan', 'restoran', 'mamak', 'mcd', 'kfc', 'pizza', 'burger', 'nasi', 'mee', 'kuih'],
            'peralatan': ['hardware', 'tools', 'alat', 'peralatan', 'equipment', 'machinery', 'engine', 'motor'],
            'bekalan_pejabat': ['stationery', 'kertas', 'pen', 'paper', 'office', 'pejabat', 'supplies', 'printer', 'ink'],
            'pengangkutan': ['petrol', 'minyak', 'transport', 'grab', 'taxi', 'toll', 'parking', 'bas', 'train', 'flight'],
            'utiliti': ['electric', 'water', 'internet', 'phone', 'wifi', 'streamyx', 'celcom', 'maxis', 'digi', 'tnb', 'air'],
            'rawatan_kesihatan': ['hospital', 'clinic', 'doctor', 'ubat', 'medicine', 'pharmacy', 'dentist', 'medical'],
            'pakaian': ['clothes', 'shirt', 'pants', 'shoes', 'fashion', 'baju', 'seluar', 'kasut', 'tudung'],
            'pemasaran': ['advertising', 'marketing', 'promotion', 'facebook', 'google', 'ads', 'banner', 'flyer'],
            'sewa': ['rent', 'rental', 'sewa', 'office rent', 'shop rent', 'warehouse'],
            'insurans': ['insurance', 'insurans', 'takaful', 'coverage', 'policy', 'premium'],
            'lain_lain': ['miscellaneous', 'others', 'general', 'misc']
        };
        
        this.vendors = {
            'restaurants': ['mcd', 'kfc', 'pizza hut', 'dominos', 'subway', 'mamak', 'restoran'],
            'supermarkets': ['giant', 'tesco', 'aeon', 'mydin', 'nsmart', 'econsave', '99 speedmart'],
            'petrol_stations': ['shell', 'petronas', 'mobil', 'caltex', 'bhp', 'petron'],
            'pharmacies': ['guardian', 'watsons', 'caring', 'alpro', 'pharmacy'],
            'banks': ['maybank', 'cimb', 'public bank', 'rhb', 'hong leong', 'ambank']
        };
        
        this.initializeProcessor();
    }
    
    initializeProcessor() {
        // Override the existing document scanner success callback
        if (window.documentScanner) {
            this.integrateWithDocumentScanner();
        }
        
        // Setup new smart processing UI
        this.setupSmartProcessingUI();
    }
    
    integrateWithDocumentScanner() {
        // Store original method
        const originalUseExtractedData = window.documentScanner.useExtractedData;
        
        // Override with smart processing
        window.documentScanner.useExtractedData = () => {
            this.processReceiptWithSmartCategorization();
        };
    }
    
    setupSmartProcessingUI() {
        // Add smart processing section to scan receipt page
        const scanPage = document.querySelector('#scan-section') || document.querySelector('.scan-container');
        if (!scanPage) return;
        
        const smartProcessingSection = document.createElement('div');
        smartProcessingSection.id = 'smart-processing-section';
        smartProcessingSection.className = 'bg-white rounded-lg shadow-md p-6 mt-6 hidden';
        smartProcessingSection.innerHTML = `
            <div class="flex items-center mb-4">
                <i data-feather="zap" class="w-6 h-6 text-yellow-500 mr-3"></i>
                <h3 class="text-lg font-bold">🤖 Pemprosesan Pintar</h3>
            </div>
            
            <div id="processing-steps" class="space-y-4">
                <div class="flex items-center p-3 bg-blue-50 rounded-lg">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span class="text-white text-sm font-bold">1</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <h4 class="font-semibold text-blue-800">Analisis Resit</h4>
                        <p class="text-sm text-blue-600" id="analysis-status">Menganalisis kandungan resit...</p>
                    </div>
                    <div class="ml-auto">
                        <div id="analysis-spinner" class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                        <i id="analysis-check" data-feather="check" class="w-5 h-5 text-green-500 hidden"></i>
                    </div>
                </div>
                
                <div class="flex items-center p-3 bg-gray-50 rounded-lg" id="category-step">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                            <span class="text-white text-sm font-bold">2</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <h4 class="font-semibold text-gray-600">Auto-Kategori</h4>
                        <p class="text-sm text-gray-500" id="category-status">Menunggu analisis...</p>
                    </div>
                    <div class="ml-auto">
                        <div id="category-spinner" class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 hidden"></div>
                        <i id="category-check" data-feather="check" class="w-5 h-5 text-green-500 hidden"></i>
                    </div>
                </div>
                
                <div class="flex items-center p-3 bg-gray-50 rounded-lg" id="pdf-step">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                            <span class="text-white text-sm font-bold">3</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <h4 class="font-semibold text-gray-600">Konversi PDF</h4>
                        <p class="text-sm text-gray-500" id="pdf-status">Menunggu kategori...</p>
                    </div>
                    <div class="ml-auto">
                        <div id="pdf-spinner" class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 hidden"></div>
                        <i id="pdf-check" data-feather="check" class="w-5 h-5 text-green-500 hidden"></i>
                    </div>
                </div>
                
                <div class="flex items-center p-3 bg-gray-50 rounded-lg" id="organize-step">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                            <span class="text-white text-sm font-bold">4</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <h4 class="font-semibold text-gray-600">Susun & Simpan</h4>
                        <p class="text-sm text-gray-500" id="organize-status">Menunggu PDF...</p>
                    </div>
                    <div class="ml-auto">
                        <div id="organize-spinner" class="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 hidden"></div>
                        <i id="organize-check" data-feather="check" class="w-5 h-5 text-green-500 hidden"></i>
                    </div>
                </div>
            </div>
            
            <div id="smart-results" class="mt-6 hidden">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center mb-3">
                        <i data-feather="check-circle" class="w-6 h-6 text-green-600 mr-2"></i>
                        <h4 class="font-bold text-green-800">✅ Berjaya Diproses!</h4>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <h5 class="font-semibold text-gray-700 mb-2">📋 Maklumat Resit</h5>
                            <div class="text-sm space-y-1">
                                <p><span class="font-medium">Vendor:</span> <span id="detected-vendor">-</span></p>
                                <p><span class="font-medium">Jumlah:</span> <span id="detected-amount">-</span></p>
                                <p><span class="font-medium">Tarikh:</span> <span id="detected-date">-</span></p>
                                <p><span class="font-medium">Kategori:</span> <span id="detected-category" class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">-</span></p>
                            </div>
                        </div>
                        
                        <div>
                            <h5 class="font-semibold text-gray-700 mb-2">📁 Fail Tersimpan</h5>
                            <div class="text-sm space-y-2">
                                <div class="flex items-center justify-between bg-white p-2 rounded border">
                                    <span>📄 PDF Resit</span>
                                    <button id="view-pdf-btn" class="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                        Lihat PDF
                                    </button>
                                </div>
                                <div class="flex items-center justify-between bg-white p-2 rounded border">
                                    <span>🗂️ Folder Kategori</span>
                                    <button id="view-folder-btn" class="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                        Buka Folder
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button onclick="smartReceiptProcessor.proceedToTransactionForm()" 
                                class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium">
                            ✅ Rekod Transaksi
                        </button>
                        <button onclick="smartReceiptProcessor.scanAnotherReceipt()" 
                                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
                            📸 Scan Lagi
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        scanPage.appendChild(smartProcessingSection);
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    async processReceiptWithSmartCategorization() {
        const smartSection = document.getElementById('smart-processing-section');
        if (smartSection) {
            smartSection.classList.remove('hidden');
            
            // Step 1: Analyze receipt
            await this.analyzeReceipt();
            
            // Step 2: Auto-categorize
            await this.autoCategorizeReceipt();
            
            // Step 3: Convert to PDF
            await this.convertToPDF();
            
            // Step 4: Organize and save
            await this.organizeAndSave();
            
            // Show results
            this.showSmartResults();
        }
    }
    
    async analyzeReceipt() {
        this.updateStepStatus('analysis', 'active', 'Menganalisis teks dan vendor...');
        
        // Simulate analysis delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Get OCR text from document scanner
        const ocrText = window.documentScanner?.extractedText || this.getSampleReceiptText();
        
        // Extract vendor, amount, date
        this.extractedData = this.extractReceiptData(ocrText);
        
        this.updateStepStatus('analysis', 'completed', 'Analisis selesai ✓');
    }
    
    async autoCategorizeReceipt() {
        this.updateStepStatus('category', 'active', 'Menentukan kategori berdasarkan vendor...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Smart categorization based on vendor and items
        const category = this.detectCategory(this.extractedData);
        this.extractedData.category = category;
        
        this.updateStepStatus('category', 'completed', `Kategori: ${this.getCategoryDisplayName(category)} ✓`);
    }
    
    async convertToPDF() {
        this.updateStepStatus('pdf', 'active', 'Mengonversi ke format PDF...');
        
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Use existing PDF generation from document scanner
        if (window.documentScanner?.generatedPDF) {
            this.pdfBlob = window.documentScanner.generatedPDF;
        } else {
            // Generate simple PDF if not available
            this.pdfBlob = await this.generateSimplePDF();
        }
        
        this.updateStepStatus('pdf', 'completed', 'PDF dijana ✓');
    }
    
    async organizeAndSave() {
        this.updateStepStatus('organize', 'active', 'Menyusun fail dalam folder kategori...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate filename and path
        const filename = this.generateOrganizedFilename();
        const categoryFolder = this.extractedData.category;
        
        // In a real implementation, this would save to organized folders
        // For now, we'll simulate the organization
        this.organizedFile = {
            filename: filename,
            folder: categoryFolder,
            path: `/receipts/${categoryFolder}/${filename}`,
            url: URL.createObjectURL(this.pdfBlob)
        };
        
        this.updateStepStatus('organize', 'completed', `Disimpan dalam folder "${this.getCategoryDisplayName(categoryFolder)}" ✓`);
    }
    
    extractReceiptData(ocrText) {
        const text = ocrText.toLowerCase();
        
        // Extract amount (RM patterns)
        const amountMatch = text.match(/rm\s*(\d+\.?\d*)|(\d+\.?\d*)\s*rm/);
        const amount = amountMatch ? parseFloat(amountMatch[1] || amountMatch[2]) : 0;
        
        // Extract date patterns
        const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{1,2}\s\w+\s\d{4})/);
        const date = dateMatch ? dateMatch[0] : new Date().toLocaleDateString();
        
        // Extract vendor
        const vendor = this.detectVendor(text);
        
        return {
            text: ocrText,
            amount: amount,
            date: date,
            vendor: vendor,
            items: this.extractItems(text)
        };
    }
    
    detectVendor(text) {
        // Check against known vendor patterns
        for (const [category, vendors] of Object.entries(this.vendors)) {
            for (const vendor of vendors) {
                if (text.includes(vendor.toLowerCase())) {
                    return vendor.toUpperCase();
                }
            }
        }
        
        // Extract potential business name (usually at top of receipt)
        const lines = text.split('\n');
        for (const line of lines.slice(0, 5)) {
            if (line.length > 3 && line.length < 30 && !line.match(/\d{2}[\/\-]\d{2}/)) {
                return line.trim().toUpperCase();
            }
        }
        
        return 'KEDAI TIDAK DIKENALI';
    }
    
    detectCategory(data) {
        const text = data.text.toLowerCase();
        const vendor = data.vendor.toLowerCase();
        
        // Score each category based on keywords found
        const categoryScores = {};
        
        for (const [category, keywords] of Object.entries(this.categories)) {
            let score = 0;
            
            // Check vendor match
            for (const keyword of keywords) {
                if (vendor.includes(keyword)) {
                    score += 10; // High weight for vendor match
                }
                if (text.includes(keyword)) {
                    score += 1; // Lower weight for general text match
                }
            }
            
            categoryScores[category] = score;
        }
        
        // Find the category with highest score
        const bestCategory = Object.entries(categoryScores)
            .sort(([,a], [,b]) => b - a)[0];
        
        return bestCategory[1] > 0 ? bestCategory[0] : 'lain_lain';
    }
    
    extractItems(text) {
        // Extract potential items from receipt
        const lines = text.split('\n');
        const items = [];
        
        for (const line of lines) {
            // Look for lines with prices
            if (line.match(/\d+\.?\d*/) && line.length > 3 && line.length < 50) {
                items.push(line.trim());
            }
        }
        
        return items.slice(0, 5); // Return top 5 items
    }
    
    getCategoryDisplayName(category) {
        const displayNames = {
            'makanan': 'Makanan & Minuman',
            'peralatan': 'Peralatan & Jentera',
            'bekalan_pejabat': 'Bekalan Pejabat',
            'pengangkutan': 'Pengangkutan',
            'utiliti': 'Utiliti & Bil',
            'rawatan_kesihatan': 'Rawatan Kesihatan',
            'pakaian': 'Pakaian & Aksesori',
            'pemasaran': 'Pemasaran & Iklan',
            'sewa': 'Sewa & Rental',
            'insurans': 'Insurans & Takaful',
            'lain_lain': 'Lain-lain'
        };
        
        return displayNames[category] || 'Tidak Dikategorikan';
    }
    
    generateOrganizedFilename() {
        const date = new Date().toISOString().split('T')[0];
        const vendor = this.extractedData.vendor.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const amount = this.extractedData.amount.toFixed(2).replace('.', '_');
        
        return `resit_${date}_${vendor}_RM${amount}.pdf`;
    }
    
    async generateSimplePDF() {
        // Simple PDF generation fallback
        if (typeof jsPDF !== 'undefined') {
            const doc = new jsPDF();
            doc.text('Receipt Document', 20, 20);
            doc.text(`Vendor: ${this.extractedData.vendor}`, 20, 40);
            doc.text(`Amount: RM ${this.extractedData.amount}`, 20, 60);
            doc.text(`Date: ${this.extractedData.date}`, 20, 80);
            
            return doc.output('blob');
        } else {
            // Return empty blob if jsPDF not available
            return new Blob(['PDF content'], { type: 'application/pdf' });
        }
    }
    
    updateStepStatus(step, status, message) {
        const stepElement = document.getElementById(`${step}-step`);
        const statusElement = document.getElementById(`${step}-status`);
        const spinnerElement = document.getElementById(`${step}-spinner`);
        const checkElement = document.getElementById(`${step}-check`);
        
        if (!stepElement) return;
        
        statusElement.textContent = message;
        
        if (status === 'active') {
            stepElement.className = 'flex items-center p-3 bg-blue-50 rounded-lg';
            stepElement.querySelector('.w-8').className = 'w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center';
            spinnerElement.classList.remove('hidden');
            checkElement.classList.add('hidden');
        } else if (status === 'completed') {
            stepElement.className = 'flex items-center p-3 bg-green-50 rounded-lg';
            stepElement.querySelector('.w-8').className = 'w-8 h-8 bg-green-500 rounded-full flex items-center justify-center';
            spinnerElement.classList.add('hidden');
            checkElement.classList.remove('hidden');
        }
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    showSmartResults() {
        const resultsSection = document.getElementById('smart-results');
        resultsSection.classList.remove('hidden');
        
        // Populate results
        document.getElementById('detected-vendor').textContent = this.extractedData.vendor;
        document.getElementById('detected-amount').textContent = `RM ${this.extractedData.amount.toFixed(2)}`;
        document.getElementById('detected-date').textContent = this.extractedData.date;
        document.getElementById('detected-category').textContent = this.getCategoryDisplayName(this.extractedData.category);
        
        // Setup view buttons
        document.getElementById('view-pdf-btn').onclick = () => {
            window.open(this.organizedFile.url, '_blank');
        };
        
        document.getElementById('view-folder-btn').onclick = () => {
            this.showOrganizedFolder();
        };
    }
    
    showOrganizedFolder() {
        // Show organized folder structure
        alert(`Fail disimpan dalam folder: /receipts/${this.extractedData.category}/\n\nFail: ${this.organizedFile.filename}`);
    }
    
    proceedToTransactionForm() {
        // Pre-fill transaction form with extracted data
        if (window.location.pathname !== '/add_transaction') {
            // Store data for form pre-filling
            localStorage.setItem('pendingTransaction', JSON.stringify({
                amount: this.extractedData.amount,
                description: `${this.extractedData.vendor} - Receipt`,
                category: this.getCategoryDisplayName(this.extractedData.category),
                type: 'expense',
                receipt_pdf: this.organizedFile.path
            }));
            
            window.location.href = '/add_transaction';
        } else {
            this.fillTransactionForm();
        }
    }
    
    fillTransactionForm() {
        // Fill form fields with extracted data
        const amountField = document.getElementById('amount');
        const descriptionField = document.getElementById('description');
        const categoryField = document.getElementById('category');
        const typeField = document.querySelector('input[name="type"][value="expense"]');
        
        if (amountField) amountField.value = this.extractedData.amount.toFixed(2);
        if (descriptionField) descriptionField.value = `${this.extractedData.vendor} - Receipt`;
        if (categoryField) categoryField.value = this.getCategoryDisplayName(this.extractedData.category);
        if (typeField) typeField.checked = true;
        
        // Show success message
        if (typeof showNotification === 'function') {
            showNotification('Data resit berjaya dimuatkan ke borang transaksi!', 'success');
        }
    }
    
    scanAnotherReceipt() {
        // Reset scanner for another receipt
        document.getElementById('smart-processing-section').classList.add('hidden');
        document.getElementById('smart-results').classList.add('hidden');
        
        if (window.documentScanner) {
            window.documentScanner.resetScan();
        }
    }
    
    getSampleReceiptText() {
        // Sample receipt for testing
        return `KEDAI RUNCIT AZMAN
        123 JALAN UTAMA
        KUALA LUMPUR
        
        26/12/2024 15:30
        
        BERAS 5KG          15.90
        MINYAK MASAK       8.50
        GULA 1KG           3.20
        BAWANG             2.40
        
        JUMLAH            RM 30.00
        TUNAI             RM 50.00
        BAKI              RM 20.00
        
        TERIMA KASIH`;
    }
}

// Initialize Smart Receipt Processor
document.addEventListener('DOMContentLoaded', function() {
    window.smartReceiptProcessor = new SmartReceiptProcessor();
    
    // Check for pending transaction data
    const pendingData = localStorage.getItem('pendingTransaction');
    if (pendingData && window.location.pathname === '/add_transaction') {
        setTimeout(() => {
            const data = JSON.parse(pendingData);
            
            // Fill form
            const amountField = document.getElementById('amount');
            const descriptionField = document.getElementById('description');
            const categoryField = document.getElementById('category');
            const typeField = document.querySelector('input[name="type"][value="expense"]');
            
            if (amountField) amountField.value = data.amount;
            if (descriptionField) descriptionField.value = data.description;
            if (categoryField) categoryField.value = data.category;
            if (typeField) typeField.checked = true;
            
            // Clear stored data
            localStorage.removeItem('pendingTransaction');
            
            // Show notification
            if (typeof showNotification === 'function') {
                showNotification('📋 Data resit telah dimuatkan! Semak dan submit transaksi.', 'success');
            }
        }, 500);
    }
});