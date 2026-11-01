(function(){
  if(window.__pmTopBar)return; window.__pmTopBar=true;
  var bar=document.createElement('div'); bar.id='pmTopBar'; bar.setAttribute('role','status'); bar.setAttribute('aria-live','polite'); bar.innerHTML='<span class="pmw11-ring"></span><span>جاري المزامنة</span>';
  document.body.appendChild(bar);
  var pending=0, hideT=null;

  function place(){
    var h=document.querySelector('header');
    var top=0;
    if(h) top=Math.max(0,h.getBoundingClientRect().bottom);
    bar.style.top=(top+12)+'px';
  }
  function show(){ clearTimeout(hideT); place(); bar.classList.add('on'); }
  function hideIfIdle(){ if(pending<=0){ pending=0; bar.classList.remove('on'); } }
  function done(){ pending=Math.max(0,pending-1); if(pending===0){ clearTimeout(hideT); hideT=setTimeout(hideIfIdle,220); } }

  /* أي طلب للسحابة (حفظ، مزامنة، تحميل، تسجيل دخول) بيظهر الشريط لحد ما يخلص */
  var orig=window.apiCall;
  if(typeof orig==='function'){
    window.apiCall=function(){
      pending++; show();
      var p;
      try{ p=orig.apply(this,arguments) }catch(e){ done(); throw e }
      return Promise.resolve(p).then(function(v){
        done();
        var er=v&&v.error, ctx=er&&er.context;
        if(ctx&&typeof ctx.json==='function'){
          return ctx.json().then(function(body){
            if(body&&(body.message||body.error)) er.message=body.message||body.error;
            return v;
          },function(){ return v });
        }
        return v;
      },function(err){ done(); throw err });
    };
  }

  window.addEventListener('scroll',function(){ if(bar.classList.contains('on'))place() },{passive:true});
  window.addEventListener('resize',function(){ if(bar.classList.contains('on'))place() });
})();
