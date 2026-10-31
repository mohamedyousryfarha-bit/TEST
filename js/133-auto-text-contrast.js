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
  function toCss(c){ return 'rgb('+c.r+','+c.g+','+c.b+')'; }

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
  function setColor(el,col){
    if(el.__pmCol===col) return;
    el.__pmCol=col;
    el.style.setProperty('color',col,'important');
    el.style.setProperty('text-shadow', col==='#FFFDF8' ? '0 1px 3px rgba(0,0,0,.55)' : 'none','important');
  }

  var SKIP='#pmDock,header,#pmTopBar,.toast,.toast-stack,#pmDiagOv,#pmMaint,.side-drawer,.drawer,.sync-pill';
  function scan(root){
    var els=(root||document.body).querySelectorAll('*');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      if(el.closest && el.closest(SKIP)) continue;
      if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='svg'||el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT') continue;
      if(!hasOwnText(el)) continue;
      var bg=effectiveBg(el);
      if(bg.kind==='color'){
        setColor(el, lum(bg.c)<0.55 ? '#FFFDF8' : '#24384F');
      } else {
        (function(target){
          sample(target.url,function(tone){
            setColor(el, tone==='dark' ? '#FFFDF8' : '#24384F');
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
