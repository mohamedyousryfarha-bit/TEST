/* 198-auto-update.js
 * تحديث التطبيق تلقائيًا من غير زر تحديث:
 * - بيفحص وجود نسخة جديدة كل 5 دقايق، ولما التبويب يرجع يبقى ظاهر، ولما النت يرجع.
 * - لما النسخة الجديدة تتنزل، بيعمل تحديث تلقائي في وقت آمن بس:
 *   مفيش تعديلات لسه مترفعتش للسيرفر، ومفيش حقل مفتوح للكتابة.
 * - لو الوقت مش آمن، بيظهر شريط صغير ويستنى ويجرب كل 15 ثانية.
 * ملحوظة: كل نشر جديد لازم يتغيّر فيه sw.js (رقم CACHE) عشان المتصفح يعرف إن فيه نسخة جديدة.
 */
(function () {
  'use strict';
  if (window.__pmAutoUpdateLoaded) return;
  window.__pmAutoUpdateLoaded = true;
  if (!('serviceWorker' in navigator)) return;

  var hadController = !!navigator.serviceWorker.controller;
  var pending = false;
  var reloading = false;
  var waitTimer = null;
  var bar = null;

  function isSafeNow() {
    var a = document.activeElement;
    if (a && a.matches && a.matches('input,textarea,select,[contenteditable="true"]')) return false;
    if (document.querySelector('dialog[open], .pm-qp-ov')) return false;
    try {
      if (navigator.onLine && typeof cloudReady !== 'undefined' && cloudReady &&
          typeof state !== 'undefined' && typeof cloudLastSavedHash !== 'undefined' &&
          JSON.stringify(state) !== cloudLastSavedHash) {
        return false; // فيه تعديلات لسه مترفعتش؛ نستنى تتأكد من السيرفر
      }
    } catch (e) { /* لو الحالة مش جاهزة، نعتبرها آمنة */ }
    return true;
  }

  function showBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText =
      'position:fixed;inset-inline:0;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);' +
      'z-index:9999;margin:0 auto;width:max-content;max-width:92%;background:#0067B8;color:#fff;' +
      'padding:8px 14px;border-radius:12px;font-size:14px;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.2)';
    bar.textContent = 'في تحديث جديد للتطبيق، هيتطبق تلقائيًا أول ما تخلص العملية الحالية.';
    document.body.appendChild(bar);
  }
  function hideBar() {
    if (bar) { bar.remove(); bar = null; }
  }

  function tryApply() {
    if (reloading || !pending) return;
    if (isSafeNow()) {
      reloading = true;
      hideBar();
      location.reload();
      return;
    }
    showBar();
    if (!waitTimer) {
      waitTimer = setInterval(function () {
        if (!pending || reloading) { clearInterval(waitTimer); waitTimer = null; return; }
        tryApply();
      }, 15000);
    }
  }

  // الـ Service Worker الجديد بيتفعّل لوحده (skipWaiting + clients.claim في sw.js)،
  // فالتغيير ده هو الإشارة إن الصفحة الحالية لازم تتحدّث
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController) { hadController = true; return; } // أول تثبيت، مش محتاج تحديث
    pending = true;
    tryApply();
  });

  function checkUpdate() {
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) return;
      if (reg.waiting) { pending = true; tryApply(); }
      return reg.update();
    }).catch(function () { /* مفيش نت أو مش متاح؛ هنجرب تاني */ });
  }

  if (document.readyState === 'complete') checkUpdate();
  else window.addEventListener('load', checkUpdate);
  setInterval(checkUpdate, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') checkUpdate();
  });
  window.addEventListener('online', function () { setTimeout(checkUpdate, 1500); });
})();
