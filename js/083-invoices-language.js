/* اختيار لغة الفاتورة (عربي / English) من شاشة الفاتورة قبل الطباعة */
(function(){
  var ORIG=window.pmShowInvoice;
  if(typeof ORIG!=='function') return;
  var EN=[
    ['<small>رقم الفاتورة</small>','<small>Invoice No.</small>'],
    ['<small>التاريخ</small>','<small>Date</small>'],
    ['<small>البائع</small>','<small>Cashier</small>'],
    ['<th class="nm">الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th>','<th class="nm">Item</th><th>Qty</th><th>Price</th><th>Total</th>'],
    ['<span>الإجمالي</span>','<span>Total</span>'],
    ['العميل: <b>','Customer: <b>'],
    ['التليفون: <b','Phone: <b'],
    ['ملاحظة: ','Note: '],
    ['السجل التجاري: ','Commercial Reg.: '],
    ['البطاقة الضريبية: ','Tax Card: '],
    [' ج.م</b>',' EGP</b>'],
    ['شكراً لزيارتكم','Thank you for your visit']
  ];
  var AR_DIGITS='٠١٢٣٤٥٦٧٨٩';
  function toWestern(h){
    return h.replace(/[٠-٩]/g,function(c){return String(AR_DIGITS.indexOf(c))})
            .replace(/٫/g,'.').replace(/٬/g,',');
  }
  function toEnglish(h){
    EN.forEach(function(p){ h=h.split(p[0]).join(p[1]); });
    h=toWestern(h);
    return h.replace('<div class="inv">','<div class="inv" dir="ltr" lang="en">');
  }
  window.pmShowInvoice=function(rc){
    ORIG.apply(this,arguments);
    var ovs=document.querySelectorAll('.pmv-ov'), ov=ovs[ovs.length-1];
    if(!ov) return;
    var paper=ov.querySelector('#pmInvPrint'), box=ov.querySelector('.pmv-box'), acts=ov.querySelector('.pmv-acts');
    if(!paper||!box||!acts) return;
    var arHTML=paper.innerHTML;
    var bar=document.createElement('div');
    bar.className='pmv-lang';
    bar.innerHTML='<button type="button" data-l="ar" class="on">عربي</button><button type="button" data-l="en">English</button>';
    box.insertBefore(bar,acts);
    bar.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('button[data-l]'); if(!b) return;
      var l=b.getAttribute('data-l');
      paper.innerHTML = l==='en' ? toEnglish(arHTML) : arHTML;
      bar.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
    });
  };
})();
