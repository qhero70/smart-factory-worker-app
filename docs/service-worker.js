const 快取名稱 = '智慧製造中央作戰指揮中心-pages-v1';
const 必要檔案 = ['./app.html', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(快取名稱).then(cache => cache.addAll(必要檔案)));
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(res => res || caches.match('./app.html'))));
});
