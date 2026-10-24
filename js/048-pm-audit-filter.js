window.auditFilter=function(v){
  v=String(v||'').trim().toLowerCase();
  var shown=0;
  document.querySelectorAll('#auditTable .al-day').forEach(function(day){
    var n=0;
    day.querySelectorAll('.al-item').forEach(function(li){
      var ok=!v||(li.getAttribute('data-q')||'').indexOf(v)>-1;
      li.classList.toggle('hide',!ok); if(ok) n++;
    });
    day.classList.toggle('hide',n===0); shown+=n;
  });
  var e=document.getElementById('alEmpty'); if(e) e.classList.toggle('hide',shown>0);
};
