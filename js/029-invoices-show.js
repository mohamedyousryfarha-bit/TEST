(function(){
  if(window.__pmShowInv2)return; window.__pmShowInv2=true;
  function esc(x){ return String(x==null?'':x).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}) }
  function money(v){ return (Math.round((Number(v)||0)*100)/100).toFixed(2) }
  function tplOf(){ return Object.assign({shopName:'PastryMY',address:'',phone:'',taxCard:'',commercialReg:'',footer:'شكراً لزيارتكم'},(state&&state.invoiceTemplate)||{}) }

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
        '<div class="inv-total"><span>الإجمالي</span><b>'+money(total)+' ج.م</b></div></div>'+
      (t.footer?'<div class="inv-foot">'+esc(t.footer)+'</div>':'')+
      '</div>';
  };

    /* رابط صفحة الفاتورة: البيانات نفسها بتتحط في الجزء اللي بعد # (مش بيتبعت لأي سيرفر) */
  function invoiceUrl(rc,t){
    function build(withExtra){
      var pay={v:1,s:t.shopName||'',t:t.taxCard||'',c:t.commercialReg||'',n:rc.no,d:rc.date||'',b:rc.by||'',tt:Number(rc.total)||0,cn:(rc.note||(rc.lines&&rc.lines[0]&&rc.lines[0].note)||''),cp:(rc.customerPhone||(rc.lines&&rc.lines[0]&&rc.lines[0].customerPhone)||''),
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
