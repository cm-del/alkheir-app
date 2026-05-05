'use strict';
const Charts = {
    // دوال مساعدة للتحميل الكسول
    _chartLoaded: false,
    _annotationLoaded: false,
    _loadingPromise: null,

    async _ensureChart() {
        if (window.Chart) return;
        if (!this._loadingPromise) {
            this._loadingPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
                script.onload = () => {
                    this._chartLoaded = true;
                    resolve();
                };
                script.onerror = () => reject(new Error('فشل تحميل Chart.js'));
                document.head.appendChild(script);
            });
        }
        await this._loadingPromise;
    },

    async _ensureAnnotation() {
        // نحمله لو محتاجين annotations (حالياً مش مستخدمين، لكن نتركه اختياري)
        if (window.ChartAnnotation) return;
        if (this._annotationLoading) await this._annotationLoading;
        this._annotationLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js';
            script.onload = () => {
                this._annotationLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error('فشل تحميل chartjs-plugin-annotation'));
            document.head.appendChild(script);
        });
        await this._annotationLoading;
    },

    async renderGrowthChart(canvasId, batchesData) {
        await this._ensureChart();
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const colors = ['#00e272', '#ffb703', '#38b6ff'];
        const datasets = batchesData.map((b, i) => ({
            label: b.name,
            data: b.weights.map(w => ({ x: w.age, y: w.weight })),
            borderColor: colors[i % 3],
            tension: 0.4,
            pointRadius: 3
        }));
        new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#dff5e8' } } },
                scales: {
                    x: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } },
                    y: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } }
                }
            }
        });
    },

    async renderTempChart(canvasId, tempLogs) {
        await this._ensureChart();
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const labels = tempLogs.map(t => t.date.slice(5) + ' ' + t.time);
        const data = tempLogs.map(t => t.temp);
        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'درجة الحرارة °C',
                    data,
                    borderColor: '#ffb703',
                    backgroundColor: 'rgba(255,183,3,0.1)',
                    tension: 0.3,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#dff5e8' } } },
                scales: {
                    x: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } },
                    y: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } }
                }
            }
        });
    },

    async renderFeedChart(canvasId, feedData) {
        await this._ensureChart();
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const sorted = feedData.sort((a, b) => a.date.localeCompare(b.date));
        const labels = sorted.map(f => f.date.slice(5));
        const kgData = sorted.map(f => f.qty || 0);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'علف مستهلك (كجم)',
                    data: kgData,
                    backgroundColor: '#00e27233',
                    borderColor: '#00e272',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#dff5e8' } } },
                scales: {
                    x: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } },
                    y: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } }
                }
            }
        });
    },

    async renderMortalityChart(canvasId, deathsData) {
        await this._ensureChart();
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        const sorted = deathsData.sort((a, b) => a.date.localeCompare(b.date));
        const labels = sorted.map(d => d.date.slice(5));
        const data = sorted.map(d => d.count || 0);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'نفوق يومي',
                    data,
                    borderColor: '#ff3b5c',
                    backgroundColor: 'rgba(255,59,92,0.08)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#dff5e8' } } },
                scales: {
                    x: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' } },
                    y: { ticks: { color: '#4a7a5e' }, grid: { color: '#1c3424' }, beginAtZero: true }
                }
            }
        });
    }
};
