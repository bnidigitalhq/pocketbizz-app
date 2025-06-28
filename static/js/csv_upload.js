// CSV upload functionality

function showCSVUpload() {
    document.getElementById('csvModal').classList.remove('hidden');
}

function hideCSVUpload() {
    document.getElementById('csvModal').classList.add('hidden');
    document.getElementById('csvUploadForm').reset();
}

document.addEventListener('DOMContentLoaded', function() {
    const csvForm = document.getElementById('csvUploadForm');
    
    if (csvForm) {
        csvForm.addEventListener('submit', handleCSVUpload);
    }
});

async function handleCSVUpload(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const fileInput = formData.get('csv_file');
    
    if (!fileInput || fileInput.size === 0) {
        App.showNotification('Sila pilih fail CSV', 'error');
        return;
    }
    
    // Validate file type
    if (!fileInput.name.toLowerCase().endsWith('.csv')) {
        App.showNotification('Sila pilih fail CSV yang sah', 'error');
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="spinner inline-block mr-2"></div> Memproses...';
    submitButton.disabled = true;
    
    try {
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
