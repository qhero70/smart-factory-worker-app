'use strict';

/**
 * 化新精密｜製一｜智慧5S 離線服務
 * 版本：1.3.5／1350
 */
const 快取版本 = '化新精密-製一智慧5S-v1.3.5';

const 應用程式外殼 = Object.freeze([
  './',
  './index.html',
  './智慧5S樣式.css',
  './智慧5S_導航擴充修復.css',
  './智慧5S_UIUX優化.css',
  './智慧5S設定.js',
  './智慧5S資料庫.js',
  './智慧5S_Google試算表直讀備援.js',
  './智慧5S資料修復.js',
  './智慧5S_登入防護.js',
  './智慧5S應用程式.js',
  './智慧5S_紅牌掃碼閉環.js',
  './智慧5S_紅牌列印退出修復_v1260.js',
  './智慧5S_紅牌結案防呆.js',
  './智慧5S_效能核心.js',
  './智慧5S_G1整理戰情.js',
  './智慧5S_主管戰情.js',
  './智慧5S_區域風險排名.js',
  './智慧5S_趨勢分析.js',
  './智慧5S_巡檢覆蓋與今日任務.js',
  './智慧5S_首頁精簡.js',
  './智慧5S_可視化核心_v1280.js',
  './智慧5S_A5照片內建資料_v1290.js',
  './智慧5S_A5標準照片回接_v1300.js',
  './智慧5S_製一組標準展開.js',
  './智慧5S_A5現場照片盤點.js',
  './智慧5S_A5首次稽核準備.js',
  './智慧5S_Roar事件通知.js',
  './智慧5S_機台巡檢_v1240.js',
  './智慧5S_稽核標準0821_v1310.js',
  './智慧5S_巡檢週期防重_v1320.js',
  './智慧5S_機台履歷_v1250.js',
  './智慧5S_ISO巡檢存檔_v1330.js',
  './智慧5S_履歷首次載入修復_v1340.js',
  './智慧5S_UIUX優化.js',
  './智慧5S_iPhone導航修復.js',
  './智慧5S_可視化路由_v1280.js',
  './assets/a5/SITE-A5-008.jpg',
  './assets/a5/SITE-A5-009.jpg',
  './assets/a5/SITE-A5-010.jpg',
  './assets/a5/SITE-A5-011.jpg',
  './assets/a5/SITE-A5-012.jpg',
  './assets/a5/SITE-A5-013.jpg',
  './assets/a5/SITE-A5-014.jpg',
  './assets/a5/SITE-A5-015.jpg',
  './assets/a5/SITE-A5-016.jpg',
  './assets/a5/SITE-A5-017.jpg',
  './assets/a5/SITE-A5-018.jpg',
  './應用程式資訊.webmanifest',
  './製一智慧5S圖示.svg',
  './智慧5S圖示-192.png',
  './智慧5S圖示-512.png',
  './離線頁.html'
]);

async function 取得快取回應(請求) {
  return await caches.match(請求) || await caches.match(請求, { ignoreSearch: true });
}

async function 寫入快取(請求, 回應) {
  if (!回應 || !回應.ok) return 回應;
  const 快取 = await caches.open(快取版本);
  await 快取.put(請求, 回應.clone());
  return 回應;
}

async function 網路優先(請求, 備援路徑) {
  try {
    return await 寫入快取(請求, await fetch(請求, { cache: 'no-store' }));
  } catch (_) {
    return await 取得快取回應(請求)
      || (備援路徑 ? await caches.match(備援路徑) : null)
      || new Response('製一｜智慧5S 暫時離線', { status: 503 });
  }
}

async function 快取優先並背景更新(事件, 請求) {
  const 已快取 = await 取得快取回應(請求);
  if (已快取) {
    事件.waitUntil(
      fetch(請求)
        .then(回應 => 寫入快取(請求, 回應))
        .catch(() => null)
    );
    return 已快取;
  }
  try {
    return await 寫入快取(請求, await fetch(請求));
  } catch (_) {
    return new Response('', { status: 503 });
  }
}

self.addEventListener('install', 事件 => {
  事件.waitUntil(
    caches.open(快取版本)
      .then(async 快取 => {
        for (const 路徑 of 應用程式外殼) {
          try {
            await 快取.add(路徑);
          } catch (錯誤) {
            console.warn('預快取略過', 路徑, 錯誤);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', 事件 => {
  事件.waitUntil(
    caches.keys()
      .then(名稱清單 => Promise.all(
        名稱清單
          .filter(名稱 => 名稱 !== 快取版本)
          .map(名稱 => caches.delete(名稱))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', 事件 => {
  const 請求 = 事件.request;
  if (請求.method !== 'GET') return;

  let 網址;
  try {
    網址 = new URL(請求.url);
  } catch (_) {
    return;
  }
  if (網址.origin !== self.location.origin) return;

  if (請求.mode === 'navigate') {
    事件.respondWith(
      網路優先(請求, './index.html')
        .then(async 回應 => {
          if (回應 && 回應.ok) {
            const 快取 = await caches.open(快取版本);
            await 快取.put('./index.html', 回應.clone());
          }
          return 回應 || await caches.match('./離線頁.html');
        })
    );
    return;
  }

  const 是核心資源 =
    /智慧5S.*\.(js|css)$/.test(網址.pathname)
    || /應用程式資訊\.webmanifest$/.test(網址.pathname)
    || /製一智慧5S圖示\.svg$/.test(網址.pathname);

  if (是核心資源) {
    事件.respondWith(網路優先(請求));
    return;
  }

  事件.respondWith(快取優先並背景更新(事件, 請求));
});

self.addEventListener('message', 事件 => {
  if (事件.data === '立即啟用新版') self.skipWaiting();
});
