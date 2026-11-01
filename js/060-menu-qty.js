(function(){
  function readCart(){
    try{ var a=JSON.parse(localStorage.getItem('pmCart:'+(cloudActorName||'anon'))||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; }
  }
  function escH(t){ return String(t==null?'':t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function qtyIn(name){ var n=0; readCart().forEach(function(l){ if(l.name===name) n+=Number(l.qty)||0; }); return n; }
  window.pmQtyPick=function(enc){
    var name=decodeURIComponent(enc), cur=qtyIn(name);
    var old=document.getElementById('pmQtyOv'); if(old) old.remove();
    var nums='';
    for(var i=0;i<=20;i++){ nums+='<button type="button" class="pm-qp-n'+(i===cur?' on':'')+'" data-n="'+i+'">'+(i===0?'إزالة':i)+'</button>'; }
    var ov=document.createElement('div'); ov.id='pmQtyOv'; ov.className='pm-qp-ov';
    ov.innerHTML='<div class="pm-qp-box" role="dialog" aria-modal="true">'+
      '<div class="pm-qp-title">'+escH(name)+'</div>'+
      '<div class="pm-qp-sub">الكمية الحالية في السلة: '+cur+'</div>'+
      '<div class="pm-qp-grid">'+nums+'</div>'+
      '<div class="pm-qp-row"><input type="number" min="0" inputmode="numeric" id="pmQtyIn" value="'+cur+'"><button type="button" class="pm-qp-ok" id="pmQtyOk">تأكيد</button></div>'+
      '<button type="button" class="pm-qp-x" id="pmQtyX">إغلاق</button></div>';
    document.body.appendChild(ov);
    function close(){ ov.remove(); }
    function apply(v){
      var n=Math.floor(Number(v));
      if(!isFinite(n)||n<0){ close(); return; }
      var c=readCart(), idx=c.findIndex(function(l){return l.name===name});
      var now=idx>=0?(Number(c[idx].qty)||0):0;
      if(n>now){
        for(var k=0;k<n-now;k++){
          var before=qtyIn(name);
          window.pmCartAdd(enc);
          if(qtyIn(name)<=before) break;   // المخزون خلص
        }
      } else if(n<now && idx>=0){
        window.pmCartChange(idx, n-now);
      }
      close();
    }
    ov.addEventListener('click',function(e){
      if(e.target===ov){ close(); return; }
      var b=e.target.closest('[data-n]'); if(b) apply(b.getAttribute('data-n'));
    });
    document.getElementById('pmQtyOk').onclick=function(){ apply(document.getElementById('pmQtyIn').value); };
    document.getElementById('pmQtyX').onclick=close;
  };
})();
