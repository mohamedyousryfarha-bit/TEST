(function(){
  'use strict';
  function updateHeaderDateTime(){
    var dateEl=document.getElementById('headerDate');
    var timeEl=document.getElementById('headerTime');
    if(!dateEl||!timeEl)return;
    var now=new Date();
    dateEl.textContent=new Intl.DateTimeFormat('ar-EG-u-nu-latn',{year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    timeEl.textContent=new Intl.DateTimeFormat('ar-EG-u-nu-latn',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(now);
    updateHero(dateEl.textContent,timeEl.textContent);
  }
  /* بانر الترحيب في الشاشة الرئيسية: ترحيب باسم المستخدم + التاريخ والوقت */
  function userName(){
    try{ return (typeof cloudActorName!=='undefined'&&cloudActorName)?String(cloudActorName):''; }catch(e){ return ''; }
  }
  function ensureHero(){
    var h=document.getElementById('rmyHero'); if(h) return h;
    var nav=document.getElementById('appNav'); if(!nav||!nav.parentNode) return null;
    h=document.createElement('section'); h.id='rmyHero'; h.className='rmy-hero'; h.setAttribute('aria-label','ترحيب');
    h.innerHTML='<div><div class="rh-greet"></div><div class="rh-name">ابدأ يومك بكفاءة</div></div>'+
      '<div class="rh-clock"><div class="rh-d"></div><div class="rh-t"></div></div>';
    nav.parentNode.insertBefore(h,nav);
    return h;
  }
  function updateHero(d,t){
    var h=ensureHero(); if(!h) return;
    var n=userName();
    h.querySelector('.rh-greet').textContent='أهلاً بيك'+(n?' '+n:'');
    var clean=function(x){return String(x).replace(/[\u200E\u200F\u061C\u202A-\u202E]/g,'')};
    h.querySelector('.rh-d').textContent=clean(d);
    h.querySelector('.rh-t').textContent=clean(t);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateHeaderDateTime);else updateHeaderDateTime();
  window.setInterval(updateHeaderDateTime,1000);
})();
