(function(){
  if(window.__pmInv)return; window.__pmInv=true;
  var DEF={shopName:'PastryMY',address:'',phone:'',taxCard:'',commercialReg:'',footer:'شكراً لزيارتكم'};
  function isAdmin(){ return typeof cloudActorRole!=='undefined'&&cloudActorRole==='admin'; }
  function tpl(){ return Object.assign({},DEF,(state&&state.invoiceTemplate)||{}); }
  function esc2(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}) }
  function money(v){ return (Math.round((Number(v)||0)*100)/100).toFixed(2) }
  function lastReceipt(){
    var log=(state&&state.salesLog)||[];
    if(!log.length)return null;
    var no=log[0].receiptNo, lines=log.filter(function(l){return l.receiptNo===no});
    return {no:no,date:lines[0].date||'',by:lines[0].by||'',lines:lines,total:lines.reduce(function(a,l){return a+(Number(l.revenue)||0)},0)};
  }
  function render(){
    var box=document.getElementById('pmInvPreview'); if(!box)return;
    var t=tpl(), r=lastReceipt();
    var rows=r?r.lines.map(function(l){
      return '<tr><td>'+esc2(l.name)+'</td><td>'+esc2(l.qty)+'</td><td>'+money(l.unitPrice)+'</td><td>'+money(l.revenue)+'</td></tr>';
    }).join(''):'<tr><td colspan="4" style="color:#7E6F66">لسه مفيش فواتير. الفاتورة هتظهر هنا بعد أول بيع.</td></tr>';
    box.innerHTML=(window.pmInvoiceHTML&&r)?window.pmInvoiceHTML(r,t):'<div class="pmi-paper">'+
      '<div class="pmi-head"><b>'+esc2(t.shopName)+'</b>'+(t.address?'<div>'+esc2(t.address)+'</div>':'')+(t.phone?'<div>'+esc2(t.phone)+'</div>':'')+(t.commercialReg?'<div>السجل التجاري: '+esc2(t.commercialReg)+'</div>':'')+(t.taxCard?'<div>البطاقة الضريبية: '+esc2(t.taxCard)+'</div>':'')+'</div>'+
      '<div class="pmi-meta">'+(r?'<span>فاتورة رقم '+esc2(r.no)+'</span>':'')+(r&&r.date?'<span>'+esc2(r.date)+'</span>':'')+(r&&r.by?'<span>البائع: '+esc2(r.by)+'</span>':'')+'</div>'+
      '<table class="pmi-tbl"><thead><tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>'+rows+'</tbody>'+
      (r?'<tfoot><tr><th colspan="3">الإجمالي</th><th>'+money(r.total)+' ج.م</th></tr></tfoot>':'')+'</table>'+
      '<div class="pmi-foot">'+esc2(t.footer)+'</div></div>';
  }
  function fill(){
    var t=tpl();
    ['shopName','address','phone','taxCard','commercialReg','footer'].forEach(function(k){ var el=document.getElementById('pmInv_'+k); if(el&&document.activeElement!==el)el.value=t[k]||'' });
  }
  function save(){
    var t={shopName:document.getElementById('pmInv_shopName').value.trim()||DEF.shopName,
           address:document.getElementById('pmInv_address').value.trim(),
           phone:document.getElementById('pmInv_phone').value.trim(),
           taxCard:document.getElementById('pmInv_taxCard').value.trim(),
           commercialReg:document.getElementById('pmInv_commercialReg').value.trim(),
           footer:document.getElementById('pmInv_footer').value.trim()};
    state.invoiceTemplate=t;
    try{ save_() }catch(e){}
    render();
    alert('تم حفظ هيكل الفاتورة.');
  }
  var save_=window.save;
  function build(){
    if(!isAdmin()){ var old=document.getElementById('invoice'); if(old)old.remove(); var b=document.getElementById('pmInvTab'); if(b)b.remove(); return; }
    if(document.getElementById('invoice'))return;
    var nav=document.querySelector('nav.tabs'); if(!nav)return;
    var tab=document.createElement('button'); tab.type='button'; tab.className='tab'; tab.id='pmInvTab'; tab.dataset.tab='invoice';
    tab.textContent='هيكل الفاتورة';
    tab.addEventListener('click',function(){ if(typeof window.go==='function')window.go('invoice') });
    var cartTab=nav.querySelector('.tab[data-tab="cartpage"]');
    if(cartTab)cartTab.insertAdjacentElement('afterend',tab); else nav.appendChild(tab);
    var sec=document.createElement('section'); sec.id='invoice'; sec.className='panel';
    sec.innerHTML='<div class="card"><div class="sectionhead"><h2>هيكل الفاتورة</h2></div>'+
      '<p class="small">البيانات دي بتظهر في أعلى الفاتورة اللي بتتطبع للعميل. عدّل وحفظ، والمعاينة هتتحدث.</p>'+
      '<label>اسم المحل</label><input id="pmInv_shopName" placeholder="اسم المحل">'+
      '<label>العنوان</label><input id="pmInv_address" placeholder="العنوان">'+
      '<label>رقم الهاتف</label><input id="pmInv_phone" placeholder="رقم الهاتف">'+
      '<label>البطاقة الضريبية</label><input id="pmInv_taxCard" placeholder="رقم البطاقة الضريبية">'+
      '<label>السجل التجاري</label><input id="pmInv_commercialReg" placeholder="رقم السجل التجاري">'+
      '<label>نص أسفل الفاتورة</label><input id="pmInv_footer" placeholder="شكراً لزيارتكم">'+
      '<div class="actions" style="margin-top:10px"><button type="button" id="pmInvSave" class="primary">حفظ الهيكل</button></div>'+
      '<h3 style="margin:16px 0 8px">معاينة</h3><div id="pmInvPreview"></div></div>';
    var target=document.getElementById('cartpage');
    (target||nav.parentElement).insertAdjacentElement('afterend',sec);
    document.getElementById('pmInvSave').addEventListener('click',save);
    fill(); render();
  }
  var css=document.createElement('style');
  css.textContent='.pmi-paper{background:#fff;color:#37251A;border:1px solid #EAE0DB;border-radius:14px;padding:16px;max-width:420px;font-size:13px}.pmi-head{text-align:center;margin-bottom:8px;line-height:1.7}.pmi-head b{font-size:16px}.pmi-meta{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;color:#7E6F66;font-size:12px;margin-bottom:8px}.pmi-tbl{width:100%;border-collapse:collapse}.pmi-tbl th,.pmi-tbl td{padding:6px 4px;border-bottom:1px solid #F6F1EE;text-align:center}.pmi-tbl tfoot th{border-top:2px solid #3E2415}.pmi-foot{text-align:center;margin-top:10px;color:#7E6F66;font-size:12px}';
  document.head.appendChild(css);
  new MutationObserver(function(){ if(document.body.classList.contains('auth-required'))return; build(); }).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',function(e){ if(e.target&&e.target.closest&&e.target.closest('[data-tab="invoice"]'))setTimeout(function(){fill();render()},50) });
  setTimeout(build,600);
})();
