const 快取名稱='huaxin-work-report-v4-cache-483-google-glass';
const 預快取清單=[
  './',
  './work-report-v4-477.html?v=483&fix=locked-baseline',
  './work-report-v4.webmanifest?v=483',
  './pwa-config.js?v=483',
  './gas-bridge.js?v=483',
  './work-report-v4-app-483.js?v=483',
  './work-report-v4-google-ui.css?v=483',
  './assets/huaxin-report-icon.svg?v=483',
  './assets/huaxin-report-splash.svg?v=483'
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
