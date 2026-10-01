/**
 * Webinyuu Super Admin — Shared Sidebar (redesign)
 * -----------------------------------------------------------------
 * Cara pakai TIDAK berubah (halaman lama tetap jalan tanpa edit):
 *
 *   <script>window.SA_PAGE = 'produk';</script>
 *   <script src="../partials/sidebar.js"></script>
 *
 * Gaya: full frame (menempel kiri, setinggi layar, tanpa sudut membulat),
 * logo ikon + tulisan "Webinyuu" putih, menu aktif berupa pill lime,
 * kartu akun di bagian bawah.
 * Di mobile/tablet (< lg) sidebar tetap jadi drawer; dibuka lewat
 * window.saOpenSidebar() (dipanggil tombol hamburger di header.js).
 *
 * ID yang dipakai script halaman lain & TIDAK boleh diganti:
 *   #sa-admin-name, #sa-logout-btn
 */
(function () {
  var page = window.SA_PAGE || '';

  var navItems = [
    { key: 'produk', href: '/super-admin/produk.html', icon: 'inventory_2', label: 'Produk &amp; Paket' },
    { key: 'kategori', href: '/super-admin/kategori.html', icon: 'category', label: 'Kategori' },
    { key: 'rekap', href: '/super-admin/rekap.html', icon: 'bar_chart', label: 'Rekap Penjualan' },
    { key: 'orders', href: '/super-admin/orders.html', icon: 'assignment_ind', label: 'Order &amp; Penugasan' },
    { key: 'admin', href: '/super-admin/admin.html', icon: 'manage_accounts', label: 'Kelola Admin' },
  ];

  var navHtml = navItems
    .map(function (item) {
      var isActive = item.key === page;
      var cls = isActive
        ? 'flex items-center gap-space-sm px-space-md py-3 rounded-2xl text-body-md bg-secondary-container text-primary-container font-semibold shadow-sm'
        : 'flex items-center gap-space-sm px-space-md py-3 rounded-2xl text-body-md text-on-primary-container/80 hover:bg-white/10 hover:text-on-primary transition-colors';
      return (
        '<a href="' + item.href + '" class="' + cls + '"' + (isActive ? ' aria-current="page"' : '') + '>' +
        '<span class="material-symbols-outlined text-[22px]">' + item.icon + '</span>' +
        '<span>' + item.label + '</span>' +
        '</a>'
      );
    })
    .join('');

  var html =
    '<div id="sa-sidebar-backdrop" class="fixed inset-0 z-30 bg-tertiary/40 backdrop-blur-sm hidden" aria-hidden="true"></div>' +
    '<aside id="sa-sidebar" class="fixed inset-y-0 left-0 z-40 flex flex-col w-[270px] max-w-[85vw] shrink-0 bg-primary-container text-on-primary-container p-space-md gap-space-lg -translate-x-full transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:w-[260px] lg:max-w-none lg:translate-x-0 lg:self-start">' +

    // Logo — ikon mengikuti bentuk aslinya (tanpa pill/border) + tulisan Webinyuu
    // putih dengan ukuran & ketebalan sama seperti ucapan "Selamat datang" di header.
    '<div class="flex items-center justify-between gap-space-xs">' +
    '<a href="/super-admin/produk.html" class="flex items-center gap-space-sm px-space-xs py-space-xs min-w-0">' +
    '<img alt="" class="h-14 w-14 shrink-0 object-contain" src="/assets/img/logo/Sidebar_Logo.png">' +
    '<span class="text-headline-md lg:text-headline-lg text-white truncate" style="font-weight:800;">Webinyuu</span>' +
    '</a>' +
    '<button id="sa-sidebar-close" class="lg:hidden shrink-0 text-on-primary-container/80 hover:text-on-primary p-1" type="button" aria-label="Tutup menu">' +
    '<span class="material-symbols-outlined">close</span>' +
    '</button>' +
    '</div>' +

    // Menu
    '<nav class="flex flex-col gap-1 overflow-y-auto" aria-label="Menu utama">' +
    '<p class="px-space-md pb-space-xs mb-space-xs text-caption font-semibold uppercase tracking-wider text-on-primary-container/70 border-b border-white/20">Menu</p>' +
    navHtml +
    '</nav>' +

    // Kartu akun
    '<div class="mt-auto rounded-2xl bg-white/10 p-space-sm flex flex-col gap-space-sm">' +
    '<div class="flex items-center gap-space-sm min-w-0">' +
    '<div data-sa-avatar class="w-10 h-10 shrink-0 rounded-full bg-secondary-container text-primary-container flex items-center justify-center text-label-md font-bold">A</div>' +
    '<div class="min-w-0">' +
    '<p class="text-caption text-on-primary-container/60">Masuk sebagai</p>' +
    '<p id="sa-admin-name" class="text-body-md font-semibold text-on-primary truncate">...</p>' +
    '</div>' +
    '</div>' +
    '<button id="sa-logout-btn" class="inline-flex items-center justify-center gap-1 w-full bg-secondary-container text-primary-container text-label-md py-2.5 rounded-xl hover:brightness-95 transition-all" type="button">' +
    '<span class="material-symbols-outlined text-[18px]">logout</span> Keluar' +
    '</button>' +
    '</div>' +

    '</aside>';

  document.write(html);

  window.saOpenSidebar = function () {
    var sb = document.getElementById('sa-sidebar');
    var bd = document.getElementById('sa-sidebar-backdrop');
    if (sb) sb.classList.remove('-translate-x-full');
    if (bd) bd.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
  };

  window.saCloseSidebar = function () {
    var sb = document.getElementById('sa-sidebar');
    var bd = document.getElementById('sa-sidebar-backdrop');
    if (sb) sb.classList.add('-translate-x-full');
    if (bd) bd.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  };

  // Sinkronkan inisial avatar (sidebar + header) dengan nama admin
  // yang diisi oleh script halaman ke #sa-admin-name.
  function syncAvatar() {
    var nameEl = document.getElementById('sa-admin-name');
    if (!nameEl) return;
    var name = (nameEl.textContent || '').trim();
    var initial = name && name !== '...' ? name.charAt(0).toUpperCase() : 'A';
    document.querySelectorAll('[data-sa-avatar]').forEach(function (el) {
      el.textContent = initial;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var closeBtn = document.getElementById('sa-sidebar-close');
    var backdrop = document.getElementById('sa-sidebar-backdrop');
    if (closeBtn) closeBtn.addEventListener('click', window.saCloseSidebar);
    if (backdrop) backdrop.addEventListener('click', window.saCloseSidebar);

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024) window.saCloseSidebar();
    });

    var nameEl = document.getElementById('sa-admin-name');
    if (nameEl) {
      new MutationObserver(syncAvatar).observe(nameEl, { childList: true, characterData: true, subtree: true });
    }
    syncAvatar();
  });
})();