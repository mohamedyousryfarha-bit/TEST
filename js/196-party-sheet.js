/* ---- 196-party-sheet.js ----
   ورقة تشغيل مضغوطة للأوردرات النشطة: سطر واحد لكل حجز (اسم العميل، التليفون، التاريخ، الساعة،
   الأصناف مع حالة كل صنف، حالة الحجز، المتبقي). بتتطبع على A4 من غير ما تغيّر البيانات. */
(function(){
  'use strict';
  if(window.__pmPartySheet) return; window.__pmPartySheet=true;

  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}); }
  function num(v){ return Number(v)||0; }
  function fmt(n){ return Math.round(num(n)).toLocaleString('en-US'); }
  function menuPrice(name){ var m=(state.menu||[]).find(function(x){return x&&x.name===name}); return num(m&&m.price); }
  function liveOf(b){ return b.orders.filter(function(o){ return o && o.status!=='cancelled'; }); }

  function itemLabel(o){
    var st = o.status==='ready' ? '✓ جاهز' : (o.status==='delivered' ? '✓ اتسلم' : '⏳ مستني');
    return esc(o.name)+' × '+fmt(o.qty)+' <span class="is">('+st+')</span>';
  }
  function bookingStatus(live){
    if(live.length && live.every(function(o){ return o.status==='ready'; })) return {txt:'جاهز للتسليم', cls:'ok'};
    if(live.some(function(o){ return o.status==='ready'; })) return {txt:'جزء جاهز', cls:'mid'};
    return {txt:'قيد التجهيز', cls:'wait'};
  }
  function activeBookings(){
    if(!window.pmPartyBookings) return [];
    var list=(Array.isArray(state.partyOrders)?state.partyOrders:[]).filter(function(o){
      return o && o.name && !(window.pmIsPartyOrderClosed && window.pmIsPartyOrderClosed(o));
    });
    return window.pmPartyBookings(list).filter(function(b){ return !b.complete && !b.cancelled; });
  }

  window.pmPartySheetHtml=function(){
    var books=activeBookings();
    var totalRem=0, ready=0;
    var rows=books.map(function(b){
      var live=liveOf(b), f=live[0]||b.first;
      var total=live.reduce(function(s,o){ return s+(num(o.price)||menuPrice(o.name))*num(o.qty); },0);
      var paid=live.reduce(function(s,o){ return s+num(o.paid); },0);
      var rem=Math.max(0,total-paid); totalRem+=rem;
      var st=bookingStatus(live); if(st.cls==='ok') ready++;
      return '<tr>'+
        '<td class="nm">'+esc(f.customer||'بدون اسم')+'</td>'+
        '<td class="ph">'+esc(f.customerPhone||'—')+'</td>'+
        '<td class="dt">'+esc(String(f.date||'').slice(0,10))+'</td>'+
        '<td class="tm">'+esc(f.time||'—')+'</td>'+
        '<td class="it">'+live.map(itemLabel).join('<br>')+'</td>'+
        '<td class="st '+st.cls+'">'+st.txt+'</td>'+
        '<td class="rm">'+fmt(rem)+'</td>'+
        '</tr>';
    }).join('');

    return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ورقة الحفلات</title><style>'+
      '@page{size:A4;margin:8mm}'+
      'body{font-family:Arial,sans-serif;font-size:11px;color:#111;margin:0;padding:6px}'+
      'h1{font-size:16px;margin:0 0 2px}'+
      '.sub{font-size:11px;color:#444;margin-bottom:8px}'+
      'table{width:100%;border-collapse:collapse;table-layout:fixed}'+
      'th,td{border:1px solid #999;padding:4px 5px;vertical-align:top;text-align:right;word-wrap:break-word}'+
      'th{background:#E9EEF5;font-size:11px}'+
      'tr{page-break-inside:avoid}'+
      'thead{display:table-header-group}'+
      '.nm{font-weight:bold;font-size:12px}'+
      '.ph,.dt,.tm{white-space:nowrap;text-align:center}'+
      '.it{font-size:10.5px;line-height:1.5}'+
      '.is{color:#555;font-size:10px}'+
      '.st{text-align:center;font-weight:bold;white-space:nowrap}'+
      '.st.ok{color:#15803D}.st.mid{color:#B26A00}.st.wait{color:#9B1C1C}'+
      '.rm{text-align:center;font-weight:bold;white-space:nowrap}'+
      '.foot{margin-top:8px;font-size:11px}'+
      '</style></head><body>'+
      '<h1>ورقة تشغيل الحفلات</h1>'+
      '<div class="sub">عدد الحجوزات: '+books.length+' · جاهز للتسليم: '+ready+' · إجمالي المتبقي: '+fmt(totalRem)+' ج.م · طُبعت: '+esc(new Date().toLocaleString('ar-EG'))+'</div>'+
      (books.length
        ? '<table><colgroup><col style="width:14%"><col style="width:12%"><col style="width:10%"><col style="width:7%"><col style="width:33%"><col style="width:12%"><col style="width:12%"></colgroup>'+
          '<thead><tr><th>العميل</th><th>التليفون</th><th>التاريخ</th><th>الساعة</th><th>الأصناف (حالة كل صنف)</th><th>حالة الحجز</th><th>المتبقي</th></tr></thead><tbody>'+rows+'</tbody></table>'
        : '<div>مفيش حجوزات نشطة.</div>')+
      '<div class="foot">الحالة: ✓ جاهز = الصنف اتجهز · ⏳ مستني = لسه في التجهيز.</div>'+
      '</body></html>';
  };

  window.pmPartySheetOpen=async function(){
    try{ if(typeof window.pmPartyWorkflowRefresh==='function') await window.pmPartyWorkflowRefresh(); }catch(e){}
    if(typeof window.pmShowDoc!=='function'){ alert('الطباعة مش متاحة دلوقتي. حدّث الصفحة.'); return; }
    window.pmShowDoc(window.pmPartySheetHtml(),'ورقة الحفلات');
  };

  function ensureBar(){
    var body=document.getElementById('partiesBody'); if(!body) return;
    if(document.getElementById('pmPartySheetBar')) return;
    var bar=document.createElement('div');
    bar.id='pmPartySheetBar';
    bar.style.cssText='display:flex;justify-content:flex-end;margin:6px 0';
    bar.innerHTML='<button type="button" class="secondary mini" id="pmPartySheetBtn">🖨️ ورقة الأوردرات (مضغوطة)</button>';
    body.parentNode.insertBefore(bar, body);
    document.getElementById('pmPartySheetBtn').onclick=function(){ window.pmPartySheetOpen(); };
  }


  /* ---------- الحفلة نفسها تظهر كسطر مضغوط على الشاشة ----------
     كل كارت حجز في تبويب الحفلات بيتعرض كسطر واحد (العميل · الموعد · الحالة · المتبقي)،
     ولما تضغط عليه يفتح التفاصيل كاملة (الأصناف والأزرار). */
  var __pmOpenKeys = window.__pmOpenKeys || (window.__pmOpenKeys = {});
  function addCompactStyle(){
    if(document.getElementById('pmCompactCss')) return;
    var st=document.createElement('style'); st.id='pmCompactCss';
    st.textContent =
      '.pm-compact:not(.pm-open) > :not(.pm-po-sum){display:none !important}'+
      '.pm-po-sum{display:flex;align-items:center;gap:8px;flex-wrap:wrap;cursor:pointer;padding:8px 10px;border-radius:12px;background:#F7F9FC;border:1px solid #E6EBF2;font-size:13px}'+
      '.pm-po-sum .sn{font-weight:700;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '.pm-po-sum .st{color:#5E5E5E;white-space:nowrap}'+
      '.pm-po-sum .rm{font-weight:700;color:#0067B8;white-space:nowrap}'+
      '.pm-compact.pm-open > .pm-po-sum{background:#EAF3FB}';
    document.head.appendChild(st);
  }
  function cardKey(card){
    var h=card.querySelector('.pm-po-head b'); var m=Array.prototype.find.call(card.querySelectorAll('.pm-po-meta'),function(x){return /الموعد/.test(x.textContent)});
    return (h?h.textContent.trim():'')+'|'+(m?m.textContent.trim():'');
  }
  function compactCards(){
    addCompactStyle();
    var body=document.getElementById('partiesBody'); if(!body) return;
    body.querySelectorAll('.pm-po-card').forEach(function(card){
      if(card.querySelector(':scope > .pm-po-sum')) return;
      var head=card.querySelector('.pm-po-head');
      var name=head&&head.querySelector('b'); name=name?name.textContent.trim():'بدون اسم';
      var metaEl=Array.prototype.find.call(card.querySelectorAll('.pm-po-meta'),function(x){return /الموعد/.test(x.textContent)});
      var when=metaEl?(metaEl.textContent.split('الموعد:')[1]||'').trim():'';
      var pill=head&&head.querySelector('.pill');
      var pay=card.querySelector('.pm-po-pay');
      var remM=pay?/المتبقي\s*([^ج]+?)\s*ج/.exec(pay.textContent):null;
      var rem=remM?remM[1].trim()+' ج.م':'';
      var sum=document.createElement('div'); sum.className='pm-po-sum';
      sum.innerHTML='<span class="sn">'+esc(name)+'</span>'+
        '<span class="st">'+esc(when)+'</span>'+
        (pill?pill.outerHTML:'')+
        (rem?'<span class="rm">'+esc(rem)+'</span>':'');
      card.classList.add('pm-compact');
      card.insertBefore(sum, card.firstChild);
      if(__pmOpenKeys[cardKey(card)]) card.classList.add('pm-open');
    });
  }
  document.addEventListener('click', function(ev){
    var sum=ev.target&&ev.target.closest?ev.target.closest('.pm-po-sum'):null;
    if(!sum) return;
    var card=sum.parentElement; if(!card) return;
    var open=card.classList.toggle('pm-open');
    var k=cardKey(card);
    if(open) __pmOpenKeys[k]=true; else delete __pmOpenKeys[k];
  });

  function wrap(){
    var orig=window.pmPartyWorkflowRender;
    if(typeof orig!=='function' || orig.__pmSheetWrapped) return;
    var w=function(){ var r=orig.apply(this,arguments); try{ ensureBar(); compactCards(); }catch(e){} return r; };
    w.__pmSheetWrapped=true; window.pmPartyWorkflowRender=w;
  }
  function init(){ wrap(); ensureBar(); try{ compactCards(); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else setTimeout(init,0);
})();
