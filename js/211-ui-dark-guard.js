/* حارس الوضع الداكن: يحوّل أي سطح فاتح لداكن، ويرفع تباين النص لو ضعيف.
   يشتغل بس في الوضع الداكن، ويرجّع الألوان الأصلية عند الرجوع للنهاري. */
(function(){
  var root=document.documentElement;
  var DARK_BG='#303030';
  var SKIP='img,svg,video,canvas,input,textarea,select,.pm-dock,#pmDock,.toast,.toast-stack,.side-drawer,#drawerBtn,#themeToggle,.pmw11-ring';

  function isDark(){ return root.getAttribute('data-theme')==='dark'; }
  function parse(c){
    var m=c&&c.match(/rgba?\(([^)]+)\)/); if(!m) return null;
    var p=m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
    return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};
  }
  function lin(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }
  function lum(c){ return 0.2126*lin(c.r)+0.7152*lin(c.g)+0.0722*lin(c.b); }
  function contrast(a,b){
    var l1=lum(a),l2=lum(b),hi=Math.max(l1,l2),lo=Math.min(l1,l2);
    return (hi+0.05)/(lo+0.05);
  }
  function toHex(c){
    function h(v){ v=Math.max(0,Math.min(255,Math.round(v))); return (v<16?'0':'')+v.toString(16); }
    return '#'+h(c.r)+h(c.g)+h(c.b);
  }
  function lighten(c,t){ return {r:c.r+(255-c.r)*t,g:c.g+(255-c.g)*t,b:c.b+(255-c.b)*t,a:1}; }

  function skip(el){ return el.matches(SKIP) || !!el.closest('#pmDock,.pm-dock,#themeToggle,.side-drawer'); }

  function effBg(el){
    var e=el;
    while(e && e!==root){
      var c=parse(getComputedStyle(e).backgroundColor);
      if(c && c.a>0.5) return c;
      e=e.parentElement;
    }
    return {r:38,g:38,b:38,a:1};
  }

  function remember(el,prop,attr){
    if(!el.hasAttribute(attr)) el.setAttribute(attr, el.style.getPropertyValue(prop)||'');
  }
  function setDark(el,prop,val,attr){
    remember(el,prop,attr);
    el.style.setProperty(prop,val,'important');
    el.setAttribute('data-pm-dark','1');
  }

  function fixEl(el){
    if(skip(el)) return;
    var cs=getComputedStyle(el);
    var bg=parse(cs.backgroundColor);
    if(bg && bg.a>0.5 && cs.backgroundImage==='none' && lum(bg)>0.35){
      setDark(el,'background-color',DARK_BG,'data-pm-prev-bg');
    }
    var hasText=false;
    for(var i=0;i<el.childNodes.length;i++){
      var n=el.childNodes[i];
      if(n.nodeType===3 && n.textContent.trim()){ hasText=true; break; }
    }
    if(!hasText) return;
    var tc=parse(getComputedStyle(el).color);
    if(!tc) return;
    var base=effBg(el);
    if(contrast(tc,base)>=4.5) return;
    /* نفس لون النص لكن أفتح لحد ما يبقى واضح */
    var t=0.2, out=tc;
    while(t<=1 && contrast(out,base)<4.5){ out=lighten(tc,t); t+=0.1; }
    setDark(el,'color',toHex(out),'data-pm-prev-color');
  }

  function run(){
    if(!isDark()) return;
    var els=document.body.querySelectorAll('*');
    for(var i=0;i<els.length;i++){
      try{ fixEl(els[i]); }catch(e){}
    }
  }

  function reset(){
    var els=document.querySelectorAll('[data-pm-dark]');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      var pb=el.getAttribute('data-pm-prev-bg');
      var pc=el.getAttribute('data-pm-prev-color');
      if(pb!==null){ if(pb) el.style.setProperty('background-color',pb); else el.style.removeProperty('background-color'); el.removeAttribute('data-pm-prev-bg'); }
      if(pc!==null){ if(pc) el.style.setProperty('color',pc); else el.style.removeProperty('color'); el.removeAttribute('data-pm-prev-color'); }
      el.removeAttribute('data-pm-dark');
    }
  }

  window.pmDarkGuard={run:run, reset:reset};

  var timer=null;
  function later(){ clearTimeout(timer); timer=setTimeout(run,250); }
  function start(){
    run();
    new MutationObserver(function(){ if(isDark()) later(); })
      .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    setInterval(function(){ if(isDark()) run(); },3000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
