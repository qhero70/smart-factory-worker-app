(function(){
  'use strict';

  const 版本 = 'v1.2.1_產品照片欄位相容補強';
  const 文字 = value => String(value ?? '').trim();

  function 取值(row, keys){
    row = row || {};
    for(const key of keys){
      if(row[key] !== undefined && row[key] !== null && 文字(row[key]) !== '') return row[key];
    }
    return '';
  }

  function 轉圖片網址(value){
    let s = 文字(value);
    if(!s) return '';
    s = s.replace(/^=IMAGE\(/i, '').replace(/["'()]/g, '').trim();
    const url = s.match(/https?:\/\/[^\s,，;；]+/i);
    if(url) s = url[0];
    if(s.indexOf('data:image/') === 0) return s;
    const id = s.match(/[-\w]{25,}/);
    if(id) return 'https://drive.google.com/thumbnail?id=' + id[0] + '&sz=w900';
    return s;
  }

  function 第一張圖片(row){
    return 轉圖片網址(取值(row, [
      '產品照片網址',
      '產品縮圖網址',
      '產品主圖',
      '產品照片',
      '產品主圖網址',
      '產品主圖縮圖網址',
      '產品圖片網址',
      '主圖',
      '照片網址',
      '縮圖網址',
      '圖片網址',
      '前視圖網址',
      '前視圖縮圖網址',
      '側視圖網址',
      '側視圖縮圖網址',
      '俯視圖網址',
      '俯視圖縮圖網址',
      '產品主圖檔案ID',
      '產品照片檔案ID',
      'Google檔案ID',
      '照片檔案ID',
      '檔案ID'
    ]));
  }

  function 三視圖(row){
    const direct = 轉圖片網址(取值(row, ['產品三視圖','三視圖','三視圖網址','產品三視圖網址']));
    if(direct) return direct;
    return [
      轉圖片網址(取值(row, ['前視圖網址','前視圖縮圖網址','前視圖檔案ID'])),
      轉圖片網址(取值(row, ['側視圖網址','側視圖縮圖網址','側視圖檔案ID'])),
      轉圖片網址(取值(row, ['俯視圖網址','俯視圖縮圖網址','俯視圖檔案ID']))
    ].filter(Boolean).join('、');
  }

  function 建立產品索引(products){
    const map = new Map();
    (products || []).forEach(p => {
      const photo = 第一張圖片(p);
      const view3 = 三視圖(p);
      if(photo){
        p.產品照片網址 = p.產品照片網址 || photo;
        p.產品縮圖網址 = p.產品縮圖網址 || photo;
        p.產品主圖 = p.產品主圖 || photo;
        p.產品照片 = p.產品照片 || photo;
      }
      if(view3) p.產品三視圖 = p.產品三視圖 || view3;
      ['產品編號','客戶品號','品名','產品名稱'].forEach(k => {
        const key = 文字(p[k]);
        if(key) map.set(key, p);
      });
    });
    return map;
  }

  function 補產品照片(data){
    if(!data || typeof data !== 'object') return data;
    const products = data.產品 || data.產品主檔 || data.products || [];
    const groups = data.報工工站群組 || data.途程工站群組 || data.workItems || [];
    const productMap = 建立產品索引(products);

    (groups || []).forEach(g => {
      const rowPhoto = 第一張圖片(g);
      const hit = productMap.get(文字(g.產品編號)) || productMap.get(文字(g.客戶品號)) || productMap.get(文字(g.品名)) || productMap.get(文字(g.產品名稱)) || {};
      const photo = rowPhoto || hit.產品照片網址 || hit.產品主圖 || hit.產品縮圖網址 || hit.產品照片 || '';
      const view3 = 三視圖(g) || hit.產品三視圖 || '';
      if(photo){
        g.產品照片網址 = g.產品照片網址 || photo;
        g.產品縮圖網址 = g.產品縮圖網址 || photo;
        g.產品主圖 = g.產品主圖 || photo;
        g.產品照片 = g.產品照片 || photo;
      }
      if(view3) g.產品三視圖 = g.產品三視圖 || view3;
    });

    const count = (groups || []).filter(g => g.產品照片網址 || g.產品主圖 || g.產品縮圖網址 || g.產品照片).length;
    data.__PWA產品照片補強 = { 版本, 產品照片數: count };
    if(data.meta && data.meta.筆數) data.meta.筆數.產品照片_前端補強後 = count;
    return data;
  }

  function 補回傳(response){
    if(!response || typeof response !== 'object') return response;
    const data = response.data || response.資料 || response;
    補產品照片(data);
    if(response.data) response.data = data;
    if(response.資料) response.資料 = data;
    return response;
  }

  function 安裝橋接攔截(){
    if(!window.GAS橋接器 || !window.GAS橋接器.取得報工初始資料 || window.GAS橋接器.__產品照片補強已安裝) return false;
    const old = window.GAS橋接器.取得報工初始資料.bind(window.GAS橋接器);
    window.GAS橋接器.取得報工初始資料 = async function(){
      const result = await old();
      return 補回傳(result);
    };
    window.GAS橋接器.__產品照片補強已安裝 = true;
    return true;
  }

  function 啟動(){
    const ok = 安裝橋接攔截();
    const status = document.getElementById('狀態卡');
    if(status && ok && !status.textContent.includes('產品照片相容補強')){
      status.textContent = status.textContent + '｜產品照片相容補強';
    }
  }

  啟動();
  window.addEventListener('load', 啟動);
  setTimeout(啟動, 300);
  setTimeout(啟動, 1000);
})();
