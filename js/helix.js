/* Hélice de DNA em canvas — assinatura visual do site.
   Uma fita é a genética (o que você herdou), a outra é a consciência (o que você escolhe);
   os pares entre elas são o metabolismo. O mouse "abre" os pares, o clique manda um pulso de energia. */
(function () {
  'use strict';

  var INK = '#2B1A17', RED = '#B4182F', HONEY = '#D9962B', BLUSH = '#E9A99B';
  var PAIRS = [[RED, HONEY], [HONEY, RED], [BLUSH, INK], [INK, BLUSH]];
  var TAU = Math.PI * 2;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function seeded(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Helix(opts) {
    this.o = Object.assign({
      back: null,          // canvas atrás do conteúdo
      front: null,         // canvas opcional à frente (só as contas da frente)
      host: null,          // elemento que define o tamanho
      pairs: 28,
      turns: 2.3,
      tilt: -0.16,         // inclinação do eixo (rad)
      radius: function (w) { return w * 0.4; },
      length: function (w, h) { return h * 1.15; },
      speed: 0.22,         // voltas por segundo (em rad/s * 1/TAU)
      bead: 1,             // escala das contas
      avoid: null,         // function(x, y) -> true se a conta da frente deve sumir (rosto)
      interactive: true,
      scrollSpin: false
    }, opts);

    this.reveal = 1;       // 0..1 quantos pares existem (abertura)
    this.split = 0;        // 0..1 fitas se separando (saída da abertura)
    this.rot = 0;
    this.spin = 0;
    this.mouse = { x: -1e4, y: -1e4, px: null };
    this.pulses = [];
    this.sparks = [];
    this.running = false;
    this.visible = true;

    var r = seeded(11);
    this.p = [];
    for (var i = 0; i < this.o.pairs; i++) {
      this.p.push({ c: PAIRS[Math.floor(r() * 4)], u: 0, g: 0 });
    }
    this.ctxB = this.o.back.getContext('2d');
    this.ctxF = this.o.front ? this.o.front.getContext('2d') : null;
    this.resize();
    this._bind();
  }

  Helix.prototype.resize = function () {
    var host = this.o.host || this.o.back.parentNode;
    var rect = host.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    [this.o.back, this.o.front].forEach(function (c) {
      if (!c) return;
      c.width = Math.round(this.w * this.dpr);
      c.height = Math.round(this.h * this.dpr);
    }, this);
    this.R = this.o.radius(this.w, this.h);
    this.L = this.o.length(this.w, this.h);
    if (!this.running) this.draw();
  };

  Helix.prototype._bind = function () {
    var self = this, host = this.o.host || this.o.back.parentNode;
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(host);
    else window.addEventListener('resize', function () { self.resize(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; }).observe(host);
    }
    if (!this.o.interactive) return;

    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (self.mouse.px !== null && !reduce) {
        self.spin = clamp(self.spin + (x - self.mouse.px) * 0.0009, -0.09, 0.09);
      }
      self.mouse.x = x; self.mouse.y = y; self.mouse.px = x;
    });
    host.addEventListener('pointerleave', function () {
      self.mouse.x = self.mouse.y = -1e4; self.mouse.px = null;
    });
    host.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      var r = host.getBoundingClientRect();
      self.pulse(e.clientX - r.left, e.clientY - r.top);
    });
  };

  /* geometria: ponto do eixo e normal para o par i */
  Helix.prototype._frame = function () {
    var t = this.o.tilt;
    return {
      cx: this.w / 2, cy: this.h / 2,
      ax: Math.sin(t), ay: Math.cos(t),       // direção do eixo
      nx: Math.cos(t), ny: -Math.sin(t)       // normal
    };
  };

  Helix.prototype.pulse = function (x, y) {
    var f = this._frame(), n = this.p.length;
    var along = (x - f.cx) * f.ax + (y - f.cy) * f.ay;
    var s = clamp(along / this.L + 0.5, 0, 1);
    this.pulses.push({ s: s, t: 0 });
    var k = Math.round(s * (n - 1));
    if (this.p[k]) this.p[k].g = 1;
  };

  Helix.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    var self = this, last = performance.now();
    function loop(now) {
      if (!self.running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (self.visible) { self.step(dt); self.draw(); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  };
  Helix.prototype.stop = function () { this.running = false; };

  Helix.prototype.step = function (dt) {
    var o = this.o, f = this._frame(), n = this.p.length, i, p;
    var scrollRot = o.scrollSpin ? window.scrollY * 0.004 : 0;
    if (!reduce) this.rot += o.speed * dt * TAU * 0.25;
    this.spin *= 0.94;
    this.rot += this.spin;
    this.rotView = this.rot + scrollRot;

    for (i = 0; i < this.pulses.length; i++) this.pulses[i].t += dt * 0.9;
    this.pulses = this.pulses.filter(function (q) { return q.t < 1.3; });

    var rad = Math.max(90, this.R * 0.85);
    for (i = 0; i < n; i++) {
      p = this.p[i];
      var s = i / (n - 1), along = (s - 0.5) * this.L;
      var px = f.cx + f.ax * along, py = f.cy + f.ay * along;
      var d = Math.hypot(this.mouse.x - px, this.mouse.y - py);
      var target = d < rad ? Math.pow(1 - d / rad, 1.4) : 0;
      p.u += (target - p.u) * 0.12;

      var hit = 0;
      for (var k = 0; k < this.pulses.length; k++) {
        var q = this.pulses[k], front = Math.abs(s - q.s) - q.t;
        if (Math.abs(front) < 0.05) hit = Math.max(hit, 1 - q.t * 0.6);
      }
      if (hit > p.g && !reduce) {
        p.g = hit;
        this._spark(i, s);
      }
      p.g = Math.max(0, p.g - dt * 1.4);
    }

    for (i = this.sparks.length - 1; i >= 0; i--) {
      var sp = this.sparks[i];
      sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy -= 18 * dt; sp.life -= dt * 1.2;
      if (sp.life <= 0) this.sparks.splice(i, 1);
    }
  };

  Helix.prototype._spark = function (i) {
    var b = this._beads(i);
    for (var k = 0; k < 2; k++) {
      var src = k ? b.b : b.a;
      this.sparks.push({
        x: src.x, y: src.y,
        vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40,
        life: 1, c: Math.random() < 0.5 ? HONEY : RED, r: 1.2 + Math.random() * 1.8
      });
    }
  };

  /* posição das duas contas do par i */
  Helix.prototype._beads = function (i) {
    return this._at(i / (this.p.length - 1), this.p[i].u);
  };

  /* posição contínua ao longo do eixo (s de 0 a 1), com abertura u */
  Helix.prototype._at = function (s, u) {
    var f = this._frame();
    var along = (s - 0.5) * this.L;
    var px = f.cx + f.ax * along, py = f.cy + f.ay * along;
    var ph = s * this.o.turns * TAU + (this.rotView || this.rot);
    var sin = Math.sin(ph), z = Math.cos(ph);
    var side = Math.max(-1, Math.min(1, sin * 4));
    var push = u * this.R * 0.5 + this.split * (this.w * 0.75);
    var offA = this.R * sin + side * push;
    var offB = -this.R * sin - side * push;
    return {
      s: s, z: z, px: px, py: py,
      a: { x: px + f.nx * offA, y: py + f.ny * offA, z: z },
      b: { x: px + f.nx * offB, y: py + f.ny * offB, z: -z }
    };
  };

  Helix.prototype.draw = function () {
    var cb = this.ctxB, cf = this.ctxF, dpr = this.dpr, n = this.p.length, i;
    cb.setTransform(dpr, 0, 0, dpr, 0, 0); cb.clearRect(0, 0, this.w, this.h);
    if (cf) { cf.setTransform(dpr, 0, 0, dpr, 0, 0); cf.clearRect(0, 0, this.w, this.h); }

    var shown = this.reveal * n;
    var B = [];
    for (i = 0; i < n; i++) {
      var vis = clamp(shown - i, 0, 1);
      if (vis <= 0) { B.push(null); continue; }
      var b = this._beads(i); b.vis = vis; B.push(b);
    }

    // espinhas dorsais das duas fitas (segmentos; os de trás no canvas de trás)
    var self = this;
    // curva suave: 6 amostras entre cada par, com a abertura interpolada
    var SUB = 6, pts = [];
    var maxS = Math.min(n - 1, shown - 1);
    for (var j = 0; j <= maxS * SUB; j++) {
      var fi = j / SUB, i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1), fr = fi - i0;
      var uu = this.p[i0].u * (1 - fr) + this.p[i1].u * fr;
      var vv = Math.min(B[i0] ? B[i0].vis : 0, B[i1] ? B[i1].vis : 1);
      var at = this._at(fi / (n - 1), uu); at.vis = vv;
      pts.push(at);
    }
    function backbone(key, color) {
      for (var j = 0; j < pts.length - 1; j++) {
        var a = pts[j], c = pts[j + 1];
        var p0 = a[key], p1 = c[key], z = (p0.z + p1.z) / 2;
        var front = z > 0.15 && cf;
        var ctx = front ? cf : cb;
        if (front && self.o.avoid && self.o.avoid((p0.x + p1.x) / 2, (p0.y + p1.y) / 2)) ctx = cb;
        ctx.strokeStyle = color;
        ctx.globalAlpha = (0.22 + 0.6 * (z + 1) / 2) * Math.min(a.vis, c.vis) * (1 - self.split * 0.6);
        ctx.lineWidth = (1.3 + 1.9 * (z + 1) / 2) * self.o.bead;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
    }
    cb.lineCap = 'round'; if (cf) cf.lineCap = 'round';

    // degraus (pares de base) sempre atrás das contas
    for (i = 0; i < n; i++) {
      var q = B[i]; if (!q) continue;
      var p = this.p[i];
      var mx = (q.a.x + q.b.x) / 2, my = (q.a.y + q.b.y) / 2;
      var keep = 1 - Math.max(p.u * 0.9, this.split);
      cb.globalAlpha = (0.12 + 0.22 * (1 - Math.abs(q.z)) + 0.5 * p.g) * q.vis;
      cb.lineWidth = (2 + 1.5 * p.g) * this.o.bead;
      cb.strokeStyle = p.g > 0.2 ? HONEY : p.c[0];
      cb.beginPath(); cb.moveTo(q.a.x, q.a.y);
      cb.lineTo(q.a.x + (mx - q.a.x) * keep, q.a.y + (my - q.a.y) * keep); cb.stroke();
      cb.strokeStyle = p.g > 0.2 ? HONEY : p.c[1];
      cb.beginPath(); cb.moveTo(q.b.x, q.b.y);
      cb.lineTo(q.b.x + (mx - q.b.x) * keep, q.b.y + (my - q.b.y) * keep); cb.stroke();
    }

    backbone('a', RED);
    backbone('b', INK);

    // contas
    for (i = 0; i < n; i++) {
      var r = B[i]; if (!r) continue;
      var pp = this.p[i];
      [[r.a, RED], [r.b, HONEY]].forEach(function (pair) {
        var pt = pair[0], z = pt.z;
        var front = z > 0.15 && cf && !(self.o.avoid && self.o.avoid(pt.x, pt.y));
        var ctx = front ? cf : cb;
        var rad = (2.6 + 3.4 * (z + 1) / 2 + pp.g * 3 + pp.u * 1.5) * self.o.bead * (0.4 + 0.6 * r.vis);
        if (pp.g > 0.05 || pp.u > 0.3) {
          ctx.globalAlpha = 0.25 * Math.max(pp.g, pp.u) * r.vis;
          ctx.fillStyle = HONEY;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, rad * 2.6, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = (0.45 + 0.55 * (z + 1) / 2) * r.vis;
        ctx.fillStyle = pair[1];
        ctx.beginPath(); ctx.arc(pt.x, pt.y, rad, 0, TAU); ctx.fill();
      });
    }

    // faíscas do pulso
    var top = cf || cb;
    for (i = 0; i < this.sparks.length; i++) {
      var sp = this.sparks[i];
      var sc = this.o.avoid && this.o.avoid(sp.x, sp.y) ? cb : top;
      sc.globalAlpha = Math.max(0, sp.life);
      sc.fillStyle = sp.c;
      sc.beginPath(); sc.arc(sp.x, sp.y, sp.r, 0, TAU); sc.fill();
    }
    cb.globalAlpha = 1; if (cf) cf.globalAlpha = 1;
  };

  window.Helix = Helix;
})();
