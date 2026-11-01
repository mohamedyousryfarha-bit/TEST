(function(){
  /* طبقة حماية: أي عنصر ثابت (fixed) مخفي أو خارج الشاشة مابيكونش ماسك اللمس، وده بيرجع يشتغل أول ما يظهر */
  if(window.__pmTapGuard)return; window.__pmTapGuard=true;
  function sweep(){
    var all=document.body.querySelectorAll('*');
    for(var i=0;i<all.length;i++){
      var el=all[i];
      var cs=getComputedStyle(el);
      if(cs.position!=='fixed')continue;
      var r=el.getBoundingClientRect();
      var hidden = cs.display==='none' || cs.visibility==='hidden' || parseFloat(cs.opacity)===0 ||
                   r.width===0 || r.height===0 || r.bottom<=0 || r.top>=innerHeight || r.right<=0 || r.left>=innerWidth;
      if(hidden){
        if(el.dataset.pmPe===undefined){ el.dataset.pmPe=el.style.pointerEvents||'__'; el.style.pointerEvents='none'; }
      }else if(el.dataset.pmPe!==undefined){
        el.style.pointerEvents=el.dataset.pmPe==='__'?'':el.dataset.pmPe;
        delete el.dataset.pmPe;
      }
    }
  }
  var t=null;
  function later(){ clearTimeout(t); t=setTimeout(sweep,120) }
  new MutationObserver(later).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
  window.addEventListener('resize',later);
  window.addEventListener('scroll',later,{passive:true});
  setInterval(sweep,2000);
  sweep();
})();
