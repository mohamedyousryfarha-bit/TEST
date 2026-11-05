/* ---- 146-payment-breakdown.js ----
   تقسيم مبيعات الشهر حسب وسيلة الدفع (كاش / انستا باي / فيزا):
   بيظهر في ملخص الشهر الحالي، ومراجعة التقفيل، وتقرير الشهر المطبوع.
   - مبيعات المنيو: من salesLog (paymentMethod على كل سطر)، والفاتورة = receiptId.
   - مدفوعات الحفلات: من party_payments، صف لكل (طلب × وسيلة)،
     وبنجمّعها على مستوى الفاتورة (booking key) عشان العدد يبقى عدد فواتير مش عدد دفعات. */
(function(){
  'use strict';
  var NAMES={cash:'كاش',instapay:'انستا باي',visa:'فيزا'};
  var ORDER=['cash','instapay','visa'];
  function num(v){ return Number(v)||0; }
  function lineRev(x){ return x.revenue!=null ? num(x.revenue) : num(x.qty)*num(x.unitPrice); }
  function money(v){ return moneyFmt(v)+' ج.م'; }

  /* مدفوعات الحفلات المفتوحة: صف لكل (طلب × وسيلة) = { order_id, method, total } */
  window.pmLoadPayByMethod=async function(){
    if(!cloudClient||!cloudActorName||!cloudActorPin) return false;
    if(!(cloudActorRole==='admin'||cloudActorRole==='sales')) return false;
    var ids=(Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){
      return o && o.id && o.status!=='cancelled' && !(window.pmIsPartyOrderClosed && window.pmIsPartyOrderClosed(o));
    }).map(function(o){ return o.id; });
    if(!ids.length){ window.__pmPayByMethod=[]; return true; }
    var r=await cloudClient.rpc('pastrymy_party_payments_by_method',{p_employee_name:cloudActorName,p_pin:cloudActorPin,p_order_ids:ids});
    if(r.error) throw r.error;
    window.__pmPayByMethod=(r.data||[]).map(function(x){
      return { order_id:String(x.order_id||''), method:x.method||null, total:num(x.total) };
    });
    return true;
  };

  /* خريطة: order_id -> booking key (عشان نربط الدفعة بالفاتورة) */
  function keyByOrderId(){
    var map={};
    (Array.isArray(state.partyOrders)?state.partyOrders:[]).forEach(function(o){
      if(o && o.id && window.pmPartyBookingKey) map[String(o.id)]=window.pmPartyBookingKey(o);
    });
    return map;
  }

  /* pay:
       - مصفوفة صفوف من RPC (الحالة الحديثة) -> بنحسب الفواتير لكل وسيلة
       - undefined/null (لسه ما اتحمّلتش) -> نرجع لـ paymentMethod على الحفلة
       - كائن قديم {cash, instapay, visa} (أرشيف قديم) -> مبالغ بس */
  window.pmPayBreakdown=function(sales,parties,pay){
    var M={}; ORDER.concat(['unknown']).forEach(function(k){ M[k]={rev:0, inv:{}}; });
    var P=Array.isArray(parties)?parties:[];

    /* مبيعات المنيو */
    (Array.isArray(sales)?sales:[]).forEach(function(x){
      if(!x||typeof x!=='object') return;
      var k=NAMES[x.paymentMethod]?x.paymentMethod:'unknown';
      M[k].rev+=lineRev(x);
      M[k].inv['s:'+String(x.receiptId||x.receiptNo||Math.random())]=true;
    });

    if(Array.isArray(pay)){
      /* مدفوعات الحفلات حسب الوسيلة، مجمّعة على الفاتورة */
      var keyOf=keyByOrderId();
      var byKey={};
      pay.forEach(function(r){
        var amt=num(r&&r.total);
        if(!(amt>0)) return;
        var m=NAMES[r.method]?r.method:'unknown';
        var key=keyOf[r.order_id]||('o:'+r.order_id);
        M[m].rev+=amt;
        M[m].inv['p:'+key]=true;
        byKey[key]=byKey[key]||{};
        byKey[key][m]=(byKey[key][m]||0)+amt;
      });
      /* الباقي من مدفوع كل حفلة مش متوزع على وسيلة (دفعات قديمة) يتحط في غير مسجلة */
      P.forEach(function(p){
        var paid=num(p&&p.paid); if(!(paid>0)) return;
        var got=byKey[p.key]||{}, sum=0;
        Object.keys(got).forEach(function(m){ sum+=got[m]; });
        var rest=Math.round((paid-sum)*100)/100;
        if(rest>0.005){ M.unknown.rev+=rest; M.unknown.inv['p:'+p.key]=true; }
      });
    } else if(pay && typeof pay==='object'){
      /* أرشيف قديم: مبالغ بس بدون فواتير */
      var tableSum=0;
      ORDER.forEach(function(k){ var v=num(pay[k]); if(v>0){ M[k].rev+=v; M[k].inv['legacy:'+k]=true; tableSum+=v; } });
      var partyPaidOld=0; P.forEach(function(p){ partyPaidOld+=num(p&&p.paid); });
      var restOld=partyPaidOld-tableSum;
      if(restOld>0.005){ M.unknown.rev+=restOld; M.unknown.inv['legacy:unknown']=true; }
    } else {
      /* مفيش بيانات طرق دفع للدفعات: نعتمد على paymentMethod على الحفلة */
      P.forEach(function(p){
        var paid=num(p&&p.paid); if(!(paid>0)) return;
        var k=NAMES[p.paymentMethod]?p.paymentMethod:'unknown';
        M[k].rev+=paid; M[k].inv['p:'+(p.key||p.id)]=true;
      });
    }

    var rows=[];
    ORDER.forEach(function(k){
      rows.push({key:k,label:NAMES[k],rev:M[k].rev,inv:Object.keys(M[k].inv).length});
    });
    if(M.unknown.rev>0||Object.keys(M.unknown.inv).length){
      rows.push({key:'unknown',label:'وسيلة الدفع غير مسجلة',rev:M.unknown.rev,inv:Object.keys(M.unknown.inv).length});
    }
    var partyPaid=0; P.forEach(function(p){ var v=num(p&&p.paid); if(v>0) partyPaid+=v; });
    return {
      rows:rows,
      salesTotal:rows.reduce(function(s,r){return s+r.rev},0),
      partyCount:P.length,
      partyPaid:partyPaid
    };
  };

  /* سطور نصية لمراجعة التقفيل */
  window.pmPayLines=function(a){
    var b=pmPayBreakdown(a.salesLog,a.partyInvoices,a.partyPayByMethod);
    var L=['• المبيعات حسب وسيلة الدفع:'];
    b.rows.forEach(function(r){ L.push('   - '+r.label+': '+money(r.rev)+' ('+r.inv+' فاتورة)'); });
    return L;
  };

  /* بطاقات HTML للتقرير والملخص: لون لكل وسيلة + شريط نسبة */
  var COLORS={cash:'#15875A',instapay:'#0067B8',visa:'#6B4BD8',unknown:'#9AA3AE',party:'#B26A00'};
  window.pmPayHtml=function(a){
    var b=pmPayBreakdown(a.salesLog,a.partyInvoices,a.partyPayByMethod);
    var total=b.salesTotal||0;
    function card(color,label,sub,amount,pct){
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:8px;border-radius:14px;background:#F7F9FC;border:1px solid #E6EBF2">'+
        '<span style="flex:0 0 10px;height:10px;border-radius:50%;background:'+color+'"></span>'+
        '<div style="flex:1;min-width:0">'+
          '<div style="display:flex;justify-content:space-between;gap:8px;font-weight:600;color:#1B1B1B"><span>'+label+'</span><span>'+amount+'</span></div>'+
          '<div style="height:6px;margin:8px 0 6px;border-radius:999px;background:#E6EBF2;overflow:hidden"><i style="display:block;height:100%;width:'+Math.max(0,Math.min(100,pct))+'%;background:'+color+';border-radius:999px"></i></div>'+
          '<div style="font-size:12px;color:#5E5E5E">'+sub+'</div>'+
        '</div></div>';
    }
    var html=b.rows.map(function(r){
      var pct=total?(r.rev/total*100):0;
      return card(COLORS[r.key]||COLORS.unknown, esc(r.label), nfmt(r.inv)+' فاتورة · '+Math.round(pct)+'%', money(r.rev), pct);
    }).join('');
    return '<section style="margin-top:14px;font-family:inherit">'+
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"><h3 style="margin:0;font-size:16px;color:#1B1B1B">المحصّل حسب وسيلة الدفع (أكل + حفلات)</h3>'+
      '<b style="font-size:15px;color:#0067B8">'+money(total)+'</b></div>'+html+'</section>';
  };

  /* تقرير الشهر المطبوع: القسم يتحط قبل تقسيم الشهر */
  var origBuild=window.buildMonthReport;
  if(typeof origBuild==='function'){
    window.buildMonthReport=function(a){
      var h=origBuild.apply(this,arguments);
      var sec=pmPayHtml(a), marker='<h3 style="margin-top:14px">تقسيم الشهر';
      return h.indexOf(marker)>=0 ? h.replace(marker, sec+marker) : h.replace('</body></html>', sec+'</body></html>');
    };
  }

  /* ملخص الشهر الحالي قبل التقفيل */
  var origRender=window.renderMonthly;
  if(typeof origRender==='function'){
    window.renderMonthly=function(){
      origRender.apply(this,arguments);
      try{
        var box=document.getElementById('monthlySummary'); if(!box) return;
        var old=document.getElementById('pmPaySummary'); if(old) old.remove();
        var sl=(typeof state!=='undefined'&&state.salesLog)||[];
        var cleaned=window.pmCleanSalesForClose?window.pmCleanSalesForClose(sl):sl;
        var parties=window.pmOpenPartyInvoices?window.pmOpenPartyInvoices():[];
        var d=document.createElement('div'); d.id='pmPaySummary'; d.style.marginTop='10px';
        d.innerHTML=pmPayHtml({salesLog:cleaned,partyInvoices:parties,partyPayByMethod:window.__pmPayByMethod});
        box.insertAdjacentElement('afterend', d);
        if(window.pmLoadPayByMethod){
          window.pmLoadPayByMethod().then(function(){
            var o=document.getElementById('pmPaySummary');
            if(o) o.innerHTML=pmPayHtml({salesLog:cleaned,partyInvoices:parties,partyPayByMethod:window.__pmPayByMethod});
          }).catch(function(){});
        }
      }catch(e){ console.error('[PastryMY] 146-payment-breakdown failed',e); }
    };
  }
})();
