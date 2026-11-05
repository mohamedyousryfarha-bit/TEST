/* 190-party-upcoming.js
 * 1) لوحة "الحفلات القادمة": حفلات النهارده وبكرة، مع المتبقي للمبيعات/الأدمن، وزر اتصال بالعميل.
 * 2) شريط تنبيه لما الجهاز يفصل عن النت (التعديلات بتتحفظ محليًا وبتترفع بعدين).
 * ملحوظة: الملف ده بيقرأ من الحالة الموجودة (state) ومن الدوال المصدّرة على window، ومش بيغيّر أي بيانات.
 */
(function () {
  'use strict';
  if (window.__pmUpcomingLoaded) return;
  window.__pmUpcomingLoaded = true;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // تاريخ اليوم بتوقيت القاهرة بصيغة YYYY-MM-DD (نفس صيغة حقل التاريخ في الحفلات)
  function cairoDay(d) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d);
  }
  function addDays(ymd, n) {
    var p = ymd.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }
  function fmtMoney(v) {
    return (Math.round((Number(v) || 0) * 100) / 100).toLocaleString('ar-EG');
  }
  function menuPrice(name) {
    var m = (Array.isArray(state.menu) ? state.menu : []).find(function (x) { return x && x.name === name; });
    return Number(m && m.price) || 0;
  }

  // الحجوزات اللي موعدها النهارده أو بكرة، ولسه مش مقفولة ولا ملغية ولا متسلّمة بالكامل
  function upcomingBookings() {
    if (typeof window.pmPartyBookings !== 'function') return [];
    var live = (Array.isArray(state.partyOrders) ? state.partyOrders : []).filter(function (o) {
      return o && o.name && o.status !== 'cancelled' &&
        !(window.pmIsPartyOrderClosed && window.pmIsPartyOrderClosed(o));
    });
    var today = cairoDay(new Date());
    var tomorrow = addDays(today, 1);

    return window.pmPartyBookings(live)
      .filter(function (b) {
        if (!b || !b.first || b.cancelled || b.complete) return false;
        var d = String(b.first.date || '').slice(0, 10);
        return d === today || d === tomorrow;
      })
      .map(function (b) {
        var ords = b.orders.filter(function (o) { return o.status !== 'cancelled'; });
        var f = ords[0] || b.first;
        var total = ords.reduce(function (s, o) {
          return s + (Number(o.price) || menuPrice(o.name)) * (Number(o.qty) || 0);
        }, 0);
        var paid = ords.reduce(function (s, o) { return s + (Number(o.paid) || 0); }, 0);
        return {
          key: b.key,
          day: String(f.date || '').slice(0, 10) === today ? 'today' : 'tomorrow',
          time: String(f.time || ''),
          customer: String(f.customer || ''),
          phone: String(f.customerPhone || ''),
          qty: ords.reduce(function (s, o) { return s + (Number(o.qty) || 0); }, 0),
          pending: ords.filter(function (o) { return o.status === 'pending'; }).length,
          total: total,
          paid: paid,
          remaining: Math.max(0, total - paid)
        };
      })
      .sort(function (a, b) {
        var dayA = a.day === 'today' ? 0 : 1, dayB = b.day === 'today' ? 0 : 1;
        return (dayA - dayB) || a.time.localeCompare(b.time);
      });
  }

  function panelHtml(list, role) {
    var showMoney = role === 'sales' || role === 'admin';
    var showPhone = role === 'sales' || role === 'admin';
    if (!list.length) {
      return '<section class="pmu-card pmu-empty">مفيش حفلات النهارده أو بكرة.</section>';
    }
    var rows = list.map(function (b) {
      var dayTag = b.day === 'today'
        ? '<span class="pill warn">النهارده</span>'
        : '<span class="pill">بكرة</span>';
      var pendTag = b.pending
        ? '<span class="pill warn">' + b.pending + ' أوردر مستني</span>'
        : '<span class="pill">كله جاهز</span>';
      var tel = (showPhone && b.phone)
        ? '<a class="pmu-tel" href="tel:' + esc(b.phone.replace(/[^\d+]/g, '')) + '">📞 ' + esc(b.phone) + '</a>'
        : '';
      var money = showMoney
        ? '<div class="pmu-money">المتبقي: <b>' + fmtMoney(b.remaining) + ' ج.م</b> من ' + fmtMoney(b.total) + '</div>'
        : '';
      return '<div class="pmu-row">' +
        '<div class="pmu-head">' + dayTag + ' <b>' + esc(b.customer || 'عميل') + '</b>' +
        (b.time ? ' <span class="pmu-time">' + esc(b.time) + '</span>' : '') + '</div>' +
        '<div class="pmu-sub">' + b.qty + ' قطعة ' + pendTag + '</div>' +
        (tel ? '<div class="pmu-sub">' + tel + '</div>' : '') +
        money +
        '</div>';
    }).join('');
    return '<section class="pmu-card"><h3 class="pmu-title">الحفلات القادمة (النهارده وبكرة)</h3>' + rows + '</section>';
  }

  function injectPanel() {
    var box = document.getElementById('partiesBody');
    if (!box || !box.offsetParent && box.offsetWidth === 0) return;
    if (box.querySelector(':scope > .pmu-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'pmu-wrap';
    wrap.innerHTML = panelHtml(upcomingBookings(), (typeof cloudActorRole !== 'undefined' ? cloudActorRole : ''));
    box.insertBefore(wrap, box.firstChild);
  }

  // الصفحة بتتعاد رسمها من pmPartyWorkflowRefresh، فبنتأكد كل ثانيتين إن اللوحة موجودة
  setInterval(function () {
    try { injectPanel(); } catch (e) { /* ما نوقفش التطبيق بسبب اللوحة */ }
  }, 2000);

  // ===== شريط الاتصال =====
  var bar = null;
  function setOffline(on) {
    if (on) {
      if (bar) return;
      bar = document.createElement('div');
      bar.className = 'pmu-offline';
      bar.setAttribute('role', 'status');
      bar.textContent = 'مفيش اتصال بالإنترنت. التعديلات محفوظة على الجهاز وهتترفع أول ما الاتصال يرجع.';
      document.body.appendChild(bar);
    } else if (bar) {
      bar.remove();
      bar = null;
    }
  }
  window.addEventListener('offline', function () { setOffline(true); });
  window.addEventListener('online', function () { setOffline(false); });
  if (!navigator.onLine) setOffline(true);

  // ===== ستايل الموبايل (لمس مريح، كروت بدل الجداول) =====
  var css = [
    '.pmu-wrap{margin-bottom:12px}',
    '.pmu-card{background:var(--card,#fff);border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:12px;margin-bottom:10px}',
    '.pmu-empty{color:var(--muted,#6b7280);text-align:center;font-size:14px}',
    '.pmu-title{margin:0 0 8px;font-size:16px}',
    '.pmu-row{padding:10px 0;border-top:1px dashed var(--line,#e5e7eb)}',
    '.pmu-row:first-of-type{border-top:0}',
    '.pmu-head{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:15px}',
    '.pmu-time{color:var(--muted,#6b7280);font-size:13px}',
    '.pmu-sub{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;font-size:13px}',
    '.pmu-money{margin-top:6px;font-size:14px}',
    '.pmu-tel{display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border-radius:10px;background:var(--accent-soft,#e0f2fe);color:inherit;text-decoration:none;font-weight:600}',
    '.pmu-offline{position:fixed;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);z-index:9999;background:#b45309;color:#fff;padding:10px 12px;border-radius:12px;font-size:14px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.2)}',
    '@media (max-width:640px){.pmu-tel{min-height:44px;flex:1 1 100%;justify-content:center}}'
  ].join('');
  var style = document.createElement('style');
  style.id = 'pmu-style';
  style.textContent = css;
  document.head.appendChild(style);
})();
