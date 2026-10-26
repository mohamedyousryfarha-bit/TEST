(function(){
  if(window.__pmToastV2) return; window.__pmToastV2=true;
  var KV={
    success:{n:'نجاح',d:4200,icon:'check'},
    error:{n:'خطأ',d:8000,icon:'error'},
    warn:{n:'تنبيه',d:6500,icon:'alertTri'},
    info:{n:'معلومة',d:4500,icon:'info'},
    progress:{n:'جارٍ التنفيذ',d:0,icon:'sync'},
    undo:{n:'قابل للتراجع',d:11000,icon:'restore'},
    nochange:{n:'لم يحدث تغيير',d:5400,icon:'info'}
  };

  var ICON_CLR={success:'#0E8F5B',error:'#D92D20',warn:'#D97706',info:'#D96B2B',progress:'#7C3AED',undo:'#D58556',nochange:'#877368'};
  function svgIco(key){ var I=(window.__PMUI__||{}).ICONS||{}; return I[key]||I.info||''; }
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}) };
  function stack(){
    var s=document.getElementById('toastStack');
    if(!s){ s=document.createElement('div'); s.id='toastStack'; s.className='toast-stack'; s.setAttribute('role','status'); s.setAttribute('aria-live','polite'); document.body.appendChild(s); }
    return s;
  }
  function place(){
    var h=document.querySelector('header'), b=h?h.getBoundingClientRect().bottom:0;
    var top=Math.max(10, Math.round(b+10));
    stack().style.setProperty('--toast-top', top+'px');
  }
  function live(s){ return [].slice.call(s.children).filter(function(el){ return !el._closing }); }
  function arm(el,ms){
    clearTimeout(el._t); el._left=ms; el._start=Date.now();
    el._t=setTimeout(function(){ close(el) }, ms);
  }
  function close(el){
    if(!el||el._closing||!el.parentNode) return;
    el._closing=true; clearTimeout(el._t);
    var s=el.parentNode, h=el.offsetHeight;
    el.style.height=h+'px'; el.style.overflow='hidden'; el.style.boxSizing='border-box';
    void el.offsetHeight;
    el.style.transition='transform .36s cubic-bezier(.4,0,.2,1), opacity .24s ease, height .36s cubic-bezier(.4,0,.2,1) .05s, padding .36s ease, margin .36s ease, border-width .36s ease';
    el.style.transform='translateY(-'+(h+(parseFloat(s.style.getPropertyValue('--toast-top'))||96)+40)+'px) scale(.96)';
    el.style.opacity='0';
    el.style.height='0px'; el.style.paddingTop='0px'; el.style.paddingBottom='0px'; el.style.marginTop='-10px'; el.style.borderWidth='0px';
    setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el) }, 420);
  }
  function snapshot(s){ var m=new Map(); [].forEach.call(s.children,function(c){ m.set(c,c.getBoundingClientRect().top) }); return m; }
  function flip(s,before){
    [].forEach.call(s.children,function(c){
      var old=before.get(c); if(old==null) return;
      var dy=old-c.getBoundingClientRect().top; if(!dy) return;
      c.style.transition='none'; c.style.transform='translateY('+dy+'px)';
      void c.offsetHeight;
      c.style.transition='transform .42s cubic-bezier(.2,.8,.2,1)'; c.style.transform='';
    });
  }
  function bind(el){
    el.addEventListener('pointerenter',function(){ if(!el._auto||el._closing) return; clearTimeout(el._t); el._left=Math.max(600,(el._left||0)-(Date.now()-el._start)); });
    el.addEventListener('pointerleave',function(){ if(!el._auto||el._closing) return; arm(el,el._left||2000); });
  }
  window.toast=function(o,kind,duration,title){
    if(o==null) return null;
    if(typeof o==='string') o={x:o,k:kind,d:duration,t:title};
    var k=KV[o.k]?o.k:'info', K=KV[k];

    var text=String(o.x==null?'':o.x), ttl=String(o.t==null?'':o.t).trim()||K.n;
    var s=stack(); place();
    var key=k+'|'+ttl+'|'+text;
    // نفس الرسالة اللي لسه ظاهرة: بنزوّد العداد بدل ما نكرّرها أو نخفيها
    var same=live(s).filter(function(el){ return el._key===key })[0];
    if(same && Date.now()-same._born<10000){
      same._count=(same._count||1)+1; same._badge.textContent='×'+same._count; same._badge.style.display='';
      var ms2=(typeof o.d==='number')?o.d:K.d;
      if(same._auto && ms2>0) arm(same,ms2);
      return same;
    }
    var el=document.createElement('div');
    el.className='toast '+k; el._key=key; el._born=Date.now(); el._count=1;
    el.innerHTML='<span class="toast-edge"></span>'+
      '<div class="toast-ico"><span class="ui-ring"></span><span class="ui-ico'+(k==='progress'?' spin':' ui-live')+'" style="--ic:'+ICON_CLR[k]+'">'+svgIco(K.icon)+'</span></div>'+
      '<div class="toast-body"><div class="toast-head"><span class="toast-kind">'+esc(K.n)+'</span>'+
      '<span class="toast-title">'+esc(ttl)+'</span><span class="toast-count" style="display:none"></span></div>'+
      '<div class="toast-text">'+esc(text)+'</div></div>'+
      '<button class="toast-x" type="button" aria-label="إغلاق">×</button><span class="toast-progress"></span>';
    el._badge=el.querySelector('.toast-count');
    el.querySelector('.toast-x').onclick=function(e){ e.stopPropagation(); close(el) };
    var dur=(typeof o.d==='number')?o.d:K.d;
    el._sticky=true; el._auto=dur>0;   /* _sticky يحمي الإشعار من الإغلاق بالضغط في أي مكان */
    var before=snapshot(s);
    s.insertBefore(el,s.firstChild);
    flip(s,before);
    var bar=el.querySelector('.toast-progress');
    if(dur>0){ bar.style.animation='toastBar '+dur+'ms linear forwards'; arm(el,dur); }
    else { bar.style.animation='none'; bar.style.transform='scaleX(0)'; }
    bind(el);
    return el;
  };
  // الإغلاق من الخارج (اللمس في أي مكان) كان بيقفل كل الإشعارات؛ دلوقتي الإشعار بيقفل بالزرار أو بالوقت بس.
  // الاستثناء: إشعار "تقدّم العملية" بيتقفل برمجياً لما العملية تخلص.
  window.dismiss=function(t){ if(t&&t.classList&&t.classList.contains('progress')) close(t); };
})();
