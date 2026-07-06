// ══ Service Worker - 施工フォト オフライン対応 ══
const CACHE_NAME = 'seiko-photo-v2'; // ← index.html等を更新するたびに必ずこの番号を上げること

// キャッシュするファイル一覧（CDNライブラリ含む）
const STATIC_ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
];

// HTML(ページ本体)だけは「ネットワーク優先」にする。
// これによりindex.htmlを更新すれば次回アクセス時に必ず最新版が反映される。
// CDNライブラリ等は変化が少ないので従来通り「キャッシュ優先」のままにする。
const NETWORK_FIRST_DESTINATIONS = ['document'];

// ── インストール時：静的ファイルをキャッシュ ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('キャッシュ失敗:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── アクティベート時：古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── フェッチ ──
self.addEventListener('fetch', event => {
  // POST等はスキップ
  if (event.request.method !== 'GET') return;

  // HTML本体はネットワーク優先(オンラインなら常に最新版を取得)
  if (NETWORK_FIRST_DESTINATIONS.includes(event.request.destination)) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // それ以外(CDNライブラリ等)は従来通りキャッシュ優先
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
