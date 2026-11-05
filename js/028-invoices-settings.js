/* دمج تلقائي لملفات متتالية من نفس الميزة بالترتيب الأصلي. كل جزء معزول بـ try/catch عشان فشل جزء ما يوقفش الباقي. */
/* ---- 028-invoices-settings.js ---- */
try{
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
    }).join(''):'<tr><td colspan="4" style="color:#1B1B1B">لسه مفيش فواتير. الفاتورة هتظهر هنا بعد أول بيع.</td></tr>';
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
  css.textContent='.pmi-paper{background:#fff;color:#1B1B1B;border:1px solid #D6D6D6;border-radius:14px;padding:16px;max-width:420px;font-size:13px}.pmi-head{text-align:center;margin-bottom:8px;line-height:1.7}.pmi-head b{font-size:16px}.pmi-meta{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;color:#1B1B1B;font-size:12px;margin-bottom:8px}.pmi-tbl{width:100%;border-collapse:collapse}.pmi-tbl th,.pmi-tbl td{padding:6px 4px;border-bottom:1px solid #D6D6D6;text-align:center}.pmi-tbl tfoot th{border-top:2px solid #0067B8}.pmi-foot{text-align:center;margin-top:10px;color:#1B1B1B;font-size:12px}';
  document.head.appendChild(css);
  new MutationObserver(function(){ if(document.body.classList.contains('auth-required'))return; build(); }).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',function(e){ if(e.target&&e.target.closest&&e.target.closest('[data-tab="invoice"]'))setTimeout(function(){fill();render()},50) });
  setTimeout(build,600);
})();
}catch(e){console.error('[PastryMY] 028-invoices-settings.js failed',e)}
/* ---- 029-invoices-show.js ---- */
try{
(function(){
  if(window.__pmShowInv2)return; window.__pmShowInv2=true;
  function esc(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}) }
  function money(v){ return (Math.round((Number(v)||0)*100)/100).toFixed(2) }
  function tplOf(){ return Object.assign({shopName:'PastryMY',address:'',phone:'',taxCard:'',commercialReg:'',footer:'شكراً لزيارتكم'},(state&&state.invoiceTemplate)||{}) }

  /* ضريبة الفاتورة: بتتسجل مع رقم الفاتورة على الجهاز عشان تفضل ظاهرة في إعادة الطباعة */
  var TAX_KEY='pmReceiptTax';
  function taxKey(rc){ return (rc&&rc.id)?'id:'+rc.id:'no:'+(rc&&rc.no); }
  window.pmSetReceiptTax=function(rc,tax){
    rc.tax=tax;
    try{ var m=JSON.parse(localStorage.getItem(TAX_KEY)||'{}'); m[taxKey(rc)]=tax; localStorage.setItem(TAX_KEY,JSON.stringify(m)); }catch(e){}
  };
  function taxOf(rc){
    if(rc&&rc.tax&&Number(rc.tax.amount)>0) return rc.tax;
    try{ var m=JSON.parse(localStorage.getItem(TAX_KEY)||'{}'); var t=m[taxKey(rc)]; return (t&&Number(t.amount)>0)?t:null; }catch(e){ return null; }
  }
  /* الإجمالي النهائي بعد الضريبة (لو مفيش ضريبة بيرجع الإجمالي زي ما هو) */
  window.pmRcGrand=function(rc){ var t=taxOf(rc); return (Number(rc&&rc.total)||0)+(t?Number(t.amount)||0:0); };

  /* تصميم الفاتورة: بيتستخدم على الشاشة وفي معاينة هيكل الفاتورة */
  window.pmInvoiceHTML=function(rc,t){
    t=Object.assign({shopName:'PastryMY',address:'',phone:'',taxCard:'',commercialReg:'',footer:''},t||{});
    var lines=(rc&&rc.lines)||[];
    var cname=(rc&&(rc.note||(lines[0]&&lines[0].note)))||'';
    var cphone=(rc&&rc.customerPhone)||(lines[0]&&lines[0].customerPhone)||'';
    var sum=0;
    var rows=lines.map(function(l,i){
      var qty=Number(l.qty)||0, unit=Number(l.unitPrice)||0, rev=(l.revenue!=null)?Number(l.revenue):qty*unit;
      sum+=rev;
      return '<tr class="'+(i%2?'alt':'')+'"><td class="nm">'+esc(l.name)+'</td><td>'+esc(qty)+'</td><td>'+money(unit)+'</td><td class="tot">'+money(rev)+'</td></tr>';
    }).join('');
    var total=(rc&&rc.total!=null)?Number(rc.total):sum;
    var tx=taxOf(rc), taxAmt=tx?(Number(tx.amount)||0):0, grand=total+taxAmt;
    var taxRows=tx?'<div class="inv-total" style="font-size:12.5px;font-weight:400"><span>الإجمالي قبل الضريبة</span><b>'+money(total)+' ج.م</b></div>'+
      '<div class="inv-total" style="font-size:12.5px;font-weight:400"><span>ضريبة القيمة المضافة '+esc(tx.rate)+'%</span><b>'+money(taxAmt)+' ج.م</b></div>':'';
    return '<div class="inv">'+
      '<div class="inv-top"><div class="inv-shop">'+esc(t.shopName)+'</div>'+
        (t.address?'<div class="inv-sub">'+esc(t.address)+'</div>':'')+
        (t.phone?'<div class="inv-sub">'+esc(t.phone)+'</div>':'')+'</div>'+
      ((t.commercialReg||t.taxCard)?'<div class="inv-tax">'+
        (t.commercialReg?'<span>السجل التجاري: '+esc(t.commercialReg)+'</span>':'')+
        (t.taxCard?'<span>البطاقة الضريبية: '+esc(t.taxCard)+'</span>':'')+'</div>':'')+
      '<div class="inv-meta">'+
        '<div><small>رقم الفاتورة</small><b>'+esc(rc&&rc.no)+'</b></div>'+
        '<div><small>التاريخ</small><b>'+esc((rc&&rc.date)||'')+'</b></div>'+
        '<div><small>البائع</small><b>'+esc((rc&&rc.by)||'')+'</b></div></div>'+
      ((cname||cphone)?'<div style="text-align:center;font-size:12.5px;margin:0 0 10px">العميل: <b>'+esc(cname||'—')+'</b>'+(cphone?' · التليفون: <b dir="ltr">'+esc(cphone)+'</b>':'')+'</div>':'')+
      '<table class="inv-tbl"><thead><tr><th class="nm">الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div class="inv-sum"><div class="inv-note">'+((rc&&rc.note&&rc.note!==cname)?'ملاحظة: '+esc(rc.note):'')+'</div>'+
        taxRows+'<div class="inv-total"><span>الإجمالي</span><b>'+money(grand)+' ج.م</b></div></div>'+
      (t.footer?'<div class="inv-foot">'+esc(t.footer)+'</div>':'')+
      '</div>';
  };

    /* رابط صفحة الفاتورة: البيانات نفسها بتتحط في الجزء اللي بعد # (مش بيتبعت لأي سيرفر) */
  function invoiceUrl(rc,t){
    function build(withExtra){
      var pay={v:1,s:t.shopName||'',t:t.taxCard||'',c:t.commercialReg||'',n:rc.no,d:rc.date||'',b:rc.by||'',tt:(Number(rc.total)||0)+(taxOf(rc)?(Number(taxOf(rc).amount)||0):0),cn:(rc.note||(rc.lines&&rc.lines[0]&&rc.lines[0].note)||''),cp:(rc.customerPhone||(rc.lines&&rc.lines[0]&&rc.lines[0].customerPhone)||''),
               l:(rc.lines||[]).map(function(l){return [l.name,Number(l.qty)||0,Number(l.unitPrice)||0,Number(l.revenue)||0]})};
      if(withExtra){ pay.a=t.address||''; pay.p=t.phone||''; pay.f=t.footer||''; pay.o=rc.note||'' }
      var bytes=new TextEncoder().encode(JSON.stringify(pay)), bin='';
      for(var i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
      var b64=btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      return new URL('invoice.html#'+b64,location.href).href;
    }
    var u=build(true);
    if(u.length>2000) u=build(false);
    return u.length>2000?null:u;
  }
  
  window.pmShowInvoice=function(rc){
    if(!rc||!Array.isArray(rc.lines))return;
    var t=(rc.isParty&&window.pmPartyTplGet)?window.pmPartyTplGet():tplOf();
    var ov=document.createElement('div'); ov.className='pmv-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
    ov.innerHTML='<div class="pmv-box">'+
      '<div id="pmInvPrint" class="pmv-paper">'+window.pmInvoiceHTML(rc,t)+'</div>'+
      '<div id="pmvQr"><div class="pmv-qrbox" id="pmvQrBox"></div><p>امسح الكود عشان تشوف تفاصيل الفاتورة على موبايلك</p></div>'+
      '<div class="pmv-acts"><button type="button" class="pmv-close" id="pmvClose">إغلاق</button>'+
      '<button type="button" class="pmv-qr" id="pmvQrBtn">▦ QR للفاتورة</button>'+
      '<button type="button" class="pmv-print" id="pmvPrint">🖨️ طباعة / PDF</button></div>'+
      '</div>';
    document.body.appendChild(ov);
    function close(){ ov.remove() }
    ov.querySelector('#pmvClose').addEventListener('click',close);
    ov.querySelector('#pmvPrint').addEventListener('click',function(){ if(window.pmPrintHTML){ window.pmPrintHTML(document.getElementById('pmInvPrint').innerHTML) } else { window.print() } });
    ov.addEventListener('click',function(e){ if(e.target===ov)close() });
    var qrOn=false;
    ov.querySelector('#pmvQrBtn').addEventListener('click',function(){
      var box=ov.querySelector('#pmvQr'), holder=ov.querySelector('#pmvQrBox');
      if(qrOn){ box.classList.remove('on'); qrOn=false; return }
      box.classList.add('on'); qrOn=true;
      if(holder.dataset.done)return;
      Promise.resolve().then(function(){
        holder.innerHTML='';
        var url=invoiceUrl(rc,t);
        if(!url){ holder.innerHTML='<div style="color:#B42318;font-size:12.5px">الفاتورة كبيرة على الكود. اطبعها أو احفظها كـ PDF.</div>'; return; }
        var src='https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data='+encodeURIComponent(url);
        holder.innerHTML='<img src="'+src+'" alt="QR الفاتورة" width="200" height="200" style="display:block;margin:0 auto" onerror="this.outerHTML=\'<div style=color:#B42318;font-size:12.5px>تعذر توليد الكود. تأكد من الاتصال.</div>\'">';
        holder.dataset.done='1';
      }).catch(function(){
        holder.innerHTML='<div style="color:#B42318;font-size:12.5px">تعذر تحميل مكتبة الـ QR. تأكد من الاتصال وجرّب تاني.</div>';
      });
    });
    document.addEventListener('keydown',function esc1(e){ if(e.key==='Escape'){ close(); document.removeEventListener('keydown',esc1) } });
  };
})();
}catch(e){console.error('[PastryMY] 029-invoices-show.js failed',e)}
