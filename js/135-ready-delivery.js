/* شاشة "جاهز للتسليم": بتعرض الحجوزات اللي كل أصنافها جاهزة ولسه متسلّمتش.
   التحصيل والتسليم بيتم من نفس نافذة الحفلات الموجودة (آمنة وبتتأكد من الـ PIN على السيرفر)،
   فالزرار بيفتح تبويب الحفلات ويضغط زرار التحصيل للحجز ده. */
(function(){
  if(window.__pmReadyDelivery) return; window.__pmReadyDelivery=true;

  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function fmt(n){ return Math.round(Number(n)||0).toLocaleString('en-US'); }
  function role(){ return (typeof cloudActorRole!=='undefined' && cloudActorRole) || ''; }
  function canSee(){ return role()==='admin' || role()==='sales'; }

  function activeBookings(){
    var list=(Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){
      return o && o.name && !(window.pmIsPartyOrderClosed && window.pmIsPartyOrderClosed(o));
    });
    if(!window.pmPartyBookings) return [];
    return window.pmPartyBookings(list).filter(function(b){ return !b.complete && !b.cancelled; });
  }
  function isReady(b){
    var live=b.orders.filter(function(o){ return o.status!=='cancelled' && o.status!=='delivered'; });
    return live.length>0 && live.every(function(o){ return o.status==='ready'; });
  }
  function menuPrice(name){
    var m=(state.menu||[]).find(function(x){return x&&x.name===name}); return Number(m&&m.price)||0;
  }
  function statusPill(o){
    if(o.status==='ready') return '<span class="pill">جاهز</span>';
    if(o.status==='cancelled') return '<span class="pill">ملغي</span>';
    return '<span class="pill warn">مستني التجهيز</span>';
  }

  function card(b,bi,isReadyCard){
    var live=b.orders.filter(function(o){return o.status!=='cancelled'});
    var o0=live[0]||b.first;
    var total=live.reduce(function(s,o){return s+(Number(o.price)||menuPrice(o.name))*(Number(o.qty)||0)},0);
    var items=live.map(function(o){
      return '<div class="pm-po-item"><div class="pm-po-itemhead"><b>'+esc(o.name)+' × '+fmt(o.qty)+'</b>'+statusPill(o)+'</div></div>';
    }).join('');
    var action=isReadyCard
      ? '<div class="pm-po-actions"><button type="button" class="primary" data-rd-deliver="'+bi+'">فتح التحصيل والتسليم</button></div>'
      : '';
    return '<article class="pm-po-card">'+
      '<div class="pm-po-head"><b>'+esc(o0.customer||'بدون اسم')+'</b><span class="pill'+(isReadyCard?'':' warn')+'">'+(isReadyCard?'جاهز للتسليم':'قيد التجهيز')+'</span></div>'+
      '<div class="pm-po-meta">التليفون: '+esc(o0.customerPhone||'—')+' · الموعد: '+esc(o0.date||'')+' '+esc(o0.time||'')+'</div>'+
      (o0.note?'<div class="pm-po-meta">ملاحظات: '+esc(o0.note)+'</div>':'')+
      items+
      '<div class="pm-po-meta"><b>الإجمالي: '+fmt(total)+' ج.م</b></div>'+
      action+'</article>';
  }

  function render(){
    var box=document.getElementById('readyDeliveryBody'); if(!box) return;
    var tab=document.querySelector('nav.tabs .tab[data-tab="readyDelivery"]');
    if(tab) tab.style.display=canSee()?'':'none';
    var all=activeBookings();
    var ready=all.filter(isReady);
    var inProgress=all.filter(function(b){ return !isReady(b); });
    window.__rdReady=ready;

    var html='<div class="pm-po-toolbar"><span class="pm-po-meta">جاهز للتسليم: '+ready.length+' · قيد التجهيز: '+inProgress.length+'</span></div>';
    html+='<h3 class="pm-po-h">جاهز للتسليم</h3>';
    html+= ready.length ? ready.map(function(b,i){ return card(b,i,true); }).join('')
                        : '<div class="pm-po-empty">مفيش أوردرات جاهزة للتسليم دلوقتي.</div>';
    html+='<h3 class="pm-po-h">قيد التجهيز</h3>';
    html+= inProgress.length ? inProgress.map(function(b){ return card(b,-1,false); }).join('')
                             : '<div class="pm-po-empty">مفيش حفلات قيد التجهيز.</div>';
    box.innerHTML=html;

    box.querySelectorAll('[data-rd-deliver]').forEach(function(btn){
      btn.onclick=function(){ openCollect(ready[Number(btn.getAttribute('data-rd-deliver'))]); };
    });
  }

  // أول أوردر مش ملغي في الحجز (الملغي ممكن يكون أول واحد وميبقاش موجود في بيانات التحصيل)
  function firstLiveId(book){
    var live=(book.orders||[]).filter(function(o){ return o.status!=='cancelled'; });
    return live.length ? live[0].id : (book.orders[0] && book.orders[0].id);
  }
  // يفتح نافذة التحصيل والتسليم مباشرة من الشاشة دي (من غير ما نغيّر التبويب)
  function findIndex(firstId){
    var info=(window.__pmBkInfo||[]);
    for(var i=0;i<info.length;i++){ if(info[i] && info[i].ids && info[i].ids.indexOf(firstId)>=0) return i; }
    return -1;
  }
  function openCollect(book){
    var firstId=firstLiveId(book);
    var idx=findIndex(firstId);
    var go=function(i){
      if(typeof window.pmCollectOpen==='function') window.pmCollectOpen(i);
    };
    if(idx>=0){ go(idx); return; }
    // بيانات الحفلات مش متحمّلة في الذاكرة، نحدّثها الأول
    if(typeof window.pmPartyWorkflowRefresh!=='function'){ alert('تعذر فتح الحجز. حدّث الصفحة.'); return; }
    window.pmPartyWorkflowRefresh().then(function(){
      var j=findIndex(firstId);
      if(j>=0) go(j); else alert('الحجز ده اتغيّر. حدّث الصفحة وحاول تاني.');
    }).catch(function(){ alert('تعذر تحميل البيانات. حاول تاني.'); });
  }

  // تحديث الشاشة لما بيانات الحفلات تتغير
  function wrap(name){
    var orig=window[name];
    if(typeof orig!=='function' || orig.__rdWrapped) return;
    var w=function(){ var r=orig.apply(this,arguments); if(r && r.then) return r.then(function(v){ render(); return v; }); render(); return r; };
    w.__rdWrapped=true; window[name]=w;
  }

  function init(){
    wrap('pmPartyWorkflowRefresh');
    wrap('pmPartyWorkflowRender');
    window.__goPost=window.__goPost||[];
    window.__goPost.push(function(id){
      if(id==='readyDelivery'){
        render();
        if(typeof window.pmPartyWorkflowRefresh==='function') window.pmPartyWorkflowRefresh().catch(function(){});
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else setTimeout(init,0);
})();
