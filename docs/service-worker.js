const 快取版本 = 'v1.2.5_班別主程式攔截修正';
const 快取名稱 = `製造部智慧製造應用總部-${快取版本}`;
const 必要檔案 = [
  './',
  './index.html',
  './app.html',
  './work-report.html',
  './work-report-v2.html',
  './manifest.webmanifest',
  './pwa-config.js',
  './gas-bridge.js',
  './work-report-v2-photo-fallback.js',
  './work-report-v2-dom-fix.js',
  './work-report-v2-shift-fix-v124.js',
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
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== 快取名稱).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function 修正報工主頁(html) {
  let out = String(html || '');
  const 舊函數 = "function shiftNorm(v){const t=T(v);if(!t)return'';if(t.includes('中')||t.includes('16:50')||t.includes('1650'))return'中班';if(t.includes('大夜')||t.includes('夜')||t.includes('23:00')||t.includes('2300')||t.includes('03:15')||t.includes('315'))return'大夜班';if(t.includes('加班'))return'加班';if(t.includes('早')||t.includes('08:00')||t.includes('0800'))return'早班';return t}";
  const 新函數 = "function shiftNorm(v){const t=T(v);if(!t)return'';const c=String(t).replace(/\\s+/g,'').toUpperCase();if(t.includes('早')||c.includes('DAY')||c.includes('0800')||c.includes('08:00'))return'早班';if(t.includes('大夜')||t.includes('夜')||c.includes('NIGHT')||c.includes('2300')||c.includes('23:00')||c.includes('0315')||c.includes('03:15')||c.includes('3150'))return'大夜班';if(t.includes('中')||c.includes('MID')||c.includes('SWING')||(c.includes('1650')&&!c.includes('0800')))return'中班';if(t.includes('加班'))return'加班';return t}";
  out = out.replace(舊函數, 新函數);
  out = out.replace("v1.2.0_靜態完整正式版_不空白", "v1.2.5_班別主程式修正");
  return out;
}

self.addEventListener('fetch', event => {
  const 請求 = event.request;
  const 網址 = new URL(請求.url);

  if (網址.hostname.includes('script.google.com') || 網址.hostname.includes('googleusercontent.com')) {
    event.respondWith(fetch(請求, { cache: 'no-store' }));
    return;
  }

  if (請求.mode === 'navigate') {
    event.respondWith(
      fetch(請求, { cache: 'no-store' }).then(async response => {
        if (網址.pathname.endsWith('/work-report-v2.html')) {
          const html = await response.clone().text();
          const fixed = 修正報工主頁(html);
          return new Response(fixed, { headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' } });
        }
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
