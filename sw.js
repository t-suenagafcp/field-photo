// Service Worker無効化版
self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    .then(() => self.clients.claim())
  );
});
// キャッシュしない・常にネットワークから取得
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
