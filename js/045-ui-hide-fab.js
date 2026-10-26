(function(){
  var SEL='#pmSheetBg.show,.pm-sheet.show,.pm-pal.show,#pmDevSheet:not([hidden]),#messageDialog.show,.pm-sheet-s';
  function isOpen(){
    var els=document.querySelectorAll(SEL);
    for(var i=0;i<els.length;i++){
      if(getComputedStyle(els[i]).display!=='none') return true;
    }
    return false;
  }
  setInterval(function(){ document.body.classList.toggle('pm-overlay-open', isOpen()); },200);
})();
