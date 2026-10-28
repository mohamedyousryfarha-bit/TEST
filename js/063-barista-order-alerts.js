/* تنبيهات الطلبات: عداد وصوت للباريستا + إشعارات بين الأقسام (المبيعات ↔ الباريستا والمطبخ) */
(function(){
  if(window.__pmOrderAlerts) return; window.__pmOrderAlerts=true;


  function role(){ return (typeof cloudActorRole!=='undefined')?cloudActorRole:''; }
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); }

  /* ---------- 2) الباريستا ---------- */
  var lastCount=-1, busy=false;

  function pendingCount(){
    var a=Array.isArray(state.drinkOrders)?state.drinkOrders:[];
    return a.filter(function(o){ return o && String(o.status||'pending')==='pending'; }).length;
  }
  function onQueueScreen(){
    var p=document.getElementById('drinkQueue');
    return !!(p&&p.classList.contains('active'));
  }
  function ensureBadge(){
    var t=document.querySelector('.tab[data-tab="drinkQueue"]'); if(!t) return null;
    var b=t.querySelector('.pm-dq-badge');
    if(!b){
      b=document.createElement('span'); b.className='pm-dq-badge';
      b.style.cssText='display:none;align-items:center;justify-content:center;margin-inline-start:6px;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#D92D20;color:#fff;font-size:11px;font-weight:700;box-sizing:border-box';
      t.appendChild(b);
    }
    return b;
  }
  function ensureBanner(){
    var el=document.getElementById('pmDqBanner');
    if(!el){
      el=document.createElement('div'); el.id='pmDqBanner';
      el.style.cssText='display:none;position:fixed;top:10px;left:12px;right:12px;max-width:520px;margin:0 auto;z-index:9500;background:#3E2415;color:#fff;border-radius:14px;padding:12px 14px;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px #0005;cursor:pointer';
      el.addEventListener('click',function(){ if(typeof window.go==='function') window.go('drinkQueue'); });
      document.body.appendChild(el);
    }
    return el;
  }
  function beep(){ if(window.pmChime){ window.pmChime(); return; }
    try{
      var C=window.AudioContext||window.webkitAudioContext; if(!C) return;
      var c=new C(), o=c.createOscillator(), g=c.createGain();
      o.frequency.value=880; g.gain.value=0.25;
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.35);
    }catch(e){}
    try{ if(navigator.vibrate) navigator.vibrate([200,100,200]); }catch(e){}
  }
  function paint(){
    var isBarista=role()==='barista'&&!!cloudReady;
    var n=isBarista?pendingCount():0;
    var b=ensureBadge(), el=ensureBanner();
    if(b){ b.textContent=n>9?'9+':String(n); b.style.display=n?'inline-flex':'none'; }
    el.textContent='☕ عندك '+n+' طلب مشروبات في قائمة الانتظار، اضغط للعرض';
    el.style.display=(n&&!onQueueScreen())?'block':'none';
    if(isBarista && lastCount>=0 && n>lastCount){ beep(); if(window.pmNotify) window.pmNotify('طلب مشروبات جديد','عندك '+n+' طلب في قائمة الانتظار','drinks'); }
    lastCount=isBarista?n:-1;
  }
  function tick(){
    if(busy) return;
    if(role()!=='barista'||!cloudReady){ paint(); return; }
    busy=true;
    var p=(typeof window.pmDrinkRefresh==='function')?window.pmDrinkRefresh():null;
    Promise.resolve(p).catch(function(){}).then(function(){ busy=false; paint(); });
  }

  /* ---------- الإشعارات بين الأقسام ----------
     المبيعات تسجّل أوردر ← إشعار للقسم المختص (باريستا أو مطبخ)
     القسم يجهّز ← إشعار "جاهز" للمبيعات */
  var NOTIF_TABLE='pm_notifications';
  var notifCache=[];
  function notifSeenKey(){ return 'pm_notif_seen_'+role(); }
  function sendNotice(target,title,text){
    try{
      if(!cloudClient||!cloudReady) return;
      cloudClient.from(NOTIF_TABLE).insert({target:target,title:title,body:text||'',from_employee:cloudActorName||'',from_role:role()}).then(function(){},function(){});
    }catch(e){}
  }
  window.__pmSendNotice=function(targets,title,text){
    (Array.isArray(targets)?targets:[targets]).forEach(function(t){ sendNotice(t,title,text); });
  };
  function partyStations(name){
    var m=(state.menu||[]).find(function(x){return x&&x.name===name});
    var parts=(m&&Array.isArray(m.parts)&&m.parts.length)?m.parts:[{name:name}];
    var set={};
    parts.forEach(function(p){ var nm=(p&&p.name)||''; var bar=(typeof isDrinkName==='function')&&isDrinkName(nm); set[bar?'bar':'kitchen']=true; });
    return Object.keys(set);
  }
  var _apiN=window.apiCall;
  if(typeof _apiN==='function'){
    window.apiCall=function(body){
      var p=_apiN.apply(this,arguments);
      try{
        var a=body&&body.action;
        var onOk=function(fn){ Promise.resolve(p).then(function(r){ if(r&&!r.error) fn(); },function(){}); };
        if(a==='drink_order_action'&&body.drink_action==='create'&&body.order){
          var o=body.order;
          onOk(function(){ sendNotice('barista','طلب مشروبات جديد',(o.name||'صنف')+' × '+Number(o.qty||0)+(o.note?'\nملاحظة: '+o.note:'')); });
        }else if(a==='party_order_action'&&body.party_action==='create'&&body.order){
          var po=body.order;
          var __stn=partyStations(po.name);
          onOk(function(){ var __t='أوردر جديد للحفلة'; var __b=(po.name||'صنف')+' × '+Number(po.qty||0)+(po.customer?'\nالعميل: '+po.customer:''); if(__stn.indexOf('bar')>=0) sendNotice('barista',__t,__b); if(__stn.indexOf('kitchen')>=0) sendNotice('kitchen',__t,__b); });
        }else if(a==='party_order_action'&&body.party_action==='produce'){
          var pf=(Array.isArray(state.partyOrders)?state.partyOrders:[]).find(function(x){return x&&x.id===body.order_id});
          var stn=body.station==='bar'?'المشروبات':'الحلويات';
          var plbl=pf?((pf.name||'صنف')+' × '+Number(pf.qty||0)+(pf.customer?' · '+pf.customer:'')):'أوردر حفلة';
          onOk(function(){ sendNotice('sales','تم تجهيز '+stn+' للحفلة',plbl); });
        }else if(a==='drink_order_action'&&body.drink_action==='prepare'){
          var f=(Array.isArray(state.drinkOrders)?state.drinkOrders:[]).find(function(x){return x&&x.id===body.order_id});
          var label=f?(f.name+' × '+Number(f.qty||0)):'طلب مشروبات';
          var __openInv=false;
          try{ __openInv=(Array.isArray(state.salesLog)?state.salesLog:[]).some(function(x){ return x && x.invoiceStatus==='open' && f && x.name===f.name; }); }catch(e){}
          onOk(function(){
            sendNotice('sales','المشروبات جاهزة',label);
            if(__openInv) sendNotice('sales','فاتورة مفتوحة جاهزة للتقفيل',label+'\nاقفل الفاتورة واعتبرها مدفوعة');
          });
        }else if(a==='checkout_cart'&&Array.isArray(body.cart)&&body.cart.length){
          /* المشروبات حسب الطلب بتتسجل من البيع (checkout_cart) فمكانش ليها إشعار للباريستا */
          var odLines=body.cart.filter(function(l){
            try{ var m=(state.menu||[]).find(function(x){return x&&x.name===l.name&&x.active!==false}); return !!m&&m.kind==='drink'&&m.onDemand===true; }catch(e){ return false; }
          });
          if(odLines.length){
            onOk(function(){ sendNotice('barista','طلب مشروبات حسب الطلب',odLines.map(function(l){return '- '+l.name+' × '+Number(Number(l.qty||0).toFixed(2))}).join('\n')); });
          }
        }else if(a==='confirm_production'&&Array.isArray(body.orders)&&body.orders.length){
          var rd=body.ready||{};
          var isOnDemand=function(name){
            try{ var m=(state.menu||[]).find(function(x){return x&&x.name===name&&x.active!==false}); return !!m&&(m.kind==='party'||(m.kind==='drink'&&m.onDemand===true)); }catch(e){ return false; }
          };
          var demandLines=[], regularLines=[];
          body.orders.forEach(function(x){
            var nm=x.name||'صنف', c=(rd[x.name]!=null)?Number(rd[x.name]):null;
            if(isOnDemand(x.name)){
              demandLines.push('- '+nm+' × '+Number(Number(x.qty||0).toFixed(2)));
            }else{
              regularLines.push('- '+nm+' × '+Number(Number(x.qty||0).toFixed(2)));
            }
          });
          onOk(function(){
            if(demandLines.length) sendNotice('sales','الأوردر جاهز',demandLines.join('\n'));
            if(regularLines.length) sendNotice('sales','بدأ تحضير الإنتاج',regularLines.join('\n')+'\nخُصمت الخامات، والتسليم بيتم بعد اكتمال التحضير');
          });
        }
      }catch(e){}
      return p;
    };
  }
  function notifTime(n){ return Date.parse(n.created_at)||0; }
  function fetchNotices(){
    if(!cloudClient||!cloudReady) return Promise.resolve(null);
    var r=role();
    var q=cloudClient.from(NOTIF_TABLE).select('*').order('created_at',{ascending:false}).limit(40);
    if(r!=='admin') q=q.in('target',[r]);
    return Promise.resolve(q).then(function(res){ return (res&&!res.error)?(res.data||[]):null; },function(){ return null; });
  }
  function renderNotices(){
    window.__pmCloud=notifCache.slice(0,30);
    if(window.__pmRenderBell) window.__pmRenderBell();
  }
  function pollNotices(){
    var r=role();
    if(!cloudReady||['sales','barista','kitchen','admin'].indexOf(r)<0) return;
    fetchNotices().then(function(list){
      if(!list) return;
      notifCache=list;
      var newest=list.reduce(function(m,n){ return Math.max(m,notifTime(n)) },0);
      var key=notifSeenKey(), stored=localStorage.getItem(key);
      if(stored===null){ localStorage.setItem(key,String(newest)); renderNotices(); return; }
      var seen=Number(stored)||0;
      var fresh=list.filter(function(n){ return notifTime(n)>seen }).sort(function(x,y){ return notifTime(x)-notifTime(y) });
      if(fresh.length){
        fresh.forEach(function(n){
          window.__pmSkipHist=true; try{ toast({k:r==='sales'?'success':'info',t:'إشعار · '+n.title,x:n.body||n.title}) }catch(e){} window.__pmSkipHist=false; try{ if(window.__pmBellAdd) window.__pmBellAdd(); }catch(e){}
        });
        localStorage.setItem(key,String(Math.max(newest,seen)));
        beep();
        if(window.pmNotify){ var last=fresh[fresh.length-1]; window.pmNotify(fresh.length>1?'RMY · '+fresh.length+' إشعارات جديدة':'RMY · '+(last.title||'إشعار جديد'), fresh.length>1?'':(last.body||''), 'rmy-notice'); }
      }
      renderNotices();
    });
  }
  document.addEventListener('click',function(e){
    if(e.target&&e.target.closest&&e.target.closest('#pmBell')) setTimeout(renderNotices,60);
  },true);
  setInterval(pollNotices,6000);
  setTimeout(pollNotices,2000);

  setInterval(paint,1000);
  setInterval(tick,8000);
  setTimeout(tick,1500);
})();
