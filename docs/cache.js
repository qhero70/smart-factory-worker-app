const CACHE_NAME='nexus-os-pwa-v5-2-20260702-safe';
const APP_SHELL=['./','./index.html','./app.html','./manifest.webmanifest','./assets/icons/nexus-os.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>Promise.allSettled(APP_SHELL.map(url=>cache.add(url)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin.includes('script.google.com')||url.origin.includes('googleusercontent.com'))return;event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(resp=>{const copy=resp.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});return resp}).catch(()=>caches.match('./app.html'))))});
