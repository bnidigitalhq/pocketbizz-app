/**
 * Smart Scan Receipt System
 * Features: Document detection, auto-crop, PDF generation, OCR extraction
 * Libraries: OpenCV.js, jsPDF, Tesseract.js
 */

class SmartScanner {
    constructor() {
        this.stream = null;
        this.video = null;
        this.canvas = null;
        this.processCanvas = null;
        this.overlayCanvas = null;
        this.detectionActive = false;
        this.documentCorners = null;
        this.croppedImageData = null;
        this.pdfBlob = null;
        this.ocrResult = null;
        
        this.initializeElements();
        this.bindEvents();
        this.waitForOpenCV();
    }

    initializeElements() {
        // Video and canvas elements
        this.video = document.getElementById('cameraStream');
        this.canvas = document.getElementById('captureCanvas');
        this.processCanvas = document.getElementById('processCanvas');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        
        // Button elements
        this.startCameraBtn = document.getElementById('startCameraBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.fileInput = document.getElementById('fileInput');
        this.captureBtn = document.getElementById('captureBtn');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.cropBtn = document.getElementById('cropBtn');
        this.generatePdfBtn = document.getElementById('generatePdfBtn');
        this.runOcrBtn = document.getElementById('runOcrBtn');
        this.useDataBtn = document.getElementById('useDataBtn');
        this.editManualBtn = document.getElementById('editManualBtn');
        this.viewPdfBtn = document.getElementById('viewPdfBtn');
        this.downloadPdfBtn = document.getElementById('downloadPdfBtn');
        
        // Container elements
        this.cameraPlaceholder = document.getElementById('cameraPlaceholder');
        this.scanningIndicator = document.getElementById('scanningIndicator');
        this.processingIndicator = document.getElementById('processingIndicator');
        this.processingControls = document.getElementById('processingControls');
        this.resultsSection = document.getElementById('resultsSection');
        this.pdfPreview = document.getElementById('pdfPreview');
        this.ocrResults = document.getElementById('ocrResults');
        this.ocrLoading = document.getElementById('ocrLoading');
        this.extractedData = document.getElementById('extractedData');
        this.ocrActions = document.getElementById('ocrActions');
        this.manualEntry = document.getElementById('manualEntry');
        this.pdfAttachment = document.getElementById('pdfAttachment');
        
        // Form elements
        this.transactionForm = document.getElementById('transactionForm');
        this.extractedAmount = document.getElementById('extractedAmount');
        this.extractedDate = document.getElementById('extractedDate');
        this.extractedVendor = document.getElementById('extractedVendor');
        this.ocrTextArea = document.getElementById('ocrTextArea');
    }

    bindEvents() {
        this.startCameraBtn?.addEventListener('click', () => this.startCamera());
        this.uploadBtn?.addEventListener('click', () => this.fileInput?.click());
        this.fileInput?.addEventListener('change', (e) => this.handleFileUpload(e));
        this.captureBtn?.addEventListener('click', () => this.captureImage());
        this.retakeBtn?.addEventListener('click', () => this.resetScan());
        this.cropBtn?.addEventListener('click', () => this.autoCropDocument());
        this.generatePdfBtn?.addEventListener('click', () => this.generatePDF());
        this.runOcrBtn?.addEventListener('click', () => this.runOCR());
        this.useDataBtn?.addEventListener('click', () => this.useExtractedData());
        this.editManualBtn?.addEventListener('click', () => this.showManualEntry());
        this.viewPdfBtn?.addEventListener('click', () => this.viewPDF());
        this.downloadPdfBtn?.addEventListener('click', () => this.downloadPDF());
        this.transactionForm?.addEventListener('submit', (e) => this.submitTransaction(e));
    }

    async waitForOpenCV() {
        const checkOpenCV = () => {
            if (typeof cv !== 'undefined' && cv.Mat) {
                console.log('OpenCV.js loaded successfully');
                return true;
            }
            return false;
        };

        if (!checkOpenCV()) {
            console.log('Waiting for OpenCV.js to load...');
            setTimeout(() => this.waitForOpenCV(), 100);
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video.srcObject = this.stream;
            this.video.style.display = 'block';
            this.cameraPlaceholder.style.display = 'none';
            this.captureBtn.style.display = 'block';
            this.startCameraBtn.style.display = 'none';

            // Start document detection
            this.video.addEventListener('loadedmetadata', () => {
                this.setupOverlayCanvas();
                this.startDocumentDetection();
            });

        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Cannot access camera. Please ensure camera permissions are granted.');
        }
    }

    setupOverlayCanvas() {
        const container = document.getElementById('cameraContainer');
        const rect = container.getBoundingClientRect();
        
        this.overlayCanvas.width = this.video.videoWidth;
        this.overlayCanvas.height = this.video.videoHeight;
        this.overlayCanvas.style.display = 'block';
    }

    startDocumentDetection() {
        if (!this.detectionActive) {
            this.detectionActive = true;
            this.detectDocumentLoop();
        }
    }

    async detectDocumentLoop() {
        if (!this.detectionActive || !this.video || this.video.paused) {
            return;
        }

        try {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.video.videoWidth;
            tempCanvas.height = this.video.videoHeight;
            
            tempCtx.drawImage(this.video, 0, 0);
            
            const corners = await this.detectDocumentBorders(tempCanvas);
            
            if (corners && corners.length === 4) {
                this.documentCorners = corners;
                this.drawDocumentOverlay(corners);
                this.showScanningIndicator(true);
            } else {
                this.documentCorners = null;
                this.clearDocumentOverlay();
                this.showScanningIndicator(false);
            }

        } catch (error) {
            console.error('Document detection error:', error);
        }

        // Continue detection loop
        requestAnimationFrame(() => this.detectDocumentLoop());
    }

    async detectDocumentBorders(canvas) {
        if (typeof cv === 'undefined') {
            return null;
        }

        try {
            // Convert canvas to OpenCV Mat
            const src = cv.imread(canvas);
            const gray = new cv.Mat();
            const blur = new cv.Mat();
            const edges = new cv.Mat();
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();

            // Preprocessing
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
            cv.Canny(blur, edges, 50, 150);

            // Find contours
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let bestContour = null;
            let maxArea = 0;
            const minArea = (canvas.width * canvas.height) * 0.1; // At least 10% of image

            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);
                
                if (area > minArea && area > maxArea) {
                    // Approximate contour to polygon
                    const epsilon = 0.02 * cv.arcLength(contour, true);
                    const approx = new cv.Mat();
                    cv.approxPolyDP(contour, approx, epsilon, true);
                    
                    // Check if it's a quadrilateral
                    if (approx.rows === 4) {
                        maxArea = area;
                        bestContour = approx.clone();
                    }
                    approx.delete();
                }
                contour.delete();
            }

            // Clean up
            src.delete();
            gray.delete();
            blur.delete();
            edges.delete();
            contours.delete();
            hierarchy.delete();

            if (bestContour) {
                // Extract corner points
                const corners = [];
                for (let i = 0; i < bestContour.rows; i++) {
                    const point = bestContour.data32S.slice(i * 2, i * 2 + 2);
                    corners.push({ x: point[0], y: point[1] });
                }
                bestContour.delete();
                
                // Order corners (top-left, top-right, bottom-right, bottom-left)
                return this.orderCorners(corners);
            }

            return null;

        } catch (error) {
            console.error('OpenCV processing error:', error);
            return null;
        }
    }

    orderCorners(corners) {
        // Calculate center point
        const centerX = corners.reduce((sum, p) => sum + p.x, 0) / 4;
        const centerY = corners.reduce((sum, p) => sum + p.y, 0) / 4;

        // Sort corners by angle from center
        const sortedCorners = corners.map(corner => ({
            ...corner,
            angle: Math.atan2(corner.y - centerY, corner.x - centerX)
        })).sort((a, b) => a.angle - b.angle);

        // Reorder to: top-left, top-right, bottom-right, bottom-left
        const ordered = [];
        for (let corner of sortedCorners) {
            if (corner.x < centerX && corner.y < centerY) ordered[0] = corner; // top-left
            else if (corner.x > centerX && corner.y < centerY) ordered[1] = corner; // top-right
            else if (corner.x > centerX && corner.y > centerY) ordered[2] = corner; // bottom-right
            else ordered[3] = corner; // bottom-left
        }

        return ordered.filter(p => p); // Remove undefined elements
    }

    drawDocumentOverlay(corners) {
        if (!this.overlayCanvas || !corners || corners.length !== 4) return;

        const ctx = this.overlayCanvas.getContext('2d');
        const rect = this.overlayCanvas.getBoundingClientRect();
        const scaleX = this.overlayCanvas.width / rect.width;
        const scaleY = this.overlayCanvas.height / rect.height;

        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        // Draw border
        ctx.strokeStyle = '#10B981'; // Green
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        corners.forEach((corner, index) => {
            const x = corner.x;
            const y = corner.y;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.closePath();
        ctx.stroke();

        // Draw corner circles
        ctx.fillStyle = '#10B981';
        corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x, corner.y, 8, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    clearDocumentOverlay() {
        if (this.overlayCanvas) {
            const ctx = this.overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }
    }

    showScanningIndicator(show) {
        if (this.scanningIndicator) {
            this.scanningIndicator.style.display = show ? 'block' : 'none';
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
            this.processUploadedImage(img);
        };
        img.src = URL.createObjectURL(file);
    }

    processUploadedImage(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        // Show captured image
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.canvas.getContext('2d').drawImage(img, 0, 0);
        this.canvas.style.display = 'block';
        this.cameraPlaceholder.style.display = 'none';
        
        // Show processing controls
        this.processingControls.style.display = 'flex';
        this.startCameraBtn.style.display = 'none';
        this.uploadBtn.style.display = 'none';
        
        // Detect document in uploaded image
        this.detectAndHighlightDocument(canvas);
    }

    async detectAndHighlightDocument(canvas) {
        const corners = await this.detectDocumentBorders(canvas);
        if (corners) {
            this.documentCorners = corners;
            console.log('Document detected in uploaded image');
        }
    }

    captureImage() {
        if (!this.video) return;

        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        
        // Stop camera and detection
        this.stopCamera();
        
        // Show captured image and controls
        this.canvas.style.display = 'block';
        this.processingControls.style.display = 'flex';
        this.captureBtn.style.display = 'none';
    }

    stopCamera() {
        this.detectionActive = false;
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.video) {
            this.video.style.display = 'none';
            this.video.srcObject = null;
        }
        
        this.clearDocumentOverlay();
        this.showScanningIndicator(false);
    }

    async autoCropDocument() {
        if (!this.documentCorners || this.documentCorners.length !== 4) {
            alert('No document borders detected. Please ensure the document is clearly visible.');
            return;
        }

        this.showProcessingIndicator(true);

        try {
            const croppedCanvas = await this.performPerspectiveCorrection();
            if (croppedCanvas) {
                // Show cropped result
                this.canvas.width = croppedCanvas.width;
                this.canvas.height = croppedCanvas.height;
                this.canvas.getContext('2d').drawImage(croppedCanvas, 0, 0);
                
                // Store cropped image data
                this.croppedImageData = croppedCanvas.toDataURL('image/jpeg', 0.9);
                
                console.log('Document cropped successfully');
            }
        } catch (error) {
            console.error('Auto-crop error:', error);
            alert('Failed to crop document. Please try again.');
        }

        this.showProcessingIndicator(false);
    }

    async performPerspectiveCorrection() {
        if (typeof cv === 'undefined' || !this.documentCorners) {
            return null;
        }

        try {
            const src = cv.imread(this.canvas);
            
            // Define source points (detected corners)
            const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                this.documentCorners[0].x, this.documentCorners[0].y, // top-left
                this.documentCorners[1].x, this.documentCorners[1].y, // top-right
                this.documentCorners[2].x, this.documentCorners[2].y, // bottom-right
                this.documentCorners[3].x, this.documentCorners[3].y  // bottom-left
            ]);

            // Calculate output dimensions
            const width = Math.max(
                this.distance(this.documentCorners[0], this.documentCorners[1]),
                this.distance(this.documentCorners[2], this.documentCorners[3])
            );
            const height = Math.max(
                this.distance(this.documentCorners[0], this.documentCorners[3]),
                this.distance(this.documentCorners[1], this.documentCorners[2])
            );

            // Define destination points (rectangle)
            const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                width, 0,
                width, height,
                0, height
            ]);

            // Get perspective transform matrix
            const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
            const dst = new cv.Mat();

            // Apply perspective transform
            cv.warpPerspective(src, dst, M, new cv.Size(width, height));

            // Convert back to canvas
            const outputCanvas = document.createElement('canvas');
            cv.imshow(outputCanvas, dst);

            // Clean up
            src.delete();
            srcPoints.delete();
            dstPoints.delete();
            M.delete();
            dst.delete();

            return outputCanvas;

        } catch (error) {
            console.error('Perspective correction error:', error);
            return null;
        }
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    async generatePDF() {
        if (!this.canvas) {
            alert('No image to generate PDF from.');
            return;
        }

        this.showProcessingIndicator(true);

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Get image data
            const imgData = this.croppedImageData || this.canvas.toDataURL('image/jpeg', 0.9);
            
            // Calculate dimensions to fit A4
            const pdfWidth = 210; // A4 width in mm
            const pdfHeight = 297; // A4 height in mm
            const margin = 10;
            
            const maxWidth = pdfWidth - (margin * 2);
            const maxHeight = pdfHeight - (margin * 2);
            
            // Get image dimensions
            const img = new Image();
            img.onload = () => {
                const imgRatio = img.width / img.height;
                let drawWidth = maxWidth;
                let drawHeight = maxWidth / imgRatio;
                
                if (drawHeight > maxHeight) {
                    drawHeight = maxHeight;
                    drawWidth = maxHeight * imgRatio;
                }
                
                // Center the image
                const x = (pdfWidth - drawWidth) / 2;
                const y = (pdfHeight - drawHeight) / 2;
                
                // Add image to PDF
                pdf.addImage(imgData, 'JPEG', x, y, drawWidth, drawHeight);
                
                // Add metadata
                pdf.setFontSize(8);
                pdf.text(`Scanned: ${new Date().toLocaleString()}`, margin, pdfHeight - 5);
                
                // Generate blob
                this.pdfBlob = pdf.output('blob');
                const pdfSize = (this.pdfBlob.size / 1024).toFixed(1) + ' KB';
                
                // Show PDF preview
                this.showPDFPreview(pdfSize);
                this.showProcessingIndicator(false);
            };
            img.src = imgData;

        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF. Please try again.');
            this.showProcessingIndicator(false);
        }
    }

    showPDFPreview(size) {
        this.resultsSection.style.display = 'block';
        this.pdfPreview.style.display = 'block';
        document.getElementById('pdfSize').textContent = `Size: ${size}`;
        
        // Show OCR section
        this.ocrResults.style.display = 'block';
        this.ocrActions.style.display = 'flex';
    }

    async runOCR() {
        if (!this.canvas) {
            alert('No image available for OCR.');
            return;
        }

        this.ocrLoading.style.display = 'block';
        this.extractedData.style.display = 'none';

        try {
            const imageData = this.croppedImageData || this.canvas.toDataURL();
            
            const result = await Tesseract.recognize(imageData, 'eng+msa', {
                logger: m => console.log(m)
            });

            this.ocrResult = result.data.text;
            this.processOCRResult(this.ocrResult);

        } catch (error) {
            console.error('OCR error:', error);
            alert('OCR processing failed. Please try again.');
        }

        this.ocrLoading.style.display = 'none';
    }

    processOCRResult(text) {
        // Extract data from OCR text
        const extractedData = this.extractDataFromText(text);
        
        // Fill form fields
        if (extractedData.amount) {
            this.extractedAmount.value = extractedData.amount;
        }
        if (extractedData.date) {
            this.extractedDate.value = extractedData.date;
        }
        if (extractedData.vendor) {
            this.extractedVendor.value = extractedData.vendor;
        }
        
        this.ocrTextArea.value = text;
        this.extractedData.style.display = 'grid';
    }

    extractDataFromText(text) {
        const result = { amount: '', date: '', vendor: '' };
        
        // Extract amount (RM/MYR patterns)
        const amountPatterns = [
            /RM\s*(\d+\.?\d*)/i,
            /MYR\s*(\d+\.?\d*)/i,
            /\$\s*(\d+\.?\d*)/,
            /(\d+\.\d{2})/
        ];
        
        for (const pattern of amountPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.amount = parseFloat(match[1]).toFixed(2);
                break;
            }
        }
        
        // Extract date patterns
        const datePatterns = [
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
            /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i
        ];
        
        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                try {
                    let date;
                    if (match[0].includes('Jan') || match[0].includes('Feb')) {
                        // Month name format
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const monthIndex = months.findIndex(m => match[2].toLowerCase().includes(m.toLowerCase()));
                        date = new Date(parseInt(match[3]), monthIndex, parseInt(match[1]));
                    } else {
                        // Numeric format
                        date = new Date(match[3], match[2] - 1, match[1]);
                    }
                    result.date = date.toISOString().split('T')[0];
                    break;
                } catch (e) {
                    console.log('Date parsing error:', e);
                }
            }
        }
        
        // Extract vendor (first line that's not amount/date)
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 2);
        for (const line of lines) {
            if (!line.match(/\d+\.\d{2}/) && !line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)) {
                if (line.length > 3 && line.length < 50) {
                    result.vendor = line;
                    break;
                }
            }
        }
        
        return result;
    }

    useExtractedData() {
        // Transfer data to transaction form
        const form = this.transactionForm;
        if (this.extractedAmount.value) {
            form.querySelector('[name="amount"]').value = this.extractedAmount.value;
        }
        if (this.extractedDate.value) {
            form.querySelector('[name="date"]').value = this.extractedDate.value;
        }
        if (this.extractedVendor.value) {
            form.querySelector('[name="description"]').value = this.extractedVendor.value;
        }
        
        this.showManualEntry();
    }

    showManualEntry() {
        this.manualEntry.style.display = 'block';
        
        // Set default date if not set
        const dateInput = this.transactionForm.querySelector('[name="date"]');
        if (!dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Show PDF attachment info if available
        if (this.pdfBlob) {
            this.pdfAttachment.style.display = 'block';
            const size = (this.pdfBlob.size / 1024).toFixed(1);
            document.getElementById('pdfFileSize').textContent = `(${size} KB)`;
        }
    }

    async submitTransaction(event) {
        event.preventDefault();
        
        const formData = new FormData(this.transactionForm);
        
        // Add PDF if available
        if (this.pdfBlob) {
            formData.append('receipt_pdf', this.pdfBlob, 'receipt_scan.pdf');
        }
        
        try {
            const response = await fetch('/add_transaction', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                alert('Transaction saved successfully!');
                window.location.href = '/';
            } else {
                const error = await response.text();
                alert(`Error saving transaction: ${error}`);
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('Failed to save transaction. Please try again.');
        }
    }

    viewPDF() {
        if (this.pdfBlob) {
            const url = URL.createObjectURL(this.pdfBlob);
            window.open(url, '_blank');
        }
    }

    downloadPDF() {
        if (this.pdfBlob) {
            const url = URL.createObjectURL(this.pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `receipt_scan_${new Date().getTime()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    resetScan() {
        // Reset all states
        this.stopCamera();
        this.documentCorners = null;
        this.croppedImageData = null;
        this.pdfBlob = null;
        this.ocrResult = null;
        
        // Hide all sections
        this.canvas.style.display = 'none';
        this.processingControls.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.manualEntry.style.display = 'none';
        
        // Show initial state
        this.cameraPlaceholder.style.display = 'flex';
        this.startCameraBtn.style.display = 'inline-flex';
        this.uploadBtn.style.display = 'inline-flex';
        
        // Clear form
        if (this.transactionForm) {
            this.transactionForm.reset();
        }
    }

    showProcessingIndicator(show) {
        if (this.processingIndicator) {
            this.processingIndicator.style.display = show ? 'flex' : 'none';
        }
    }
}

// Initialize Smart Scanner when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // Create scanner instance
    window.smartScanner = new SmartScanner();
    
    console.log('Smart Scanner initialized');
});