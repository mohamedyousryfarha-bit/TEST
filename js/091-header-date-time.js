(function(){
  'use strict';
  function updateHeaderDateTime(){
    var dateEl=document.getElementById('headerDate');
    var timeEl=document.getElementById('headerTime');
    if(!dateEl||!timeEl)return;
    var now=new Date();
    dateEl.textContent=new Intl.DateTimeFormat('ar-EG-u-nu-latn',{year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    timeEl.textContent=new Intl.DateTimeFormat('ar-EG-u-nu-latn',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(now);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateHeaderDateTime);else updateHeaderDateTime();
  window.setInterval(updateHeaderDateTime,1000);
})();
