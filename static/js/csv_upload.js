// Smart Import Tools for Multiple Platforms
const PLATFORM_MAPPINGS = {
    shopee: {
        name: 'Shopee',
        columns: {
            'Order ID': 'order_id',
            'Order Status': 'status',
            'Total Amount': 'amount',
            'Product Name': 'description',
            'Order Complete Time': 'date'
        },
        sampleHeaders: ['Order ID', 'Order Status', 'Product Name', 'Total Amount', 'Order Complete Time'],
        color: '#EE4D2D'
    },
    tiktok: {
        name: 'TikTok Shop',
        columns: {
            'Order ID': 'order_id',
            'Order Status': 'status',
            'Product Total': 'amount',
            'Product Name': 'description',
            'Order Create Time': 'date'
        },
        sampleHeaders: ['Order ID', 'Order Status', 'Product Name', 'Product Total', 'Order Create Time'],
        color: '#000000'
    },
    lazada: {
        name: 'Lazada',
        columns: {
            'Order Number': 'order_id',
            'Status': 'status',
            'Item Price': 'amount',
            'Item Name': 'description',
            'Created at': 'date'
        },
        sampleHeaders: ['Order Number', 'Status', 'Item Name', 'Item Price', 'Created at'],
        color: '#0F136D'
    }
};

function showCSVUpload() {
    document.getElementById('csvModal').classList.remove('hidden');
    initializePlatformSelector();
}

function hideCSVUpload() {
    document.getElementById('csvModal').classList.add('hidden');
    document.getElementById('csvUploadForm').reset();
    clearPreviewData();
}

function initializePlatformSelector() {
    const platformSelect = document.getElementById('platform-select');
    if (platformSelect) {
        platformSelect.innerHTML = `
            <option value="">Pilih platform...</option>
            ${Object.entries(PLATFORM_MAPPINGS).map(([key, platform]) => 
                `<option value="${key}">${platform.name}</option>`
            ).join('')}
        `;
        
        platformSelect.addEventListener('change', function() {
            updatePlatformInfo(this.value);
        });
    }
}

function updatePlatformInfo(platform) {
    const infoDiv = document.getElementById('platform-info');
    if (!platform) {
        infoDiv.innerHTML = '';
        return;
    }
    
    const platformData = PLATFORM_MAPPINGS[platform];
    infoDiv.innerHTML = `
        <div class="p-4 rounded-lg" style="background-color: ${platformData.color}10; border: 1px solid ${platformData.color}30;">
            <h3 class="font-semibold text-gray-800 mb-2">${platformData.name} CSV Format</h3>
            <p class="text-sm text-gray-600 mb-3">Header yang dijangka:</p>
            <div class="flex flex-wrap gap-2">
                ${platformData.sampleHeaders.map(header => 
                    `<span class="bg-white px-2 py-1 rounded text-xs border" style="color: ${platformData.color};">${header}</span>`
                ).join('')}
            </div>
            <div class="mt-3">
                <button type="button" onclick="downloadSampleCSV('${platform}')" 
                        class="text-sm text-blue-600 hover:underline">
                    📥 Download Sample CSV
                </button>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    const csvForm = document.getElementById('csvUploadForm');
    
    if (csvForm) {
        csvForm.addEventListener('submit', handleCSVUpload);
    }
});

function downloadSampleCSV(platform) {
    const platformData = PLATFORM_MAPPINGS[platform];
    const headers = platformData.sampleHeaders;
    
    // Create sample data
    const sampleData = [
        headers,
        ['ORD001', 'Completed', 'Sample Product 1', '29.90', '2025-01-15 10:30:00'],
        ['ORD002', 'Completed', 'Sample Product 2', '45.50', '2025-01-15 14:20:00'],
        ['ORD003', 'Completed', 'Sample Product 3', '78.00', '2025-01-15 16:45:00']
    ];
    
    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${platform}_orders.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function clearPreviewData() {
    const previewDiv = document.getElementById('csv-preview');
    if (previewDiv) {
        previewDiv.innerHTML = '';
    }
}

async function handleCSVUpload(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const fileInput = formData.get('csv_file');
    const platform = formData.get('platform');
    
    if (!fileInput || fileInput.size === 0) {
        showNotification('Sila pilih fail CSV', 'error');
        return;
    }
    
    if (!platform) {
        showNotification('Sila pilih platform', 'error');
        return;
    }
    
    // Validate file type
    if (!fileInput.name.toLowerCase().endsWith('.csv')) {
        showNotification('Sila pilih fail CSV yang sah', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="spinner inline-block mr-2"></div> Memproses...';
    submitButton.disabled = true;
    
    try {
        // Preview CSV before uploading
        const csvText = await fileInput.text();
        const isValid = await validatePlatformCSV(csvText, platform);
        
        if (!isValid) {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
            return;
        }
        
        // Add platform to form data
        formData.append('platform', platform);
        
        const response = await fetch('/upload_csv', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            App.showNotification(result.message, 'success');
            hideCSVUpload();
            
            // Refresh page to show new data
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            App.showNotification(result.error || 'Ralat memproses fail CSV', 'error');
        }
        
    } catch (error) {
        console.error('CSV upload error:', error);
        App.showNotification('Ralat rangkaian. Sila cuba lagi.', 'error');
    } finally {
        // Restore button state
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// CSV format validators
function validateShopeeCSV(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) return false;
    
    const headers = lines[0].toLowerCase();
    const requiredFields = ['order id', 'order amount', 'order date'];
    
    return requiredFields.every(field => headers.includes(field));
}

function validateTikTokCSV(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) return false;
    
    const headers = lines[0].toLowerCase();
    const requiredFields = ['order id', 'total amount', 'created time'];
    
    return requiredFields.every(field => headers.includes(field));
}

// CSV preview functionality
function previewCSV(file, source) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        const isValid = source === 'shopee' ? validateShopeeCSV(csvText) : validateTikTokCSV(csvText);
        
        if (!isValid) {
            App.showNotification(`Format CSV ${source} tidak sah. Sila semak fail anda.`, 'error');
            return;
        }
        
        // Show preview
        displayCSVPreview(csvText, source);
    };
    reader.readAsText(file);
}

function displayCSVPreview(csvText, source) {
    const lines = csvText.split('\n').slice(0, 6); // Show first 5 rows + header
    const preview = lines.map(line => line.split(',')).slice(0, 5);
    
    let previewHTML = '<div class="bg-gray-50 p-3 rounded mt-3"><h4 class="font-medium mb-2">Preview CSV:</h4>';
    previewHTML += '<div class="overflow-x-auto"><table class="min-w-full text-xs">';
    
    preview.forEach((row, index) => {
        previewHTML += '<tr class="' + (index === 0 ? 'font-medium bg-gray-100' : '') + '">';
        row.forEach(cell => {
            previewHTML += `<td class="border px-2 py-1">${cell.trim()}</td>`;
        });
        previewHTML += '</tr>';
    });
    
    previewHTML += '</table></div></div>';
    
    // Add preview to modal
    const form = document.getElementById('csvUploadForm');
    let existingPreview = form.querySelector('.csv-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'csv-preview';
    previewDiv.innerHTML = previewHTML;
    form.appendChild(previewDiv);
}

// File input change handler for preview
document.addEventListener('change', function(event) {
    if (event.target.name === 'csv_file') {
        const file = event.target.files[0];
        const source = document.querySelector('select[name="source"]').value;
        
        if (file && source) {
            previewCSV(file, source);
        }
    }
});

// Sample CSV download functions
function downloadSampleShopeeCSV() {
    const sampleData = [
        ['Order ID', 'Product Name', 'Order Amount', 'Order Date', 'Order Status'],
        ['SP001', 'Sample Product 1', '25.90', '2024-01-15', 'Completed'],
        ['SP002', 'Sample Product 2', '45.50', '2024-01-16', 'Completed'],
        ['SP003', 'Sample Product 3', '12.30', '2024-01-17', 'Completed']
    ];
    
    downloadCSV(sampleData, 'sample_shopee.csv');
}

function downloadSampleTikTokCSV() {
    const sampleData = [
        ['Order ID', 'Product', 'Total Amount', 'Created Time', 'Status'],
        ['TT001', 'Sample Item 1', '30.00', '2024-01-15 10:30:00', 'Completed'],
        ['TT002', 'Sample Item 2', '55.80', '2024-01-16 14:20:00', 'Completed'],
        ['TT003', 'Sample Item 3', '18.90', '2024-01-17 09:15:00', 'Completed']
    ];
    
    downloadCSV(sampleData, 'sample_tiktok.csv');
}

function downloadCSV(data, filename) {
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Bulk transaction processing
async function processBulkTransactions(transactions) {
    const batchSize = 10; // Process in batches to avoid overwhelming the server
    const results = [];
    
    for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        try {
            const response = await fetch('/api/bulk_transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transactions: batch })
            });
            
            const result = await response.json();
            results.push(result);
            
            // Update progress
            const progress = Math.min(100, ((i + batchSize) / transactions.length) * 100);
            updateProgressBar(progress);
            
        } catch (error) {
            console.error('Batch processing error:', error);
            results.push({ success: false, error: error.message });
        }
    }
    
    return results;
}

function updateProgressBar(percentage) {
    const progressBar = document.querySelector('.upload-progress');
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
}

// Export functions
window.CSVUpload = {
    showCSVUpload,
    hideCSVUpload,
    downloadSampleShopeeCSV,
    downloadSampleTikTokCSV,
    previewCSV,
    processBulkTransactions
};
