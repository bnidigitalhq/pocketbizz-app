/**
 * Advanced Analytics System for PocketBizz
 * Provides enhanced analytics, channel performance, profit margin analysis, and trend forecasting
 */

class AdvancedAnalytics {
    constructor() {
        this.chartConfig = {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        };
        
        this.initializeAnalytics();
        this.setupRealTimeUpdates();
    }
    
    async initializeAnalytics() {
        // Load Chart.js from CDN if not already loaded
        if (typeof Chart === 'undefined') {
            await this.loadChartJS();
        }
        
        this.loadAnalyticsData();
        this.setupAnalyticsUI();
    }
    
    async loadChartJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async loadAnalyticsData() {
        try {
            const response = await fetch('/api/analytics');
            if (response.ok) {
                this.analyticsData = await response.json();
            } else {
                // Fallback to generating sample data for demo
                this.analyticsData = this.generateSampleAnalyticsData();
            }
            
            this.renderAllCharts();
            
        } catch (error) {
            console.log('Loading sample analytics data for demo');
            this.analyticsData = this.generateSampleAnalyticsData();
            this.renderAllCharts();
        }
    }
    
    generateSampleAnalyticsData() {
        // Generate realistic sample data for demonstration
        const channels = ['shopee', 'tiktok', 'walkin', 'agent', 'online'];
        const now = new Date();
        const last30Days = [];
        
        // Generate last 30 days data
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            last30Days.push(date.toISOString().split('T')[0]);
        }
        
        return {
            channelPerformance: {
                shopee: { revenue: 12500, orders: 85, avgOrder: 147.06, growth: 15.3 },
                tiktok: { revenue: 8900, orders: 67, avgOrder: 132.84, growth: 28.7 },
                walkin: { revenue: 6200, orders: 45, avgOrder: 137.78, growth: -5.2 },
                agent: { revenue: 4800, orders: 32, avgOrder: 150.00, growth: 12.1 },
                online: { revenue: 3100, orders: 21, avgOrder: 147.62, growth: 8.9 }
            },
            profitMargins: {
                shopee: { margin: 22.5, cost: 9687.5, profit: 2812.5 },
                tiktok: { margin: 25.8, cost: 6600.2, profit: 2299.8 },
                walkin: { margin: 35.2, cost: 4017.6, profit: 2182.4 },
                agent: { margin: 28.1, cost: 3451.2, profit: 1348.8 },
                online: { margin: 30.5, cost: 2154.5, profit: 945.5 }
            },
            dailyTrends: last30Days.map(date => ({
                date: date,
                revenue: Math.floor(Math.random() * 1000) + 200,
                orders: Math.floor(Math.random() * 15) + 5,
                expenses: Math.floor(Math.random() * 400) + 100
            })),
            topProducts: [
                { name: 'Produk A', revenue: 5200, units: 52 },
                { name: 'Produk B', revenue: 4800, units: 48 },
                { name: 'Produk C', revenue: 3900, units: 39 },
                { name: 'Produk D', revenue: 3200, units: 32 },
                { name: 'Produk E', revenue: 2800, units: 28 }
            ],
            forecast: {
                nextMonth: {
                    revenue: 38500,
                    orders: 280,
                    profit: 11200
                },
                confidence: 85.7
            }
        };
    }
    
    setupAnalyticsUI() {
        // Add analytics containers to dashboard if they don't exist
        this.createAnalyticsSection();
    }
    
    createAnalyticsSection() {
        const dashboard = document.querySelector('.dashboard-content') || document.querySelector('main');
        if (!dashboard) return;
        
        const analyticsSection = document.createElement('div');
        analyticsSection.id = 'advanced-analytics';
        analyticsSection.className = 'mt-8 space-y-6';
        analyticsSection.innerHTML = `
            <!-- Channel Performance Section -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-bold mb-4">📊 Prestasi Saluran Jualan</h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <canvas id="channelRevenueChart" width="400" height="200"></canvas>
                    </div>
                    <div id="channelMetrics" class="space-y-3">
                        <!-- Channel metrics will be populated here -->
                    </div>
                </div>
            </div>
            
            <!-- Profit Margin Analysis -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-bold mb-4">💰 Analisis Margin Keuntungan</h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <canvas id="profitMarginChart" width="400" height="200"></canvas>
                    </div>
                    <div id="profitInsights" class="space-y-3">
                        <!-- Profit insights will be populated here -->
                    </div>
                </div>
            </div>
            
            <!-- Trend Forecasting -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-bold mb-4">📈 Ramalan Trend & Prestasi</h3>
                <div class="mb-4">
                    <canvas id="trendForecastChart" width="400" height="300"></canvas>
                </div>
                <div id="forecastInsights" class="grid md:grid-cols-3 gap-4">
                    <!-- Forecast insights will be populated here -->
                </div>
            </div>
            
            <!-- Top Products Performance -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-bold mb-4">🏆 Produk Terlaris</h3>
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <canvas id="topProductsChart" width="400" height="200"></canvas>
                    </div>
                    <div id="productInsights">
                        <!-- Product insights will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        dashboard.appendChild(analyticsSection);
    }
    
    renderAllCharts() {
        if (!this.analyticsData) return;
        
        this.renderChannelPerformanceChart();
        this.renderProfitMarginChart();
        this.renderTrendForecastChart();
        this.renderTopProductsChart();
        this.renderMetrics();
    }
    
    renderChannelPerformanceChart() {
        const ctx = document.getElementById('channelRevenueChart');
        if (!ctx) return;
        
        const data = this.analyticsData.channelPerformance;
        const channels = Object.keys(data);
        const revenues = channels.map(channel => data[channel].revenue);
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: channels.map(c => this.getChannelDisplayName(c)),
                datasets: [{
                    data: revenues,
                    backgroundColor: [
                        '#EE4D2D', // Shopee Orange
                        '#000000', // TikTok Black
                        '#10B981', // Walk-in Green
                        '#8B5CF6', // Agent Purple
                        '#3B82F6'  // Online Blue
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                ...this.chartConfig,
                plugins: {
                    ...this.chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Jumlah Pendapatan Mengikut Saluran'
                    }
                }
            }
        });
    }
    
    renderProfitMarginChart() {
        const ctx = document.getElementById('profitMarginChart');
        if (!ctx) return;
        
        const data = this.analyticsData.profitMargins;
        const channels = Object.keys(data);
        const margins = channels.map(channel => data[channel].margin);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: channels.map(c => this.getChannelDisplayName(c)),
                datasets: [{
                    label: 'Margin Keuntungan (%)',
                    data: margins,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                ...this.chartConfig,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 40,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    ...this.chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Margin Keuntungan Mengikut Saluran'
                    }
                }
            }
        });
    }
    
    renderTrendForecastChart() {
        const ctx = document.getElementById('trendForecastChart');
        if (!ctx) return;
        
        const data = this.analyticsData.dailyTrends;
        const dates = data.map(d => new Date(d.date).toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit' }));
        const revenues = data.map(d => d.revenue);
        const expenses = data.map(d => d.expenses);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Pendapatan Harian',
                        data: revenues,
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Perbelanjaan Harian',
                        data: expenses,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                ...this.chartConfig,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'RM ' + value;
                            }
                        }
                    }
                },
                plugins: {
                    ...this.chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Trend Prestasi 30 Hari Terakhir'
                    }
                }
            }
        });
    }
    
    renderTopProductsChart() {
        const ctx = document.getElementById('topProductsChart');
        if (!ctx) return;
        
        const data = this.analyticsData.topProducts;
        const products = data.map(p => p.name);
        const revenues = data.map(p => p.revenue);
        
        new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: products,
                datasets: [{
                    label: 'Pendapatan (RM)',
                    data: revenues,
                    backgroundColor: [
                        '#EE4D2D',
                        '#F59E0B',
                        '#10B981',
                        '#3B82F6',
                        '#8B5CF6'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                ...this.chartConfig,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'RM ' + value;
                            }
                        }
                    }
                },
                plugins: {
                    ...this.chartConfig.plugins,
                    title: {
                        display: true,
                        text: 'Top 5 Produk Mengikut Pendapatan'
                    }
                }
            }
        });
    }
    
    renderMetrics() {
        this.renderChannelMetrics();
        this.renderProfitInsights();
        this.renderForecastInsights();
        this.renderProductInsights();
    }
    
    renderChannelMetrics() {
        const container = document.getElementById('channelMetrics');
        if (!container) return;
        
        const data = this.analyticsData.channelPerformance;
        let html = '';
        
        Object.entries(data).forEach(([channel, metrics]) => {
            const growthColor = metrics.growth >= 0 ? 'text-green-600' : 'text-red-600';
            const growthIcon = metrics.growth >= 0 ? '📈' : '📉';
            
            html += `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <h4 class="font-semibold">${this.getChannelDisplayName(channel)}</h4>
                        <p class="text-sm text-gray-600">${metrics.orders} pesanan</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold">RM ${metrics.revenue.toLocaleString()}</p>
                        <p class="text-sm ${growthColor}">${growthIcon} ${metrics.growth}%</p>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    renderProfitInsights() {
        const container = document.getElementById('profitInsights');
        if (!container) return;
        
        const data = this.analyticsData.profitMargins;
        const bestChannel = Object.entries(data).reduce((best, [channel, metrics]) => 
            metrics.margin > best.margin ? { channel, ...metrics } : best
        , { margin: 0 });
        
        const totalProfit = Object.values(data).reduce((sum, metrics) => sum + metrics.profit, 0);
        const avgMargin = Object.values(data).reduce((sum, metrics) => sum + metrics.margin, 0) / Object.keys(data).length;
        
        container.innerHTML = `
            <div class="space-y-4">
                <div class="p-4 bg-green-50 rounded-lg">
                    <h4 class="font-semibold text-green-800">🏆 Saluran Terbaik</h4>
                    <p class="text-2xl font-bold text-green-600">${this.getChannelDisplayName(bestChannel.channel)}</p>
                    <p class="text-sm text-green-700">${bestChannel.margin.toFixed(1)}% margin keuntungan</p>
                </div>
                
                <div class="p-4 bg-blue-50 rounded-lg">
                    <h4 class="font-semibold text-blue-800">💰 Jumlah Keuntungan</h4>
                    <p class="text-2xl font-bold text-blue-600">RM ${totalProfit.toLocaleString()}</p>
                    <p class="text-sm text-blue-700">Purata margin: ${avgMargin.toFixed(1)}%</p>
                </div>
            </div>
        `;
    }
    
    renderForecastInsights() {
        const container = document.getElementById('forecastInsights');
        if (!container) return;
        
        const forecast = this.analyticsData.forecast;
        
        container.innerHTML = `
            <div class="text-center p-4 bg-purple-50 rounded-lg">
                <h4 class="font-semibold text-purple-800">📊 Ramalan Bulan Depan</h4>
                <p class="text-2xl font-bold text-purple-600">RM ${forecast.nextMonth.revenue.toLocaleString()}</p>
                <p class="text-sm text-purple-700">Pendapatan dijangka</p>
            </div>
            
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
                <h4 class="font-semibold text-yellow-800">🎯 Keyakinan Ramalan</h4>
                <p class="text-2xl font-bold text-yellow-600">${forecast.confidence}%</p>
                <p class="text-sm text-yellow-700">Berdasarkan data lepas</p>
            </div>
            
            <div class="text-center p-4 bg-green-50 rounded-lg">
                <h4 class="font-semibold text-green-800">💎 Keuntungan Dijangka</h4>
                <p class="text-2xl font-bold text-green-600">RM ${forecast.nextMonth.profit.toLocaleString()}</p>
                <p class="text-sm text-green-700">${forecast.nextMonth.orders} pesanan</p>
            </div>
        `;
    }
    
    renderProductInsights() {
        const container = document.getElementById('productInsights');
        if (!container) return;
        
        const products = this.analyticsData.topProducts;
        const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
        
        let html = '<div class="space-y-3">';
        
        products.forEach((product, index) => {
            const percentage = ((product.revenue / totalRevenue) * 100).toFixed(1);
            html += `
                <div class="flex justify-between items-center p-2 border-b">
                    <div>
                        <span class="text-lg">${index + 1}.</span>
                        <span class="font-medium">${product.name}</span>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold">RM ${product.revenue.toLocaleString()}</p>
                        <p class="text-xs text-gray-500">${percentage}% dari jumlah</p>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    getChannelDisplayName(channel) {
        const names = {
            shopee: '🛒 Shopee',
            tiktok: '🎵 TikTok',
            walkin: '🏪 Walk-in',
            agent: '👥 Agent',
            online: '💻 Online'
        };
        return names[channel] || channel;
    }
    
    setupRealTimeUpdates() {
        // Update analytics every 5 minutes
        setInterval(() => {
            this.loadAnalyticsData();
        }, 300000); // 5 minutes
    }
}

// Initialize advanced analytics on dashboard pages
document.addEventListener('DOMContentLoaded', function() {
    // Only load on dashboard or reports pages
    if (window.location.pathname === '/' || window.location.pathname.includes('reports')) {
        setTimeout(() => {
            new AdvancedAnalytics();
        }, 1000); // Wait for page to fully load
    }
});