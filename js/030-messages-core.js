/* دمج تلقائي لملفات من نفس الميزة (بنفس الترتيب، والملفات اللي بينها ما بتشاركش عناصر أو حالة). كل جزء معزول بـ try/catch. */
/* ---- 030-messages-core.js ---- */
try{
(function(){
  var WINDOW_NOTE = 'الرسايل بتتمسح تلقائي بعد 48 ساعة.';
  var messages = [];      // كل رسايل آخر 48 ساعة: {id, from_employee, body, created_at, read}
  var panelOpen = false;
  var sessionKey = '';
  var refreshing = false;

  function esc3(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}) }
  function call(body){ return Promise.resolve().then(function(){ return apiCall(body) }).then(function(r){ return r }, function(e){ return {error:e} }) }
  function fmtDate(v){ try{ return new Date(v).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}) }catch(e){ return '' } }
  function isReady(){ return !!cloudReady && !!cloudActorName && !!cloudActorPin }
  function unread(){ return messages.filter(function(m){ return !m.read }) }

  /* ---------- كارت إرسال الرسايل (للمدير) ---------- */
  var card = document.createElement('div');
  card.className = 'card'; card.id = 'pmMsgCard'; card.style.display = 'none';
  card.innerHTML = '<h2>رسايل للموظفين</h2>' +
    '<p class="small">الرسالة بتظهر للموظف، وبتتمسح بعد 48 ساعة.</p>' +
    '<label>المستلم</label><select id="pmMsgTo"><option value="">اختر الموظف</option></select>' +
    '<label>نص الرسالة</label><textarea id="pmMsgBody" rows="3" maxlength="2000" placeholder="اكتب الرسالة..."></textarea>' +
    '<div class="actions"><button id="pmMsgSend" class="primary" type="button">إرسال الرسالة</button></div>' +
    '<div id="pmMsgStatus" class="small"></div>';
  var backup = document.getElementById('backup');
  if(backup && backup.firstElementChild) backup.insertBefore(card, backup.firstElementChild);

  var lastRecipientTry = 0, recipientsReady = false;
  function fillRecipients(){
    if(recipientsReady || Date.now() - lastRecipientTry < 10000) return;
    lastRecipientTry = Date.now();
    call({action:'list_employees'}).then(function(r){
      if(r.error || !r.data) return;
      var sel = document.getElementById('pmMsgTo'); if(!sel) return;
      var names = (r.data.employees || []).filter(function(n){ return n !== cloudActorName });
      sel.innerHTML = '<option value="">اختر الموظف</option><option value="all">كل الموظفين</option>' +
        names.map(function(n){ return '<option value="'+esc3(n)+'">'+esc3(n)+'</option>' }).join('');
      recipientsReady = true;
    });
  }
  document.getElementById('pmMsgSend').onclick = function(){
    var to = document.getElementById('pmMsgTo').value;
    var bodyEl = document.getElementById('pmMsgBody');
    var body = bodyEl.value.trim();
    var st = document.getElementById('pmMsgStatus');
    if(!to){ alert('اختر المستلم أولًا.'); return }
    if(!body){ alert('اكتب نص الرسالة.'); return }
    var btn = this; btn.disabled = true; st.textContent = 'جارٍ الإرسال…';
    call({action:'send_message',employee_name:cloudActorName,pin:cloudActorPin,to:to,body:body}).then(function(r){
      btn.disabled = false;
      if(r.error || !r.data || r.data.ok !== true){ st.textContent = 'تعذر الإرسال، حاول تاني.'; return }
      st.textContent = 'تم إرسال الرسالة ✓';
      bodyEl.value = '';
    });
  };

  /* ---------- زرار الإشعارات + القايمة ---------- */
  var wrap = document.createElement('span');
  wrap.id = 'pmMsgWrap';
  wrap.style.cssText = 'position:relative;display:none;align-items:center;flex:0 0 auto';

  var bell = document.createElement('button');
  bell.id = 'pmBell'; bell.type = 'button';
  bell.setAttribute('aria-label', 'الرسايل'); bell.title = 'الرسايل';
  bell.style.cssText = 'position:relative;width:40px;height:40px;border-radius:50%;border:1px solid rgba(0,0,0,.14);background:#fff;color:#1B1B1B;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 6px rgba(0,0,0,.08)';
  bell.innerHTML = ((window.__PMUI__&&window.__PMUI__.ICONS.bell)||'') +
    '<span id="pmBellCount" style="position:absolute;top:-4px;right:-4px;min-width:19px;height:19px;border-radius:10px;background:#D92D20;color:#1B1B1B;font-size:11px;font-weight:700;align-items:center;justify-content:center;padding:0 5px;display:none;box-sizing:border-box"></span>';

  var panel = document.createElement('div');
  panel.id = 'pmBellPanel';
  panel.style.cssText = 'position:absolute;top:auto;bottom:calc(100% + 8px);right:0;width:min(300px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#fff;color:#1B1B1B;border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.25);z-index:9000;display:none;padding:12px;direction:rtl;box-sizing:border-box;text-align:right';


  var gearWrap = document.createElement('span');
  gearWrap.id = 'pmGearWrap';
  gearWrap.style.cssText = 'position:relative;display:none;align-items:center;flex:0 0 auto';

  var gearBtn = document.createElement('button');
  gearBtn.id = 'pmGearBtn'; gearBtn.type = 'button';
  gearBtn.title = 'الإعدادات'; gearBtn.setAttribute('aria-label', 'الإعدادات');
  gearBtn.style.cssText = 'width:40px;height:40px;border-radius:50%;border:1px solid rgba(0,0,0,.14);background:#fff;color:#1B1B1B;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 6px rgba(0,0,0,.08)';
  gearBtn.innerHTML = ((window.__PMUI__&&window.__PMUI__.ICONS.gear)||'');

  var gearMenu = document.createElement('div');
  gearMenu.id = 'pmGearMenu';
  gearMenu.style.cssText = 'position:absolute;top:calc(100% + 8px);right:0;width:min(240px,calc(100vw - 24px));background:#fff;color:#1B1B1B;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.25);z-index:9000;display:none;padding:8px;direction:rtl;box-sizing:border-box';

  // نقل الأزرار الثلاثة (بنفس العناصر والأحداث) من تحت الحالة للقائمة
  [['retryCloudButton', 'تحديث الصفحة'], ['reloadCloudButton', 'آخر نسخة سحابية'], ['signOutButton', 'تسجيل خروج المستخدم']]
    .forEach(function(p){
      var b = document.getElementById(p[0]); if(!b) return;
      b.textContent = p[1];
      b.className = '';
      b.style.cssText = 'display:block;width:100%;text-align:right;background:#FFFFFF;color:#1B1B1B;border:1px solid rgba(0,0,0,.14);border-radius:10px;padding:10px 12px;margin:4px 0;font:inherit;font-size:14px;cursor:pointer';
      gearMenu.appendChild(b);
      if(p[0] === 'retryCloudButton'){
        b.addEventListener('click', function(){ setTimeout(function(){ b.textContent = 'تحديث الصفحة' }, 4000) });
      }
    });

  gearWrap.appendChild(gearBtn);
  gearWrap.appendChild(gearMenu);

  wrap.appendChild(bell);
  // القايمة برا الشريط السفلي، عشان قواعد أزرار الشريط ما تأثرش على الفورم والفلاتر
  document.body.appendChild(panel);
  var darkCss = document.createElement('style');
  darkCss.textContent = 'html[data-theme="dark"] #pmGearMenu{background:#FFFFFF;color:#1B1B1B;border:1px solid #D6D6D6}' +
    'html[data-theme="dark"] #pmGearMenu button{background:#FFFFFF!important;color:#1B1B1B!important;border-color:#D6D6D6!important}' +
    'html[data-theme="dark"] #pmGearBtn,html[data-theme="dark"] #pmBell{background:#FFFFFF!important;color:#1B1B1B!important;border-color:#D6D6D6!important}' +
    '#pmMsgWrap,#pmMsgWrap *,#pmGearWrap,#pmGearWrap *{pointer-events:auto!important}';
  document.head.appendChild(darkCss);
  // الأيقونتين في نفس صف "الحسابات المتصلة" جنبها
  var liveBar = document.getElementById('pmLiveBar');
  var presChip = document.getElementById('pmPresChip');
  if (liveBar && presChip) {
    var row = document.createElement('div');
    row.id = 'pmPresRow';
    row.style.cssText = 'display:flex;direction:rtl;justify-content:flex-start;align-items:center;gap:8px;flex:1 1 260px;min-width:0;margin-inline-start:30px';
    liveBar.insertBefore(row, liveBar.firstChild);
    presChip.style.flex = '1 1 auto';
    presChip.style.minWidth = '0';
    presChip.style.direction = 'rtl';
    row.appendChild(presChip);
    row.appendChild(wrap);
    row.appendChild(gearWrap);
  } else {
    document.body.appendChild(wrap);
    document.body.appendChild(gearWrap);
  }

  function updateBadge(){
    var n = unread().length;
    var b = document.getElementById('pmBellCount');
    if(!b) return;
    b.textContent = n > 9 ? '9+' : String(n);
    b.style.display = n ? 'flex' : 'none';
  }
  function itemHtml(m){
    var bg = m.read ? '#fff' : '#1B1B1B';
    return '<div style="border:1px solid rgba(0,0,0,.14);background:'+bg+';border-radius:10px;padding:10px;margin-top:8px">' +
      '<div style="font-size:12px;color:#1B1B1B">من: <b>'+esc3(m.from_employee||'الإدارة')+'</b> · '+esc3(fmtDate(m.created_at)) +
      (m.read ? '' : ' · <b style="color:#1B1B1B">جديدة</b>') + '</div>' +
      '<div style="margin-top:6px;white-space:pre-wrap">'+esc3(m.body)+'</div></div>';
  }
  function renderPanel(){
    var html = '';
    if(!messages.length) html += '<div style="color:#1B1B1B;padding:12px 0">مفيش رسايل في آخر 48 ساعة.</div>';
    else html += messages.map(itemHtml).join('');
    html += '<div style="font-size:11.5px;color:#1B1B1B;margin-top:10px">'+WINDOW_NOTE+'</div>';
    var inbox = document.getElementById('pmInboxList');
    if(!inbox){ inbox = document.createElement('div'); inbox.id = 'pmInboxList'; panel.appendChild(inbox); }
    inbox.innerHTML = html;
  }
  function markRead(list){
    if(!list.length) return Promise.resolve();
    var name = cloudActorName, pin = cloudActorPin;
    list.forEach(function(m){ m.read = true });
    updateBadge();
    return Promise.all(list.map(function(m){
      return call({action:'mark_read',employee_name:name,pin:pin,id:m.id});
    }));
  }
  function placePanel(){
    var d=document.getElementById('pmDock');
    var top=d ? d.getBoundingClientRect().top : window.innerHeight-90;
    panel.style.position='fixed';
    panel.style.top='auto';
    panel.style.left='12px';
    panel.style.right='12px';
    panel.style.margin='0 auto';
    panel.style.bottom=(window.innerHeight-top+8)+'px';
    panel.style.zIndex='9000';
  }
  window.addEventListener('resize',function(){ if(panelOpen) placePanel() });
  function setPanel(open){
    panelOpen = open;
    panel.style.display = open ? 'block' : 'none';
    if(open){
      placePanel();
      renderPanel();                 // أول فتحة بتعرض الجديد مميز، وبعدين بنعلّمه مقروء
      markRead(unread());
    }
  }
  var gearOpen = false;
  function setGear(open){
    gearOpen = open;
    gearMenu.style.display = open ? 'block' : 'none';
    if(open && panelOpen) setPanel(false);
  }
  gearBtn.onclick = function(e){ e.stopPropagation(); setGear(!gearOpen) };
  gearMenu.addEventListener('click', function(e){
    if(e.target && e.target.tagName === 'BUTTON') setTimeout(function(){ setGear(false) }, 50);
  });
  document.addEventListener('click', function(e){
    if(gearOpen && !gearWrap.contains(e.target)) setGear(false);
  });
  bell.onclick = function(e){ e.stopPropagation(); if(gearOpen) setGear(false); setPanel(!panelOpen) };
  document.addEventListener('click', function(e){
    // composedPath: الضغط على زرار جوه القايمة (زي فلتر الرسايل) بيعيد رسم العنصر فبنحكم بالمسار الأصلي
    var path=e.composedPath?e.composedPath():[];
    var inside = path.indexOf(wrap)>=0 || path.indexOf(panel)>=0 || wrap.contains(e.target) || panel.contains(e.target);
    if(panelOpen && !inside) setPanel(false);
  });

  /* ---------- مربع أول ما الحساب يفتح ---------- */
  function showPopup(list){
    var ov = document.createElement('div');
    ov.setAttribute('role','dialog');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,103,184,.45);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;direction:rtl';
    ov.innerHTML = '<div style="background:#fff;color:#1B1B1B;border-radius:14px;max-width:460px;width:100%;max-height:80vh;overflow:auto;padding:18px;box-sizing:border-box">' +
      '<h3 style="margin:0">عندك '+list.length+' رسالة جديدة من الإدارة</h3>' +
      list.map(itemHtml).join('') +
      '<div style="margin-top:14px;text-align:left"><button id="pmInboxOk" type="button" class="primary">تم، فهمت</button></div></div>';
    document.body.appendChild(ov);
    document.getElementById('pmInboxOk').onclick = function(){
      ov.remove();
      markRead(list);
    };
  }

  /* ---------- تحميل الرسايل من السيرفر ---------- */
  function refresh(){
    if(!isReady() || refreshing) return Promise.resolve();
    refreshing = true;
    return call({action:'get_my_messages',employee_name:cloudActorName,pin:cloudActorPin}).then(function(r){
      refreshing = false;
      if(r.error || !r.data || !Array.isArray(r.data.messages)) return;
      messages = r.data.messages.map(function(m){
        return {id:m.id, from_employee:m.from_employee, body:m.body, created_at:m.created_at, read:!!m.read};
      });
      updateBadge();
      if(panelOpen) renderPanel();
    });
  }

  /* يراقب تسجيل الدخول: أول ما الحساب يفتح يحمّل الرسايل ويعرض الجديد في مربع */
  setInterval(function(){
    var ready = isReady();
    wrap.style.display = ready ? 'flex' : 'none';
    gearWrap.style.display = ready ? 'inline-flex' : 'none';
    if(!ready){
      sessionKey = ''; messages = []; updateBadge(); setPanel(false); recipientsReady = false;
      card.style.display = 'none';
      return;
    }
    card.style.display = cloudActorRole === 'admin' ? '' : 'none';
    if(cloudActorRole === 'admin') fillRecipients();
    var key = cloudActorName + '|' + cloudActorPin;
    if(key !== sessionKey){
      sessionKey = key; messages = []; updateBadge();
      refresh().then(function(){
        var u = unread();
        if(u.length && sessionKey === key) showPopup(u);
      });
    }
  }, 1500);

  /* تحديث دوري للرسايل والعداد */
  setInterval(function(){ refresh() }, 60000);
})();
}catch(e){console.error('[PastryMY] 030-messages-core.js failed',e)}
/* ---- 043-messages-read-ticks.js ---- */
try{
/* رسايل المدير اللي بعتها + علامات القراءة (✓✓ داكنة = لسه، ✓✓ خضرا = اتقرأت) */
(function(){
  function $(id){ return document.getElementById(id) }
  function esc(t){ var d=document.createElement('div'); d.textContent=String(t==null?'':t); return d.innerHTML }
  function ticks(read){
    return '<span class="pm-ticks '+(read?'read':'unread')+'" aria-label="'+(read?'اتقرأت':'لسه ما اتقراتش')+'">'+
      '<svg viewBox="0 0 17 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6.5 4.5 10 11 2.5"/><path d="M6 6.5 9.5 10 16 2.5"/></svg></span>';
  }
  var KEY=function(){ return 'pm_sent_'+(typeof cloudActorName!=='undefined'?cloudActorName:'') };
  function localList(){ try{ return JSON.parse(localStorage.getItem(KEY())||'[]') }catch(e){ return [] } }
  function saveLocal(arr){ try{ localStorage.setItem(KEY(), JSON.stringify(arr)) }catch(e){} }

  // نسجل الرسالة محليًا لما الإرسال يتأكد من الخادم
  var pending=null;
  var sendBtn=$('pmMsgSend'), toEl=$('pmMsgTo'), bodyEl=$('pmMsgBody'), st=$('pmMsgStatus');
  if(sendBtn && toEl && bodyEl){
    sendBtn.addEventListener('click',function(){
      var to=toEl.value, body=bodyEl.value.trim();
      pending = (to && body) ? {to:to, body:body, at:new Date().toISOString()} : null;
    },true);
  }
  if(st){
    new MutationObserver(function(){
      if(pending && /تم إرسال/.test(st.textContent)){
        var arr=localList(); arr.unshift(pending); saveLocal(arr.slice(0,100));
        pending=null; load();
      }
    }).observe(st,{childList:true,characterData:true,subtree:true});
  }

  function box(){
    var host=$('pmMsgsSection'); if(!host) return null;
    var b=$('pmSentBox');
    if(!b){ b=document.createElement('div'); b.id='pmSentBox'; }
    if(b.parentNode!==host) host.appendChild(b);
    return b;
  }
  var filterMode='all', lastList=[], chipsBound=false;
  function labelOf(to){ return to==='all' ? 'كل الموظفين' : (to||'') }
  function render(list, note){
    if(list) lastList=list;
    var b=box(); if(!b) return;
    var all=lastList||[];
    var shown=all.filter(function(m){
      if(filterMode==='read') return !!m.read;
      if(filterMode==='unread') return !m.read;
      return true;
    });
    var chip=function(k,t){ return '<button type="button" class="pm-chip'+(filterMode===k?' on':'')+'" data-f="'+k+'">'+t+'</button>' };
    var html='<h4>الرسايل اللي بعتها</h4>';
    html+='<div class="pm-filters">'+chip('all','الكل')+chip('unread','لسه')+chip('read','اتقرأت')+'</div>';
    if(note) html+='<div class="pm-sent-empty">'+esc(note)+'</div>';
    if(!all.length) html+='<div class="pm-sent-empty">لسه ما بعتّش رسايل.</div>';
    else if(!shown.length) html+='<div class="pm-sent-empty">مفيش رسايل في الفلتر ده.</div>';
    shown.forEach(function(m){
      var rd=m.readers||[], read=!!m.read;
      var who = rd.length ? 'اتقرأت بواسطة: <b>'+rd.map(function(x){return esc(x)}).join('، ')+'</b>'
              : (read ? 'اتقرأت — أسماء القارئين مش متاحة من السيرفر' : 'لسه ما حدش قراها');
      html+='<div class="pm-sent-item">'+
        '<div class="pm-sent-row">'+ticks(read)+
        '<span class="to">'+esc(labelOf(m.to))+'</span>'+
        '<span class="body">'+esc(m.body)+'</span>'+
        '<span class="st">'+(read?'اتقرأت':'لسه')+'</span></div>'+
        '<div class="pm-readers">'+who+'</div>'+
        '</div>';
    });
    b.innerHTML=html;
    if(!chipsBound){
      chipsBound=true;
      b.addEventListener('click',function(e){
        var t=e.target && e.target.closest ? e.target.closest('[data-f]') : null;
        if(!t) return;
        filterMode=t.getAttribute('data-f'); render();
      });
    }
  }
  function readersOf(m){
    var r = m.read_by || m.readers || m.read_by_names || [];
    if(typeof r === 'string') r = [r];
    if(!Array.isArray(r)) return [];
    return r.map(function(x){ return typeof x === 'string' ? x : ((x && (x.employee_name || x.name)) || '') }).filter(Boolean);
  }
  function serverList(){
    return apiCall({action:'get_sent_messages',employee_name:cloudActorName,pin:cloudActorPin}).then(function(r){
      if(!r || r.error || !r.data || !Array.isArray(r.data.messages)) return null;
      return r.data.messages.map(function(m){
        var rd = readersOf(m);
        return {to:m.to_employee||m.to||'', body:m.body||'', readers:rd, read:rd.length>0 || !!m.read, at:m.created_at||''};
      });
    }).catch(function(){ return null });
  }
  function load(){
    var panel=$('pmBellPanel');
    if(!$('pmMsgsSection')) return;
    if(typeof cloudActorRole==='undefined' || cloudActorRole!=='admin' || !cloudReady){ var old=$('pmSentBox'); if(old) old.remove(); return; }
    serverList().then(function(srv){
      if(srv){
        srv.sort(function(a,b){ return String(b.at).localeCompare(String(a.at)) });
        render(srv, '');
      } else {
        // الخادم لسه ما فيهوش الـ action: نعرض اللي اتبعت من الجهاز ده، ومن غير علامة قراءة
        render(localList().map(function(m){ return {to:m.to, body:m.body, read:false} }), 'حالة القراءة هتظهر بعد تحديث الخادم.');
      }
    });
  }
  function watch(){
    var host=$('pmMsgsSection'); if(!host) return false;
    setInterval(load,5000);
    load();
    return true;
  }
  var t=setInterval(function(){ if(watch()) clearInterval(t) },400);
})();
}catch(e){console.error('[PastryMY] 043-messages-read-ticks.js failed',e)}
/* ---- 044-messages-tab.js ---- */
try{
/* "رسايل للموظفين" بقت جوه القايمة المنبثقة لأيقونة الرسايل في الشريط السفلي (مش صفحة مستقلة) */
(function(){
  function isAdmin(){ return (typeof cloudActorRole!=='undefined' && cloudActorRole==='admin' && typeof cloudReady!=='undefined' && cloudReady) }
  // الحاوية بتتحط أول القايمة المنبثقة (pmBellPanel) قبل الوارد
  function ensureHost(){
    var panel=document.getElementById('pmBellPanel');
    if(!panel) return null;
    var host=document.getElementById('pmMsgsSection');
    if(!host){ host=document.createElement('div'); host.id='pmMsgsSection'; }
    if(host.parentNode!==panel || panel.firstElementChild!==host) panel.insertBefore(host, panel.firstChild);
    return host;
  }
  function tick(){
    var host=ensureHost();
    var card=document.getElementById('pmMsgCard');
    var adm=isAdmin();
    var panel=document.getElementById('pmBellPanel');
    if(panel) panel.classList.toggle('pm-admin', adm);
    if(!host) return;
    if(card && card.parentNode!==host) host.appendChild(card);
    if(card){ card.style.display=adm?'':'none'; card.style.removeProperty('visibility'); }
  }
  setInterval(tick,300);
  tick();
})();
}catch(e){console.error('[PastryMY] 044-messages-tab.js failed',e)}
