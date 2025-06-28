// OCR functionality using Tesseract.js

let currentImageFile = null;

function openCamera() {
    // For mobile devices, directly trigger the camera input which has better support
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        document.getElementById('cameraInput').click();
        return;
    }
    
    // For desktop, check camera availability first
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        App.showNotification('Kamera tidak disokong. Cuba pilih fail sebagai gantinya.', 'warning');
        document.getElementById('fileInput').click();
        return;
    }
    
    // Check camera permission and availability
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment' // Use back camera if available
        } 
    })
    .then(function(stream) {
        // Stop the stream immediately - we just wanted to check permission
        stream.getTracks().forEach(track => track.stop());
        // Now trigger the camera input
        document.getElementById('cameraInput').click();
    })
    .catch(function(error) {
        console.error('Camera access error:', error);
        if (error.name === 'NotAllowedError') {
            App.showNotification('Akses kamera ditolak. Sila berikan kebenaran dalam tetapan browser atau pilih fail.', 'warning');
        } else {
            App.showNotification('Kamera tidak tersedia. Menggunakan pemilihan fail sebagai gantinya.', 'info');
        }
        // Fallback to file selection
        document.getElementById('fileInput').click();
    });
}

function selectFile() {
    document.getElementById('fileInput').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        App.showNotification('Sila pilih fail imej yang sah', 'error');
        return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        App.showNotification('Saiz fail terlalu besar. Sila pilih imej kurang dari 10MB', 'error');
        return;
    }
    
    currentImageFile = file;
    showImagePreview(file);
}

function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const previewSection = document.getElementById('previewSection');
            const previewImage = document.getElementById('previewImage');
            
            if (!previewSection || !previewImage) {
                console.error('Preview elements not found');
                App.showNotification('Ralat dalam paparan preview', 'error');
                return;
            }
            
            previewImage.src = e.target.result;
            previewSection.classList.remove('hidden');
            
            // Hide upload area
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea) {
                uploadArea.style.display = 'none';
            }
            
            // Add success feedback
            App.showNotification('Imej berjaya dimuat naik', 'success');
            
        } catch (error) {
            console.error('Error in showImagePreview:', error);
            App.showNotification('Ralat dalam memaparkan imej', 'error');
        }
    };
    
    reader.onerror = function() {
        App.showNotification('Ralat membaca fail imej', 'error');
    };
    
    reader.readAsDataURL(file);
}

function clearPreview() {
    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('processingSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('uploadArea').style.display = 'block';
    
    // Clear file inputs
    document.getElementById('fileInput').value = '';
    document.getElementById('cameraInput').value = '';
    currentImageFile = null;
}

async function processImage() {
    if (!currentImageFile) {
        App.showNotification('Tiada imej untuk diproses', 'error');
        return;
    }
    
    // Show processing section
    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('processingSection').classList.remove('hidden');
    
    try {
        // Check if Tesseract is available
        if (typeof Tesseract === 'undefined') {
            console.warn('Tesseract.js not available, using manual entry');
            showManualEntrySection();
            return;
        }
        
        // Create a more robust worker initialization
        const worker = Tesseract.createWorker({
            logger: m => {
                if (m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    document.getElementById('progressText').textContent = `Memproses... ${progress}%`;
                }
            }
        });
        
        // Initialize worker
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        
        // Configure for better Malaysian receipt recognition
        await worker.setParameters({
            'tessedit_char_whitelist': '0123456789.,RM /:-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
        });
        
        // Process the image
        const { data: { text } } = await worker.recognize(currentImageFile);
        
        // Terminate worker properly
        await worker.terminate();
        
        if (text.trim()) {
            processOCRResults(text);
        } else {
            throw new Error('No text detected');
        }
        
    } catch (error) {
        console.error('OCR Error:', error);
        App.showNotification('Imej tidak dapat dibaca dengan baik. Sila masukkan data secara manual.', 'warning');
        
        // Hide processing section and show manual entry as fallback
        document.getElementById('processingSection').classList.add('hidden');
        showManualEntrySection();
    }
}

function processOCRResults(text) {
    // Hide processing section
    document.getElementById('processingSection').classList.add('hidden');
    
    // Extract amount and date from text
    const extractedData = extractDataFromText(text);
    
    // Display results
    document.getElementById('detectedText').value = text;
    document.getElementById('extractedAmount').value = extractedData.amount || '';
    document.getElementById('extractedDate').value = extractedData.date || new Date().toISOString().split('T')[0];
    
    // Show results section
    document.getElementById('resultsSection').classList.remove('hidden');
}

function extractDataFromText(text) {
    const result = {
        amount: null,
        date: null
    };
    
    // Extract amounts (RM patterns)
    const amountPatterns = [
        /RM\s*(\d+(?:\.\d{2})?)/gi,
        /(\d+\.\d{2})\s*RM/gi,
        /TOTAL\s*:?\s*RM?\s*(\d+(?:\.\d{2})?)/gi,
        /AMOUNT\s*:?\s*RM?\s*(\d+(?:\.\d{2})?)/gi,
        /JUMLAH\s*:?\s*RM?\s*(\d+(?:\.\d{2})?)/gi
    ];
    
    let amounts = [];
    amountPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const amount = parseFloat(match[1]);
            if (amount > 0) {
                amounts.push(amount);
            }
        }
    });
    
    // Get the largest amount (likely to be the total)
    if (amounts.length > 0) {
        result.amount = Math.max(...amounts).toFixed(2);
    }
    
    // Extract dates
    const datePatterns = [
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g,
        /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g,
        /(\d{1,2})\s+(Jan|Feb|Mac|Apr|Mei|Jun|Jul|Aug|Sep|Okt|Nov|Dis)\s+(\d{4})/gi
    ];
    
    datePatterns.forEach(pattern => {
        const match = pattern.exec(text);
        if (match && !result.date) {
            try {
                let date;
                if (pattern.source.includes('Jan|Feb')) {
                    // Month name pattern
                    const monthMap = {
                        'Jan': '01', 'Feb': '02', 'Mac': '03', 'Apr': '04',
                        'Mei': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                        'Sep': '09', 'Okt': '10', 'Nov': '11', 'Dis': '12'
                    };
                    date = new Date(`${match[3]}-${monthMap[match[2]]}-${match[1].padStart(2, '0')}`);
                } else if (match[3] && match[3].length === 4) {
                    // YYYY-MM-DD pattern
                    date = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
                } else {
                    // DD-MM-YYYY pattern
                    date = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
                }
                
                if (!isNaN(date.getTime())) {
                    result.date = date.toISOString().split('T')[0];
                }
            } catch (e) {
                console.log('Date parsing error:', e);
            }
        }
    });
    
    return result;
}

function useExtractedData() {
    const amount = document.getElementById('extractedAmount').value;
    const date = document.getElementById('extractedDate').value;
    
    if (!amount) {
        App.showNotification('Sila masukkan jumlah yang sah', 'error');
        return;
    }
    
    // Fill in the manual form with extracted data
    document.getElementById('manualAmount').value = amount;
    document.getElementById('manualDate').value = date;
    document.getElementById('manualDescription').value = 'Dari resit yang diimbas';
    
    // Show manual entry section
    showManualEntrySection();
}

function editManually() {
    showManualEntrySection();
}

function skipOCRToManual() {
    App.showNotification('Beralih ke input manual', 'info');
    // Skip OCR processing and go directly to manual entry
    setTimeout(() => {
        showManualEntrySection();
    }, 300);
}

function showManualEntrySection() {
    try {
        // Hide OCR sections safely
        const sectionsToHide = ['previewSection', 'processingSection', 'resultsSection'];
        sectionsToHide.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('hidden');
            }
        });
        
        // Check if manual entry section exists on this page
        const manualSection = document.getElementById('manualEntrySection');
        
        if (manualSection) {
            // Show manual entry form on the same page
            manualSection.classList.remove('hidden');
            
            // Focus on amount field if it exists
            const amountField = document.getElementById('manualAmount');
            if (amountField) {
                setTimeout(() => amountField.focus(), 100);
            }
        } else {
            // Redirect to add transaction page
            const today = new Date().toISOString().split('T')[0];
            
            // Store image reference if available
            if (currentImageFile) {
                try {
                    sessionStorage.setItem('hasReceiptImage', 'true');
                    sessionStorage.setItem('receiptTimestamp', Date.now().toString());
                } catch (error) {
                    console.warn('Could not store receipt reference:', error);
                }
            }
            
            window.location.href = `/add_transaction?date=${today}&source=receipt`;
        }
        
    } catch (error) {
        console.error('Error in showManualEntrySection:', error);
        App.showNotification('Mengalihkan ke input manual...', 'info');
        // Fallback redirect
        setTimeout(() => {
            window.location.href = '/add_transaction';
        }, 500);
    }
}

// Drag and drop functionality
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    
    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('border-shopee-orange', 'bg-orange-50');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('border-shopee-orange', 'bg-orange-50');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('border-shopee-orange', 'bg-orange-50');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    currentImageFile = file;
                    showImagePreview(file);
                } else {
                    App.showNotification('Sila lepaskan fail imej sahaja', 'error');
                }
            }
        });
        
        uploadArea.addEventListener('click', function() {
            selectFile();
        });
    }
});

// Helper function to improve OCR accuracy
function preprocessImage(canvas, context) {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert to grayscale and increase contrast
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        
        // Increase contrast
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const contrastedGray = Math.max(0, Math.min(255, factor * (gray - 128) + 128));
        
        data[i] = contrastedGray;     // red
        data[i + 1] = contrastedGray; // green
        data[i + 2] = contrastedGray; // blue
    }
    
    context.putImageData(imageData, 0, 0);
    return canvas;
}

// Export functions for global access
window.OCR = {
    openCamera,
    selectFile,
    processImage,
    clearPreview,
    useExtractedData,
    editManually,
    skipOCRToManual,
    showManualEntrySection
};
