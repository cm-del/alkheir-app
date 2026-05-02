const CACHE = 'alkheir-v2';
const ASSETS = [
    '/',
    'index.html',
    'css/style.css',
    'js/utils.js',
    'js/db.js',
    'js/weather.js',
    'js/analytics.js',
    'js/charts.js',
    'js/export.js',
    'js/modals.js',
    'js/ui.js',
    'js/app.js',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/toastify-js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            return cached || fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('index.html');
                }
            });
        })
    );
}); 
