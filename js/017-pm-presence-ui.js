(function(){
  var chip=document.getElementById('pmPresChip'); if(!chip)return;
  var ROLE={admin:'مدير',kitchen:'المطبخ',sales:'المبيعات',barista:'الباريستا',employee:'موظف'};
  var CLS={admin:'r-admin',kitchen:'r-kitchen',sales:'r-sales',barista:'r-barista',employee:'r-employee'};
  var lastList=[], lastMe=null, tick=null;

  var btn=document.createElement('button');
  btn.type='button'; btn.id='pmPresBtn'; btn.className='pm-pres-btn';
  btn.setAttribute('aria-haspopup','true'); btn.setAttribute('aria-expanded','false'); btn.setAttribute('aria-controls','pmPresMenu');
  btn.title='عرض الأجهزة المتصلة';
  btn.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  var menu=document.createElement('div');
  menu.id='pmPresMenu'; menu.className='pm-pres-menu'; menu.setAttribute('role','menu'); menu.hidden=true;

  chip.appendChild(btn);
  chip.appendChild(menu);

  function ago(ts){
    if(!ts)return '';
    var m=Math.max(0,Math.round((Date.now()-Number(ts))/60000));
    if(m<1)return 'متصل الآن';
    if(m<60)return 'متصل منذ '+m+' د';
    var h=Math.round(m/60);
    if(h<24)return 'متصل منذ '+h+' س';
    return 'متصل منذ '+Math.round(h/24)+' يوم';
  }

  function render(){
    var rows=lastList.map(function(x){
      var m=x.m||{}, name=String(m.name||'—'), me=(x.key===lastMe);
      var role=ROLE[m.role]||'موظف';
      var meta=[role, m.device||'', ago(m.since)].filter(Boolean).join(' · ');
      return '<div class="pm-pres-row" role="menuitem">'+
        '<span class="pm-av '+(CLS[m.role]||'r-employee')+'">'+esc(name.trim().charAt(0)||'؟')+'</span>'+
        '<div class="pm-pres-info"><div class="pm-pres-name"><span class="t">'+esc(name)+'</span>'+
        (me?'<span class="pm-pres-me">هذا الجهاز</span>':'')+'</div>'+
        '<div class="pm-pres-meta">'+esc(meta)+'</div></div>'+
        '<span class="pm-pres-live" title="متصل"></span></div>';
    }).join('');
    menu.innerHTML='<div class="pm-pres-head"><span>الأجهزة المتصلة الآن</span><span class="pm-pres-count">'+lastList.length+'</span></div>'+
      (rows||'<div class="pm-pres-empty">لا توجد أجهزة متصلة الآن</div>')+
      '<div class="pm-pres-foot">يتم التحديث تلقائيًا</div>';
  }

  function setOpen(open){
    menu.hidden=!open;
    btn.setAttribute('aria-expanded',open?'true':'false');
    clearInterval(tick);
    if(open){ render(); tick=setInterval(render,30000); }
  }

  btn.addEventListener('click',function(e){ e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener('click',function(e){ if(!menu.hidden && !chip.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !menu.hidden){ setOpen(false); btn.focus(); } });

  // بيتنادى من تحديث الحضور (presence) في التطبيق
  window.pmRenderPresList=function(list,myKey){
    lastList=Array.isArray(list)?list:[];
    lastMe=myKey;
    window.pmPresData={list:lastList,me:lastMe};
    if(!menu.hidden) render();
    if(window.pmDevRender) window.pmDevRender();
  };
})();
