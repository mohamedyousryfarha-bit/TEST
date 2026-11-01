/* حذف مخلفات الجولة التعريفية القديمة من الجهاز */
try{ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('pm_tour')===0) localStorage.removeItem(k) }) }catch(e){}
