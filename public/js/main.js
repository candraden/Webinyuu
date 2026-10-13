// main.js - script halaman utama Webinyuu (animasi muncul, mode gelap, menu HP, menu aktif)
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => observer.observe(el));

  // Mode gelap: ganti tema, ikon tombol, dan gambar hero
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const heroImg = document.getElementById('hero-img');
  const logoImg = document.getElementById('logo-img');
  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    themeIcon.textContent = dark ? 'light_mode' : 'dark_mode';
    themeToggle.title = dark ? 'Mode terang' : 'Mode gelap';
    themeToggle.setAttribute('aria-label', dark ? 'Ganti mode terang' : 'Ganti mode gelap');
    if (heroImg) heroImg.src = dark ? heroImg.dataset.dark : heroImg.dataset.light;
    if (logoImg) logoImg.src = dark ? logoImg.dataset.dark : logoImg.dataset.light;
  }
  // Kalau gambar versi hitam tidak ditemukan, pakai gambar biasa
  if (heroImg) heroImg.addEventListener('error', () => {
    if (heroImg.src.indexOf('-hitam') !== -1) heroImg.src = heroImg.dataset.light;
  });
  applyTheme(document.documentElement.classList.contains('dark'));
  themeToggle.addEventListener('click', () => {
    const dark = !document.documentElement.classList.contains('dark');
    applyTheme(dark);
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
  });

  // Menu HP (hamburger)
  const menuToggle = document.getElementById('menu-toggle');
  const menuIcon = document.getElementById('menu-icon');
  const mobileMenu = document.getElementById('mobile-menu');
  function setMenu(open) {
    mobileMenu.classList.toggle('open', open);
    menuIcon.textContent = open ? 'close' : 'menu';
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuToggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  }
  menuToggle.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('resize', () => { if (window.innerWidth >= 1024) setMenu(false); });

  // Menu aktif tampil seperti "Beranda" (biru, tebal); menu lain abu-abu
  const navLinks = document.querySelectorAll('.nav-link[data-nav]');
  function setActive(key) {
    navLinks.forEach(link => {
      const active = link.dataset.nav === key;
      link.classList.toggle('text-primary', active);
      link.classList.toggle('font-bold', active);
      link.classList.toggle('text-on-surface-variant', !active);
    });
  }
  // Saat menu diklik, langsung ganti warna dan kunci sampai scroll selesai
  let navLocked = false;
  let lockTimer = null;
  function releaseLockSoon() {
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => { navLocked = false; }, 150);
  }
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      setActive(link.dataset.nav);
      navLocked = true;
      releaseLockSoon();
    });
  });

  // Ikut berubah saat scroll
  const sections = [
    { key: 'cara-kerja', el: document.getElementById('cara-kerja') },
    { key: 'paket-harga', el: document.getElementById('paket-harga') }
  ];
  window.addEventListener('scroll', () => {
    if (navLocked) { releaseLockSoon(); return; }
    const y = window.scrollY + 120;
    let current = 'beranda';
    sections.forEach(s => { if (s.el && y >= s.el.offsetTop) current = s.key; });
    setActive(current);
  }, { passive: true });

// ===== ANIMASI SAAT SCROLL =====
// Elemen (judul, kartu, gambar, dll.) muncul dengan animasi ketika masuk ke layar,
// baik saat scroll ke bawah MAUPUN ke atas (animasi diulang tiap kali elemen masuk layar lagi).
// Efek: 'up' naik dari bawah, 'right' masuk dari kanan, 'zoom' membesar, 'fade' memudar.
// Mau mengubah efek suatu bagian? ganti kata efeknya pada panggilan add(...) di bawah ini.
// Mau animasi hanya sekali (tidak diulang)? hapus pemanggilan hide(el, entry) di bagian observer.
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var CLASSES = ['sa', 'sa-up', 'sa-left', 'sa-right', 'sa-zoom', 'sa-fade', 'is-in'];

  // state tiap elemen: 'hidden' (siap dianimasikan) -> 'shown' (sedang animasi) -> 'settled' (selesai)
  function show(el) {
    if (el.dataset.saState !== 'hidden') return;
    el.dataset.saState = 'shown';
    el.classList.add('is-in');
    var wait = (parseInt(el.style.getPropertyValue('--sa-delay'), 10) || 0) + 1000;
    // setelah animasi selesai, lepas class supaya efek hover kartu/tombol tetap bekerja
    el._saTimer = setTimeout(function () {
      CLASSES.forEach(function (c) { el.classList.remove(c); });
      el.dataset.saState = 'settled';
    }, wait);
  }

  // dipanggil ketika elemen sudah benar-benar keluar dari layar -> disiapkan lagi untuk animasi berikutnya
  function hide(el, entry) {
    if (el.dataset.saState === 'hidden') return;
    clearTimeout(el._saTimer);
    el.dataset.saState = 'hidden';
    // keluar lewat atas layar -> nanti muncul lagi dari atas (saat scroll ke atas)
    var fromTop = entry.boundingClientRect.top < 0;
    el.style.setProperty('--sa-y', fromTop ? '-36px' : '36px');
    el.classList.remove('is-in');
    el.classList.add('sa', 'sa-' + el.dataset.saEffect);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.intersectionRatio >= 0.12) show(entry.target);
      else if (entry.intersectionRatio === 0) hide(entry.target, entry);
    });
  }, { threshold: [0, 0.12], rootMargin: '0px 0px -40px 0px' });

  // add(elemen, efek, jeda_ms)
  function add(el, effect, delay) {
    if (!el || el.dataset.saState) return;
    el.dataset.saState = 'hidden';
    el.dataset.saEffect = effect;
    el.classList.add('sa', 'sa-' + effect);
    el.style.setProperty('--sa-delay', (delay || 0) + 'ms');
    io.observe(el);
  }

  // kartu di dalam grid muncul berurutan per baris
  function addGrid(grid, effect) {
    var cols = Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    Array.prototype.forEach.call(grid.children, function (child, i) {
      add(child, effect, (i % cols) * 110);
    });
  }

  // Bagian atas (hero)
  var hero = document.querySelector('main > section:first-child');
  if (hero) {
    add(hero.querySelector('h1'), 'up', 0);
    add(hero.querySelector('h1 + p'), 'up', 120);
    add(hero.querySelector('.flex.flex-wrap'), 'up', 240);
    add(hero.querySelector('#hero-img'), 'right', 200);
  }

  // Bagian lain: judul bagian + kartu-kartunya
  document.querySelectorAll('main > section:not(:first-child)').forEach(function (sec) {
    add(sec.querySelector(':scope > div > div:first-child'), 'up', 0);
    sec.querySelectorAll('.grid').forEach(function (grid) {
      addGrid(grid, sec.id === 'layanan' ? 'zoom' : 'up');
    });
  });

  // Kartu paket dimuat belakangan (dari catalog.js), jadi dipantau terus
  var paketGrid = document.getElementById('paket-grid');
  if (paketGrid) {
    new MutationObserver(function () { addGrid(paketGrid, 'up'); }).observe(paketGrid, { childList: true });
  }

  // Footer
  add(document.querySelector('footer > div'), 'fade', 0);
})();

/* ============================================================
   Tombol "Pesan Sekarang" dan "Lihat Detail" di kartu paket (dibuat oleh catalog.js) ikut gaya 3D.
   Dicari dari tulisannya, jadi catalog.js tidak perlu diubah.
   ============================================================ */
(function () {
  var grid = document.getElementById('paket-grid');
  if (!grid) return;
  function mark() {
    grid.querySelectorAll('a, button').forEach(function (el) {
      if (el.classList.contains('btn-3d')) return;
      if (/pesan\s+sekarang/i.test(el.textContent || '')) {
        el.classList.remove('btn-zoom', 'shadow-sm', 'shadow-md', 'hover:brightness-95', 'transition-all');
        el.classList.add('btn-3d');
      } else if (/lihat\s+detail/i.test(el.textContent || '')) {
        el.classList.remove('btn-zoom', 'hover:brightness-95', 'transition-all', 'underline');
        el.classList.add('btn-3d', 'btn-3d-neutral', 'btn-3d-link');
      }
    });
  }
  mark();
  if (window.MutationObserver) new MutationObserver(mark).observe(grid, { childList: true, subtree: true });
})();