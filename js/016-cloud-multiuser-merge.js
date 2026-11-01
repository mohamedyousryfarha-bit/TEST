(function(){
  /* تعدد المستخدمين: كل جهاز بيحفظ تغييراته بس، والسيرفر بيدمج، ومفيش جهاز يمسح تعديلات جهاز تاني */
  var origApi=window.apiCall, origPersist=window.persistCloudSnapshot;
  var pmBase=null;        // آخر نسخة سحابية الجهاز اشتغل عليها (الأساس للدمج)
  var pmAdopted=false;    // الحفظ اتم والجهاز اتبنى على النسخة المدمجة
  var pmResave=false;     // في تعديلات جديدة اتعملت أثناء الحفظ، لازم تتحفظ بعده

  function copy(o){ return JSON.parse(JSON.stringify(o)); }
  function isFocusedField(){ var a=document.activeElement; return !!(a&&a.matches&&a.matches('input,textarea,select')); }

  window.apiCall=function(body){
    if(!body||typeof origApi!=='function') return origApi.apply(this,arguments);

    if(body.action==='get_state'){
      var clean=(JSON.stringify(state)===cloudLastSavedHash);
      var firstLoad=!cloudReady;
      return Promise.resolve(origApi.apply(this,arguments)).then(function(res){
        if(res&&res.data&&res.data.state&&(firstLoad||clean||!pmBase)) pmBase=copy(res.data.state);
        return res;
      });
    }

    if(body.action==='save_state'){
      var sent=body.state;
      var sentStr=JSON.stringify(sent);
      var withBase=Object.assign({},body,{base_state: pmBase||null});
      return Promise.resolve(origApi.call(this,withBase)).then(function(res){
        if(!res||res.error||!res.data||!res.data.state) return res;
        var merged=res.data.state;
        if(JSON.stringify(state)===sentStr){
          // ما اتعملش تعديل أثناء الحفظ: بناخد النسخة المدمجة (فيها تعديلات الأجهزة التانية)
          state=migrateStateUnits(copy(merged));
          pmBase=copy(merged);
          pmAdopted=true;
          pmResave=false;
          if(!isFocusedField()) renderAll();
        }else{
          // اتعملت تعديلات أثناء الحفظ: الأساس هو اللي اتبعت، والتعديلات الجديدة بتتحفظ بعده
          pmBase=copy(sent);
          pmAdopted=false;
          pmResave=true;
        }
        return res;
      });
    }

    return origApi.apply(this,arguments);
  };

  window.persistCloudSnapshot=function(snapshot){
    return origPersist.apply(this,arguments).then(function(r){
      if(pmAdopted){
        cloudLastSavedHash=JSON.stringify(state);
        pmAdopted=false;
        setCloudStatus('تمت المزامنة مع الأجهزة الأخرى ✓ · الإصدار '+cloudRevision);
      }
      if(pmResave){
        pmResave=false;
        scheduleCloudSave(copy(state),false);
      }
      return r;
    });
  };
})();
