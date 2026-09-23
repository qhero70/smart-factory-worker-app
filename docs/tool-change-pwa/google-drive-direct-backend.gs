/**
 * 刀具表精靈 • 手機版｜Google Drive 指定資料夾直存後端
 * 用途：接收 GitHub Pages PWA 傳來的 Word / Excel / JSON，直接建立到固定 Drive 資料夾。
 *
 * 部署：
 * 1. 建立 Google Apps Script 專案。
 * 2. 貼上本檔。
 * 3. 部署為 Web App，執行身分選「我」，存取權依公司需求設定。
 * 4. 將 /exec 網址填回 PWA 的 GOOGLE_DRIVE_DIRECT_API。
 */

const 刀具表雲端資料夾ID = '14SPCeOwlEMsmii1Yu89jeOWSNCvyDJaj';

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      service: '刀具表精靈 Google Drive 直存',
      folderId: 刀具表雲端資料夾ID,
      time: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = 解析請求_(e);
    if (String(body.action || '') !== 'saveToolSheetBundle') {
      return JSON輸出_({ ok: false, error: 'UNKNOWN_ACTION' });
    }

    const folderId = String(body.folderId || 刀具表雲端資料夾ID);
    if (folderId !== 刀具表雲端資料夾ID) {
      return JSON輸出_({ ok: false, error: 'FOLDER_NOT_ALLOWED' });
    }

    const files = Array.isArray(body.files) ? body.files : [];
    if (!files.length) {
      return JSON輸出_({ ok: false, error: 'NO_FILES' });
    }

    const folder = DriveApp.getFolderById(刀具表雲端資料夾ID);
    const saved = [];

    files.forEach(function(file) {
      const name = 清理檔名_(file && file.name);
      const mimeType = String((file && file.mimeType) || 'application/octet-stream');
      const base64 = String((file && file.base64) || '');
      if (!name || !base64) return;

      const bytes = Utilities.base64Decode(base64);
      const blob = Utilities.newBlob(bytes, mimeType, name);
      const driveFile = folder.createFile(blob);

      saved.push({
        id: driveFile.getId(),
        name: driveFile.getName(),
        url: driveFile.getUrl(),
        mimeType: driveFile.getMimeType(),
        size: driveFile.getSize()
      });
    });

    return JSON輸出_({
      ok: true,
      savedCount: saved.length,
      folderId: 刀具表雲端資料夾ID,
      files: saved,
      time: new Date().toISOString()
    });

  } catch (err) {
    return JSON輸出_({
      ok: false,
      error: String(err && err.message ? err.message : err)
    });
  }
}

function 解析請求_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const text = String(e.postData.contents || '').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    return {};
  }
}

function 清理檔名_(name) {
  return String(name || '刀具表')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function JSON輸出_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || {}))
    .setMimeType(ContentService.MimeType.JSON);
}
