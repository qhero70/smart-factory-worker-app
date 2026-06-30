/**
 * 鎖定正式主資料庫｜智慧工廠主資料庫
 * 目的：停止多資料庫混亂，將中央資料庫 API 的寫入目標鎖定到唯一正式主庫。
 * 正式主庫：智慧工廠主資料庫
 */

const 正式主資料庫_ID = '10hS6rzV9gStu368gAYkPl8M0sMBgZEa5xHLsKxb0snY';
const 正式主資料庫_名稱 = '智慧工廠主資料庫';
const 正式主資料庫_屬性鍵 = '智慧製造中央作戰資料庫_ID';

function 鎖定正式主資料庫_智慧工廠主資料庫() {
  const ss = SpreadsheetApp.openById(正式主資料庫_ID);
  PropertiesService.getScriptProperties().setProperty(正式主資料庫_屬性鍵, 正式主資料庫_ID);
  return {
    ok: true,
    success: true,
    成功: true,
    訊息: '已鎖定唯一正式主資料庫，後續清洗、APS、派班、報工扣工單都寫入這一份。',
    正式主資料庫名稱: ss.getName(),
    正式主資料庫ID: ss.getId(),
    正式主資料庫網址: ss.getUrl()
  };
}

function 檢查目前鎖定資料庫() {
  const id = PropertiesService.getScriptProperties().getProperty(正式主資料庫_屬性鍵) || '';
  let result = {
    ok: !!id,
    success: !!id,
    成功: !!id,
    目前鎖定ID: id,
    正式主資料庫ID: 正式主資料庫_ID,
    是否為正式主資料庫: id === 正式主資料庫_ID
  };
  if (id) {
    const ss = SpreadsheetApp.openById(id);
    result.目前鎖定名稱 = ss.getName();
    result.目前鎖定網址 = ss.getUrl();
  }
  return result;
}
