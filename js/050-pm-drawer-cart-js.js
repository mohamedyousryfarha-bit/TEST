(function(){
  var drawer=document.getElementById('sideDrawer'), overlay=document.getElementById('drawerOverlay');
  var basket=document.getElementById('drawerBasket'), toolsBox=document.getElementById('drawerTools');
  var menuBtn=document.getElementById('drawerBtn'), cartBtn=document.getElementById('cartFab'), cartN=document.getElementById('cartFabN');
  if(!drawer||!basket||!toolsBox||!cartBtn) return;
  function role(){ return (typeof cloudActorRole!=='undefined')?cloudActorRole:''; }
  function menuOn(){ var m=document.getElementById('menu'); return !!(m&&m.classList.contains('active')); }
  function sellAllowed(){ return menuOn() && (role()==='admin'||role()==='sales'); }
  function origTools(){ return document.querySelectorAll('#pmFabs .pm-menu .pm-mi'); }

  /* Create a separate modal and move the existing basket DOM into it, preserving all IDs and handlers. */
  var cartModal=document.getElementById('cartModalOverlay');
  if(!cartModal){
    cartModal=document.createElement('div'); cartModal.id='cartModalOverlay'; cartModal.className='cart-modal-overlay'; cartModal.hidden=true;
    cartModal.innerHTML='<section class="cart-modal-card" role="dialog" aria-modal="true" aria-labelledby="cartModalTitle"><div class="cart-modal-head"><h2 id="cartModalTitle">🧺 سلة المشتريات</h2><button type="button" id="cartModalClose" aria-label="إغلاق سلة المشتريات">×</button></div></section>';
    document.body.appendChild(cartModal);
  }
  var modalCard=cartModal.querySelector('.cart-modal-card');
  if(modalCard && basket.parentElement!==modalCard) modalCard.appendChild(basket);
  basket.classList.add('cart-modal-basket');
  function openCart(v){
    if(v && !sellAllowed()) return;
    if(v){ syncBasket(); if(typeof window.renderCart==='function') window.renderCart(); fabCount(); }
    cartModal.hidden=!v;
    document.body.classList.toggle('cart-modal-open',!!v);
    if(v){ var close=document.getElementById('cartModalClose'); if(close) close.focus({preventScroll:true}); }
  }
  window.pmCloseCart=function(){ openCart(false); };
  function openDrawer(v){
    if(v){ syncTools(); }
    drawer.classList.toggle('open',v); overlay.hidden=!v;
    drawer.setAttribute('aria-hidden',v?'false':'true');
    document.body.classList.toggle('drawer-open',v);
  }
  function buildTools(){
    if(toolsBox.dataset.built) return;
    var o=origTools(); if(!o.length) return;
    Array.prototype.forEach.call(o, function(orig, i){
      /* Keep the shopping basket out of the sidebar even if a legacy shortcut exists there. */
      var label=(orig.textContent||'').replace(/\s+/g,' ').trim();
      if(/سلة المشتريات|السلة/.test(label) || (orig.dataset&&orig.dataset.act==='cart')) return;
      var b=document.createElement('button'); b.type='button'; b.className='pm-mi drawer-tool';
      b.innerHTML=orig.innerHTML; b.dataset.idx=i; toolsBox.appendChild(b);
    });
    toolsBox.dataset.built='1';
  }
  function syncTools(){
    var o=origTools();
    toolsBox.querySelectorAll('.drawer-tool').forEach(function(c){
      var x=o[+c.dataset.idx]; if(x) c.style.display=x.style.display;
    });
  }
  function syncBasket(){
    var on=sellAllowed();
    basket.hidden=!on; cartBtn.hidden=!on;
    if(!on && !cartModal.hidden) openCart(false);
  }
  function fabCount(){
    var sum=0;
    document.querySelectorAll('#cartItems .cart-row .cqty b').forEach(function(b){ sum+=Number(b.textContent)||0; });
    cartN.textContent=sum;
  }
  var mo=new MutationObserver(function(muts){
    var relevant=muts.some(function(m){ var t=m.target; return !(t.closest && t.closest('#sideDrawer,#drawerOverlay,#cartModalOverlay')); });
    if(relevant){ syncBasket(); syncTools(); }
  });
  mo.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style']});
  var cartItems=document.getElementById('cartItems');
  if(cartItems) new MutationObserver(fabCount).observe(cartItems,{childList:true,subtree:true,characterData:true});

  if(menuBtn) menuBtn.addEventListener('click',function(){ openDrawer(true); });
  cartBtn.addEventListener('click',function(){ openCart(true); });
  overlay.addEventListener('click',function(){ openDrawer(false); });
  document.getElementById('drawerClose').addEventListener('click',function(){ openDrawer(false); });
  var cartClose=document.getElementById('cartModalClose'); if(cartClose) cartClose.addEventListener('click',function(){openCart(false);});
  cartModal.addEventListener('click',function(e){ if(e.target===cartModal) openCart(false); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ if(!cartModal.hidden) openCart(false); else if(drawer.classList.contains('open')) openDrawer(false); } });
  toolsBox.addEventListener('click',function(e){
    var t=e.target.closest('.drawer-tool'); if(!t) return;
    var x=origTools()[+t.dataset.idx];
    openDrawer(false);
    if(x) x.click();
  });
  buildTools(); syncBasket(); syncTools(); fabCount();
})();
