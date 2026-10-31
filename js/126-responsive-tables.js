/* يلف أي جدول مش متلفوف في حاوية بسكرول أفقي، عشان الجداول اللي بتتولد بالـJS تفضل مرتبة على الموبايل */
(function(){
  function wrapTables(root){
    (root||document).querySelectorAll('table').forEach(function(t){
      if(t.closest('.tablewrap,.tbl-wrap')) return;
      var w=document.createElement('div');
      w.className='tablewrap';
      t.parentNode.insertBefore(w,t);
      w.appendChild(t);
    });
  }
  wrapTables(document);
  var pending=null;
  new MutationObserver(function(){
    clearTimeout(pending);
    pending=setTimeout(function(){ wrapTables(document); },150);
  }).observe(document.body,{childList:true,subtree:true});
})();
