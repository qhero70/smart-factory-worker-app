(function (全域) {
  'use strict';

  /**
   * 化新精密｜製一｜智慧5S A5 離線照片索引
   * 版本：1.3.5
   *
   * 照片由 Service Worker 預先快取，斷網時仍可開啟。
   * 這裡只保留短路徑，不再把大型 Base64 塞進 JavaScript，避免檔案遭截斷後拖垮整頁載入。
   */
  const 照片路徑 = Object.freeze({
    'SITE-A5-008': './assets/a5/SITE-A5-008.jpg',
    'SITE-A5-009': './assets/a5/SITE-A5-009.jpg',
    'SITE-A5-010': './assets/a5/SITE-A5-010.jpg',
    'SITE-A5-011': './assets/a5/SITE-A5-011.jpg',
    'SITE-A5-012': './assets/a5/SITE-A5-012.jpg',
    'SITE-A5-013': './assets/a5/SITE-A5-013.jpg',
    'SITE-A5-014': './assets/a5/SITE-A5-014.jpg',
    'SITE-A5-015': './assets/a5/SITE-A5-015.jpg',
    'SITE-A5-016': './assets/a5/SITE-A5-016.jpg',
    'SITE-A5-017': './assets/a5/SITE-A5-017.jpg',
    'SITE-A5-018': './assets/a5/SITE-A5-018.jpg'
  });

  全域.智慧5SA5內建照片 = 照片路徑;
  全域.智慧5SA5內建照片版本 = '1.3.5';
})(window);
