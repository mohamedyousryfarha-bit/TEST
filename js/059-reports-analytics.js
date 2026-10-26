(function(){
  'use strict';
  window.__goPost=window.__goPost||[];
  var sel='cur';

  function S(){ return (typeof state!=='undefined'&&state)?state:(window.state||{}); }
  function arr(v){ return Array.isArray(v)?v:[]; }
  function obj(v){ return (v&&typeof v==='object')?v:{}; }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function num(v){ var n=Number(v); return isFinite(n)?n:0; }
  function fmt(v,d){ return (Math.round(num(v)*100)/100).toLocaleString('en-US',{maximumFractionDigits:(d==null?2:d)}); }
  function money(v){ return fmt(v,0)+' ج.م'; }
  function qtyOf(v,u){ return fmt(v)+(u?' '+u:' قطعة'); }
  function isDrink(x){ return !!x && (x.group==='drink' || (typeof window.pmIsDrinkLine==='function' && window.pmIsDrinkLine(x))); }
  function dayOf(x){ return String((x&&(x.date||x.at))||'').slice(0,10)||'—'; }
  function normKey(n){ return String(n||'').trim().replace(/\s+/g,' ').toLowerCase(); }
  function digitsOf(p){ return String(p||'').replace(/\D/g,''); }

  // ===== الفترات: الشهر الحالي + كل شهر في الأرشيف =====
  var LISTS=['salesLog','expensesLog','purchasesLog','wasteLog','productionLog','history','partyOrders','drinkOrders','partyInvoices'];
  function periods(){
    var s=S(), out=[], archives=arr(s.monthlyArchives);
    out.push({key:'cur',label:'الشهر الحالي',live:true,src:{
      salesLog:pmRecostMissing(arr(s.salesLog)), expensesLog:arr(s.expensesLog), purchasesLog:arr(s.purchasesLog),
      wasteLog:pmRecostWaste(arr(s.wasteLog)), productionLog:arr(s.productionPieces), history:arr(s.history),
      partyOrders:arr(s.partyOrders).filter(function(o){return !(o&&o.closedArchiveId)}), drinkOrders:arr(s.drinkOrders), inventory:arr(s.inventory), partyInvoices:(window.pmOpenPartyInvoices?window.pmOpenPartyInvoices():[])}});
    archives.forEach(function(a,i){
      out.push({key:'arc:'+i, label:'أرشيف: '+(a.label||('#'+(i+1))), live:false, src:{
        salesLog:arr(a.salesLog), expensesLog:arr(a.expensesLog), purchasesLog:arr(a.purchasesLog),
        wasteLog:arr(a.wasteLog), productionLog:arr(a.productionLog), history:arr(a.history),
        partyOrders:[], drinkOrders:[], inventory:arr(a.inventory), partyInvoices:arr(a.partyInvoices)}});
    });
    return out;
  }
  function collect(key){
    var P=periods(), pick=(key==='all')?P:P.filter(function(p){return p.key===key;});
    if(!pick.length) pick=[P[0]];
    var m={isAll:key==='all', live:false, inventory:[]};
    LISTS.forEach(function(k){ m[k]=[]; });
    pick.forEach(function(p){ LISTS.forEach(function(k){ m[k]=m[k].concat(p.src[k]); }); });
    if(pick.length===1){ m.inventory=pick[0].src.inventory; m.live=pick[0].live; }
    else { m.inventory=arr(S().inventory); m.live=true; }
    m.prices=obj(S().prices); m.menu=arr(S().menu); m.recipes=obj(S().recipes);
    return m;
  }

  // ===== الحسابات =====
  function compute(m){
    var R={rev:0,cost:0,costUnknown:0,qty:0,openLines:0,foodRev:0,drinkRev:0,foodQty:0,drinkQty:0};
    var inv={}, days={}, byProd={};
    arr(m.salesLog).forEach(function(x){
      if(!x||typeof x!=='object') return;
      var r=(x.revenue!=null)?num(x.revenue):num(x.qty)*num(x.unitPrice), q=num(x.qty);
      R.rev+=r; R.qty+=q;
      if(x.costAtSale==null) R.costUnknown++; else R.cost+=num(x.costAtSale);
      if(x.invoiceStatus==='open') R.openLines++;
      var rid=String(x.receiptId||x.receiptNo||'');
      if(rid){
        var v=inv[rid]||(inv[rid]={rev:0,name:'',phone:''});
        v.rev+=r;
        if(!v.name && x.note) v.name=String(x.note).trim();
        if(!v.phone && x.customerPhone) v.phone=String(x.customerPhone).trim();
      }
      var d=dayOf(x); days[d]=(days[d]||0)+r;
      var n=String(x.name||'').trim()||'—';
      var p=byProd[n]||(byProd[n]={name:n,qty:0,rev:0,cost:0,unknown:0});
      p.qty+=q; p.rev+=r;
      if(x.costAtSale==null) p.unknown++; else p.cost+=num(x.costAtSale);
      if(isDrink(x)){ R.drinkRev+=r; R.drinkQty+=q; } else { R.foodRev+=r; R.foodQty+=q; }
    });
    R.invoices=Object.keys(inv).length;
    R.avgInvoice=R.invoices?R.rev/R.invoices:0;
    var pinv=arr(m.partyInvoices);
    R.partyRev=0; R.partyCost=0; R.partyUncosted=0;
    pinv.forEach(function(p){ if(!p||typeof p!=='object') return; R.partyRev+=num(p.total); R.partyCost+=num(p.cost); R.partyUncosted+=(p.uncostedLines!=null?num(p.uncostedLines):((p.lines&&p.lines.length)||(num(p.total)>0?1:0))); });
    R.gross=(R.rev+R.partyRev)-(R.cost+R.partyCost);

    // العملاء: من الفواتير اللي فيها اسم أو تليفون
    var custs={};
    Object.keys(inv).forEach(function(rid){
      var v=inv[rid]; if(!v.name && !v.phone) return;
      var key=digitsOf(v.phone)?'p:'+digitsOf(v.phone):'n:'+normKey(v.name);
      var c=custs[key]||(custs[key]={name:v.name,phone:v.phone,invoices:0,total:0});
      if(!c.name && v.name) c.name=v.name;
      if(!c.phone && v.phone) c.phone=v.phone;
      c.invoices++; c.total+=v.rev;
    });

    var exp=0, expCat={};
    arr(m.expensesLog).forEach(function(x){
      var a=num(x.amount); exp+=a;
      var c=String(x.category||'غير مصنف'); expCat[c]=(expCat[c]||0)+a;
    });

    var pur=0, purBy={}, purCount=0, purMax={v:0,name:''};
    arr(m.purchasesLog).forEach(function(x){
      var a=num(x.totalCost!=null?x.totalCost:x.total); pur+=a; purCount++; if(a>purMax.v){ purMax={v:a,name:String(x.name||'—')}; }
      var n=String(x.name||'—'); purBy[n]=(purBy[n]||0)+a;
    });

    var wasteCost=0, wasteQty=0, wasteBy={}, wasteUnpriced=0;
    arr(m.wasteLog).forEach(function(x){
      var q=num(x.qty), c=num(x.costAtWaste); if(x.costAtWaste==null) wasteUnpriced++;
      wasteQty+=q; wasteCost+=c;
      var n=String(x.name||'—'); var w=wasteBy[n]||(wasteBy[n]={name:n,qty:0,cost:0});
      w.qty+=q; w.cost+=c;
    });

    var prodBy={}, prodTotal=0;
    arr(m.productionLog).forEach(function(x){
      var n=String(x.name||x.product||'—'); var q=num(x.pieces!=null?x.pieces:x.qty);
      prodTotal+=q; prodBy[n]=(prodBy[n]||0)+q;
    });

    // استهلاك الخامات الفعلي من حركة المخزون (الخصومات)
    var useBy={};
    arr(m.history).forEach(function(x){
      var d=num(x.deduct); if(d<=0) return;
      var n=String(x.name||'—'), u=String(x.unit||'');
      var k=n+'||'+u; var r=useBy[k]||(useBy[k]={name:n,unit:u,qty:0});
      r.qty+=d;
    });

    var low=[];
    arr(m.inventory).forEach(function(s){
      var pr=obj(m.prices)[s.name]||{}; var ro=num(pr.reorder);
      if(ro>0 && num(s.qty)<=ro) low.push({name:s.name,qty:num(s.qty),unit:s.unit||'',reorder:ro});
    });

    var parties={n:0,total:0,paid:0,remaining:0};
    arr(m.partyInvoices).forEach(function(p){
      if(!p) return;
      var t=num(p.total), pd=p.paid==null?0:num(p.paid);
      parties.n++; parties.total+=t; parties.paid+=pd; parties.remaining+=Math.max(0,t-pd);
    });

    var drinksPendingBy={}, drinksPendingN=0;
    arr(m.drinkOrders).forEach(function(o){
      if(!o || String(o.status||'pending')!=='pending') return;
      drinksPendingN++;
      var n=String(o.name||'—'); drinksPendingBy[n]=(drinksPendingBy[n]||0)+num(o.qty||1);
    });

    // المنيو وتغطية المبيعات
    var menu=arr(m.menu), menuStats={total:menu.length,active:0,soldOut:0,piece:0,party:0,drink:0}, soldNames={};
    Object.keys(byProd).forEach(function(n){ soldNames[normKey(n)]=true; });
    var noSales=[];
    menu.forEach(function(x){
      if(!x) return;
      if(x.active!==false) menuStats.active++;
      if(x.soldOut) menuStats.soldOut++;
      var k=(x.kind==='party')?'party':(x.kind==='drink'?'drink':'piece'); menuStats[k]++;
      if(x.active!==false && !soldNames[normKey(x.name)]) noSales.push(String(x.name||''));
    });

    function desc(list,f){ return list.sort(function(a,b){return f(b)-f(a);}); }
    var listOf=function(o,lf){ return Object.keys(o).map(function(k){return lf(k,o[k]);}); };

    R.customers=desc(listOf(custs,function(k,c){return c;}),function(x){return x.total;}).slice(0,10);
    R.customerCount=Object.keys(custs).length;
    R.exp=exp; R.expList=desc(listOf(expCat,function(k,v){return {label:k,value:v};}),function(x){return x.value;});
    R.pur=pur; R.purCount=purCount; R.purMax=purMax; R.purList=desc(listOf(purBy,function(k,v){return {label:k,value:v};}),function(x){return x.value;});
    R.wasteCost=wasteCost; R.wasteQty=wasteQty; R.wasteUnpriced=wasteUnpriced;
    R.wasteList=desc(listOf(wasteBy,function(k,v){return v;}),function(x){return x.qty;});
    R.prodTotal=prodTotal; R.prodList=desc(listOf(prodBy,function(k,v){return {label:k,value:v};}),function(x){return x.value;});
    R.useList=desc(listOf(useBy,function(k,v){return v;}),function(x){return x.qty;});
    R.low=low;
    R.products=desc(listOf(byProd,function(k,v){return v;}),function(x){return x.rev;});
    R.days=Object.keys(days).sort().map(function(k){return {label:k,value:days[k]};}).slice(-31);
    R.parties=parties;
    R.drinksPendingN=drinksPendingN;
    R.drinksPending=desc(listOf(drinksPendingBy,function(k,v){return {label:k,value:v};}),function(x){return x.value;});
    R.menu=menuStats; R.noSales=noSales;
    return R;
  }

  // ===== تكلفة الوصفات والهامش (من الوصفات الحالية والمنيو الحالي) =====
  function costingRows(){
    var rec=obj(S().recipes), menuPrice={};
    arr(S().menu).forEach(function(x){ if(x&&x.name) menuPrice[normKey(x.name)]=num(x.price); });
    var rows=[];
    Object.keys(rec).forEach(function(n){
      var r=null;
      try{ if(typeof recipeCost==='function') r=recipeCost(n); }catch(e){ r=null; }
      if(!r) return;
      var unit=(r.unitCost==null)?null:num(r.unitCost);
      var sug=(r.suggested==null)?null:num(r.suggested);
      var price=menuPrice[normKey(n)]||0;
      var margin=(price>0 && unit!=null)?(price-unit)/price*100:null;
      rows.push({name:n, unit:unit, suggested:sug, price:price, margin:margin});
    });
    return rows;
  }

  // ===== العرض الجديد =====
  function kpi(label,val,sub,tone){
    return '<div class="db-kpi"><span>'+esc(label)+'</span><b class="'+(tone||'')+'">'+esc(val)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</div>';
  }
  function card(cls,title,body,note){
    return '<section class="db-card '+cls+'"><h3>'+esc(title)+'</h3>'+(note?'<div class="db-note">'+esc(note)+'</div>':'')+body+'</section>';
  }
  function toneOf(v){ return v>=0?'pos':'neg'; }
  function pctTxt(v){ return v==null?'—':fmt(v,0)+'%'; }
  function empty(t){ return '<div class="db-muted">'+esc(t)+'</div>'; }
  function table(head,rows){
    if(!rows.length) return empty('لا توجد بيانات');
    return '<div class="db-tablewrap"><table><tr>'+head.map(function(h){return '<th>'+esc(h)+'</th>';}).join('')+'</tr>'+
      rows.map(function(r){return '<tr>'+r.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';}).join('')+'</table></div>';
  }
  function hbars(items,unit){
    if(!items.length) return empty('لا توجد بيانات في هذه الفترة');
    var max=items.reduce(function(a,b){return Math.max(a,b.value);},0)||1;
    return items.slice(0,8).map(function(i){
      var w=Math.max(2,Math.round(i.value/max*100));
      return '<div class="db-hr"><span title="'+esc(i.label)+'">'+esc(i.label)+'</span><div class="db-track"><i style="width:'+w+'%"></i></div><b>'+esc(unit?unit(i.value):fmt(i.value))+'</b></div>';
    }).join('');
  }
  function vbars(items){
    if(!items.length) return empty('لا توجد مبيعات في هذه الفترة');
    var max=items.reduce(function(a,b){return Math.max(a,b.value);},0)||1;
    return '<div class="db-vb">'+items.map(function(i){
      var hh=Math.max(3,Math.round(i.value/max*100));
      var lbl=i.label.length>5?i.label.slice(5):i.label;
      return '<div class="db-vc" title="'+esc(i.label)+': '+esc(money(i.value))+'"><i style="height:'+hh+'%"></i><span>'+esc(lbl)+'</span></div>';
    }).join('')+'</div>';
  }
  function list(items){
    if(!items.length) return empty('لا يوجد');
    return '<ul class="db-list">'+items.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';
  }

  function build(){
    var root=document.getElementById('anRoot'); if(!root) return;
    var P=periods();
    if(sel!=='all' && !P.some(function(p){return p.key===sel;})) sel='cur';
    var m=collect(sel), R=compute(m);
    var net=R.gross-R.exp-R.wasteCost;
    var NA=empty('غير متاح للأرشيف.');

    var opts='<option value="cur"'+(sel==='cur'?' selected':'')+'>الشهر الحالي</option>'+
             '<option value="all"'+(sel==='all'?' selected':'')+'>كل الفترات (الحالي + الأرشيف)</option>';
    P.slice(1).forEach(function(p){ opts+='<option value="'+esc(p.key)+'"'+(sel===p.key?' selected':'')+'>'+esc(p.label)+'</option>'; });

    var liveNote = m.live ? '' : 'بيانات الأرشيف: الطلبات الحالية والمنيو والحفلات غير مخزنة فيه، وتظهر للشهر الحالي فقط.';

    var kpis=
      kpi('إجمالي المبيعات', money(R.rev+R.partyRev), R.invoices+' فاتورة'+(R.openLines?' · '+R.openLines+' سطر مفتوح':'')+(R.partyRev?' · حفلات '+money(R.partyRev):'')) +
      kpi('الربح الإجمالي', money(R.gross), (R.costUnknown+R.partyUncosted)?('تكلفة غير معروفة لـ '+(R.costUnknown+R.partyUncosted)+' سطر'):'بعد تكلفة الخامات والحفلات', toneOf(R.gross)) +
      kpi('المصروفات التشغيلية', money(R.exp), R.expList.length+' بند') +
      kpi('الصافي بعد الهالك والمصروفات', money(net), (R.costUnknown+R.partyUncosted+R.wasteUnpriced)?('الرقم ناقص '+(R.costUnknown+R.partyUncosted+R.wasteUnpriced)+' بند بلا تكلفة'):'الربح الإجمالي − الهالك − المصروفات', toneOf(net)) +
      kpi('المشتريات', money(R.pur), R.purList.length+' خامة · '+R.purCount+' عملية'+(R.purMax.v?' · أكبر عملية: '+money(R.purMax.v)+' ('+R.purMax.name+')':'')) +
      kpi('قيمة الهالك', money(R.wasteCost), qtyOf(R.wasteQty)) +
      kpi('متوسط الفاتورة', money(R.avgInvoice), qtyOf(R.qty)+' مباعة') +
      kpi('الحفلات', fmt(R.parties.n)+' حفلة', 'متبقي '+money(R.parties.remaining)+' من '+money(R.parties.total));

    var totalSplit=R.foodRev+R.drinkRev, pct=totalSplit?Math.round(R.drinkRev/totalSplit*100):0;
    var split='<div class="db-split"><div><span>الأكل</span><b>'+esc(money(R.foodRev))+'</b><small>'+esc(qtyOf(R.foodQty))+'</small></div>'+
              '<div><span>المشروبات</span><b>'+esc(money(R.drinkRev))+'</b><small>'+esc(qtyOf(R.drinkQty))+'</small></div></div>'+
              '<div class="db-note" style="margin:8px 0 0">نسبة المشروبات من المبيعات: '+pct+'%</div>';

    var prodRows=R.products.slice(0,8).map(function(p,i){
      var mg=(p.unknown||p.rev<=0)?null:(p.rev-p.cost)/p.rev*100;
      return [esc(i+1), esc(p.name), esc(fmt(p.qty)), esc(money(p.rev)), p.unknown?'—':esc(money(p.cost)), p.unknown?'—':'<span class="'+toneOf(p.rev-p.cost)+'">'+esc(money(p.rev-p.cost))+'</span>', esc(pctTxt(mg))];
    });

    var custRows=R.customers.map(function(c,i){
      return [esc(i+1), esc(c.name||'—'), esc(c.phone||'—'), esc(fmt(c.invoices)), esc(money(c.total))];
    });

    var ms=R.menu;
    var menuBody=!m.live?NA:'<div class="db-muted">أصناف المنيو: '+fmt(ms.total)+' · فعّال: '+fmt(ms.active)+' · نافد: '+fmt(ms.soldOut)+' · قطع: '+fmt(ms.piece)+' · حفلات: '+fmt(ms.party)+' · مشروبات: '+fmt(ms.drink)+'</div>'+
      '<div class="db-muted" style="margin-top:8px">أصناف فعّالة بدون مبيعات في الفترة:</div>'+list(R.noSales.slice(0,12));
    var drinkBody=!m.live?NA:'<div class="db-muted">طلبات مشروبات منتظرة الآن: <b>'+fmt(R.drinksPendingN)+'</b></div>'+
      (R.drinksPending.length? table(['المشروب','الكمية'], R.drinksPending.slice(0,10).map(function(x){return [esc(x.label),esc(fmt(x.value))];})) : '');
    var partiesBody=!m.live?NA:'<div class="db-muted">عدد الحفلات: <b>'+fmt(R.parties.n)+'</b></div>'+
      '<div class="db-muted">الإجمالي: <b>'+esc(money(R.parties.total))+'</b></div>'+
      '<div class="db-muted">المدفوع: <b>'+esc(money(R.parties.paid))+'</b></div>'+
      '<div class="db-muted">المتبقي: <b>'+esc(money(R.parties.remaining))+'</b></div>';

    var cost=costingRows();
    var costRows=cost.map(function(c){
      var mg=c.margin;
      var badge = mg==null ? '—' : '<span class="db-pill '+(mg>=50?'':'low')+'">'+esc(pctTxt(mg))+'</span>';
      return [esc(c.name), esc(c.unit==null?'ناقص سعر خامة':money(c.unit)), esc(c.suggested==null?'—':money(c.suggested)), esc(c.price?money(c.price):'غير في المنيو'), badge];
    });

    var lowRows=R.low.map(function(x){return [esc(x.name), esc(qtyOf(x.qty,x.unit)), esc(qtyOf(x.reorder,x.unit))];});

    var cmpRows=P.map(function(p){
      var r=compute(collect(p.key)), n=r.gross-r.exp-r.wasteCost;
      return [esc(p.label), esc(money(r.rev)), esc(money(r.exp)), esc(money(r.pur)), esc(money(r.wasteCost)), '<span class="'+toneOf(n)+'">'+esc(money(n))+'</span>'];
    });

    var grid =
      card('db-w12','المبيعات اليومية', vbars(R.days)) +
      card('db-w6','الأكل والمشروبات', split) +
      card('db-w6','المصروفات حسب البند', hbars(R.expList, money)) +
      card('db-w12','أفضل الأصناف (أعلى 8)', table(['#','الصنف','الكمية','الإيراد','التكلفة','الربح','الهامش'], prodRows)) +
      card('db-w6','المشتريات حسب الخامة', hbars(R.purList, money)) +
      card('db-w6','استهلاك الخامات الفعلي', hbars(R.useList.map(function(x){return {label:x.name+(x.unit?' ('+x.unit+')':''),value:x.qty};}), function(v){return fmt(v);}), 'من حركة المخزون (الخصومات).') +
      card('db-w6','الهالك (بالكمية)', hbars(R.wasteList.map(function(x){return {label:x.name,value:x.qty};}), function(v){return fmt(v)+' قطعة';})) +
      card('db-w6','الإنتاج (بالقطع)', hbars(R.prodList, function(v){return fmt(v)+' قطعة';})) +
      card('db-w6','الخامات تحت حد الطلب', lowRows.length? table(['الخامة','الرصيد','حد الطلب'], lowRows) : empty('كل الخامات فوق حد الطلب'), 'حسب المخزون الحالي.') +
      card('db-w6','أكثر العملاء', table(['#','العميل','التليفون','الفواتير','الإجمالي'], custRows), 'من الفواتير اللي فيها اسم أو تليفون العميل ('+fmt(R.customerCount)+' عميل).') +
      card('db-w6','المشروبات', drinkBody) +
      card('db-w6','المنيو والتغطية', menuBody) +
      card('db-w6','الحفلات', partiesBody) +
      card('db-w12','تكلفة الوصفات والهامش', table(['الوصفة','تكلفة الوحدة','السعر المقترح','سعر البيع','الهامش'], costRows), 'بالوصفات الحالية وأسعار المنيو الحالية.') +
      card('db-w12','مقارنة الفترات', table(['الفترة','المبيعات','المصروفات','المشتريات','الهالك','الصافي'], cmpRows));

    root.innerHTML =
      '<div class="db-head"><div><h2>التحليلات</h2><p class="db-muted">متابعة المبيعات والمصروفات والمخزون والوصفات في شاشة واحدة.</p>'+(liveNote?'<p class="db-muted">'+esc(liveNote)+'</p>':'')+'</div>'+
      '<div class="db-ctrl"><select id="anPeriod">'+opts+'</select><button type="button" class="db-btn" id="anRefresh">تحديث</button><div style="display:flex;gap:10px;align-items:center;margin:10px 0;direction:rtl"><label style="flex:1;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E7CDBB;border-radius:14px;padding:10px 12px;min-width:0"><span style="font-weight:800;color:#4A2A14;white-space:nowrap">من</span><input type="text" id="finFrom" inputmode="numeric" placeholder="25" maxlength="2" dir="ltr" style="flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:16px;text-align:right" value="'+((window.__finRange&&window.__finRange.from)||'')+'"></label><label style="flex:1;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #E7CDBB;border-radius:14px;padding:10px 12px;min-width:0"><span style="font-weight:800;color:#4A2A14;white-space:nowrap">إلى</span><input type="text" id="finTo" inputmode="numeric" placeholder="26" maxlength="2" dir="ltr" style="flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:16px;text-align:right" value="'+((window.__finRange&&window.__finRange.to)||'')+'"></label></div><button type="button" class="db-btn pm-fin-export" id="anExportFinance">طباعة التقرير المالي</button></div></div>'+
      '<div class="db-kpis">'+kpis+'</div>'+
      '<div class="db-grid">'+grid+'</div>';

    var ps=document.getElementById('anPeriod');
    if(ps) ps.onchange=function(){ sel=this.value; build(); };
    var rf=document.getElementById('anRefresh');
    if(rf) rf.onclick=function(){ build(); };
    var ex=document.getElementById('anExportFinance');
    var ff=document.getElementById('finFrom'), ft=document.getElementById('finTo');
    window.__finRange=window.__finRange||{from:'',to:''};
    if(ff) ff.onchange=function(){ window.__finRange.from=this.value; };
    if(ft) ft.onchange=function(){ window.__finRange.to=this.value; };
    if(ex) ex.onclick=function(){ try{ openFinReport(); }catch(e){ alert('تعذر عرض التقرير: '+(e.message||'خطأ غير معروف')); } };
  }

  window.__goPost.push(function(id){ var p=document.getElementById('analytics'); if(p&&p.classList.contains('active')){ try{ build(); }catch(e){ console.error('analytics',e); } } });
  window.pmRenderAnalytics=build;
  window.__anCompute=function(key){ return compute(collect(key)); };
  function recDay(x){
    if(!x||typeof x!=='object') return null;
    if(x.date){ var d0=String(x.date).slice(0,10); if(/^\d{4}-\d{2}-\d{2}$/.test(d0)) return d0; }
    if(x.at){ var d=new Date(x.at); if(!isNaN(d)) return dayOf(d); }
    return null;
  }
  window.__anComputeRange=function(from,to){
    var P=periods(), src={};
    LISTS.forEach(function(k){
      src[k]=[];
      P.forEach(function(p){
        arr(p.src[k]).forEach(function(x){
          var d=recDay(x); if(d && d>=from && d<=to) src[k].push(x);
        });
      });
    });
    var m={isAll:false, live:false, inventory:arr(S().inventory)};
    LISTS.forEach(function(k){ m[k]=src[k]; });
    m.prices=obj(S().prices); m.menu=arr(S().menu); m.recipes=obj(S().recipes);
    return compute(m);
  };
  window.__anCosting=costingRows;
  function sig(){
    var s=S(), parts=[];
    ['salesLog','expensesLog','purchasesLog','wasteLog','productionPieces','history','partyOrders','drinkOrders','inventory','monthlyArchives','menu'].forEach(function(k){
      var a=Array.isArray(s[k])?s[k]:[]; parts.push(a.length); if(a.length){ try{ parts.push(JSON.stringify(a[a.length-1]).length); }catch(e){} }
    });
    parts.push(Object.keys(obj(s.recipes)).length, Object.keys(obj(s.prices)).length, sel);
    return parts.join('|');
  }
  var lastSig=null;
  setInterval(function(){
    var p=document.getElementById('analytics');
    if(!p||!p.classList.contains('active')){ lastSig=null; return; }
    var g=sig();
    if(g!==lastSig){ lastSig=g; try{ build(); }catch(e){ console.error('analytics',e); } }
  },1500);
})();
