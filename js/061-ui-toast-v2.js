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

  var ICON_CLR={success:'#16794B',error:'#D92D20',warn:'#1B1B1B',info:'#1B1B1B',progress:'#0067B8',undo:'#1B1B1B',nochange:'#1B1B1B'};
  function svgIco(key){ var I=(window.__PMUI__||{}).ICONS||{}; return I[key]||I.info||''; }
  var esc=function(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}) };

  // ===== قاعدة الإشعار الواحد: إشعار واحد ظاهر في الشاشة، والباقي بيستنى في طابور ويظهر بعده =====
  var QUEUE=[];

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
  // مشغول = فيه إشعار لسه في الشاشة (حتى لو بيتقفل بالأنيميشن)
  function busy(){ return stack().children.length>0; }
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
    setTimeout(function(){
      if(el.parentNode) el.parentNode.removeChild(el);
      pump();                       // بعد ما الإشعار يختفي، الإشعار اللي بعده في الطابور يظهر
    }, 420);
  }
  function bind(el){
    el.addEventListener('pointerenter',function(){ if(!el._auto||el._closing) return; clearTimeout(el._t); el._left=Math.max(600,(el._left||0)-(Date.now()-el._start)); });
    el.addEventListener('pointerleave',function(){ if(!el._auto||el._closing) return; arm(el,el._left||2000); });
  }
  function updateBadge(){
    var vis=live(stack())[0];
    if(!vis) return;
    var n=QUEUE.reduce(function(a,x){ return a+x.count },0);
    if(!vis._queueBadge){
      var b=document.createElement('span'); b.className='toast-queue';
      b.style.cssText='font-size:11px;font-weight:800;color:#fff;background:#0067B8;border-radius:99px;padding:1px 7px;margin-inline-start:6px';
      var head=vis.querySelector('.toast-head'); if(head) head.appendChild(b);
      vis._queueBadge=b;
    }
    vis._queueBadge.textContent='+'+n+' في الانتظار';
    vis._queueBadge.style.display=n?'':'none';
  }
  function render(item){
    var s=stack(); place();
    var el=document.createElement('div');
    el.className='toast '+item.k; el._key=item.key; el._born=Date.now(); el._count=1;
    el.innerHTML='<span class="toast-edge"></span>'+
      '<div class="toast-ico"><span class="ui-ring"></span><span class="ui-ico'+(item.k==='progress'?' spin':' ui-live')+'" style="--ic:'+ICON_CLR[item.k]+'">'+svgIco(KV[item.k].icon)+'</span></div>'+
      '<div class="toast-body"><div class="toast-head"><span class="toast-kind">'+esc(KV[item.k].n)+'</span>'+
      '<span class="toast-title">'+esc(item.ttl)+'</span><span class="toast-count" style="display:none"></span></div>'+
      '<div class="toast-text">'+esc(item.text)+'</div></div>'+
      '<button class="toast-x" type="button" aria-label="إغلاق">×</button><span class="toast-progress"></span>';
    el._badge=el.querySelector('.toast-count');
    el.querySelector('.toast-x').onclick=function(e){ e.stopPropagation(); close(el) };
    el._sticky=true; el._auto=item.dur>0;
    s.insertBefore(el,s.firstChild);
    var bar=el.querySelector('.toast-progress');
    if(item.dur>0){ bar.style.animation='toastBar '+item.dur+'ms linear forwards'; arm(el,item.dur); }
    else { bar.style.animation='none'; bar.style.transform='scaleX(0)'; }
    bind(el);
    // لو الكود اللي طلب الإشعار عايز يضيف زر (تراجع/فحص)، بيتضاف لحظة ما الإشعار يظهر فعلًا
    if(typeof item.onShow==='function'){ try{ item.onShow(el) }catch(e){} }
    return el;
  }
  function show(item){ var el=render(item); updateBadge(); return el; }
  function pump(){
    if(!QUEUE.length || busy()) return;
    show(QUEUE.shift());
  }

  window.toast=function(o,kind,duration,title){
    if(o==null) return null;
    if(typeof o==='string') o={x:o,k:kind,d:duration,t:title};
    var k=KV[o.k]?o.k:'info', K=KV[k];
    var text=String(o.x==null?'':o.x), ttl=String(o.t==null?'':o.t).trim()||K.n;
    var key=k+'|'+ttl+'|'+text;
    var dur=(typeof o.d==='number')?o.d:K.d;

    // نفس الرسالة اللي ظاهرة دلوقتي: بنزوّد العداد بدل ما نكرّرها
    var vis=live(stack())[0];
    if(vis && vis._key===key && Date.now()-vis._born<10000){
      vis._count=(vis._count||1)+1; vis._badge.textContent='×'+vis._count; vis._badge.style.display='';
      if(vis._auto && dur>0) arm(vis,dur);
      return vis;
    }
    // نفس الرسالة اللي في الطابور: بنزوّد عدادها
    var pend=QUEUE.filter(function(x){ return x.key===key })[0];
    if(pend){ pend.count++; updateBadge(); return {_queued:pend}; }

    var item={key:key,k:k,ttl:ttl,text:text,dur:dur,count:1,onShow:o.onShow};
    if(busy() || QUEUE.length){
      QUEUE.push(item); updateBadge();
      return {_queued:item};          // مقبض للإشعار المنتظر (مثلاً عشان نلغيه لو العملية خلصت)
    }
    return show(item);
  };

  // الإغلاق: الإشعار الظاهر بيتقفل بالزرار أو بالوقت. الإشعار المنتظر يتشال من الطابور لو اتلغى.
  window.dismiss=function(t){
    if(!t) return;
    if(t._pendingEntry){ t._pendingEntry.cancelled=true; return; }
    if(t._queued){
      var i=QUEUE.indexOf(t._queued); if(i>=0){ QUEUE.splice(i,1); updateBadge(); }
      return;
    }
    if(t.classList && t.classList.contains('progress')) close(t);
  };
  // الإشعارات اللي اتطلبت قبل ما هذا الملف يتحمّل: بتتعرض بعد اكتمال تحميل الصفحة، واحد ورا واحد
  function replayPending(){
    var p=window.__pmToastPending||[]; window.__pmToastPending=null;
    p.forEach(function(e){ if(!e.cancelled) window.toast.apply(null,e.args); });
  }
  if(document.readyState==='complete') replayPending();
  else window.addEventListener('load',replayPending);
})();
