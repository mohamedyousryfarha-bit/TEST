/* زرار تبديل المظهر يقول الاتجاه الصح: في النهاري "تحويل للوضع الليلي"، وفي الليلي "تحويل للوضع النهاري" */
(function(){
  var RX=/^\s*(تحويل للوضع|الوضع (الليلي|النهاري)|تبديل الوضع)/;
  function wanted(){
    return document.documentElement.getAttribute('data-theme')==='dark'?'تحويل للوضع النهاري':'تحويل للوضع الليلي';
  }
  function fix(){
    var label=wanted();
    document.querySelectorAll('button,[role="button"],.pm-pal-item').forEach(function(b){
      var w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT,null), n;
      while((n=w.nextNode())){
        if(RX.test(n.nodeValue)){
          var lead=n.nodeValue.match(/^\s*/)[0], trail=n.nodeValue.match(/\s*$/)[0];
          var nv=lead+label+trail;
          if(n.nodeValue!==nv) n.nodeValue=nv;
          break;
        }
      }
    });
  }
  setInterval(fix,500);
  new MutationObserver(fix).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  fix();
})();
