/* 093-menu-modern-categories.js
   شريط تصنيفات قابل للضغط فوق شبكة المنيو (منيو القطع فقط).
   مش بيعدّل renderMenu؛ بيراقب الشبكة ويخفي/يظهر الكروت بالكلاس فقط،
   فيفضل متوافق مع أي إعادة رسم للمنيو. */
(function () {
  'use strict';

  var ALL = 'الكل';
  var COLORS = {
    'كيك': '#D9779A',
    'تورتات': '#9B6BB0',
    'بسكويت': '#C98B3C',
    'معجنات': '#D9A441',
    'أخرى': '#B49F92'
  };
  var order = [ALL, 'كيك', 'تورتات', 'بسكويت', 'معجنات', 'أخرى'];
  var active = ALL;
  var pending = false;

  function catOf(name) {
    var meta = (typeof state !== 'undefined' && state && state.recipeMeta) ? state.recipeMeta[name] : null;
    if (meta && meta.category && COLORS[meta.category]) return meta.category;
    return (typeof window.pmAutoCategory === 'function') ? window.pmAutoCategory(name) : 'أخرى';
  }

  function nameOf(card) {
    try { return decodeURIComponent(card.getAttribute('data-enc') || ''); }
    catch (e) { return ''; }
  }

  function ensureBar(grid) {
    var bar = document.getElementById('mxmCats');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'mxmCats';
    bar.className = 'mxm-cats';
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'تصنيفات المنيو');
    bar.innerHTML = order.map(function (k) {
      var dot = k === ALL ? '' : '<i class="mxm-dot" style="background:' + COLORS[k] + '"></i>';
      return '<button type="button" class="mxm-chip" role="tab" data-cat="' + k + '">' +
        dot + '<span class="mxm-label">' + k + '</span><span class="mxm-n">0</span></button>';
    }).join('');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      active = b.getAttribute('data-cat');
      sync();
    });
    grid.parentNode.insertBefore(bar, grid);
    return bar;
  }

  function ensureEmpty(grid) {
    var em = document.getElementById('mxmEmpty');
    if (em) return em;
    em = document.createElement('div');
    em.id = 'mxmEmpty';
    em.className = 'mxm-empty';
    em.hidden = true;
    em.textContent = 'لا توجد أصناف في هذا القسم حالياً.';
    grid.parentNode.insertBefore(em, grid.nextSibling);
    return em;
  }

  function sync() {
    pending = false;
    var grid = document.getElementById('menuGrid');
    if (!grid || !grid.parentNode) return;
    var bar = ensureBar(grid);
    var empty = ensureEmpty(grid);
    var isPiece = (window.pmMenuTab || 'piece') === 'piece';
    bar.hidden = !isPiece;
    if (!isPiece) { empty.hidden = true; return; }

    var cards = grid.querySelectorAll('.mx-card[data-enc]');
    var counts = {};
    counts[ALL] = cards.length;
    var cardCats = [];
    for (var i = 0; i < cards.length; i++) {
      var k = catOf(nameOf(cards[i]));
      cardCats.push(k);
      counts[k] = (counts[k] || 0) + 1;
    }

    if (active !== ALL && !counts[active]) active = ALL;

    var shown = 0;
    for (var j = 0; j < cards.length; j++) {
      var show = active === ALL || cardCats[j] === active;
      cards[j].classList.toggle('mxm-hide', !show);
      if (show) shown++;
      cards[j].style.setProperty('--mxm-i', String(shown));
    }

    bar.querySelectorAll('[data-cat]').forEach(function (b) {
      var k = b.getAttribute('data-cat');
      var n = counts[k] || 0;
      b.querySelector('.mxm-n').textContent = n;
      b.classList.toggle('on', k === active);
      b.setAttribute('aria-selected', k === active ? 'true' : 'false');
      b.hidden = (k !== ALL && !n);
    });

    empty.hidden = !(cards.length && shown === 0);
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(sync);
  }

  function init() {
    var grid = document.getElementById('menuGrid');
    if (!grid) return;
    new MutationObserver(schedule).observe(grid, { childList: true });
    var tabs = document.getElementById('menuTabs');
    if (tabs) tabs.addEventListener('click', function () {
      setTimeout(schedule, 0);
    });
    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
