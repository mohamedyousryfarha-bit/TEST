/* حارس التباين: أي عنصر خلفيته داكنة (من بقايا الألوان القديمة) يتحول لخلفية فاتحة، والنص يتحول لكحلي،
   عشان ما يحصلش نص مدموج بالخلفية في أي صفحة. الألوان الواضحة (أحمر/أخضر...) بتفضل زي ما هي. */
(function(){
  var SKIP='#pmMaint,.toast,.toast-stack,#pmDock,.pm-dock,.side-drawer,.sync-pill,#pmTopBar,.login-screen,#pmBackBar';
  function parse(c){
    var m=c&&c.match(/rgba?\(([^)]+)\)/); if(!m) return null;
    var p=m[1].split(',').map(function(x){return parseFloat(x)});
    return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
  }
  function lum(c){ return (0.299*c.r+0.587*c.g+0.114*c.b)/255; }
  function sat(c){
    var r=c.r/255,g=c.g/255,b=c.b/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b);
    if(mx===mn) return 0; var l=(mx+mn)/2; return l>0.5?(mx-mn)/(2-mx-mn):(mx-mn)/(mx+mn);
  }
  var marked=new Map();
  function fix(el){
    if(el.closest && el.closest(SKIP)) return;
    var cs=getComputedStyle(el);
    if(cs.backgroundImage!=='none') return;
    var bg=parse(cs.backgroundColor); if(!bg||bg.a<0.5) return;
    var L=lum(bg), S=sat(bg);
    if(L<0.45 && S<0.6){
      if(!marked.has(el)) marked.set(el,{bg:el.style.getPropertyValue('background-color')});
      el.style.setProperty('background-color','#FBF0D9','important');
      var tc=parse(getComputedStyle(el).color);
      if(!tc || lum(tc)>0.45) el.style.setProperty('color','#24384F','important');
    }
  }
  function scan(root){
    var list=(root||document.body).querySelectorAll('*');
    for(var i=0;i<list.length;i++){
      var el=list[i];
      if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='svg'||el.tagName==='path') continue;
      fix(el);
    }
  }
  var t=null;
  function later(){ clearTimeout(t); t=setTimeout(function(){ scan(document.body); },200); }
  new MutationObserver(later).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  setInterval(later,4000);
  scan(document.body);
})();
