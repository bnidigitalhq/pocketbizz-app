/**
 * Simple Document Scanner - Works without OpenCV
 * For Malaysian receipt scanning with OCR
 */

class SimpleScanner {
    constructor() {
        console.log('Initializing Simple Scanner...');
        this.video = null;
        this.canvas = null;
        this.stream = null;
        this.croppedImage = null;
        this.pdfDoc = null;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.video = document.getElementById('cameraStream');
        this.canvas = document.getElementById('captureCanvas');
        this.cameraContainer = document.getElementById('cameraContainer');
        this.cameraPlaceholder = document.getElementById('cameraPlaceholder');
        this.captureBtn = document.getElementById('captureBtn');
        
        // Result elements
        this.extractedAmount = document.getElementById('extractedAmount');
        this.extractedDate = document.getElementById('extractedDate');
        this.extractedVendor = document.getElementById('extractedVendor');
        this.ocrTextArea = document.getElementById('ocrTextArea');
    }

    bindEvents() {
        // Start camera when clicking placeholder
        if (this.cameraPlaceholder) {
            this.cameraPlaceholder.addEventListener('click', () => this.startCamera());
        }
        
        // Start camera button
        const startCameraBtn = document.getElementById('startCameraBtn');
        if (startCameraBtn) {
            startCameraBtn.addEventListener('click', () => this.startCamera());
        }
        
        // Upload button
        const uploadBtn = document.getElementById('uploadBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.click();
            });
        }
        
        // Capture image when clicking capture button
        if (this.captureBtn) {
            this.captureBtn.addEventListener('click', () => this.captureAndProcess());
        }
        
        // File upload
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        // Action buttons
        const useDataBtn = document.getElementById('useExtractedData');
        if (useDataBtn) {
            useDataBtn.addEventListener('click', () => this.useExtractedData());
        }
        
        const downloadPdfBtn = document.getElementById('downloadPdfBtn');
        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => this.downloadPDF());
        }

        const viewPdfBtn = document.getElementById('viewPdfBtn');
        if (viewPdfBtn) {
            viewPdfBtn.addEventListener('click', () => this.viewPDF());
        }

        const editManuallyBtn = document.getElementById('editManually');
        if (editManuallyBtn) {
            editManuallyBtn.addEventListener('click', () => this.showManualEntry());
        }
    }

    async startCamera() {
        try {
            console.log('Starting camera...');
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // Back camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video.srcObject = this.stream;
            await this.video.play();

            // Setup canvas
            this.canvas.width = this.video.videoWidth || 640;
            this.canvas.height = this.video.videoHeight || 480;
            
            // Hide placeholder, show video
            this.cameraPlaceholder.style.display = 'none';
            this.video.classList.remove('hidden');
            this.captureBtn.classList.remove('hidden');

            console.log('Camera started successfully');

        } catch (error) {
            console.error('Camera error:', error);
            alert('Camera access denied. Please allow camera permission or use file upload.');
        }
    }

    async captureAndProcess() {
        if (!this.video || this.video.readyState !== 4) {
            alert('Camera not ready. Please wait or try again.');
            return;
        }

        try {
            console.log('Capturing image...');
            this.showProcessingIndicator('Capturing image...');
            
            // Draw current frame to canvas
            const ctx = this.canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Get image data
            this.croppedImage = this.canvas.toDataURL('image/jpeg', 0.9);
            
            // Generate PDF
            await this.generatePDF();
            
            // Run OCR
            await this.runOCR();
            
            // Show results
            this.showResults();
            
            this.hideProcessingIndicator();

        } catch (error) {
            console.error('Processing error:', error);
            this.hideProcessingIndicator();
            alert('Processing failed. Please try again.');
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Processing uploaded file...');
        this.showProcessingIndicator('Processing uploaded image...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const img = new Image();
                img.onload = async () => {
                    // Draw to canvas
                    this.canvas.width = img.width;
                    this.canvas.height = img.height;
                    const ctx = this.canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data
                    this.croppedImage = this.canvas.toDataURL('image/jpeg', 0.9);
                    
                    // Generate PDF
                    await this.generatePDF();
                    
                    // Run OCR
                    await this.runOCR();
                    
                    // Show results
                    this.showResults();
                    
                    this.hideProcessingIndicator();
                };
                img.src = e.target.result;
            } catch (error) {
                console.error('Upload processing error:', error);
                this.hideProcessingIndicator();
                alert('Failed to process uploaded image.');
            }
        };
        reader.readAsDataURL(file);
    }

    async generatePDF() {
        if (!this.croppedImage || typeof jsPDF === 'undefined') {
            console.warn('Cannot generate PDF - missing image or jsPDF library');
            return;
        }

        try {
            console.log('Generating PDF...');
            this.showProcessingIndicator('Generating PDF...');

            // Create PDF with jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Add image to PDF
            const imgWidth = 190; // A4 width minus margins
            const imgHeight = (this.canvas.height * imgWidth) / this.canvas.width;
            
            pdf.addImage(this.croppedImage, 'JPEG', 10, 10, imgWidth, imgHeight);
            
            // Save PDF data
            this.pdfDoc = pdf;
            
            console.log('PDF generated successfully');

        } catch (error) {
            console.error('PDF generation error:', error);
        }
    }

    async runOCR() {
        if (!this.croppedImage || typeof Tesseract === 'undefined') {
            console.warn('Cannot run OCR - missing image or Tesseract library');
            return;
        }

        try {
            console.log('Running OCR...');
            this.showProcessingIndicator('Extracting text from receipt...');

            const worker = await Tesseract.createWorker('eng');
            const { data: { text } } = await worker.recognize(this.croppedImage);
            await worker.terminate();

            console.log('OCR completed. Text extracted:', text.substring(0, 100) + '...');

            // Extract data from OCR text
            const extractedData = this.extractMalaysianReceiptData(text);
            
            // Fill form fields
            if (this.extractedAmount && extractedData.amount) {
                this.extractedAmount.value = extractedData.amount;
            }
            if (this.extractedDate && extractedData.date) {
                this.extractedDate.value = extractedData.date;
            } else if (this.extractedDate) {
                this.extractedDate.value = new Date().toISOString().split('T')[0];
            }
            if (this.extractedVendor && extractedData.vendor) {
                this.extractedVendor.value = extractedData.vendor;
            }
            if (this.ocrTextArea) {
                this.ocrTextArea.value = text;
            }

            // Auto-fill main transaction form
            this.autoFillMainForm(extractedData);

        } catch (error) {
            console.error('OCR error:', error);
            alert('Text extraction failed. Please enter data manually.');
        }
    }

    extractMalaysianReceiptData(text) {
        console.log('Extracting Malaysian receipt data...');
        
        const data = { amount: '', date: '', vendor: '' };

        // Enhanced amount extraction
        const amountPatterns = [
            /Total\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /TOTAL\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /RM\s*(\d+\.\d{2})/gi,
            /(\d+\.\d{2})\s*RM/gi,
            /(\d{1,4}\.\d{2})(?=\s*$)/gm
        ];

        let maxAmount = 0;
        for (const pattern of amountPatterns) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                const amount = parseFloat(match[1] || match[0].replace(/[^\d.]/g, ''));
                if (amount > 0 && amount < 10000 && amount > maxAmount) {
                    maxAmount = amount;
                    data.amount = amount.toFixed(2);
                }
            }
        }

        // Date extraction
        const datePatterns = [
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    const date = new Date(match[0]);
                    if (!isNaN(date.getTime()) && date.getFullYear() > 2020) {
                        data.date = date.toISOString().split('T')[0];
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        // Vendor extraction
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const line = lines[i];
            if (line.length > 3 && line.length < 50 && 
                !line.match(/\d{4}/) && !line.match(/RM\s*\d/) &&
                !line.match(/^\d+$/) && line.match(/[a-zA-Z]/)) {
                data.vendor = line;
                break;
            }
        }

        console.log('Extracted data:', data);
        return data;
    }

    autoFillMainForm(data) {
        // Auto-fill the main transaction form
        try {
            const amountInput = document.querySelector('input[name="amount"]');
            const descInput = document.querySelector('input[name="description"]');
            const dateInput = document.querySelector('input[name="date"]');
            const typeInput = document.querySelector('select[name="type"]');
            const channelInput = document.querySelector('select[name="channel"]');
            
            if (amountInput && data.amount) {
                amountInput.value = data.amount;
            }
            
            if (descInput && data.vendor) {
                descInput.value = data.vendor;
            }
            
            if (dateInput && data.date) {
                dateInput.value = data.date;
            }
            
            // Set defaults for receipt scans
            if (typeInput) typeInput.value = 'expense';
            if (channelInput) channelInput.value = 'walkin';
            
            console.log('Main form auto-filled successfully');
            
        } catch (error) {
            console.error('Error auto-filling main form:', error);
        }
    }

    showResults() {
        // Show relevant result sections
        const sections = ['pdfPreview', 'ocrResults', 'extractedData'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.classList.remove('hidden');
                section.style.display = 'block';
            }
        });
        
        console.log('Results displayed');
    }

    useExtractedData() {
        const amount = this.extractedAmount?.value;
        const description = this.extractedVendor?.value;
        const date = this.extractedDate?.value;

        // Fill main form and show success message
        this.autoFillMainForm({ amount, vendor: description, date });
        
        alert('Data filled in transaction form! Scroll down to review and submit.');
        
        // Scroll to transaction form
        const transactionForm = document.querySelector('form[action*="add_transaction"]');
        if (transactionForm) {
            transactionForm.scrollIntoView({ behavior: 'smooth' });
        }
    }

    downloadPDF() {
        if (this.pdfDoc) {
            this.pdfDoc.save(`receipt-${new Date().toISOString().split('T')[0]}.pdf`);
        } else {
            alert('PDF not available. Please scan a receipt first.');
        }
    }

    viewPDF() {
        if (this.pdfDoc) {
            const pdfDataUri = this.pdfDoc.output('datauristring');
            window.open(pdfDataUri, '_blank');
        } else {
            alert('PDF not available. Please scan a receipt first.');
        }
    }

    showManualEntry() {
        const manualSection = document.getElementById('manualEntrySection');
        if (manualSection) {
            manualSection.classList.remove('hidden');
            manualSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showProcessingIndicator(message) {
        const indicator = document.getElementById('processingIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            const textElement = indicator.querySelector('p');
            if (textElement) textElement.textContent = message;
        }
        console.log('Processing:', message);
    }

    hideProcessingIndicator() {
        const indicator = document.getElementById('processingIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Reset UI
        if (this.video) this.video.classList.add('hidden');
        if (this.captureBtn) this.captureBtn.classList.add('hidden');
        if (this.cameraPlaceholder) this.cameraPlaceholder.style.display = 'flex';
    }
}

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Simple Document Scanner...');
    window.simpleScanner = new SimpleScanner();
});