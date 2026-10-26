(function(){
  if(window.__pmBack) return; window.__pmBack=true;
  var stack=[], restoring=false, current=null;
  function activePanel(){ var p=document.querySelector('.panel.active'); return p?p.id:null }
  function closeOverlay(){
    var m=document.querySelector('.msg-overlay.show');
    if(m){ var b=m.querySelector('button'); if(b) b.click(); else m.classList.remove('show'); return true }
    var s=document.querySelector('.pm-devsheet');
    if(s){ s.remove(); return true }
    return false;
  }
  try{ history.replaceState({pmNav:0},''); }catch(e){}
  current=activePanel();
  window.__goPost=window.__goPost||[];
  window.__goPost.push(function(){
    if(restoring) return;
    var now=activePanel();
    if(!now||now===current) return;
    if(current){ stack.push(current); if(stack.length>50) stack.shift(); }
    current=now;
    try{ history.pushState({pmNav:stack.length},''); }catch(e){}
  });
  window.addEventListener('popstate',function(){
    if(closeOverlay()){ try{ history.pushState({pmNav:stack.length},'') }catch(e){} return; }
    if(!stack.length) return;
    var prev=stack.pop();
    restoring=true;
    try{ window.go(prev); } finally { restoring=false; }
    current=activePanel();
  });
})();
