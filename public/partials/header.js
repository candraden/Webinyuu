/**
 * Webinyuu Super Admin — Shared Header (redesign v3)
 * -----------------------------------------------------------------
 * Cara pakai TIDAK berubah (halaman lama tetap jalan tanpa edit):
 *
 *   <script>
 *     window.SA_HEADER = {
 *       title: 'Kelola Produk &amp; Paket',   // judul halaman (di atas tabel)
 *       subtitle: '...',                      // opsional, di bawah judul
 *       actionsHtml: '<button ...>',          // opsional, sejajar judul
 *       eyebrow: 'Kelola Data',               // opsional, label kecil lime di atas judul (default: tidak ada)
 *       searchPlaceholder: 'Cari paket...'    // opsional; false = sembunyikan
 *     };
 *   </script>
 *   <script src="../partials/header.js"></script>
 *
 * Skrip ini menulis DUA blok berurutan:
 *   1. Header putih (sticky, ada border bawah): ucapan selamat datang,
 *      kolom pencarian, avatar.
 *   2. Banner judul halaman (bukan bagian header): kartu navy berisi judul,
 *      subtitle, dan tombol aksi — tepat di atas konten/tabel.
 *
 * Pencarian: memancarkan event `sa:search` (cancelable). Kalau halaman
 * tidak memanggil preventDefault(), baris tabel (`main table tbody tr`)
 * otomatis disaring berdasarkan teksnya.
 */
(function () {
  var cfg = window.SA_HEADER || {};
  var page = window.SA_PAGE || '';
  var title = cfg.title || '';
  var subtitle = cfg.subtitle || '';
  var actionsHtml = cfg.actionsHtml || '';
  var searchPlaceholder = cfg.searchPlaceholder === false ? '' : (cfg.searchPlaceholder || 'Cari...');

  // Font weight 800 untuk ucapan (halaman hanya memuat 400-700 secara default)
  // + latar area konten dibuat sedikit lebih gelap dari header supaya
  // batas header/konten terlihat jelas.
  var assetsHtml =
    '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap" rel="stylesheet">' +
    '<style>main{background-color:#eef1f5 !important;}</style>';

  var searchHtml = searchPlaceholder
    ? '<label class="hidden md:flex items-center gap-space-xs bg-surface-container-low border border-outline-variant/50 rounded-full px-space-md py-2.5 w-[260px] focus-within:ring-2 focus-within:ring-secondary-container focus-within:bg-surface-container-lowest transition-all">' +
      '<span class="material-symbols-outlined text-[20px] text-on-surface-variant">search</span>' +
      '<input id="sa-search-input" type="search" class="w-full bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none" placeholder="' + searchPlaceholder + '" aria-label="Cari">' +
      '</label>'
    : '';

  var headerHtml =
    '<header class="sticky top-0 z-20 bg-surface-container-lowest border-b border-outline-variant/50 shadow-sm px-margin py-space-md flex items-center gap-space-sm">' +

    '<button id="sa-menu-btn" class="lg:hidden shrink-0 text-primary bg-surface-container-low border border-outline-variant/50 p-2 rounded-xl hover:bg-surface-container transition-colors" type="button" aria-label="Buka menu">' +
    '<span class="material-symbols-outlined">menu</span>' +
    '</button>' +

    '<p class="flex-1 min-w-0 text-headline-md lg:text-headline-lg text-primary truncate" style="font-weight:800;">Selamat datang, Super Admin <span aria-hidden="true">&#128075;</span></p>' +

    '<div class="shrink-0 flex items-center gap-space-sm">' +
    searchHtml +
    '<div data-sa-avatar class="w-10 h-10 shrink-0 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-label-md font-bold shadow-sm" aria-hidden="true">A</div>' +
    '</div>' +

    '</header>';

  var eyebrowHtml = cfg.eyebrow
    ? '<p class="text-caption font-semibold uppercase tracking-wider text-secondary-container">' + cfg.eyebrow + '</p>'
    : '';

  var subtitleHtml = subtitle
    ? '<p class="hidden sm:block text-body-md text-on-primary-container mt-1">' + subtitle + '</p>'
    : '';

  // Banner judul halaman: kartu navy + hiasan lime, tombol aksi di kanan
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

  function defaultFilter(query) {
    var q = query.toLowerCase();
    document.querySelectorAll('main table tbody tr').forEach(function (tr) {
      tr.style.display = !q || tr.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var menuBtn = document.getElementById('sa-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        if (window.saOpenSidebar) window.saOpenSidebar();
      });
    }

    var searchInput = document.getElementById('sa-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        var query = searchInput.value.trim();
        var ev = new CustomEvent('sa:search', { detail: { query: query }, cancelable: true });
        if (document.dispatchEvent(ev)) defaultFilter(query);
      });
    }
  });
})();