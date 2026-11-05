/**
 * 化新精密｜刀具表精靈「工件三視圖」高解析度雲端模組｜v1.0
 *
 * 【部署規則】
 * 1. 加入既有正式刀具表 GAS 專案，不建立第二個 Web App、不更換原部署網址。
 * 2. 同一專案的「刀具表正式資料連線.gs」已加入照片專用動作分流。
 * 3. 正式部署必須由獲授權的管理員更新原部署版本；僅推 GitHub 不會更新 GAS。
 * 4. 管理員於 Script Properties 設定「刀具表照片授權碼_SHA256」（64 位 SHA-256 十六進位值）。
 *    上傳人員每次開啟 PWA 的照片功能需輸入自己的授權碼；授權碼不存入 GitHub／試算表。
 * 5. 未設定授權碼、照片資料夾可由任何人編輯、或 GAS 權限不足時一律拒絕上傳。
 *
 * 【資料保護】
 * - 高畫質照片僅在 Google Drive；正式刀具表快照只留檔案 ID／檔案名稱／照片索引。
 * - 使用 POST 隱藏表單 + postMessage；授權碼與照片資料不放入 GET/JSONP 網址。
 * - 大圖讀取須同樣驗證授權碼；不自動將照片改成「知道連結的人可檢視」。
 * - 限同一官方 PWA 來源接收訊息；所有 POST 都檢查請求碼及授權。
 */
var 刀具三視圖_版本_ = '1.0';
var 刀具三視圖_資料夾ID_ = '1au_lydLX3NAEwEs8lzLF58iJ5uzKveYQ';
var 刀具三視圖_資料夾預期擁有者_ = 'qhero1982@gmail.com';
var 刀具三視圖_授權屬性_ = '刀具表照片授權碼_SHA256';
var 刀具三視圖_官方來源_ = 'https://qhero70.github.io';
var 刀具三視圖_最大圖檔位元組_ = 4 * 1024 * 1024;

function 刀具三視圖_接收請求_(請求, 方法) {
  var 參數 = 請求 && 請求.parameter || {};
  var 動作 = String(參數.api || '').trim();
  if (動作.indexOf('刀具表_照片') !== 0) return null;

  if (動作 === '刀具表_照片設定') {
    if (方法 !== 'GET') throw new Error('照片狀態只接受 GET');
    var 設定 = 刀具三視圖_狀態_();
    設定.版本 = 刀具表連線版本_;
    設定.主庫ID = 刀具表正式庫_;
    return 刀具表正式輸出_(設定, 參數);
  }

  if (方法 !== 'POST') return 刀具三視圖_回傳頁_({
    成功:false, 訊息:'照片動作只接受 POST'
  }, 參數.請求碼);

  var 結果;
  try {
    刀具三視圖_檢查請求碼_(參數.請求碼);
    var 狀態 = 刀具三視圖_狀態_();
    if (!狀態.可上傳) throw new Error(狀態.訊息);
    刀具三視圖_驗證授權_(參數.授權碼);

    if (動作 === '刀具表_照片上傳') {
      結果 = 刀具三視圖_上傳_(參數);
    } else if (動作 === '刀具表_照片查核') {
      結果 = 刀具三視圖_讀取_(參數, false);
    } else if (動作 === '刀具表_照片讀取') {
      結果 = 刀具三視圖_讀取_(參數, true);
    } else {
      throw new Error('未知照片動作');
    }
  } catch (錯誤) {
    結果 = {成功:false,訊息:String(錯誤 && 錯誤.message || 錯誤)};
  }
  return 刀具三視圖_回傳頁_(結果, 參數.請求碼);
}

function 刀具三視圖_檢查請求碼_(請求碼) {
  if (!/^[a-zA-Z0-9-]{20,100}$/.test(String(請求碼 || ''))) throw new Error('照片請求識別不合法');
}
function 刀具三視圖_狀態_() {
  var 結果 = {
    成功:true, 照片功能版本:刀具三視圖_版本_,
    正式照片庫ID:刀具三視圖_資料夾ID_,
    可上傳:false, 需要授權碼:true, 訊息:'尚未完成照片雲端部署'
  };
  try {
    var props = PropertiesService.getScriptProperties();
    var digest = String(props.getProperty(刀具三視圖_授權屬性_) || '').trim();
    if (!/^[a-fA-F0-9]{64}$/.test(digest)) throw new Error('照片上傳授權碼尚未於 GAS 設定');
    刀具三視圖_驗證照片庫權限_();
    結果.可上傳 = true;
    結果.訊息 = '照片服務已就緒，請輸入照片授權碼';
  } catch (錯誤) {
    結果.訊息 = String(錯誤 && 錯誤.message || 錯誤);
  }
  return 結果;
}
function 刀具三視圖_驗證照片庫權限_() {
  var folder = DriveApp.getFolderById(刀具三視圖_資料夾ID_);
  var owner = folder.getOwner();
  if (!owner || String(owner.getEmail()).toLowerCase() !== 刀具三視圖_資料夾預期擁有者_)
    throw new Error('GAS 執行帳號未取得預期的照片庫授權或資料夾擁有者不符');
  var cursor = folder;
  // Google Drive 的上層公開權限可被繼承；逐層拒絕任何人可存取。
  for (var i=0;i<12;i++) {
    if (cursor.getSharingAccess() !== DriveApp.Access.PRIVATE)
      throw new Error('照片資料夾或上層仍開放任何人共用，請先移除公開分享');
    var parents = cursor.getParents();
    if (!parents.hasNext()) break;
    cursor = parents.next();
  }
  return folder;
}
function 刀具三視圖_雜湊_(文字) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(文字), Utilities.Charset.UTF_8);
  return bytes.map(function(n){return ('0'+(n&255).toString(16)).slice(-2);}).join('');
}
function 刀具三視圖_驗證授權_(授權碼) {
  var code = String(授權碼 || '');
  if (code.length < 24 || code.length > 256) throw new Error('請輸入完整的照片授權碼');
  var want = String(PropertiesService.getScriptProperties().getProperty(刀具三視圖_授權屬性_) || '').toLowerCase();
  var actual = 刀具三視圖_雜湊_(code);
  var diff = want.length ^ actual.length;
  for (var i=0;i<Math.max(want.length,actual.length);i++)
    diff |= ((want.charCodeAt(i)||0) ^ (actual.charCodeAt(i)||0));
  if (diff !== 0) throw new Error('照片授權碼無效，未修改雲端資料');
}
function 刀具三視圖_檢查刀具表ID_(id) {
  var text = String(id || '');
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(text)) throw new Error('刀具表識別不合法');
  return text;
}
function 刀具三視圖_檢查視圖_(value) {
  var text = String(value || '');
  if (['正視圖','俯視圖','側視圖'].indexOf(text) < 0) throw new Error('視圖名稱不合法');
  return text;
}
function 刀具三視圖_確認子資料夾_(tableId) {
  var parent = 刀具三視圖_驗證照片庫權限_();
  var name = '刀具表_' + 刀具三視圖_檢查刀具表ID_(tableId);
  var found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}
function 刀具三視圖_檔案屬於照片庫_(file) {
  var current = file.getParents();
  if (!current.hasNext()) return false;
  var folder = current.next();
  var parent = folder.getParents();
  return parent.hasNext() && parent.next().getId() === 刀具三視圖_資料夾ID_;
}
function 刀具三視圖_上傳_(參數) {
  var tableId = 刀具三視圖_檢查刀具表ID_(參數.刀具表ID);
  var view = 刀具三視圖_檢查視圖_(參數.視圖);
  var mime = String(參數.圖片類型 || '');
  if (!/^image\/(?:jpeg|png|webp)$/.test(mime)) throw new Error('僅接受 JPG、PNG 或 WebP 圖片');
  var data = String(參數.圖片資料 || '');
  var prefix = 'data:' + mime + ';base64,';
  if (data.indexOf(prefix) === 0) data = data.substring(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length > 5600000)
    throw new Error('圖片編碼錯誤或容量超過上限');
  var bytes = Utilities.base64Decode(data);
  if (bytes.length < 100 || bytes.length > 刀具三視圖_最大圖檔位元組_)
    throw new Error('圖片大小超過 4MB，請調整拍攝解析度');
  var folder = 刀具三視圖_確認子資料夾_(tableId);
  var ext = mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
  var name = view + '_' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmmss') + '_' +
    Utilities.getUuid().slice(0,8) + '.' + ext;
  var file = folder.createFile(Utilities.newBlob(bytes,mime,name));
  file.setDescription('刀具表精靈三視圖｜刀具表ID：'+tableId+'｜視圖：'+view);
  // 已強制核對私人資料夾；絕不更動為任何人可檢視。
  var check = DriveApp.getFileById(file.getId());
  if (check.getSize() !== bytes.length) throw new Error('照片已上傳但大小核對不符，請管理員查核');
  return {
    成功:true, 照片功能版本:刀具三視圖_版本_, 刀具表ID:tableId, 視圖:view,
    檔案ID:file.getId(), 檔案名稱:name, 容量:bytes.length, 圖片類型:mime,
    圖片雜湊:刀具三視圖_雜湊_(data),
    雲端網址:file.getUrl(), 儲存時間:new Date().toISOString()
  };
}
function 刀具三視圖_讀取_(參數, 是否取圖) {
  var fileId = String(參數.檔案ID || '');
  if (!/^[A-Za-z0-9_-]{12,150}$/.test(fileId)) throw new Error('照片檔案ID不合法');
  var file = DriveApp.getFileById(fileId);
  if (!刀具三視圖_檔案屬於照片庫_(file)) throw new Error('此照片不屬於指定三視圖資料夾');
  var mime = file.getMimeType();
  if (!/^image\/(?:jpeg|png|webp)$/.test(mime)) throw new Error('檔案格式不是支援的圖片');
  var result = {
    成功:true, 照片功能版本:刀具三視圖_版本_,
    檔案ID:fileId, 檔案名稱:file.getName(), 圖片類型:mime, 容量:file.getSize(),
    雲端網址:file.getUrl()
  };
  if (是否取圖) {
    if (file.getSize() > 刀具三視圖_最大圖檔位元組_) throw new Error('檔案超過大圖讀取上限');
    result.圖片資料 = Utilities.base64Encode(file.getBlob().getBytes());
  }
  return result;
}
function 刀具三視圖_回傳頁_(結果, 請求碼) {
  var response = Object.assign({
    來源:'刀具表精靈照片服務',
    請求碼:String(請求碼 || ''),
    照片功能版本:刀具三視圖_版本_
  }, 結果);
  var safe = JSON.stringify(response)
    .replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
    .replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  // HtmlService 的 Google 安全沙箱可能多包一層 iframe；雙層傳送同一請求碼。
  var 目標 = JSON.stringify(刀具三視圖_官方來源_);
  var js = 'window.parent.postMessage(' + safe + ',' + 目標 + ');' +
    'if(window.top!==window.parent)window.top.postMessage(' + safe + ',' + 目標 + ');';
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"></head><body>' +
    '<script>' + js + '</script><p>刀具表精靈照片傳輸完成，可以返回原畫面。</p></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * 照片庫管理員手動執行一次的授權碼初始化功能。
 * 必須使用 qhero1982@gmail.com 開啟既有正式 GAS 專案執行。
 * 管理密鑰僅保存 SHA-256 雜湊；明文授權碼只在本次執行紀錄顯示一次。
 */
function 管理員_產生工件三視圖授權碼_() {
  var email = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (email !== 刀具三視圖_資料夾預期擁有者_)
    throw new Error('僅允許照片庫擁有者 qhero1982@gmail.com 初始化授權碼');
  var code = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g,'');
  PropertiesService.getScriptProperties().setProperty(
    刀具三視圖_授權屬性_, 刀具三視圖_雜湊_(code));
  console.log('工件照片授權碼（僅此一次，請安全保存）：' + code);
  return '授權碼已建立；請立即在本次執行紀錄查看並安全保存';
}
