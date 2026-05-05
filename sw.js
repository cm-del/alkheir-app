const CACHE = 'alkheir-v2';
const ASSETS = [
    '/',
    'index.html',
    'offline.html',
    'css/style.css',
    'css/print.css',
    'js/utils.js',
    'js/db.js',
    'js/weather.js',
    'js/analytics.js',
    'js/charts.js',
    'js/export.js',
    'js/modals.js',
    'js/ui.js',
    'js/app.js',
    'js/sw-register.js',
    'js/notifications.js',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/toastify-js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// دالة إعادة المحاولة (retry) مع Backoff تصاعدي
async function fetchWithRetry(request, maxRetries = 3, backoff = 300) {
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const response = await fetch(request);
            if (response.ok) return response;
            // استثناء: لو الـ status مش OK نعتبره فشل (زي 500, 404)
            throw new Error(`Status: ${response.status}`);
        } catch (error) {
            attempt++;
            if (attempt > maxRetries) throw error; // استسلم بعد آخر محاولة
            // انتظر وقت تصاعدي (exponential backoff)
            const delay = backoff * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE).map(key => caches.delete(key))
            );
        }).then(() => clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // استثناء: لا نتدخل في طلبات الـ API الخارجية غير المهمة (زي analytics)
    if (event.request.url.includes('open-meteo.com')) {
        // للطقس: network only مع retry (مش محتاجين كاش)
        event.respondWith(
            fetchWithRetry(event.request, 2, 500).catch(() => new Response(null, { status: 408 }))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) {
                // استراتيجية stale-while-revalidate: نرجع الكاش فوراً ونحدثه في الخلفية
                const fetchPromise = fetchWithRetry(event.request, 2, 300).then(networkResponse => {
                    caches.open(CACHE).then(cache => cache.put(event.request, networkResponse.clone()));
                    return networkResponse;
                }).catch(() => cached);
                // نرجع الكاش فوراً مع التحديث في الخلفية
                event.waitUntil(fetchPromise);
                return cached;
            }
            // مفيش في الكاش: نجرب الشبكة مع retry
            return fetchWithRetry(event.request, 3, 500).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('offline.html');
                }
                return new Response(null, { status: 408 });
            });
        })
    );
}); 
