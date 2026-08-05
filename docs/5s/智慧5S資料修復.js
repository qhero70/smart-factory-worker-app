(function (全域) {
  'use strict';

  const 原始資料庫 = 全域.智慧5S資料庫;
  if (!原始資料庫) throw new Error('智慧5S資料庫尚未載入');

  function 文字(內容) {
    return String(內容 ?? '').replace(/^\uFEFF/, '').trim();
  }

  function 取得資料容器(回應) {
    if (!回應 || typeof 回應 !== 'object') return {};
    const 候選 = [回應, 回應.data, 回應.result, 回應.結果, 回應.payload, 回應.資料];
    return 候選.find(項目 => 項目 && typeof 項目 === 'object' && !Array.isArray(項目) && (
      Array.isArray(項目.headers) || Array.isArray(項目.欄位) || Array.isArray(項目.rows) || Array.isArray(項目.資料列)
    )) || 回應;
  }

  function 取得原始資料列(回應, 容器) {
    const 候選 = [
      容器.rows,
      容器.資料列,
      容器.records,
      容器.items,
      Array.isArray(容器.資料) ? 容器.資料 : null,
      回應.rows,
      回應.資料列,
      回應.records,
      回應.items,
      Array.isArray(回應.資料) ? 回應.資料 : null
    ];
    return 候選.find(Array.isArray) || [];
  }

  function 取得欄位(回應, 容器, 資料列) {
    const 候選 = [容器.headers, 容器.欄位, 容器.columns, 回應.headers, 回應.欄位, 回應.columns];
    let 欄位 = 候選.find(Array.isArray) || [];
    欄位 = 欄位.map(文字).filter(Boolean);

    if (!欄位.length) {
      const 第一筆物件 = 資料列.find(列 => 列 && typeof 列 === 'object' && !Array.isArray(列));
      const 直接資料 = 第一筆物件 && 第一筆物件.data && typeof 第一筆物件.data === 'object'
        ? 第一筆物件.data
        : (第一筆物件 && 第一筆物件.資料 && typeof 第一筆物件.資料 === 'object' && !Array.isArray(第一筆物件.資料)
          ? 第一筆物件.資料
          : 第一筆物件);
      if (直接資料) {
        欄位 = Object.keys(直接資料).filter(鍵 => !['rowNumber','列號','_列號','values','值','data','資料'].includes(鍵));
      }
    }
    return 欄位;
  }

  function 資料列轉物件(欄位, 資料列, 預設列號) {
    const 列號 = 資料列 && typeof 資料列 === 'object' && !Array.isArray(資料列)
      ? (資料列.rowNumber || 資料列.列號 || 資料列._列號 || 預設列號)
      : 預設列號;
    const 結果 = { _列號: 列號 };

    if (Array.isArray(資料列)) {
      欄位.forEach((欄名, 索引) => { 結果[欄名] = 資料列[索引] ?? ''; });
      return 結果;
    }

    if (!資料列 || typeof 資料列 !== 'object') {
      欄位.forEach(欄名 => { 結果[欄名] = ''; });
      return 結果;
    }

    const 值陣列 = Array.isArray(資料列.values)
      ? 資料列.values
      : (Array.isArray(資料列.值) ? 資料列.值 : null);
    if (值陣列) {
      欄位.forEach((欄名, 索引) => { 結果[欄名] = 值陣列[索引] ?? ''; });
      return 結果;
    }

    const 直接資料 = 資料列.data && typeof 資料列.data === 'object' && !Array.isArray(資料列.data)
      ? 資料列.data
      : (資料列.資料 && typeof 資料列.資料 === 'object' && !Array.isArray(資料列.資料)
        ? 資料列.資料
        : 資料列);
    欄位.forEach(欄名 => { 結果[欄名] = 直接資料[欄名] ?? ''; });
    return 結果;
  }

  async function 讀取分頁(分頁名稱, 讀取上限) {
    const 回應 = await 原始資料庫.讀取後端('sheetData', {
      sheet: 分頁名稱,
      limit: 讀取上限 || 5000,
      query: ''
    });
    const 容器 = 取得資料容器(回應);
    const 資料列 = 取得原始資料列(回應, 容器);
    const 欄位 = 取得欄位(回應, 容器, 資料列);
    const 資料 = 資料列.map((列, 索引) => 資料列轉物件(欄位, 列, 索引 + 2));

    console.info('[智慧5S資料修復]', 分頁名稱, '欄位', 欄位.length, '資料列', 資料.length);
    return { 欄位, 資料 };
  }

  全域.智慧5S資料庫 = Object.freeze({
    讀取後端: 原始資料庫.讀取後端,
    寫入後端: 原始資料庫.寫入後端,
    讀取分頁,
    送出或排隊: 原始資料庫.送出或排隊,
    同步佇列: 原始資料庫.同步佇列,
    佇列全部: 原始資料庫.佇列全部,
    將資料列轉物件: 資料列轉物件
  });
})(window);
