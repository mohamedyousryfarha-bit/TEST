(function(){
  if(window.__pmAcct2) return; window.__pmAcct2=true;
  function S(){ return (typeof state!=='undefined'&&state)?state:window.state; }
  function isAdmin(){ return (typeof cloudActorRole!=='undefined'&&cloudActorRole==='admin'); }
  function E(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function fmt(v){ return (Math.round((Number(v)||0)*1000)/1000).toLocaleString('ar-EG'); }
  function money(v){ return (Math.round((Number(v)||0))).toLocaleString('ar-EG')+' ج.م'; }
  function pct(v){ return (Math.round((Number(v)||0)*10)/10).toLocaleString('ar-EG')+'%'; }
  function dateTxt(v){ try{return new Date(v).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'})}catch(e){return ''} }
  function invList(){ var s=S(); return ((s&&Array.isArray(s.inventory))?s.inventory:[]).filter(function(x){return x&&x.name}); }
  function latestCount(){ var s=S(); return (s&&Array.isArray(s.stockCounts)&&s.stockCounts[0])||null; }

  /* ---------- سجل تغيير أسعار الخامات ---------- */
  var lastPrices=null;
  function trackPrices(){
    var s=S(); if(!s||!s.prices) return;
    var cur=JSON.parse(JSON.stringify(s.prices));
    if(lastPrices===null){ lastPrices=cur; return; }
    var changes=[];
    Object.keys(cur).forEach(function(n){
      var a=lastPrices[n]||{}, b=cur[n]||{};
      if(Number(a.purchasePrice)!==Number(b.purchasePrice)||Number(a.packSize)!==Number(b.packSize)){
        changes.push({date:new Date().toISOString(), name:n,
          oldPrice:Number(a.purchasePrice)||0, newPrice:Number(b.purchasePrice)||0,
          oldPack:Number(a.packSize)||0, newPack:Number(b.packSize)||0});
      }
    });
    if(changes.length) s.priceChanges=(Array.isArray(s.priceChanges)?s.priceChanges:[]).concat(changes).slice(-200);
    lastPrices=cur;
  }
  var _save=window.save;
  if(typeof _save==='function'){
    window.save=function(){ try{ trackPrices(); }catch(e){} return _save.apply(this,arguments); };
  }

  /* ---------- هامش كل صنف من المبيعات الحالية ---------- */
  function marginRows(){
    var s=S(), sales=(s&&Array.isArray(s.salesLog))?s.salesLog:[], by={};
    sales.forEach(function(x){
      if(!x||!x.name||x.costAtSale==null) return;
      var rev=Number(x.revenue!=null?x.revenue:(Number(x.qty)||0)*(Number(x.unitPrice)||0))||0;
      var o=by[x.name]||(by[x.name]={name:x.name,rev:0,cost:0,qty:0});
      o.rev+=rev; o.cost+=Number(x.costAtSale)||0; o.qty+=Number(x.qty)||0;
    });
    var meta=(s&&s.recipeMeta)||{};
    return Object.keys(by).map(function(k){
      var o=by[k], m=o.rev>0?(o.rev-o.cost)/o.rev*100:0;
      return {name:k, qty:o.qty, rev:o.rev, margin:m, target:Number((meta[k]||{}).marginPct)||0};
    }).sort(function(a,b){return a.margin-b.margin});
  }

  /* ---------- مستحقات العملاء (فواتير الحفلات المتبقي عليها) ---------- */
  function receivables(){
    var list=(typeof window.pmOpenPartyInvoices==='function')?window.pmOpenPartyInvoices():[];
    var pay=window.__pmPaySummary||{}, sum=0, rows=[], unknown=0;
    list.forEach(function(i){
      var p=pay[i.key];
      if(!p) unknown++;
      var rem=Math.max(0,(Number(i.total)||0)-(p?(Number(p.paid)||0):0));
      if(rem>0){ sum+=rem; rows.push({customer:i.customer||'—', rem:rem}); }
    });
    return {sum:sum, rows:rows, unknown:unknown};
  }

  /* ---------- مقارنة الأشهر ---------- */
  function monthRows(){
    var out=[], s=S();
    if(typeof window.monthMetrics!=='function'||!s) return out;
    var live=window.monthMetrics({salesLog:s.salesLog||[], expensesLog:s.expensesLog||[], purchasesLog:s.purchasesLog||[],
      productionLog:s.productionLog||[], history:s.history||[], wasteLog:s.wasteLog||[],
      partyInvoices:(typeof window.pmOpenPartyInvoices==='function'?window.pmOpenPartyInvoices():[]),
      inventory:s.inventory||[]});
    out.push({label:'الشهر الحالي (مفتوح)', m:live});
    (Array.isArray(s.monthlyArchives)?s.monthlyArchives:[]).slice(-3).reverse().forEach(function(a){
      out.push({label:a.label||'—', m:window.monthMetrics(a)});
    });
    return out;
  }

  /* ---------- بناء الكارت (للمدير فقط) ---------- */
  function build(){
    var host=document.getElementById('monthly'); if(!host) return;
    var card=document.getElementById('pmAcctCard');
    if(!card){ card=document.createElement('div'); card.id='pmAcctCard'; card.className='card'; host.insertBefore(card, host.firstChild); }
    if(!isAdmin()){ card.style.display='none'; card.innerHTML=''; return; }
    card.style.display='';

    var list=invList(), L=latestCount();
    var countRows=list.map(function(x,i){
      return '<tr><td>'+E(x.name)+'</td><td>'+E(x.unit||'')+'</td><td>'+fmt(x.qty)+'</td>'+
        '<td><input type="number" step="any" min="0" data-acct-i="'+i+'" style="width:90px;padding:6px"></td>'+
        '<td data-acct-d="'+i+'">—</td></tr>';
    }).join('');
    var lastTxt = L
      ? '<div class="notice-ok">آخر جرد: '+E(dateTxt(L.date))+' · خامات فيها فرق: '+(L.items||[]).filter(function(x){return Number(x.diff)!==0}).length+'</div>'
      : '<div class="danger-note">لم يتم جرد المخزون بعد.</div>';

    var mr=marginRows();
    var marginHtml = mr.length
      ? '<div class="tablewrap"><table><tr><th>الصنف</th><th>الكمية</th><th>المبيعات</th><th>الهامش الفعلي</th><th>الهدف</th></tr>'+
        mr.map(function(r){
          var low = r.target>0 && r.margin<r.target;
          return '<tr><td>'+E(r.name)+'</td><td>'+fmt(r.qty)+'</td><td>'+money(r.rev)+'</td>'+
            '<td style="color:'+(low?'#B42318':'inherit')+';font-weight:'+(low?'800':'400')+'">'+pct(r.margin)+(low?' ⚠':'')+'</td>'+
            '<td>'+(r.target>0?pct(r.target):'—')+'</td></tr>';
        }).join('')+'</table></div>'
      : '<div class="empty">لا توجد مبيعات بتكلفة محسوبة في الفترة الحالية.</div>';

    var rc=receivables();
    var recHtml='<div class="stat"><b>'+money(rc.sum)+'</b><span>مستحق على العملاء (حفلات)</span></div>'+
      (rc.unknown?'<div class="small">'+rc.unknown+' فاتورة لم يتم تحميل حالة دفعها؛ افتح قسم الحفلات عشان الرقم يبقى دقيق.</div>':'')+
      (rc.rows.length?'<div class="tablewrap"><table><tr><th>العميل</th><th>المتبقي</th></tr>'+
        rc.rows.slice(0,10).map(function(r){return '<tr><td>'+E(r.customer)+'</td><td>'+money(r.rem)+'</td></tr>'}).join('')+'</table></div>':'');

    var pc=(Array.isArray(S().priceChanges)?S().priceChanges:[]).slice(-10).reverse();
    var priceHtml = pc.length
      ? '<div class="tablewrap"><table><tr><th>التاريخ</th><th>الخامة</th><th>السعر قبل</th><th>السعر بعد</th></tr>'+
        pc.map(function(x){return '<tr><td>'+E(dateTxt(x.date))+'</td><td>'+E(x.name)+'</td><td>'+money(x.oldPrice)+' / '+fmt(x.oldPack)+'</td><td>'+money(x.newPrice)+' / '+fmt(x.newPack)+'</td></tr>'}).join('')+'</table></div>'
      : '<div class="empty">لم يتم تسجيل تغيير أسعار بعد.</div>';

    var mrows=monthRows();
    var cmpHtml = mrows.length
      ? '<div class="tablewrap"><table><tr><th>الفترة</th><th>المبيعات</th><th>الربح</th><th>الحركة النقدية</th></tr>'+
        mrows.map(function(r){return '<tr><td>'+E(r.label)+'</td><td>'+money(r.m.revenue)+'</td><td>'+money(r.m.profit)+'</td><td>'+money(r.m.cashNet)+'</td></tr>'}).join('')+'</table></div>'
      : '<div class="empty">لا توجد بيانات أشهر بعد.</div>';

    card.innerHTML =
      '<h2>المحاسب</h2>'+
      '<p class="small">الأقسام دي للمدير بس.</p>'+
      '<h3>جرد المخزون الفعلي</h3>'+
      '<p class="small">اكتب الكمية الفعلية الموجودة في المخزن لكل خامة، والتطبيق بيقارنها بالرصيد المسجل.</p>'+
      lastTxt+
      (list.length
        ? '<div class="tablewrap"><table><tr><th>الخامة</th><th>الوحدة</th><th>المسجل</th><th>الفعلي</th><th>الفرق</th></tr>'+countRows+'</table></div>'+
          '<div class="actions"><button type="button" class="primary" id="pmAcctSave">حفظ الجرد</button></div>'
        : '<div class="empty">لا توجد خامات في المخزون.</div>')+
      '<h3>هامش كل صنف</h3>'+
      '<p class="small">الهامش = (المبيعات − تكلفة البيع) ÷ المبيعات. ⚠ يعني تحت الهدف المحدد للصنف.</p>'+marginHtml+
      '<h3>مستحقات العملاء</h3>'+recHtml+
      '<h3>تغيير أسعار الخامات</h3>'+priceHtml+
      '<h3>مقارنة الأشهر</h3>'+cmpHtml+
      '<p class="small">غير متاح حالياً: جرد أول المدة ومطابقة الإنتاج لكل صنف، لأن التطبيق ما بيسجلش رصيد أول الشهر ولا الكميات المنتجة بشكل يسمح بالمطابقة. ومستحقات الموردين غير مسجلة في التطبيق.</p>';

    card.querySelectorAll('input[data-acct-i]').forEach(function(inp){
      inp.addEventListener('input', function(){
        var i=Number(inp.getAttribute('data-acct-i')), x=list[i];
        var td=card.querySelector('td[data-acct-d="'+i+'"]');
        if(!x||inp.value===''){ td.textContent='—'; td.style.color=''; td.style.fontWeight=''; return; }
        var d=Math.round((Number(inp.value)-Number(x.qty||0))*1000)/1000;
        td.textContent=(d>0?'+':'')+fmt(d)+' '+(x.unit||'');
        td.style.color=d===0?'':'#B42318'; td.style.fontWeight=d===0?'':'800';
      });
    });
    var b=document.getElementById('pmAcctSave'); if(b) b.onclick=saveCount;
  }

  function saveCount(){
    if(!isAdmin()){ alert('الجرد للمدير بس.'); return; }
    var s=S(); if(!s) return;
    var list=invList(), items=[], any=false, bad=false;
    list.forEach(function(x,i){
      var inp=document.querySelector('#pmAcctCard input[data-acct-i="'+i+'"]');
      if(!inp||inp.value==='') return;
      any=true;
      var actual=Number(inp.value);
      if(!Number.isFinite(actual)||actual<0){ bad=true; return; }
      var rec=Number(x.qty||0);
      items.push({name:x.name, unit:x.unit||'', recorded:rec, actual:actual, diff:Math.round((actual-rec)*1000)/1000});
    });
    if(!any){ alert('اكتب الكمية الفعلية لخامة واحدة على الأقل.'); return; }
    if(bad){ alert('الكمية الفعلية لازم تكون رقم صفر أو أكبر.'); return; }
    s.stockCounts=Array.isArray(s.stockCounts)?s.stockCounts:[];
    s.stockCounts.unshift({date:new Date().toISOString(), items:items});
    if(typeof window.save==='function') window.save();
    var diffs=items.filter(function(x){return x.diff!==0}).length;
    alert('تم حفظ الجرد. '+(diffs?'فيه '+diffs+' خامة فيها فرق، راجعها قبل التقفيل.':'مفيش فروق.'));
    build();
  }

  var _go=window.go;
  if(typeof _go==='function'){
    window.go=function(id){ var r=_go.apply(this,arguments); if(id==='monthly') setTimeout(build,0); return r; };
  }
  function start(){ setTimeout(build,300); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
