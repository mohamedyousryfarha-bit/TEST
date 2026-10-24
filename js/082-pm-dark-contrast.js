/* الوضع الليلي: أي خلفية فاتحة (أبيض/كريمي) تتحول لبني داكن، وأي نص فاتح أو داكن جدًا فوقها يتحول لكريمي، عشان كل النوافذ والكروت والأزرار تبان بوضوح */
(function(){
  var BG_DARK='#241812', TEXT_LIGHT='#F6EEE9';
  var marked=[]; var saved=new Map();
  function parse(c){ var m=c&&c.match(/rgba?\(([^)]+)\)/); if(!m) return null; var p=m[1].split(',').map(function(x){return parseFloat(x)}); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }
  function L(c){ return (0.299*c.r+0.587*c.g+0.114*c.b)/255; }
  function isDark(){ return document.documentElement.getAttribute('data-theme')==='dark'; }
  function remember(el){
    if(!saved.has(el)){
      saved.set(el,{bg:el.style.getPropertyValue('background-color'),bgP:el.style.getPropertyPriority('background-color'),
                    co:el.style.getPropertyValue('color'),coP:el.style.getPropertyPriority('color')});
      marked.push(el);
    }
  }
  function restoreAll(){
    marked.forEach(function(el){
      var o=saved.get(el); if(!o) return;
      if(o.bg) el.style.setProperty('background-color',o.bg,o.bgP); else el.style.removeProperty('background-color');
      if(o.co) el.style.setProperty('color',o.co,o.coP); else el.style.removeProperty('color');
    });
    marked=[]; saved=new Map();
  }
  function scan(){
    if(!isDark()){ if(marked.length) restoreAll(); return; }
    var els=document.body.querySelectorAll('*');
    for(var i=0;i<els.length;i++){
      var el=els[i], tag=el.tagName;
      if(tag==='SCRIPT'||tag==='STYLE'||tag==='SVG'||tag==='PATH'||tag==='IMG') continue;
      var cs=getComputedStyle(el);
      var bg=parse(cs.backgroundColor), col=parse(cs.color);
      if(!bg||bg.a<0.5||!col) continue;
      var lb=L(bg), lc=L(col);
      if(lb>0.85){
        remember(el);
        el.style.setProperty('background-color',BG_DARK,'important');
        if(lc<0.3) el.style.setProperty('color',TEXT_LIGHT,'important');
      }else if(lb<0.12 && lc<0.3){
        var direct=false;
        for(var k=0;k<el.childNodes.length;k++){ if(el.childNodes[k].nodeType===3&&el.childNodes[k].nodeValue.trim()){direct=true;break;} }
        if(direct){ remember(el); el.style.setProperty('color',TEXT_LIGHT,'important'); }
      }
    }
  }
  var t=null;
  function later(){ clearTimeout(t); t=setTimeout(scan,250); }
  new MutationObserver(later).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  new MutationObserver(later).observe(document.body,{childList:true,subtree:true});
  setInterval(scan,3000);
  scan();
})();
