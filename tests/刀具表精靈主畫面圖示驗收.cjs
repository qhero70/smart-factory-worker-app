'use strict';
/* 刀具表精靈｜iPhone 與 PWA 主畫面圖示完整驗收。 */
const 測試=require('node:test');
const 斷言=require('node:assert/strict');
const 檔案=require('node:fs');
const 路徑=require('node:path');
const 解壓=require('node:zlib');
const 目錄=路徑.resolve(__dirname,'../docs/tool-change-pwa');
const 讀檔=相對路徑=>檔案.readFileSync(路徑.join(目錄,相對路徑));
const 網頁=讀檔('index.html').toString('utf8');
const 設定=JSON.parse(讀檔('manifest.webmanifest').toString('utf8'));
const 離線=讀檔('service-worker.js').toString('utf8');
function 驗證圖檔(檔名,預期尺寸){
  const 資料=讀檔('icons/'+檔名);
  斷言.equal(資料.subarray(0,8).toString('hex'),'89504e470d0a1a0a','必須為真正 PNG');
  斷言.equal(資料.toString('ascii',12,16),'IHDR');
  斷言.equal(資料.readUInt32BE(16),預期尺寸,'寬度');
  斷言.equal(資料.readUInt32BE(20),預期尺寸,'高度');
  let 偏移=8;
  const 壓縮塊=[];
  let 結束=false;
  while(偏移+12<=資料.length){
    const 長度=資料.readUInt32BE(偏移);
    const 類型=資料.toString('ascii',偏移+4,偏移+8);
    斷言.ok(偏移+12+長度<=資料.length,'PNG區塊不得截斷：'+檔名);
    if(類型==='IDAT')壓縮塊.push(資料.subarray(偏移+8,偏移+8+長度));
    偏移+=12+長度;
    if(類型==='IEND'){結束=true;break;}
  }
  斷言.ok(結束,'PNG 必須正確結束：'+檔名);
  斷言.ok(壓縮塊.length>0,'PNG 不得缺少圖像資料');
  斷言.ok(解壓.inflateSync(Buffer.concat(壓縮塊)).length>0,'PNG圖像資料必須能解壓');
}
測試('三種實體 PNG 圖示格式正確可解壓',()=>{
  驗證圖檔('粉紅刀具圖示-180.png',180);
  驗證圖檔('粉紅刀具圖示-192.png',192);
  驗證圖檔('粉紅刀具圖示-512.png',512);
});
測試('iPhone 明確使用新粉紅圖示，非舊藍底「刀」字',()=>{
  斷言.ok(網頁.includes('rel="apple-touch-icon" sizes="180x180"'));
  斷言.ok(網頁.includes('粉紅刀具圖示-180.png?圖示版本=20261105A'));
  斷言.ok(網頁.includes('rel="manifest" href="./manifest.webmanifest?圖示版本=20261105A"'));
});
測試('PWA 使用實體 PNG 圖示且不是舊版 data URL',()=>{
  斷言.deepEqual(設定.icons.map(x=>x.sizes),['192x192','512x512']);
  for(const 圖示 of 設定.icons){
    斷言.equal(圖示.type,'image/png');
    斷言.ok(!圖示.src.startsWith('data:'));
    斷言.ok(圖示.src.includes('粉紅刀具圖示'));
  }
  斷言.equal(設定.display,'standalone');
});
測試('離線快取更新並包含三款圖示',()=>{
  斷言.ok(離線.includes('殼層-r19'));
  for(const n of ['180','192','512']){
    斷言.ok(離線.includes('粉紅刀具圖示-'+n+'.png?圖示版本=20261105A'));
  }
});
