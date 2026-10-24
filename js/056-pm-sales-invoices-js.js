(function(){
  if(window.__pmSalesInv) return; window.__pmSalesInv=true;
  var openK={};
  function lineRev(x){ return Number(x.revenue!=null?x.revenue:(Number(x.qty||0)*Number(x.unitPrice||0)))||0; }
  function rcOf(g){
    return {no:g.no, date:g.date, by:g.by, note:g.note, customerPhone:g.customerPhone, total:g.total, lines:g.lines.map(function(l){return l.x})};
  }
  function timeText(at){ if(!at) return ''; var d=new Date(at); return isNaN(d.getTime())?'':d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }

  /* كل الفواتير المفتوحة للشهر الحالي (لسه متقفلتش) */
  function openGroups(){
    var out=[];
    var srcLog=Array.isArray(window.__pmSalesLogServer)?window.__pmSalesLogServer:(Array.isArray(state.salesLog)?state.salesLog:[]);
    var srcF=srcLog.filter(function(x){return (window.pmInvGroup==='drink')===window.pmIsDrinkLine(x)});var sales=window.pmGroupInvoices?window.pmGroupInvoices(srcF):[];
    sales.forEach(function(g){
      out.push({key:'s:'+g.key, noLabel:(window.pmInvGroup==='drink'?'م-':'#')+g.no, no:g.no, date:g.date, at:g.at, by:g.by, note:g.note,
        customerPhone:g.customerPhone, total:g.total, lines:g.lines, month:''});
    });
    out.sort(function(a,b){ return String(b.at||'').localeCompare(String(a.at||'')); });
    return out;
  }

  window.pmSalesInvRender=function(){
    var box=document.getElementById('salesInvBody'); if(!box) return;
    if(!box.__bound){
      box.__bound=true;
      box.addEventListener('toggle',function(e){ var d=e.target; if(d&&d.getAttribute&&d.getAttribute('data-sk')) openK[d.getAttribute('data-sk')]=d.open; },true);
    }
    var groups=openGroups();
    var qEl=document.getElementById('salesInvSearch');
    var q=String(qEl?qEl.value:'').trim().toLowerCase();
    var list=groups.filter(function(g){
      if(!q) return true;
      if(String(g.noLabel).toLowerCase()===q) return true;
      var hay=[g.note||'',g.customerPhone||'',g.month||''].concat(g.lines.map(function(l){return l.x.name||''})).join(' ').toLowerCase();
      return hay.indexOf(q)!==-1;
    });
    var total=groups.reduce(function(s,g){return s+(Number(g.total)||0)},0);
    var stats='<div class="stats"><div class="stat"><b>'+groups.length+'</b><span>فواتير الشهر الحالي</span></div>'+
      '<div class="stat"><b>'+moneyFmt(total)+' ج.م</b><span>إجمالي فواتير الشهر</span></div></div>';

    var items=list.slice(0,200).map(function(g){
      var key=g.key, open=!!openK['si:'+key];
      var rows=g.lines.map(function(l){
        var x=l.x;
        return '<tr><td>'+esc(x.name)+'</td><td>'+nfmt(x.qty)+'</td><td>'+moneyFmt(x.unitPrice||0)+'</td><td>'+moneyFmt(lineRev(x))+' ج.م</td></tr>';
      }).join('');
      var meta='<div class="inv-meta"><span>رقم الفاتورة: <b>'+esc(g.noLabel)+'</b></span>'+
        '<span>الشهر: <b>'+esc(g.month||'—')+'</b></span>'+
        '<span>التاريخ: <b>'+esc(g.date||'—')+(timeText(g.at)?' · '+esc(timeText(g.at)):'')+'</b></span>'+
        (g.customerPhone?'<span>التليفون: <b dir="ltr">'+esc(g.customerPhone)+'</b></span>':'')+'</div>';
      return '<details class="rcpt" data-sk="'+esc('si:'+key)+'"'+(open?' open':'')+'>'+
        '<summary><span class="rno">'+esc(g.noLabel)+' · '+esc(g.note||'—')+'</span><span class="rtotal">'+moneyFmt(g.total)+' ج.م</span>'+
        '<span class="rmeta">'+esc(g.month||'')+' · '+g.lines.length+' صنف</span></summary>'+
        '<div class="rbody">'+meta+'<div class="tablewrap"><table class="inv-items"><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>'+rows+'</table></div>'+
        '<div class="actions" style="margin-top:10px"><button type="button" class="secondary mini" data-sinv="'+esc(key)+'">🖨️ عرض / طباعة الفاتورة</button></div></div></details>';
    }).join('');

    box.innerHTML='<div class="actions" style="margin-bottom:8px"><button type="button" class="'+(window.pmInvGroup==='drink'?'secondary':'primary')+' mini" data-igroup="food">فواتير الأكل</button><button type="button" class="'+(window.pmInvGroup==='drink'?'primary':'secondary')+' mini" data-igroup="drink">فواتير المشروبات</button></div>'+stats+(list.length
      ? '<div class="sales-archive">'+items+'</div>'
      : '<div class="pm-po-empty">'+(groups.length?'مفيش فواتير بتطابق البحث.':'مفيش فواتير مسجلة في الشهر ده.')+'</div>')+
      (list.length>200?'<div class="small">بيعرض أول 200 فاتورة، ضيّق البحث.</div>':'');

    box.querySelectorAll('[data-igroup]').forEach(function(b){b.onclick=function(){window.pmInvGroup=b.getAttribute('data-igroup');window.pmSalesInvRender();};});
    box.querySelectorAll('[data-sinv]').forEach(function(b){
      b.onclick=function(){
        var g=groups.find(function(x){return x.key===b.getAttribute('data-sinv')});
        if(g && typeof window.pmShowInvoice==='function') window.pmShowInvoice(rcOf(g));
      };
    });
  };

  /* طباعة الفاتورة من إطار معزول بنفس تنسيق التطبيق */
  window.pmShowDoc=function(html,title){
    /* طباعة مباشرة: الإطار مخفي والتطبيق يفضل مكانه، ونافذة الطباعة بتتفتح بره التطبيق على طول */
    var clean=String(html||'').replace(/<script[\s\S]*?<\/script>/gi,'');
    var f=document.createElement('iframe');
    f.setAttribute('aria-hidden','true');
    f.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(f);
    var doc=f.contentDocument||(f.contentWindow&&f.contentWindow.document);
    if(!doc){ alert('المتصفح مانعش الطباعة. جرّب تاني.'); f.remove(); return; }
    doc.open(); doc.write(clean); doc.close();
    setTimeout(function(){
      try{ f.contentWindow.focus(); f.contentWindow.print(); }
      catch(e){ alert('تعذر فتح نافذة الطباعة على هذا الجهاز.'); }
      setTimeout(function(){ f.remove(); },5000);
    },500);
  };

  window.pmPrintHTML=function(innerHtml){
    var css=Array.prototype.map.call(document.querySelectorAll('style'),function(x){return x.textContent}).join('\n');
    var f=document.createElement('iframe');
    f.setAttribute('aria-hidden','true');
    f.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(f);
    var doc=f.contentDocument||(f.contentWindow&&f.contentWindow.document);
    if(!doc){ alert('المتصفح مانعش الطباعة. جرّب تاني.'); f.remove(); return; }
    doc.open();
    doc.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>فاتورة</title><style>'+css+'</style></head><body><main class="pm-print-main">'+innerHtml+'</main></body></html>');
    doc.close();
    setTimeout(function(){
      try{ f.contentWindow.focus(); f.contentWindow.print(); }
      catch(e){ alert('تعذر فتح نافذة الطباعة على هذا المتصفح.'); }
      setTimeout(function(){ f.remove(); },5000);
    },500);
  };

  window.__goPost=window.__goPost||[];
  window.__goPost.push(function(id){
    if(id!=='salesInvoices') return;
    window.pmSalesInvRender();
    if(!cloudReady||!cloudActorName||!cloudActorPin) return;
    cloudClient.rpc('pastrymy_sales_invoices',{p_employee_name:cloudActorName,p_pin:cloudActorPin}).then(function(res){
      if(res&&!res.error&&res.data&&Array.isArray(res.data.entries)){
        window.__pmSalesLogServer=res.data.entries;
      }
      if(typeof window.pmPartyWorkflowRefresh==='function') return window.pmPartyWorkflowRefresh();
    }).catch(function(){}).then(function(){ window.pmSalesInvRender(); if(typeof window.pmSalesArchiveRender==='function') window.pmSalesArchiveRender(); });
  });
})();
