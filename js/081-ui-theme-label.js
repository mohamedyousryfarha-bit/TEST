/* دمج تلقائي لملفات من نفس الميزة (بنفس الترتيب، والملفات اللي بينها ما بتشاركش عناصر أو حالة). كل جزء معزول بـ try/catch. */
/* ---- 128-contrast-guard.js ---- */
try{
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
    if(document.documentElement.getAttribute('data-theme')==='dark') return;
    if(el.closest && el.closest(SKIP)) return;
    var cs=getComputedStyle(el);
    if(cs.backgroundImage!=='none') return;
    var bg=parse(cs.backgroundColor); if(!bg||bg.a<0.5) return;
    var L=lum(bg), S=sat(bg);
    if(L<0.45 && S<0.6){
      if(!marked.has(el)) marked.set(el,{bg:el.style.getPropertyValue('background-color')});
      el.style.setProperty('background-color','rgba(0,103,184,.12)','important'); el.setAttribute('data-pm-auto-bg','1');
      var tc=parse(getComputedStyle(el).color);
      if(!tc || lum(tc)>0.45) el.style.setProperty('color','#1B1B1B','important'); el.setAttribute('data-pm-auto-color','1');
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
}catch(e){console.error('[PastryMY] 128-contrast-guard.js failed',e)}
/* ---- 133-auto-text-contrast.js ---- */
try{
/* لون النص تلقائي حسب الخلفية:
   - خلفية لونها واضح: النص يتحول لكحلي على الفاتح، ولكريمي على الغامق.
   - خلفية صورة: بنحسب متوسط إضاءة الصورة، والنص يبقى أبيض على الصورة الغامقة وكحلي على الفاتحة. */
(function(){
  if(window.__pmAutoText) return; window.__pmAutoText=true;
  var NAVY={r:36,g:56,b:79}, CREAM={r:255,g:253,b:248};
  var imgCache=new Map();   // url -> 'dark' | 'light'

  function parse(c){
    var m=c&&c.match(/rgba?\(([^)]+)\)/); if(!m) return null;
    var p=m[1].split(',').map(function(x){return parseFloat(x)});
    return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
  }
  function lum(c){ // نسبة إضاءة حسب الإدراك البشري
    return (0.299*c.r+0.587*c.g+0.114*c.b)/255;
  }
  

  // نحسب إضاءة الصورة من عينة صغيرة
  function sample(url, done){
    if(imgCache.has(url)) return done(imgCache.get(url));
    var img=new Image();
    img.onload=function(){
      try{
        var cv=document.createElement('canvas'); cv.width=24; cv.height=24;
        var cx=cv.getContext('2d'); cx.drawImage(img,0,0,24,24);
        var d=cx.getImageData(0,0,24,24).data, sum=0, n=0;
        for(var i=0;i<d.length;i+=4){ if(d[i+3]<20) continue; sum+=(0.299*d[i]+0.587*d[i+1]+0.114*d[i+2])/255; n++; }
        var tone=(n && sum/n>0.55)?'light':'dark';
        imgCache.set(url,tone); done(tone);
      }catch(e){ imgCache.set(url,'dark'); done('dark'); }
    };
    img.onerror=function(){ imgCache.set(url,'dark'); done('dark'); };
    img.src=url;
  }

  // أقرب خلفية لها لون أو صورة
  function overlaps(a,b){
    return a.left<b.right && a.right>b.left && a.top<b.bottom && a.bottom>b.top;
  }
  function effectiveBg(el){
    var cur=el, er=el.getBoundingClientRect();
    while(cur && cur.nodeType===1){
      var cs=getComputedStyle(cur);
      var m=cs.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      if(m && m[1]) return {kind:'img', url:m[1], el:cur};
      // صورة <img> تحت النص (زي صورة الصنف في المنيو)
      var imgs=cur.querySelectorAll('img');
      for(var k=0;k<imgs.length;k++){
        var im=imgs[k];
        if(!im.src || im.naturalWidth===0) continue;
        if(overlaps(er, im.getBoundingClientRect())) return {kind:'img', url:im.src, el:im};
      }
      var c=parse(cs.backgroundColor);
      if(c && c.a>0.5) return {kind:'color', c:c};
      cur=cur.parentElement;
    }
    return {kind:'color', c:{r:255,g:253,b:248,a:1}};
  }
  function hasOwnText(el){
    for(var i=0;i<el.childNodes.length;i++){
      var n=el.childNodes[i];
      if(n.nodeType===3 && n.textContent.trim()) return true;
    }
    return false;
  }
  var PLAIN_SEL='#menu,#appNav,nav.tabs,#home';
  function setColor(el,col){
    if(document.documentElement.getAttribute('data-theme')==='dark') return;
    var plain=!!(el.closest && el.closest(PLAIN_SEL));
    if(plain) col='#1B1B1B';
    if(el.__pmCol===col) return;
    el.__pmCol=col;
    el.style.setProperty('color',col,'important'); el.setAttribute('data-pm-auto-color','1');
    var inMenu=plain;
    el.style.setProperty('text-shadow', (col==='#FFFFFF' && !inMenu) ? '0 1px 3px rgba(27,27,27,.55)' : 'none','important');
  }

  var SKIP='#pmDock,header,#pmTopBar,.toast,.toast-stack,#pmDiagOv,#pmMaint,.side-drawer,.drawer,.sync-pill,.prep-board';
  function scan(root){
    if(document.documentElement.getAttribute('data-theme')==='dark') return;
    var els=(root||document.body).querySelectorAll('*');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      if(el.closest && el.closest(SKIP)) continue;
      if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='svg'||el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT') continue;
      if(!hasOwnText(el)) continue;
      var bg=effectiveBg(el);
      if(bg.kind==='color'){
        setColor(el, lum(bg.c)<0.55 ? '#FFFFFF' : '#1B1B1B');
      } else {
        (function(target){
          sample(target.url,function(tone){
            setColor(el, tone==='dark' ? '#FFFFFF' : '#1B1B1B');
          });
        })(bg);
      }
    }
  }

  var t=null;
  function later(){ clearTimeout(t); t=setTimeout(function(){ scan(document.body); },250); }
  new MutationObserver(function(recs){
    for(var i=0;i<recs.length;i++){ if(recs[i].type==='childList'){ later(); return; } }
  }).observe(document.body,{childList:true,subtree:true});
  setInterval(later,3000);
  scan(document.body);
})();
}catch(e){console.error('[PastryMY] 133-auto-text-contrast.js failed',e)}
