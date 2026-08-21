(function (全域) {
  'use strict';

  /**
   * 化新精密｜智慧 5S 管理平台
   * Google 試算表直讀備援層
   * 版本：1.0.13
   *
   * 目的：
   * 1. 正式 GAS fetch / JSONP 在 iPhone Safari 或 PWA 失敗時，
   *    直接透過 Google Visualization API 讀取「⭐智慧工廠主資料庫」。
   * 2. 不需要 Cloudflare Worker、不需要新增帳號、不改寫既有 GAS 寫入流程。
   * 3. 寫入仍走原本 Apps Script；本模組只負責「讀取」備援。
   * 4. 直讀只會在原本資料庫讀取失敗後啟用，不影響正常 GAS 路徑。
   *
   * 注意：
   * Google Visualization API 的免登入直讀，要求試算表至少開放
   * 「知道連結的任何人可檢視」。正式環境絕對不應設定為「任何人可編輯」。
   */

  const 設定 = 全域.智慧5S設定;
  const 原始資料庫 = 全域.智慧5S資料庫;

  if (!設定 || !原始資料庫) {
    console.error('智慧5S Google 試算表直讀備援：找不到設定或資料庫模組。');
    return;
  }

  const 直讀狀態 = {
    最近模式: '尚未使用',
    最近分頁: '',
    最近成功時間: '',
    最近錯誤: ''
  };

  function 安全文字(值) {
    if (值 === undefined || 值 === null) return '';
    return String(值).trim();
  }

  function 格式化日期(日期值) {
    if (!(日期值 instanceof Date) || Number.isNaN(日期值.getTime())) return '';
    const 補零 = 數值 => String(數值).padStart(2, '0');
    return `${日期值.getFullYear()}-${補零(日期值.getMonth() + 1)}-${補零(日期值.getDate())} ${補零(日期值.getHours())}:${補零(日期值.getMinutes())}:${補零(日期值.getSeconds())}`;
  }

  function 取得儲存格值(儲存格) {
    if (!儲存格) return '';

    if (儲存格.f !== undefined && 儲存格.f !== null && 儲存格.f !== '') {
      return 儲存格.f;
    }

    const 值 = 儲存格.v;
    if (值 === undefined || 值 === null) return '';
    if (值 instanceof Date) return 格式化日期(值);
    return 值;
  }

  function 建立唯一欄位名稱(欄位清單) {
    const 已使用 = new Map();

    return 欄位清單.map((欄位, 索引) => {
      const 原始名稱 = 安全文字(欄位 && (欄位.label || 欄位.id)) || `欄位${索引 + 1}`;
      const 次數 = (已使用.get(原始名稱) || 0) + 1;
      已使用.set(原始名稱, 次數);
      return 次數 === 1 ? 原始名稱 : `${原始名稱}_${次數}`;
    });
  }

  function 解析Google試算表回應(回應, 分頁名稱) {
    if (!回應 || typeof 回應 !== 'object') {
      throw new Error(`Google 試算表「${分頁名稱}」沒有回傳有效資料`);
    }

    const 狀態 = 安全文字(回應.status).toLowerCase();
    if (狀態 && 狀態 !== 'ok') {
      const 錯誤訊息 = Array.isArray(回應.errors)
        ? 回應.errors.map(項目 => 安全文字(項目 && (項目.detailed_message || 項目.message || 項目.reason))).filter(Boolean).join('；')
        : '';
      throw new Error(錯誤訊息 || `Google 試算表「${分頁名稱}」回傳狀態：${狀態}`);
    }

    const 表格 = 回應.table || {};
    const 原始欄位 = Array.isArray(表格.cols) ? 表格.cols : [];
    const 原始資料列 = Array.isArray(表格.rows) ? 表格.rows : [];
    const 欄位 = 建立唯一欄位名稱(原始欄位);

    if (!欄位.length) {
      throw new Error(`Google 試算表「${分頁名稱}」找不到第一列表頭`);
    }

    const 資料 = 原始資料列.map((資料列, 索引) => {
      const 儲存格清單 = Array.isArray(資料列 && 資料列.c) ? 資料列.c : [];
      const 物件 = { _列號: 索引 + 2 };
      欄位.forEach((欄位名稱, 欄位索引) => {
        物件[欄位名稱] = 取得儲存格值(儲存格清單[欄位索引]);
      });
      return 物件;
    });

    return { 欄位, 資料 };
  }

  function Google試算表JSONP讀取(分頁名稱, 讀取上限) {
    return new Promise((完成, 失敗) => {
      const 分頁 = 安全文字(分頁名稱);
      if (!分頁) return 失敗(new Error('Google 試算表直讀缺少分頁名稱'));
      if (!設定.試算表識別碼) return 失敗(new Error('Google 試算表直讀缺少試算表識別碼'));

      const 上限 = Math.max(1, Math.min(Number(讀取上限 || 設定.讀取上限 || 5000), 10000));
      const 回呼名稱 = `smart5s_gviz_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const 網址 = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(設定.試算表識別碼)}/gviz/tq`);

      網址.searchParams.set('sheet', 分頁);
      網址.searchParams.set('headers', '1');
      網址.searchParams.set('tq', `select * limit ${上限}`);
      網址.searchParams.set('tqx', `out:json;responseHandler:${回呼名稱}`);
      網址.searchParams.set('_', String(Date.now()));

      const 指令碼 = document.createElement('script');
      let 已結束 = false;
      let 計時器 = null;

      const 清理 = () => {
        if (已結束) return;
        已結束 = true;
        if (計時器) clearTimeout(計時器);
        try { delete 全域[回呼名稱]; } catch (錯誤) { 全域[回呼名稱] = undefined; }
        if (指令碼.parentNode) 指令碼.parentNode.removeChild(指令碼);
      };

      全域[回呼名稱] = 回應 => {
        try {
          const 標準資料 = 解析Google試算表回應(回應, 分頁);
          清理();
          直讀狀態.最近模式 = 'Google試算表直讀';
          直讀狀態.最近分頁 = 分頁;
          直讀狀態.最近成功時間 = new Date().toISOString();
          直讀狀態.最近錯誤 = '';
          完成(標準資料);
        } catch (錯誤) {
          清理();
          直讀狀態.最近錯誤 = 安全文字(錯誤 && (錯誤.message || 錯誤));
          失敗(錯誤);
        }
      };

      指令碼.async = true;
      指令碼.referrerPolicy = 'no-referrer';
      指令碼.src = 網址.toString();
      指令碼.onerror = () => {
        清理();
        const 錯誤 = new Error(`Google 試算表直讀失敗：${分頁}`);
        直讀狀態.最近錯誤 = 錯誤.message;
        失敗(錯誤);
      };

      計時器 = setTimeout(() => {
        清理();
        const 錯誤 = new Error(`Google 試算表直讀逾時：${分頁}`);
        直讀狀態.最近錯誤 = 錯誤.message;
        失敗(錯誤);
      }, Math.max(Number(設定.請求逾時毫秒 || 0), 15000));

      document.head.appendChild(指令碼);
    });
  }

  async function 直讀分頁(分頁名稱, 讀取上限) {
    if (!navigator.onLine) throw new Error('目前離線，無法啟動 Google 試算表直讀備援');
    return Google試算表JSONP讀取(分頁名稱, 讀取上限);
  }

  async function 讀取分頁(分頁名稱, 讀取上限) {
    try {
      const 結果 = await 原始資料庫.讀取分頁(分頁名稱, 讀取上限);
      直讀狀態.最近模式 = 'GAS正式後端';
      直讀狀態.最近分頁 = 安全文字(分頁名稱);
      直讀狀態.最近成功時間 = new Date().toISOString();
      直讀狀態.最近錯誤 = '';
      return 結果;
    } catch (原始錯誤) {
      if (!navigator.onLine) throw 原始錯誤;

      console.warn(
        `智慧5S：GAS 讀取「${分頁名稱}」失敗，切換 Google 試算表直讀備援。`,
        原始錯誤
      );

      try {
        return await 直讀分頁(分頁名稱, 讀取上限);
      } catch (備援錯誤) {
        const 原始訊息 = 安全文字(原始錯誤 && (原始錯誤.message || 原始錯誤));
        const 備援訊息 = 安全文字(備援錯誤 && (備援錯誤.message || 備援錯誤));
        throw new Error(`GAS 與 Google 試算表直讀皆失敗｜GAS：${原始訊息 || '未知錯誤'}｜直讀：${備援訊息 || '未知錯誤'}`);
      }
    }
  }

  async function 讀取後端(動作, 其他參數) {
    try {
      return await 原始資料庫.讀取後端(動作, 其他參數);
    } catch (原始錯誤) {
      const 動作名稱 = 安全文字(動作);
      const 參數 = 其他參數 || {};
      if (動作名稱 !== 'sheetData' || !navigator.onLine) throw 原始錯誤;

      const 分頁名稱 = 參數.sheet || 參數.sheetName || 參數.分頁名稱 || 參數.工作表名稱;
      if (!分頁名稱) throw 原始錯誤;
      return 直讀分頁(分頁名稱, 參數.limit || 參數.上限 || 設定.讀取上限);
    }
  }

  async function 測試Google試算表直讀(分頁名稱) {
    const 目標分頁 = 安全文字(分頁名稱) || 設定.分頁.人員主檔;
    const 結果 = await 直讀分頁(目標分頁, 5);
    return {
      成功: true,
      模式: 'Google試算表直讀',
      分頁: 目標分頁,
      欄位數: 結果.欄位.length,
      資料筆數: 結果.資料.length,
      時間: new Date().toISOString()
    };
  }

  const 新資料庫 = Object.assign({}, 原始資料庫, {
    讀取後端,
    讀取分頁,
    Google試算表直讀: 直讀分頁,
    測試Google試算表直讀,
    取得直讀狀態: () => Object.assign({}, 直讀狀態)
  });

  全域.智慧5S資料庫 = Object.freeze(新資料庫);
})(window);
