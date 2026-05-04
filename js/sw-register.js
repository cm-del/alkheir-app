'use strict';
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    if (confirm('يوجد تحديث للتطبيق. هل تريد التحديث الآن؟')) {
                        newWorker.postMessage({ action: 'SKIP_WAITING' });
                        window.location.reload();
                    }
                }
            });
        });
    }).catch(err => console.log('SW registration failed:', err));
}