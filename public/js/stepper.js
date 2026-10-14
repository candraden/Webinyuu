// stepper.js - indikator langkah (SVG) untuk pesan.html; mengikuti .wizard-step yang sedang tampil
(function () {
  const box = document.getElementById('stepper');
  if (!box) return;
  const LABELS = ['Data Pemesan', 'Upload Brief', 'Upload Asset', 'Ringkasan & Submit'];
  const X = [5, 35, 65, 95];
  const NS = 'http://www.w3.org/2000/svg';
  const CHECK = ['M 3 5.5 l 1.5 1.5 l 3 -3.5', 'M 33 5.5 l 1.5 1.5 l 3 -3.5', 'M 63 5.5 l 1.5 1.5 l 3 -3.5', 'M 93 5.5 l 1.5 1.5 l 3 -3.5'];

  let html = '<svg viewBox="0 0 100 10" aria-hidden="true">' +
    '<defs><mask id="stp-mask"><rect width="100" height="10" fill="#000"/>' +
    '<rect id="stp-fill" x="0" y="0" width="100" height="10" fill="#fff" style="transform-origin:0 0;transform:scaleX(.05)"/></mask></defs>' +
    '<path class="stp-track" d="M 5 5 h 90" stroke-width="4"/>';
  X.forEach(x => { html += '<circle class="stp-track-dot" cx="' + x + '" cy="5" r="5"/>'; });
  html += '<g mask="url(#stp-mask)"><path class="stp-on" d="M 5 5 h 90" stroke-width="4" stroke-linecap="round"/>';
  X.forEach(x => { html += '<circle class="stp-on-dot" cx="' + x + '" cy="5" r="5"/>'; });
  html += '</g>';
  X.forEach((x, i) => {
    html += '<text class="stp-num" data-i="' + i + '" x="' + x + '" y="6.7" text-anchor="middle">' + (i + 1) + '</text>';
    html += '<path class="stp-check" data-i="' + i + '" d="' + CHECK[i] + '" fill="none" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>';
  });
  html += '</svg><ol class="stp-labels">';
  LABELS.forEach((l, i) => { html += '<li data-i="' + i + '" style="left:' + X[i] + '%">' + l.replace('&', '&amp;') + '</li>'; });
  html += '</ol>';
  box.innerHTML = html;

  const fill = box.querySelector('#stp-fill');
  function set(n) {
    n = Math.max(1, Math.min(4, n));
    fill.style.transform = 'scaleX(' + ((X[n - 1] + 5) / 100) + ')';
    box.querySelectorAll('[data-i]').forEach(el => {
      const i = +el.dataset.i;
      el.classList.toggle('done', i < n - 1);
      el.classList.toggle('current', i === n - 1);
    });
    box.setAttribute('data-step', n);
  }
  function read() {
    const s = document.querySelector('.wizard-step:not(.hidden)');
    set(s ? +s.dataset.step : 1);
  }
  read();
  const mo = new MutationObserver(read);
  document.querySelectorAll('.wizard-step').forEach(s => mo.observe(s, { attributes: true, attributeFilter: ['class'] }));
})();