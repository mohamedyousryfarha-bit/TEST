(function(){
  if(window.__pmAcct3) return; window.__pmAcct3=true;
  var PRICE_ALERT_PCT=15, COMPARE_PCT=40, PARTY_DAYS=7;
  function S(){ return (typeof state!=='undefined'&&state)?state:(window.state||{}); }
  function isAdmin(){ return (typeof cloudActorRole!=='undefined'&&cloudActorRole==='admin'); }
  function E(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function fmt(v){ return (Math.round((Number(v)||0)*1000)/1000).toLocaleString('ar-EG'); }
  function money(v){ return Math.round(Number(v)||0).toLocaleString('ar-EG')+' ج.م'; }
  function pct(v){ return (Math.round((Number(v)||0)*10)/10).toLocaleString('ar-EG')+'%'; }
  function arr(v){ return Array.isArray(v)?v:[]; }
  function openParties(){ return (typeof window.pmOpenPartyInvoices==='function')?window.pmOpenPartyInvoices():[]; }
  function paidOf(i){ var p=(window.__pmPaySummary||{})[i.key]; return p?(Number(p.paid)||0):null; }

  /* ---------- قائمة المراجعة ---------- */
  function checklist(){
    var s=S(), out=[];
    var inv=arr(s.inventory).filter(function(x){return x&&x.name});
    var L=arr(s.stockCounts)[0];
    out.push({ok:!!L, t:'تم جرد المخزون', d:L?'آخر جرد موجود':'لم يتم الجرد بعد'});
    out.push({ok:!!L&&arr(L.items).every(function(x){return Number(x.diff)===0}), t:'الجرد بدون فروق',
      d:L?(arr(L.items).filter(function(x){return Number(x.diff)!==0}).length+' خامة فيها فرق'):'—'});
    out.push({ok:arr(s.expensesLog).length>0, t:'المصروفات متسجلة', d:arr(s.expensesLog).length+' مصروف مسجل'});
    var openInv=arr(s.salesLog).filter(function(x){return x&&x.invoiceStatus==='open'}).length;
    out.push({ok:openInv===0, t:'مفيش فواتير مفتوحة', d:openInv?openInv+' صنف في فواتير مفتوحة':'تمام'});
    var unc=arr(s.salesLog).filter(function(x){return x&&x.costAtSale==null}).length;
    out.push({ok:unc===0, t:'كل المبيعات متسعرة', d:unc?unc+' بيع بدون تكلفة':'تمام'});
    var wUnc=arr(s.wasteLog).filter(function(x){return x&&x.costAtWaste==null}).length;
    out.push({ok:wUnc===0, t:'الهالك متسعر', d:wUnc?wUnc+' عملية هالك بدون تكلفة':'تمام'});
    var neg=inv.filter(function(x){return !(Number(x.qty)>=0)}).length;
    out.push({ok:neg===0, t:'مفيش رصيد مخزون سالب', d:neg?neg+' خامة رصيدها سالب':'تمام'});
    var unpaid=openParties().filter(function(i){var pd=paidOf(i);return pd===null||(Number(i.total)||0)>pd});
    out.push({ok:unpaid.length===0, t:'حفلات مدفوعة بالكامل', d:unpaid.length?unpaid.length+' فاتورة عليها متبقي أو دفعها مش معروف':'تمام'});
    return out;
  }

  /* ---------- تنبيهات ---------- */
  function alerts(){
    var s=S(), out=[], prices=s.prices||{}, nm=window.norm;
    arr(s.inventory).filter(function(x){return x&&x.name}).forEach(function(x){
      var p=prices[x.name]||{};
      if(Number(p.reorder)>0 && typeof nm==='function' && nm(x.qty,x.unit)<=nm(p.reorder,x.unit))
        out.push({bad:false, t:'خامة تحت حد الطلب: '+x.name+' (الرصيد '+fmt(x.qty)+' '+(x.unit||'')+')'});
    });
    arr(s.priceChanges).forEach(function(c){
      if(!c||!(c.oldPrice>0)) return;
      var ch=(c.newPrice/c.oldPrice-1)*100;
      var age=Date.now()-Date.parse(c.date);
      if(ch>=PRICE_ALERT_PCT && age<30*864e5)
        out.push({bad:true, t:'سعر '+c.name+' زاد '+pct(ch)+' ('+money(c.oldPrice)+' ← '+money(c.newPrice)+')'});
    });
    openParties().forEach(function(i){
      var pd=paidOf(i), rem=Math.max(0,(Number(i.total)||0)-(pd||0));
      var days=i.deliveredAt?(Date.now()-Date.parse(i.deliveredAt))/864e5:0;
      if(rem>0 && days>PARTY_DAYS)
        out.push({bad:true, t:'فاتورة حفلة '+(i.customer||'—')+' مفتوحة من '+Math.floor(days)+' يوم، متبقي '+money(rem)});
    });
    return out;
  }

  /* ---------- تغيّرات كبيرة بين آخر شهرين مقفولين ---------- */
  function compare(){
    var s=S(), out=[], A=arr(s.monthlyArchives);
    if(A.length<2||typeof window.monthMetrics!=='function') return out;
    var cur=window.monthMetrics(A[A.length-1]), prev=window.monthMetrics(A[A.length-2]);
    var names={revenue:'المبيعات', expenseTotal:'المصروفات', profit:'صافي الربح'};
    Object.keys(names).forEach(function(k){
      var a=Number(prev[k])||0, b=Number(cur[k])||0;
      if(a===0) return;
      var ch=(b-a)/Math.abs(a)*100;
      if(Math.abs(ch)>=COMPARE_PCT)
        out.push(names[k]+' '+(ch>0?'زاد':'نزل')+' '+pct(Math.abs(ch))+' ('+A[A.length-2].label+' ← '+A[A.length-1].label+')');
    });
    return out;
  }

  function render(){
    var card=document.getElementById('pmAcctCard'); if(!card) return;
    var old=document.getElementById('pmAcctExtra'); if(old) old.remove();
    if(!isAdmin()) return;
    var cl=checklist(), al=alerts(), cmp=compare();
    var okCount=cl.filter(function(x){return x.ok}).length;
    var div=document.createElement('div'); div.id='pmAcctExtra';
    div.innerHTML=
      '<h3>قائمة المراجعة قبل التقفيل</h3>'+
      '<p class="small">'+okCount+' من '+cl.length+' بند تمام.</p>'+
      '<div class="tablewrap"><table>'+cl.map(function(x){
        return '<tr><td style="width:36px;font-weight:800;color:'+(x.ok?'#16794B':'#B42318')+'">'+(x.ok?'✓':'✗')+'</td><td>'+E(x.t)+'</td><td class="small">'+E(x.d)+'</td></tr>';
      }).join('')+'</table></div>'+
      '<h3>تنبيهات</h3>'+
      (al.length
        ? '<ul class="small">'+al.map(function(a){return '<li style="color:'+(a.bad?'#B42318':'#9A5B00')+'">'+E(a.t)+'</li>'}).join('')+'</ul>'
        : '<div class="notice-ok">مفيش تنبيهات دلوقتي.</div>')+
      '<h3>تغيّرات كبيرة بين آخر شهرين مقفولين</h3>'+
      (cmp.length
        ? '<ul class="small">'+cmp.map(function(t){return '<li style="color:#9A5B00">'+E(t)+'</li>'}).join('')+'</ul>'
        : '<div class="empty">مفيش تغيّر كبير، أو مش فيه شهرين مقفولين للمقارنة.</div>');
    card.appendChild(div);
  }

  var tries=0;
  function attach(){
    var card=document.getElementById('pmAcctCard');
    if(!card){ if(++tries<120) setTimeout(attach,500); return; }
    if(card.__pmObs) return;
    card.__pmObs=new MutationObserver(function(){ if(!document.getElementById('pmAcctExtra')) render(); });
    card.__pmObs.observe(card,{childList:true});
    render();
  }
  function start(){ setTimeout(attach,400); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
