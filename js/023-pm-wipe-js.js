(function(){
  if(window.__pmWipe)return; window.__pmWipe=true;

  function isAdmin(){ return typeof cloudActorRole!=='undefined'&&cloudActorRole==='admin'; }
  function unlocked(){ return !document.body.classList.contains('auth-required'); }

  function downloadBackup(){
    try{
      var blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='RMY-before-wipe-'+new Date().toISOString().slice(0,10)+'.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(a.href) },1500);
      return true;
    }catch(e){ return false }
  }

  function askPassword(onOk){
    var ov=document.createElement('div'); ov.className='pmw-ov';
    ov.innerHTML='<div class="pmw-box" role="dialog" aria-modal="true" aria-labelledby="pmwT">'+
      '<h3 id="pmwT">حذف كل الوصفات</h3>'+
      '<p>الإجراء ده هيمسح <b>كل الوصفات ومكوناتها</b> من البرنامج ومن السحابة، ومش هيتراجع بضغطة. الأصناف اللي في المنيو هتفضل موجودة بس مش هيكون ليها وصفة. هنعمل نسخة احتياطية JSON قبل الحذف.</p>'+
      '<p>اكتب الـ PIN بتاعك كمدير للتأكيد:</p>'+
      '<input type="password" inputmode="numeric" id="pmwPass" autocomplete="off" placeholder="PIN المدير">'+
      '<div class="pmw-err" id="pmwErr"></div>'+
      '<div class="pmw-acts"><button type="button" class="pmw-cancel" id="pmwNo">إلغاء</button>'+
      '<button type="button" class="pmw-go" id="pmwYes">امسح كل الوصفات</button></div></div>';
    document.body.appendChild(ov);
    var inp=ov.querySelector('#pmwPass'), err=ov.querySelector('#pmwErr'), yes=ov.querySelector('#pmwYes');
    setTimeout(function(){ try{inp.focus()}catch(e){} },50);
    function close(){ ov.remove() }
    ov.querySelector('#pmwNo').addEventListener('click',close);
    ov.addEventListener('keydown',function(e){ if(e.key==='Escape')close() });
    yes.addEventListener('click',async function(){
      var pass=inp.value;
      if(!pass){ err.textContent='اكتب الـ PIN الأول.'; return }
      yes.disabled=true; yes.textContent='جارٍ التحقق…'; err.textContent='';
      try{
        var r=await apiCall({action:'verify_employee',employee_name:cloudActorName,pin:pass});
        if(r.error||!r.data||r.data.ok!==true||r.data.role!=='admin') throw new Error('bad');
        close(); onOk();
      }catch(e){
        err.textContent='الـ PIN غلط، أو الحساب ده مش مدير.';
        yes.disabled=false; yes.textContent='امسح كل الوصفات';
        inp.value=''; inp.focus();
      }
    });
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter')yes.click() });
  }

  function wipe(){
    var count=Object.keys(state.recipes||{}).length;
    if(!count){ alert('مفيش وصفات أصلاً.'); return }
    if(!confirm('هتمسح '+count+' وصفة من كل مكان (البرنامج والسحابة). متأكد؟')) return;
    askPassword(function(){
      downloadBackup();
      state.recipes={};
      state.recipeMeta={};
      state.recipeNotes={};
      window.__pmSilentReconcile=true;
      try{ save() } finally { window.__pmSilentReconcile=false }
      try{ if(typeof renderRecipeEditor==='function') renderRecipeEditor() }catch(e){}
      try{ if(typeof renderAll==='function') renderAll() }catch(e){}
      alert('تم مسح كل الوصفات. نسخة احتياطية اتنزلت على جهازك قبل الحذف.');
    });
  }

  function addButton(){
    var sec=document.getElementById('recipes'); if(!sec)return;
    var old=document.getElementById('pmWipeRecipes');
    if(!isAdmin()){ if(old)old.remove(); return; }
    if(old)return;
    var head=sec.querySelector('.sectionhead'); if(!head)return;
    var b=document.createElement('button');
    b.id='pmWipeRecipes'; b.type='button'; b.className='danger mini';
    b.textContent='🗑️ مسح كل الوصفات';
    b.style.marginInlineStart='8px';
    b.addEventListener('click',wipe);
    head.appendChild(b);
  }

  new MutationObserver(function(){ if(unlocked())addButton(); else { var o=document.getElementById('pmWipeRecipes'); if(o)o.remove(); } })
    .observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',function(e){ if(e.target&&e.target.closest&&e.target.closest('[data-tab="recipes"]'))setTimeout(addButton,50); });
  if(unlocked())addButton();
})();
