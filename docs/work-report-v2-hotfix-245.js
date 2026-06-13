(function(){
  'use strict';
  var V='245';
  var 手動加班=false;
  var 手動加班類型=false;
  var 加班值='否';
  var 加班類型值='無';
  var 手動開始=false;
  var 手動結束=false;
  var 班別規則={
    '早班':{s:'08:00',e:'16:50',r:[['10:00','10:10'],['12:10','12:40'],['14:40','14:50']]},
    '中班':{s:'16:50',e:'01:40',r:[['18:50','19:00'],['21:00','21:30'],['23:30','23:40']]},
    '大夜班':{s:'23:00',e:'07:50',r:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']]},
    '夜班':{s:'23:00',e:'07:50',r:[['01:00','01:10'],['03:10','03:40'],['05:40','05:50']]}
  };
  function $(id){return document.getElementById(id)}
  function all(q){return Array.from(document.querySelectorAll(q))}
  function z(n){return String(n).padStart(2,'0')}
  function dstr(d){return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate())}
  function dtstr(d){return dstr(d)+'T'+z(d.getHours())+':'+z(d.getMinutes())}
  function wtxt(el,t){if(el&&el.textContent!==t)el.textContent=t}
  function wval(el,t){if(el&&el.value!==t)el.value=t}
  function n(v){var x=Number(String(v||'').replace(/,/g,'').trim());return Number.isFinite(x)?Math.max(0,Math.floor(x)):0}
  function nd(v){var d=new Date(v);return Number.isNaN(d.getTime())?null:d}
  function add(d,days){var x=new Date(d.getTime());x.setDate(x.getDate()+days);return x}
  function diff(a,b){return Math.round((b.getTime()-a.getTime())/60000)}
  function overlap(a,b,c,d){var s=Math.max(a.getTime(),c.getTime()),e=Math.min(b.getTime(),d.getTime());return e>s?Math.round((e-s)/60000):0}
  function shift(){var v=($('班別')&&$('班別').value)||'';if(/中班|Swing|16:50|01:40/i.test(v))return '中班';if(/夜|大夜|Night|23:00|07:50/i.test(v))return '大夜班';return '早班'}
  function workDate(){var raw=String(($('作業日')&&$('作業日').value)||'').replaceAll('/','-');if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;var d=new Date(),hh=d.getHours()*100+d.getMinutes(),s=shift();if(s==='中班'&&hh<140)d.setDate(d.getDate()-1);if(s==='大夜班'&&hh<750)d.setDate(d.getDate()-1);if(s==='早班'&&hh<600)d.setDate(d.getDate()-1);return dstr(d)}
  function at(date,time,start){var m=String(time).match(/^(\d{1,2}):(\d{2})$/),d=new Date(date+'T00:00:00');d.setHours(Number(m[1]),Number(m[2]),0,0);if(start){var sm=start.split(':'),tm=Number(m[1])*60+Number(m[2]),st=Number(sm[0])*60+Number(sm[1]);if(tm<st)d.setDate(d.getDate()+1)}return d}
  function calc(){var s=shift(),r=班別規則[s]||班別規則.早班,wd=workDate(),bs=at(wd,r.s),be=at(wd,r.e,r.s);while(be<=bs)be=add(be,1);var st=nd(($('開始時間')||{}).value)||bs,en=nd(($('結束時間')||{}).value)||be;while(en<=st)en=add(en,1);var rest=r.r.reduce(function(sum,p){var a=at(wd,p[0],r.s),b=at(wd,p[1],r.s);while(b<=a)b=add(b,1);return sum+overlap(st,en,a,b)},0);return {wd:wd,start:st,end:en,min:Math.max(0,diff(st,en)-rest),rest:rest}}
  function timeFix(){var c=calc();if($('開始時間')&&!手動開始)wval($('開始時間'),dtstr(c.start));if($('結束時間')&&!手動結束)wval($('結束時間'),dtstr(c.end));wval($('作業日'),c.wd);wval($('實際工時'),String(c.min));window.智慧製造報工時間狀態={版本:V,實際工時_分:c.min,休息扣除_分:c.rest}}
  function overtime(){var o=$('是否加班'),t=$('加班類型');if(o&&o.dataset.v!==V){var keep=o.value||加班值;o.innerHTML='<option value="否">否 / No</option><option value="是">是 / Yes</option>';o.value=/^是/.test(keep)?'是':'否';o.dataset.v=V}if(t&&t.dataset.v!==V){var k=t.value||加班類型值;t.innerHTML='<option value="無">無 / None</option><option value="平日加班">平日加班 / Weekday OT</option><option value="假日加班">假日加班 / Holiday OT</option><option value="臨時加班">臨時加班 / Temporary OT</option>';t.value=/^(平日加班|假日加班|臨時加班)$/.test(k)?k:'無';t.dataset.v=V}if(o&&!手動加班)o.value='否';if(t&&(!手動加班類型||o.value==='否'))t.value='無'}
  function defect(){var total=$('快速不良數');if(!total)return;var rows=all('.不良行').map(function(r){return r.querySelector('.不良數量')}).filter(Boolean);if(!rows.length)return;var max=n(total.value),sum=rows.reduce(function(s,x){return s+n(x.value)},0);rows.forEach(function(inp,i){var other=rows.reduce(function(s,x,j){return s+(i===j?0:n(x.value))},0);inp.max=String(Math.max(0,max-other));inp.min='0'});if(sum>max){var over=sum-max;rows.slice().reverse().forEach(function(inp){if(over<=0)return;var cur=n(inp.value),cut=Math.min(cur,over);if(cut>0){inp.value=cur-cut>0?String(cur-cut):'';over-=cut;inp.dispatchEvent(new Event('input',{bubbles:true}))}})}}
  function labels(){document.title='製造部．報工系統 / Manufacturing Work Report';wtxt(document.querySelector('.標題'),'🏭 製造部．報工系統 / Manufacturing Work Report');wtxt(document.querySelector('.副標'),'化新智慧製造HS / Huaxin Smart Manufacturing HS');var m={'人員':'👤<br>人員 / Operator','工件':'🔧<br>工件 / Workpiece','產出':'📊<br>產出 / Output','品質':'🔍<br>品質 / Quality'};Object.keys(m).forEach(function(k){var e=document.querySelector('[data-tab="'+k+'"]');if(e&&e.innerHTML!==m[k])e.innerHTML=m[k]});var map={'今日共做數':'今日共做數 / Total Quantity','不良數量':'不良數量 / Defect Quantity','實際良品數':'實際良品數 / Good Quantity','開始時間':'開始時間 / Start Time','結束時間':'結束時間 / End Time','實際工時_分':'實際工時_分 / Actual Work Minutes','是否加班':'是否加班 / Overtime','加班類型':'加班類型 / Overtime Type','不良原因數量分配':'不良原因數量分配 / Defect Reason Allocation','異常類型':'異常類型 / Abnormal Type','責任歸屬':'責任歸屬 / Responsibility'};all('label').forEach(function(l){var k=String(l.textContent||'').split('/')[0].trim().replace(/\s+/g,'');if(map[k])wtxt(l,map[k])})}
  function isQuality(){var q=document.querySelector('[data-tab="品質"]');return !!(q&&q.classList.contains('active'))}
  function button(){var b=$('送出報工');if(b)wtxt(b,isQuality()?'確認送出 / Confirm Submit':'下一步 / Next →')}
  function bind(){if(document.body.dataset.hotfix245)return;document.body.dataset.hotfix245='1';document.addEventListener('input',function(e){if(e.target.id==='開始時間')手動開始=true;if(e.target.id==='結束時間')手動結束=true;if(e.target.id==='快速不良數'||e.target.classList.contains('不良數量'))setTimeout(defect,0);setTimeout(timeFix,0)},true);document.addEventListener('change',function(e){if(e.target.id==='是否加班'){手動加班=true;加班值=e.target.value}if(e.target.id==='加班類型'){手動加班類型=true;加班類型值=e.target.value;if(加班類型值!=='無'){手動加班=true;加班值='是'}}if(e.target.id==='班別'){手動開始=false;手動結束=false}setTimeout(run,80)},true);document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#送出報工');if(b&&!isQuality()){e.preventDefault();e.stopPropagation();var n=$('下一步');if(n)n.click();setTimeout(button,100)}setTimeout(button,120);setTimeout(defect,120)},true)}
  function run(){bind();labels();overtime();timeFix();defect();button()}
  document.addEventListener('DOMContentLoaded',function(){run();[300,900,1800,3000].forEach(function(ms){setTimeout(run,ms)});setInterval(run,2500)})
})();
