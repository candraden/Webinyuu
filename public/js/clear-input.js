// clear-input.js - tombol hapus isi (X -> panah) di kolom teks form pemesanan
(function () {
  var T = 500;
  document.querySelectorAll('input.form-input[type="text"], input.form-input[type="email"]').forEach(function (input) {
    if (input.closest('.ci-wrap')) return;
    if (!input.placeholder) input.placeholder = ' ';   // dipakai CSS (:placeholder-shown) untuk menyembunyikan tombol saat kosong
    var wrap = document.createElement('div');
    wrap.className = 'ci-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var bars = document.createElement('span');
    bars.className = 'ci-bars';
    bars.setAttribute('role', 'button');
    bars.setAttribute('aria-label', 'Hapus isi kolom');
    bars.innerHTML = '<span class="ci-bar arrow"></span><span class="ci-bar ci-left"></span>';
    wrap.appendChild(bars);

    var busy = false;
    bars.addEventListener('mousedown', function (e) { e.preventDefault(); });
    bars.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      wrap.classList.add('ci-shape');
      setTimeout(function () {
        wrap.classList.add('ci-move');
        setTimeout(function () {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
          wrap.classList.remove('ci-move');
          wrap.classList.remove('ci-shape');
          busy = false;
        }, T);
      }, 300);
    });
  });
})();