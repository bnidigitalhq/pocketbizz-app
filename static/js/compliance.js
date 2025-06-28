/**
 * PDPA Compliance & LHDN Report System for PocketBizz
 * Handles data privacy controls and Malaysian tax report formats
 */

class ComplianceManager {
    constructor() {
        this.setupPDPAControls();
        this.setupLHDNReports();
        this.initializeDataExportSystem();
    }
    
    setupPDPAControls() {
        // Add PDPA compliance controls to settings page
        this.addPDPASection();
        this.setupDataRetentionPolicies();
        this.setupConsentManagement();
    }
    
    addPDPASection() {
        const settingsPage = document.querySelector('#settings-content') || document.querySelector('.settings-container');
        if (!settingsPage) return;
        
        const pdpaSection = document.createElement('div');
        pdpaSection.className = 'bg-white rounded-lg shadow-md p-6 mt-6';
        pdpaSection.innerHTML = `
            <div class="flex items-center mb-4">
                <i data-feather="shield" class="w-6 h-6 text-blue-600 mr-3"></i>
                <h3 class="text-lg font-bold">Kawalan Privasi Data (PDPA)</h3>
            </div>
            
            <div class="space-y-4">
                <div class="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded">
                    <h4 class="font-semibold text-blue-800">Hak-hak Anda</h4>
                    <p class="text-sm text-blue-700 mt-1">
                        Di bawah PDPA Malaysia 2010, anda mempunyai hak untuk mengakses, membetulkan, dan memadamkan data peribadi anda.
                    </p>
                </div>
                
                <div class="grid md:grid-cols-2 gap-4">
                    <button onclick="complianceManager.exportUserData()" 
                            class="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        <i data-feather="download" class="w-5 h-5"></i>
                        <span>Muat Turun Data Saya</span>
                    </button>
                    
                    <button onclick="complianceManager.showDataDeletionForm()" 
                            class="flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors">
                        <i data-feather="trash-2" class="w-5 h-5"></i>
                        <span>Padam Akaun & Data</span>
                    </button>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold mb-2">Tetapan Privasi</h4>
                    <div class="space-y-3">
                        <label class="flex items-center space-x-3">
                            <input type="checkbox" id="analyticsConsent" class="form-checkbox h-4 w-4 text-blue-600" checked>
                            <span class="text-sm">Benarkan pengumpulan data analitik untuk penambahbaikan perkhidmatan</span>
                        </label>
                        
                        <label class="flex items-center space-x-3">
                            <input type="checkbox" id="marketingConsent" class="form-checkbox h-4 w-4 text-blue-600">
                            <span class="text-sm">Terima komunikasi pemasaran melalui email/WhatsApp</span>
                        </label>
                        
                        <label class="flex items-center space-x-3">
                            <input type="checkbox" id="thirdPartyConsent" class="form-checkbox h-4 w-4 text-blue-600">
                            <span class="text-sm">Kongsi data dengan rakan kongsi untuk penambahbaikan perkhidmatan</span>
                        </label>
                    </div>
                    
                    <button onclick="complianceManager.savePrivacySettings()" 
                            class="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        Simpan Tetapan
                    </button>
                </div>
                
                <div class="text-xs text-gray-500">
                    <p>Dasar Privasi kami mematuhi sepenuhnya PDPA Malaysia 2010. Data anda disimpan dengan selamat dan tidak dikongsi tanpa kebenaran anda.</p>
                    <p class="mt-2">
                        <a href="/privacy-policy" class="text-blue-600 hover:underline">Baca Dasar Privasi Penuh</a> |
                        <a href="/data-retention" class="text-blue-600 hover:underline ml-2">Polisi Penyimpanan Data</a>
                    </p>
                </div>
            </div>
        `;
        
        settingsPage.appendChild(pdpaSection);
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    async exportUserData() {
        try {
            const response = await fetch('/api/export-user-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `pocketbizz-data-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showNotification('Data anda telah dimuat turun.', 'success');
            } else {
                throw new Error('Failed to export data');
            }
        } catch (error) {
            console.error('Export failed:', error);
            this.showNotification('Gagal mengeksport data. Sila cuba lagi.', 'error');
        }
    }
    
    showDataDeletionForm() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                <h3 class="text-lg font-bold mb-4 text-red-600">Padam Akaun & Data</h3>
                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-4">
                        Tindakan ini akan memadamkan SEMUA data anda secara kekal dan tidak boleh dibatalkan.
                        Ini termasuk:
                    </p>
                    <ul class="text-sm text-gray-600 list-disc list-inside space-y-1">
                        <li>Semua transaksi dan laporan</li>
                        <li>Data inventori dan produk</li>
                        <li>Maklumat agen dan pesanan</li>
                        <li>Tetapan dan konfigurasi</li>
                        <li>Data zakat dan analitik</li>
                    </ul>
                </div>
                
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">
                        Taipkan "PADAM AKAUN" untuk mengesahkan:
                    </label>
                    <input type="text" id="deleteConfirmation" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                           placeholder="PADAM AKAUN">
                </div>
                
                <div class="flex space-x-3">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors">
                        Batal
                    </button>
                    <button onclick="complianceManager.confirmDataDeletion()" 
                            id="confirmDeleteBtn"
                            class="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            disabled>
                        Padam Semua
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Enable delete button only when correct text is entered
        const input = modal.querySelector('#deleteConfirmation');
        const button = modal.querySelector('#confirmDeleteBtn');
        
        input.addEventListener('input', () => {
            button.disabled = input.value !== 'PADAM AKAUN';
        });
    }
    
    async confirmDataDeletion() {
        try {
            const response = await fetch('/api/delete-user-data', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.showNotification('Akaun dan data anda telah dipadamkan.', 'success');
                setTimeout(() => {
                    window.location.href = '/landing';
                }, 2000);
            } else {
                throw new Error('Failed to delete data');
            }
        } catch (error) {
            console.error('Deletion failed:', error);
            this.showNotification('Gagal memadamkan data. Sila hubungi support.', 'error');
        }
    }
    
    savePrivacySettings() {
        const settings = {
            analytics: document.getElementById('analyticsConsent')?.checked || false,
            marketing: document.getElementById('marketingConsent')?.checked || false,
            thirdParty: document.getElementById('thirdPartyConsent')?.checked || false
        };
        
        localStorage.setItem('privacySettings', JSON.stringify(settings));
        this.showNotification('Tetapan privasi telah disimpan.', 'success');
        
        // Send to backend if available
        fetch('/api/privacy-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        }).catch(error => {
            console.log('Privacy settings saved locally only');
        });
    }
    
    setupLHDNReports() {
        this.addLHDNReportSection();
    }
    
    addLHDNReportSection() {
        const reportsPage = document.querySelector('#reports-content') || document.querySelector('.reports-container');
        if (!reportsPage) return;
        
        const lhdnSection = document.createElement('div');
        lhdnSection.className = 'bg-white rounded-lg shadow-md p-6 mt-6';
        lhdnSection.innerHTML = `
            <div class="flex items-center mb-4">
                <i data-feather="file-text" class="w-6 h-6 text-green-600 mr-3"></i>
                <h3 class="text-lg font-bold">Laporan LHDN Malaysia</h3>
            </div>
            
            <div class="grid md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h4 class="font-semibold">Format Laporan Cukai</h4>
                    
                    <button onclick="complianceManager.generateLHDNReport('be')" 
                            class="w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100 p-4 rounded-lg border border-blue-200 transition-colors">
                        <div class="text-left">
                            <h5 class="font-semibold text-blue-800">Borang BE (Individu)</h5>
                            <p class="text-sm text-blue-600">Laporan pendapatan individu</p>
                        </div>
                        <i data-feather="download" class="w-5 h-5 text-blue-600"></i>
                    </button>
                    
                    <button onclick="complianceManager.generateLHDNReport('c')" 
                            class="w-full flex items-center justify-between bg-green-50 hover:bg-green-100 p-4 rounded-lg border border-green-200 transition-colors">
                        <div class="text-left">
                            <h5 class="font-semibold text-green-800">Borang C (Syarikat)</h5>
                            <p class="text-sm text-green-600">Laporan cukai syarikat</p>
                        </div>
                        <i data-feather="download" class="w-5 h-5 text-green-600"></i>
                    </button>
                    
                    <button onclick="complianceManager.generateLHDNReport('gst')" 
                            class="w-full flex items-center justify-between bg-purple-50 hover:bg-purple-100 p-4 rounded-lg border border-purple-200 transition-colors">
                        <div class="text-left">
                            <h5 class="font-semibold text-purple-800">Laporan SST/GST</h5>
                            <p class="text-sm text-purple-600">Cukai jualan & perkhidmatan</p>
                        </div>
                        <i data-feather="download" class="w-5 h-5 text-purple-600"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <h4 class="font-semibold">Tetapan Laporan</h4>
                    
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium mb-1">Tahun Cukai</label>
                            <select id="taxYear" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                                <option value="2022">2022</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">No. Cukai Pendapatan</label>
                            <input type="text" id="taxNumber" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="Cth: 12345678901">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">No. SST (jika berkaitan)</label>
                            <input type="text" id="sstNumber" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                   placeholder="Cth: A12-3456-78900001">
                        </div>
                        
                        <button onclick="complianceManager.saveTaxSettings()" 
                                class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Simpan Tetapan
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div class="flex items-start space-x-3">
                    <i data-feather="info" class="w-5 h-5 text-yellow-600 mt-0.5"></i>
                    <div>
                        <h5 class="font-semibold text-yellow-800">Nota Penting</h5>
                        <p class="text-sm text-yellow-700 mt-1">
                            Laporan yang dijana mematuhi format LHDN Malaysia terkini. Sila semak dengan akauntan atau penasihat cukai sebelum penghantaran rasmi.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        reportsPage.appendChild(lhdnSection);
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
    
    async generateLHDNReport(type) {
        const taxYear = document.getElementById('taxYear')?.value || new Date().getFullYear();
        const taxNumber = document.getElementById('taxNumber')?.value || '';
        const sstNumber = document.getElementById('sstNumber')?.value || '';
        
        if (!taxNumber && (type === 'be' || type === 'c')) {
            this.showNotification('Sila masukkan No. Cukai Pendapatan.', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/generate-lhdn-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: type,
                    year: taxYear,
                    taxNumber: taxNumber,
                    sstNumber: sstNumber
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `LHDN-${type.toUpperCase()}-${taxYear}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showNotification(`Laporan LHDN ${type.toUpperCase()} telah dijana.`, 'success');
            } else {
                throw new Error('Failed to generate report');
            }
        } catch (error) {
            console.error('Report generation failed:', error);
            this.showNotification('Gagal menjana laporan. Sila cuba lagi.', 'error');
        }
    }
    
    saveTaxSettings() {
        const settings = {
            taxYear: document.getElementById('taxYear')?.value || '',
            taxNumber: document.getElementById('taxNumber')?.value || '',
            sstNumber: document.getElementById('sstNumber')?.value || ''
        };
        
        localStorage.setItem('taxSettings', JSON.stringify(settings));
        this.showNotification('Tetapan cukai telah disimpan.', 'success');
    }
    
    setupDataRetentionPolicies() {
        // Implement automatic data cleanup based on retention policies
        const retentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years in milliseconds
        
        // Check for old data that should be archived
        this.checkDataRetention(retentionPeriod);
    }
    
    checkDataRetention(retentionPeriod) {
        const oldDataThreshold = new Date(Date.now() - retentionPeriod);
        console.log('Checking data retention policies for data older than:', oldDataThreshold);
        
        // In a real implementation, this would archive or flag old data
    }
    
    setupConsentManagement() {
        // Load saved privacy settings
        const savedSettings = localStorage.getItem('privacySettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            setTimeout(() => {
                document.getElementById('analyticsConsent').checked = settings.analytics;
                document.getElementById('marketingConsent').checked = settings.marketing;
                document.getElementById('thirdPartyConsent').checked = settings.thirdParty;
            }, 1000);
        }
    }
    
    initializeDataExportSystem() {
        // Set up regular data backup reminders
        this.setupBackupReminders();
    }
    
    setupBackupReminders() {
        const lastBackup = localStorage.getItem('lastBackupDate');
        const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
        
        if (!lastBackup || new Date(lastBackup) < thirtyDaysAgo) {
            // Show backup reminder after 5 seconds
            setTimeout(() => {
                this.showBackupReminder();
            }, 5000);
        }
    }
    
    showBackupReminder() {
        const notification = document.createElement('div');
        notification.className = 'fixed bottom-20 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm z-40';
        notification.innerHTML = `
            <div class="flex items-start space-x-3">
                <i data-feather="archive" class="w-5 h-5 mt-0.5"></i>
                <div class="flex-1">
                    <h4 class="font-semibold mb-1">📋 Backup Data</h4>
                    <p class="text-sm mb-3">Sudah 30 hari sejak backup terakhir. Backup data untuk keselamatan?</p>
                    <div class="flex space-x-2">
                        <button onclick="complianceManager.exportUserData(); this.parentElement.parentElement.parentElement.parentElement.remove();" 
                                class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-100">
                            Backup Sekarang
                        </button>
                        <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" 
                                class="text-blue-200 hover:text-white text-sm">
                            Kemudian
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Re-initialize feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Auto-remove after 15 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 15000);
    }
    
    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Initialize compliance manager
document.addEventListener('DOMContentLoaded', function() {
    window.complianceManager = new ComplianceManager();
});