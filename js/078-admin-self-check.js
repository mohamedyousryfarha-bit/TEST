(function(){
  if(window.__pmSelf) return; window.__pmSelf=true;
  function S(){ return (typeof state!=='undefined'&&state)?state:(window.state||{}); }
  function isAdmin(){ return (typeof cloudActorRole!=='undefined'&&cloudActorRole==='admin'); }
  function E(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function money(v){ return (Math.round((Number(v)||0)*100)/100).toLocaleString('ar-EG'); }
  function arr(v){ return Array.isArray(v)?v:[]; }
  function uniq(a){ return a.filter(function(v,i){return a.indexOf(v)===i}); }

  function showModal(title, html){
    var old=document.getElementById('pmSelfModal'); if(old) old.remove();
    var ov=document.createElement('div'); ov.id='pmSelfModal';
    ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(39,21,11,.58);display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML='<div style="background:#fff;border-radius:18px;max-width:600px;width:100%;max-height:88vh;overflow:auto;padding:18px;direction:rtl;color:#1E3A5F">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0;font-size:17px;color:#1E3A5F">'+E(title)+'</h2>'+
      '<button type="button" id="pmSelfClose" class="secondary mini">إغلاق</button></div>'+
      '<div style="margin-top:12px;font-size:13px">'+html+'</div></div>';
    ov.addEventListener('click',function(e){ if(e.target===ov||e.target.id==='pmSelfClose') ov.remove(); });
    document.body.appendChild(ov);
  }

  /* ---------- فحص سلامة البيانات (قراءة فقط) ---------- */
  function integrity(){
    var s=S(), out=[];
    var sales=arr(s.salesLog), inv=arr(s.inventory).filter(function(x){return x&&x.name});
    var rec=s.recipes||{}, pr=s.prices||{};
    inv.filter(function(x){return !(Number(x.qty)>=0)}).forEach(function(x){ out.push({sev:0,msg:'خامة رصيدها سالب أو غلط: '+x.name}); });
    try{
      var au=(typeof window.pmInvoiceAudit==='function')?window.pmInvoiceAudit(sales):null;
      if(au){
        if(au.dupes&&au.dupes.length) out.push({sev:0,msg:'أرقام فواتير مكررة: '+au.dupes.join('، ')});
        if(au.noNumber) out.push({sev:2,msg:au.noNumber+' بيع من غير رقم فاتورة (سجلات قديمة)'});
        if(au.noSeller) out.push({sev:2,msg:au.noSeller+' فاتورة من غير اسم بائع'});
      }
    }catch(e){}
    var noRecipe=uniq(sales.filter(function(x){return x&&x.name&&!rec[x.name]}).map(function(x){return x.name}));
    if(noRecipe.length) out.push({sev:1,msg:'أصناف بتتباع ملهاش وصفة: '+noRecipe.join('، ')});
    var noCost=sales.filter(function(x){return x&&x.costAtSale==null}).length;
    if(noCost) out.push({sev:1,msg:noCost+' بيع بدون تكلفة محسوبة'});
    var noPrice=uniq(inv.filter(function(x){return Number(x.qty)>0 && !(pr[x.name]&&Number(pr[x.name].purchasePrice)>0&&Number(pr[x.name].packSize)>0)}).map(function(x){return x.name}));
    if(noPrice.length) out.push({sev:1,msg:'خامات فيها رصيد من غير سعر: '+noPrice.join('، ')});
    var wNo=arr(s.wasteLog).filter(function(x){return x&&x.costAtWaste==null}).length;
    if(wNo) out.push({sev:2,msg:wNo+' عملية هالك بدون تكلفة'});
    var badExp=arr(s.expensesLog).filter(function(x){return !(Number(x.amount)>=0)}).length;
    if(badExp) out.push({sev:0,msg:badExp+' مصروف قيمته غلط'});
    var badPur=arr(s.purchasesLog).filter(function(x){return !(Number(x.totalCost)>=0)||!(Number(x.qty)>0)}).length;
    if(badPur) out.push({sev:0,msg:badPur+' عملية شراء كميتها أو إجماليها غلط'});
    var labels=arr(s.monthlyArchives).map(function(a){return a.label||''});
    var dupLabels=uniq(labels.filter(function(l,i){return labels.indexOf(l)!==i}));
    if(dupLabels.length) out.push({sev:0,msg:'أرشيفات بنفس الاسم: '+dupLabels.join('، ')});
    var openSales=sales.filter(function(x){return x&&x.invoiceStatus==='open'}).length;
    if(openSales) out.push({sev:2,msg:openSales+' صنف في فواتير مفتوحة'});
    if(typeof window.pmOpenPartyInvoices==='function'){
      window.pmOpenPartyInvoices().forEach(function(i){
        var p=(window.__pmPaySummary||{})[i.key], rem=Math.max(0,(Number(i.total)||0)-(p?(Number(p.paid)||0):0));
        var old=i.deliveredAt && (Date.now()-Date.parse(i.deliveredAt))>7*864e5;
        if(rem>0 && old) out.push({sev:1,msg:'حفلة '+(i.customer||'—')+' عليها متبقي '+money(rem)+' من أكتر من 7 أيام'});
      });
    }
    var L=arr(s.stockCounts)[0];
    if(!L) out.push({sev:2,msg:'مفيش جرد مسجل للمخزون'});
    else if(Date.now()-Date.parse(L.date)>30*864e5) out.push({sev:2,msg:'آخر جرد أقدم من 30 يوم'});
    return out.sort(function(a,b){return a.sev-b.sev});
  }
  function runCheck(){
    var list=integrity(), names=['عالي','متوسط','منخفض'], colors=['#B42318','#9A5B00','#1E3A5F'];
    var body = list.length
      ? '<table style="width:100%;border-collapse:collapse">'+list.map(function(x){
          return '<tr style="border-bottom:1px solid #EAE2DD"><td style="padding:7px;width:80px;font-weight:800;color:'+colors[x.sev]+'">'+names[x.sev]+'</td><td style="padding:7px">'+E(x.msg)+'</td></tr>';
        }).join('')+'</table>'
      : '<div style="background:#EAF7EF;color:#145C38;border-radius:10px;padding:10px">✓ مفيش مشاكل ظاهرة في البيانات.</div>';
    showModal('فحص سلامة البيانات ('+list.length+' ملاحظة)', body+'<p class="small" style="color:#4A6583">الفحص للقراءة بس، ومابيغيرش أي بيانات.</p>');
  }

  /* ---------- اختبار الحسابات على بيانات تجريبية معروفة النتيجة ---------- */
  function runTests(){
    var mm=window.monthMetrics;
    if(typeof mm!=='function'){ showModal('اختبار الحسابات','<p>دالة الحساب مش متاحة.</p>'); return; }
    function base(o){ return Object.assign({salesLog:[],expensesLog:[],purchasesLog:[],productionLog:[],history:[],wasteLog:[],partyInvoices:[],inventory:[]},o); }
    var T=[
      {n:'بيع 90 وتكلفته 45 ⇒ ربح 45', a:base({salesLog:[{name:'كيك',qty:1,unitPrice:90,revenue:90,costAtSale:45}]}), m:'profit', e:45},
      {n:'بيع 90 ومشتريات 300 ⇒ الحركة النقدية -210', a:base({salesLog:[{name:'كيك',qty:1,unitPrice:90,revenue:90,costAtSale:45}],purchasesLog:[{totalCost:300,qty:1}]}), m:'cashNet', e:-210},
      {n:'الإيراد = الكمية × السعر (3 × 10 = 30) ⇒ ربح 18 مع تكلفة 12', a:base({salesLog:[{name:'x',qty:3,unitPrice:10,costAtSale:12}]}), m:'profit', e:18},
      {n:'مصروف 10 على بيع 100 وتكلفة 20 ⇒ ربح 70', a:base({salesLog:[{name:'x',qty:2,unitPrice:50,revenue:100,costAtSale:20}],expensesLog:[{amount:10,category:'كهربا'}]}), m:'profit', e:70},
      {n:'هالك بتكلفة 5 ⇒ يتخصم من الربح (75)', a:base({salesLog:[{name:'x',qty:2,unitPrice:50,revenue:100,costAtSale:20}],wasteLog:[{qty:1,costAtWaste:5}]}), m:'profit', e:75},
      {n:'حفلة 100 تكلفتها 40 ⇒ ربح 60', a:base({partyInvoices:[{total:100,cost:40,paid:30}]}), m:'profit', e:60},
      {n:'حفلة 100 مدفوع منها 30 ⇒ الكاش 30', a:base({partyInvoices:[{total:100,cost:40,paid:30}]}), m:'cashNet', e:30}
    ];
    var rows='', fails=0;
    T.forEach(function(t){
      var got; try{ got=Number(mm(t.a)[t.m]); }catch(e){ got=NaN; }
      var ok=Math.abs(got-t.e)<0.01; if(!ok) fails++;
      rows+='<tr style="border-bottom:1px solid #EAE2DD"><td style="padding:7px">'+E(t.n)+'</td>'+
        '<td style="padding:7px">'+(Number.isFinite(got)?money(got):'خطأ')+'</td>'+
        '<td style="padding:7px;font-weight:800;color:'+(ok?'#16794B':'#B42318')+'">'+(ok?'✓ نجح':'✗ فشل (المتوقع '+money(t.e)+')')+'</td></tr>';
    });
    var summary = fails
      ? '<div style="background:#FFF0EE;color:#8E2018;border-radius:10px;padding:10px">✗ فشل '+fails+' من '+T.length+'. في معادلة اتغيرت، راجع آخر تعديل قبل ما تقفّل.</div>'
      : '<div style="background:#EAF7EF;color:#145C38;border-radius:10px;padding:10px">✓ كل الاختبارات ('+T.length+') نجحت.</div>';
    showModal('اختبار الحسابات', summary+'<table style="width:100%;border-collapse:collapse;margin-top:10px"><tr><th style="text-align:right;padding:6px">الاختبار</th><th style="padding:6px">الناتج</th><th style="padding:6px">النتيجة</th></tr>'+rows+'</table>');
  }

  /* ---------- زراير في القائمة الجانبية (للمدير بس) ---------- */
  function ensure(){
    var box=document.getElementById('drawerTools'); if(!box) return;
    var have=box.querySelectorAll('.acct-tool');
    if(!isAdmin()){ have.forEach(function(b){ b.remove(); }); return; }
    if(have.length) return;
    [['check','فحص سلامة البيانات',runCheck,'shield'],['test','اختبار الحسابات',runTests,'check']].forEach(function(p){
      var b=document.createElement('button'); b.type='button'; b.className='pm-mi acct-tool'; b.innerHTML=(window.__PMUI__&&window.__PMUI__.iconHTML?window.__PMUI__.iconHTML(p[3]):'')+' '+p[1];
      b.addEventListener('click',function(){
        var c=document.getElementById('drawerClose'); if(c) c.click();
        setTimeout(p[2],50);
      });
      box.appendChild(b);
    });
  }
  setInterval(ensure,1000);
})();
