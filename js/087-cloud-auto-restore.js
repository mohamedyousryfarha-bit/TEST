/* أول ما التطبيق يفتح ويدخل السحابة: بيحمّل آخر نسخة سحابية تلقائي (مرة واحدة في كل فتحة) */
(function(){
  var tries=0;
  var iv=setInterval(function(){
    tries++;
    if(window.__pmAutoCloud || tries>400){ clearInterval(iv); return; }
    try{
      if(typeof cloudReady!=='undefined' && cloudReady){
        var b=document.getElementById('reloadCloudButton');
        // لو فيه تعديلات محلية معلقة ما تستناها تتزامن: ما نعملش تحميل تلقائي عشان ما نكسرهاش
        var pending=null; try{ pending=(typeof PENDING_SYNC_KEY!=='undefined')?localStorage.getItem(PENDING_SYNC_KEY):null; }catch(e){}
        if(pending){ window.__pmAutoCloud=true; clearInterval(iv); return; }
        if(b && !b.disabled){
          window.__pmAutoCloud=true;
          clearInterval(iv);
          b.click();
        }
      }
    }catch(e){}
  },500);
})();
