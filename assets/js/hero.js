/*!
 * hero.js — ファーストビューの「点と点が、線になる」3D演出
 * ライブラリを使わず、Canvas 2D と自前の透視投影で描画する。
 *
 * - 奥行きのある空間に、ティールの点(企業)とコーラルの点(人)が浮かぶ
 * - 点どうしが1組ずつ線で結ばれ、つながった瞬間に点が少し大きく光る(1秒に3回以下)
 * - 空間はゆっくり回り続け、マウスを動かすと少し傾く
 * - 画面から外れたとき・タブが裏にあるときは止める
 * - 「視差効果を減らす」設定では何もしない(静止画のまま)
 */
(function () {
  'use strict';

  var hero = document.querySelector('[data-hero]');
  var canvas = hero && hero.querySelector('[data-hero-canvas]');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  var small = window.matchMedia('(max-width: 760px)').matches;
  var PAIRS = small ? 14 : 30;
  var DUST = small ? 22 : 54;
  var LINK_INTERVAL = 380;   // 1組つながる間隔(ms)→ 光るのは 1秒に約2.6回
  var LINK_DRAW = 650;       // 線が伸びる時間(ms)
  var FIRST_DELAY = 250;
  var TEAL = [20, 163, 158];
  var CORAL = [240, 122, 99];

  /* ---------- 点の配置 ---------- */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInSphere(r) {
    var u = Math.random(), v = Math.random();
    var th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    var rr = r * Math.cbrt(rand(0.08, 1));
    return [rr * Math.sin(ph) * Math.cos(th), rr * Math.sin(ph) * Math.sin(th) * 0.8, rr * Math.cos(ph)];
  }

  var nodes = [];
  var links = [];
  for (var i = 0; i < PAIRS; i++) {
    var a = randInSphere(1);
    var dir = randInSphere(1);
    var len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    var dist = rand(0.35, 0.75);
    var b = [a[0] + dir[0] / len * dist, a[1] + dir[1] / len * dist, a[2] + dir[2] / len * dist];
    var bl = Math.hypot(b[0], b[1], b[2]);
    if (bl > 1.15) b = b.map(function (c) { return c / bl * 1.15; });
    var ia = nodes.push({ p: a, c: TEAL, r: rand(0.014, 0.024), pulse: 0 }) - 1;
    var ib = nodes.push({ p: b, c: CORAL, r: rand(0.014, 0.024), pulse: 0 }) - 1;
    links.push({ a: ia, b: ib, start: FIRST_DELAY + i * LINK_INTERVAL, done: false });
  }
  for (var d = 0; d < DUST; d++) {
    nodes.push({ p: randInSphere(1.35), c: d % 2 ? TEAL : CORAL, r: rand(0.005, 0.01), pulse: 0, dust: true });
  }

  /* ---------- サイズ ---------- */
  var W = 0, H = 0, DPR = 1;
  function resize() {
    var rect = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);

  /* ---------- マウスで少し傾ける ---------- */
  var tiltX = 0, tiltY = 0, targetX = 0, targetY = 0;
  hero.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var r = hero.getBoundingClientRect();
    targetY = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
    targetX = ((e.clientY - r.top) / r.height - 0.5) * 0.4;
  });
  hero.addEventListener('pointerleave', function () { targetX = targetY = 0; });

  /* ---------- 描画 ---------- */
  var rotY = 0.6;
  var elapsed = 0;
  var last = 0;
  var running = false;
  var rafId = 0;
  var nextPulse = 0;
  var proj = new Array(nodes.length);

  function project(p, cosY, sinY, cosX, sinX) {
    // Y軸回転 → X軸回転
    var x = p[0] * cosY + p[2] * sinY;
    var z = -p[0] * sinY + p[2] * cosY;
    var y = p[1] * cosX - z * sinX;
    z = p[1] * sinX + z * cosX;
    var cam = 3.4;
    var s = 1 / (cam - z);
    var R = Math.min(W * (small ? 0.62 : 0.5), H * 0.95);
    var cx = W * (small ? 0.5 : 0.56), cy = H * 0.5;
    return { x: cx + x * s * R * 2.2, y: cy + y * s * R * 2.2, s: s * 3.4, z: z };
  }

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    elapsed += dt;

    rotY += dt * 0.00011;
    tiltX += (targetX - tiltX) * 0.05;
    tiltY += (targetY - tiltY) * 0.05;
    var ry = rotY + tiltY, rx = -0.18 + tiltX;
    var cosY = Math.cos(ry), sinY = Math.sin(ry), cosX = Math.cos(rx), sinX = Math.sin(rx);

    for (var i = 0; i < nodes.length; i++) {
      proj[i] = project(nodes[i].p, cosY, sinY, cosX, sinX);
      if (nodes[i].pulse > 0) nodes[i].pulse = Math.max(0, nodes[i].pulse - dt / 900);
    }

    // すべてつながった後も、ときどき1組を光らせる(間隔2.4秒)
    var allDone = links[links.length - 1].done;
    if (allDone && elapsed > nextPulse) {
      var l = links[(Math.random() * links.length) | 0];
      nodes[l.a].pulse = nodes[l.b].pulse = 0.8;
      nextPulse = elapsed + 2400;
    }

    ctx.clearRect(0, 0, W, H);

    // 線
    ctx.lineCap = 'round';
    for (var k = 0; k < links.length; k++) {
      var lk = links[k];
      var t = (elapsed - lk.start) / LINK_DRAW;
      if (t <= 0) continue;
      t = Math.min(1, t);
      if (t === 1 && !lk.done) {
        lk.done = true;
        nodes[lk.a].pulse = nodes[lk.b].pulse = 1;
      }
      var pa = proj[lk.a], pb = proj[lk.b];
      var e = easeOut(t);
      var ex = pa.x + (pb.x - pa.x) * e, ey = pa.y + (pb.y - pa.y) * e;
      var depth = Math.max(0.25, Math.min(1, ((pa.z + pb.z) / 2 + 1.3) / 2.3));
      var g = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
      g.addColorStop(0, rgba(TEAL, 0.75 * depth));
      g.addColorStop(1, rgba(CORAL, 0.75 * depth));
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1, 2.4 * (pa.s + pb.s) / 2);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // 点(奥から順に)
    var order = proj.map(function (_, idx) { return idx; }).sort(function (m, n) { return proj[m].z - proj[n].z; });
    var unit = Math.min(W, H);
    for (var o = 0; o < order.length; o++) {
      var idx = order[o];
      var n = nodes[idx], pp = proj[idx];
      var depthA = Math.max(0.22, Math.min(1, (pp.z + 1.5) / 2.5));
      var pulse = n.pulse;
      var grow = 1 + 0.45 * Math.sin(Math.min(1, (1 - pulse) * 1.6) * Math.PI) * (pulse > 0 ? 1 : 0);
      var r = Math.max(1.2, n.r * unit * pp.s * grow);

      if (pulse > 0) {
        var glow = ctx.createRadialGradient(pp.x, pp.y, r * 0.5, pp.x, pp.y, r * 4.2);
        glow.addColorStop(0, rgba(n.c, 0.45 * pulse));
        glow.addColorStop(1, rgba(n.c, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, r * 4.2, 0, Math.PI * 2);
        ctx.fill();
      }

      var alpha = n.dust ? depthA * 0.55 : depthA;
      if (r > 3) {
        var body = ctx.createRadialGradient(pp.x - r * 0.35, pp.y - r * 0.4, r * 0.1, pp.x, pp.y, r);
        body.addColorStop(0, rgba([255, 255, 255], 0.9 * alpha));
        body.addColorStop(0.28, rgba(n.c, alpha));
        body.addColorStop(1, rgba(n.c.map(function (v) { return Math.round(v * 0.82); }), alpha));
        ctx.fillStyle = body;
      } else {
        ctx.fillStyle = rgba(n.c, alpha);
      }
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  var inView = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      inView && !document.hidden ? start() : stop();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    document.hidden || !inView ? stop() : start();
  });

  start();
  requestAnimationFrame(function () { hero.classList.add('is-3d'); });
})();
