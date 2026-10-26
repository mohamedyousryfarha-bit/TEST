(function(){
  if(window.__pmDrinkQ) return; window.__pmDrinkQ=true;
  var pendingReq={};
  function newId(){ return (crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})); }
  function role(){ return typeof cloudActorRole!=='undefined' ? cloudActorRole : ''; }
  function orders(){ return Array.isArray(state.drinkOrders)?state.drinkOrders:[]; }
  function drinkTime(name){ var comps=(state.recipes||{})[name]||[]; var c=comps.find(function(x){return x.time!=null&&x.time!==''}); return c?(Number(c.time)||0):0; }
  function shortages(o){
    var comps=(state.recipes||{})[o.name]||[];
    return comps.map(function(c){
      var need=Number(c.qty||0)*Number(o.qty||0), have=getStock(c.name,c.unit);
      return need>have+1e-9 ? c.name+' (ناقص '+Number((need-have).toFixed(2))+' '+c.unit+')' : null;
    }).filter(Boolean);
  }
  window.pmDrinkRefresh=async function(){
    if(!cloudReady) return;
    var r=await apiCall({action:'get_state',employee_name:cloudActorName,pin:cloudActorPin});
    if(r.error) throw r.error;
    var s=(r.data&&r.data.state)||{};
    state.drinkOrders=Array.isArray(s.drinkOrders)?s.drinkOrders:[];
    if(Array.isArray(s.drinkNames)) state.drinkNames=s.drinkNames;
    if(role()!=='sales'){
      if(s.readyStock && typeof s.readyStock==='object') state.readyStock=s.readyStock;
      if(Array.isArray(s.inventory)) state.inventory=s.inventory;
    }
    if(role()==='barista'){ state.recipes=s.recipes||{}; state.inventory=s.inventory||[]; }
    /* قائمة الوصفات (القائمة المنسدلة) لازم تتحدّث، وإلا تفضل فاضية ومفيش وصفة بتظهر */
    if(typeof renderSelectors==='function'){ try{ renderSelectors(); }catch(e){} }
    render();
    if(typeof window.renderMenu==='function') window.renderMenu();
    if(window.pmTileRefresh) window.pmTileRefresh();
  };
  var DQ_BATCH=[];
  function dqNames(){ return Array.isArray(state.drinkNames)?state.drinkNames:[]; }
  function dqInMenu(name){ return Array.isArray(state.menu)&&state.menu.some(function(x){return x&&x.name===name}); }
  function dqTotals(batch){
    var totals={};
    batch.forEach(function(it){
      ((state.recipes||{})[it.name]||[]).forEach(function(c){
        if(!c||!c.name||!(Number(c.qty)>0)) return;
        var u=unitBase(c.unit), key=c.name+'||'+u;
        if(!totals[key]) totals[key]={name:c.name,unit:u,qty:0};
        totals[key].qty+=norm(c.qty,c.unit)*Number(it.qty);
      });
    });
    return Object.keys(totals).map(function(k){return totals[k]});
  }
  function dqBatchHtml(){
    if(!DQ_BATCH.length) return '<div class="empty">لم تضف أصنافًا للطلب بعد.</div>';
    return '<h3>الأصناف في الطلب</h3><div class="tablewrap"><table><tr><th>الصنف</th><th>الأكواب</th><th>إجراء</th></tr>'+
      DQ_BATCH.map(function(x,i){return '<tr><td>'+esc(x.name)+'</td><td>'+nfmt(x.qty)+'</td><td><button type="button" class="danger mini" data-dq-remove="'+i+'">حذف</button></td></tr>'}).join('')+
      '</table></div>';
  }
  function dqCalcHtml(){
    if(!DQ_BATCH.length) return '<div class="empty">أضف صنفًا ثم اضغط حساب المكونات.</div>';
    var t=dqTotals(DQ_BATCH), total=0, unknown=0;
    var rows=t.map(function(x){
      var have=getStock(x.name,x.unit), short=Math.max(0,x.qty-have), cost=costOf(x.name,x.unit,x.qty);
      if(cost===null) unknown++; else total+=cost;
      var shown=formatAggregate(x.qty,x.unit);
      var scale=(x.unit==='لتر'&&shown.unit!=='لتر')?factor(shown.unit):1;
      return {name:x.name,unit:shown.unit,need:shown.qty,have:have/scale,short:short/scale,cost:cost,lacking:short>1e-9};
    });
    var lacking=rows.filter(function(r){return r.lacking}).length;
    return '<h3>إجمالي مكونات الطلب</h3>'+
      (lacking?'<div class="danger-note">يوجد عجز في '+lacking+' خامة. لن يتم الخصم حتى يتم توفيرها أو تعديل الكميات.</div>':'<div class="notice-ok">المخزون الحالي يكفي الطلب حسب الأرصدة المسجلة.</div>')+
      '<div class="tablewrap"><table><tr><th>الخامة</th><th>المطلوب</th><th>المتاح</th><th>العجز</th><th>الوحدة</th><th>تكلفة تقديرية</th></tr>'+
      rows.map(function(r){return '<tr><td>'+esc(r.name)+'</td><td>'+nfmt(r.need)+'</td><td>'+nfmt(r.have)+'</td><td>'+(r.lacking?'<span class="pill low">'+nfmt(r.short)+'</span>':'0')+'</td><td>'+esc(r.unit)+'</td><td>'+(r.cost===null?'غير محدد':moneyFmt(r.cost)+' ج.م')+'</td></tr>'}).join('')+
      '</table></div><div class="stat" style="margin-top:10px"><b>'+moneyFmt(total)+' ج.م</b><span>التكلفة التقديرية للخامات المسعّرة'+(unknown?' · '+unknown+' مكون بلا سعر':'')+'</span></div>';
  }
  function dqPrint(){
    if(!DQ_BATCH.length){ alert('أضف أصنافًا للطلب أولًا.'); return; }
    var items=DQ_BATCH.map(function(x){return '<tr><td>'+esc(x.name)+'</td><td>'+nfmt(x.qty)+'</td></tr>'}).join('');
    var ings=dqTotals(DQ_BATCH).map(function(x){var sh=formatAggregate(x.qty,x.unit);return '<tr><td>'+esc(x.name)+'</td><td>'+nfmt(sh.qty)+'</td><td>'+esc(sh.unit)+'</td></tr>'}).join('');
    window.pmShowDoc('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>كشف إنتاج المشروبات</title><style>body{font-family:Arial,sans-serif;padding:16px}table{width:100%;border-collapse:collapse;margin-bottom:16px}td,th{border:1px solid #999;padding:6px;text-align:right}h2{margin:12px 0 6px}</style></head><body><h2>كشف إنتاج المشروبات</h2><p>'+esc(new Date().toLocaleString('ar-EG'))+'</p><table><tr><th>الصنف</th><th>الأكواب</th></tr>'+items+'</table><h2>الخامات المطلوبة</h2><table><tr><th>الخامة</th><th>الكمية</th><th>الوحدة</th></tr>'+ings+'</table></body></html>');
  }
  function productionHtml(){
    var names=dqNames();
    var opts=names.map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>'}).join('');
    return '<div class="pm-drink-form"><h3>تجهيز إنتاج المشروبات</h3>'+
      '<div class="grid2"><div><label>اختر المشروب</label><select id="dpName">'+opts+'</select></div>'+
      '<div><label>عدد الأكواب</label><div style="display:flex;gap:6px;align-items:center"><button type="button" class="secondary mini" id="dpMinus">-</button><input id="dpQty" type="number" min="1" max="50" step="1" value="1" style="text-align:center"><button type="button" class="secondary mini" id="dpPlus">+</button></div></div></div>'+
      '<label>سعر البيع (جنيه) — مطلوب بس لو الصنف مش في المنيو</label><input id="dpPrice" type="number" min="0" step="any" placeholder="سعر البيع">'+
      '<div class="actions"><button type="button" class="primary" id="dpAdd"'+(names.length?'':' disabled')+'>إضافة صنف</button><button type="button" class="secondary" id="dpClear">مسح الطلب</button></div>'+
      '<div id="dpItems">'+dqBatchHtml()+'</div>'+
      '<div class="actions"><button type="button" class="secondary" id="dpCalc">حساب المكونات</button><button type="button" class="secondary" id="dpPrint">طباعة كشف الطلب</button></div>'+
      '<div class="actions"><button type="button" class="secondary" id="dpShort">قائمة النواقص</button><button type="button" class="primary" id="dpSend"'+(DQ_BATCH.length?'':' disabled')+'>تأكيد وخصم المخزون</button></div>'+
      '<div id="dpResult"></div>'+
      '<p class="small">لا يتم الخصم إذا كان أي مكون غير متوفر. راجع النواقص قبل التأكيد. كل كوب بيتخصم حسب وصفته المسجلة.</p></div>';
  }
  function queueHtml(){
    var pending=orders().filter(function(o){return o.status==='pending'});
    var mins=0, perName={};
    var cards=pending.map(function(o){
      var t=drinkTime(o.name)*Number(o.qty||0); mins+=t;
      perName[o.name]=(perName[o.name]||0)+Number(o.qty||0);
      var sh=shortages(o);
      return '<div class="dq-card"><h3>'+esc(o.name)+' × '+nfmt(o.qty)+'</h3>'+
        '<div class="small">وقت التحضير: '+t+' دقيقة'+(o.by?' · بواسطة: '+esc(o.by):'')+(o.note?' · ملاحظة: '+esc(o.note):'')+'</div>'+
        (sh.length?'<div class="danger-note">خامات ناقصة: '+sh.map(esc).join('، ')+'</div>':'<div class="notice-ok">الخامات متوفرة</div>')+
        '<div class="actions"><button type="button" class="primary" data-dq-prepare="'+esc(o.id)+'"'+(sh.length?' disabled':'')+'>تأكيد التحضير</button></div></div>';
    }).join('');
    var summary=Object.keys(perName).map(function(n){return esc(n)+': '+nfmt(perName[n])}).join(' · ');
    return '<div class="stats"><div class="stat"><b>'+pending.length+'</b><span>طلبات منتظرة</span></div><div class="stat"><b>'+mins+'</b><span>إجمالي دقايق التحضير</span></div></div>'+
      (summary?'<div class="dq-sum">عدد المشروبات المطلوبة: '+summary+'</div>':'')+
      (cards||'<div class="empty">مفيش طلبات مشروبات دلوقتي.</div>');
  }
  function render(){
    var r=role();
    var pbox=document.getElementById('drinkProduceBody');
    var qbox=document.getElementById('drinkQueueBody');
    var staff=(r==='barista'||r==='admin');
    if(pbox){
      pbox.innerHTML=staff?productionHtml():'<div class="empty">الصفحة دي للباريستا والمدير.</div>';
      if(staff) bindProduce(pbox);
    }
    if(qbox){
      qbox.innerHTML=staff?queueHtml():(r==='sales'?'<div class="empty">الطلبات بتتعمل من المنيو، من تبويب «مشروبات».</div>':'<div class="empty">الصفحة دي للباريستا.</div>');
      if(staff) bindQueue(qbox);
    }
  }
  function bindProduce(box){
    var qtyEl=box.querySelector('#dpQty'), nameEl=box.querySelector('#dpName'), priceEl=box.querySelector('#dpPrice');
    var resEl=box.querySelector('#dpResult');
    function showResult(html){ if(resEl) resEl.innerHTML=html; }
    function curQty(){ return Number(qtyEl?qtyEl.value:0); }
    function setQty(v){ if(qtyEl) qtyEl.value=String(Math.min(50,Math.max(1,v))); }
    function bindRemove(){
      box.querySelectorAll('[data-dq-remove]').forEach(function(b){
        b.onclick=function(){ DQ_BATCH.splice(Number(b.getAttribute('data-dq-remove')),1); refreshItems(); showResult(''); };
      });
    }
    function refreshItems(){
      var el=box.querySelector('#dpItems'); if(el) el.innerHTML=dqBatchHtml();
      var s=box.querySelector('#dpSend'); if(s) s.disabled=!DQ_BATCH.length;
      bindRemove();
    }
    var minus=box.querySelector('#dpMinus'), plus=box.querySelector('#dpPlus');
    if(minus) minus.onclick=function(){ setQty(curQty()-1); };
    if(plus) plus.onclick=function(){ setQty(curQty()+1); };
    var add=box.querySelector('#dpAdd');
    if(add) add.onclick=function(){
      var name=nameEl?nameEl.value:'', qty=curQty();
      if(!name){ alert('اختر مشروبًا أولًا.'); return; }
      if(!(qty>=1&&qty<=50&&Math.floor(qty)===qty)){ alert('اكتب عدد أكواب صحيح من 1 لـ 50.'); return; }
      var inMenu=dqInMenu(name), price=Number(priceEl?priceEl.value:'');
      if(!inMenu && !(price>0)){ alert('الصنف مش في المنيو. اكتب سعر البيع الأول عشان يتضاف تلقائي.'); return; }
      var line=DQ_BATCH.find(function(x){return x.name===name});
      if(line){
        if(line.qty+qty>200){ alert('الحد الأقصى 200 كوب لنفس الصنف في الطلب الواحد.'); return; }
        line.qty+=qty;
        if(!inMenu && !(line.price>0)) line.price=price;
      } else {
        DQ_BATCH.push({name:name,qty:qty,price:inMenu?0:price});
      }
      if(priceEl) priceEl.value='';
      setQty(1);
      refreshItems(); showResult('');
    };
    var clr=box.querySelector('#dpClear');
    if(clr) clr.onclick=function(){
      if(!DQ_BATCH.length) return;
      if(!confirm('مسح كل أصناف الطلب؟')) return;
      DQ_BATCH.length=0; refreshItems(); showResult('');
    };
    var calc=box.querySelector('#dpCalc');
    if(calc) calc.onclick=function(){ showResult(dqCalcHtml()); };
    var pr=box.querySelector('#dpPrint');
    if(pr) pr.onclick=function(){ dqPrint(); };
    var sh=box.querySelector('#dpShort');
    if(sh) sh.onclick=function(){ var p=document.getElementById('showPurchases'); if(p) p.click(); };
    var send=box.querySelector('#dpSend');
    if(send) send.onclick=async function(){
      if(!DQ_BATCH.length){ alert('أضف أصنافًا للطلب أولًا.'); return; }
      var items=DQ_BATCH.slice();
      var totals=dqTotals(items);
      var lacking=totals.filter(function(x){return x.qty>getStock(x.name,x.unit)+1e-9});
      if(lacking.length){
        showResult(dqCalcHtml());
        alert('المخزون لا يكفي هذا الإنتاج. الخامات الناقصة:\n'+lacking.map(function(x){return '- '+x.name+': ناقص '+Number((x.qty-getStock(x.name,x.unit)).toFixed(2))+' '+x.unit}).join('\n'));
        return;
      }
      if(!cloudReady||!cloudActorName||!cloudActorPin){ alert('يلزم الاتصال بالسحابة قبل تأكيد الإنتاج.'); return; }
      var totalCups=items.reduce(function(a,x){return a+x.qty},0);
      if(!confirm('تأكيد إنتاج '+nfmt(totalCups)+' كوب من '+items.length+' صنف؟ هيتخصم الخامات المطلوبة.')) return;
      send.disabled=true;
      var doneIdx=[], failedIdx=-1, failMsg='';
      for(var i=0;i<items.length;i++){
        var it=items[i];
        it.rid=it.rid||newId();
        try{
          var r=await apiCall({action:'drink_produce',employee_name:cloudActorName,pin:cloudActorPin,name:it.name,qty:it.qty,request_id:it.rid});
          if(r.error) throw r.error;
          doneIdx.push(i);
        }catch(e){ failedIdx=i; failMsg=(e&&e.message)||String(e); break; }
      }
      var done=doneIdx.map(function(k){return items[k]});
      DQ_BATCH=items.filter(function(_,k){return doneIdx.indexOf(k)<0});
      var added=[];
      try{ await pmDrinkRefresh(); }catch(_){}
      state.menu=Array.isArray(state.menu)?state.menu:[];
      done.forEach(function(it){
        if(!dqInMenu(it.name) && it.price>0){ state.menu.push({name:it.name,price:it.price,image:'',kind:'drink',onDemand:false}); added.push(it.name); }
      });
      if(added.length) save();
      var msg='تم إنتاج '+done.length+' من '+items.length+' صنف.';
      if(added.length) msg+='\nاتضاف للمنيو في تبويب مشروبات: '+added.join('، ');
      if(failedIdx>=0) msg+='\nفشل: '+items[failedIdx].name+' ('+failMsg+').\nالأصناف الباقية في الطلب ومتخصمش، راجعها وأعد التأكيد.';
      alert(msg);
      render();
    };
    bindRemove();
  }
  function bindQueue(box){
    box.querySelectorAll('[data-dq-prepare]').forEach(function(b){
      b.onclick=async function(){
        var id=b.getAttribute('data-dq-prepare');
        if(!confirm('تأكيد تحضير الطلب؟ هيتخصم الخامات المطلوبة.')) return;
        pendingReq[id]=pendingReq[id]||newId();
        b.disabled=true;
        try{
          var r=await apiCall({action:'drink_order_action',drink_action:'prepare',order_id:id,request_id:pendingReq[id],employee_name:cloudActorName,pin:cloudActorPin});
          if(r.error) throw r.error;
          delete pendingReq[id];
          await pmDrinkRefresh();
        }catch(e){ alert('لم يتم التحضير: '+((e&&e.message)||String(e))); b.disabled=false; }
      };
    });
  }
  window.__goPost=window.__goPost||[];
  window.__goPost.push(function(id){
    if(id!=='drinkQueue'&&id!=='drinkProduce') return;
    render();
    pmDrinkRefresh().catch(function(){ render(); });
  });
})();
