import { supabase } from '../lib/supabaseClient.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../config/env.js';
import { esc } from '../shared/escapeHtml.js';

const CREATE_ORDER_URL = `${SUPABASE_URL}/functions/v1/create-order`;
const MANAGE_ASSETS_URL = `${SUPABASE_URL}/functions/v1/manage-order-assets`;

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  'apikey': SUPABASE_PUBLISHABLE_KEY,
};

const ASSET_LABELS = {
  logo: 'Logo Usaha',
  hero_photo: 'Foto Utama (Hero)',
  product_photo: 'Foto Produk / Layanan',
  testimonial_photo: 'Foto Testimonial',
  portfolio_photo: 'Foto Portfolio / Dokumentasi',
  extra_material: 'Materi Tambahan',
  video: 'Video',
};

let currentProduct = null;
let assetLimits = [];
let currentStep = 1;
const TOTAL_STEPS = 4;

function formatRupiah(value) {
  return 'Rp' + Number(value).toLocaleString('id-ID');
}

function getSlugFromUrl() {
  const fromQuery = new URLSearchParams(window.location.search).get('paket');
  if (fromQuery) {
    sessionStorage.setItem('selected_paket', fromQuery);
    return fromQuery;
  }
  // fallback: query string hilang (misal ke-strip redirect "clean URL"
  // dari dev server) -> pakai slug terakhir yang disimpan saat tombol
  // "Pesan" diklik di catalog.js / productDetail.js.
  return sessionStorage.getItem('selected_paket');
}

function showRoot(id) {
  ['state-loading', 'state-invalid', 'state-wizard'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

function renderProgress() {
  const el = document.getElementById('progress-steps');
  el.innerHTML = Array.from({ length: TOTAL_STEPS }, (_, i) => {
    const step = i + 1;
    const active = step <= currentStep;
    return `<div class="flex-1 h-1.5 rounded-full ${active ? 'bg-secondary-container' : 'bg-surface-container'}"></div>`;
  }).join('');
}

function goToStep(step) {
  currentStep = step;
  document.querySelectorAll('.wizard-step').forEach(el => {
    el.classList.toggle('hidden', Number(el.dataset.step) !== step);
  });
  document.getElementById('btn-back').classList.toggle('hidden', step === 1);
  document.getElementById('btn-next').textContent = step === TOTAL_STEPS ? 'Submit Pesanan' : 'Lanjut';
  if (step === TOTAL_STEPS) { renderRingkasan(); refreshPrice(); }
  renderProgress();
  document.getElementById('form-error').classList.add('hidden');
}

// ---- Layanan tambahan & estimasi harga (dihitung server lewat calculate-addon-price) ----
const FN_BASE = `${SUPABASE_URL}/functions/v1`;
let priceSeq = 0;

function collectAddons() {
  const addons = {};
  if (document.getElementById('addon-domain').checked) {
    addons.custom_domain = {
      has_domain: document.querySelector('input[name="domain-case"]:checked')?.value !== 'needs',
      domain_name: document.getElementById('domain-name').value.trim(),
    };
  }
  if (document.getElementById('addon-source').checked) addons.source_code = true;
  return addons;
}

async function refreshPrice() {
  const box = document.getElementById('price-box');
  const seq = ++priceSeq;
  box.innerHTML = '<span class="text-on-surface-variant">Menghitung estimasi...</span>';
  try {
    const a = collectAddons();
    const res = await fetch(`${FN_BASE}/calculate-addon-price`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ product_slug: currentProduct.slug, custom_domain: !!a.custom_domain, source_code: !!a.source_code }),
    });
    const d = await res.json();
    if (seq !== priceSeq) return; // ada permintaan yang lebih baru
    if (!res.ok) throw new Error(d.error);
    const row = (k, v, b) => `<div class="flex justify-between gap-space-sm ${b ? 'font-bold text-primary' : ''}"><span>${k}</span><span>${v}</span></div>`;
    const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
    box.innerHTML = [
      row(`Paket ${esc(currentProduct.name)}`, rp(d.package_price)),
      ...d.items.map(i => row(esc(i.label), rp(i.amount))),
      row('Total', rp(d.total), true),
      row('DP 50% (bayar dulu)', rp(d.dp), true),
      row('Sisa saat pelunasan', rp(d.remaining)),
    ].join('');
  } catch (err) {
    if (seq === priceSeq) box.innerHTML = '<span class="text-error">Estimasi tidak bisa dimuat. Total final tetap dihitung otomatis saat pesanan dibuat.</span>';
  }
}

function bindAddons() {
  const domainCb = document.getElementById('addon-domain');
  domainCb.addEventListener('change', () => {
    document.getElementById('domain-fields').classList.toggle('hidden', !domainCb.checked);
    refreshPrice();
  });
  document.getElementById('addon-source').addEventListener('change', refreshPrice);
  document.querySelectorAll('input[name="domain-case"]').forEach(r => r.addEventListener('change', () => {
    document.getElementById('domain-name').placeholder = r.value === 'needs' && r.checked ? 'Nama / brand yang ingin dijadikan domain' : 'Nama domain yang dimiliki';
  }));
}

function renderRingkasan() {
  const box = document.getElementById('ringkasan-box');
  const val = (id) => esc(document.getElementById(id).value);
  const row = (k, v) => `<div class="flex justify-between gap-space-sm"><span class="text-on-surface-variant">${k}</span><span class="font-semibold text-right">${v}</span></div>`;
  const assets = assetLimits
    .map(l => ({ l, n: (selectedFiles[l.asset_type] || []).length }))
    .filter(x => x.n > 0)
    .map(x => row(assetLabel(x.l.asset_type), `${x.n} file`))
    .join('');
  box.innerHTML = [
    row('Nama', val('customer_name')),
    row('Usaha', val('business_name')),
    row('WhatsApp', val('whatsapp_number')),
    row('Brief', esc(document.getElementById('brief_file').files[0]?.name || '-')),
    assets,
  ].join('');
}

// File yang sudah dipilih per jenis asset. Disimpan di JS (bukan hanya di <input>) supaya
// customer bisa menambah foto bertahap: input file bawaan browser menimpa pilihan lama
// setiap kali dibuka, sehingga di HP sering hanya 1 foto yang tersisa.
const selectedFiles = {};
const fileDurations = new WeakMap();
const ASSET_HINTS = { product_photo: 'Tiap produk/layanan 1-2 foto.' };

const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;
const extOf = (n) => (n.split('.').pop() || '').toLowerCase();
const countText = (l) => (l.min_count === l.max_count ? `${l.max_count} file` : `${l.min_count}-${l.max_count} file`);
const assetLabel = (t) => ASSET_LABELS[t] || t;

function getVideoDuration(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (d) => { URL.revokeObjectURL(url); resolve(d); };
    v.preload = 'metadata';
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? Math.round(v.duration) : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

function refreshBlock(type) {
  const limit = assetLimits.find(a => a.asset_type === type);
  const block = document.querySelector(`[data-asset-block="${type}"]`);
  if (!limit || !block) return;
  const files = selectedFiles[type] || [];
  const ok = files.length >= limit.min_count && files.length <= limit.max_count;
  const counter = block.querySelector('.asset-counter');
  counter.textContent = `${files.length} dari ${countText(limit)} dipilih`;
  counter.className = `asset-counter text-caption font-bold ${ok ? 'text-secondary' : 'text-on-surface-variant'}`;
  block.querySelector('.asset-file-list').innerHTML = files.map((f, i) => `
    <li class="flex items-center justify-between gap-space-sm bg-surface-container-low rounded-lg px-space-sm py-1.5">
      <span class="truncate text-caption">${esc(f.name)} <span class="text-on-surface-variant">(${(f.size / 1048576).toFixed(1)}MB)</span></span>
      <button type="button" class="asset-remove text-caption text-error underline shrink-0" data-asset-type="${type}" data-index="${i}">Hapus</button>
    </li>`).join('');
  block.querySelector('.asset-add').disabled = files.length >= limit.max_count;
}

async function addFiles(type, incoming) {
  const limit = assetLimits.find(a => a.asset_type === type);
  const block = document.querySelector(`[data-asset-block="${type}"]`);
  const errEl = block.querySelector('.asset-error');
  const current = selectedFiles[type] || (selectedFiles[type] = []);
  const errors = [];

  for (const f of incoming) {
    const ext = extOf(f.name);
    if (limit.allowed_formats?.length && !limit.allowed_formats.includes(ext)) {
      errors.push(`${f.name}: format .${ext} tidak diizinkan (${limit.allowed_formats.join(', ')}).`);
      continue;
    }
    if (limit.max_file_size_mb && f.size > limit.max_file_size_mb * 1048576) {
      errors.push(`${f.name}: ukuran melebihi ${limit.max_file_size_mb}MB.`);
      continue;
    }
    if (current.some(x => fileKey(x) === fileKey(f))) continue;
    if (current.length >= limit.max_count) {
      errors.push(`Maksimal ${limit.max_count} file. "${f.name}" tidak ditambahkan.`);
      continue;
    }
    if (type === 'video' && limit.max_duration_seconds) {
      const d = await getVideoDuration(f);
      if (d && d > limit.max_duration_seconds) {
        errors.push(`${f.name}: durasi ${d} detik melebihi batas ${limit.max_duration_seconds} detik.`);
        continue;
      }
      if (d) fileDurations.set(f, d);
    }
    current.push(f);
  }

  errEl.textContent = errors.join(' ');
  errEl.classList.toggle('hidden', errors.length === 0);
  refreshBlock(type);
}

function renderAssetUploaders() {
  const container = document.getElementById('asset-uploaders');

  container.innerHTML = assetLimits.map(limit => {
    const required = limit.min_count > 0;
    const type = limit.asset_type;
    const formats = (limit.allowed_formats || []).join(', ');
    const dur = limit.max_duration_seconds ? `, maks ${limit.max_duration_seconds} detik` : '';
    return `
      <div class="flex flex-col gap-1" data-asset-block="${type}">
        <label class="text-label-md text-primary">${assetLabel(type)} ${required ? '*' : '(opsional)'}</label>
        <p class="text-caption text-on-surface-variant">
          ${countText(limit)}${limit.max_file_size_mb ? `, maks ${limit.max_file_size_mb}MB per file` : ''}${dur}${formats ? `, format: ${formats}` : ''}.
          ${ASSET_HINTS[type] || ''} Kamu bisa menambah file beberapa kali sampai jumlahnya pas.
        </p>
        <input type="file" multiple class="asset-input hidden" data-asset-type="${type}"
          accept="${(limit.allowed_formats || []).map(f => '.' + f).join(',')}">
        <button type="button" class="asset-add self-start border border-dashed border-outline-variant rounded-xl px-space-md py-3 text-body-md text-primary hover:bg-surface-container disabled:opacity-50" data-asset-type="${type}">
          + Tambah file
        </button>
        <p class="asset-counter text-caption font-bold text-on-surface-variant"></p>
        <p class="asset-error hidden text-caption text-error"></p>
        <ul class="asset-file-list flex flex-col gap-1"></ul>
        ${type === 'extra_material' ? `<input type="text" class="asset-description border border-outline-variant rounded-xl px-space-md py-2 mt-1 text-body-md" placeholder="Keterangan materi (wajib)" data-asset-type="extra_material">` : ''}
      </div>`;
  }).join('');

  assetLimits.forEach(l => refreshBlock(l.asset_type));

  if (container.dataset.bound) return;
  container.dataset.bound = '1';
  container.addEventListener('click', (e) => {
    const add = e.target.closest('.asset-add');
    if (add) return add.closest('[data-asset-block]').querySelector('.asset-input').click();
    const rm = e.target.closest('.asset-remove');
    if (rm) {
      const t = rm.dataset.assetType;
      selectedFiles[t].splice(Number(rm.dataset.index), 1);
      rm.closest('[data-asset-block]').querySelector('.asset-error').classList.add('hidden');
      refreshBlock(t);
    }
  });
  container.addEventListener('change', async (e) => {
    const input = e.target.closest('.asset-input');
    if (!input) return;
    const files = Array.from(input.files);
    input.value = ''; // supaya file yang sama bisa dipilih lagi setelah dihapus
    await addFiles(input.dataset.assetType, files);
  });
}

function validateStep(step) {
  const errorEl = document.getElementById('form-error');
  errorEl.classList.add('hidden');

  if (step === 4) {
    if (document.getElementById('addon-domain').checked && !document.getElementById('domain-name').value.trim()) {
      errorEl.textContent = 'Isi nama domain yang dimiliki atau yang diinginkan.';
      errorEl.classList.remove('hidden');
      return false;
    }
    if (!document.getElementById('agree-terms').checked) {
      errorEl.textContent = 'Centang pernyataan persetujuan sebelum mengirim pesanan.';
      errorEl.classList.remove('hidden');
      return false;
    }
  }

  if (step === 1) {
    const name = document.getElementById('customer_name').value.trim();
    const business = document.getElementById('business_name').value.trim();
    const wa = document.getElementById('whatsapp_number').value.trim();
    if (!name || !business || !wa) {
      errorEl.textContent = 'Nama, usaha, dan WhatsApp wajib diisi.';
      errorEl.classList.remove('hidden');
      return false;
    }
    if (!/^62\d{8,13}$/.test(wa)) {
      errorEl.textContent = 'Format WhatsApp harus 62xxxxxxxxxx.';
      errorEl.classList.remove('hidden');
      return false;
    }
  }

  if (step === 2) {
    if (!document.getElementById('brief_file').files[0]) {
      errorEl.textContent = 'Silakan upload dokumen Brief kamu.';
      errorEl.classList.remove('hidden');
      return false;
    }
  }

  if (step === 3) {
    for (const limit of assetLimits) {
      const type = limit.asset_type;
      const count = (selectedFiles[type] || []).length;
      const label = assetLabel(type);
      let msg = '';
      if (count < limit.min_count) msg = `${label}: pilih minimal ${limit.min_count} file (baru ${count}).`;
      else if (count > limit.max_count) msg = `${label}: maksimal ${limit.max_count} file (sekarang ${count}).`;
      else if (type === 'extra_material' && count > 0) {
        const desc = document.querySelector('.asset-description[data-asset-type="extra_material"]');
        if (!desc || !desc.value.trim()) msg = 'Materi Tambahan: keterangan wajib diisi.';
      }
      if (msg) {
        errorEl.textContent = msg;
        errorEl.classList.remove('hidden');
        document.querySelector(`[data-asset-block="${type}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
    }
  }

  return true;
}

async function loadPaket() {
  const slug = getSlugFromUrl();
  if (!slug) return showRoot('state-invalid');

  const { data: product, error } = await supabase
    .from('products')
    .select('id, slug, name, price')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !product) return showRoot('state-invalid');

  const { data: limits } = await supabase
    .from('product_asset_limits')
    .select('*')
    .eq('product_id', product.id);

  currentProduct = product;
  assetLimits = limits || [];

  document.getElementById('paket-nama').textContent = product.name;
  document.getElementById('paket-harga').textContent = formatRupiah(product.price);
  document.getElementById('paket-dp').textContent = `DP: ${formatRupiah(product.price * 0.5)}`;

  renderAssetUploaders();
  showRoot('state-wizard');
  bindAddons();
  goToStep(1);
}

async function uploadFile(orderId, assetType, file, description = null) {
  const duration = fileDurations.get(file) || null;
  const urlRes = await fetch(MANAGE_ASSETS_URL, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({ action: 'get_upload_url', order_id: orderId, asset_type: assetType, file_name: file.name }),
  });
  const urlData = await urlRes.json();
  if (!urlRes.ok) throw new Error(urlData.error || 'Gagal membuat link upload.');

  const { error: uploadError } = await supabase.storage
    .from(urlData.bucket)
    .uploadToSignedUrl(urlData.path, urlData.token, file);
  if (uploadError) throw new Error(`Gagal upload ${file.name}: ${uploadError.message}`);

  const confirmRes = await fetch(MANAGE_ASSETS_URL, {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: JSON.stringify({
      action: 'confirm_upload',
      order_id: orderId,
      asset_type: assetType,
      path: urlData.path,
      original_file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type,
      duration_seconds: duration,
      description,
    }),
  });
  const confirmData = await confirmRes.json();
  if (!confirmRes.ok) throw new Error(confirmData.error || 'Gagal menyimpan data file.');
}

async function submitOrder() {
  const errorEl = document.getElementById('form-error');
  const progressEl = document.getElementById('upload-progress');
  const btnNext = document.getElementById('btn-next');
  btnNext.disabled = true;
  progressEl.classList.remove('hidden');
  progressEl.textContent = 'Membuat pesanan...';

  try {
    const payload = {
      product_slug: currentProduct.slug,
      customer_name: document.getElementById('customer_name').value.trim(),
      business_name: document.getElementById('business_name').value.trim(),
      whatsapp_number: document.getElementById('whatsapp_number').value.trim(),
      email: document.getElementById('email').value.trim(),
      addons: collectAddons(),
    };

    const orderRes = await fetch(CREATE_ORDER_URL, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify(payload),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) throw new Error(orderData.error || 'Gagal membuat pesanan.');

    const orderId = orderData.order_id;

    progressEl.textContent = 'Mengupload Brief...';
    await uploadFile(orderId, 'brief', document.getElementById('brief_file').files[0]);

    for (const limit of assetLimits) {
      const files = selectedFiles[limit.asset_type] || [];
      const descInput = document.querySelector(`.asset-description[data-asset-type="${limit.asset_type}"]`);
      const description = descInput ? descInput.value.trim() : null;

      let n = 0;
      for (const file of files) {
        n += 1;
        progressEl.textContent = `Mengupload ${assetLabel(limit.asset_type)} (${n}/${files.length})...`;
        await uploadFile(orderId, limit.asset_type, file, description);
      }
    }

    progressEl.textContent = 'Memeriksa kelengkapan asset...';
    const finalizeRes = await fetch(MANAGE_ASSETS_URL, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ action: 'finalize_order', order_id: orderId }),
    });
    const finalizeData = await finalizeRes.json();
    if (!finalizeRes.ok) {
      const detail = Array.isArray(finalizeData.missing) ? finalizeData.missing.join(' ') : '';
      throw new Error(`${finalizeData.error || 'Asset belum lengkap.'} ${detail}`.trim());
    }

    const params = new URLSearchParams({
      order_number: orderData.order_number,
      tracking_token: orderData.tracking_token,
      total: orderData.total_amount,
      dp: orderData.dp_amount,
      paket: currentProduct.name,
    });
    window.location.href = `/konfirmasi?${params.toString()}`;
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || 'Terjadi kesalahan. Coba lagi.';
    errorEl.classList.remove('hidden');
    progressEl.classList.add('hidden');
    btnNext.disabled = false;
  }
}

document.getElementById('btn-next').addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  if (currentStep === TOTAL_STEPS) {
    submitOrder();
  } else {
    goToStep(currentStep + 1);
  }
});

document.getElementById('btn-back').addEventListener('click', () => {
  goToStep(currentStep - 1);
});

loadPaket();