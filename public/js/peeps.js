/* ============================================================
   ANIMASI ORANG BERJALAN di kartu hero (versi tanpa GSAP, dari kode "Open Peeps" di codepen)
   Gambar orang diambil dari sprite sheet. Urutan sumber gambar:
     1) ./assets/img/open-peeps-sheet.png   <- simpan file ini di situ biar tidak tergantung internet
     2) alamat codepen asli (dipakai kalau file lokal tidak ada)
   ============================================================ */
(function () {
  var canvas = document.getElementById('peeps');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // ====== PENGATURAN (boleh diubah) ======
  var SOURCES = [
    './assets/img/open-peeps-sheet.png',
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/open-peeps-sheet.png'
  ];
  var COLS = 15, ROWS = 7;      // isi sprite sheet: 15 kolom x 7 baris (jangan diubah kecuali gambarnya diganti)
  var COUNT = 30;               // jumlah orang yang berjalan (maks 105)
  var SIZE = 0.62;              // tinggi orang dibanding tinggi kartu (0.62 = 62%)
  var SPEED = 1;                // kecepatan jalan (0.5 = pelan, 2 = cepat)
  // =======================================

  var img = new Image(), srcIndex = 0;
  img.onerror = function () { if (++srcIndex < SOURCES.length) img.src = SOURCES[srcIndex]; };
  img.onload = init;
  img.src = SOURCES[0];

  var peeps = [], W = 0, H = 0, dpr = 1, running = true, last = 0;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  function init() {
    var cw = img.naturalWidth / COLS, ch = img.naturalHeight / ROWS, all = [];
    for (var i = 0; i < COLS * ROWS; i++) all.push({ sx: (i % COLS) * cw, sy: ((i / COLS) | 0) * ch, cw: cw, ch: ch });
    // acak urutan, ambil sebanyak COUNT
    all.sort(function () { return Math.random() - .5; });
    peeps = all.slice(0, Math.min(COUNT, all.length)).map(function (r) {
      return { r: r, dir: Math.random() > .5 ? 1 : -1, t: Math.random(), dur: 10 / rnd(.5, 1.5), lift: Math.pow(Math.random(), 2), phase: Math.random() * 6 };
    });
    resize();
    window.addEventListener('resize', resize);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { running = es[0].isIntersecting; }).observe(canvas);
    }
    if (reduce) draw(); else requestAnimationFrame(tick);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);   // dibatasi 2 supaya ringan di HP
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (reduce) draw();
  }

  function tick(now) {
    requestAnimationFrame(tick);
    if (!running) { last = now; return; }
    var dt = Math.min((now - last) / 1000, .1); last = now;
    peeps.forEach(function (p) { p.t += dt * SPEED / p.dur; if (p.t >= 1) { p.t -= 1; p.dir = Math.random() > .5 ? 1 : -1; p.lift = Math.pow(Math.random(), 2); } });
    draw();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!W || !H) return;
    var items = peeps.map(function (p) {
      var s = Math.min(1, (H * SIZE) / p.r.ch), w = p.r.cw * s, h = p.r.ch * s;
      // y bawah makin kecil = orang di "belakang" (digambar duluan)
      var base = H - h + 100 * s - 250 * s * p.lift;
      return { p: p, w: w, h: h, base: base };
    }).sort(function (a, b) { return a.base - b.base; });
    items.forEach(function (it) {
      var p = it.p, x = p.dir === 1 ? -it.w + p.t * (W + it.w) : W + it.w - p.t * (W + it.w);
      var bob = reduce ? 0 : Math.abs(Math.sin(p.t * 40 + p.phase)) * 10 * (it.h / p.r.ch);
      ctx.save();
      ctx.translate(x, it.base - bob);
      ctx.scale(p.dir, 1);
      ctx.drawImage(img, p.r.sx, p.r.sy, p.r.cw, p.r.ch, p.dir === 1 ? 0 : 0, 0, it.w, it.h);
      ctx.restore();
    });
  }
})();