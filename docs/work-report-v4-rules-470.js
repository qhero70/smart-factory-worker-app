/* V4 image card patch v4.7.5 */
(function(){
  function g(id){return document.getElementById(id)}
  function addCss(){
    if(g('v4img475'))return;
    var s=document.createElement('style');
    s.id='v4img475';
    s.textContent='.person-photo,.person-photo-lg,.product-thumb{overflow:hidden!important}.person-photo img,.person-photo-lg img,.person-card img,.selected-person-display img,.product-thumb img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important}.product-card{min-height:154px!important}.product-thumb{width:100%!important;height:92px!important;border-radius:16px!important}.product-name{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;font-size:13.5px!important;line-height:1.25!important;font-weight:900!important}.product-code{display:inline-block!important;margin-top:5px!important;background:#e7f0ff!important;color:#1769d8!important;border-radius:999px!important;padding:4px 8px!important;font-size:12.5px!important;font-weight:900!important}.machine-card img{object-fit:cover!important}';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addCss);else addCss();
  setInterval(addCss,1000);
})();
