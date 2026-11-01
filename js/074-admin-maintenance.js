(function(){
  if(window.__pmMaint) return; window.__pmMaint=true;
  var DEFAULT_MSG='البرنامج تحت التحديث، برجاء المحاولة بعد قليل.';
  var cur={on:false,message:'',at:null,until:null};
  var known=false;
  var srvState={ok:false,err:'لم يُقرأ بعد'};
  var ov=document.getElementById('pmMaint');
  var msgEl=document.getElementById('pmMaintMsg');
  var sinceEl=document.getElementById('pmMaintSince');
  var cntBox=document.getElementById('pmMaintCount');
  var sheet=null, msgIn=null, untilIn=null, sheetErr=null;
  var busy=false;
  function pad(n){ return (n<10?'0':'')+n; }
  function isAdminRole(){ return typeof cloudActorRole!=='undefined' && cloudActorRole==='admin'; }
  function signedIn(){ return !document.body.classList.contains('auth-required') && typeof cloudActorName!=='undefined' && !!cloudActorName; }
  function untilMs(){ if(!cur.until) return null; var t=Date.parse(cur.until); return isNaN(t)?null:t; }
  function timeTxt(ms){ return new Date(ms).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }
  function toLocalInput(ms){ var d=new Date(ms); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes()); }

  function ensureRow(){
    var box=document.getElementById('drawerTools');
    if(!box) return null;
    var row=document.getElementById('pmMaintRow');
    if(!row){
      row=document.createElement('div'); row.id='pmMaintRow'; row.className='pm-maint-row';
      row.innerHTML='<div class="pm-maint-txt"><b>وضع الصيانة</b><small id="pmMaintStatus"></small><small id="pmMaintNote" class="pm-maint-note"></small><small class="pm-maint-build">إصدار الواجهة: maint-6 · 2026-10-23</small><button type="button" id="pmMaintEdit">تعديل الرسالة والوقت</button></div>'+
        '<button type="button" id="pmMaintToolBtn" role="switch" aria-checked="false" aria-label="وضع الصيانة"></button>';
      box.insertBefore(row,box.firstChild);
      document.getElementById('pmMaintToolBtn').addEventListener('click',toggle);
      document.getElementById('pmMaintEdit').addEventListener('click',openSheet);
    }
    return row;
  }

  var OV_IDS={lbl:'pmMaintCountLabel',d:'pmC_d',h:'pmC_h',m:'pmC_m',s:'pmC_s',dw:'pmC_dw'};
  function renderCount(u,ids){
    var lbl=document.getElementById(ids.lbl);
    if(!lbl) return;
    var diff=u-Date.now();
    if(diff<=0){
      lbl.textContent='الوقت المحدد خلص، بنتأكد من انتهاء الصيانة…';
      ['d','h','m','s'].forEach(function(k){ document.getElementById(ids[k]).textContent='00'; });
      document.getElementById(ids.dw).hidden=true;
      return;
    }
    lbl.textContent='باقي على انتهاء الصيانة';
    var sec0=Math.floor(diff/1000), d=Math.floor(sec0/86400), h=Math.floor((sec0%86400)/3600), m=Math.floor((sec0%3600)/60), sec=sec0%60;
    document.getElementById(ids.dw).hidden=(d===0);
    document.getElementById(ids.d).textContent=pad(d);
    document.getElementById(ids.h).textContent=pad(h);
    document.getElementById(ids.m).textContent=pad(m);
    document.getElementById(ids.s).textContent=pad(sec);
  }
  // العد التنازلي: بيشتغل في صفحة الموظف
  function tick(){
    var u=untilMs();
    var overlayShown=ov.classList.contains('show');
    if(cntBox) cntBox.hidden=!(overlayShown && u!==null);
    if(overlayShown && u!==null) renderCount(u,OV_IDS);
  }
  function paint(){
    var show=!!cur.on && !isAdminRole() && signedIn();
    ov.classList.toggle('show',show);
    document.documentElement.classList.toggle('pm-maint-open',show);
    document.body.classList.toggle('pm-maint-open',show);
    msgEl.textContent=cur.message||DEFAULT_MSG;
    var u=untilMs(), now=Date.now();
    var since='';
    if(u!==null) since=(u>now?'المتوقع ينتهي الساعة ':'كان المفروض ينتهي الساعة ')+timeTxt(u);
    else if(cur.at){ var t=Date.parse(cur.at); if(!isNaN(t)) since='بدأت الساعة '+timeTxt(t); }
    sinceEl.textContent=since;
    tick();

    var row=ensureRow();
    if(!row) return;
    row.hidden=!isAdminRole();
    var sw=document.getElementById('pmMaintToolBtn');
    var st=document.getElementById('pmMaintStatus');
    if(!known){
      sw.setAttribute('data-state','unknown'); sw.setAttribute('aria-checked','false'); sw.disabled=true;
      st.innerHTML=(srvState.ok===false && srvState.err!=='لم يُقرأ بعد')
        ? '<span style="color:#B42318">⚠️ السيرفر ما قراش الحالة: '+esc(srvState.err)+'</span>'
        : 'جاري التحقق من الحالة…';
    } else {
      sw.removeAttribute('data-state'); sw.disabled=false;
      sw.setAttribute('aria-checked',cur.on?'true':'false');
      var extra='';
      if(cur.on){
        if(u===null) extra=' · مفيش وقت انتهاء محدد';
        else if(u>now) extra=' · هتنتهي الساعة '+timeTxt(u);
        else extra=' · الوقت المحدد خلص، اقفلها لو خلصت';
      }
      st.innerHTML=(cur.on
        ? '<span class="pm-maint-pill on">مفعّل</span>الموظفين شايفين صفحة التحديث'+extra
        : '<span class="pm-maint-pill off">متوقف</span>البرنامج مفتوح للجميع')
        + (srvState.ok ? '' : '<br><span style="color:#B42318">⚠️ السيرفر ما قراش الحالة: '+esc(srvState.err)+'</span>');
    }
  }

  function apply(m){
    known=true;
    cur={
      on:!!(m&&m.on),
      message:String((m&&m.message)||''),
      at:(m&&m.at)||null,
      until:(m&&m.until)||null
    };
    if(typeof state!=='undefined'&&state) state.maintenance=cur;
    paint();
  }

  function note(text,isErr){
    var n=document.getElementById('pmMaintNote'); if(!n) return;
    n.textContent=text||'';
    n.style.color=isErr?'#B42318':'#16794B';
  }

  async function saveAndVerify(prev){
    busy=true; note('جاري الحفظ…');
    var ok=false, err='';
    try{ await persistCloudSnapshot(clone(state)); ok=true; }catch(e){ err=(e&&e.message)||String(e); }
    if(!ok){
      apply(prev); note('ما اتحفظش على السحابة: '+err,true); busy=false; return;
    }
    var rs=await readStatus();
    busy=false;
    if(rs.ok && (!!(rs.value&&rs.value.on)===cur.on)) note('تم الحفظ ✓ · السيرفر متأكد');
    else if(rs.ok) note('⚠️ السيرفر رجّع حالة مختلفة، حدّث الصفحة',true);
    else note('تم الحفظ، بس تعذر التحقق من السيرفر',true);
  }

  function toggle(){
    if(!isAdminRole()||!known||busy) return;
    var prev={on:cur.on,message:cur.message,at:cur.at,until:cur.until};
    var turnOn=!cur.on;
    var u=untilMs();
    // لما تتقفل نمسح وقت الانتهاء، ولما تتفتح نحتفظ بيه بس لو لسه في المستقبل
    var keepUntil=turnOn && u!==null && u>Date.now();
    apply({
      on:turnOn,
      message:cur.message||DEFAULT_MSG,
      at:turnOn?new Date().toISOString():null,
      until:keepUntil?cur.until:null
    });
    saveAndVerify(prev);
  }

  // ===== نافذة الإعدادات: نص الرسالة + وقت الانتهاء =====
  function buildSheet(){
    sheet=document.createElement('div');
    sheet.id='pmMSheet'; sheet.className='pm-msheet'; sheet.hidden=true;
    sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true'); sheet.setAttribute('aria-labelledby','pmMSheetTitle');
    sheet.innerHTML=
      '<div class="pm-msheet-box">'+
        '<h3 id="pmMSheetTitle">إعدادات وضع الصيانة</h3>'+
        '<label for="pmMSheetMsg">نص الرسالة اللي هيظهر للموظفين</label>'+
        '<textarea id="pmMSheetMsg" maxlength="400"></textarea>'+
        '<label for="pmMSheetUntil">الصيانة هتنتهي إمتى؟</label>'+
        '<input type="datetime-local" lang="en-GB" dir="ltr" id="pmMSheetUntil">'+
        '<div class="pm-msheet-chips">'+
          '<button type="button" data-min="30">+30 دقيقة</button>'+
          '<button type="button" data-min="60">+ساعة</button>'+
          '<button type="button" data-min="120">+ساعتين</button>'+
          '<button type="button" data-min="360">+6 ساعات</button>'+
          '<button type="button" data-clear="1">بدون وقت</button>'+
        '</div>'+
        '<small id="pmMSheetErr" class="pm-maint-note" style="color:#B42318"></small>'+
        '<div class="pm-msheet-act">'+
          '<button type="button" id="pmMSheetCancel">إلغاء</button>'+
          '<button type="button" id="pmMSheetSave">حفظ</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(sheet);
    msgIn=document.getElementById('pmMSheetMsg');
    untilIn=document.getElementById('pmMSheetUntil');
    sheetErr=document.getElementById('pmMSheetErr');
    sheet.addEventListener('click',function(e){ if(e.target===sheet) closeSheet(); });
    document.getElementById('pmMSheetCancel').addEventListener('click',closeSheet);
    document.getElementById('pmMSheetSave').addEventListener('click',saveSheet);
    sheet.querySelectorAll('[data-min]').forEach(function(b){
      b.addEventListener('click',function(){
        untilIn.value=toLocalInput(Date.now()+Number(b.getAttribute('data-min'))*60000);
        sheetErr.textContent='';
      });
    });
    sheet.querySelector('[data-clear]').addEventListener('click',function(){ untilIn.value=''; sheetErr.textContent=''; });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !sheet.hidden) closeSheet(); });
  }
  function openSheet(){
    if(!isAdminRole()||!known||busy) return;
    msgIn.value=cur.message||DEFAULT_MSG;
    var u=untilMs();
    untilIn.value=(u!==null)?toLocalInput(u):'';
    sheetErr.textContent='';
    sheet.hidden=false;
    msgIn.focus();
  }
  function closeSheet(){ sheet.hidden=true; }
  function saveSheet(){
    if(!isAdminRole()||!known||busy) return;
    var text=(msgIn.value||'').trim()||DEFAULT_MSG;
    var until=null;
    if(untilIn.value){
      var t=Date.parse(untilIn.value);
      if(isNaN(t)){ sheetErr.textContent='التاريخ والوقت مش مظبوطين'; return; }
      until=new Date(t).toISOString();
    }
    closeSheet();
    var prev={on:cur.on,message:cur.message,at:cur.at,until:cur.until};
    apply({on:cur.on,message:text,at:cur.at,until:until});
    saveAndVerify(prev);
  }
  // ===== نهاية نافذة الإعدادات =====

  async function readStatus(){
    var lastErr='';
    try{
      if(typeof cloudClient!=='undefined'&&cloudClient){
        var r=await cloudClient.rpc('pastrymy_maintenance_status');
        if(r&&!r.error){ srvState={ok:true,err:''}; return {ok:true,value:r.data||{on:false}}; }
        lastErr=(r&&r.error&&(r.error.message||r.error.code))||'خطأ غير معروف';
      } else lastErr='لا يوجد اتصال بالسحابة';
    }catch(e){ lastErr=(e&&e.message)||String(e); }
    srvState={ok:false,err:lastErr||'الخادم ما رجّعش حقل الصيانة'};
    try{
      if(typeof cloudReady!=='undefined'&&cloudReady&&signedIn()&&cloudActorPin){
        var g=await Promise.race([apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin}),new Promise(function(res){setTimeout(function(){res(null)},4000)})]);
        if(g&&!g.error&&g.data&&g.data.state&&('maintenance' in g.data.state)){ srvState={ok:true,err:''}; return {ok:true,value:g.data.state.maintenance}; }
      }
    }catch(e){}
    srvState={ok:false,err:lastErr||'الخادم ما رجّعش حقل الصيانة'};
    return {ok:false};
  }
  async function poll(){
    var st=await readStatus();
    if(st.ok) apply(st.value); else paint();
  }

  document.getElementById('pmMaintOut').addEventListener('click',function(){
    if(typeof signOutCloud==='function') signOutCloud();
  });
  var dbtn=document.getElementById('drawerBtn');
  if(dbtn) dbtn.addEventListener('click',paint);

  // حماية: أي حفظ للسحابة لازم يحمل حالة الصيانة الحالية (بما فيها وقت الانتهاء)
  (function(){
    var origApi=window.apiCall;
    if(typeof origApi!=='function') return;
    window.apiCall=async function(body){
      try{
        if(body&&body.action==='save_state'&&body.state&&typeof body.state==='object'){
          if(!known){ await poll(); }
          if(known){
            var m=cur.on?{on:true,message:cur.message,at:cur.at,until:cur.until}:{on:false};
            body=Object.assign({},body,{state:Object.assign({},body.state,{maintenance:m})});
          }
        }
      }catch(e){}
      return origApi.call(this,body);
    };
  })();

  buildSheet();
  window.pmMaintApply=apply;
  window.pmMaintPoll=poll;
  paint();
  setTimeout(poll,1500);
  setInterval(poll,15000);
  setInterval(tick,1000);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) poll(); });
  setInterval(paint,2000);
})();
