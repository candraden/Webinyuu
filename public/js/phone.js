// phone.js - kolom nomor WhatsApp dengan pilihan kode negara + bendera (halaman pesan.html)
// Nilai lengkap (kode negara + nomor, tanpa tanda +, contoh 6289537xxxx) disimpan di input tersembunyi
// #whatsapp_number supaya orderForm.js tetap membacanya seperti biasa.
(function () {
  // Format: KODE-ISO|Nama negara|Kode telepon  (tambah/ubah negara cukup edit daftar ini)
  var RAW = [
    'ID|Indonesia|62','MY|Malaysia|60','SG|Singapura|65','BN|Brunei|673','TH|Thailand|66','PH|Filipina|63','VN|Vietnam|84','TL|Timor Leste|670',
    'SA|Arab Saudi|966','AE|Uni Emirat Arab|971','QA|Qatar|974','KW|Kuwait|965','JP|Jepang|81','KR|Korea Selatan|82','CN|Tiongkok|86','HK|Hong Kong|852',
    'TW|Taiwan|886','AU|Australia|61','NZ|Selandia Baru|64','US|Amerika Serikat|1','CA|Kanada|1','GB|Inggris|44','NL|Belanda|31','DE|Jerman|49','FR|Prancis|33','IN|India|91',
    'AF|Afganistan|93','AL|Albania|355','DZ|Aljazair|213','AS|Samoa Amerika|1684','AD|Andorra|376','AO|Angola|244','AI|Anguilla|1264','AG|Antigua dan Barbuda|1268',
    'AR|Argentina|54','AM|Armenia|374','AW|Aruba|297','AT|Austria|43','AZ|Azerbaijan|994','BS|Bahama|1242','BH|Bahrain|973','BD|Bangladesh|880','BB|Barbados|1246',
    'BY|Belarus|375','BE|Belgia|32','BZ|Belize|501','BJ|Benin|229','BM|Bermuda|1441','BT|Bhutan|975','BO|Bolivia|591','BA|Bosnia dan Herzegovina|387','BW|Botswana|267',
    'BR|Brasil|55','BG|Bulgaria|359','BF|Burkina Faso|226','BI|Burundi|257','KH|Kamboja|855','CM|Kamerun|237','CV|Tanjung Verde|238','KY|Kepulauan Cayman|1345',
    'CF|Republik Afrika Tengah|236','TD|Chad|235','CL|Cile|56','CO|Kolombia|57','KM|Komoro|269','CG|Kongo|242','CD|Republik Demokratik Kongo|243','CK|Kepulauan Cook|682',
    'CR|Kosta Rika|506','CI|Pantai Gading|225','HR|Kroasia|385','CU|Kuba|53','CW|Curaçao|599','CY|Siprus|357','CZ|Ceko|420','DK|Denmark|45','DJ|Djibouti|253',
    'DM|Dominika|1767','DO|Republik Dominika|1809','EC|Ekuador|593','EG|Mesir|20','SV|El Salvador|503','GQ|Guinea Khatulistiwa|240','ER|Eritrea|291','EE|Estonia|372',
    'SZ|Eswatini|268','ET|Ethiopia|251','FJ|Fiji|679','FI|Finlandia|358','GA|Gabon|241','GM|Gambia|220','GE|Georgia|995','GH|Ghana|233','GI|Gibraltar|350','GR|Yunani|30',
    'GL|Greenland|299','GD|Grenada|1473','GP|Guadeloupe|590','GU|Guam|1671','GT|Guatemala|502','GN|Guinea|224','GW|Guinea-Bissau|245','GY|Guyana|592','GF|Guyana Prancis|594',
    'HT|Haiti|509','HN|Honduras|504','HU|Hungaria|36','IS|Islandia|354','IR|Iran|98','IQ|Irak|964','IE|Irlandia|353','IL|Israel|972','IT|Italia|39','JM|Jamaika|1876',
    'JO|Yordania|962','KZ|Kazakhstan|7','KE|Kenya|254','KI|Kiribati|686','XK|Kosovo|383','KG|Kirgizstan|996','LA|Laos|856','LV|Latvia|371','LB|Lebanon|961','LS|Lesotho|266',
    'LR|Liberia|231','LY|Libya|218','LI|Liechtenstein|423','LT|Lituania|370','LU|Luksemburg|352','MO|Makau|853','MG|Madagaskar|261','MW|Malawi|265','MV|Maladewa|960',
    'ML|Mali|223','MT|Malta|356','MH|Kepulauan Marshall|692','MQ|Martinik|596','MR|Mauritania|222','MU|Mauritius|230','MX|Meksiko|52','FM|Mikronesia|691','MD|Moldova|373',
    'MC|Monako|377','MN|Mongolia|976','ME|Montenegro|382','MS|Montserrat|1664','MA|Maroko|212','MZ|Mozambik|258','MM|Myanmar|95','NA|Namibia|264','NR|Nauru|674','NP|Nepal|977',
    'NC|Kaledonia Baru|687','NI|Nikaragua|505','NE|Niger|227','NG|Nigeria|234','NU|Niue|683','KP|Korea Utara|850','MK|Makedonia Utara|389','MP|Kepulauan Mariana Utara|1670',
    'NO|Norwegia|47','OM|Oman|968','PK|Pakistan|92','PW|Palau|680','PS|Palestina|970','PA|Panama|507','PG|Papua Nugini|675','PY|Paraguay|595','PE|Peru|51','PF|Polinesia Prancis|689',
    'PL|Polandia|48','PT|Portugal|351','PR|Puerto Riko|1787','RE|Réunion|262','RO|Rumania|40','RU|Rusia|7','RW|Rwanda|250','KN|Saint Kitts dan Nevis|1869','LC|Saint Lucia|1758',
    'VC|Saint Vincent dan Grenadine|1784','WS|Samoa|685','SM|San Marino|378','ST|Sao Tome dan Principe|239','SN|Senegal|221','RS|Serbia|381','SC|Seychelles|248',
    'SL|Sierra Leone|232','SK|Slowakia|421','SI|Slovenia|386','SB|Kepulauan Solomon|677','SO|Somalia|252','ZA|Afrika Selatan|27','SS|Sudan Selatan|211','ES|Spanyol|34',
    'LK|Sri Lanka|94','SD|Sudan|249','SR|Suriname|597','SE|Swedia|46','CH|Swiss|41','SY|Suriah|963','TJ|Tajikistan|992','TZ|Tanzania|255','TG|Togo|228','TO|Tonga|676',
    'TT|Trinidad dan Tobago|1868','TN|Tunisia|216','TR|Turki|90','TM|Turkmenistan|993','TC|Kepulauan Turks dan Caicos|1649','TV|Tuvalu|688','UG|Uganda|256','UA|Ukraina|380',
    'UY|Uruguay|598','UZ|Uzbekistan|998','VU|Vanuatu|678','VA|Vatikan|379','VE|Venezuela|58','VG|Kepulauan Virgin Britania Raya|1284','VI|Kepulauan Virgin AS|1340',
    'YE|Yaman|967','ZM|Zambia|260','ZW|Zimbabwe|263','FO|Kepulauan Faroe|298'
  ];
  var POPULAR = 26;                      // 26 negara pertama di daftar ditampilkan paling atas
  var PREFER = { '1': 'US', '7': 'RU' }; // kalau kode sama dipakai banyak negara, pilih yang ini

  var countries = RAW.map(function (r) { var p = r.split('|'); return { iso: p[0], name: p[1], dial: p[2] }; });
  var top = countries.slice(0, POPULAR);
  var rest = countries.slice(POPULAR).sort(function (a, b) { return a.name.localeCompare(b.name, 'id'); });
  countries = top.concat(rest);

  var field = document.getElementById('phone-field');
  if (!field) return;
  var btn = document.getElementById('cc-btn');
  var flagBox = document.getElementById('cc-flag');
  var dialBox = document.getElementById('cc-dial');
  var panel = document.getElementById('cc-panel');
  var backdrop = document.getElementById('cc-backdrop');
  var search = document.getElementById('cc-search');
  var list = document.getElementById('cc-list');
  var local = document.getElementById('wa_local');
  var hidden = document.getElementById('whatsapp_number');

  var current = countries[0];
  var shown = [];
  var active = 0;

  function flag(iso) {
    var img = document.createElement('img');
    img.className = 'cc-flag';
    img.alt = '';
    img.width = 24; img.height = 18; img.loading = 'lazy';
    img.src = 'https://flagcdn.com/w40/' + iso.toLowerCase() + '.png';
    // kalau gambar bendera gagal dimuat (offline), tampilkan kode negara saja
    img.onerror = function () {
      var s = document.createElement('span');
      s.className = 'cc-flag cc-flag-fallback';
      s.textContent = iso;
      if (img.parentNode) img.parentNode.replaceChild(s, img);
    };
    return img;
  }

  function updateHidden() {
    var n = local.value.replace(/\D/g, '');
    if (current.iso === 'ID' && n.indexOf('62') === 0) n = n.slice(2); // sudah ketik 62 sendiri
    n = n.replace(/^0+/, '');                                           // buang 0 di depan (0812 -> 812)
    n = n.slice(0, Math.max(0, 15 - current.dial.length));
    hidden.value = n ? current.dial + n : '';
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setCountry(c) {
    current = c;
    flagBox.innerHTML = '';
    flagBox.appendChild(flag(c.iso));
    dialBox.textContent = '+' + c.dial;
    btn.title = c.name + ' (+' + c.dial + ')';
    updateHidden();
  }

  function detect(digits) {
    for (var len = 4; len >= 1; len--) {
      var pre = digits.slice(0, len);
      var found = countries.filter(function (c) { return c.dial === pre; });
      if (found.length) {
        var want = PREFER[pre];
        if (want) { var w = found.filter(function (c) { return c.iso === want; })[0]; if (w) return w; }
        return found[0];
      }
    }
    return null;
  }

  function render(q) {
    q = (q || '').toLowerCase().trim();
    var qd = q.replace(/^\+/, '');
    shown = countries.filter(function (c) {
      if (!q) return true;
      return c.name.toLowerCase().indexOf(q) !== -1 || c.iso.toLowerCase() === q ||
             (/^\d+$/.test(qd) && c.dial.indexOf(qd) === 0);
    });
    active = 0;
    list.innerHTML = '';
    list.scrollTop = 0;
    if (!shown.length) {
      var e = document.createElement('li');
      e.className = 'cc-empty'; e.textContent = 'Negara tidak ditemukan';
      list.appendChild(e);
      return;
    }
    shown.forEach(function (c, i) {
      var li = document.createElement('li');
      li.className = 'cc-item' + (i === 0 ? ' is-active' : '') + (c.iso === current.iso ? ' is-current' : '');
      li.setAttribute('role', 'option');
      li.dataset.i = i;
      li.appendChild(flag(c.iso));
      var nm = document.createElement('span'); nm.className = 'cc-name'; nm.textContent = c.name;
      var cd = document.createElement('span'); cd.className = 'cc-code'; cd.textContent = '+' + c.dial;
      li.appendChild(nm); li.appendChild(cd);
      list.appendChild(li);
    });
  }

  function setActive(i) {
    var items = list.querySelectorAll('.cc-item');
    if (!items.length) return;
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach(function (el, k) { el.classList.toggle('is-active', k === active); });
    items[active].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    panel.classList.add('is-open'); backdrop.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    search.value = ''; render('');
    var cur = list.querySelector('.is-current');
    if (cur) cur.scrollIntoView({ block: 'center' });
    search.focus();
  }
  function close() {
    panel.classList.remove('is-open'); backdrop.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }
  function pick(c) { setCountry(c); close(); local.focus(); }

  btn.addEventListener('click', function () { panel.classList.contains('is-open') ? close() : open(); });
  backdrop.addEventListener('click', close);
  document.addEventListener('mousedown', function (e) {
    if (panel.classList.contains('is-open') && !field.contains(e.target)) close();
  });
  search.addEventListener('input', function () { render(search.value); });
  search.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === 'Escape') { close(); btn.focus(); }
  });
  list.addEventListener('click', function (e) {
    var li = e.target.closest('.cc-item');
    if (li) pick(shown[+li.dataset.i]);
  });

  // Ketik manual di kolom nomor: "+62..." / "+60..." otomatis mengenali negaranya
  local.addEventListener('input', function () {
    var v = local.value;
    var digits = v.replace(/\D/g, '');
    if (v.trim().charAt(0) === '+') {
      var c = detect(digits);
      if (c) { setCountry(c); digits = digits.slice(c.dial.length); }
    }
    local.value = digits;
    updateHidden();
  });

  setCountry(current);
})();