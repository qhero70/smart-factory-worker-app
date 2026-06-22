(function(){
  'use strict';
  var V='252-photo-fix';
  function text(v){return String(v===null||v===undefined?'':v).trim()}
  function driveId(v){var s=text(v);var m=s.match(/[-\w]{25,}/);return m?m[0]:''}
  function toImageUrl(v){
    var s=text(v);if(!s)return'';
    if(/^data:image\//i.test(s))return s;
    var id=driveId(s);
    if(id && (s.indexOf('drive.google.com')>=0 || !/^https?:\/\//i.test(s))) return 'https://drive.google.com/thumbnail?id='+id+'&sz=w800';
    if(id && /\/file\/d\//.test(s)) return 'https://drive.google.com/thumbnail?id='+id+'&sz=w800';
    return s;
  }
  window.取圖片網址=toImageUrl;
  window.轉Google圖片網址=toImageUrl;
  window.圖片HTML=function(url,textLabel){
    var src=toImageUrl(url), label=text(textLabel)||'無圖';
    var safe=label.replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]});
    return src?'<img src="'+src+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML=\'<div class=無圖>'+safe+'</div>\'">':'<div class="無圖">'+safe+'</div>';
  };
  function patchImg(img){
    if(!img || img.dataset.photoFix252)return;
    var src=img.getAttribute('src')||img.getAttribute('data-src')||'';
    var fixed=toImageUrl(src);
    if(fixed && fixed!==src) img.setAttribute('src',fixed);
    img.dataset.photoFix252='1';
    img.referrerPolicy='no-referrer';
    img.loading=img.loading||'lazy';
  }
  function run(){
    Array.prototype.slice.call(document.querySelectorAll('img')).forEach(patchImg);
    Array.prototype.slice.call(document.querySelectorAll('[data-photo],[data-img],[data-url]')).forEach(function(el){
      var src=el.getAttribute('data-photo')||el.getAttribute('data-img')||el.getAttribute('data-url')||'';
      var fixed=toImageUrl(src);
      if(fixed && el.tagName==='IMG') el.src=fixed;
    });
    document.body.dataset.photoFix252=V;
  }
  document.addEventListener('DOMContentLoaded',function(){run();[300,900,1800,3000].forEach(function(ms){setTimeout(run,ms)});setInterval(run,3500)});
})();
