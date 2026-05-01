const CACHE = 'alkheir-v1';
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
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});