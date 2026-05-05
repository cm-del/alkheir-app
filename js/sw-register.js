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
        // إشعار هادئ عند التفعيل الأول
        if (reg.active && !localStorage.getItem('sw_installed_v2')) {
            Utils.toast('✨ التطبيق يعمل الآن بدون إنترنت', 'success');
            localStorage.setItem('sw_installed_v2', '1');
        }
    }).catch(err => console.log('SW registration failed:', err));
}
