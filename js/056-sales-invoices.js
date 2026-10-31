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

  /* طباعة الفاتورة على طابعة حرارية.
     ملاحظة: التطبيق بيحمّل الـ CSS من ملفات <link>، والإطار المعزول مش بياخد غير الـ <style>،
     فلازم نحط تنسيق الطباعة هنا جوه الإطار نفسه. غيّر الرقم لـ 58 لو الطابعة 58mm. */
  var PM_THERMAL_MM=80;
  function pmThermalCss(){
    var w=PM_THERMAL_MM, inner=w-8;
    return [
      '@page{size:'+w+'mm auto;margin:0}',
      '*{box-sizing:border-box}',
      'html,body{margin:0;padding:0;background:#fff;color:#1E3A5F}',
      'body{width:'+w+'mm;font-family:Tahoma,Arial,sans-serif;font-size:12px;line-height:1.35;direction:rtl}',
      '.pm-print-main{width:'+inner+'mm;margin:0 auto;padding:2mm 0}',
      '.inv{width:100%;font-size:11px;color:#1E3A5F}',
      '.inv-top{text-align:center;border-bottom:1px dashed #000;padding-bottom:4px;margin-bottom:4px;background:none!important;color:#1E3A5F!important;border-radius:0!important}',
      '.inv-shop{font-size:16px;font-weight:900;color:#1E3A5F!important}',
      '.inv-sub,.inv-tax{font-size:10px;color:#1E3A5F!important;opacity:1!important}',
      '.inv-tax{display:block;padding:2px 0;margin:0}',
      '.inv-tax span{display:block;background:none!important;border:0!important;padding:0!important;border-radius:0!important}',
      '.inv-meta{display:block!important;margin:4px 0!important;grid-template-columns:none!important}',
      '.inv-meta>div{display:flex!important;justify-content:space-between;align-items:center;gap:6px;background:none!important;border:0!important;border-bottom:1px dotted #000!important;padding:2px 0!important;border-radius:0!important;text-align:start!important}',
      '.inv-meta small{display:inline!important;font-size:10px;color:#1E3A5F!important;margin:0}',
      '.inv-meta b{font-size:11px;color:#1E3A5F!important}',
      '.inv-tbl{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;margin-top:4px;border:0!important;border-radius:0!important}',
      '.inv-tbl th{font-weight:700;padding:3px 1px;border-bottom:1px solid #000;text-align:center;background:none!important;color:#1E3A5F!important}',
      '.inv-tbl td{padding:3px 1px;border-top:0;border-bottom:1px dotted #000;text-align:center;background:none!important;color:#1E3A5F!important}',
      '.inv-tbl th:nth-child(1),.inv-tbl td:nth-child(1){width:38%}',
      '.inv-tbl th:nth-child(2),.inv-tbl td:nth-child(2){width:14%}',
      '.inv-tbl th:nth-child(3),.inv-tbl td:nth-child(3){width:22%}',
      '.inv-tbl th:nth-child(4),.inv-tbl td:nth-child(4){width:26%}',
      '.inv-tbl .nm,.inv-tbl th.nm{text-align:start;word-break:break-word;padding-inline-start:0}',
      '.inv-tbl td.tot{font-weight:700}',
      '.inv-sum{display:block!important;margin-top:4px}',
      '.inv-note{font-size:10px;color:#1E3A5F!important;margin:0 0 2px}',
      '.inv-total{display:flex!important;justify-content:space-between;align-items:center;background:none!important;color:#1E3A5F!important;border:0!important;border-top:1px solid #000!important;border-bottom:1px solid #000!important;border-radius:0!important;padding:4px 0!important}',
      '.inv-total span,.inv-total b{color:#1E3A5F!important;opacity:1!important;font-size:13px;font-weight:900}',
      '.inv-foot{text-align:center;font-size:10px;margin-top:6px;padding-top:4px;border-top:1px dashed #000;color:#1E3A5F!important}',
      '.pmv-acts,#pmvQr{display:none!important}'
    ].join('\n');
  }

  window.pmPrintHTML=function(innerHtml){
    var f=document.createElement('iframe');
    f.setAttribute('aria-hidden','true');
    f.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(f);
    var doc=f.contentDocument||(f.contentWindow&&f.contentWindow.document);
    if(!doc){ alert('المتصفح مانعش الطباعة. جرّب تاني.'); f.remove(); return; }
    doc.open();
    doc.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>فاتورة</title><style>'+pmThermalCss()+'</style></head><body><main class="pm-print-main">'+innerHtml+'</main></body></html>');
    doc.close();
    setTimeout(function(){
      try{
        /* نضبط طول الورقة على طول الفاتورة بالظبط، عشان الطابعة الحرارية ما تطبعش مساحة فاضية */
        var main=doc.querySelector('.pm-print-main');
        if(main){
          var mm=Math.ceil((main.getBoundingClientRect().height+12)*25.4/96);
          var st=doc.createElement('style');
          st.textContent='@page{size:'+PM_THERMAL_MM+'mm '+Math.max(40,mm)+'mm;margin:0}';
          doc.head.appendChild(st);
        }
        f.contentWindow.focus(); f.contentWindow.print();
      }
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
