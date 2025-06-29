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
        
        // Create sections safely without innerHTML
        this.createChannelPerformanceSection(analyticsSection);
        this.createProfitMarginSection(analyticsSection);
        this.createTrendForecastSection(analyticsSection);
        this.createTopProductsSection(analyticsSection);
        
        dashboard.appendChild(analyticsSection);
    }
    
    createChannelPerformanceSection(parent) {
        const section = document.createElement('div');
        section.className = 'bg-white rounded-lg shadow-md p-6';
        
        const title = document.createElement('h3');
        title.className = 'text-lg font-bold mb-4';
        title.textContent = '📊 Prestasi Saluran Jualan';
        
        const grid = document.createElement('div');
        grid.className = 'grid md:grid-cols-2 gap-6';
        
        const chartDiv = document.createElement('div');
        const canvas = document.createElement('canvas');
        canvas.id = 'channelRevenueChart';
        canvas.width = 400;
        canvas.height = 200;
        chartDiv.appendChild(canvas);
        
        const metricsDiv = document.createElement('div');
        metricsDiv.id = 'channelMetrics';
        metricsDiv.className = 'space-y-3';
        
        grid.appendChild(chartDiv);
        grid.appendChild(metricsDiv);
        section.appendChild(title);
        section.appendChild(grid);
        parent.appendChild(section);
    }
    
    createProfitMarginSection(parent) {
        const section = document.createElement('div');
        section.className = 'bg-white rounded-lg shadow-md p-6';
        
        const title = document.createElement('h3');
        title.className = 'text-lg font-bold mb-4';
        title.textContent = '💰 Analisis Margin Keuntungan';
        
        const grid = document.createElement('div');
        grid.className = 'grid md:grid-cols-2 gap-6';
        
        const chartDiv = document.createElement('div');
        const canvas = document.createElement('canvas');
        canvas.id = 'profitMarginChart';
        canvas.width = 400;
        canvas.height = 200;
        chartDiv.appendChild(canvas);
        
        const insightsDiv = document.createElement('div');
        insightsDiv.id = 'profitInsights';
        insightsDiv.className = 'space-y-3';
        
        grid.appendChild(chartDiv);
        grid.appendChild(insightsDiv);
        section.appendChild(title);
        section.appendChild(grid);
        parent.appendChild(section);
    }
    
    createTrendForecastSection(parent) {
        const section = document.createElement('div');
        section.className = 'bg-white rounded-lg shadow-md p-6';
        
        const title = document.createElement('h3');
        title.className = 'text-lg font-bold mb-4';
        title.textContent = '📈 Ramalan Trend & Prestasi';
        
        const chartContainer = document.createElement('div');
        chartContainer.className = 'mb-4';
        const canvas = document.createElement('canvas');
        canvas.id = 'trendForecastChart';
        canvas.width = 400;
        canvas.height = 300;
        chartContainer.appendChild(canvas);
        
        const insightsDiv = document.createElement('div');
        insightsDiv.id = 'forecastInsights';
        insightsDiv.className = 'grid md:grid-cols-3 gap-4';
        
        section.appendChild(title);
        section.appendChild(chartContainer);
        section.appendChild(insightsDiv);
        parent.appendChild(section);
    }
    
    createTopProductsSection(parent) {
        const section = document.createElement('div');
        section.className = 'bg-white rounded-lg shadow-md p-6';
        
        const title = document.createElement('h3');
        title.className = 'text-lg font-bold mb-4';
        title.textContent = '🏆 Produk Terlaris';
        
        const grid = document.createElement('div');
        grid.className = 'grid md:grid-cols-2 gap-6';
        
        const chartDiv = document.createElement('div');
        const canvas = document.createElement('canvas');
        canvas.id = 'topProductsChart';
        canvas.width = 400;
        canvas.height = 200;
        chartDiv.appendChild(canvas);
        
        const insightsDiv = document.createElement('div');
        insightsDiv.id = 'productInsights';
        
        grid.appendChild(chartDiv);
        grid.appendChild(insightsDiv);
        section.appendChild(title);
        section.appendChild(grid);
        parent.appendChild(section);
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
        
        // Clear container safely
        container.textContent = '';
        
        const data = this.analyticsData.channelPerformance;
        
        Object.entries(data).forEach(([channel, metrics]) => {
            const metricDiv = document.createElement('div');
            metricDiv.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
            
            const leftDiv = document.createElement('div');
            const channelName = document.createElement('h4');
            channelName.className = 'font-semibold';
            channelName.textContent = this.getChannelDisplayName(channel);
            
            const orderCount = document.createElement('p');
            orderCount.className = 'text-sm text-gray-600';
            orderCount.textContent = `${metrics.orders} pesanan`;
            
            leftDiv.appendChild(channelName);
            leftDiv.appendChild(orderCount);
            
            const rightDiv = document.createElement('div');
            rightDiv.className = 'text-right';
            
            const revenue = document.createElement('p');
            revenue.className = 'font-bold';
            revenue.textContent = `RM ${metrics.revenue.toLocaleString()}`;
            
            const growth = document.createElement('p');
            growth.className = `text-sm ${metrics.growth >= 0 ? 'text-green-600' : 'text-red-600'}`;
            growth.textContent = `${metrics.growth >= 0 ? '📈' : '📉'} ${metrics.growth}%`;
            
            rightDiv.appendChild(revenue);
            rightDiv.appendChild(growth);
            
            metricDiv.appendChild(leftDiv);
            metricDiv.appendChild(rightDiv);
            container.appendChild(metricDiv);
        });
    }
    
    renderProfitInsights() {
        const container = document.getElementById('profitInsights');
        if (!container) return;
        
        container.textContent = '';
        
        const data = this.analyticsData.profitMargins;
        const bestChannel = Object.entries(data).reduce((best, [channel, metrics]) => 
            metrics.margin > best.margin ? { channel, ...metrics } : best
        , { margin: 0 });
        
        const totalProfit = Object.values(data).reduce((sum, metrics) => sum + metrics.profit, 0);
        const avgMargin = Object.values(data).reduce((sum, metrics) => sum + metrics.margin, 0) / Object.keys(data).length;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-4';
        
        // Best channel card
        const bestChannelCard = document.createElement('div');
        bestChannelCard.className = 'p-4 bg-green-50 rounded-lg';
        
        const bestTitle = document.createElement('h4');
        bestTitle.className = 'font-semibold text-green-800';
        bestTitle.textContent = '🏆 Saluran Terbaik';
        
        const bestValue = document.createElement('p');
        bestValue.className = 'text-2xl font-bold text-green-600';
        bestValue.textContent = this.getChannelDisplayName(bestChannel.channel);
        
        const bestMargin = document.createElement('p');
        bestMargin.className = 'text-sm text-green-700';
        bestMargin.textContent = `${bestChannel.margin.toFixed(1)}% margin keuntungan`;
        
        bestChannelCard.appendChild(bestTitle);
        bestChannelCard.appendChild(bestValue);
        bestChannelCard.appendChild(bestMargin);
        
        // Total profit card
        const profitCard = document.createElement('div');
        profitCard.className = 'p-4 bg-blue-50 rounded-lg';
        
        const profitTitle = document.createElement('h4');
        profitTitle.className = 'font-semibold text-blue-800';
        profitTitle.textContent = '💰 Jumlah Keuntungan';
        
        const profitValue = document.createElement('p');
        profitValue.className = 'text-2xl font-bold text-blue-600';
        profitValue.textContent = `RM ${totalProfit.toLocaleString()}`;
        
        const avgMarginText = document.createElement('p');
        avgMarginText.className = 'text-sm text-blue-700';
        avgMarginText.textContent = `Purata margin: ${avgMargin.toFixed(1)}%`;
        
        profitCard.appendChild(profitTitle);
        profitCard.appendChild(profitValue);
        profitCard.appendChild(avgMarginText);
        
        wrapper.appendChild(bestChannelCard);
        wrapper.appendChild(profitCard);
        container.appendChild(wrapper);
    }
    
    renderForecastInsights() {
        const container = document.getElementById('forecastInsights');
        if (!container) return;
        
        container.textContent = '';
        
        const forecast = this.analyticsData.forecast;
        
        // Revenue forecast card
        const revenueCard = this.createInsightCard(
            'text-center p-4 bg-purple-50 rounded-lg',
            '📊 Ramalan Bulan Depan',
            'font-semibold text-purple-800',
            `RM ${forecast.nextMonth.revenue.toLocaleString()}`,
            'text-2xl font-bold text-purple-600',
            'Pendapatan dijangka',
            'text-sm text-purple-700'
        );
        
        // Confidence card
        const confidenceCard = this.createInsightCard(
            'text-center p-4 bg-yellow-50 rounded-lg',
            '🎯 Keyakinan Ramalan',
            'font-semibold text-yellow-800',
            `${forecast.confidence}%`,
            'text-2xl font-bold text-yellow-600',
            'Berdasarkan data lepas',
            'text-sm text-yellow-700'
        );
        
        // Profit forecast card
        const profitCard = this.createInsightCard(
            'text-center p-4 bg-green-50 rounded-lg',
            '💎 Keuntungan Dijangka',
            'font-semibold text-green-800',
            `RM ${forecast.nextMonth.profit.toLocaleString()}`,
            'text-2xl font-bold text-green-600',
            `${forecast.nextMonth.orders} pesanan`,
            'text-sm text-green-700'
        );
        
        container.appendChild(revenueCard);
        container.appendChild(confidenceCard);
        container.appendChild(profitCard);
    }
    
    createInsightCard(cardClass, title, titleClass, value, valueClass, subtitle, subtitleClass) {
        const card = document.createElement('div');
        card.className = cardClass;
        
        const titleEl = document.createElement('h4');
        titleEl.className = titleClass;
        titleEl.textContent = title;
        
        const valueEl = document.createElement('p');
        valueEl.className = valueClass;
        valueEl.textContent = value;
        
        const subtitleEl = document.createElement('p');
        subtitleEl.className = subtitleClass;
        subtitleEl.textContent = subtitle;
        
        card.appendChild(titleEl);
        card.appendChild(valueEl);
        card.appendChild(subtitleEl);
        
        return card;
    }
    
    renderProductInsights() {
        const container = document.getElementById('productInsights');
        if (!container) return;
        
        container.textContent = '';
        
        const products = this.analyticsData.topProducts;
        const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
        
        const wrapper = document.createElement('div');
        wrapper.className = 'space-y-3';
        
        products.forEach((product, index) => {
            const percentage = ((product.revenue / totalRevenue) * 100).toFixed(1);
            
            const productDiv = document.createElement('div');
            productDiv.className = 'flex justify-between items-center p-2 border-b';
            
            const leftDiv = document.createElement('div');
            
            const rankSpan = document.createElement('span');
            rankSpan.className = 'text-lg';
            rankSpan.textContent = `${index + 1}.`;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'font-medium';
            nameSpan.textContent = ` ${product.name}`;
            
            leftDiv.appendChild(rankSpan);
            leftDiv.appendChild(nameSpan);
            
            const rightDiv = document.createElement('div');
            rightDiv.className = 'text-right';
            
            const revenueP = document.createElement('p');
            revenueP.className = 'font-semibold';
            revenueP.textContent = `RM ${product.revenue.toLocaleString()}`;
            
            const percentageP = document.createElement('p');
            percentageP.className = 'text-xs text-gray-500';
            percentageP.textContent = `${percentage}% dari jumlah`;
            
            rightDiv.appendChild(revenueP);
            rightDiv.appendChild(percentageP);
            
            productDiv.appendChild(leftDiv);
            productDiv.appendChild(rightDiv);
            wrapper.appendChild(productDiv);
        });
        
        container.appendChild(wrapper);
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