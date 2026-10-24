/* الإشعارات في جرس مستقل، والرسائل تفضل في الشريط السفلي بأيقونة مسنجر */
(function(){
  var KEY='pmNotifHist', MAX=50;
  var hist=[]; try{ hist=JSON.parse(localStorage.getItem(KEY)||'[]')||[]; }catch(e){ hist=[]; }
  var unread=0;
  var BELL='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>';
  var MESSENGER='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.04 2 11c0 2.6 1.2 4.93 3.1 6.56V22l3.02-1.66c.98.27 2.02.42 3.08.42 5.52 0 10-4.04 10-9S17.52 2 12 2zm1.1 12.2l-2.65-2.83-5.17 2.83 5.68-6.03 2.71 2.83 5.11-2.83-5.68 6.03z"/></svg>';
  function esc(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(hist.slice(0,MAX))); }catch(e){} }
  function fmtTime(t){ try{ return new Date(t).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }

  var btn=document.createElement('button');
  btn.id='pmNotifBtn'; btn.type='button';
  btn.setAttribute('aria-label','الإشعارات'); btn.title='الإشعارات';
  btn.innerHTML=BELL+'<span id="pmNotifCount" style="position:absolute;top:-4px;right:-4px;min-width:19px;height:19px;border-radius:10px;background:#D92D20;color:#fff;font-size:11px;font-weight:700;display:none;align-items:center;justify-content:center;padding:0 5px;box-sizing:border-box"></span>';
  var panel=document.createElement('div'); panel.id='pmNotifPanel';
  var wrap=document.createElement('span');
  wrap.id='pmNotifWrap';
  wrap.style.cssText='position:relative;display:flex;align-items:center;flex:0 0 auto';
  wrap.appendChild(btn);
  var lbl=document.createElement('span'); lbl.className='pmd-lbl'; lbl.textContent='الإشعارات';
  btn.appendChild(lbl);
  document.body.appendChild(panel);
  function placeInDock(){
    var d=document.getElementById('pmDock');
    if(d && !wrap.isConnected) d.appendChild(wrap);
  }
  placeInDock();
  setInterval(placeInDock,800);

  function drawCount(){
    var c=document.getElementById('pmNotifCount'); if(!c) return;
    c.textContent=unread>99?'99+':String(unread);
    c.style.display=unread?'flex':'none';
  }
  window.__pmRenderBell=function(){ renderPanel(); };
  window.__pmBellAdd=function(){ unread++; drawCount(); if(panel.style.display==='block') renderPanel(); };
  var CLR_KEY='pmNotifClearedAt';
  function clearedAt(){ return Number(localStorage.getItem(CLR_KEY))||0; }
  function renderPanel(){
    var cl=clearedAt();
    var cloud=(window.__pmCloud||[]).map(function(n){ var b=n.body?' — '+n.body:''; return {text:(n.title||'')+b, at:Date.parse(n.created_at)||0}; }).filter(function(x){ return x.at>cl; });
    var all=cloud.concat(hist).sort(function(a,b){ return b.at-a.at; }).slice(0,MAX);
    var list=all.length
      ? all.map(function(n){ return '<div style="padding:9px 4px;border-bottom:1px solid #EEE3DB;font-size:13px;line-height:1.5"><div>'+esc(n.text)+'</div><small style="color:#7A6A60">'+fmtTime(n.at)+'</small></div>'; }).join('')
      : '<div style="text-align:center;color:#7A6A60;padding:20px 0">لا توجد إشعارات</div>';
    panel.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:15px;color:#3E2415">الإشعارات</b><button id="pmNotifClear" type="button" style="border:0;background:none;color:#7E4728;font-weight:700;cursor:pointer;font:inherit">مسح الكل</button></div>'+list;
    var clr=document.getElementById('pmNotifClear');
    if(clr) clr.onclick=function(e){ e.stopPropagation(); hist=[]; save(); var newest=(window.__pmCloud||[]).reduce(function(m,n){ return Math.max(m,Date.parse(n.created_at)||0) },0); try{ localStorage.setItem(CLR_KEY,String(newest||Date.now())); }catch(err){} unread=0; drawCount(); renderPanel(); };
  }
  btn.addEventListener('click',function(e){
    e.stopPropagation();
    if(panel.style.display==='block'){ panel.style.display='none'; return; }
    panel.style.display='block'; renderPanel(); unread=0; drawCount();
  });
  document.addEventListener('click',function(e){
    if(panel.style.display!=='block') return;
    if(panel.contains(e.target)||btn.contains(e.target)) return;
    panel.style.display='none';
  });
  function push(text){
    // الجرس بيعرض بس إشعارات الإنتاج والحركة بين الحسابات (من السحابة)، مش رسايل المحلي
    return;
    text=String(text==null?'':text).trim(); if(!text) return;
    hist.unshift({text:text,at:Date.now()}); hist=hist.slice(0,MAX);
    unread++; save(); drawCount();
    if(panel.style.display==='block') renderPanel();
  }
  var origToast=window.toast;
  window.toast=function(msg){
    try{ push(typeof msg==='string'?msg:(msg&&msg.text)||msg); }catch(e){}
    return origToast?origToast.apply(this,arguments):undefined;
  };

  /* أيقونة الرسائل في الشريط السفلي: مسنجر بدل الجرس */
  function swapIcon(){
    var b=document.getElementById('pmBell');
    if(!b) return false;
    if(b.getAttribute('data-msgr')==='1') return true;
    var svg=b.querySelector('svg');
    if(svg){ svg.outerHTML=MESSENGER; }
    b.setAttribute('data-msgr','1');
    var nsvg=b.querySelector('svg'); if(nsvg) nsvg.setAttribute('style','width:22px;height:22px');
    return true;
  }
  var tries=0, iv=setInterval(function(){ tries++; if(swapIcon()||tries>120) clearInterval(iv); },500);
  drawCount();
})();
