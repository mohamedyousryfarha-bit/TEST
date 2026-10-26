(function(){
  if(window.__pmDockV3) return; window.__pmDockV3=true;
  var SV={menu:'list',customers:'customers',purchases:'cart'};
  function svgOf(k){ var I=(window.__PMUI__||{}).ICONS||{}; return I[k]||I.list||''; }
  function dock(){ return document.getElementById('pmDock'); }
  function setLabel(btn,text){
    var s=btn.querySelector('svg');
    btn.innerHTML=(s?s.outerHTML:'')+'<span class="pmd-txt">'+text+'</span>';
  }
  function ensure(act,label,svgInner){
    var d=dock(); if(!d) return null;
    var b=d.querySelector('[data-act="'+act+'"]');
    if(!b){ b=document.createElement('button'); b.type='button'; b.setAttribute('data-act',act); b.innerHTML=svgOf(svgInner)+'<span class="pmd-txt">'+label+'</span>'; }
    return b;
  }
  function mkGroup(id){
    var g=document.getElementById(id);
    if(!g){ g=document.createElement('div'); g.id=id; g.className='pm-dk-grp'; }
    return g;
  }
  function visibleEl(el){
    if(!el) return false;
    /* الغلاف ممكن يكون display:contents، فبنحكم على الزرار اللي جواه ومساحته الفعلية */
    if(el.id==='pmMsgWrap'||el.id==='pmGearWrap'){ var b=el.querySelector('button'); return !!b && getComputedStyle(b).display!=='none' && b.getBoundingClientRect().width>0; }
    return getComputedStyle(el).display!=='none' && el.getBoundingClientRect().width>0;
  }
  function sameList(parent,list){
    if(parent.children.length!==list.length) return false;
    for(var i=0;i<list.length;i++){ if(parent.children[i]!==list[i]) return false; }
    return true;
  }
  function layoutDock(){
    var d=dock(), R=window.__pmDockRefs;
    if(!d||!R||!R.home) return;
    var home=R.home;
    // المراجع بتتحدّث كل مرة: الرسايل والإعدادات وأي زرار ممكن يتعمل بعد التحميل
    var dev=d.querySelector('[data-act="devices"]')||R.dev;
    var msg=document.getElementById('pmMsgWrap')||R.msg;
    var gear=document.getElementById('pmGearWrap')||R.gear;
    var pur=d.querySelector('[data-act="purchases"]')||R.pur;
    var cust=d.querySelector('[data-act="customers"]')||R.cust;
    var menu=d.querySelector('[data-act="menu"]')||R.menu;
    var notifW=document.getElementById('pmNotifWrap');
    var seq=[d.querySelector('[data-act="devView"]'),dev,msg,notifW,gear,pur,cust,menu].filter(Boolean);
    var vis=seq.filter(visibleEl), hid=seq.filter(function(x){ return !visibleEl(x); });
    var half=Math.ceil(vis.length/2);
    /* عدد الخانات في كل نص من الشريط: كل الأزرار بنفس العرض والرئيسية في النص */
    d.style.setProperty('--pm-n', String(Math.max(2, half)));
    var A=mkGroup('pmDockA'), B=mkGroup('pmDockB');
    var wantA=vis.slice(0,half).concat(hid), wantB=vis.slice(half);
    if(!sameList(A,wantA)) wantA.forEach(function(x){ A.appendChild(x); });
    if(!sameList(B,wantB)) wantB.forEach(function(x){ B.appendChild(x); });
    if(A.parentNode!==d) d.insertBefore(A,d.firstChild);
    if(home.parentNode!==d) d.insertBefore(home,A.nextSibling);
    if(home.previousElementSibling!==A) d.insertBefore(A,home);
    if(B.parentNode!==d || home.nextElementSibling!==B) d.insertBefore(B,home.nextSibling);
  }
  function build(){
    var d=dock(); if(!d) return false;
    var menu=ensure('menu','المنيو',SV.menu), cust=ensure('customers','العملاء',SV.customers), pur=ensure('purchases','المشتريات',SV.purchases);
    var home=d.querySelector('[data-act="home"]'), dev=d.querySelector('[data-act="devices"]');
    var msg=document.getElementById('pmMsgWrap'), gear=document.getElementById('pmGearWrap');
    if(!home||!dev) return false;
    home.classList.add('pm-center'); setLabel(home,'الرئيسية');
    setLabel(dev,'الحسابات المتصلة');
    if(msg){ var ml=msg.querySelector('.pmd-lbl'); if(ml) ml.textContent='الرسائل'; }
    if(gear){ var gl=gear.querySelector('.pmd-lbl'); if(gl) gl.textContent='الإعدادات'; }
    /* ترتيب DOM من اليمين لليسار: الحسابات، الرسائل، الإعدادات | الرئيسية | المشتريات، العملاء، المنيو */
    window.__pmDockRefs={dev:dev,msg:msg,gear:gear,home:home,pur:pur,cust:cust,menu:menu};
    layoutDock();
    return true;
  }
  // ادخل الأماكن الجديدة للزراير: الشريط لازم يفضل بنفس الترتيب حتى لو سكربتات تانية حركته
  var busy=false;
  function arrange(){ if(busy) return; busy=true; try{ build() }catch(e){} busy=false; }
  setInterval(function(){ try{ layoutDock() }catch(e){} },800);
  var mo=null;
  function watch(){
    var d=dock(); if(!d||mo) return;
    mo=new MutationObserver(function(){ arrange() });
    mo.observe(d,{childList:true});
  }
  // الضغط: المنيو/العملاء/المشتريات/الرئيسية نتعامل معاها هنا، والباقي بيكمل بالكود القديم
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('#pmDock [data-act]'):null; if(!b) return;
    var act=b.getAttribute('data-act');
    var nav=null;
    /* الرئيسية بتتعالج في زرار الرئيسية/الصعود نفسه، مش هنا */
    if(act==='menu'||act==='customers'||act==='purchases') nav=act;
    if(!nav) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if(nav==='home'){
      if(document.body.classList.contains('pm-view')){ var back=document.getElementById('pmBack'); if(back) back.click(); else if(window.go) window.go('home'); }
      else if(window.go) window.go('home');
      return;
    }
    if(window.pmGo) window.pmGo(nav); else if(window.go) window.go(nav);
  },true);
  // تحديد القسم الحالي في الشريط
  var MAP={analytics:'home',menu:'menu',customers:'customers',purchases:'purchases',devices:'devices'};
  setInterval(function(){
    var d=dock(); if(!d) return;
    var act=null, p=document.querySelector('main .panel.active');
    if(p && MAP[p.id]) act=MAP[p.id];
    d.querySelectorAll('button[data-act]').forEach(function(b){
      b.classList.toggle('cur', !!act && b.getAttribute('data-act')===act && !b.classList.contains('pm-center'));
    });
  },400);
  function start(){ arrange(); watch(); }
  if(document.readyState==='complete') start(); else window.addEventListener('load',start);
  setTimeout(arrange,600); setTimeout(arrange,1500);
})();
