const 快取版本 = 'v4.3.2_報工V4不攔截GAS_強制更新';
const 快取名稱 = `製造部智慧製造應用總部-${快取版本}`;

const 必要檔案 = [
  './',
  './index.html',
  './app.html',
  './work-report.html',
  './work-report-v2.html',
  './work-report-v4.html',
  './work-report-v4-live.html',
  './work-report-v4-early-fetch-guard.js',
  './work-report-v4-ux-427.js',
  './work-report-v2-core.js',
  './manifest.webmanifest',
  './pwa-config.js',
  './gas-bridge.js',
  './assets/hs-logo.svg',
  './assets/icons/智慧製造圖示.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(快取名稱).then(cache =>
      cache.addAll(必要檔案.map(path => new Request(path, { cache: 'reload' }))).catch(() => Promise.resolve())
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const 請求 = event.request;
  const 網址 = new URL(請求.url);

  // 關鍵修正：GAS / Google 圖片 / Googleusercontent 全部不要由 Service Worker 攔截。
  // 讓瀏覽器原生處理跨網域，避免 iPhone Safari 顯示：
  // FetchEvent.respondWith received an error: TypeError: Load failed
  if (
    網址.hostname.includes('script.google.com') ||
    網址.hostname.includes('script.googleusercontent.com') ||
    網址.hostname.includes('googleusercontent.com') ||
    網址.hostname.includes('drive.google.com') ||
    網址.hostname.includes('lh3.googleusercontent.com')
  ) {
    return;
  }

  if (請求.method !== 'GET') {
    return;
  }

  if (
    網址.pathname.endsWith('/work-report-v2.html') ||
    網址.pathname.endsWith('/work-report-v4.html') ||
    網址.pathname.endsWith('/work-report-v4-live.html') ||
    網址.pathname.endsWith('/work-report-v4-early-fetch-guard.js') ||
    網址.pathname.endsWith('/work-report-v4-ux-427.js') ||
    網址.pathname.endsWith('/work-report-v2-core.js') ||
    網址.pathname.endsWith('/gas-bridge.js') ||
    網址.pathname.endsWith('/pwa-config.js') ||
    網址.pathname.endsWith('/service-worker.js') ||
    網址.pathname.endsWith('/assets/hs-logo.svg')
  ) {
    event.respondWith(fetch(請求, { cache: 'reload' }).catch(() => caches.match(請求)));
    return;
  }

  if (請求.mode === 'navigate') {
    event.respondWith(
      fetch(請求, { cache: 'no-store' })
        .then(response => response)
        .catch(() => caches.match(請求).then(response => response || caches.match('./app.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(請求).then(cached =>
      cached || fetch(請求, { cache: 'no-store' }).catch(() => cached)
    )
  );
});
