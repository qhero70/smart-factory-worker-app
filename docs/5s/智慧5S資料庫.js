(function (全域) {
  'use strict';

  const 設定 = 全域.智慧5S設定;
  const 本機資料庫名稱 = '智慧5S本機資料庫';
  const 本機資料庫版本 = 1;
  const 佇列表名稱 = '待同步佇列';
  let 本機資料庫連線 = null;

  function 逾時控制器(毫秒) {
    const 控制器 = new AbortController();
    const 計時器 = setTimeout(() => 控制器.abort(), 毫秒);
    return { 控制器, 清除: () => clearTimeout(計時器) };
  }

  function 解析回應文字(文字) {
    const 清理後 = String(文字 || '').trim().replace(/^\uFEFF/, '');
    try { return JSON.parse(清理後); } catch (錯誤) {
      const 配對 = 清理後.match(/^[\w$]+\((.*)\);?$/s);
      if (配對) return JSON.parse(配對[1]);
      throw new Error('後端回傳格式不是有效資料');
    }
  }

  function 共用參數(動作, 其他參數) {
    return Object.assign({
      action: 動作,
      spreadsheetId: 設定.試算表識別碼,
      token: localStorage.getItem('智慧5S_後端權杖') || ''
    }, 其他參數 || {});
  }

  async function 讀取後端(動作, 其他參數) {
    if (!navigator.onLine) throw new Error('目前離線');
    const 網址 = new URL(設定.後端網址);
    Object.entries(共用參數(動作, 其他參數)).forEach(([鍵, 值]) => {
      if (值 !== undefined && 值 !== null) 網址.searchParams.set(鍵, String(值));
    });
    const 逾時 = 逾時控制器(設定.請求逾時毫秒);
    try {
      const 回應 = await fetch(網址.toString(), {
        method: 'GET',
        cache: 'no-store',
        redirect: 'follow',
        signal: 逾時.控制器.signal
      });
      const 資料 = 解析回應文字(await 回應.text());
      if (資料 && 資料.ok === false) throw new Error(資料.error || 資料.訊息 || '後端讀取失敗');
      if (資料 && 資料.成功 === false) throw new Error(資料.訊息 || '後端讀取失敗');
      return 資料;
    } catch (錯誤) {
      if (錯誤.name === 'AbortError') throw new Error('後端讀取逾時');
      throw 錯誤;
    } finally {
      逾時.清除();
    }
  }

  async function 寫入後端(動作, 其他參數) {
    if (!navigator.onLine) throw new Error('目前離線');
    const 逾時 = 逾時控制器(設定.請求逾時毫秒);
    try {
      const 回應 = await fetch(設定.後端網址, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(共用參數(動作, 其他參數)),
        redirect: 'follow',
        signal: 逾時.控制器.signal
      });
      const 資料 = 解析回應文字(await 回應.text());
      if (資料 && 資料.ok === false) throw new Error(資料.error || 資料.訊息 || '後端寫入失敗');
      if (資料 && 資料.成功 === false) throw new Error(資料.訊息 || '後端寫入失敗');
      return 資料;
    } catch (錯誤) {
      if (錯誤.name === 'AbortError') throw new Error('後端寫入逾時');
      throw 錯誤;
    } finally {
      逾時.清除();
    }
  }

  function 開啟本機資料庫() {
    if (本機資料庫連線) return Promise.resolve(本機資料庫連線);
    return new Promise((完成, 失敗) => {
      const 請求 = indexedDB.open(本機資料庫名稱, 本機資料庫版本);
      請求.onupgradeneeded = 事件 => {
        const 資料庫 = 事件.target.result;
        if (!資料庫.objectStoreNames.contains(佇列表名稱)) {
          const 資料表 = 資料庫.createObjectStore(佇列表名稱, { keyPath: '本機識別碼' });
          資料表.createIndex('建立時間', '建立時間', { unique: false });
        }
      };
      請求.onsuccess = 事件 => {
        本機資料庫連線 = 事件.target.result;
        完成(本機資料庫連線);
      };
      請求.onerror = () => 失敗(請求.error || new Error('無法開啟本機資料庫'));
    });
  }

  async function 佇列新增(工作) {
    const 資料庫 = await 開啟本機資料庫();
    const 完整工作 = Object.assign({
      本機識別碼: crypto.randomUUID ? crypto.randomUUID() : `本機-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      建立時間: new Date().toISOString(),
      嘗試次數: 0,
      最後錯誤: ''
    }, 工作);
    return new Promise((完成, 失敗) => {
      const 交易 = 資料庫.transaction(佇列表名稱, 'readwrite');
      交易.objectStore(佇列表名稱).put(完整工作);
      交易.oncomplete = () => 完成(完整工作);
      交易.onerror = () => 失敗(交易.error);
    });
  }

  async function 佇列全部() {
    const 資料庫 = await 開啟本機資料庫();
    return new Promise((完成, 失敗) => {
      const 交易 = 資料庫.transaction(佇列表名稱, 'readonly');
      const 請求 = 交易.objectStore(佇列表名稱).getAll();
      請求.onsuccess = () => 完成((請求.result || []).sort((甲, 乙) => String(甲.建立時間).localeCompare(String(乙.建立時間))));
      請求.onerror = () => 失敗(請求.error);
    });
  }

  async function 佇列刪除(本機識別碼) {
    const 資料庫 = await 開啟本機資料庫();
    return new Promise((完成, 失敗) => {
      const 交易 = 資料庫.transaction(佇列表名稱, 'readwrite');
      交易.objectStore(佇列表名稱).delete(本機識別碼);
      交易.oncomplete = () => 完成();
      交易.onerror = () => 失敗(交易.error);
    });
  }

  async function 佇列更新錯誤(工作, 錯誤訊息) {
    const 資料庫 = await 開啟本機資料庫();
    const 新工作 = Object.assign({}, 工作, {
      嘗試次數: Number(工作.嘗試次數 || 0) + 1,
      最後錯誤: String(錯誤訊息 || ''),
      最後嘗試時間: new Date().toISOString()
    });
    return new Promise((完成, 失敗) => {
      const 交易 = 資料庫.transaction(佇列表名稱, 'readwrite');
      交易.objectStore(佇列表名稱).put(新工作);
      交易.oncomplete = () => 完成();
      交易.onerror = () => 失敗(交易.error);
    });
  }

  function 將資料列轉物件(欄位, 資料列) {
    const 物件 = { _列號: 資料列.rowNumber || 資料列.列號 || null };
    const 值陣列 = Array.isArray(資料列.values) ? 資料列.values : (Array.isArray(資料列.值) ? 資料列.值 : []);
    欄位.forEach((欄名, 索引) => { 物件[欄名] = 值陣列[索引] ?? ''; });
    return 物件;
  }

  async function 讀取分頁(分頁名稱, 讀取上限) {
    const 回應 = await 讀取後端('sheetData', {
      sheet: 分頁名稱,
      limit: 讀取上限 || 設定.讀取上限,
      query: ''
    });
    const 欄位 = 回應.headers || 回應.欄位 || [];
    const 資料列 = 回應.rows || 回應.資料 || [];
    return { 欄位, 資料: 資料列.map(列 => 將資料列轉物件(欄位, 列)) };
  }

  async function 執行工作(工作) {
    if (工作.工作類型 === '新增') {
      return 寫入後端('appendRow', {
        sheet: 工作.分頁名稱,
        headers: 工作.欄位,
        values: 工作.值
      });
    }
    if (工作.工作類型 === '更新') {
      return 寫入後端('updateRow', {
        sheet: 工作.分頁名稱,
        rowNumber: 工作.列號,
        headers: 工作.欄位,
        values: 工作.值
      });
    }
    throw new Error(`不支援的工作類型：${工作.工作類型}`);
  }

  async function 送出或排隊(工作) {
    try {
      const 結果 = await 執行工作(工作);
      return { 已同步: true, 已排隊: false, 結果 };
    } catch (錯誤) {
      const 可排隊 = !navigator.onLine || /離線|Failed to fetch|NetworkError|逾時|Load failed/i.test(String(錯誤.message || 錯誤));
      if (!可排隊) throw 錯誤;
      const 佇列工作 = await 佇列新增(工作);
      return { 已同步: false, 已排隊: true, 佇列工作, 錯誤 };
    }
  }

  async function 同步佇列(進度回呼) {
    if (!navigator.onLine) return { 成功: 0, 失敗: 0, 剩餘: (await 佇列全部()).length };
    const 全部工作 = await 佇列全部();
    let 成功 = 0;
    let 失敗 = 0;
    for (let 索引 = 0; 索引 < 全部工作.length; 索引 += 1) {
      const 工作 = 全部工作[索引];
      try {
        await 執行工作(工作);
        await 佇列刪除(工作.本機識別碼);
        成功 += 1;
      } catch (錯誤) {
        await 佇列更新錯誤(工作, 錯誤.message || 錯誤);
        失敗 += 1;
        if (!navigator.onLine) break;
      }
      if (typeof 進度回呼 === 'function') 進度回呼({ 索引: 索引 + 1, 總數: 全部工作.length, 成功, 失敗 });
    }
    const 剩餘 = (await 佇列全部()).length;
    return { 成功, 失敗, 剩餘 };
  }

  全域.智慧5S資料庫 = Object.freeze({
    讀取後端,
    寫入後端,
    讀取分頁,
    送出或排隊,
    同步佇列,
    佇列全部,
    將資料列轉物件
  });
})(window);
