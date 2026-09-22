/*
 * 刀具表精靈 • 手機版｜PWA 離線服務
 * 原則：不修改既有 UI / UX / 功能，只提供殼層快取與外部資源執行期快取。
 */
const 快取版本 = '刀具表精靈-pwa-v1.3.0';
const 殼層快取 = `${快取版本}-殼層`;
const 外部快取 = `${快取版本}-外部`;

const 必備檔案 = [
  './',
  './index.html',
  './manifest.webmanifest'
];

const 外部必備檔案 = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Roboto:wght@400;500;700;900&display=swap'
];

async function 預先快取外部資源() {
  const 快取 = await caches.open(外部快取);
  await Promise.allSettled(
    外部必備檔案.map(async (網址) => {
      const 請求 = new Request(網址, { mode: 'no-cors' });
      const 回應 = await fetch(請求);
      await 快取.put(請求, 回應);
    })
  );
}

self.addEventListener('install', (事件) => {
  事件.waitUntil(
    Promise.all([
      caches.open(殼層快取).then((快取) => 快取.addAll(必備檔案)),
      預先快取外部資源()
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (事件) => {
  事件.waitUntil(
    caches.keys()
      .then((鍵值清單) => Promise.all(
        鍵值清單
          .filter((鍵值) => ![殼層快取, 外部快取].includes(鍵值))
          .map((鍵值) => caches.delete(鍵值))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (事件) => {
  const 請求 = 事件.request;
  if (請求.method !== 'GET') return;

  const 網址 = new URL(請求.url);
  const 同來源 = 網址.origin === self.location.origin;

  if (請求.mode === 'navigate') {
    事件.respondWith(
      fetch(請求)
        .then((回應) => {
          const 複本 = 回應.clone();
          caches.open(殼層快取).then((快取) => 快取.put('./index.html', 複本));
          return 回應;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (同來源) {
    事件.respondWith(
      caches.match(請求).then((已快取) => {
        if (已快取) return 已快取;
        return fetch(請求).then((回應) => {
          if (回應 && 回應.ok) {
            const 複本 = 回應.clone();
            caches.open(殼層快取).then((快取) => 快取.put(請求, 複本));
          }
          return 回應;
        });
      })
    );
    return;
  }

  事件.respondWith(
    caches.match(請求).then((已快取) => {
      const 網路更新 = fetch(請求)
        .then((回應) => {
          const 可快取 = 回應 && (回應.ok || 回應.type === 'opaque');
          if (可快取) {
            const 複本 = 回應.clone();
            caches.open(外部快取).then((快取) => 快取.put(請求, 複本));
          }
          return 回應;
        })
        .catch(() => 已快取);
      return 已快取 || 網路更新;
    })
  );
});
