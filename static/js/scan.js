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
            console.warn('OpenCV not loaded, trying fallback detection');
            return this.fallbackRectangleDetection(canvas);
        }

        try {
            // Convert canvas to OpenCV Mat
            const src = cv.imread(canvas);
            const gray = new cv.Mat();
            const blur = new cv.Mat();
            const thresh = new cv.Mat();
            const edges = new cv.Mat();
            const dilated = new cv.Mat();
            const contours = new cv.MatVector();
            const hierarchy = new cv.Mat();

            // Enhanced preprocessing for receipts
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            
            // Apply bilateral filter to reduce noise while keeping edges sharp
            const filtered = new cv.Mat();
            cv.bilateralFilter(gray, filtered, 9, 75, 75);
            
            // Adaptive threshold to handle varying lighting
            cv.adaptiveThreshold(filtered, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
            
            // Apply median blur to reduce noise
            cv.medianBlur(thresh, blur, 5);
            
            // Canny edge detection with optimized parameters for receipts
            cv.Canny(blur, edges, 50, 150, 3);
            
            // Morphological operations to connect broken edges
            const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
            cv.dilate(edges, dilated, kernel);
            cv.erode(dilated, dilated, kernel);

            // Find contours
            cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

            let bestContour = null;
            let maxArea = 0;
            const imageArea = canvas.width * canvas.height;
            const minArea = imageArea * 0.01; // Very sensitive - 1% of image
            const maxAreaThreshold = imageArea * 0.98;

            for (let i = 0; i < contours.size(); i++) {
                const contour = contours.get(i);
                const area = cv.contourArea(contour);
                
                if (area > minArea && area < maxAreaThreshold) {
                    // Calculate contour properties
                    const perimeter = cv.arcLength(contour, true);
                    const epsilon = 0.01 * perimeter; // Very detailed approximation
                    const approx = new cv.Mat();
                    cv.approxPolyDP(contour, approx, epsilon, true);
                    
                    // Accept polygons with 4+ vertices
                    if (approx.rows >= 4) {
                        const rect = cv.boundingRect(contour);
                        const aspectRatio = rect.width / rect.height;
                        const rectArea = rect.width * rect.height;
                        const density = area / rectArea; // How much of bounding rect is filled
                        
                        // Receipt criteria: tall shape, good density
                        if (aspectRatio > 0.1 && aspectRatio < 5.0 && density > 0.3 && area > maxArea) {
                            maxArea = area;
                            if (bestContour) bestContour.delete();
                            bestContour = approx.clone();
                        }
                    }
                    approx.delete();
                }
                contour.delete();
            }

            // Clean up
            src.delete();
            gray.delete();
            filtered.delete();
            blur.delete();
            thresh.delete();
            edges.delete();
            dilated.delete();
            kernel.delete();
            contours.delete();
            hierarchy.delete();

            if (bestContour) {
                const allCorners = [];
                for (let i = 0; i < bestContour.rows; i++) {
                    const point = bestContour.data32S.slice(i * 2, i * 2 + 2);
                    allCorners.push({ x: point[0], y: point[1] });
                }
                
                const corners = this.findExtremeCorners(allCorners);
                bestContour.delete();
                
                console.log('Document detected with OpenCV:', corners);
                return this.orderCorners(corners);
            }

            // Fallback if no contour found
            console.log('No document detected, using fallback');
            return this.fallbackRectangleDetection(canvas);

        } catch (error) {
            console.error('OpenCV processing error:', error);
            return this.fallbackRectangleDetection(canvas);
        }
    }

    fallbackRectangleDetection(canvas) {
        // Simple fallback: assume document takes up most of the image
        const margin = Math.min(canvas.width, canvas.height) * 0.05; // 5% margin
        
        const corners = [
            { x: margin, y: margin }, // top-left
            { x: canvas.width - margin, y: margin }, // top-right  
            { x: canvas.width - margin, y: canvas.height - margin }, // bottom-right
            { x: margin, y: canvas.height - margin } // bottom-left
        ];
        
        console.log('Using fallback rectangle detection:', corners);
        return corners;
    }

    findExtremeCorners(allCorners) {
        if (allCorners.length <= 4) return allCorners;
        
        // Find extreme points to form 4 corners
        const corners = [];
        
        // Top-left: minimum x + y
        corners.push(allCorners.reduce((min, p) => (p.x + p.y < min.x + min.y) ? p : min));
        
        // Top-right: maximum x - y
        corners.push(allCorners.reduce((max, p) => (p.x - p.y > max.x - max.y) ? p : max));
        
        // Bottom-right: maximum x + y
        corners.push(allCorners.reduce((max, p) => (p.x + p.y > max.x + max.y) ? p : max));
        
        // Bottom-left: minimum x - y
        corners.push(allCorners.reduce((min, p) => (p.x - p.y < min.x - min.y) ? p : min));
        
        return corners;
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
        img.onload = async () => {
            // Process uploaded image and auto-detect document
            await this.processUploadedImage(img);
            
            // Auto-process like CamScanner: detect → crop → PDF → OCR
            setTimeout(async () => {
                await this.autoProcessDocument();
            }, 1000);
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
        console.log('Processing OCR result:', text);
        
        // Extract data from OCR text with enhanced Malaysian receipt parsing
        const extractedData = this.extractDataFromText(text);
        
        // Fill form fields if elements exist
        if (this.extractedAmount && extractedData.amount) {
            this.extractedAmount.value = extractedData.amount;
        }
        if (this.extractedDate && extractedData.date) {
            this.extractedDate.value = extractedData.date;
        }
        if (this.extractedVendor && extractedData.vendor) {
            this.extractedVendor.value = extractedData.vendor;
        }
        if (this.ocrTextArea) {
            this.ocrTextArea.value = text;
        }
        
        // Show extracted data section
        if (this.extractedData) {
            this.extractedData.style.display = 'grid';
        }
        
        // Auto-fill transaction form for immediate submission
        this.autoFillMainTransactionForm(extractedData);
        
        console.log('Extracted data:', extractedData);
    }

    autoFillMainTransactionForm(data) {
        // Auto-fill the main transaction form elements
        try {
            const amountInput = document.querySelector('input[name="amount"]');
            const descInput = document.querySelector('input[name="description"]');
            const dateInput = document.querySelector('input[name="date"]');
            const typeInput = document.querySelector('select[name="type"]');
            const channelInput = document.querySelector('select[name="channel"]');
            
            if (amountInput && data.amount) {
                amountInput.value = data.amount;
                console.log('Filled amount:', data.amount);
            }
            
            if (descInput && data.vendor) {
                descInput.value = data.vendor;
                console.log('Filled description:', data.vendor);
            }
            
            if (dateInput && data.date) {
                dateInput.value = data.date;
                console.log('Filled date:', data.date);
            }
            
            // Set default values for receipt scans
            if (typeInput) {
                typeInput.value = 'expense';
                console.log('Set type to expense');
            }
            
            if (channelInput) {
                channelInput.value = 'walkin';
                console.log('Set channel to walkin');
            }
            
        } catch (error) {
            console.error('Error auto-filling main form:', error);
        }
    }

    extractDataFromText(text) {
        console.log('Extracting Malaysian receipt data from:', text.substring(0, 300));
        
        const result = { amount: '', date: '', vendor: '' };
        
        // Enhanced amount extraction for Malaysian receipts
        const amountPatterns = [
            /Total\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /TOTAL\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /SubTotal\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /Cash\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /Amount\s*:?\s*RM\s*(\d+\.?\d*)/gi,
            /RM\s*(\d+\.\d{2})\s*$/gm, // RM amount at end of line
            /(\d+\.\d{2})\s*RM/gi,
            /RM\s*(\d+\.?\d*)/gi,
            /(\d{1,4}\.\d{2})(?=\s*$)/gm // Decimal amount at end of line
        ];

        let maxAmount = 0;
        let foundAmounts = [];
        
        for (const pattern of amountPatterns) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                let amount = match[1] || match[0];
                amount = amount.replace(/[^\d.]/g, '');
                const numAmount = parseFloat(amount);
                
                if (numAmount > 0 && numAmount < 10000) { // Reasonable receipt amount
                    foundAmounts.push(numAmount);
                    if (numAmount > maxAmount) {
                        maxAmount = numAmount;
                        result.amount = numAmount.toFixed(2);
                    }
                }
            }
        }
        
        console.log('Found amounts:', foundAmounts, 'Selected:', result.amount);

        // Enhanced date extraction for Malaysian format
        const datePatterns = [
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
            /(\d{1,2})\s+(Jan|Feb|Mac|Apr|Mei|Jun|Jul|Ogo|Sep|Okt|Nov|Dis)\s+(\d{4})/gi,
            /(\d{2})\/(\d{2})\/(\d{4})/g,
            /(\d{2})-(\d{2})-(\d{4})/g
        ];

        for (const pattern of datePatterns) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                try {
                    let dateStr = match[0];
                    
                    // Convert Malaysian month names to English
                    dateStr = dateStr.replace(/Mac/gi, 'Mar');
                    dateStr = dateStr.replace(/Mei/gi, 'May');
                    dateStr = dateStr.replace(/Ogo/gi, 'Aug');
                    dateStr = dateStr.replace(/Okt/gi, 'Oct');
                    dateStr = dateStr.replace(/Dis/gi, 'Dec');
                    
                    let date;
                    if (match[3] && match[3].length === 4) {
                        // Has year as 4 digits
                        if (dateStr.includes('Jan') || dateStr.includes('Feb') || dateStr.includes('Mar')) {
                            // Month name format
                            date = new Date(dateStr);
                        } else {
                            // Numeric DD/MM/YYYY or MM/DD/YYYY
                            date = new Date(match[3], match[2] - 1, match[1]);
                        }
                    }
                    
                    if (date && !isNaN(date.getTime()) && date.getFullYear() > 2020 && date.getFullYear() < 2030) {
                        result.date = date.toISOString().split('T')[0];
                        console.log('Found date:', result.date);
                        break;
                    }
                } catch (e) {
                    console.log('Date parsing error:', e);
                }
            }
            if (result.date) break;
        }

        // Enhanced vendor extraction for Malaysian businesses
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Look for vendor in first few lines, prioritizing business names
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i].trim();
            
            // Skip obvious non-vendor lines
            if (line.match(/^\d+$/) || // Just numbers
                line.match(/^[\/\-_=]+$/) || // Just separators
                line.toLowerCase().includes('receipt') ||
                line.toLowerCase().includes('invoice') ||
                line.toLowerCase().includes('tax') ||
                line.toLowerCase().includes('gst') ||
                line.toLowerCase().includes('date') ||
                line.toLowerCase().includes('time') ||
                line.match(/RM\s*\d/) || // Price lines
                line.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) || // Date lines
                line.match(/^\d{1,2}-\d{1,2}-\d{4}/) || // Date lines
                line.length < 3 || line.length > 60) {
                continue;
            }
            
            // Prioritize lines that look like business names
            if (line.match(/sdn\s*bhd/gi) || // Malaysian company suffix
                line.match(/\b(kedai|restoran|cafe|shop|store|mart|enterprise|trading)\b/gi) || // Business keywords
                (line.length > 5 && line.length < 40 && 
                 !line.match(/\d{4}/) && // No years
                 !line.match(/\d+\.\d{2}/) && // No amounts
                 line.match(/[a-zA-Z].*[a-zA-Z]/))) { // Has letters at start and end
                result.vendor = line;
                console.log('Found vendor:', result.vendor);
                break;
            }
        }
        
        // If still no vendor, try fallback
        if (!result.vendor && lines.length > 0) {
            for (let i = 0; i < Math.min(5, lines.length); i++) {
                const line = lines[i].trim();
                if (line.length > 3 && line.length < 50 && 
                    !line.match(/\d{4}/) && 
                    !line.match(/RM\s*\d/) &&
                    !line.match(/^\d+$/) &&
                    line.match(/[a-zA-Z]/)) {
                    result.vendor = line;
                    console.log('Fallback vendor:', result.vendor);
                    break;
                }
            }
        }

        console.log('Final extracted data:', result);
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

    async autoProcessDocument() {
        console.log('Starting auto-processing...');
        this.showProcessingIndicator(true);
        
        try {
            // Step 1: Ensure we have detected corners or use fallback
            if (!this.documentCorners) {
                console.log('No document corners detected, detecting now...');
                const corners = await this.detectDocumentBorders(this.canvas);
                if (corners) {
                    this.documentCorners = corners;
                    console.log('Document detected:', corners);
                } else {
                    console.log('Using fallback detection');
                    this.documentCorners = this.fallbackRectangleDetection(this.canvas);
                }
            }
            
            // Step 2: Auto-crop document
            console.log('Auto-cropping document...');
            await this.autoCropDocument();
            
            // Wait a moment for cropping to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 3: Generate PDF automatically  
            console.log('Generating PDF...');
            await this.generatePDF();
            
            // Wait a moment for PDF generation
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 4: Run OCR to extract data
            console.log('Running OCR...');
            await this.runOCR();
            
            // Step 5: Show final results
            console.log('Showing results...');
            this.showFinalResults();
            
        } catch (error) {
            console.error('Auto-processing failed:', error);
            this.showProcessingIndicator(false);
            
            // Show manual entry as fallback
            this.showManualEntry();
            alert('Auto-processing failed. Please enter transaction details manually.');
        }
    }
    
    showFinalResults() {
        // Hide processing indicators
        this.showProcessingIndicator(false);
        
        // Show results section
        if (this.resultsSection) {
            this.resultsSection.style.display = 'block';
        }
        
        // Show PDF preview if available
        if (this.pdfBlob && this.pdfPreview) {
            this.pdfPreview.style.display = 'block';
        }
        
        // Show OCR results if available
        if (this.ocrResult && this.ocrResults) {
            this.ocrResults.style.display = 'block';
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