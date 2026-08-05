(function (全域) {
  'use strict';

  const 設定 = 全域.智慧5S設定;
  const 資料庫 = 全域.智慧5S資料庫;
  const 快取前綴 = '智慧5S_分頁快取_';
  const 使用者快取鍵 = '智慧5S_目前使用者';
  const 裝置識別碼鍵 = '智慧5S_裝置識別碼';

  const 巡檢主檔欄位 = ['巡檢單號','區域代碼','區域名稱','檢查清單代碼','巡檢人工號','巡檢人姓名','巡檢日期','開始時間','送出時間','總得分','最高總分','得分率','異常項數','狀態','裝置識別碼','備註','建立時間'];
  const 巡檢明細欄位 = ['明細編號','巡檢單號','項目代碼','5S分類','檢查內容','得分','最高分','權重','是否異常','異常原因','照片資料','改善單號','建立時間'];
  const 改善單欄位 = ['改善單號','來源類型','來源單號','區域代碼','區域名稱','5S分類','問題標題','問題說明','嚴重度','負責人工號','負責人姓名','期限','狀態','改善前照片','改善後照片','驗證人工號','驗證時間','驗證結果','結案時間','逾期天數','建立時間','更新時間'];
  const 改善歷程欄位 = ['歷程編號','改善單號','動作','原狀態','新狀態','執行人工號','執行人姓名','執行時間','說明'];
  const 盤點欄位 = ['盤點編號','盤點日期','部門','區域','位置','物品名稱','規格型號','數量','單位','使用頻率','最近使用日','必要性判定','判定理由','保留上限','紅牌需求','紅牌編號','建議處置','責任部門','盤點人','照片資料','備註','區域代碼','建立時間'];
  const 紅牌欄位 = ['紅牌編號','掛牌日','盤點編號','部門','區域','物品名稱','規格型號','數量','單位','紅牌原因','暫存位置','處置建議','責任部門','責任人','預定處置日','案件狀態','實際處置日','處置結果證據','複查人','逾期天數','改善單號','LINE已通知'];
  const 照片欄位 = ['照片編號','參照類型','參照單號','區域代碼','上傳人工號','拍攝時間','資料摘要','儲存方式','照片資料'];
  const 通知欄位 = ['通知編號','通知場景','對象類型','對象識別碼','訊息類型','內容摘要','狀態','送出時間','錯誤訊息','去重鍵'];

  const 狀態 = {
    目前頁面: '首頁',
    使用者: null,
    安裝事件: null,
    資料: {},
    欄位: {},
    目前巡檢: null,
    改善篩選: '未結案',
    紅牌篩選: '未結案',
    正在同步: false
  };

  const 元素 = {};

  function 取得元素(識別碼) { return document.getElementById(識別碼); }
  function 數值(內容, 預設值) { const 結果 = Number(內容); return Number.isFinite(結果) ? 結果 : (預設值 || 0); }
  function 文字(內容) { return String(內容 ?? '').trim(); }
  function 轉義(內容) {
    return String(內容 ?? '').replace(/[&<>'"]/g, 字元 => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[字元]));
  }
  function 現在() { return new Date(); }
  function 補零(數字) { return String(數字).padStart(2, '0'); }
  function 日期字串(日期) {
    const 值 = 日期 instanceof Date ? 日期 : new Date(日期 || Date.now());
    return `${值.getFullYear()}-${補零(值.getMonth() + 1)}-${補零(值.getDate())}`;
  }
  function 時間字串(日期) {
    const 值 = 日期 instanceof Date ? 日期 : new Date(日期 || Date.now());
    return `${補零(值.getHours())}:${補零(值.getMinutes())}:${補零(值.getSeconds())}`;
  }
  function 完整時間字串(日期) { return `${日期字串(日期)} ${時間字串(日期)}`; }
  function 日期加天(日期, 天數) { const 值 = new Date(日期); 值.setDate(值.getDate() + 數值(天數)); return 日期字串(值); }
  function 產生識別碼(前綴) {
    const 值 = 現在();
    const 時戳 = `${值.getFullYear()}${補零(值.getMonth()+1)}${補零(值.getDate())}${補零(值.getHours())}${補零(值.getMinutes())}${補零(值.getSeconds())}`;
    return `${前綴}-${時戳}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  }
  function 取得裝置識別碼() {
    let 識別碼 = localStorage.getItem(裝置識別碼鍵);
    if (!識別碼) {
      識別碼 = crypto.randomUUID ? crypto.randomUUID() : 產生識別碼('裝置');
      localStorage.setItem(裝置識別碼鍵, 識別碼);
    }
    return 識別碼;
  }
  function 取得天數差(日期文字) {
    if (!日期文字) return null;
    const 到期 = new Date(`${日期文字}T23:59:59`);
    if (Number.isNaN(到期.getTime())) return null;
    return Math.ceil((到期.getTime() - Date.now()) / 86400000);
  }
  function 格式化百分比(值) { return `${Math.round(數值(值))}%`; }
  function 是否未結案(值) { return !['已結案','已完成','作廢'].includes(文字(值)); }
  function 是否管理者() { return 狀態.使用者 && ['主管','區域負責人'].includes(狀態.使用者.系統角色); }

  function 顯示讀取(標題, 說明) {
    元素.讀取標題.textContent = 標題 || '資料處理中';
    元素.讀取說明.textContent = 說明 || '請稍候…';
    元素.讀取遮罩.classList.remove('隱藏');
  }
  function 隱藏讀取() { 元素.讀取遮罩.classList.add('隱藏'); }
  function 顯示通知(內容, 類型) {
    元素.通知.textContent = 內容;
    元素.通知.className = `通知 顯示${類型 ? ` ${類型}` : ''}`;
    clearTimeout(顯示通知.計時器);
    顯示通知.計時器 = setTimeout(() => { 元素.通知.className = '通知'; }, 3000);
  }
  function 更新連線狀態() {
    const 在線 = navigator.onLine;
    元素.連線狀態.classList.toggle('離線', !在線);
    元素.連線狀態.querySelector('span:last-child').textContent = 在線 ? '在線' : '離線';
    元素.登入離線提示.classList.toggle('隱藏', 在線);
  }
  function 開啟彈窗(標題, 副標, 內容) {
    元素.彈窗標題.textContent = 標題;
    元素.彈窗副標.textContent = 副標 || '';
    元素.彈窗內容.innerHTML = 內容;
    元素.彈窗遮罩.classList.remove('隱藏');
    document.body.style.overflow = 'hidden';
  }
  function 關閉彈窗() {
    元素.彈窗遮罩.classList.add('隱藏');
    元素.彈窗內容.innerHTML = '';
    document.body.style.overflow = '';
  }

  function 儲存分頁快取(分頁名稱, 結果) {
    try {
      localStorage.setItem(`${快取前綴}${分頁名稱}`, JSON.stringify({ 更新時間: Date.now(), 結果 }));
    } catch (錯誤) {
      console.warn('分頁快取儲存失敗', 分頁名稱, 錯誤);
    }
  }
  function 讀取分頁快取(分頁名稱) {
    try {
      const 內容 = JSON.parse(localStorage.getItem(`${快取前綴}${分頁名稱}`) || 'null');
      return 內容 && 內容.結果 ? 內容.結果 : null;
    } catch (錯誤) { return null; }
  }
  async function 安全讀取分頁(分頁名稱, 強制更新) {
    if (!強制更新 && 狀態.資料[分頁名稱]) return { 欄位: 狀態.欄位[分頁名稱], 資料: 狀態.資料[分頁名稱] };
    try {
      const 結果 = await 資料庫.讀取分頁(分頁名稱, 設定.讀取上限);
      狀態.資料[分頁名稱] = 結果.資料;
      狀態.欄位[分頁名稱] = 結果.欄位;
      儲存分頁快取(分頁名稱, 結果);
      return 結果;
    } catch (錯誤) {
      const 快取 = 讀取分頁快取(分頁名稱);
      if (快取) {
        狀態.資料[分頁名稱] = 快取.資料 || [];
        狀態.欄位[分頁名稱] = 快取.欄位 || [];
        return 快取;
      }
      throw 錯誤;
    }
  }
  function 物件轉值(物件, 欄位) { return 欄位.map(欄名 => 物件[欄名] ?? ''); }
  async function 新增資料(分頁名稱, 欄位, 物件) {
    return 資料庫.送出或排隊({ 工作類型: '新增', 分頁名稱, 欄位, 值: 物件轉值(物件, 欄位) });
  }
  async function 更新資料(分頁名稱, 物件, 指定欄位) {
    const 欄位 = 指定欄位 && 指定欄位.length ? 指定欄位 : (狀態.欄位[分頁名稱] || Object.keys(物件).filter(鍵 => 鍵 !== '_列號'));
    if (!物件._列號) throw new Error('此筆資料缺少列號，請重新讀取後再操作');
    return 資料庫.送出或排隊({ 工作類型: '更新', 分頁名稱, 列號: 物件._列號, 欄位, 值: 物件轉值(物件, 欄位) });
  }
  function 清除資料快取(分頁名稱) {
    delete 狀態.資料[分頁名稱];
    delete 狀態.欄位[分頁名稱];
    localStorage.removeItem(`${快取前綴}${分頁名稱}`);
  }

  function 判斷角色(人員) {
    const 職稱 = 文字(人員.職稱);
    const 角色類型 = 文字(人員.角色類型);
    if (/營運長|總經理|經理|副理|課長|主任|主管/.test(職稱) || /主管/.test(角色類型)) return '主管';
    if (/工程師|助理工程師|領班|組長/.test(職稱) || /幹部/.test(角色類型)) return '區域負責人';
    return '現場人員';
  }
  function 建立使用者(人員) {
    return {
      工號: 文字(人員.工號),
      姓名: 文字(人員.姓名),
      部門: 文字(人員.部門) || '製造部',
      組別: 文字(人員.組別),
      職稱: 文字(人員.職稱),
      班別: 文字(人員.班別),
      系統角色: 判斷角色(人員)
    };
  }

  async function 執行登入() {
    const 關鍵字 = 文字(元素.登入工號.value);
    if (!關鍵字) return 顯示通知('請輸入工號或姓名', '警告');
    顯示讀取('核對人員資料', '正在讀取 01_人員主檔…');
    try {
      const 結果 = await 安全讀取分頁(設定.分頁.人員主檔, true);
      const 小寫 = 關鍵字.toLowerCase();
      const 人員 = 結果.資料.find(列 => 文字(列.工號).toLowerCase() === 小寫 || 文字(列.姓名) === 關鍵字)
        || 結果.資料.find(列 => 文字(列.姓名).includes(關鍵字));
      if (!人員) throw new Error('人員主檔找不到此工號或姓名');
      if (文字(人員.啟用) === '否') throw new Error('此人員目前已停用，請聯絡主管');
      狀態.使用者 = 建立使用者(人員);
      localStorage.setItem(使用者快取鍵, JSON.stringify(狀態.使用者));
      await 進入系統();
    } catch (錯誤) {
      顯示通知(錯誤.message || '登入失敗', '錯誤');
    } finally { 隱藏讀取(); }
  }

  async function 進入系統() {
    元素.登入頁.classList.add('隱藏');
    元素.應用程式.classList.remove('隱藏');
    元素.使用者頭像.textContent = (狀態.使用者.姓名 || '5S').slice(-2);
    顯示讀取('載入智慧 5S', '正在取得區域與檢查標準…');
    try {
      await Promise.all([
        安全讀取分頁(設定.分頁.區域主檔, true),
        安全讀取分頁(設定.分頁.檢查項目, true)
      ]);
      const 頁面參數 = new URLSearchParams(location.search).get('頁面');
      切換頁面(['首頁','巡檢','改善','紅牌','設定'].includes(頁面參數) ? 頁面參數 : '首頁');
      if (navigator.onLine) setTimeout(() => 同步離線資料(false), 700);
    } catch (錯誤) {
      顯示通知(`核心資料載入失敗：${錯誤.message}`, '錯誤');
      切換頁面('設定');
    } finally { 隱藏讀取(); }
  }

  function 登出() {
    localStorage.removeItem(使用者快取鍵);
    狀態.使用者 = null;
    狀態.目前巡檢 = null;
    元素.應用程式.classList.add('隱藏');
    元素.登入頁.classList.remove('隱藏');
    元素.登入工號.value = '';
    關閉彈窗();
  }

  function 切換頁面(頁面) {
    狀態.目前頁面 = 頁面;
    document.querySelectorAll('.導航按鈕').forEach(按鈕 => 按鈕.classList.toggle('作用中', 按鈕.dataset.頁面 === 頁面));
    元素.浮動按鈕.classList.toggle('隱藏', !['紅牌'].includes(頁面));
    const 標題資料 = {
      首頁: ['智慧 5S 戰情中心', `${狀態.使用者.部門}｜${狀態.使用者.姓名} · ${狀態.使用者.系統角色}`],
      巡檢: ['5S 行動巡檢', '選擇區域後逐項評分與拍照'],
      改善: ['改善閉環追蹤', '責任、期限、照片與驗證狀態'],
      紅牌: ['紅牌與物品盤點', '非必要品暫存、處置與逾期追蹤'],
      設定: ['個人與系統設定', '離線同步、PWA 安裝與資料更新']
    }[頁面];
    元素.頁面標題.textContent = 標題資料[0];
    元素.頁面副標.textContent = 標題資料[1];
    元素.頁面內容.innerHTML = '<div class="空狀態"><div class="空狀態圖示">⏳</div><b>資料載入中</b><span>請稍候</span></div>';
    元素.頁面內容.scrollTop = 0;
    if (頁面 === '首頁') 顯示首頁();
    if (頁面 === '巡檢') 顯示巡檢入口();
    if (頁面 === '改善') 顯示改善頁();
    if (頁面 === '紅牌') 顯示紅牌頁();
    if (頁面 === '設定') 顯示設定頁();
  }

  async function 載入戰情資料(強制更新) {
    const 分頁清單 = [設定.分頁.巡檢主檔, 設定.分頁.巡檢明細, 設定.分頁.改善單, 設定.分頁.紅牌追蹤];
    const 結果 = await Promise.allSettled(分頁清單.map(分頁 => 安全讀取分頁(分頁, 強制更新)));
    const 失敗 = 結果.filter(項目 => 項目.status === 'rejected');
    if (失敗.length === 分頁清單.length) throw 失敗[0].reason;
  }

  function 計算戰情() {
    const 今天 = 日期字串(現在());
    const 巡檢 = 狀態.資料[設定.分頁.巡檢主檔] || [];
    const 今日巡檢 = 巡檢.filter(列 => 文字(列.巡檢日期) === 今天 && 文字(列.狀態) !== '作廢');
    const 平均分 = 今日巡檢.length ? 今日巡檢.reduce((總, 列) => 總 + 數值(列.得分率), 0) / 今日巡檢.length : 0;
    const 改善 = 狀態.資料[設定.分頁.改善單] || [];
    const 未結改善 = 改善.filter(列 => 是否未結案(列.狀態));
    const 逾期改善 = 未結改善.filter(列 => {
      const 差 = 取得天數差(列.期限);
      return 差 !== null && 差 < 0;
    });
    const 紅牌 = 狀態.資料[設定.分頁.紅牌追蹤] || [];
    const 未結紅牌 = 紅牌.filter(列 => !['已完成','已結案'].includes(文字(列.案件狀態)));
    const 區域 = (狀態.資料[設定.分頁.區域主檔] || []).filter(列 => 文字(列.啟用) !== '否');
    const 排名 = 區域.map(區 => {
      const 區域巡檢 = 巡檢.filter(列 => 文字(列.區域代碼) === 文字(區.區域代碼) && 文字(列.狀態) !== '作廢');
      const 最近 = 區域巡檢.slice().sort((甲,乙) => 文字(乙.送出時間).localeCompare(文字(甲.送出時間))).slice(0, 7);
      const 分數 = 最近.length ? 最近.reduce((總, 列) => 總 + 數值(列.得分率), 0) / 最近.length : 0;
      return { 區域代碼: 區.區域代碼, 區域名稱: 區.區域名稱, 分數, 巡檢數: 最近.length };
    }).sort((甲,乙) => 乙.分數 - 甲.分數);
    return { 今日巡檢數: 今日巡檢.length, 平均分, 未結改善數: 未結改善.length, 逾期改善數: 逾期改善.length, 未結紅牌數: 未結紅牌.length, 排名 };
  }

  function 計算分類分數() {
    const 明細 = 狀態.資料[設定.分頁.巡檢明細] || [];
    const 分類 = ['整理','整頓','清掃','清潔','素養'];
    return 分類.map(名稱 => {
      const 資料 = 明細.filter(列 => 文字(列['5S分類']) === 名稱).slice(-200);
      const 分子 = 資料.reduce((總, 列) => 總 + 數值(列.得分) * 數值(列.權重, 1), 0);
      const 分母 = 資料.reduce((總, 列) => 總 + 數值(列.最高分, 5) * 數值(列.權重, 1), 0);
      return { 名稱, 分數: 分母 ? 分子 / 分母 * 100 : 0 };
    });
  }

  async function 顯示首頁(強制更新) {
    try {
      await 載入戰情資料(強制更新);
      const 戰情 = 計算戰情();
      const 分類 = 計算分類分數();
      const 排名內容 = 戰情.排名.length ? 戰情.排名.slice(0, 6).map((列, 索引) => `
        <div class="排行列">
          <div class="名次 ${索引 < 3 ? '前三' : ''}">${索引 + 1}</div>
          <div><b>${轉義(列.區域名稱)}</b><div class="卡片副標">近 ${列.巡檢數} 次巡檢</div></div>
          <div class="排行分數">${列.巡檢數 ? 格式化百分比(列.分數) : '未巡檢'}</div>
        </div>`).join('') : 空狀態('📍','尚無區域資料','請先在 5S_區域主檔啟用區域');
      const 分類內容 = 分類.map(列 => `
        <div class="分類列"><span>${列.名稱}</span><div class="進度條"><span style="width:${Math.min(100, Math.max(0, 列.分數))}%"></span></div><b>${Math.round(列.分數)}</b></div>`).join('');
      元素.頁面內容.innerHTML = `
        <section class="主視覺">
          <h2>${問候語()}，${轉義(狀態.使用者.姓名)}</h2>
          <p>今日示範區巡檢 ${戰情.今日巡檢數} 次，未結改善 ${戰情.未結改善數} 件。先把異常變成有責任人、有期限、有照片的改善案件。</p>
          <div class="主視覺操作"><button class="主要按鈕" data-動作="前往巡檢">立即開始巡檢</button><button class="次要按鈕" data-動作="重新整理首頁">更新戰情</button></div>
        </section>
        <section class="網格 統計網格">
          ${統計卡('今日巡檢', 戰情.今日巡檢數, '📋', 戰情.今日巡檢數 ? '已有現場紀錄' : '尚未開始', '資訊字')}
          ${統計卡('平均得分', 格式化百分比(戰情.平均分), '📊', 戰情.平均分 >= 設定.及格分數 ? '達到及格標準' : '低於 85 分', 戰情.平均分 >= 設定.及格分數 ? '成功字' : '警告字')}
          ${統計卡('未結改善', 戰情.未結改善數, '🛠', `逾期 ${戰情.逾期改善數} 件`, 戰情.逾期改善數 ? '危險字' : '成功字')}
          ${統計卡('紅牌待處置', 戰情.未結紅牌數, '🏷', '30 天內完成處置', 戰情.未結紅牌數 ? '警告字' : '成功字')}
        </section>
        <div class="區段標題"><div><h2>快速作業</h2><p>現場常用入口</p></div></div>
        <section class="網格 快速網格">
          ${快速卡('開始巡檢','選區域、評分、異常拍照','✓','綠底','巡檢')}
          ${快速卡('改善追蹤','接單、改善、驗證、結案','🛠','酒紅底','改善')}
          ${快速卡('物品盤點','依使用頻率判定必要性','📦','藍底','新增盤點')}
          ${快速卡('紅牌處置','查看暫存天數與逾期案件','🏷','橙底','紅牌')}
        </section>
        <section class="網格 雙欄">
          <article class="卡片"><div class="卡片標題列"><div><div class="卡片標題">區域 5S 排名</div><div class="卡片副標">近 7 次巡檢平均</div></div></div>${排名內容}</article>
          <article class="卡片"><div class="卡片標題列"><div><div class="卡片標題">五大分類成熟度</div><div class="卡片副標">依已送出巡檢明細計算</div></div></div><div class="分類條">${分類內容}</div></article>
        </section>`;
      元素.頁面內容.querySelector('[data-動作="前往巡檢"]').onclick = () => 切換頁面('巡檢');
      元素.頁面內容.querySelector('[data-動作="重新整理首頁"]').onclick = () => 顯示首頁(true);
      元素.頁面內容.querySelectorAll('[data-快速動作]').forEach(按鈕 => 按鈕.onclick = () => {
        const 動作 = 按鈕.dataset.快速動作;
        if (動作 === '新增盤點') { 切換頁面('紅牌'); setTimeout(開啟新增盤點, 150); }
        else 切換頁面(動作);
      });
    } catch (錯誤) {
      元素.頁面內容.innerHTML = 錯誤卡('戰情資料無法讀取', 錯誤.message);
    }
  }

  function 問候語() {
    const 小時 = new Date().getHours();
    if (小時 < 11) return '早安';
    if (小時 < 18) return '工作順利';
    return '辛苦了';
  }
  function 統計卡(名稱, 值, 圖示, 趨勢, 類別) {
    return `<article class="卡片 統計卡"><div class="統計名稱">${名稱}</div><div class="統計數值">${值}</div><div class="統計趨勢 ${類別}">${趨勢}</div><div class="統計圖示">${圖示}</div></article>`;
  }
  function 快速卡(標題, 副標, 圖示, 底色, 動作) {
    return `<button class="卡片 快速卡" data-快速動作="${動作}"><div class="快速圖示 ${底色}">${圖示}</div><b>${標題}</b><small>${副標}</small></button>`;
  }
  function 空狀態(圖示, 標題, 說明) { return `<div class="空狀態"><div class="空狀態圖示">${圖示}</div><b>${標題}</b><span>${說明}</span></div>`; }
  function 錯誤卡(標題, 說明) { return `<div class="卡片"><div class="空狀態"><div class="空狀態圖示">⚠️</div><b>${轉義(標題)}</b><span>${轉義(說明)}</span><div class="按鈕列" style="justify-content:center;margin-top:16px"><button class="次要按鈕" onclick="location.reload()">重新載入</button></div></div></div>`; }

  function 有效區域() {
    return (狀態.資料[設定.分頁.區域主檔] || []).filter(列 => 文字(列.啟用) !== '否');
  }
  function 顯示巡檢入口() {
    狀態.目前巡檢 = null;
    const 區域 = 有效區域();
    const 內容 = 區域.length ? 區域.map((列, 索引) => `
      <button class="卡片 區域卡" data-區域索引="${索引}" type="button" style="text-align:left">
        <div><div class="區域代碼">${轉義(列.區域代碼)}</div><div class="區域名稱">${轉義(列.區域名稱)}</div><div class="區域資訊"><span class="標籤 綠">${轉義(列.巡檢頻率 || '每日')}</span><span class="標籤 藍">${轉義(列.檢查清單代碼)}</span></div></div>
        <div class="圓形分數" style="--百分比:0%"><b>開始</b></div>
      </button>`).join('') : 空狀態('📍','沒有啟用的巡檢區域','請先維護 5S_區域主檔');
    元素.頁面內容.innerHTML = `
      <section class="主視覺"><h2>今天從哪一區開始？</h2><p>示範區先建立共同標準，再由種子教官推廣至各線。低於滿分的項目必須填原因並拍照。</p></section>
      <div class="區段標題"><div><h2>巡檢區域</h2><p>點選後載入對應檢查清單</p></div></div>
      <section class="清單">${內容}</section>`;
    元素.頁面內容.querySelectorAll('[data-區域索引]').forEach(按鈕 => 按鈕.onclick = () => 開始巡檢(區域[數值(按鈕.dataset.區域索引)]));
  }

  function 開始巡檢(區域) {
    const 清單代碼 = 文字(區域.檢查清單代碼);
    const 項目 = (狀態.資料[設定.分頁.檢查項目] || [])
      .filter(列 => 文字(列.檢查清單代碼) === 清單代碼 && 文字(列.啟用) !== '否')
      .sort((甲,乙) => 數值(甲.順序) - 數值(乙.順序))
      .map(列 => ({ 原始資料: 列, 分數: null, 異常原因: '', 照片資料: '' }));
    if (!項目.length) return 顯示通知('此區域沒有可用的檢查項目', '警告');
    狀態.目前巡檢 = { 區域, 項目, 開始時間: 完整時間字串(現在()), 備註: '' };
    顯示巡檢表單();
  }

  function 顯示巡檢表單() {
    const 巡檢 = 狀態.目前巡檢;
    const 項目內容 = 巡檢.項目.map((項目, 索引) => {
      const 資料 = 項目.原始資料;
      const 分類 = 文字(資料['5S分類']) || '整理';
      return `<article class="巡檢項目" data-巡檢項目="${索引}">
        <div class="項目上列"><div class="項目序號 分類-${分類}">${索引 + 1}</div><div><div class="項目內容">${轉義(資料.檢查內容)}</div><div class="判定基準">${轉義(資料.判定基準)}</div><div style="margin-top:7px"><span class="標籤">${轉義(分類)}</span>${數值(資料.權重,1) > 1 ? `<span class="標籤 紅" style="margin-left:6px">重大權重 ×${數值(資料.權重,1)}</span>` : ''}</div></div></div>
        <div class="評分列">
          <button class="評分按鈕" type="button" data-分數="5">5<br><small>符合</small></button>
          <button class="評分按鈕" type="button" data-分數="3">3<br><small>輕微</small></button>
          <button class="評分按鈕" type="button" data-分數="1">1<br><small>異常</small></button>
          <button class="評分按鈕" type="button" data-分數="0">0<br><small>重大</small></button>
        </div>
        <div class="異常區 隱藏">
          <textarea class="文字框" data-異常原因 placeholder="請說明不符合現況、位置與需要改善的內容"></textarea>
          <label class="照片按鈕">📷 拍攝異常現況<input class="隱藏" type="file" accept="image/*" capture="environment" data-異常照片></label>
          <img class="照片預覽 隱藏" alt="異常照片預覽">
          <div class="提示文字">照片會壓縮後寫入中央資料庫；離線時先保存在本機同步佇列。</div>
        </div>
      </article>`;
    }).join('');
    元素.頁面內容.innerHTML = `
      <div class="巡檢頁頭">
        <div class="巡檢進度列"><div><b>${轉義(巡檢.區域.區域名稱)}</b><div class="卡片副標">${轉義(巡檢.區域.檢查清單代碼)}</div></div><b id="巡檢進度文字">0 / ${巡檢.項目.length}</b></div>
        <div class="進度條"><span id="巡檢進度條" style="width:0%"></span></div>
      </div>
      <section class="清單">${項目內容}</section>
      <article class="卡片" style="margin-top:14px"><div class="欄位群"><label class="欄位標籤">整體備註（選填）</label><textarea id="巡檢備註" class="文字框" placeholder="例如：示範區第一次盤點、需跨部門確認…"></textarea></div><div class="按鈕列" style="margin-top:14px"><button id="取消巡檢" class="次要按鈕" type="button">取消</button><button id="送出巡檢" class="主要按鈕" type="button">送出巡檢</button></div></article>`;
    元素.頁面內容.querySelectorAll('[data-巡檢項目]').forEach(卡片 => {
      const 索引 = 數值(卡片.dataset.巡檢項目);
      卡片.querySelectorAll('[data-分數]').forEach(按鈕 => 按鈕.onclick = () => 設定巡檢評分(索引, 數值(按鈕.dataset.分數), 卡片));
      卡片.querySelector('[data-異常原因]').oninput = 事件 => { 巡檢.項目[索引].異常原因 = 事件.target.value; };
      卡片.querySelector('[data-異常照片]').onchange = 事件 => 處理巡檢照片(索引, 事件.target.files[0], 卡片);
    });
    取得元素('巡檢備註').oninput = 事件 => { 巡檢.備註 = 事件.target.value; };
    取得元素('取消巡檢').onclick = () => { if (confirm('確定放棄本次尚未送出的巡檢？')) 顯示巡檢入口(); };
    取得元素('送出巡檢').onclick = 送出巡檢;
  }

  function 設定巡檢評分(索引, 分數, 卡片) {
    const 項目 = 狀態.目前巡檢.項目[索引];
    項目.分數 = 分數;
    卡片.querySelectorAll('[data-分數]').forEach(按鈕 => 按鈕.classList.toggle('已選', 數值(按鈕.dataset.分數) === 分數));
    const 異常 = 分數 < 5;
    卡片.classList.toggle('異常', 異常);
    卡片.querySelector('.異常區').classList.toggle('隱藏', !異常);
    if (!異常) {
      項目.異常原因 = '';
      項目.照片資料 = '';
      卡片.querySelector('[data-異常原因]').value = '';
      卡片.querySelector('.照片預覽').src = '';
      卡片.querySelector('.照片預覽').classList.add('隱藏');
    }
    更新巡檢進度();
  }

  async function 處理巡檢照片(索引, 檔案, 卡片) {
    if (!檔案) return;
    const 按鈕 = 卡片.querySelector('.照片按鈕');
    const 原文 = 按鈕.firstChild.textContent;
    按鈕.firstChild.textContent = '⏳ 照片壓縮中';
    try {
      const 資料網址 = await 壓縮照片(檔案);
      狀態.目前巡檢.項目[索引].照片資料 = 資料網址;
      const 預覽 = 卡片.querySelector('.照片預覽');
      預覽.src = 資料網址;
      預覽.classList.remove('隱藏');
      按鈕.firstChild.textContent = '✅ 已拍攝，可重新選擇';
    } catch (錯誤) {
      按鈕.firstChild.textContent = 原文;
      顯示通知(`照片處理失敗：${錯誤.message}`, '錯誤');
    }
  }

  function 更新巡檢進度() {
    const 巡檢 = 狀態.目前巡檢;
    const 已完成 = 巡檢.項目.filter(項目 => 項目.分數 !== null).length;
    const 百分比 = 已完成 / 巡檢.項目.length * 100;
    取得元素('巡檢進度文字').textContent = `${已完成} / ${巡檢.項目.length}`;
    取得元素('巡檢進度條').style.width = `${百分比}%`;
  }

  async function 壓縮照片(檔案) {
    const 圖片 = await 讀取圖片(檔案);
    let 最大邊 = 960;
    let 品質 = 0.72;
    let 結果 = '';
    for (let 次數 = 0; 次數 < 12; 次數 += 1) {
      const 比例 = Math.min(1, 最大邊 / Math.max(圖片.width, 圖片.height));
      const 畫布 = document.createElement('canvas');
      畫布.width = Math.max(1, Math.round(圖片.width * 比例));
      畫布.height = Math.max(1, Math.round(圖片.height * 比例));
      const 繪圖 = 畫布.getContext('2d', { alpha: false });
      繪圖.fillStyle = '#ffffff';
      繪圖.fillRect(0, 0, 畫布.width, 畫布.height);
      繪圖.drawImage(圖片, 0, 0, 畫布.width, 畫布.height);
      結果 = 畫布.toDataURL('image/jpeg', 品質);
      if (結果.length <= 設定.照片最大字元) return 結果;
      if (品質 > 0.38) 品質 -= 0.08;
      else 最大邊 = Math.round(最大邊 * 0.78);
    }
    if (結果.length > 設定.照片最大字元) throw new Error('照片仍過大，請靠近拍攝或降低手機相機解析度');
    return 結果;
  }

  function 讀取圖片(檔案) {
    return new Promise((完成, 失敗) => {
      const 讀取器 = new FileReader();
      讀取器.onerror = () => 失敗(new Error('無法讀取照片'));
      讀取器.onload = () => {
        const 圖片 = new Image();
        圖片.onload = () => 完成(圖片);
        圖片.onerror = () => 失敗(new Error('此照片格式無法處理，請改用相機重新拍攝'));
        圖片.src = 讀取器.result;
      };
      讀取器.readAsDataURL(檔案);
    });
  }

  function 驗證巡檢() {
    const 巡檢 = 狀態.目前巡檢;
    const 未評分 = 巡檢.項目.findIndex(項目 => 項目.分數 === null);
    if (未評分 >= 0) return `第 ${未評分 + 1} 項尚未評分`;
    const 未填原因 = 巡檢.項目.findIndex(項目 => 項目.分數 < 5 && !文字(項目.異常原因));
    if (未填原因 >= 0) return `第 ${未填原因 + 1} 項為異常，請填寫原因`;
    const 未拍照 = 巡檢.項目.findIndex(項目 => 項目.分數 < 5 && !項目.照片資料);
    if (未拍照 >= 0) return `第 ${未拍照 + 1} 項為異常，請拍攝現況照片`;
    return '';
  }

  async function 送出巡檢() {
    const 驗證訊息 = 驗證巡檢();
    if (驗證訊息) return 顯示通知(驗證訊息, '警告');
    const 巡檢 = 狀態.目前巡檢;
    const 巡檢單號 = 產生識別碼('5S-INS');
    const 建立時間 = 完整時間字串(現在());
    let 總得分 = 0;
    let 最高總分 = 0;
    let 異常項數 = 0;
    巡檢.項目.forEach(項目 => {
      const 權重 = 數值(項目.原始資料.權重, 1);
      總得分 += 數值(項目.分數) * 權重;
      最高總分 += 數值(項目.原始資料.最高分, 5) * 權重;
      if (項目.分數 < 5) 異常項數 += 1;
    });
    const 得分率 = 最高總分 ? Math.round(總得分 / 最高總分 * 1000) / 10 : 0;
    const 主檔 = {
      巡檢單號,
      區域代碼: 巡檢.區域.區域代碼,
      區域名稱: 巡檢.區域.區域名稱,
      檢查清單代碼: 巡檢.區域.檢查清單代碼,
      巡檢人工號: 狀態.使用者.工號,
      巡檢人姓名: 狀態.使用者.姓名,
      巡檢日期: 日期字串(現在()),
      開始時間: 巡檢.開始時間,
      送出時間: 建立時間,
      總得分,
      最高總分,
      得分率,
      異常項數,
      狀態: '已送出',
      裝置識別碼: 取得裝置識別碼(),
      備註: 巡檢.備註,
      建立時間
    };
    const 工作 = [{ 分頁: 設定.分頁.巡檢主檔, 欄位: 巡檢主檔欄位, 資料: 主檔 }];
    巡檢.項目.forEach(項目 => {
      const 是否異常 = 項目.分數 < 5;
      const 改善單號 = 是否異常 ? 產生識別碼('5S-KZN') : '';
      const 明細編號 = 產生識別碼('5S-DTL');
      工作.push({ 分頁: 設定.分頁.巡檢明細, 欄位: 巡檢明細欄位, 資料: {
        明細編號, 巡檢單號, 項目代碼: 項目.原始資料.項目代碼, '5S分類': 項目.原始資料['5S分類'], 檢查內容: 項目.原始資料.檢查內容,
        得分: 項目.分數, 最高分: 項目.原始資料.最高分, 權重: 項目.原始資料.權重, 是否異常: 是否異常 ? '是' : '否',
        異常原因: 項目.異常原因, 照片資料: 項目.照片資料, 改善單號, 建立時間
      }});
      if (項目.照片資料) 工作.push({ 分頁: 設定.分頁.照片, 欄位: 照片欄位, 資料: {
        照片編號: 產生識別碼('5S-PIC'), 參照類型: '巡檢異常', 參照單號: 明細編號, 區域代碼: 巡檢.區域.區域代碼,
        上傳人工號: 狀態.使用者.工號, 拍攝時間: 建立時間, 資料摘要: 項目.原始資料.檢查內容, 儲存方式: '試算表壓縮資料', 照片資料: 項目.照片資料
      }});
      if (是否異常) {
        const 嚴重度 = 項目.分數 === 0 ? '高' : (項目.分數 === 1 ? '中' : '低');
        const 負責人工號 = 文字(巡檢.區域.區域負責人工號);
        const 負責人 = (狀態.資料[設定.分頁.人員主檔] || []).find(人 => 文字(人.工號) === 負責人工號);
        工作.push({ 分頁: 設定.分頁.改善單, 欄位: 改善單欄位, 資料: {
          改善單號, 來源類型: '巡檢異常', 來源單號: 巡檢單號, 區域代碼: 巡檢.區域.區域代碼, 區域名稱: 巡檢.區域.區域名稱,
          '5S分類': 項目.原始資料['5S分類'], 問題標題: 項目.原始資料.檢查內容, 問題說明: 項目.異常原因, 嚴重度,
          負責人工號, 負責人姓名: 負責人 ? 負責人.姓名 : '', 期限: 日期加天(現在(), 設定.改善期限天數), 狀態: '待改善',
          改善前照片: 項目.照片資料, 改善後照片: '', 驗證人工號: '', 驗證時間: '', 驗證結果: '', 結案時間: '', 逾期天數: 0,
          建立時間, 更新時間: 建立時間
        }});
        工作.push({ 分頁: 設定.分頁.改善歷程, 欄位: 改善歷程欄位, 資料: {
          歷程編號: 產生識別碼('5S-HIS'), 改善單號, 動作: '建立改善單', 原狀態: '', 新狀態: '待改善',
          執行人工號: 狀態.使用者.工號, 執行人姓名: 狀態.使用者.姓名, 執行時間: 建立時間, 說明: 項目.異常原因
        }});
        if (嚴重度 === '高') 工作.push({ 分頁: 設定.分頁.通知紀錄, 欄位: 通知欄位, 資料: {
          通知編號: 產生識別碼('5S-MSG'), 通知場景: '重大巡檢異常', 對象類型: 'LINE群組', 對象識別碼: 巡檢.區域.LINE群組識別碼 || '',
          訊息類型: '待推播', 內容摘要: `【5S重大異常】${巡檢.區域.區域名稱}｜${項目.原始資料.檢查內容}`, 狀態: '待發送',
          送出時間: '', 錯誤訊息: '', 去重鍵: `${巡檢單號}-${項目.原始資料.項目代碼}`
        }});
      }
    });
    顯示讀取('送出巡檢資料', `共 ${工作.length} 筆資料，正在寫入中央資料庫…`);
    let 已同步 = 0;
    let 已排隊 = 0;
    try {
      for (let 索引 = 0; 索引 < 工作.length; 索引 += 1) {
        元素.讀取說明.textContent = `處理 ${索引 + 1} / ${工作.length}：${工作[索引].分頁}`;
        const 結果 = await 新增資料(工作[索引].分頁, 工作[索引].欄位, 工作[索引].資料);
        if (結果.已排隊) 已排隊 += 1; else 已同步 += 1;
      }
      [設定.分頁.巡檢主檔,設定.分頁.巡檢明細,設定.分頁.改善單,設定.分頁.改善歷程,設定.分頁.照片,設定.分頁.通知紀錄].forEach(清除資料快取);
      狀態.目前巡檢 = null;
      隱藏讀取();
      開啟巡檢結果(巡檢單號, 得分率, 異常項數, 已同步, 已排隊);
    } catch (錯誤) {
      隱藏讀取();
      顯示通知(`送出中斷：${錯誤.message}`, '錯誤');
    }
  }

  function 開啟巡檢結果(單號, 分數, 異常數, 已同步, 已排隊) {
    開啟彈窗('巡檢已完成', 單號, `
      <div class="卡片" style="margin-top:14px;text-align:center">
        <div style="font-size:64px">${分數 >= 設定.及格分數 ? '✅' : '⚠️'}</div>
        <div class="統計數值">${格式化百分比(分數)}</div>
        <div class="提示文字">異常 ${異常數} 項｜已同步 ${已同步} 筆｜離線排隊 ${已排隊} 筆</div>
        <div class="進度條" style="margin-top:14px"><span style="width:${Math.min(100,分數)}%"></span></div>
        <div class="按鈕列" style="justify-content:center;margin-top:18px"><button id="結果回首頁" class="主要按鈕">回戰情中心</button><button id="結果再巡檢" class="次要按鈕">巡檢下一區</button></div>
      </div>`);
    取得元素('結果回首頁').onclick = () => { 關閉彈窗(); 切換頁面('首頁'); };
    取得元素('結果再巡檢').onclick = () => { 關閉彈窗(); 顯示巡檢入口(); };
  }

  async function 顯示改善頁(強制更新) {
    try {
      await 安全讀取分頁(設定.分頁.改善單, 強制更新);
      const 全部 = (狀態.資料[設定.分頁.改善單] || []).slice().sort((甲,乙) => 文字(乙.建立時間).localeCompare(文字(甲.建立時間)));
      let 清單 = 全部;
      if (狀態.改善篩選 === '未結案') 清單 = 全部.filter(列 => 是否未結案(列.狀態));
      if (狀態.改善篩選 === '逾期') 清單 = 全部.filter(列 => 是否未結案(列.狀態) && 取得天數差(列.期限) < 0);
      if (狀態.改善篩選 === '我的') 清單 = 全部.filter(列 => 文字(列.負責人工號) === 狀態.使用者.工號 || 文字(列.負責人姓名) === 狀態.使用者.姓名);
      if (狀態.改善篩選 === '已結案') 清單 = 全部.filter(列 => 文字(列.狀態) === '已結案');
      const 內容 = 清單.length ? 清單.map((列, 索引) => 改善卡片(列, 索引)).join('') : 空狀態('🛠','此篩選沒有改善案件','巡檢異常會自動建立改善單');
      元素.頁面內容.innerHTML = `
        <section class="主視覺"><h2>改善不是口頭交辦</h2><p>每件異常都有來源、責任、期限、改善前後照片與驗證結果。逾期案件會持續留在戰情中心。</p><div class="主視覺操作"><button class="次要按鈕" data-動作="更新改善">更新資料</button></div></section>
        <div class="區段標題"><div><h2>改善案件</h2><p>共 ${全部.length} 件</p></div></div>
        <div class="篩選列">${['未結案','逾期','我的','已結案','全部'].map(名稱 => `<button class="篩選按鈕 ${狀態.改善篩選 === 名稱 ? '作用中' : ''}" data-改善篩選="${名稱}">${名稱}</button>`).join('')}</div>
        <section class="清單" style="margin-top:12px">${內容}</section>`;
      元素.頁面內容.querySelector('[data-動作="更新改善"]').onclick = () => 顯示改善頁(true);
      元素.頁面內容.querySelectorAll('[data-改善篩選]').forEach(按鈕 => 按鈕.onclick = () => { 狀態.改善篩選 = 按鈕.dataset.改善篩選; 顯示改善頁(false); });
      元素.頁面內容.querySelectorAll('[data-改善索引]').forEach(按鈕 => 按鈕.onclick = () => 開啟改善詳情(清單[數值(按鈕.dataset.改善索引)]));
    } catch (錯誤) { 元素.頁面內容.innerHTML = 錯誤卡('改善資料無法讀取', 錯誤.message); }
  }

  function 改善卡片(列, 索引) {
    const 差 = 取得天數差(列.期限);
    const 逾期 = 是否未結案(列.狀態) && 差 !== null && 差 < 0;
    return `<button class="卡片 改善卡 ${轉義(列.嚴重度 || '低')}" data-改善索引="${索引}" type="button" style="text-align:left">
      <div class="改善標題列"><div><div class="改善標題">${轉義(列.問題標題)}</div><div class="卡片副標">${轉義(列.改善單號)}｜${轉義(列.區域名稱)}</div></div><span class="標籤 ${狀態標籤色(列.狀態)}">${轉義(列.狀態 || '待改善')}</span></div>
      <div class="改善描述">${轉義(列.問題說明 || '尚未填寫問題說明')}</div>
      <div class="改善資訊"><span class="標籤 ${列.嚴重度 === '高' ? '紅' : (列.嚴重度 === '中' ? '黃' : '藍')}">${轉義(列.嚴重度 || '低')}嚴重度</span><span class="標籤">負責：${轉義(列.負責人姓名 || '待指派')}</span><span class="標籤 ${逾期 ? '紅' : '綠'}">${逾期 ? `逾期 ${Math.abs(差)} 天` : `期限 ${轉義(列.期限 || '未設定')}`}</span></div>
    </button>`;
  }

  function 狀態標籤色(狀態值) {
    const 值 = 文字(狀態值);
    if (值 === '已結案') return '綠';
    if (值 === '驗證中') return '紫';
    if (值 === '改善中') return '藍';
    if (值 === '已駁回') return '紅';
    return '黃';
  }

  function 開啟改善詳情(案件) {
    const 可管理 = 是否管理者();
    const 狀態值 = 文字(案件.狀態) || '待改善';
    const 前照片 = 案件.改善前照片 ? `<img src="${案件.改善前照片}" alt="改善前照片">` : '尚無照片';
    const 後照片 = 案件.改善後照片 ? `<img src="${案件.改善後照片}" alt="改善後照片">` : '尚無照片';
    const 動作按鈕 = [];
    if (狀態值 === '待改善' || 狀態值 === '已駁回') 動作按鈕.push('<button class="主要按鈕" data-改善動作="開始">開始改善</button>');
    if (狀態值 === '改善中') 動作按鈕.push('<button class="主要按鈕" data-改善動作="送驗">完成並送驗</button>');
    if (狀態值 === '驗證中' && 可管理) {
      動作按鈕.push('<button class="主要按鈕" data-改善動作="通過">驗證通過</button>');
      動作按鈕.push('<button class="危險按鈕" data-改善動作="駁回">駁回改善</button>');
    }
    開啟彈窗('改善案件', `${案件.改善單號}｜${案件.區域名稱}`, `
      <div class="卡片 改善卡 ${轉義(案件.嚴重度 || '低')}" style="margin-top:14px">
        <div class="改善標題列"><div class="改善標題">${轉義(案件.問題標題)}</div><span class="標籤 ${狀態標籤色(狀態值)}">${轉義(狀態值)}</span></div>
        <div class="改善描述">${轉義(案件.問題說明)}</div>
        <div class="改善資訊"><span class="標籤">分類：${轉義(案件['5S分類'])}</span><span class="標籤">責任：${轉義(案件.負責人姓名 || '待指派')}</span><span class="標籤">期限：${轉義(案件.期限 || '未設定')}</span></div>
        <div class="照片對比"><div><div class="照片框標題">改善前</div><div class="照片框">${前照片}</div></div><div><div class="照片框標題">改善後</div><div class="照片框">${後照片}</div></div></div>
      </div>
      <div class="欄位群" style="margin-top:14px"><label class="欄位標籤">處理說明／驗證意見</label><textarea id="改善處理說明" class="文字框" placeholder="請描述採取的改善措施或驗證結果"></textarea></div>
      <div id="改善照片區" class="欄位群 ${狀態值 === '改善中' ? '' : '隱藏'}" style="margin-top:12px"><label class="照片按鈕">📷 拍攝改善後照片<input id="改善後照片檔案" class="隱藏" type="file" accept="image/*" capture="environment"></label><img id="改善後照片預覽" class="照片預覽 隱藏" alt="改善後照片預覽"></div>
      <div class="按鈕列" style="margin-top:16px">${動作按鈕.join('') || '<span class="提示文字">目前狀態沒有可執行動作。</span>'}</div>`);
    let 改善後照片資料 = '';
    const 照片輸入 = 取得元素('改善後照片檔案');
    if (照片輸入) 照片輸入.onchange = async 事件 => {
      try {
        顯示讀取('壓縮改善照片', '請稍候…');
        改善後照片資料 = await 壓縮照片(事件.target.files[0]);
        const 預覽 = 取得元素('改善後照片預覽');
        預覽.src = 改善後照片資料;
        預覽.classList.remove('隱藏');
      } catch (錯誤) { 顯示通知(錯誤.message, '錯誤'); } finally { 隱藏讀取(); }
    };
    元素.彈窗內容.querySelectorAll('[data-改善動作]').forEach(按鈕 => 按鈕.onclick = async () => {
      const 動作 = 按鈕.dataset.改善動作;
      const 說明 = 文字(取得元素('改善處理說明').value);
      if (動作 === '送驗' && !改善後照片資料 && !案件.改善後照片) return 顯示通知('完成改善前必須拍攝改善後照片', '警告');
      if (['送驗','通過','駁回'].includes(動作) && !說明) return 顯示通知('請填寫處理說明或驗證意見', '警告');
      const 新狀態 = { 開始:'改善中', 送驗:'驗證中', 通過:'已結案', 駁回:'改善中' }[動作];
      await 更新改善狀態(案件, 新狀態, 說明, 改善後照片資料, 動作);
    });
  }

  async function 更新改善狀態(案件, 新狀態, 說明, 改善後照片資料, 動作) {
    顯示讀取('更新改善案件', `${案件.改善單號} → ${新狀態}`);
    try {
      const 舊狀態 = 文字(案件.狀態);
      const 更新時間 = 完整時間字串(現在());
      const 新資料 = Object.assign({}, 案件, { 狀態: 新狀態, 更新時間 });
      if (改善後照片資料) 新資料.改善後照片 = 改善後照片資料;
      if (新狀態 === '已結案') {
        新資料.驗證人工號 = 狀態.使用者.工號;
        新資料.驗證時間 = 更新時間;
        新資料.驗證結果 = 說明 || '驗證通過';
        新資料.結案時間 = 更新時間;
      }
      if (動作 === '駁回') {
        新資料.驗證人工號 = 狀態.使用者.工號;
        新資料.驗證時間 = 更新時間;
        新資料.驗證結果 = `駁回：${說明}`;
      }
      const 到期差 = 取得天數差(新資料.期限);
      新資料.逾期天數 = 到期差 !== null && 到期差 < 0 ? Math.abs(到期差) : 0;
      await 更新資料(設定.分頁.改善單, 新資料, 狀態.欄位[設定.分頁.改善單] || 改善單欄位);
      await 新增資料(設定.分頁.改善歷程, 改善歷程欄位, {
        歷程編號: 產生識別碼('5S-HIS'), 改善單號: 案件.改善單號, 動作: 動作文字(動作), 原狀態: 舊狀態, 新狀態,
        執行人工號: 狀態.使用者.工號, 執行人姓名: 狀態.使用者.姓名, 執行時間: 更新時間, 說明
      });
      if (改善後照片資料) await 新增資料(設定.分頁.照片, 照片欄位, {
        照片編號: 產生識別碼('5S-PIC'), 參照類型: '改善後', 參照單號: 案件.改善單號, 區域代碼: 案件.區域代碼,
        上傳人工號: 狀態.使用者.工號, 拍攝時間: 更新時間, 資料摘要: 說明, 儲存方式: '試算表壓縮資料', 照片資料: 改善後照片資料
      });
      清除資料快取(設定.分頁.改善單);
      清除資料快取(設定.分頁.改善歷程);
      清除資料快取(設定.分頁.照片);
      關閉彈窗();
      顯示通知(`改善案件已更新為「${新狀態}」`);
      await 顯示改善頁(true);
    } catch (錯誤) { 顯示通知(`更新失敗：${錯誤.message}`, '錯誤'); } finally { 隱藏讀取(); }
  }
  function 動作文字(動作) { return ({開始:'開始改善',送驗:'完成並送驗',通過:'驗證通過',駁回:'驗證駁回'})[動作] || 動作; }

  async function 顯示紅牌頁(強制更新) {
    try {
      await Promise.all([
        安全讀取分頁(設定.分頁.紅牌追蹤, 強制更新),
        安全讀取分頁(設定.分頁.全物品盤點, 強制更新)
      ]);
      const 全部 = (狀態.資料[設定.分頁.紅牌追蹤] || []).slice().sort((甲,乙) => 文字(乙.掛牌日).localeCompare(文字(甲.掛牌日)));
      let 清單 = 全部;
      if (狀態.紅牌篩選 === '未結案') 清單 = 全部.filter(列 => !['已完成','已結案'].includes(文字(列.案件狀態)));
      if (狀態.紅牌篩選 === '逾期') 清單 = 全部.filter(列 => !['已完成','已結案'].includes(文字(列.案件狀態)) && 取得天數差(列.預定處置日) < 0);
      if (狀態.紅牌篩選 === '已結案') 清單 = 全部.filter(列 => ['已完成','已結案'].includes(文字(列.案件狀態)));
      const 內容 = 清單.length ? 清單.map((列, 索引) => 紅牌卡片(列, 索引)).join('') : 空狀態('🏷','目前沒有紅牌案件','點右下角 ＋ 建立物品盤點與紅牌');
      元素.頁面內容.innerHTML = `
        <section class="主視覺"><h2>非必要品不再放回原位</h2><p>掛牌後移至紅牌暫存區，30 天內完成移轉、退庫、報廢或保留核准，處置證據要能追溯。</p><div class="主視覺操作"><button class="主要按鈕" data-動作="新增盤點">＋ 新增物品盤點</button><button class="次要按鈕" data-動作="更新紅牌">更新資料</button></div></section>
        <div class="區段標題"><div><h2>紅牌追蹤</h2><p>共 ${全部.length} 件</p></div></div>
        <div class="篩選列">${['未結案','逾期','已結案','全部'].map(名稱 => `<button class="篩選按鈕 ${狀態.紅牌篩選 === 名稱 ? '作用中' : ''}" data-紅牌篩選="${名稱}">${名稱}</button>`).join('')}</div>
        <section class="清單" style="margin-top:12px">${內容}</section>`;
      元素.頁面內容.querySelector('[data-動作="新增盤點"]').onclick = 開啟新增盤點;
      元素.頁面內容.querySelector('[data-動作="更新紅牌"]').onclick = () => 顯示紅牌頁(true);
      元素.頁面內容.querySelectorAll('[data-紅牌篩選]').forEach(按鈕 => 按鈕.onclick = () => { 狀態.紅牌篩選 = 按鈕.dataset.紅牌篩選; 顯示紅牌頁(false); });
      元素.頁面內容.querySelectorAll('[data-紅牌索引]').forEach(按鈕 => 按鈕.onclick = () => 開啟紅牌詳情(清單[數值(按鈕.dataset.紅牌索引)]));
    } catch (錯誤) { 元素.頁面內容.innerHTML = 錯誤卡('紅牌資料無法讀取', 錯誤.message); }
  }

  function 紅牌卡片(列, 索引) {
    const 差 = 取得天數差(列.預定處置日);
    const 已結案 = ['已完成','已結案'].includes(文字(列.案件狀態));
    const 倒數文字 = 已結案 ? '已結案' : (差 === null ? '未設定期限' : (差 < 0 ? `逾期 ${Math.abs(差)} 天` : `剩 ${差} 天`));
    return `<button class="卡片 紅牌卡" data-紅牌索引="${索引}" type="button" style="text-align:left">
      <div class="紅牌編號">${轉義(列.紅牌編號)}</div>
      <h3 style="margin:10px 70px 4px 0">${轉義(列.物品名稱)}</h3>
      <div class="卡片副標">${轉義(列.區域)}｜${轉義(列.數量)} ${轉義(列.單位)}</div>
      <div class="改善描述">原因：${轉義(列.紅牌原因 || '待補')}</div>
      <div class="改善資訊"><span class="標籤 黃">${轉義(列.案件狀態 || '待處置')}</span><span class="標籤">${轉義(列.處置建議 || '待決議')}</span></div>
      <div class="倒數 ${差 !== null && 差 < 0 && !已結案 ? '逾期' : ''}" style="margin-top:12px">${倒數文字}</div>
    </button>`;
  }

  function 開啟新增盤點() {
    const 區域選項 = 有效區域().map(列 => `<option value="${轉義(列.區域代碼)}">${轉義(列.區域名稱)}</option>`).join('');
    開啟彈窗('新增物品盤點', '依使用頻率判定必要性；非必要品自動建立紅牌', `
      <form id="盤點表單" class="表單網格">
        <div class="欄位群 跨欄"><label class="欄位標籤">區域</label><select id="盤點區域" class="選擇框" required><option value="">請選擇區域</option>${區域選項}</select></div>
        <div class="欄位群"><label class="欄位標籤">位置</label><input id="盤點位置" class="輸入框" required placeholder="例如：1069 檢驗桌"></div>
        <div class="欄位群"><label class="欄位標籤">物品名稱</label><input id="盤點物品名稱" class="輸入框" required placeholder="例如：萬能鉗"></div>
        <div class="欄位群"><label class="欄位標籤">規格型號</label><input id="盤點規格" class="輸入框" placeholder="選填"></div>
        <div class="欄位群"><label class="欄位標籤">數量</label><input id="盤點數量" class="輸入框" type="number" min="0" step="0.01" value="1" required></div>
        <div class="欄位群"><label class="欄位標籤">單位</label><input id="盤點單位" class="輸入框" value="個" required></div>
        <div class="欄位群"><label class="欄位標籤">使用頻率</label><select id="盤點頻率" class="選擇框" required><option>每日</option><option>每週</option><option>每月</option><option>很少使用</option><option>用不到</option></select></div>
        <div class="欄位群"><label class="欄位標籤">必要性判定</label><select id="盤點必要性" class="選擇框" required><option value="必要">必要</option><option value="待判定">待判定</option><option value="非必要">非必要</option></select></div>
        <div class="欄位群 跨欄"><label class="欄位標籤">判定理由</label><textarea id="盤點理由" class="文字框" placeholder="非必要時必填，例如：長期未使用、重複、過期、損壞或過量"></textarea></div>
        <div class="欄位群 跨欄"><label class="欄位標籤">建議處置</label><select id="盤點處置" class="選擇框"><option value="保留原位">保留原位</option><option value="移轉">移轉</option><option value="退庫">退庫</option><option value="報廢評估">報廢評估</option><option value="出售或回收">出售或回收</option><option value="待會審">待會審</option></select></div>
        <div class="欄位群 跨欄"><label class="照片按鈕">📷 拍攝物品現況<input id="盤點照片檔案" class="隱藏" type="file" accept="image/*" capture="environment"></label><img id="盤點照片預覽" class="照片預覽 隱藏" alt="盤點照片預覽"></div>
        <div class="欄位群 跨欄"><label class="欄位標籤">備註</label><textarea id="盤點備註" class="文字框" placeholder="選填"></textarea></div>
        <div class="按鈕列 跨欄"><button class="次要按鈕" type="button" data-關閉>取消</button><button class="主要按鈕" type="submit">儲存盤點</button></div>
      </form>`);
    let 照片資料 = '';
    取得元素('盤點照片檔案').onchange = async 事件 => {
      try {
        顯示讀取('壓縮盤點照片', '請稍候…');
        照片資料 = await 壓縮照片(事件.target.files[0]);
        取得元素('盤點照片預覽').src = 照片資料;
        取得元素('盤點照片預覽').classList.remove('隱藏');
      } catch (錯誤) { 顯示通知(錯誤.message, '錯誤'); } finally { 隱藏讀取(); }
    };
    元素.彈窗內容.querySelector('[data-關閉]').onclick = 關閉彈窗;
    取得元素('盤點表單').onsubmit = 事件 => { 事件.preventDefault(); 送出盤點(照片資料); };
  }

  async function 送出盤點(照片資料) {
    const 區域代碼 = 文字(取得元素('盤點區域').value);
    const 區域資料 = 有效區域().find(列 => 文字(列.區域代碼) === 區域代碼);
    const 物品名稱 = 文字(取得元素('盤點物品名稱').value);
    const 必要性 = 文字(取得元素('盤點必要性').value);
    const 判定理由 = 文字(取得元素('盤點理由').value);
    if (!區域代碼 || !物品名稱) return 顯示通知('請完整填寫區域與物品名稱', '警告');
    if (必要性 === '非必要' && !判定理由) return 顯示通知('判定非必要時必須填寫理由', '警告');
    if (必要性 === '非必要' && !照片資料) return 顯示通知('非必要品掛紅牌前必須拍照', '警告');
    const 建立時間 = 完整時間字串(現在());
    const 盤點編號 = 產生識別碼('5S-INV');
    const 紅牌編號 = 必要性 === '非必要' ? 產生識別碼('5S-RP') : '';
    const 改善單號 = 必要性 === '非必要' ? 產生識別碼('5S-KZN') : '';
    const 位置 = 文字(取得元素('盤點位置').value);
    const 數量 = 數值(取得元素('盤點數量').value, 1);
    const 單位 = 文字(取得元素('盤點單位').value) || '個';
    const 處置 = 文字(取得元素('盤點處置').value);
    const 盤點資料 = {
      盤點編號, 盤點日期: 日期字串(現在()), 部門: 狀態.使用者.部門, 區域: 區域資料 ? 區域資料.區域名稱 : 區域代碼, 位置,
      物品名稱, 規格型號: 文字(取得元素('盤點規格').value), 數量, 單位, 使用頻率: 文字(取得元素('盤點頻率').value), 最近使用日: '',
      必要性判定: 必要性, 判定理由, 保留上限: '', 紅牌需求: 必要性 === '非必要' ? '是' : (必要性 === '待判定' ? '待確認' : '否'),
      紅牌編號, 建議處置: 處置, 責任部門: 狀態.使用者.部門, 盤點人: 狀態.使用者.姓名, 照片資料,
      備註: 文字(取得元素('盤點備註').value), 區域代碼, 建立時間
    };
    const 工作 = [{ 分頁: 設定.分頁.全物品盤點, 欄位: 盤點欄位, 資料: 盤點資料 }];
    if (照片資料) 工作.push({ 分頁: 設定.分頁.照片, 欄位: 照片欄位, 資料: {
      照片編號: 產生識別碼('5S-PIC'), 參照類型: '物品盤點', 參照單號: 盤點編號, 區域代碼, 上傳人工號: 狀態.使用者.工號,
      拍攝時間: 建立時間, 資料摘要: 物品名稱, 儲存方式: '試算表壓縮資料', 照片資料
    }});
    if (必要性 === '非必要') {
      工作.push({ 分頁: 設定.分頁.紅牌追蹤, 欄位: 紅牌欄位, 資料: {
        紅牌編號, 掛牌日: 日期字串(現在()), 盤點編號, 部門: 狀態.使用者.部門, 區域: 區域資料 ? 區域資料.區域名稱 : 區域代碼,
        物品名稱, 規格型號: 盤點資料.規格型號, 數量, 單位, 紅牌原因: 判定理由, 暫存位置: 'A9 紅牌暫存區', 處置建議: 處置,
        責任部門: 狀態.使用者.部門, 責任人: '', 預定處置日: 日期加天(現在(), 設定.紅牌期限天數), 案件狀態: '待處置',
        實際處置日: '', 處置結果證據: '', 複查人: '', 逾期天數: 0, 改善單號, LINE已通知: '否'
      }});
      工作.push({ 分頁: 設定.分頁.改善單, 欄位: 改善單欄位, 資料: {
        改善單號, 來源類型: '紅牌', 來源單號: 紅牌編號, 區域代碼, 區域名稱: 區域資料 ? 區域資料.區域名稱 : 區域代碼, '5S分類': '整理',
        問題標題: `非必要品待處置：${物品名稱}`, 問題說明: 判定理由, 嚴重度: '中', 負責人工號: '', 負責人姓名: '',
        期限: 日期加天(現在(), 設定.紅牌期限天數), 狀態: '待改善', 改善前照片: 照片資料, 改善後照片: '', 驗證人工號: '', 驗證時間: '',
        驗證結果: '', 結案時間: '', 逾期天數: 0, 建立時間, 更新時間: 建立時間
      }});
      工作.push({ 分頁: 設定.分頁.改善歷程, 欄位: 改善歷程欄位, 資料: {
        歷程編號: 產生識別碼('5S-HIS'), 改善單號, 動作: '紅牌建立改善單', 原狀態: '', 新狀態: '待改善', 執行人工號: 狀態.使用者.工號,
        執行人姓名: 狀態.使用者.姓名, 執行時間: 建立時間, 說明: 判定理由
      }});
      工作.push({ 分頁: 設定.分頁.通知紀錄, 欄位: 通知欄位, 資料: {
        通知編號: 產生識別碼('5S-MSG'), 通知場景: '新增紅牌', 對象類型: 'LINE群組', 對象識別碼: 區域資料 ? 區域資料.LINE群組識別碼 : '',
        訊息類型: '待推播', 內容摘要: `【5S紅牌】${物品名稱}｜${判定理由}`, 狀態: '待發送', 送出時間: '', 錯誤訊息: '', 去重鍵: 紅牌編號
      }});
    }
    顯示讀取('儲存盤點資料', `正在處理 ${工作.length} 筆資料…`);
    try {
      let 排隊數 = 0;
      for (let 索引 = 0; 索引 < 工作.length; 索引 += 1) {
        元素.讀取說明.textContent = `${索引 + 1} / ${工作.length}：${工作[索引].分頁}`;
        const 結果 = await 新增資料(工作[索引].分頁, 工作[索引].欄位, 工作[索引].資料);
        if (結果.已排隊) 排隊數 += 1;
      }
      [設定.分頁.全物品盤點,設定.分頁.紅牌追蹤,設定.分頁.改善單,設定.分頁.改善歷程,設定.分頁.照片,設定.分頁.通知紀錄].forEach(清除資料快取);
      關閉彈窗();
      顯示通知(必要性 === '非必要' ? `已建立紅牌 ${紅牌編號}${排隊數 ? '（等待同步）' : ''}` : `盤點 ${盤點編號} 已儲存`);
      await 顯示紅牌頁(true);
    } catch (錯誤) { 顯示通知(`盤點儲存失敗：${錯誤.message}`, '錯誤'); } finally { 隱藏讀取(); }
  }

  function 開啟紅牌詳情(紅牌) {
    const 差 = 取得天數差(紅牌.預定處置日);
    const 已結案 = ['已完成','已結案'].includes(文字(紅牌.案件狀態));
    const 動作 = [];
    if (!已結案 && 文字(紅牌.案件狀態) === '待處置') 動作.push('<button class="主要按鈕" data-紅牌動作="處理中">開始處理</button>');
    if (!已結案 && 是否管理者()) 動作.push('<button class="主要按鈕" data-紅牌動作="已結案">完成並結案</button>');
    開啟彈窗('紅牌處置', `${紅牌.紅牌編號}｜${紅牌.區域}`, `
      <div class="卡片 紅牌卡" style="margin-top:14px">
        <div class="紅牌編號">${轉義(紅牌.紅牌編號)}</div><h2 style="margin:10px 70px 5px 0">${轉義(紅牌.物品名稱)}</h2>
        <div class="提示文字">數量：${轉義(紅牌.數量)} ${轉義(紅牌.單位)}｜暫存：${轉義(紅牌.暫存位置 || '未設定')}</div>
        <div class="改善描述">紅牌原因：${轉義(紅牌.紅牌原因)}</div>
        <div class="改善描述">處置建議：${轉義(紅牌.處置建議 || '待會審')}</div>
        <div class="改善資訊"><span class="標籤 黃">${轉義(紅牌.案件狀態 || '待處置')}</span><span class="標籤 ${差 !== null && 差 < 0 && !已結案 ? '紅' : '綠'}">期限：${轉義(紅牌.預定處置日 || '未設定')}</span></div>
        <div class="倒數 ${差 !== null && 差 < 0 && !已結案 ? '逾期' : ''}" style="margin-top:14px">${已結案 ? '已結案' : (差 === null ? '未設定期限' : (差 < 0 ? `逾期 ${Math.abs(差)} 天` : `剩 ${差} 天`))}</div>
      </div>
      <div class="欄位群" style="margin-top:14px"><label class="欄位標籤">處置結果／說明</label><textarea id="紅牌處置說明" class="文字框" placeholder="例如：已退庫、移轉至某區、完成報廢或核准保留"></textarea></div>
      <div class="按鈕列" style="margin-top:14px">${動作.join('') || '<span class="提示文字">目前狀態沒有可執行動作，或需主管權限結案。</span>'}</div>`);
    元素.彈窗內容.querySelectorAll('[data-紅牌動作]').forEach(按鈕 => 按鈕.onclick = () => 更新紅牌狀態(紅牌, 按鈕.dataset.紅牌動作, 文字(取得元素('紅牌處置說明').value)));
  }

  async function 更新紅牌狀態(紅牌, 新狀態, 說明) {
    if (新狀態 === '已結案' && !說明) return 顯示通知('結案前請填寫處置結果', '警告');
    顯示讀取('更新紅牌', `${紅牌.紅牌編號} → ${新狀態}`);
    try {
      const 新資料 = Object.assign({}, 紅牌, { 案件狀態: 新狀態 });
      if (新狀態 === '已結案') {
        新資料.實際處置日 = 日期字串(現在());
        新資料.處置結果證據 = 說明;
        新資料.複查人 = 狀態.使用者.姓名;
      }
      const 差 = 取得天數差(新資料.預定處置日);
      新資料.逾期天數 = 差 !== null && 差 < 0 ? Math.abs(差) : 0;
      await 更新資料(設定.分頁.紅牌追蹤, 新資料, 狀態.欄位[設定.分頁.紅牌追蹤] || 紅牌欄位);
      if (新資料.改善單號) {
        try {
          await 安全讀取分頁(設定.分頁.改善單, false);
          const 改善 = (狀態.資料[設定.分頁.改善單] || []).find(列 => 文字(列.改善單號) === 文字(新資料.改善單號));
          if (改善 && 新狀態 === '已結案') {
            const 更新改善 = Object.assign({}, 改善, { 狀態: '已結案', 驗證人工號: 狀態.使用者.工號, 驗證時間: 完整時間字串(現在()), 驗證結果: 說明, 結案時間: 完整時間字串(現在()), 更新時間: 完整時間字串(現在()) });
            await 更新資料(設定.分頁.改善單, 更新改善, 狀態.欄位[設定.分頁.改善單] || 改善單欄位);
          }
        } catch (錯誤) { console.warn('連動改善單失敗', 錯誤); }
      }
      清除資料快取(設定.分頁.紅牌追蹤);
      清除資料快取(設定.分頁.改善單);
      關閉彈窗();
      顯示通知(`紅牌狀態已更新為「${新狀態}」`);
      await 顯示紅牌頁(true);
    } catch (錯誤) { 顯示通知(`紅牌更新失敗：${錯誤.message}`, '錯誤'); } finally { 隱藏讀取(); }
  }

  async function 顯示設定頁() {
    const 佇列 = await 資料庫.佇列全部().catch(() => []);
    const 安裝可用 = Boolean(狀態.安裝事件);
    元素.頁面內容.innerHTML = `
      <section class="主視覺"><h2>${轉義(狀態.使用者.姓名)} 的智慧 5S</h2><p>${轉義(狀態.使用者.工號)}｜${轉義(狀態.使用者.部門)} ${轉義(狀態.使用者.組別)}｜${轉義(狀態.使用者.職稱)}｜系統角色：${轉義(狀態.使用者.系統角色)}</p></section>
      <section class="網格 雙欄">
        <article class="卡片"><div class="卡片標題列"><div><div class="卡片標題">離線同步</div><div class="卡片副標">訊號不佳時資料先存在此裝置</div></div><span class="標籤 ${佇列.length ? '黃' : '綠'}">待同步 ${佇列.length}</span></div>
          <div class="同步面板"><div><b>${navigator.onLine ? '目前在線' : '目前離線'}</b><small>${佇列.length ? `有 ${佇列.length} 筆等待補送` : '沒有待同步資料'}</small></div><button id="立即同步" class="主要按鈕 小按鈕" ${!navigator.onLine || !佇列.length ? 'disabled' : ''}>立即同步</button></div>
        </article>
        <article class="卡片"><div class="卡片標題列"><div><div class="卡片標題">安裝到手機</div><div class="卡片副標">以獨立 App 模式開啟</div></div></div>
          <div class="安裝說明">Android／Chrome：按「安裝 PWA」。iPhone／Safari：按分享按鈕，再選「加入主畫面」。</div>
          <div class="按鈕列" style="margin-top:12px"><button id="安裝PWA" class="主要按鈕" ${安裝可用 ? '' : 'disabled'}>${安裝可用 ? '安裝 PWA' : '請由瀏覽器選單安裝'}</button><button id="分享入口" class="次要按鈕">分享入口</button></div>
        </article>
      </section>
      <section class="卡片" style="margin-top:16px"><div class="卡片標題列"><div><div class="卡片標題">資料與系統</div><div class="卡片副標">中央資料庫與本機版本</div></div></div>
        <div class="清單">
          <div class="清單項目"><div class="清單圖示">🗄</div><div class="清單內容"><div class="清單主文">⭐智慧工廠主資料庫</div><div class="清單次文">共用試算表識別碼：${轉義(設定.試算表識別碼)}</div></div></div>
          <div class="清單項目"><div class="清單圖示">📱</div><div class="清單內容"><div class="清單主文">智慧 5S ${轉義(設定.版本)}</div><div class="清單次文">裝置識別碼：${轉義(取得裝置識別碼())}</div></div></div>
        </div>
        <div class="按鈕列" style="margin-top:14px"><button id="重新讀取全部" class="次要按鈕">清除快取並更新</button><button id="登出按鈕" class="危險按鈕">登出</button></div>
      </section>`;
    取得元素('立即同步').onclick = () => 同步離線資料(true);
    取得元素('安裝PWA').onclick = 安裝PWA;
    取得元素('分享入口').onclick = 分享入口;
    取得元素('重新讀取全部').onclick = async () => {
      Object.values(設定.分頁).forEach(清除資料快取);
      顯示通知('快取已清除，正在重新載入');
      await 進入系統();
    };
    取得元素('登出按鈕').onclick = () => { if (confirm('確定登出此裝置？')) 登出(); };
  }

  async function 同步離線資料(顯示結果) {
    if (狀態.正在同步 || !navigator.onLine) return;
    狀態.正在同步 = true;
    if (顯示結果) 顯示讀取('同步離線資料', '正在補送待同步佇列…');
    try {
      const 結果 = await 資料庫.同步佇列(進度 => {
        if (顯示結果) 元素.讀取說明.textContent = `${進度.索引} / ${進度.總數}｜成功 ${進度.成功}｜失敗 ${進度.失敗}`;
      });
      if (顯示結果 || 結果.成功) 顯示通知(`同步完成：成功 ${結果.成功}、失敗 ${結果.失敗}、剩餘 ${結果.剩餘}`, 結果.失敗 ? '警告' : '');
      if (狀態.目前頁面 === '設定') await 顯示設定頁();
    } catch (錯誤) { if (顯示結果) 顯示通知(`同步失敗：${錯誤.message}`, '錯誤'); }
    finally { 狀態.正在同步 = false; if (顯示結果) 隱藏讀取(); }
  }

  async function 安裝PWA() {
    if (!狀態.安裝事件) return 顯示通知('請使用瀏覽器選單的「加入主畫面」', '警告');
    狀態.安裝事件.prompt();
    await 狀態.安裝事件.userChoice;
    狀態.安裝事件 = null;
    顯示設定頁();
  }
  async function 分享入口() {
    const 分享資料 = { title: 設定.系統名稱, text: '化新精密智慧 5S 管理平台', url: location.href.split('?')[0] };
    try {
      if (navigator.share) await navigator.share(分享資料);
      else {
        await navigator.clipboard.writeText(分享資料.url);
        顯示通知('入口網址已複製');
      }
    } catch (錯誤) { if (錯誤.name !== 'AbortError') 顯示通知('無法分享入口', '錯誤'); }
  }

  function 綁定固定事件() {
    元素.登入按鈕.onclick = 執行登入;
    元素.登入工號.onkeydown = 事件 => { if (事件.key === 'Enter') 執行登入(); };
    元素.關閉彈窗.onclick = 關閉彈窗;
    元素.彈窗遮罩.onclick = 事件 => { if (事件.target === 元素.彈窗遮罩) 關閉彈窗(); };
    元素.使用者頭像.onclick = () => 切換頁面('設定');
    元素.浮動按鈕.onclick = () => { if (狀態.目前頁面 === '紅牌') 開啟新增盤點(); };
    document.querySelectorAll('.導航按鈕').forEach(按鈕 => 按鈕.onclick = () => 切換頁面(按鈕.dataset.頁面));
    window.addEventListener('online', () => { 更新連線狀態(); 同步離線資料(false); });
    window.addEventListener('offline', 更新連線狀態);
    window.addEventListener('beforeinstallprompt', 事件 => { 事件.preventDefault(); 狀態.安裝事件 = 事件; if (狀態.目前頁面 === '設定') 顯示設定頁(); });
  }

  function 建立元素索引() {
    ['讀取遮罩','讀取標題','讀取說明','登入頁','登入工號','登入按鈕','登入離線提示','應用程式','頁面標題','頁面副標','頁面內容','連線狀態','使用者頭像','浮動按鈕','彈窗遮罩','彈窗標題','彈窗副標','彈窗內容','關閉彈窗','通知'].forEach(識別碼 => { 元素[識別碼] = 取得元素(識別碼); });
  }

  async function 初始化() {
    建立元素索引();
    取得元素('登入版本').textContent = 設定.版本;
    綁定固定事件();
    更新連線狀態();
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./離線服務.js?v=100', { scope: './' }).catch(錯誤 => console.warn('離線服務註冊失敗', 錯誤)));
    }
    try {
      const 已登入 = JSON.parse(localStorage.getItem(使用者快取鍵) || 'null');
      if (已登入 && 已登入.工號) {
        狀態.使用者 = 已登入;
        await 進入系統();
      }
    } catch (錯誤) { localStorage.removeItem(使用者快取鍵); }
  }

  document.addEventListener('DOMContentLoaded', 初始化, { once: true });
})(window);
