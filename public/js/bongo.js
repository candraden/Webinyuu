/* Bongo Cat: acak not musik, samakan warna latar kucing dengan footer, jeda saat tidak terlihat. */
(function () {
  var wrap = document.querySelector('.bongo');
  if (!wrap) return;
  var footer = wrap.closest('footer');
  if (footer) footer.classList.add('has-bongo');

  // latar kucing = warna footer (ikut berubah saat mode gelap)
  function bg() {
    if (!footer) return;
    var c = getComputedStyle(footer).backgroundColor;
    if (c && c !== 'rgba(0, 0, 0, 0)') wrap.style.setProperty('--bc-bg', c);
  }
  bg();
  if (window.MutationObserver) new MutationObserver(function () { setTimeout(bg, 50); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // not musik: gandakan jadi 3x lalu beri warna/arah/jeda acak
  var colors = ['#a5ea9b', '#ff61d8', '#569cfa', '#ffcc81', '#7ed1e2', '#a3a4ec', '#67b5c0', '#fd7c6e'];
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  document.querySelectorAll('#bongo-cat .music').forEach(function (g) {
    g.querySelectorAll('.note').forEach(function (n) {
      n.parentNode.appendChild(n.cloneNode(true));
      n.parentNode.appendChild(n.cloneNode(true));
    });
    g.querySelectorAll('.note').forEach(function (n, i) {
      n.style.stroke = colors[Math.floor(Math.random() * colors.length)];
      n.style.setProperty('--r', Math.round(rnd(-50, 50)) + 'deg');
      n.style.setProperty('--dr', Math.round(rnd(20, 30)) * (Math.random() < .5 ? -1 : 1) + 'deg');
      n.style.setProperty('--dx', Math.round(rnd(25, 60)) * (Math.random() < .5 ? -1 : 1) + 'px');
      n.style.setProperty('--dur', rnd(3.6, 5).toFixed(2) + 's');
      n.style.setProperty('--d', (i * 0.55 + rnd(0, .4)).toFixed(2) + 's');
    });
  });

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      wrap.classList.toggle('is-paused', !es[0].isIntersecting);
    }).observe(wrap);
  }
})();