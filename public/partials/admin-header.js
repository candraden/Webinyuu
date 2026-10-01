/**
 * Webinyuu Admin — Shared Header
 * -----------------------------------------------------------------
 * Padanan partials/header.js (Super Admin) untuk panel Admin.
 * Cara pakai:
 *
 *   <script>
 *     window.AD_HEADER = {
 *       title: 'Daftar Order',        // judul banner halaman
 *       subtitle: '...',              // opsional
 *       eyebrow: '...',               // opsional, label kecil lime di atas judul
 *       actionsHtml: '<a ...>'        // opsional, tombol di kanan banner
 *     };
 *   </script>
 *   <script src="../partials/admin-header.js"></script>
 *
 * Menulis DUA blok berurutan:
 *   1. Header putih sticky: hamburger (mobile), ucapan selamat datang, avatar.
 *   2. Banner judul halaman (kartu navy) tepat di atas konten.
 *
 * Pencarian ada di dalam halaman (mis. filter di Daftar Order), bukan di
 * header, supaya tetap bisa dipakai di layar kecil.
 */
(function () {
  var cfg = window.AD_HEADER || {};
  var title = cfg.title || '';
  var subtitle = cfg.subtitle || '';
  var actionsHtml = cfg.actionsHtml || '';

  // Font weight 800 untuk ucapan + latar konten sedikit lebih gelap dari header.
  var assetsHtml =
    '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap" rel="stylesheet">' +
    '<style>main{background-color:#eef1f5 !important;}</style>';

  var headerHtml =
    '<header class="sticky top-0 z-20 bg-surface-container-lowest border-b border-outline-variant/50 shadow-sm px-margin py-space-md flex items-center gap-space-sm">' +

    '<button id="ad-menu-btn" class="lg:hidden shrink-0 text-primary bg-surface-container-low border border-outline-variant/50 p-2 rounded-xl hover:bg-surface-container transition-colors" type="button" aria-label="Buka menu">' +
    '<span class="material-symbols-outlined">menu</span>' +
    '</button>' +

    '<p class="flex-1 min-w-0 text-headline-md lg:text-headline-lg text-primary truncate" style="font-weight:800;">Selamat datang, Admin <span aria-hidden="true">&#128075;</span></p>' +

    '<div class="shrink-0 flex items-center gap-space-sm">' +
    '<div data-ad-avatar class="w-10 h-10 shrink-0 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-label-md font-bold shadow-sm" aria-hidden="true">A</div>' +
    '</div>' +

    '</header>';

  var eyebrowHtml = cfg.eyebrow
    ? '<p class="text-caption font-semibold uppercase tracking-wider text-secondary-container">' + cfg.eyebrow + '</p>'
    : '';

  var subtitleHtml = subtitle
    ? '<p class="hidden sm:block text-body-md text-on-primary-container mt-1">' + subtitle + '</p>'
    : '';

  var titleBlockHtml =
    '<div class="px-margin pt-space-lg">' +
    '<div class="relative overflow-hidden rounded-2xl bg-primary-container px-space-lg py-space-lg flex flex-wrap items-center justify-between gap-space-md shadow-md">' +
    '<div aria-hidden="true" class="pointer-events-none absolute -right-6 -top-10 w-24 h-56 rounded-full bg-secondary-container/30 rotate-[35deg]"></div>' +
    '<div aria-hidden="true" class="pointer-events-none absolute right-24 -bottom-16 w-16 h-40 rounded-full bg-secondary-container/20 rotate-[35deg]"></div>' +
    '<div class="relative min-w-0">' +
    eyebrowHtml +
    '<h1 class="text-headline-md lg:text-headline-lg text-white font-bold">' + title + '</h1>' +
    subtitleHtml +
    '</div>' +
    '<div class="relative flex items-center gap-space-sm">' + actionsHtml + '</div>' +
    '</div>' +
    '</div>';

  document.write(assetsHtml + headerHtml + titleBlockHtml);

  document.addEventListener('DOMContentLoaded', function () {
    var menuBtn = document.getElementById('ad-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        if (window.adOpenSidebar) window.adOpenSidebar();
      });
    }
  });
})();
