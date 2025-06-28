/**
 * CamScanner-style Document Scanner
 * Uses OpenCV.js, Tesseract.js, and jsPDF from CDN
 * Auto-detects document borders, crops, enhances, OCR, and generates PDF
 */

class DocumentScanner {
    constructor() {
        this.video = null;
        this.canvas = null;
        this.overlayCanvas = null;
        this.processCanvas = null;
        this.stream = null;
        this.isDetecting = false;
        this.detectedCorners = null;
        this.croppedImage = null;
        this.pdfDoc = null;
        
        this.initializeElements();
        this.bindEvents();
        this.waitForOpenCV();
    }

    initializeElements() {
        this.video = document.getElementById('cameraStream');
        this.canvas = document.getElementById('captureCanvas');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.processCanvas = document.getElementById('processCanvas');
        this.cameraContainer = document.getElementById('cameraContainer');
        this.cameraPlaceholder = document.getElementById('cameraPlaceholder');
        this.captureBtn = document.getElementById('captureBtn');
        this.scanningIndicator = document.getElementById('scanningIndicator');
        
        // Result elements
        this.croppedPreview = document.getElementById('croppedPreview');
        this.pdfPreview = document.getElementById('pdfPreview');
        this.ocrResults = document.getElementById('ocrResults');
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
        
        // File upload alternative
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

        const resetScanBtn = document.getElementById('resetScan');
        if (resetScanBtn) {
            resetScanBtn.addEventListener('click', () => this.resetScan());
        }
    }

    async waitForOpenCV() {
        // Wait for OpenCV to load
        const checkOpenCV = () => {
            if (typeof cv !== 'undefined' && cv.Mat) {
                console.log('OpenCV.js loaded successfully');
                return true;
            }
            return false;
        };

        if (!checkOpenCV()) {
            console.log('Waiting for OpenCV.js to load...');
            const interval = setInterval(() => {
                if (checkOpenCV()) {
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // Back camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            this.video.srcObject = this.stream;
            await this.video.play();

            // Setup canvases
            this.setupCanvases();
            
            // Hide placeholder, show video
            this.cameraPlaceholder.style.display = 'none';
            this.video.classList.remove('hidden');
            this.overlayCanvas.classList.remove('hidden');
            this.captureBtn.classList.remove('hidden');

            // Start document detection
            this.startDocumentDetection();

        } catch (error) {
            console.error('Camera access denied:', error);
            alert('Camera access required for document scanning. Please allow camera permission.');
        }
    }

    setupCanvases() {
        const rect = this.video.getBoundingClientRect();
        
        // Set canvas dimensions to match video
        [this.canvas, this.overlayCanvas].forEach(canvas => {
            canvas.width = this.video.videoWidth || 640;
            canvas.height = this.video.videoHeight || 480;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
        });

        // Processing canvas for OpenCV
        this.processCanvas.width = this.video.videoWidth || 640;
        this.processCanvas.height = this.video.videoHeight || 480;
    }

    startDocumentDetection() {
        if (this.isDetecting) return;
        this.isDetecting = true;
        this.detectDocumentLoop();
    }

    async detectDocumentLoop() {
        if (!this.isDetecting || !this.video || this.video.readyState !== 4) {
            requestAnimationFrame(() => this.detectDocumentLoop());
            return;
        }

        try {
            // Draw current frame to process canvas
            const ctx = this.processCanvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0, this.processCanvas.width, this.processCanvas.height);

            // Detect document borders
            const corners = await this.detectDocumentBorders(this.processCanvas);
            
            if (corners && corners.length === 4) {
                this.detectedCorners = corners;
                this.drawDocumentOverlay(corners);
                this.showScanningIndicator(true);
            } else {
                this.clearDocumentOverlay();
                this.showScanningIndicator(false);
            }

        } catch (error) {
            console.error('Detection error:', error);
        }

        // Continue detection loop
        requestAnimationFrame(() => this.detectDocumentLoop());
    }

    async detectDocumentBorders(canvas) {
        if (typeof cv === 'undefined') {
            console.warn('OpenCV not available, using fallback detection');
            return this.fallbackRectangleDetection(canvas);
        }

        try {
            const src = cv.imread(canvas);
            const gray = new cv.Mat();
            const blur = new cv.Mat();
            const edges = new cv.Mat();
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();

            // Convert to grayscale
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            
            // Gaussian blur to reduce noise
            cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
            
            // Canny edge detection
            cv.Canny(blur, edges, 50, 150);
            
            // Find contours
            cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let bestContour = null;
            let maxArea = 0;
            const minArea = canvas.width * canvas.height * 0.1; // At least 10% of image

            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);
                
                if (area > minArea && area > maxArea) {
                    const epsilon = 0.02 * cv.arcLength(contour, true);
                    const approx = new cv.Mat();
                    cv.approxPolyDP(contour, approx, epsilon, true);
                    
                    if (approx.rows >= 4) {
                        maxArea = area;
                        if (bestContour) bestContour.delete();
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
                const corners = this.extractCorners(bestContour);
                bestContour.delete();
                return this.orderCorners(corners);
            }

            return null;

        } catch (error) {
            console.error('OpenCV detection error:', error);
            return this.fallbackRectangleDetection(canvas);
        }
    }

    fallbackRectangleDetection(canvas) {
        // Simple fallback: assume document is most of the image
        const margin = Math.min(canvas.width, canvas.height) * 0.1;
        return [
            { x: margin, y: margin },
            { x: canvas.width - margin, y: margin },
            { x: canvas.width - margin, y: canvas.height - margin },
            { x: margin, y: canvas.height - margin }
        ];
    }

    extractCorners(contour) {
        const corners = [];
        for (let i = 0; i < contour.rows; i++) {
            const point = contour.data32S.slice(i * 2, i * 2 + 2);
            corners.push({ x: point[0], y: point[1] });
        }
        return this.findExtremeCorners(corners);
    }

    findExtremeCorners(points) {
        if (points.length <= 4) return points;

        const centroid = {
            x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
            y: points.reduce((sum, p) => sum + p.y, 0) / points.length
        };

        // Find 4 extreme points
        const topLeft = points.reduce((min, p) => 
            (p.x + p.y < min.x + min.y) ? p : min);
        const topRight = points.reduce((max, p) => 
            (p.x - p.y > max.x - max.y) ? p : max);
        const bottomRight = points.reduce((max, p) => 
            (p.x + p.y > max.x + max.y) ? p : max);
        const bottomLeft = points.reduce((min, p) => 
            (p.x - p.y < min.x - min.y) ? p : min);

        return [topLeft, topRight, bottomRight, bottomLeft];
    }

    orderCorners(corners) {
        if (corners.length !== 4) return corners;
        
        // Sort by distance from top-left
        corners.sort((a, b) => (a.x + a.y) - (b.x + b.y));
        
        const topLeft = corners[0];
        const bottomRight = corners[3];
        
        // Determine top-right and bottom-left
        const remaining = [corners[1], corners[2]];
        const topRight = remaining.find(p => p.x > topLeft.x);
        const bottomLeft = remaining.find(p => p.x <= topLeft.x) || remaining[0];
        
        return [topLeft, topRight || remaining[1], bottomRight, bottomLeft || remaining[1]];
    }

    drawDocumentOverlay(corners) {
        const ctx = this.overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        
        if (corners.length < 4) return;

        // Scale corners to overlay canvas
        const scaleX = this.overlayCanvas.width / this.processCanvas.width;
        const scaleY = this.overlayCanvas.height / this.processCanvas.height;

        ctx.strokeStyle = '#10B981'; // Green
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';

        ctx.beginPath();
        ctx.moveTo(corners[0].x * scaleX, corners[0].y * scaleY);
        for (let i = 1; i < corners.length; i++) {
            ctx.lineTo(corners[i].x * scaleX, corners[i].y * scaleY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw corner circles
        ctx.fillStyle = '#10B981';
        corners.forEach(corner => {
            ctx.beginPath();
            ctx.arc(corner.x * scaleX, corner.y * scaleY, 8, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    clearDocumentOverlay() {
        const ctx = this.overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    showScanningIndicator(show) {
        if (this.scanningIndicator) {
            this.scanningIndicator.style.display = show ? 'block' : 'none';
        }
    }

    async captureAndProcess() {
        if (!this.detectedCorners) {
            alert('No document detected. Please position the document clearly in view.');
            return;
        }

        try {
            this.showProcessingIndicator('Capturing image...');
            
            // Capture current frame
            const ctx = this.canvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
            
            // Auto-crop document
            await this.autoCropDocument();
            
            // Generate PDF
            await this.generatePDF();
            
            // Run OCR
            await this.runOCR();
            
            this.hideProcessingIndicator();

        } catch (error) {
            console.error('Processing error:', error);
            this.hideProcessingIndicator();
            alert('Processing failed. Please try again.');
        }
    }

    async autoCropDocument() {
        if (!this.detectedCorners || typeof cv === 'undefined') {
            console.warn('Cannot crop - no corners detected or OpenCV unavailable');
            return;
        }

        try {
            const src = cv.imread(this.canvas);
            const dst = new cv.Mat();

            // Source corners (detected)
            const srcCorners = cv.matFromArray(4, 1, cv.CV_32FC2, [
                this.detectedCorners[0].x, this.detectedCorners[0].y,
                this.detectedCorners[1].x, this.detectedCorners[1].y,
                this.detectedCorners[2].x, this.detectedCorners[2].y,
                this.detectedCorners[3].x, this.detectedCorners[3].y
            ]);

            // Calculate document size
            const width = Math.max(
                this.distance(this.detectedCorners[0], this.detectedCorners[1]),
                this.distance(this.detectedCorners[2], this.detectedCorners[3])
            );
            const height = Math.max(
                this.distance(this.detectedCorners[1], this.detectedCorners[2]),
                this.distance(this.detectedCorners[3], this.detectedCorners[0])
            );

            // Destination corners (rectangle)
            const dstCorners = cv.matFromArray(4, 1, cv.CV_32FC2, [
                0, 0,
                width, 0,
                width, height,
                0, height
            ]);

            // Perspective transform
            const transform = cv.getPerspectiveTransform(srcCorners, dstCorners);
            cv.warpPerspective(src, dst, transform, new cv.Size(width, height));

            // Convert back to canvas
            cv.imshow(this.croppedPreview, dst);
            
            // Save cropped image data
            this.croppedImage = this.croppedPreview.toDataURL('image/jpeg', 0.9);

            // Clean up
            src.delete();
            dst.delete();
            srcCorners.delete();
            dstCorners.delete();
            transform.delete();

            // Show cropped preview
            document.getElementById('croppedResults').style.display = 'block';

        } catch (error) {
            console.error('Cropping error:', error);
        }
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    async generatePDF() {
        if (!this.croppedImage) {
            console.warn('No cropped image available for PDF generation');
            return;
        }

        try {
            this.showProcessingIndicator('Generating PDF...');

            // Create PDF with jsPDF
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF();
            
            // Add image to PDF
            const imgWidth = 190; // A4 width minus margins
            const imgHeight = (this.croppedPreview.height * imgWidth) / this.croppedPreview.width;
            
            pdf.addImage(this.croppedImage, 'JPEG', 10, 10, imgWidth, imgHeight);
            
            // Save PDF data
            this.pdfDoc = pdf;
            
            // Show PDF preview
            const pdfDataUri = pdf.output('datauristring');
            if (this.pdfPreview) {
                this.pdfPreview.src = pdfDataUri;
                document.getElementById('pdfResults').style.display = 'block';
            }

        } catch (error) {
            console.error('PDF generation error:', error);
        }
    }

    async runOCR() {
        if (!this.croppedImage) {
            console.warn('No cropped image for OCR');
            return;
        }

        try {
            this.showProcessingIndicator('Extracting text...');

            const worker = await Tesseract.createWorker('eng');
            const { data: { text } } = await worker.recognize(this.croppedImage);
            await worker.terminate();

            // Extract data from OCR text
            const extractedData = this.extractMalaysianReceiptData(text);
            
            // Fill form fields
            if (this.extractedAmount) this.extractedAmount.value = extractedData.amount || '';
            if (this.extractedDate) this.extractedDate.value = extractedData.date || new Date().toISOString().split('T')[0];
            if (this.extractedVendor) this.extractedVendor.value = extractedData.vendor || '';
            if (this.ocrTextArea) this.ocrTextArea.value = text;

            // Show OCR results
            if (this.ocrResults) {
                this.ocrResults.style.display = 'block';
            }

        } catch (error) {
            console.error('OCR error:', error);
        }
    }

    extractMalaysianReceiptData(text) {
        const data = { amount: '', date: '', vendor: '' };

        // Enhanced amount extraction
        const amountPatterns = [
            /Total\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /TOTAL\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /RM\s*(\d+\.\d{2})/gi,
            /(\d+\.\d{2})\s*RM/gi
        ];

        let maxAmount = 0;
        for (const pattern of amountPatterns) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                const amount = parseFloat(match[1]);
                if (amount > maxAmount && amount < 10000) {
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
                !line.match(/\d{4}/) && !line.match(/RM\s*\d/)) {
                data.vendor = line;
                break;
            }
        }

        return data;
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Draw to canvas
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                const ctx = this.canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Process uploaded image
                this.processUploadedImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async processUploadedImage() {
        try {
            // Try to detect document in uploaded image
            const corners = await this.detectDocumentBorders(this.canvas);
            if (corners) {
                this.detectedCorners = corners;
                await this.autoCropDocument();
                await this.generatePDF();
                await this.runOCR();
            } else {
                // If no detection, use whole image
                this.croppedImage = this.canvas.toDataURL('image/jpeg', 0.9);
                await this.generatePDF();
                await this.runOCR();
            }
        } catch (error) {
            console.error('Upload processing error:', error);
        }
    }

    useExtractedData() {
        // Auto-fill main transaction form
        const amount = this.extractedAmount?.value;
        const description = this.extractedVendor?.value;
        const date = this.extractedDate?.value;

        if (amount) {
            const amountInput = document.querySelector('input[name="amount"]');
            if (amountInput) amountInput.value = amount;
        }
        
        if (description) {
            const descInput = document.querySelector('input[name="description"]');
            if (descInput) descInput.value = description;
        }
        
        if (date) {
            const dateInput = document.querySelector('input[name="date"]');
            if (dateInput) dateInput.value = date;
        }

        // Set expense type
        const typeInput = document.querySelector('select[name="type"]');
        if (typeInput) typeInput.value = 'expense';

        alert('Data filled in transaction form! You can now submit the transaction.');
    }

    downloadPDF() {
        if (this.pdfDoc) {
            this.pdfDoc.save(`receipt-${new Date().toISOString().split('T')[0]}.pdf`);
        }
    }

    viewPDF() {
        if (this.pdfDoc) {
            const pdfDataUri = this.pdfDoc.output('datauristring');
            window.open(pdfDataUri, '_blank');
        }
    }

    showManualEntry() {
        const manualSection = document.getElementById('manualEntrySection');
        if (manualSection) {
            manualSection.classList.remove('hidden');
            manualSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    resetScan() {
        // Reset all scan states
        this.detectedCorners = null;
        this.croppedImage = null;
        this.pdfDoc = null;
        
        // Hide result sections
        const sections = ['croppedResults', 'pdfResults', 'ocrResults', 'manualEntrySection'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.style.display = 'none';
        });
        
        // Clear form inputs
        if (this.extractedAmount) this.extractedAmount.value = '';
        if (this.extractedDate) this.extractedDate.value = '';
        if (this.extractedVendor) this.extractedVendor.value = '';
        if (this.ocrTextArea) this.ocrTextArea.value = '';
        
        // Clear overlays
        this.clearDocumentOverlay();
        this.showScanningIndicator(false);
        
        // Reset camera
        if (!this.video.classList.contains('hidden')) {
            this.startDocumentDetection();
        }
        
        console.log('Scan reset - ready for new scan');
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
        console.log('Processing complete');
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isDetecting = false;
        
        // Reset UI
        if (this.video) this.video.classList.add('hidden');
        if (this.overlayCanvas) this.overlayCanvas.classList.add('hidden');
        if (this.captureBtn) this.captureBtn.classList.add('hidden');
        if (this.cameraPlaceholder) this.cameraPlaceholder.style.display = 'flex';
    }
}

// Initialize scanner when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Document Scanner...');
    window.documentScanner = new DocumentScanner();
});