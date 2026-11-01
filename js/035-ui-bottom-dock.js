/* دمج تلقائي لملفات من نفس الميزة (بنفس الترتيب، والملفات اللي بينها ما بتشاركش عناصر أو حالة). كل جزء معزول بـ try/catch. */
/* ---- 035-ui-bottom-dock.js ---- */
try{
(function(){
  var dock=document.getElementById('pmDock'), sheet=document.getElementById('pmDevSheet');
  if(!dock||!sheet)return;
  var timer=null;
  function $(id){return document.getElementById(id)}
  function setOn(act){
    dock.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-act')===act) });
  }
  var ROLE={admin:'مدير',kitchen:'المطبخ',sales:'المبيعات',barista:'الباريستا',employee:'موظف'};
  var CLS={admin:'r-admin',kitchen:'r-kitchen',sales:'r-sales',barista:'r-barista',employee:'r-employee'};
  function esc(t){ var d=document.createElement('div'); d.textContent=String(t==null?'':t); return d.innerHTML }
  function agoTxt(ts){
    if(!ts) return '';
    var m=Math.max(0,Math.round((Date.now()-Number(ts))/60000));
    var clock=new Date(Number(ts)).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    var rel = m<1 ? 'متصل الآن' : 'متصل منذ '+(m<60 ? m+' د' : (Math.round(m/60)<24 ? Math.round(m/60)+' س' : Math.round(m/1440)+' يوم'));
    return rel+' · من '+clock;
  }
  function renderList(){
    var box=$('pmDevList'); if(!box) return;
    var d=window.pmPresData||{list:[],me:null};
    if(!d.list.length){ box.innerHTML='<div class="pm-pres-empty">لا توجد أجهزة متصلة الآن</div>'; return }
    box.innerHTML=d.list.map(function(x){
      var m=x.m||{}, name=String(m.name||'—'), me=(x.key===d.me);
      var meta=[ROLE[m.role]||'موظف', m.device||'', agoTxt(m.since)].filter(Boolean).join(' · ');
      return '<div class="pm-pres-row">'+
        '<span class="pm-av '+(CLS[m.role]||'r-employee')+'">'+esc(name.trim().charAt(0)||'؟')+'</span>'+
        '<div class="pm-pres-info"><div class="pm-pres-name"><span class="t">'+esc(name)+'</span>'+
        (me?'<span class="pm-pres-me">هذا الجهاز</span>':'')+'</div>'+
        '<div class="pm-pres-meta">'+esc(meta)+'</div></div>'+
        '<span class="pm-pres-live"></span></div>';
    }).join('');
  }
  window.pmDevRender=renderList;
  window.pmSyncLabel=function(){
    var map={ok:'متزامن',busy:'جاري المزامنة…',err:'فشلت المزامنة',idle:'في انتظار الاتصال'};
    var ic=document.getElementById('pmSyncIcon'), st=ic&&ic.getAttribute('data-s');
    if(st&&map[st]) return map[st];
    var ls=document.getElementById('localSaveStatus');
    return ls&&ls.textContent.trim()?ls.textContent.replace(/^[●\s]+/,'').trim():'غير معروف';
  };
  function fill(){
    renderList();
    var p=$('pmPresText'), sy=$('pmSyncText');
    $('pmDevPres').textContent=(p&&p.textContent||'—').replace(/^.*?:\s*/,'') || '—';
    $('pmDevSync').textContent=window.pmSyncLabel();
  }
  function openSheet(){ fill(); sheet.hidden=false; clearInterval(timer); timer=setInterval(fill,1000); }
  function closeSheet(){ sheet.hidden=true; clearInterval(timer); timer=null; }
  dock.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b)return;
    var act=b.getAttribute('data-act');
    if(act==='devices'){ openSheet(); return; }
    setOn(act);
    if(act==='home'){ var back=$('pmBack'); if(back)back.click(); }
    else if(act==='cart'){ if(window.pmGo)pmGo('cartpage'); }
    else if(act==='stock'){ if(window.pmGo)pmGo('stock'); }
  });
  $('pmDevClose').addEventListener('click',closeSheet);
  sheet.addEventListener('click',function(e){ if(e.target===sheet)closeSheet(); });
  // المؤشر يتبع الصفحة الحالية: لو رجعنا للرئيسية يرجع "الرئيسية" نشطة
  setInterval(function(){ if(!document.body.classList.contains('pm-view')) setOn('home'); },400);
})();
}catch(e){console.error('[PastryMY] 035-ui-bottom-dock.js failed',e)}
/* ---- 041-ui-dock-icons.js ---- */
try{
(function(){
  var done=false;
  function place(){
    if(done)return;
    var dock=document.getElementById('pmDock'), msg=document.getElementById('pmMsgWrap'), gear=document.getElementById('pmGearWrap');
    var stock=dock&&dock.querySelector('[data-act="stock"]');
    if(!dock||!msg||!gear||!stock)return;
    dock.insertBefore(msg, stock);
    dock.insertBefore(gear, stock);
    function label(wrap,text){
      if(wrap.querySelector('.pmd-lbl'))return;
      var l=document.createElement('span'); l.className='pmd-lbl'; l.textContent=text; (wrap.querySelector('button')||wrap).appendChild(l);
    }
    label(msg,'الرسايل'); label(gear,'الإعدادات');
    // اللوحات المنسدلة تطلع فوق الشريط بدل ما تطلع تحت الشاشة
    [msg,gear].forEach(function(w){
      Array.prototype.forEach.call(w.children,function(ch){
        if(ch.tagName==='DIV'){
          ch.style.setProperty('position','fixed','important');
          ch.style.setProperty('top','auto','important');
          ch.style.setProperty('bottom','100px','important');
          ch.style.setProperty('left','12px','important');
          ch.style.setProperty('right','12px','important');
          ch.style.setProperty('width','auto','important');
          ch.style.setProperty('max-width','420px','important');
          ch.style.setProperty('margin','0 auto','important');
        }
      });
    });
    done=true;
  }
  var t=setInterval(function(){ place(); if(done) clearInterval(t) },300);
})();
}catch(e){console.error('[PastryMY] 041-ui-dock-icons.js failed',e)}
