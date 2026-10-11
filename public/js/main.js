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