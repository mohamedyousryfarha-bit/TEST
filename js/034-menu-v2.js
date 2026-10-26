(function(){
  var UI=window.__PMUI__||{};
  var IC=UI.ICONS||{};
  function decorate(){
    document.querySelectorAll('#appNav .tab').forEach(function(b){
      if(b.querySelector('.tab-ico'))return;
      var key=b.getAttribute('data-tab');
      var txt=b.textContent.replace(/^[^\u0600-\u06FF]+/,'').trim();
      if(!key && /الرئيسية/.test(txt)) key='home';
      var name=(UI.TAB_ICONS||{})[key]||(IC[key]?key:'')||'list';
      var ico=document.createElement('span'); ico.className='tab-ico ui-ico'; ico.setAttribute('aria-hidden','true');
      ico.innerHTML=IC[name]||IC.list||'';
      var lbl=document.createElement('span'); lbl.className='tab-lbl'; lbl.textContent=txt;
      b.textContent=''; b.appendChild(ico); b.appendChild(lbl);
    });
  }
  decorate();
  var nav=document.getElementById('appNav');
  if(nav) new MutationObserver(decorate).observe(nav,{childList:true,subtree:true});
})();
