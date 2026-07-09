/* OP sequence view v534 */
(function(){
  if(window.__HX_OPFIX_534__)return;window.__HX_OPFIX_534__=true;
  function el(id){return document.getElementById(id)}
  function html(s){return String(s||'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
  function render(){
    var input=el('processRange'); if(!input)return;
    var box=el('hxOpFix534');
    if(!box){box=document.createElement('div');box.id='hxOpFix534';box.style.cssText='margin-top:8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px';input.parentNode.appendChild(box)}
    var list=String(input.value||'').replace(/，/g,',').replace(/、/g,',').split(',').map(function(x){return x.trim()}).filter(Boolean);
    if(!list.length){box.innerHTML='';return}
    box.innerHTML=list.map(function(x,i){return '<div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:14px;padding:8px"><b style="color:#1967d2">OP'+(i+1)+'</b><div style="font-weight:900">'+html(x)+'</div></div>'}).join('');
  }
  document.addEventListener('change',function(e){if(e.target&&e.target.id==='workstationSelect')setTimeout(render,80)},true);
  window.addEventListener('load',function(){setTimeout(render,900)});
})();
