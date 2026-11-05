/* ---- 194-accounts-review.js ----
   مراجعة الحسابات في ملخص الشهر:
   1) صافي الحركة النقدية = المحصّل فعلاً (الحفلات بالمدفوع بس، والمصروفات والمشتريات مخصومة).
   2) تنبيهات: صنف تكلفته أعلى من سعره، مبيعات بدون وسيلة دفع، حفلات لسه ليها باقي،
      مفيش مصروفات تشغيلية مسجلة، ومطابقة الخامات المخصومة مع المبيعات المتوقعة.
   3) جدول أسعار الشراء بالوحدة الأساسية عشان المراجعة اليدوية.
   الملف بيلف renderMonthly زي 146-payment-breakdown.js، ومش بيغيّر أي بيانات. */
(function(){
  'use strict';

  function num(v){ return Number(v)||0; }
  function money(v){ return moneyFmt(v)+' ج.م'; }
  function menuItem(name){ return (state.menu||[]).find(function(x){ return x && x.name===name; }); }

  /* الاحتياج من الخامات لكمية معينة من صنف (بيفك الحفلات لأجزائها) */
  function expandNeeds(name, qty, out, depth){
    if(depth>5 || !(qty>0)) return;
    var m=menuItem(name);
    if(m && m.kind==='party' && Array.isArray(m.parts) && m.parts.length){
      m.parts.forEach(function(p){ expandNeeds(String(p.name||''), qty*num(p.qty), out, depth+1); });
      return;
    }
    var comps=(state.recipes||{})[name];
    if(!Array.isArray(comps)) return;
    comps.forEach(function(c){
      if(!c || !c.name || !(num(c.qty)>0)) return;
      var unit=unitBase(c.unit), key=String(c.name)+'||'+unit;
      if(!out[key]) out[key]={name:String(c.name), unit:unit, qty:0};
      out[key].qty+=norm(c.qty,c.unit)*qty;
    });
  }

  /* مطابقة: المخصوم من المخزون (سجل الحركة) مقابل المتوقع من المبيعات × الوصفات */
  function reconcileStock(sales, parties){
    var expected={};
    sales.forEach(function(x){ if(x) expandNeeds(String(x.name||''), num(x.qty), expected, 0); });
    parties.forEach(function(p){ (p && p.lines||[]).forEach(function(l){ expandNeeds(String(l.name||''), num(l.qty), expected, 0); }); });

    var actual={};
    (state.history||[]).forEach(function(h){
      if(!h || !(num(h.deduct)>0)) return;
      var unit=unitBase(h.unit||''), key=String(h.name||'')+'||'+unit;
      if(!actual[key]) actual[key]={name:String(h.name||''), unit:unit, qty:0};
      actual[key].qty+=num(h.deduct);
    });

    var rows=[];
    Object.keys(actual).concat(Object.keys(expected)).forEach(function(k){
      if(rows.some(function(r){ return r.key===k; })) return;
      var a=actual[k]?actual[k].qty:0, e=expected[k]?expected[k].qty:0;
      var nm=(actual[k]||expected[k]).name, un=(actual[k]||expected[k]).unit;
      rows.push({key:k, name:nm, unit:un, expected:e, actual:a,
        ratio: e>0 ? a/e : (a>0 ? Infinity : 1)});
    });
    /* الفرق المهم: مخصوم أكتر من المتوقع بمقدار واضح، أو متوقع ومخصومش */
    var flagged=rows.filter(function(r){
      if(r.actual===0 && r.expected===0) return false;
      return r.ratio>1.25 || (r.expected>0 && r.ratio<0.75);
    });
    flagged.sort(function(a,b){ return Math.abs(b.actual-b.expected)-Math.abs(a.actual-a.expected); });
    return {flagged:flagged, total:rows.length};
  }

  /* أصناف تكلفة الوحدة فيها أعلى من سعر البيع */
  function negativeMargin(){
    var out=[];
    (state.menu||[]).forEach(function(m){
      if(!m || !m.name || m.kind==='party') return;
      var price=num(m.price); if(!(price>0)) return;
      var c=(typeof recipeCost==='function') ? recipeCost(m.name) : null;
      if(!c || c.unitCost==null) return;
      if(c.unitCost>price) out.push({name:m.name, price:price, cost:c.unitCost});
    });
    return out;
  }

  /* أسعار الشراء بالوحدة الأساسية (للمراجعة اليدوية) */
  function purchaseUnitRows(purchases){
    return (purchases||[]).filter(function(x){ return x && num(x.qty)>0 && x.totalCost!=null; })
      .map(function(x){
        return {date:x.date||'', name:x.name||'—', qty:num(x.qty), unit:x.unit||'',
          total:num(x.totalCost), per: num(x.totalCost)/num(x.qty)};
      });
  }

  function cleanSales(){
    var sl=(state.salesLog||[]);
    return window.pmCleanSalesForClose ? window.pmCleanSalesForClose(sl) : sl;
  }
  function openParties(){
    return window.pmOpenPartyInvoices ? window.pmOpenPartyInvoices() : [];
  }

  function reviewHtml(){
    var sales=cleanSales(), parties=openParties();
    var m=monthMetrics({
      productionLog:state.productionLog||[],
      salesLog:pmRecostMissing(sales),
      expensesLog:state.expensesLog||[],
      purchasesLog:state.purchasesLog||[],
      wasteLog:pmRecostWaste(state.wasteLog||[]),
      partyInvoices:parties,
      stockValue:pmInventoryValue(state.inventory||[]),
      history:state.history||[],
      totalSpent:(state.productionLog||[]).reduce(function(a,x){ return a+num(x.totalCost); },0)
    });
    var warn=[], ok=[];

    if(m.expenseTotal===0){
      warn.push('لا توجد مصروفات تشغيلية مسجلة في الفترة (إيجار، مرتبات، كهربا، غاز…). صافي الربح ده قبل كل المصروفات دي.');
    }

    var neg=negativeMargin();
    if(neg.length){
      warn.push('أصناف تكلفتها أعلى من سعر بيعها: '+neg.map(function(n){
        return esc(n.name)+' (تكلفة '+nfmt(Math.round(n.cost))+' / سعر '+nfmt(n.price)+')';
      }).join('، ')+'. راجع السعر أو وصفة الصنف أو أسعار الخامات.');
    }

    var pay=pmPayBreakdown(sales, parties).rows.filter(function(r){ return r.key==='unknown'; })[0];
    if(pay && pay.rev>0){
      warn.push('مبيعات بقيمة '+money(pay.rev)+' ('+pay.inv+' فاتورة) من غير وسيلة دفع مسجلة. الكاش المحسوب مش دقيق لحد ما تتحدد.');
    }

    var unpaid=parties.reduce(function(s,p){ return s+Math.max(0, num(p&&p.total)-num(p&&p.paid)); },0);
    if(unpaid>0){
      warn.push('حفلات لسه متحصلتش: '+money(unpaid)+' (متبقي على العملاء). ده مش داخل في الكاش.');
    }

    var rec=reconcileStock(sales, parties);
    if(rec.flagged.length){
      var top=rec.flagged.slice(0,8).map(function(r){
        var rt=isFinite(r.ratio)?(r.ratio.toFixed(2)+'×'):'بدون استهلاك متوقع';
        return esc(r.name)+': مخصوم '+nfmt(Math.round(r.actual))+' '+esc(r.unit)+' مقابل متوقع '+nfmt(Math.round(r.expected))+' ('+rt+')';
      }).join('<br>');
      warn.push('<b>مطابقة المخزون: فيه خامات مخصومة بشكل مش متناسب مع المبيعات</b> (ممكن يكون إنتاج مش متباع، أو مضاعف حفلات غلط، أو خصم مكرر):<br>'+top);
    } else if(rec.total){
      ok.push('مطابقة المخزون مع المبيعات: مفيش فروق واضحة.');
    }

    var pu=purchaseUnitRows(state.purchasesLog||[]);
    var puHtml=pu.length
      ? '<h3 style="margin:14px 0 6px;font-size:15px">أسعار الشراء بالوحدة (راجعها)</h3>'+
        '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr><th>التاريخ</th><th>الخامة</th><th>الكمية</th><th>الإجمالي</th><th>سعر الوحدة</th></tr>'+
        pu.slice(0,30).map(function(r){
          return '<tr><td>'+esc(String(r.date).slice(0,10))+'</td><td>'+esc(r.name)+'</td><td>'+nfmt(r.qty)+' '+esc(r.unit)+'</td><td>'+money(r.total)+'</td><td>'+moneyFmt(r.per)+' ج.م / '+esc(r.unit)+'</td></tr>';
        }).join('')+'</table>'
      : '';

    var box=warn.map(function(w){
      return '<div class="notice-warn" style="margin-top:8px">'+w+'</div>';
    }).join('');
    var good=ok.map(function(o){
      return '<div class="notice-ok" style="margin-top:8px">'+o+'</div>';
    }).join('');

    return '<section id="pmAccountsReview" style="margin-top:14px">'+
      '<h3 style="margin:0 0 6px;font-size:16px">مراجعة الحسابات</h3>'+
      (box||good||'<div class="small">لا توجد تنبيهات.</div>')+
      puHtml+'</section>';
  }

  var origRender=window.renderMonthly;
  if(typeof origRender==='function'){
    window.renderMonthly=function(){
      origRender.apply(this,arguments);
      try{
        var summary=document.getElementById('monthlySummary'); if(!summary) return;

        /* 1) صافي الحركة النقدية: المحصّل فعلاً */
        var sales=cleanSales(), parties=openParties();
        var m=monthMetrics({
          productionLog:state.productionLog||[],
          salesLog:pmRecostMissing(sales),
          expensesLog:state.expensesLog||[],
          purchasesLog:state.purchasesLog||[],
          wasteLog:pmRecostWaste(state.wasteLog||[]),
          partyInvoices:parties,
          stockValue:pmInventoryValue(state.inventory||[]),
          history:state.history||[],
          totalSpent:(state.productionLog||[]).reduce(function(a,x){ return a+num(x.totalCost); },0)
        });
        summary.querySelectorAll('.stat').forEach(function(st){
          var sp=st.querySelector('span'), b=st.querySelector('b');
          if(sp && b && sp.textContent.indexOf('صافي حركة نقدية')===0){
            b.textContent=money(m.cashNet);
            sp.textContent='صافي النقد المحصّل (المبيعات − المصروفات − المشتريات، والحفلات بالمدفوع فقط)';
          }
        });

        /* 2) لوحة المراجعة */
        var old=document.getElementById('pmAccountsReview'); if(old) old.remove();
        var d=document.createElement('div');
        d.innerHTML=reviewHtml();
        summary.insertAdjacentElement('afterend', d.firstChild);
      }catch(e){ console.error('[PastryMY] 194-accounts-review failed', e); }
    };
  }
})();
