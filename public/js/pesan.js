// pesan.js - mode gelap & logo untuk halaman Form Pemesanan (pesan.html)
// (logika form pemesanan sendiri ada di js/modules/orderForm.js)
(function () {
  const toggle = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');
  const logo = document.getElementById('logo-img');

  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    if (icon) icon.textContent = dark ? 'light_mode' : 'dark_mode';
    if (toggle) {
      toggle.title = dark ? 'Mode terang' : 'Mode gelap';
      toggle.setAttribute('aria-label', dark ? 'Ganti mode terang' : 'Ganti mode gelap');
    }
    if (logo) logo.src = dark ? logo.dataset.dark : logo.dataset.light;
  }

  applyTheme(document.documentElement.classList.contains('dark'));

  if (toggle) {
    toggle.addEventListener('click', function () {
      const dark = !document.documentElement.classList.contains('dark');
      applyTheme(dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
  }
})();