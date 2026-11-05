/* 199-offline-sales.js
 * بيع أوفلاين:
 * - لو النت مقطوع قبل البيع، أو وقع أثناء الإرسال، البيع بيتحفظ على الجهاز في طابور.
 * - البيع بياخد request_id ثابت، فلو اترفع مرتين السيرفر مش هيكرره.
 * - الرفع بيحصل تلقائيًا أول ما النت يرجع، ولو السيرفر رفض عملية بيتعلم عليها "فاشلة" ومتتحذفش إلا بموافقتك.
 * ملاحظات:
 * - الحفلات والمشروبات حسب الطلب لسه بتحتاج نت (بيتبلّغ بيها).
 * - رقم الفاتورة بيتحدد وقت الرفع. المبيعات المستنية الرفع بتتخصم من المتاح في المنيو والسلة،
 *   فالموظف مش هيقدر يبيع أكتر من المتاح أوفلاين (والسيرفر برضه بيراجع وقت الرفع).
 */
(function () {
  'use strict';
  if (window.__pmOfflineSalesLoaded) return;
  window.__pmOfflineSalesLoaded = true;

  var KEY = 'pm_offline_sales_v1';
  var origApi = window.apiCall;      // الـ apiCall النهائي قبل أي تغليف من هنا
  var origCheckout = window.pmCartCheckout;
  var busy = false;

  var PAY_LABEL = { cash: 'كاش', instapay: 'انستا باي', visa: 'فيزا' };

  function readQ() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function writeQ(q) {
    try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) {}
    refreshBar();
  }
  function cartKey() { return 'pmCart:' + (cloudActorName || 'anon'); }
  function readCart() {
    try { var a = JSON.parse(localStorage.getItem(cartKey()) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function writeCart(c) { try { localStorage.setItem(cartKey(), JSON.stringify(c)); } catch (e) {} }
  function taxOn() { try { return localStorage.getItem('pmTaxOn') !== '0'; } catch (e) { return true; } }
  function menuItem(name) {
    return (state.menu || []).find(function (x) { return x && x.name === name && x.active !== false; });
  }
  function newRid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'off-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }
  function fmt(v) { return typeof moneyFmt === 'function' ? moneyFmt(v) : String(v); }

  // ===== المتاح بعد خصم المبيعات الأوفلاين =====
  // sentRecent: مبيعات اترفعت بنجاح لكن نسخة المخزون على الجهاز لسه قديمة (لسه متحدّثتش من السيرفر)
  var sentRecent = [];   // [{ name, qty, base }]

  function pendingQty(name) {
    var n = 0;
    readQ().forEach(function (e) {
      if (!e || e.status === 'failed') return;   // المرفوض من السيرفر ما خصمش مخزون
      (e.cart || []).forEach(function (l) { if (l.name === name) n += Number(l.qty) || 0; });
    });
    var rs = (typeof state !== 'undefined' && state && state.readyStock) || {};
    var cur = Number(rs[name]) || 0;
    sentRecent = sentRecent.filter(function (r) { return r.base === (Number(rs[r.name]) || 0); }); // اتحدّث؟ نشيله
    sentRecent.forEach(function (r) { if (r.name === name && r.base === cur) n += r.qty; });
    return n;
  }
  window.pmOfflinePending = pendingQty;

  function rememberSent(entry) {
    var rs = (typeof state !== 'undefined' && state && state.readyStock) || {};
    (entry.cart || []).forEach(function (l) {
      sentRecent.push({ name: l.name, qty: Number(l.qty) || 0, base: Number(rs[l.name]) || 0 });
    });
  }

  // أول صنف كميته أكبر من المتاح (بعد خصم المبيعات المستنية). بيرجع null لو كله تمام
  function firstOverStock(cart) {
    var rs = (typeof state !== 'undefined' && state && state.readyStock) || {};
    for (var i = 0; i < cart.length; i++) {
      var l = cart[i], have = Math.max(0, (Number(rs[l.name]) || 0) - pendingQty(l.name));
      var want = cart.reduce(function (s, x) { return x.name === l.name ? s + (Number(x.qty) || 0) : s; }, 0);
      if (want > have) return { name: l.name, have: have };
    }
    return null;
  }

  // هل الخطأ مشكلة نت (مش رفض من السيرفر)؟
  function isNetworkError(err) {
    if (!err) return false;
    if (err.context && err.context.status) return false;   // السيرفر رد برسالة، يبقى مش نت
    if (err.name === 'FunctionsFetchError') return true;
    if (!navigator.onLine) return true;
    return /failed to fetch|networkerror|load failed|failed to send|network/i.test(String(err.message || ''));
  }

  // الأصناف العادية بس تتسجل أوفلاين (الحفلات والمشروبات حسب الطلب لأ)
  function cartIsPlain(cart) {
    return cart.every(function (l) {
      var m = menuItem(l.name);
      return !!m && m.kind !== 'party' && !(m.kind === 'drink' && m.onDemand === true);
    });
  }

  function clearCartLines(names) {
    writeCart(readCart().filter(function (l) { return names.indexOf(l.name) === -1; }));
    if (typeof window.renderCart === 'function') window.renderCart();
    if (typeof window.renderMenu === 'function') window.renderMenu();
  }

  function quote(cart) {
    var sub = 0;
    cart.forEach(function (l) { sub += (Number(l.qty) || 0) * Number((menuItem(l.name) || {}).price || 0); });
    var tax = taxOn() ? Math.round(sub * 14) / 100 : 0;
    return { sub: sub, tax: tax, total: sub + tax };
  }

  function addToQueue(entry) {
    var q = readQ();
    if (q.some(function (e) { return e.rid === entry.rid; })) return false; // موجود قبل كده
    q.push(entry);
    writeQ(q);
    return true;
  }

  // ===== 1) البيع وإحنا أوفلاين من البداية =====
  function offlineCheckout(cart) {
    if (!cloudActorName) { alert('سجّل الدخول أولًا عشان البيع يتحفظ باسم الموظف.'); return; }
    var over = firstOverStock(cart);
    if (over) {
      alert('مفيش متاح كفاية من «' + over.name + '» (المتاح أوفلاين: ' + over.have + ').\nقلّل الكمية في السلة أو استنى النت يرجع.');
      return;
    }
    var noteEl = document.getElementById('cartNote');
    var phoneEl = document.getElementById('cartPhone');
    var sel = document.querySelector('input[name="cartPayMethod"]:checked');
    var q = quote(cart);
    var entry = {
      rid: newRid(),
      by: cloudActorName,
      at: new Date().toISOString(),
      cart: cart.map(function (l) { return { name: l.name, qty: l.qty }; }),
      note: String((noteEl && noteEl.value) || '').trim(),
      customer_phone: String((phoneEl && phoneEl.value) || '').trim(),
      payment_method: sel ? sel.value : 'cash',
      tax_rate: taxOn() ? 14 : 0,
      tax_amount: q.tax,
      status: 'queued',
      error: ''
    };
    addToQueue(entry);
    clearCartLines(cart.map(function (l) { return l.name; }));
    if (noteEl) noteEl.value = '';
    if (phoneEl) phoneEl.value = '';
    alert('تم تسجيل البيع أوفلاين · الإجمالي ' + fmt(q.total) + ' ج.م · الدفع: ' +
      (PAY_LABEL[entry.payment_method] || 'كاش') +
      '\nهيترفع للسيرفر تلقائيًا أول ما النت يرجع، ورقم الفاتورة هيتحدد وقتها.');
    if (typeof window.pmCloseCart === 'function') window.pmCloseCart();
  }

  window.pmCartCheckout = function () {
    var cart = readCart();
    if (!navigator.onLine && cart.length) {
      var asParty = window.pmCartAsParty && window.pmCartAsParty();
      if (asParty || !cartIsPlain(cart)) {
        alert('الحفلات والمشروبات حسب الطلب بتحتاج اتصال بالإنترنت. سجّل الأصناف العادية بس أوفلاين، أو استنى النت.');
        return;
      }
      return offlineCheckout(cart);
    }
    return origCheckout.apply(this, arguments);
  };

  // ===== 2) النت وقع وإحنا بنبعت البيع =====
  function queueFromFailedBody(body) {
    var cart = Array.isArray(body.cart) ? body.cart : [];
    if (!cart.length || !body.request_id) return;
    addToQueue({
      rid: body.request_id,
      by: body.employee_name || cloudActorName,
      at: new Date().toISOString(),
      cart: cart.map(function (l) { return { name: l.name, qty: l.qty }; }),
      note: body.note || '',
      customer_phone: body.customer_phone || '',
      payment_method: body.payment_method || 'cash',
      tax_rate: body.tax_rate || 0,
      tax_amount: body.tax_amount || 0,
      status: 'queued',
      error: ''
    });
    clearCartLines(cart.map(function (l) { return l.name; }));
  }

  pmApiUse('offline-sales', function () { return function (body) {
    if (!body || body.action !== 'checkout_cart' || typeof origApi !== 'function') {
      return origApi.apply(this, arguments);
    }
    var fail = function (err) {
      if (!isNetworkError(err)) return { data: null, error: err };
      queueFromFailedBody(body);
      return {
        data: null,
        error: { message: 'النت وقع أثناء البيع. البيع اتسجل على الجهاز وهيترفع تلقائيًا لما النت يرجع.', offlineQueued: true }
      };
    };
    var p;
    try { p = Promise.resolve(origApi.apply(this, arguments)); }
    catch (e) { return Promise.resolve(fail(e)); }
    return p.then(function (res) {
      if (res && res.error) return fail(res.error);
      return res;
    }, fail);
  }; });

  // ===== 3) الرفع للسيرفر لما النت يرجع =====
  function removeEntry(rid) {
    writeQ(readQ().filter(function (x) { return x.rid !== rid; }));
  }
  function markFailed(rid, msg) {
    var q = readQ();
    q.forEach(function (x) { if (x.rid === rid) { x.status = 'failed'; x.error = msg; } });
    writeQ(q);
  }
  function isClean() {
    return typeof state !== 'undefined' && JSON.stringify(state) === cloudLastSavedHash;
  }

  async function syncQueue() {
    if (busy || !navigator.onLine || !cloudReady || !cloudActorName || !cloudActorPin) return;
    if (['kitchen', 'barista'].indexOf(cloudActorRole) !== -1) return;
    var mine = readQ().filter(function (e) { return e.by === cloudActorName && e.status !== 'failed'; });
    if (!mine.length) return;
    if (!isClean()) return; // فيه تعديلات لسه بتترفع؛ نستنى

    busy = true;
    var sent = 0, newlyFailed = [];
    try {
      for (var k = 0; k < mine.length; k++) {
        var cur = readQ().filter(function (x) { return x.rid === mine[k].rid; })[0];
        if (!cur) continue;
        var res;
        try {
          res = await origApi({
            action: 'checkout_cart',
            employee_name: cloudActorName,
            pin: cloudActorPin,
            expected_revision: cloudRevision,
            request_id: cur.rid,              // نفس المعرّف: لو اترفع قبل كده السيرفر بيرجّع نفس الفاتورة
            cart: cur.cart,
            note: cur.note,
            customer_phone: cur.customer_phone,
            payment_method: cur.payment_method,
            tax_rate: cur.tax_rate,
            tax_amount: cur.tax_amount
          });
        } catch (err) {
          res = { error: err };
        }

        if (res && res.error) {
          if (isNetworkError(res.error)) break;                 // النت فصل تاني؛ نكمّل بعدين
          var st = res.error.context && res.error.context.status;
          if (st === 409) {                                     // الإصدار اتغيّر من جهاز تاني
            if (isClean() && typeof window.reloadCloudState === 'function') await window.reloadCloudState();
            break;                                              // نجرب تاني في الدورة الجاية
          }
          var msg = String(res.error.message || 'رفض السيرفر العملية');
          markFailed(cur.rid, msg);                             // مثلًا مخزون مش كفاية
          newlyFailed.push(msg);
          continue;
        }

        cloudRevision = Number((res.data && res.data.revision) || cloudRevision);
        rememberSent(cur);                                  // نفضل نخصمها من المتاح لحد ما المخزون يتحدّث
        removeEntry(cur.rid);
        sent++;
      }
    } finally {
      busy = false;
    }

    if (sent > 0) {
      // بعد الرفع: نسحب النسخة المحدّثة من السيرفر (لو الحالة نضيفة، فمفيش خطر يتمسح تعديل)
      if (isClean() && typeof window.reloadCloudState === 'function') {
        try { await window.reloadCloudState(); } catch (e) {}
      }
      setStatus('تم رفع ' + sent + ' بيع من الأوفلاين ✓');
    }
    if (newlyFailed.length) {
      alert('فيه ' + newlyFailed.length + ' بيع أوفلاين اتّرفض من السيرفر (' + newlyFailed[0] +
        '). الأوردرات دي فاضلة في شريط التنبيه لحد ما تراجعها وتحذفها.');
    }
    refreshBar();
  }

  function setStatus(msg) {
    if (typeof setCloudStatus === 'function') { try { setCloudStatus(msg); } catch (e) {} }
  }

  // ===== شريط تنبيه صغير لو فيه بيع مستني الرفع =====
  var bar = null;
  function refreshBar() {
    var q = readQ();
    var queued = q.filter(function (e) { return e.status !== 'failed'; }).length;
    var failed = q.length - queued;
    if (!q.length) { if (bar) { bar.remove(); bar = null; } return; }
    if (!bar) {
      bar = document.createElement('button');
      bar.type = 'button';
      bar.style.cssText =
        'position:fixed;inset-inline:0;top:calc(env(safe-area-inset-top,0px) + 6px);z-index:9998;' +
        'margin:0 auto;width:max-content;max-width:94%;border:0;border-radius:12px;padding:8px 14px;' +
        'font-size:14px;color:#fff;background:#B45309;box-shadow:0 4px 14px rgba(0,0,0,.2);cursor:pointer';
      bar.addEventListener('click', onBarClick);
      document.body.appendChild(bar);
    }
    bar.textContent = (queued ? 'عندك ' + queued + ' بيع أوفلاين مستني الرفع' : '') +
      (queued && failed ? ' · ' : '') +
      (failed ? failed + ' بيع اتّرفض (اضغط للمراجعة)' : '');
  }

  function onBarClick() {
    var q = readQ();
    var failed = q.filter(function (e) { return e.status === 'failed'; });
    if (!failed.length) { syncQueue(); return; }
    var lines = failed.map(function (e) {
      return '- ' + (e.by || '') + ' · ' + e.cart.map(function (l) { return l.name + ' × ' + l.qty; }).join('، ') +
        ' · ' + e.error;
    }).join('\n');
    if (confirm('أوردرات أوفلاين اترفضت من السيرفر:\n' + lines + '\n\nتحذفها من الجهاز؟ (لازم تكون متأكد إنها اتعملت يدويًا أو مش مطلوبة)')) {
      writeQ(q.filter(function (e) { return e.status !== 'failed'; }));
    }
  }

  // ===== توقيتات الرفع =====
  window.addEventListener('online', function () { setTimeout(syncQueue, 1500); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') setTimeout(syncQueue, 800);
  });
  setInterval(syncQueue, 20000);

  window.pmOfflineQueue = readQ;
  refreshBar();
})();
