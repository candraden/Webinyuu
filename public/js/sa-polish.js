// Pendamping assets/css/sa-polish.css: beri label tiap sel tabel (untuk tampilan kartu di HP),
// tandai pembungkus tabel & kartu, dan ganti tulisan loading dengan Pac-Man.
(function () {
  function label(table) {
    var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (t) { return t.textContent.trim(); });
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) {
        if (heads[i] && td.getAttribute('data-label') !== heads[i]) td.setAttribute('data-label', heads[i]);
      });
    });
  }
  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('main table'), function (table) {
      table.classList.add('sa-table');
      if (table.parentElement) table.parentElement.classList.add('sa-wrap');
      label(table);
      var tb = table.tBodies[0];
      if (tb && window.MutationObserver) new MutationObserver(function () { label(table); }).observe(tb, { childList: true });
    });
    Array.prototype.forEach.call(document.querySelectorAll('main .bg-surface-container-lowest.rounded-2xl'), function (el) {
      if (!el.querySelector('table')) el.classList.add('sa-card');
    });
    var ld = document.getElementById('state-loading');
    if (ld && !ld.querySelector('.pacman-loader')) {
      var p = document.createElement('div'); p.className = 'pacman-loader'; p.setAttribute('aria-hidden', 'true');
      p.innerHTML = '<div class="chomper"></div>'; ld.insertBefore(p, ld.firstChild); ld.classList.add('sa-loading');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();