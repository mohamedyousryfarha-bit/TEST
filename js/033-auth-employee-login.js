(function(){
  var sel=document.getElementById('employeeName');
  var pane=document.getElementById('employeePane');
  var grid=document.getElementById('staffGrid');
  var staffStep=document.getElementById('staffStep');
  var pinStep=document.getElementById('pinStep');
  var pinInput=document.getElementById('employeePin');
  if(!sel||!pane||!grid||!staffStep||!pinStep||!pinInput)return;
  var PALETTE=['#7E4728','#16794B','#9A5B00','#7C3AED','#B42318','#83411B','#BE185D','#4D7C0F'];
  function colorFor(n){var h=0;for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return PALETTE[h%PALETTE.length]}
  function initial(n){return (n||'?').trim().charAt(0)}
  function showStaff(){ pinStep.classList.add('hide'); staffStep.classList.remove('hide'); pinInput.value=''; }
  function pick(name){
    sel.value=name;
    var av=document.getElementById('pinAvatar'), nm=document.getElementById('pinName');
    av.style.background=colorFor(name); av.textContent=initial(name);
    nm.textContent=name;
    staffStep.classList.add('hide'); pinStep.classList.remove('hide');
    pinInput.value='';
    setTimeout(function(){ pinInput.focus() },60);
  }
  function build(){
    grid.innerHTML='';
    var count=0;
    Array.prototype.forEach.call(sel.options,function(o){
      if(!o.value)return;
      count++;
      var b=document.createElement('button');
      b.type='button'; b.className='staff-card';
      var av=document.createElement('span'); av.className='staff-av'; av.style.background=colorFor(o.value); av.textContent=initial(o.value);
      var t=document.createElement('b'); t.textContent=o.value;
      b.appendChild(av); b.appendChild(t);
      b.addEventListener('click',function(){ pick(o.value) });
      grid.appendChild(b);
    });
    if(!count){
      var e=document.createElement('div'); e.className='staff-empty'; e.textContent='جارٍ تحميل أسماء الموظفين…';
      grid.appendChild(e);
    }
  }
  new MutationObserver(build).observe(sel,{childList:true});
  new MutationObserver(function(){ if(!pane.classList.contains('hide')) showStaff(); })
    .observe(pane,{attributes:true,attributeFilter:['class']});
  document.getElementById('pinBackButton').addEventListener('click',showStaff);
  build();
})();
