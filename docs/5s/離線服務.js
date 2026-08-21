'use strict';

/**
 * 化新精密｜智慧5S PWA 離線服務
 * 版本：1.1.2
 *
 * 1. Service Worker 僅處理本站同網域資源。
 * 2. Google Apps Script、Google Visualization API 與其他跨網域 API 交還瀏覽器處理。
 * 3. 核心資源採 Network-First，網路失敗後回本機快取。
 * 4. 導航失敗時回首頁或離線頁。
 * 5. v1.1.2 納入製一組標準照片待拍、換線標準與多入口導航修復。
 */

const 快取版本 = '化新精密-智慧5S-v1.1.2';

const 應用程式外殼 = [
  './',
  './index.html',
  './智慧5S樣式.css',
  './智慧5S_導航擴充修復.css',
  './智慧5S設定.js',
  './智慧5S資料庫.js',
  './智慧5S_Google試算表直讀備援.js',
  './智慧5S資料修復.js',
  './智慧5S應用程式.js',
  './智慧5S_G1整理戰情.js',
  './智慧5S_主管戰情.js',
  './智慧5S_區域風險排名.js',
  './智慧5S_趨勢分析.js',
  './智慧5S_巡檢覆蓋與今日任務.js',
  './智慧5S_可視化標準管理.js',
  './智慧5S_製一組標準展開.js',
  './應用程式資訊.webmanifest',
  './智慧5S圖示.svg',
  './智慧5S圖示-192.png',
  './智慧5S圖示-512.png',
  './離線頁.html'
];

function 建立離線回應(狀態碼, 訊息) {
  return new Response(
    `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>智慧5S｜連線暫時中斷</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Microsoft JhengHei',sans-serif;padding:32px;line-height:1.7"><h2>智慧5S 暫時無法取得網路資料</h2><p>${訊息 || '請確認網路後重新整理。已快取的功能仍可繼續使用。'}</p></body></html>`,
    { status: 狀態碼 || 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

self.addEventListener('install', 事件 => {
  事件.waitUntil(
    caches.open(快取版本)
      .then(async 快取 => {
        for (const 資源 of 應用程式外殼) {
          try { await 快取.add(資源); }
          catch (錯誤) { console.warn('智慧5S PWA 預快取失敗，略過單一資源：', 資源, 錯誤); }
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', 事件 => {
  事件.waitUntil(
    caches.keys()
      .then(名稱清單 => Promise.all(
        名稱清單.filter(名稱 => 名稱 !== 快取版本).map(名稱 => caches.delete(名稱))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', 事件 => {
  const 請求 = 事件.request;
  if (請求.method !== 'GET') return;

  let 網址;
  try { 網址 = new URL(請求.url); }
  catch (錯誤) { return; }

  if (網址.origin !== self.location.origin) return;

  const 讀取本機快取 = async () => {
    const 精確 = await caches.match(請求);
    if (精確) return 精確;
    return caches.match(請求, { ignoreSearch: true });
  };

  if (請求.mode === 'navigate') {
    事件.respondWith((async () => {
      try {
        const 回應 = await fetch(請求, { cache: 'no-store' });
        if (回應 && 回應.ok) {
          const 快取 = await caches.open(快取版本);
          await 快取.put('./index.html', 回應.clone());
        }
        return 回應;
      } catch (錯誤) {
        const 首頁 = await caches.match('./index.html');
        if (首頁) return 首頁;
        const 離線頁 = await caches.match('./離線頁.html');
        if (離線頁) return 離線頁;
        return 建立離線回應(503, '目前無法載入智慧5S首頁，請確認 4G / Wi‑Fi 後再試一次。');
      }
    })());
    return;
  }

  const 是否核心腳本 = /智慧5S設定\.js|智慧5S資料庫\.js|智慧5S_Google試算表直讀備援\.js|智慧5S資料修復\.js|智慧5S應用程式\.js|智慧5S_G1整理戰情\.js|智慧5S_主管戰情\.js|智慧5S_區域風險排名\.js|智慧5S_趨勢分析\.js|智慧5S_巡檢覆蓋與今日任務\.js|智慧5S_可視化標準管理\.js|智慧5S_製一組標準展開\.js|智慧5S_導航擴充修復\.css|智慧5S樣式\.css/.test(網址.pathname);

  if (是否核心腳本) {
    事件.respondWith((async () => {
      try {
        const 回應 = await fetch(請求, { cache: 'no-store' });
        if (回應 && 回應.ok) {
          const 快取 = await caches.open(快取版本);
          await 快取.put(請求, 回應.clone());
        }
        return 回應;
      } catch (錯誤) {
        const 快取回應 = await 讀取本機快取();
        if (快取回應) return 快取回應;
        return new Response('智慧5S核心資源暫時無法載入', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  事件.respondWith((async () => {
    const 快取回應 = await 讀取本機快取();
    if (快取回應) {
      事件.waitUntil((async () => {
        try {
          const 最新回應 = await fetch(請求);
          if (最新回應 && 最新回應.ok) {
            const 快取 = await caches.open(快取版本);
            await 快取.put(請求, 最新回應.clone());
          }
        } catch (錯誤) {}
      })());
      return 快取回應;
    }
    try {
      const 回應 = await fetch(請求);
      if (回應 && 回應.ok) {
        const 快取 = await caches.open(快取版本);
        await 快取.put(請求, 回應.clone());
      }
      return 回應;
    } catch (錯誤) {
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
  })());
});

self.addEventListener('message', 事件 => {
  if (事件.data === '立即啟用新版') self.skipWaiting();
});
