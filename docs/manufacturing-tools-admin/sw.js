const CACHE='hs-tool-admin-v2';
const ASSETS=['./','./manifest.webmanifest','./icon.svg','./app.css','./app.js?v=100'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin)return;
  if(u.searchParams.has('token')||u.searchParams.has('adminToken')){
    e.respondWith(fetch(e.request,{cache:'no-store'}));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{
    const x=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,x));
    return r;
  }).catch(()=>caches.match(e.request)));
});