const 快取名稱='huaxin-work-report-v4-cache-492-photo-restore-only';
const 預快取清單=[
  './',
  './work-report-v4-477.html?v=492&fix=photo-restore-only',
  './work-report-v4.webmanifest?v=489',
  './pwa-config.js?v=492',
  './gas-bridge.js?v=489',
  './work-report-v4-app-483.js?v=489',
  './work-report-v4-v484-hotfix.js?v=489',
  './work-report-v4-v489-data-repair.js?v=489',
  './work-report-v4-shift-rules-491.js?v=491',
  './work-report-v4-photo-restore-492.js?v=492',
  './work-report-v4-opening-particles.js?v=490',
  './work-report-v4-google-ui.css?v=489',
  './assets/huaxin-report-icon.svg?v=489',
  './assets/huaxin-report-splash.svg?v=489'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(快取名稱).then(cache=>cache.addAll(預快取清單)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==快取名稱).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.hostname.includes('script.google.com')){
    event.respondWith(fetch(req).catch(()=>new Response(JSON.stringify({成功:false,訊息:'離線狀態，無法寫入 GAS'}),{headers:{'Content-Type':'application/json;charset=UTF-8'}})));
    return;
  }
  event.respondWith(
    caches.match(req).then(cached=>{
      const fetching=fetch(req).then(res=>{
        if(res&&res.ok){const clone=res.clone();caches.open(快取名稱).then(cache=>cache.put(req,clone));}
        return res;
      }).catch(()=>cached);
      return cached||fetching;
    })
  );
});
