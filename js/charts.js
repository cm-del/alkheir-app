'use strict';
const Charts = {
    renderGrowthChart(canvasId, batchesData) {
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
    renderTempChart(canvasId, tempLogs) {
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
    renderFeedChart(canvasId, feedData) {
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
    }
};