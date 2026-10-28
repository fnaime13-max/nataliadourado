(function () {
  'use strict';

  var C = window.CONFIG || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- dados do CONFIG ---------- */
  $$('[data-wa]').forEach(function (a) { if (C.whatsapp) a.href = C.whatsapp; });
  $$('[data-ig]').forEach(function (a) { if (C.instagram) a.href = C.instagram; });
  $$('[data-yt]').forEach(function (a) { if (C.youtube) a.href = C.youtube; });
  var mnf = C.meninasNoFoco || {};
  $$('[data-mnf]').forEach(function (a) { if (mnf.url) a.href = mnf.url; });
  if (mnf.preco) $('#mnfPrice').innerHTML = mnf.preco + (mnf.parcelas ? '<small>' + mnf.parcelas + '</small>' : '');
  if (mnf.proximaTurma) $('#mnfTurma').textContent = 'Próxima turma: ' + mnf.proximaTurma;
  if (C.crn) $('#footCrn').textContent = C.crn;
  $('#year').textContent = new Date().getFullYear();

  /* ---------- hélice do hero ---------- */
  var visual = $('#heroVisual'), photo = $('.hero__photo');
  var photoBox = null;
  function measurePhoto() {
    var v = visual.getBoundingClientRect(), p = photo.getBoundingClientRect();
    photoBox = { l: p.left - v.left, t: p.top - v.top, r: p.right - v.left, b: p.bottom - v.top };
  }
  var hero = new Helix({
    back: $('#heroBack'), front: $('#heroFront'), host: visual,
    pairs: 34, turns: 2.1, tilt: -0.1, speed: 0.22, scrollSpin: true,
    radius: function (w) { return Math.min(w * 0.4, 215); },
    length: function (w, h) { return h * 0.98; },
    // a fita da frente passa por trás do rosto e na frente do suéter
    avoid: function (x, y) {
      if (!photoBox) return false;
      return x > photoBox.l && x < photoBox.r && y > photoBox.t && y < photoBox.t + (photoBox.b - photoBox.t) * 0.62;
    }
  });
  measurePhoto();
  window.addEventListener('resize', measurePhoto);

  var finalHelix = new Helix({
    back: $('#finalHelix'), host: $('.final'),
    pairs: 40, turns: Math.max(1.3, Math.min(3.2, window.innerWidth / 440)), tilt: Math.PI / 2, speed: 0.12, bead: 0.9,
    radius: function (w, h) { return Math.min(h * 0.3, 120); },
    length: function (w) { return w * 1.1; }
  });

  /* ---------- abertura: 0 → 100% ---------- */
  var loader = $('#loader');
  var loaderHelix = new Helix({
    back: $('#loaderCanvas'), pairs: 22, turns: 1.7, tilt: 0, speed: 0.55, interactive: false,
    radius: function (w) { return w * 0.3; },
    length: function (w, h) { return h * 0.9; }
  });
  loaderHelix.reveal = 0;

  var loaded = document.readyState === 'complete';
  window.addEventListener('load', function () { loaded = true; });

  function finishIntro() {
    body.classList.remove('is-loading');
    body.classList.add('is-ready');
    hero.start();
    finalHelix.start();
    setTimeout(measurePhoto, 1200);
  }

  if (reduce) {
    loader.classList.add('is-done');
    loaderHelix.stop();
    finishIntro();
  } else {
    loaderHelix.start();
    var num = $('#loaderNum'), words = $$('.loader__words span');
    var DUR = 2600, t0 = performance.now(), shown = 0;
    (function tick(now) {
      var k = Math.min(1, (now - t0) / DUR);
      var eased = 1 - Math.pow(1 - k, 2.2);
      var target = Math.floor(eased * 100);
      if (!loaded && target > 92) target = 92;
      shown = Math.max(shown, target);
      num.textContent = shown;
      loaderHelix.reveal = shown / 100;
      words.forEach(function (w, i) { w.classList.toggle('is-on', shown >= (i + 1) * 33); });
      if (shown < 100) { requestAnimationFrame(tick); return; }
      setTimeout(function () {
        loader.classList.add('is-split');
        var s0 = performance.now();
        (function split(n) {
          var q = Math.min(1, (n - s0) / 900);
          loaderHelix.split = q * q * (3 - 2 * q);
          if (q < 1) requestAnimationFrame(split);
        })(s0);
        setTimeout(finishIntro, 350);
        setTimeout(function () { loader.classList.add('is-done'); loaderHelix.stop(); }, 1100);
      }, 280);
    })(t0);
  }

  /* ---------- topo, menu e seção ativa ---------- */
  var top = $('#top'), fab = $('.fab');
  function onScroll() {
    var y = window.scrollY;
    top.classList.toggle('is-solid', y > 20);
    fab.classList.toggle('is-on', y > window.innerHeight * 0.7);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var burger = $('#burger'), nav = $('#nav');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  var navLinks = $$('a', nav);
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) spy.observe(s); });

    var rv = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); rv.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.rv, .route li').forEach(function (el) { rv.observe(el); });
  } else {
    $$('.rv').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- decodificador de sinais (abas) ---------- */
  var tabs = $$('.decoder [role="tab"]');
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    if (window.innerWidth <= 860) tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (k === 'Home') n = tabs[0];
      if (k === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });

  /* ---------- duas fases: pares bagunçados × alinhados ---------- */
  var art = $('#phaseArt'), NS = 'http://www.w3.org/2000/svg', rungs = [];
  for (var i = 0; i < 10; i++) {
    var x = 22 + i * 30.6, a = Math.sin(i * 0.72 + 0.6), half = 18 + 62 * Math.abs(a);
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'r');
    g.innerHTML =
      '<line x1="' + x + '" y1="' + (110 - half) + '" x2="' + x + '" y2="' + (110 + half) + '" stroke="#F3D59B" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="' + x + '" cy="' + (110 - half) + '" r="7" fill="' + (a > 0 ? '#E04A5F' : '#D9962B') + '"/>' +
      '<circle cx="' + x + '" cy="' + (110 + half) + '" r="7" fill="' + (a > 0 ? '#D9962B' : '#E04A5F') + '"/>';
    art.appendChild(g);
    var spread = window.innerWidth < 600 ? 0.45 : 1;
    rungs.push({ g: g, dx: (Math.random() - 0.5) * 60 * spread, dy: (Math.random() - 0.5) * 70 * spread, rot: (Math.random() - 0.5) * 150 });
  }
  function setPhase(name, focus) {
    var right = name === 'refinado';
    $('.switch').classList.toggle('is-right', right);
    $$('.switch [role="radio"]').forEach(function (b) {
      var on = b.dataset.phase === name;
      b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    $$('.phase').forEach(function (p) { p.hidden = p.dataset.for !== name; });
    rungs.forEach(function (r) {
      r.g.style.transform = right ? 'none' : 'translate(' + r.dx + 'px,' + r.dy + 'px) rotate(' + r.rot + 'deg)';
    });
  }
  $$('.switch [role="radio"]').forEach(function (b) {
    b.addEventListener('click', function () { setPhase(b.dataset.phase); });
    b.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      e.preventDefault();
      setPhase(b.dataset.phase === 'refinado' ? 'metabolico' : 'refinado', true);
    });
  });
  setPhase('metabolico');
})();
