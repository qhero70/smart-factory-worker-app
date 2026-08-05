'use strict';
const 快取版本 = '化新精密-智慧5S-v1.0.0';
const 應用程式外殼 = [
  './',
  './index.html',
  './智慧5S樣式.css',
  './智慧5S設定.js',
  './智慧5S資料庫.js',
  './智慧5S應用程式.js',
  './應用程式資訊.webmanifest',
  './智慧5S圖示.svg',
  './離線頁.html'
];

self.addEventListener('install', 事件 => {
  事件.waitUntil(
    caches.open(快取版本)
      .then(快取 => 快取.addAll(應用程式外殼))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', 事件 => {
  事件.waitUntil(
    caches.keys()
      .then(名稱清單 => Promise.all(名稱清單.filter(名稱 => 名稱 !== 快取版本).map(名稱 => caches.delete(名稱))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', 事件 => {
  const 請求 = 事件.request;
  if (請求.method !== 'GET') return;
  const 網址 = new URL(請求.url);

  if (網址.hostname.includes('script.google.com') || 網址.hostname.includes('script.googleusercontent.com')) {
    事件.respondWith(fetch(請求, { cache: 'no-store' }));
    return;
  }

  if (請求.mode === 'navigate') {
    事件.respondWith(
      fetch(請求, { cache: 'no-store' })
        .then(回應 => {
          const 複本 = 回應.clone();
          caches.open(快取版本).then(快取 => 快取.put('./index.html', 複本));
          return 回應;
        })
        .catch(() => caches.match('./index.html').then(回應 => 回應 || caches.match('./離線頁.html')))
    );
    return;
  }

  const 是否核心腳本 = /智慧5S設定\.js|智慧5S資料庫\.js|智慧5S應用程式\.js|智慧5S樣式\.css/.test(網址.pathname);
  if (是否核心腳本) {
    事件.respondWith(
      fetch(請求, { cache: 'no-store' })
        .then(回應 => {
          if (回應 && 回應.ok) caches.open(快取版本).then(快取 => 快取.put(請求, 回應.clone()));
          return 回應;
        })
        .catch(() => caches.match(請求))
    );
    return;
  }

  事件.respondWith(
    caches.match(請求).then(快取回應 => {
      const 網路請求 = fetch(請求).then(回應 => {
        if (回應 && 回應.ok && 網址.origin === self.location.origin) {
          caches.open(快取版本).then(快取 => 快取.put(請求, 回應.clone()));
        }
        return 回應;
      }).catch(() => 快取回應);
      return 快取回應 || 網路請求;
    })
  );
});

self.addEventListener('message', 事件 => {
  if (事件.data === '立即啟用新版') self.skipWaiting();
});
