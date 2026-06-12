window.PWA_CONFIG={
  GAS_WEB_APP_URL:'https://script.google.com/macros/s/AKfycbweSKwcREbv-5R5E1ZIj_XOZDGQzRPCdoOAy2uTkhMwZTZoIv-GtpQi0PF8ahdb6KEJ/exec',
  APP_NAME:'製造部智慧製造應用總部',
  VERSION:'v2.1.27_正式現場版',
  SPREADSHEET_ID:'1JA0-kxVO6x3NbCgjmUurkwd8lffolj0pbInissLl8BQ',
  API_TIMEOUT_MS:8000,
  API_ACTIONS:{健康檢查:'健康檢查',主檔檢查:'主檔檢查',取得報工作業v2初始資料:'取得報工作業v2初始資料',寫入報工作業v2:'寫入報工作業v2',寫入不良紀錄v2:'寫入不良紀錄v2',手動重刷_主檔照片:'手動重刷_主檔照片'}
};
(function(){
function S(){if(document.getElementById('報工正式樣式'))return;var x=document.createElement('link');x.id='報工正式樣式';x.rel='stylesheet';x.href='./work-report-v2-ui.css?v=233';document.head.appendChild(x)}
function P(){var l=document.getElementById('人員列表');if(!l)return;var c=document.getElementById('人員下拉控制');if(!c){c=document.createElement('div');c.id='人員下拉控制';c.className='人員下拉正式';c.innerHTML='<button id="人員下拉按鈕" type="button"><span class="下拉頭像">👤</span><span><span class="下拉姓名">請選擇人員</span><span class="下拉資料">點擊展開人員圖片卡片清單</span></span><span class="下拉箭頭">⌄</span></button>';l.parentNode.insertBefore(c,l)}var b=document.getElementById('人員下拉按鈕');if(b&&!b.dataset.ok){b.dataset.ok='1';b.onclick=function(e){e&&e.preventDefault();document.body.classList.add('人員下拉展開')}}var h=l.querySelector('.人員卡片.選中');if(h){var n=c.querySelector('.下拉姓名'),d=c.querySelector('.下拉資料'),p=c.querySelector('.下拉頭像'),im=h.querySelector('.頭像圈 img');if(n)n.textContent=(h.querySelector('.人名')||{}).textContent||'已選人員';if(d)d.textContent=((h.querySelector('.人工號')||{}).textContent||'')+'｜'+((h.querySelector('.班標')||{}).textContent||'');if(p)p.innerHTML=im?'<img src="'+im.src+'" alt="">':'👤'}if(!l.dataset.close){l.dataset.close='1';l.addEventListener('click',function(e){if(e.target.closest('.人員卡片'))setTimeout(function(){document.body.classList.remove('人員下拉展開');P()},160)},true)}}
function T(){var n=new Date(),v=new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,16),a=document.getElementById('開始時間'),e=document.getElementById('結束時間');if(a&&!a.value)a.value=v;if(e&&!e.value)e.value=v}
function R(){S();P();T()}
document.addEventListener('DOMContentLoaded',function(){setInterval(R,1000);setTimeout(R,250);setTimeout(R,1200)})
})();
