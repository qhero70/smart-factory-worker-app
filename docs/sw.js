const 快取前綴 = 'huaxin-work-report-v4-cache-';
const 快取名稱 = 快取前綴 + '542-v2-workstations';
const 報工正式入口 = new URL('./work-report-v4-477.html?v=542', self.location.href).href;
const 預快取清單 = [
  './work-report-v4-477.html?v=542',
  './報工V4_工件工站.css?v=541',
  './work-report-v4.webmanifest?v=489',
  './pwa-config.js?v=542',
  './gas-bridge.js?v=542',
  './work-report-v4-app-483.js?v=542',
  './work-report-v4-opening-particles.js?v=490',
  './work-report-v4-data-v529-adapter.js?v=542',
  './work-report-v4-official-lock-533.js?v=533',
  './work-report-v4-photo-stable-539.js?v=539',
  './work-report-v4-ui-lock-531.js?v=541',
  './work-report-v4-defect-grid-picker-519.js?v=521',
  './work-report-v4-defect-select-force-520.js?v=521',
  './work-report-v4-google-ui.css?v=489',
  './assets/huaxin-report-icon.svg?v=489',
  './assets/huaxin-report-splash.svg?v=489'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(快取名稱).then(cache => cache.addAll(預快取清單)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  // 同網域另有智慧5S PWA，只清理報工自己建立的舊快取。
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(快取前綴) && k !== 快取名稱).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const 報工目錄 = new URL('./', self.location.href);
  if (url.origin === 報工目錄.origin && url.pathname.startsWith(報工目錄.pathname + '5s/')) return;
  if (req.mode === 'navigate' && url.origin === 報工目錄.origin && url.pathname === new URL(報工正式入口).pathname) {
    // LINE 的開啟參數不影響表單內容；離線時沿用正式頁面的快取。
    event.respondWith((async () => {
      const cache = await caches.open(快取名稱);
      try {
        const res = await fetch(req);
        if (res.ok) await cache.put(報工正式入口, res.clone());
        return res;
      } catch (錯誤) {
        return (await cache.match(報工正式入口)) || new Response('目前離線，請連線後重新開啟報工作業。', {status: 503, headers: {'Content-Type': 'text/plain;charset=UTF-8'}});
      }
    })());
    return;
  }
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(fetch(req).catch(() => new Response(JSON.stringify({ 成功:false, 訊息:'離線狀態，無法寫入 GAS' }),{headers:{'Content-Type':'application/json;charset=UTF-8'}})));
    return;
  }
  if (
    url.pathname.endsWith('/pwa-config.js') ||
    url.pathname.endsWith('/work-report-v4-opening-particles.js') ||
    url.pathname.endsWith('/work-report-v4-data-v529-adapter.js') ||
    url.pathname.endsWith('/work-report-v4-official-lock-533.js') ||
    url.pathname.endsWith('/work-report-v4-opselect-535.js') ||
    url.pathname.endsWith('/work-report-v4-photo-stable-539.js') ||
    url.pathname.endsWith('/work-report-v4-ui-lock-531.js')
  ) {
    event.respondWith(fetch(req,{cache:'no-store'}).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached => {
    const fetching = fetch(req).then(res => {
      if(res&&res.ok){const clone=res.clone();caches.open(快取名稱).then(cache=>cache.put(req,clone));}
      return res;
    }).catch(()=>cached);
    return cached||fetching;
  }));
});
