/* 197-party-dashboard.js
 * لوحة مؤشرات الحفلات: للمدير فقط (cloudActorRole === 'admin').
 * بتظهر في تبويب الرئيسية (#anRoot)، وبتقرأ من الحالة الموجودة بس ومش بتغيّر أي بيانات.
 */
(function () {
  'use strict';
  if (window.__pmPartyDashLoaded) return;
  window.__pmPartyDashLoaded = true;

  var CSS =
    '.pmd-wrap{margin-bottom:12px}' +
    '.pmd-card{background:var(--card,#fff);border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:12px;margin-bottom:10px}' +
    '.pmd-title{margin:0 0 10px;font-size:16px}' +
    '.pmd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}' +
    '.pmd-kpi{background:var(--soft,#f3f4f6);border-radius:12px;padding:10px;text-align:center}' +
    '.pmd-kpi b{display:block;font-size:18px}' +
    '.pmd-kpi span{font-size:12px;color:var(--muted,#6b7280)}' +
    '.pmd-bars{display:flex;align-items:flex-end;gap:4px;height:90px;margin-top:8px}' +
    '.pmd-bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}' +
    '.pmd-bar i{display:block;width:100%;min-height:2px;background:#0067B8;border-radius:4px 4px 0 0}' +
    '.pmd-bar em{font-style:normal;font-size:10px;color:var(--muted,#6b7280);margin-top:3px}' +
    '.pmd-row{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px dashed var(--line,#e5e7eb);font-size:14px}' +
    '.pmd-row:first-of-type{border-top:0}' +
    '.pmd-muted{color:var(--muted,#6b7280);font-size:12px}' +
    '@media (max-width:420px){.pmd-grid{grid-template-columns:1fr}}';

  function injectCss() {
    if (document.getElementById('pmPartyDashCss')) return;
    var st = document.createElement('style');
    st.id = 'pmPartyDashCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(v) {
    return (Math.round((Number(v) || 0) * 100) / 100).toLocaleString('ar-EG');
  }
  function cairoDay(d) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d);
  }
  function addDays(ymd, n) {
    var p = ymd.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }
  function shortDate(ymd) {
    var p = ymd.split('-');
    return p.length === 3 ? p[2] + '/' + p[1] : ymd;
  }
  function menuPrice(name) {
    var m = (Array.isArray(state.menu) ? state.menu : []).find(function (x) { return x && x.name === name; });
    return Number(m && m.price) || 0;
  }

  // كل حجز: إجمالي وعربون/مدفوع ومتبقي، بنفس منطق لوحة الحفلات القادمة
  function bookings() {
    if (typeof window.pmPartyBookings !== 'function') return [];
    var live = (Array.isArray(state.partyOrders) ? state.partyOrders : []).filter(function (o) {
      return o && o.name && o.status !== 'cancelled' &&
        !(window.pmIsPartyOrderClosed && window.pmIsPartyOrderClosed(o));
    });
    return window.pmPartyBookings(live)
      .filter(function (b) { return b && b.first && !b.cancelled; })
      .map(function (b) {
        var ords = (b.orders || []).filter(function (o) { return o.status !== 'cancelled'; });
        var f = ords[0] || b.first;
        var total = ords.reduce(function (s, o) {
          return s + (Number(o.price) || menuPrice(o.name)) * (Number(o.qty) || 0);
        }, 0);
        var paid = ords.reduce(function (s, o) { return s + (Number(o.paid) || 0); }, 0);
        return {
          date: String(f.date || '').slice(0, 10),
          time: String(f.time || ''),
          customer: String(f.customer || ''),
          qty: ords.reduce(function (s, o) { return s + (Number(o.qty) || 0); }, 0),
          pending: ords.filter(function (o) { return o.status === 'pending'; }).length,
          total: total,
          paid: paid,
          remaining: Math.max(0, total - paid),
          complete: !!b.complete
        };
      });
  }

  function metrics() {
    var list = bookings();
    var today = cairoDay(new Date());
    var weekEnd = addDays(today, 6);
    var monthKey = today.slice(0, 7);

    var week = list.filter(function (b) { return b.date >= today && b.date <= weekEnd && !b.complete; });
    var month = list.filter(function (b) { return b.date.slice(0, 7) === monthKey; });
    var open = list.filter(function (b) { return b.date >= today && !b.complete; });

    // عدد الحفلات لكل يوم في الـ14 يوم الجايين (للرسم)
    var days = [];
    for (var i = 0; i < 14; i++) {
      var d = addDays(today, i);
      days.push({ date: d, count: list.filter(function (b) { return b.date === d && !b.complete; }).length });
    }

    return {
      today: today,
      weekCount: week.length,
      weekQty: week.reduce(function (s, b) { return s + b.qty; }, 0),
      weekPending: week.reduce(function (s, b) { return s + b.pending; }, 0),
      monthCount: month.length,
      monthTotal: month.reduce(function (s, b) { return s + b.total; }, 0),
      monthPaid: month.reduce(function (s, b) { return s + b.paid; }, 0),
      openRemaining: open.reduce(function (s, b) { return s + b.remaining; }, 0),
      days: days,
      upcoming: week.slice().sort(function (a, b) {
        return (a.date.localeCompare(b.date)) || a.time.localeCompare(b.time);
      }).slice(0, 8)
    };
  }

  function html(m) {
    var maxDay = Math.max.apply(null, m.days.map(function (d) { return d.count; }).concat([1]));
    var bars = m.days.map(function (d) {
      var h = Math.round((d.count / maxDay) * 100);
      return '<div class="pmd-bar" title="' + esc(d.date) + ': ' + d.count + ' حفلة">' +
        '<i style="height:' + (d.count ? Math.max(h, 8) : 2) + '%"></i>' +
        '<em>' + esc(shortDate(d.date)) + '</em></div>';
    }).join('');

    var rows = m.upcoming.length ? m.upcoming.map(function (b) {
      return '<div class="pmd-row"><span><b>' + esc(shortDate(b.date)) + '</b> ' +
        (b.time ? esc(b.time) + ' · ' : '') + esc(b.customer || 'عميل') +
        ' <span class="pmd-muted">(' + b.qty + ' قطعة)</span></span>' +
        '<span>متبقي ' + money(b.remaining) + ' ج.م</span></div>';
    }).join('') : '<div class="pmd-muted">مفيش حفلات جاية في الـ7 أيام دي.</div>';

    return '<section class="pmd-card"><h3 class="pmd-title">لوحة الحفلات (للمدير)</h3>' +
      '<div class="pmd-grid">' +
        '<div class="pmd-kpi"><b>' + m.weekCount + '</b><span>حفلات الـ7 أيام الجاية</span></div>' +
        '<div class="pmd-kpi"><b>' + m.weekPending + '</b><span>أوردرات مستنية تجهيز</span></div>' +
        '<div class="pmd-kpi"><b>' + m.monthCount + '</b><span>حفلات الشهر ده</span></div>' +
        '<div class="pmd-kpi"><b>' + money(m.openRemaining) + '</b><span>متبقي تحصيله (ج.م)</span></div>' +
        '<div class="pmd-kpi"><b>' + money(m.monthTotal) + '</b><span>إجمالي حجوزات الشهر (ج.م)</span></div>' +
        '<div class="pmd-kpi"><b>' + money(m.monthPaid) + '</b><span>المحصّل من حجوزات الشهر (ج.م)</span></div>' +
      '</div></section>' +
      '<section class="pmd-card"><h3 class="pmd-title">الحفلات لـ14 يوم جاي</h3>' +
        '<div class="pmd-bars">' + bars + '</div></section>' +
      '<section class="pmd-card"><h3 class="pmd-title">الحفلات القادمة (7 أيام)</h3>' + rows + '</section>';
  }

  var lastSig = '';
  function render() {
    var root = document.getElementById('anRoot');
    if (!root) return;
    var isAdmin = typeof cloudActorRole !== 'undefined' && cloudActorRole === 'admin';
    var wrap = root.querySelector(':scope > .pmd-wrap');
    if (!isAdmin) {
      if (wrap) wrap.remove();
      lastSig = '';
      return;
    }
    injectCss();
    var m = metrics();
    var sig = JSON.stringify(m);
    if (wrap && sig === lastSig) return;
    lastSig = sig;
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'pmd-wrap';
      root.insertBefore(wrap, root.firstChild);
    }
    wrap.innerHTML = html(m);
  }


  // بتتعاد رسم تبويب التحليلات، فبنتأكد كل ثانيتين إن اللوحة موجودة ومحدّثة
  setInterval(function () {
    try { render(); } catch (e) { /* ما نوقفش التطبيق بسبب اللوحة */ }
  }, 2000);
})();
