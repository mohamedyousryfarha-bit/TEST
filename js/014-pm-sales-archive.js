(function(){
  /* الفواتير: جدول صفوفه قابلة للطي + رقم فاتورة تلقائي + اسم حساب البائع + ربط بتقفيل الشهر */
  var origRender=window.renderSales, origApply=window.applyRoleUI;
  var openKeys={}, focusNo=null, MAX_SHOW=200;

  function isOwner(){ return cloudActorRole==='admin'; }
  function normQ(s){
    return String(s==null?'':s).toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'')
      .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
  }
  function lineTotal(x){ return Number(x.revenue!=null?x.revenue:(Number(x.qty||0)*Number(x.unitPrice||0)))||0; }
  function stripCosts(x){ if(x&&typeof x==='object'){ delete x.unitCostAtSale; delete x.costAtSale; delete x.unpricedComponents; } return x; }
  function maxNo(list){ return (list||[]).reduce(function(m,x){ return Math.max(m, Number(x&&x.receiptNo)||0); },0); }

  // رقم الفاتورة التالي: أكبر رقم موجود (أو العداد المحفوظ) + 1
  window.nextInvoiceNo=function(){
    var log=(Array.isArray(state.salesLog)?state.salesLog:[]).filter(function(x){return !window.pmIsDrinkLine(x)});
    state.invoiceSeq=Math.max(Number(state.invoiceSeq)||0, maxNo(log))+1;
    return state.invoiceSeq;
  };
  window.pmMaxInvoiceNo=function(list){return maxNo((list||[]).filter(function(x){return !window.pmIsDrinkLine(x)}))};
  window.pmMaxDrinkInvoiceNo=function(list){return maxNo((list||[]).filter(function(x){return window.pmIsDrinkLine(x)}))};
  window.pmInvoiceFocus=function(no){ focusNo=no; };

  // كل فاتورة بتتجمع في صف لوحدها (بمعرّف الفاتورة، وبالرقم لو المعرّف مش موجود). القديم من غير رقم بيظهر "بدون رقم".
  function groupSales(list){
    var map={}, groups=[];
    (list||[]).forEach(function(x,i){
      if(!x||typeof x!=='object')return;
      var key=x.receiptId?'r:'+x.receiptId:(x.receiptNo?'n:'+x.receiptNo:'s:'+i);
      var g=map[key];
      if(!g){
        g=map[key]={key:key,no:x.receiptNo||null,date:x.date||'',at:x.at||'',by:'',note:x.note||'',lines:[],total:0,cost:0,costKnown:true,status:x.invoiceStatus||'closed'};
        groups.push(g);
      }
      if(x.invoiceStatus==='open') g.status='open';
      g.lines.push({x:x,i:i});
      g.total+=lineTotal(x);
      if(x.costAtSale==null||Number(x.unpricedComponents||0)>0)g.costKnown=false; else g.cost+=Number(x.costAtSale)||0;
      if(!g.by&&x.by)g.by=x.by;
      if(!g.at&&x.at)g.at=x.at;
      if(!g.date&&x.date)g.date=x.date;
      if(!g.note&&x.note)g.note=x.note;
      if(!g.customerPhone&&x.customerPhone)g.customerPhone=x.customerPhone;
    });
    groups.sort(function(a,b){
      if(a.no&&b.no&&Number(a.no)!==Number(b.no)) return Number(b.no)-Number(a.no);
      return String(b.at||'').localeCompare(String(a.at||''));
    });
    return groups;
  }
  window.pmGroupInvoices=groupSales;
  window.pmPrintClosedInvoice=function(receiptId){
    var source=(Array.isArray(window.__pmSalesLogServer)&&window.__pmSalesLogServer.length)?window.__pmSalesLogServer:(state.salesLog||[]);
    var g=groupSales(source).find(function(x){return x.lines.some(function(l){return l.x.receiptId===receiptId})});
    if(!g){alert('الفاتورة مش موجودة. حدّث صفحة الفواتير وحاول تاني.');return}
    if(g.status==='open'){alert('الفاتورة لسه مفتوحة؛ لازم كل المشروبات المرتبطة بالطلب تتجهز الأول.');return}
    if(typeof window.pmShowInvoice==='function')window.pmShowInvoice({id:receiptId,no:g.no,date:g.date,by:g.by,note:g.note,customerPhone:g.customerPhone,total:g.total,lines:g.lines.map(function(l){return l.x})});
  };

  function sellerOf(g){ return g.by||'غير مسجّل'; }
  function timeOf(at){
    if(!at)return '';
    var d=new Date(at); if(isNaN(d.getTime()))return '';
    try{ return d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; }
  }
  function sellerStats(groups){
    var map={}, out=[];
    groups.forEach(function(g){
      var n=sellerOf(g), s=map[n];
      if(!s){ s=map[n]={name:n,count:0,total:0}; out.push(s); }
      s.count++; s.total+=g.total;
    });
    out.sort(function(a,b){ return b.total-a.total; });
    return out;
  }

  /* ----- نصوص ومراجعات تُستخدم في تقفيل الشهر والتقرير ----- */
  window.pmInvLine=function(list){
    var g=groupSales(list||[]);
    if(!g.length) return 'لا توجد فواتير';
    var nos=g.map(function(x){return Number(x.no)||0}).filter(function(n){return n>0});
    var range=nos.length?' (من #'+Math.min.apply(null,nos)+' إلى #'+Math.max.apply(null,nos)+')':'';
    return g.length+' فاتورة'+range;
  };
  window.pmSellerLine=function(list){
    var g=groupSales(list||[]);
    if(!g.length) return 'لا توجد مبيعات';
    return sellerStats(g).map(function(s){ return s.name+': '+moneyFmt(s.total)+' ج.م ('+s.count+' فاتورة)'; }).join(' · ');
  };
  window.pmInvCount=function(list){ var n=groupSales(list||[]).length; return n?String(n):'—'; };
  window.pmInvoiceAudit=function(list){
    var g=groupSales(list||[]), noNumber=0, noSeller=0, seen={}, dupes=[];
    g.forEach(function(x){
      if(!x.no)noNumber++;
      if(!x.by)noSeller++;
      if(x.no){ var k=String(x.no); (seen[k]=seen[k]||[]).push(x.key); }
    });
    Object.keys(seen).forEach(function(k){ if(seen[k].length>1)dupes.push('#'+k); });
    return {noNumber:noNumber,noSeller:noSeller,dupes:dupes};
  };
  window.pmInvoiceReportTables=function(list){
    var g=groupSales(list||[]).slice().reverse(), fmt=function(v){return moneyFmt(v)+' ج.م'};
    var total=g.reduce(function(s,x){return s+x.total},0);
    var inv=g.map(function(x){ return [esc(x.no?'#'+x.no:'بدون رقم'),esc(x.date||''),esc(sellerOf(x)),nfmt(x.lines.length),fmt(x.total),esc(x.note||'')]; });
    var sel=sellerStats(g).map(function(s){ return [esc(s.name),nfmt(s.count),fmt(s.total),total?Math.round(s.total/total*100)+'%':'—']; });
    return reportTable('المبيعات حسب البائع',['البائع','عدد الفواتير','إجمالي المبيعات','النسبة'],sel);
  };

/* ----- جدول الفواتير (كل فاتورة صف قابل للطي) ----- */
  function detailHtml(g,owner){
    var cols='<th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th>'+(owner?'<th>التكلفة</th><th></th>':'');
    var rows=g.lines.map(function(l){
      var x=l.x;
      return '<tr><td>'+esc(x.name)+'</td><td>'+nfmt(x.qty)+'</td><td>'+moneyFmt(x.unitPrice||0)+'</td><td>'+moneyFmt(lineTotal(x))+' ج.م</td>'+
        (owner?'<td>'+(x.costAtSale==null?'—':moneyFmt(x.costAtSale)+' ج.م')+'</td><td><button class="danger mini" type="button" onclick="deleteSale('+l.i+')">حذف</button></td>':'')+'</tr>';
    }).join('');
    var statusLabel=g.status==='open'?'مفتوحة — بانتظار اكتمال التحضير':'مقفولة';
    var meta='<div class="inv-meta"><span>رقم الفاتورة: <b>'+(g.no?'#'+esc(g.no):'بدون رقم')+'</b></span><span>الحالة: <b>'+esc(statusLabel)+'</b></span><span>البائع: <b>'+esc(sellerOf(g))+'</b></span><span>التاريخ: <b>'+esc(g.date||'—')+(timeOf(g.at)?' · '+esc(timeOf(g.at)):'')+'</span></div>';
    var note=g.note?'<div class="small">ملاحظة: '+esc(g.note)+'</div>':'';
    var ownerLine=owner?'<div class="small">التكلفة: '+(g.costKnown?moneyFmt(g.cost)+' ج.م · الربح التقديري: '+moneyFmt(g.total-g.cost)+' ج.م':'غير مكتملة (فيه خامات غير مسعّرة)')+'</div>':'';
    var receiptId=g.lines.length&&g.lines[0].x.receiptId?g.lines[0].x.receiptId:'';
    var printLine=g.status==='open'?'<div class="small">الطباعة النهائية متاحة بعد اكتمال التحضير.</div>':(receiptId?'<div class="actions"><button type="button" class="secondary mini" onclick="pmPrintClosedInvoice(\''+esc(receiptId)+'\')">طباعة الفاتورة</button></div>':'');
    return meta+'<div class="tablewrap"><table class="inv-items"><tr>'+cols+'</tr>'+rows+'</table></div>'+note+ownerLine+printLine;
  }
  function invoiceTable(groups,opt){
    opt=opt||{};
    if(!groups.length) return '<div class="empty">'+esc(opt.empty||'لا توجد فواتير.')+'</div>';
    var owner=isOwner()&&!opt.readOnly, ns=opt.ns||'i';
    var body=groups.slice(0,MAX_SHOW).map(function(g){
      var k=ns+':'+g.key, open=!!openKeys[k];
      return '<tbody class="inv'+(open?' open':'')+'" data-k="'+esc(k)+'">'+
        '<tr class="inv-row" tabindex="0" role="button" aria-expanded="'+(open?'true':'false')+'">'+
          '<td class="inv-no"><b>'+(g.no?'#'+esc(g.no):'بدون رقم')+'</b><span class="small">'+esc(g.date||'')+(timeOf(g.at)?' · '+esc(timeOf(g.at)):'')+'</span></td>'+
          '<td><span class="inv-by">'+esc(sellerOf(g))+'</span><span class="small">'+(g.status==='open'?'مفتوحة · بانتظار التحضير':'مقفولة')+' · '+g.lines.length+' صنف'+(g.note?' · '+esc(g.note):'')+'</span></td>'+
          '<td class="inv-tot">'+moneyFmt(g.total)+' ج.م</td>'+
          '<td class="inv-chev" aria-hidden="true">▾</td></tr>'+
        '<tr class="inv-detail"><td colspan="4">'+detailHtml(g,owner)+'</td></tr></tbody>';
    }).join('');
    return '<div class="tablewrap"><table class="inv-table"><thead><tr><th>الفاتورة</th><th>البائع</th><th>الإجمالي</th><th></th></tr></thead>'+body+'</table></div>'+
      (groups.length>MAX_SHOW?'<div class="small">بيعرض أول '+MAX_SHOW+' فاتورة.</div>':'');
  }
  function toggleRow(r){
    var b=r.parentNode, open=!b.classList.contains('open');
    b.classList.toggle('open',open);
    r.setAttribute('aria-expanded',open?'true':'false');
    var k=b.getAttribute('data-k');
    if(open)openKeys[k]=true; else delete openKeys[k];
  }
  document.addEventListener('click',function(e){
    var r=e.target.closest&&e.target.closest('.inv-row'); if(r)toggleRow(r);
  });
  document.addEventListener('keydown',function(e){
    var t=e.target;
    if((e.key==='Enter'||e.key===' ')&&t&&t.classList&&t.classList.contains('inv-row')){ e.preventDefault(); toggleRow(t); }
  });

  function matches(g,q,seller){
    if(seller&&g.by!==seller)return false;
    if(!q)return true;
    if(/^\d+$/.test(q)&&String(g.no)===q)return true;
    var hay=normQ([g.by,g.note].concat(g.lines.map(function(l){return l.x.name})).join(' '));
    return hay.indexOf(q)!==-1;
  }
  function populateSellers(all){
    var sel=document.getElementById('invSeller'); if(!sel)return;
    var prev=sel.value, names=[];
    all.forEach(function(g){ if(g.by&&names.indexOf(g.by)===-1)names.push(g.by); });
    names.sort(function(a,b){ return a.localeCompare(b,'ar'); });
    sel.innerHTML='<option value="">كل البائعين</option>'+names.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join('');
    if(prev&&names.indexOf(prev)!==-1)sel.value=prev;
  }
  function renderPeriodNote(all){
    var el=document.getElementById('invPeriodNote'); if(!el)return;
    var last=(state.monthlyArchives||[]).slice(-1)[0];
    var total=all.reduce(function(s,g){return s+g.total},0);
    el.innerHTML='فواتير <b>الفترة الحالية</b> (لم تُقفَل بعد): <b>'+all.length+'</b> فاتورة · إجمالي <b>'+moneyFmt(total)+' ج.م</b>'+
      (last?' · آخر تقفيل: '+esc(last.label):' · لا يوجد تقفيل سابق')+
      '. عند <b>تقفيل الشهر</b> تُؤرشف الفواتير بأرقامها وأسماء البائعين وتدخل في تقرير الشهر.'+
      (isOwner()?' <button class="secondary mini" type="button" onclick="go(\'monthly\')" style="margin-top:6px">الذهاب لتقفيل الشهر</button>':'');
  }
  function renderArchive(){
    var box=document.getElementById('salesTable'); if(!box)return;
    var cnt=document.getElementById('salesCount');
    var q=normQ((document.getElementById('salesSearch')||{}).value||'');
    var srcLog=Array.isArray(window.__pmSalesLogServer)?window.__pmSalesLogServer:(Array.isArray(state.salesLog)?state.salesLog:[]);
    var all=groupSales(srcLog);
    if(focusNo!=null){
      all.forEach(function(g){ if(g.no!=null&&String(g.no)===String(focusNo))openKeys['i:'+g.key]=true; });
      focusNo=null;
    }
    populateSellers(all);
    var seller=(document.getElementById('invSeller')||{}).value||'';
    renderPeriodNote(all);
    var list=all.filter(function(g){return matches(g,q,seller)});
    if(cnt)cnt.textContent=list.length+' فاتورة'+((q||seller)?' من '+all.length:'')+(list.length>MAX_SHOW?' · بيعرض أول '+MAX_SHOW+'، ضيّق البحث':'');
    box.innerHTML=invoiceTable(list,{ns:'i',empty:all.length?'مفيش فواتير بتطابق البحث.':'لا توجد فواتير مسجلة في الفترة الحالية.'});
  }
  window.pmSalesSearch=function(){ renderArchive(); };
  window.pmSalesArchiveRender=function(){ renderArchive(); };

  /* ----- كارت الفواتير والبائعين داخل تقفيل الشهر ----- */
  function ensureMonthCard(){
    var card=document.getElementById('monthInvoicesCard'); if(card)return card;
    var sum=document.getElementById('monthlySummary'), host=sum&&sum.closest('.card'); if(!host)return null;
    card=document.createElement('div'); card.className='card'; card.id='monthInvoicesCard';
    host.parentNode.insertBefore(card,host.nextSibling);
    return card;
  }
  function renderMonthInvoices(){
    var card=ensureMonthCard(); if(!card)return;
    if(!isOwner()){ card.style.display='none'; return; }
    card.style.display='';
    var groups=groupSales(Array.isArray(state.salesLog)?state.salesLog:[]);
    var total=groups.reduce(function(s,g){return s+g.total},0), st=sellerStats(groups);
    var sellersHtml=st.length?'<div class="tablewrap"><table class="inv-items"><tr><th>البائع</th><th>الفواتير</th><th>الإجمالي</th><th>النسبة</th></tr>'+
      st.map(function(s){ return '<tr><td>'+esc(s.name)+'</td><td>'+s.count+'</td><td>'+moneyFmt(s.total)+' ج.م</td><td>'+(total?Math.round(s.total/total*100)+'%':'—')+'</td></tr>'; }).join('')+'</table></div>':'';
    card.innerHTML='<div class="sectionhead"><h2>فواتير الشهر الحالي والبائعين</h2></div>'+
      '<p class="small">كل فواتير الفترة الحالية بتدخل في مراجعة التقفيل وتقرير الشهر وأرشيفه بأرقامها وأسماء البائعين.</p>'+
      '<div class="stats"><div class="stat"><b>'+groups.length+'</b><span>عدد الفواتير</span></div>'+
      '<div class="stat"><b>'+moneyFmt(total)+' ج.م</b><span>إجمالي الفواتير</span></div>'+
      '<div class="stat"><b>'+(groups.length?moneyFmt(total/groups.length):0)+' ج.م</b><span>متوسط الفاتورة</span></div>'+
      '<div class="stat"><b>'+st.length+'</b><span>عدد حسابات البائعين</span></div></div>'+
      (sellersHtml?'<h3>المبيعات حسب البائع</h3>'+sellersHtml:'')+
      '<h3>الفواتير</h3>'+invoiceTable(groups,{ns:'m',readOnly:true,empty:'مفيش فواتير في الفترة الحالية.'});
  }

  window.renderSales=function(){
    if(cloudActorRole==='sales'&&Array.isArray(state.salesLog))state.salesLog.forEach(stripCosts);
    var r=origRender?origRender.apply(this,arguments):undefined;
    renderArchive();
    try{ renderMonthInvoices(); }catch(e){}
    return r;
  };

  var origMonthly=window.renderMonthly;
  if(typeof origMonthly==='function'){
    window.renderMonthly=function(){
      var r=origMonthly.apply(this,arguments);
      try{ renderMonthInvoices(); }catch(e){}
      return r;
    };
  }
  var origAll=window.renderAll;
  if(typeof origAll==='function'){
    window.renderAll=function(){
      var r=origAll.apply(this,arguments);
      try{
        var p=document.getElementById('cartpage');
        if(p&&p.classList.contains('active')){
          if(typeof window.renderCart==='function')window.renderCart();
          window.renderSales();
        }
      }catch(e){}
      return r;
    };
  }

  if(typeof origApply==='function'){
    window.applyRoleUI=function(){
      var r=origApply.apply(this,arguments);
      var el=document.getElementById('financialSummary'), card=el&&el.closest('.card');
      if(card) card.style.display=isOwner()?'':'none';
      var inv=document.getElementById('invoicesCard');
      if(inv) inv.style.display=isOwner()?'':'none';
      var cp=document.getElementById('cartpage');
      if(cp) cp.querySelectorAll('.card').forEach(function(c){ c.style.display=isOwner()?'':'none'; });
      // الشيف: ممنوع يشوف تبويب السلة خالص
      var kitchen=cloudActorRole==='kitchen';
      document.querySelectorAll('.tabs .tab[data-tab="cartpage"]').forEach(function(b){ b.style.display=(!kitchen&&(cloudActorRole==='admin'||cloudActorRole==='sales'))?'':'none'; });
      if(cp) cp.style.display=(!kitchen&&(cloudActorRole==='admin'||cloudActorRole==='sales'))?'':'none';
      if(kitchen && cp && cp.classList.contains('active') && typeof window.go==='function') window.go('order');
      return r;
    };
  }
})();
