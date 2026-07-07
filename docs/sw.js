const 快取名稱='huaxin-work-report-v4-cache-488-defect-photo-bridge';
const 預快取清單=[
  './',
  './work-report-v4-477.html?v=488&fix=defect-photo-bridge',
  './work-report-v4.webmanifest?v=488',
  './pwa-config.js?v=488',
  './gas-bridge.js?v=488',
  './work-report-v4-app-483.js?v=488',
  './work-report-v4-v484-hotfix.js?v=488',
  './work-report-v4-opening-particles.js?v=488',
  './work-report-v4-google-ui.css?v=488',
  './assets/huaxin-report-icon.svg?v=488',
  './assets/huaxin-report-splash.svg?v=488'
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
