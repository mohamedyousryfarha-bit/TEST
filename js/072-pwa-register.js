if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js",{scope:"./"}).catch(function(e){console.warn("SW failed",e)});});}
