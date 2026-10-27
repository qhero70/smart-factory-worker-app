'use strict';
const 測試 = require('node:test');
const 斷言 = require('node:assert/strict');
const 檔案 = require('node:fs');
const 路徑 = require('node:path');
const 虛擬機 = require('node:vm');

const 根目錄 = 路徑.resolve(__dirname, '..');
const 前端 = 檔案.readFileSync(路徑.join(根目錄, 'docs/tool-change-pwa/index.html'), 'utf8');
const 離線服務 = 檔案.readFileSync(路徑.join(根目錄, 'docs/tool-change-pwa/service-worker.js'), 'utf8');
const 後端 = 檔案.readFileSync(路徑.join(根目錄, 'smart-factory-command-center/01_GAS後端/刀具表正式資料連線.gs'), 'utf8');
const LINE = 檔案.readFileSync(路徑.join(根目錄, 'smart-factory-command-center/01_GAS後端/75_LINE_製造工具中心_v1.0.gs'), 'utf8');

const 主程式 = [...前端.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).find(s => s.includes('function normalizeA4PressureFields_'));

測試('A4 每把刀具使用雙列，照片儲存格以 rowspan=2 合併', () => {
  斷言.match(主程式, /mainRow\.className = 'tool-row-main'/);
  斷言.match(主程式, /subRow\.className = 'tool-row-sub'/);
  斷言.match(主程式, /<td rowspan="2" class="a4-photo-cell">/);
  斷言.match(主程式, /tbody\.appendChild\(mainRow\);\s*tbody\.appendChild\(subRow\);/);
});

測試('刀具照片依 3 至 8 把自動縮放，常用少刀版可達 100px', () => {
  斷言.match(前端, /data-density="large"\] \.tool-photo-img \{ max-height:100px; \}/);
  斷言.match(前端, /data-density="medium"\] \.tool-photo-img \{ max-height:78px; \}/);
  斷言.match(前端, /data-density="compact"\] \.tool-photo-img \{ max-height:56px; \}/);
  斷言.match(主程式, /Math\.max\(3, Math\.min\(8,/);
});

測試('夾頭壓力與注意事項為左右雙格，注意事項可留白', () => {
  斷言.match(前端, /class="a4-pressure-notes"/);
  斷言.match(前端, /id="out-pressure-high"/);
  斷言.match(前端, /id="out-pressure-low"/);
  斷言.match(前端, /id="out-notes"/);
  斷言.match(主程式, /id: 'notes'[\s\S]*optional: true/);
});

測試('舊版單一 pressure 自動搬到高壓，低壓與注意事項不會捏造內容', () => {
  const 起點 = 主程式.indexOf('function normalizePressure');
  const 終點 = 主程式.indexOf('function normalizeDailyQty', 起點);
  const 背景 = 虛擬機.createContext({});
  虛擬機.runInContext(主程式.slice(起點, 終點), 背景);
  const 舊資料 = {type:1, pressure:'10KG'};
  背景.normalizeA4PressureFields_(舊資料);
  斷言.equal(舊資料.pressureHigh, '10KG');
  斷言.equal(舊資料.pressureLow, '');
  斷言.equal(舊資料.notes, '');
  斷言.equal(舊資料.pressure, '10KG');
});

測試('正式試算表主檔與 Excel 都包含高壓、低壓及注意事項', () => {
  斷言.match(主程式, /夾持高壓: isA3 \? '' : \(data\.pressureHigh \|\| data\.pressure \|\| ''\)/);
  斷言.match(主程式, /夾持低壓: isA3 \? '' : \(data\.pressureLow \|\| ''\)/);
  斷言.match(主程式, /注意事項: isA3 \? '' : \(data\.notes \|\| ''\)/);
  斷言.match(主程式, /\['夾頭高壓 \/ Chuck High Pressure'/);
  斷言.match(主程式, /\['夾頭低壓 \/ Chuck Low Pressure'/);
  斷言.match(主程式, /\['注意事項 \/ Notes'/);
});

測試('GAS 欄位保留舊夾持壓力並新增三欄，提供可重跑升級工具', () => {
  斷言.match(後端, /刀具表連線版本_ = '2\.2\.7'/);
  斷言.match(後端, /'夾持壓力','夾持高壓','夾持低壓','注意事項'/);
  斷言.match(後端, /function 升級刀具表正式欄位_v227\(/);
  斷言.match(後端, /快照\.pressureHigh = 高壓/);
  斷言.match(後端, /快照\.pressure = 高壓/);
});

測試('唯一 LINE BOT 固定開啟 v2.2.7 正式 PWA，未建立第二入口', () => {
  斷言.match(LINE, /v1\.4\.6_刀具表LINE入口精準路由_PWA_v2\.2\.7/);
  斷言.match(LINE, /'\?source=' \+ 製造工具75_刀具表LINE來源_ \+ '&v=227'/);
  斷言.match(LINE, /function 同步75_LINE刀具表精靈_v227\(/);
});

測試('離線快取已升版，完整前端主程式可編譯', () => {
  斷言.match(離線服務, /刀具表精靈-pwa-v2\.2\.7/);
  斷言.doesNotThrow(() => new 虛擬機.Script(主程式));
});
