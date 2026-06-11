const 快取版本 = 'v2.0.0_正式整合版';
const 快取名稱 = `製造部智慧製造應用總部-${快取版本}`;
const 必要檔案 = [
  './',
  './index.html',
  './app.html',
  './work-report.html',
  './work-report-v2.html',
  './work-report-v2-core.js',
  './manifest.webmanifest',
  './pwa-config.js',
  './gas-bridge.js',
  './assets/icons/智慧製造圖示.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(快取名稱).then(cache => cache.addAll(必要檔案.map(path => new Request(path, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== 快取名稱).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const 請求 = event.request;
  const 網址 = new URL(請求.url);

  if (網址.hostname.includes('script.google.com') || 網址.hostname.includes('googleusercontent.com')) {
    event.respondWith(fetch(請求, { cache: 'no-store' }));
    return;
  }

  if (請求.mode === 'navigate') {
    event.respondWith(
      fetch(請求, { cache: 'no-store' }).then(response => {
        const 複本 = response.clone();
        caches.open(快取名稱).then(cache => cache.put(請求, 複本));
        return response;
      }).catch(() => caches.match(請求).then(response => response || caches.match('./app.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(請求).then(cached => cached || fetch(請求, { cache: 'no-store' }).then(response => {
      if (請求.method === 'GET' && response && response.status === 200) {
        const 複本 = response.clone();
        caches.open(快取名稱).then(cache => cache.put(請求, 複本));
      }
      return response;
    }).catch(() => cached))
  );
});
