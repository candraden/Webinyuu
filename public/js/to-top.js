/* Tombol kembali ke atas: muncul setelah scroll, cincin menunjukkan progres halaman. */
(function () {
  var btn = document.getElementById('to-top');
  if (!btn) return;
  var path = btn.querySelector('.tt-ring path');
  var len = path.getTotalLength();
  path.style.strokeDasharray = len + ' ' + len;
  var SHOW_AFTER = 120;   // tombol muncul setelah scroll sejauh ini (px)
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    path.style.strokeDashoffset = len * (1 - p);
    btn.classList.toggle('is-visible', y > SHOW_AFTER);
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  btn.addEventListener('click', function () {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();