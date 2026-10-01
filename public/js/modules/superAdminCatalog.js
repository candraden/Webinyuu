import { supabase } from '../lib/supabaseClient.js';
import { requireSuperAdmin, initShell } from '../lib/superAdminGuard.js';
import { formatRupiah } from '../shared/formatCurrency.js';

const ASSET_TYPES = [
  { value: 'logo', label: 'Logo' },
  { value: 'hero_photo', label: 'Foto Hero' },
  { value: 'product_photo', label: 'Foto Produk' },
  { value: 'testimonial_photo', label: 'Foto Testimoni' },
  { value: 'portfolio_photo', label: 'Foto Portofolio' },
  { value: 'extra_material', label: 'Materi Tambahan' },
  { value: 'video', label: 'Video' },
];

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Ubah error Postgres jadi pesan yang enak dibaca. Kode 23503 = foreign key violation,
// 23505 = unique violation (biasanya slug bentrok).
function friendlyError(error, context) {
  if (!error) return '';
  if (error.code === '23503') {
    return context === 'produk'
      ? 'Paket ini tidak bisa dihapus karena sudah punya order terkait. Nonaktifkan saja alih-alih menghapus.'
      : 'Data ini tidak bisa dihapus karena masih dipakai data lain.';
  }
  if (error.code === '23505') {
    return 'Slug sudah dipakai, coba slug lain.';
  }
  return error.message || 'Terjadi kesalahan, coba lagi.';
}

function showState(prefix, state) {
  ['loading', 'empty', 'error'].forEach((s) => {
    const el = document.getElementById(`state-${s}`);
    if (el) el.classList.toggle('hidden', s !== state);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.querySelector('script[src*="superAdminCatalog.js"]')?.dataset.page;

  const auth = await requireSuperAdmin();
  if (!auth) return;
  initShell(auth.admin);

  if (page === 'kategori') {
    initKategoriPage();
  } else {
    initProdukPage();
  }
});

// ============================================================================
// KATEGORI
// ============================================================================

function initKategoriPage() {
  const modal = document.getElementById('modal-kategori');
  const form = document.getElementById('form-kategori');
  const errorEl = document.getElementById('kategori-form-error');
  const tbody = document.getElementById('kategori-tbody');
  const tableWrap = document.getElementById('kategori-table-wrap');

  const nameInput = document.getElementById('kategori-name');
  const slugInput = document.getElementById('kategori-slug');
  let slugTouched = false;
  slugInput.addEventListener('input', () => { slugTouched = true; });
  nameInput.addEventListener('input', () => {
    if (!slugTouched) slugInput.value = slugify(nameInput.value);
  });

  function openModal(kategori) {
    form.reset();
    errorEl.classList.add('hidden');
    slugTouched = false;
    document.getElementById('kategori-id').value = kategori?.id || '';
    document.getElementById('modal-kategori-title').textContent = kategori ? 'Edit Kategori' : 'Tambah Kategori';
    nameInput.value = kategori?.name || '';
    slugInput.value = kategori?.slug || '';
    slugTouched = !!kategori;
    document.getElementById('kategori-sort').value = kategori?.sort_order ?? 0;
    document.getElementById('kategori-active').checked = kategori ? kategori.is_active : true;
    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  document.getElementById('btn-add-kategori').addEventListener('click', () => openModal(null));
  document.getElementById('btn-cancel-kategori').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  async function loadKategori() {
    showState('kategori', 'loading');
    tableWrap.classList.add('hidden');

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      document.getElementById('state-error').textContent = friendlyError(error, 'kategori');
      showState('kategori', 'error');
      return;
    }

    if (!data || data.length === 0) {
      showState('kategori', 'empty');
      return;
    }

    tbody.innerHTML = data.map(renderKategoriRow).join('');
    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-empty').classList.add('hidden');
    document.getElementById('state-error').classList.add('hidden');
    tableWrap.classList.remove('hidden');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kategori = data.find((k) => k.id === btn.dataset.edit);
        openModal(kategori);
      });
    });
    tbody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteKategori(btn.dataset.delete));
    });
  }

  function renderKategoriRow(k) {
    return `
      <tr class="border-b border-outline-variant/20 last:border-0">
        <td class="px-space-md py-space-sm text-on-surface-variant">${k.sort_order}</td>
        <td class="px-space-md py-space-sm font-semibold text-on-surface">${k.name}</td>
        <td class="px-space-md py-space-sm text-on-surface-variant">${k.slug}</td>
        <td class="px-space-md py-space-sm">
          <span class="text-caption px-space-sm py-1 rounded-full ${k.is_active ? 'bg-secondary-container text-primary-container' : 'bg-surface-container text-on-surface-variant'}">
            ${k.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td class="px-space-md py-space-sm text-left">
          <button class="text-primary hover:underline text-label-md mr-space-sm" data-edit="${k.id}" type="button">Edit</button>
          <button class="text-error hover:underline text-label-md" data-delete="${k.id}" type="button">Hapus</button>
        </td>
      </tr>`;
  }

  async function deleteKategori(id) {
    if (!confirm('Hapus kategori ini? Paket yang memakai kategori ini akan jadi tanpa kategori.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert(friendlyError(error, 'kategori'));
      return;
    }
    loadKategori();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const id = document.getElementById('kategori-id').value;
    const payload = {
      name: nameInput.value.trim(),
      slug: slugify(slugInput.value),
      sort_order: Number(document.getElementById('kategori-sort').value) || 0,
      is_active: document.getElementById('kategori-active').checked,
    };

    const query = id
      ? supabase.from('categories').update(payload).eq('id', id)
      : supabase.from('categories').insert(payload);

    const { error } = await query;
    if (error) {
      errorEl.textContent = friendlyError(error, 'kategori');
      errorEl.classList.remove('hidden');
      return;
    }

    closeModal();
    loadKategori();
  });

  loadKategori();
}

// ============================================================================
// PRODUK
// ============================================================================

function initProdukPage() {
  const modal = document.getElementById('modal-produk');
  const form = document.getElementById('form-produk');
  const errorEl = document.getElementById('produk-form-error');
  const tbody = document.getElementById('produk-tbody');
  const tableWrap = document.getElementById('produk-table-wrap');
  const categorySelect = document.getElementById('produk-category');
  const assetTbody = document.getElementById('asset-limits-tbody');

  const nameInput = document.getElementById('produk-name');
  const slugInput = document.getElementById('produk-slug');
  let slugTouched = false;
  slugInput.addEventListener('input', () => { slugTouched = true; });
  nameInput.addEventListener('input', () => {
    if (!slugTouched) slugInput.value = slugify(nameInput.value);
  });

  function renderAssetLimitRows(limitsByType) {
    assetTbody.innerHTML = ASSET_TYPES.map(({ value, label }) => {
      const l = limitsByType[value] || {};
      return `
        <tr class="border-b border-outline-variant/20 last:border-0" data-asset-row="${value}">
          <td class="px-space-sm py-space-xs text-body-md">${label}</td>
          <td class="px-space-sm py-space-xs"><input class="w-full border border-outline-variant rounded-lg px-space-sm py-2 text-body-md" type="number" min="0" data-field="min_count" value="${l.min_count ?? 0}"></td>
          <td class="px-space-sm py-space-xs"><input class="w-full border border-outline-variant rounded-lg px-space-sm py-2 text-body-md" type="number" min="0" data-field="max_count" value="${l.max_count ?? 0}"></td>
          <td class="px-space-sm py-space-xs"><input class="w-full border border-outline-variant rounded-lg px-space-sm py-2 text-body-md" type="number" min="0" data-field="max_file_size_mb" value="${l.max_file_size_mb ?? ''}"></td>
          <td class="px-space-sm py-space-xs"><input class="w-full border border-outline-variant rounded-lg px-space-sm py-2 text-body-md" type="number" min="0" data-field="max_duration_seconds" value="${l.max_duration_seconds ?? ''}" ${value === 'video' ? '' : 'disabled placeholder="-"'}></td>
          <td class="px-space-sm py-space-xs"><input class="w-full border border-outline-variant rounded-lg px-space-sm py-2 text-body-md" type="text" placeholder="jpg,png" data-field="allowed_formats" value="${(l.allowed_formats || []).join(',')}"></td>
        </tr>`;
    }).join('');
  }

  function collectAssetLimits() {
    const rows = assetTbody.querySelectorAll('[data-asset-row]');
    const result = [];
    rows.forEach((row) => {
      const assetType = row.dataset.assetRow;
      const minCount = Number(row.querySelector('[data-field="min_count"]').value) || 0;
      const maxCount = Number(row.querySelector('[data-field="max_count"]').value) || 0;
      if (minCount === 0 && maxCount === 0) return; // tipe asset ini tidak dipakai paket ini
      const fileSizeVal = row.querySelector('[data-field="max_file_size_mb"]').value;
      const durationVal = row.querySelector('[data-field="max_duration_seconds"]').value;
      const formatsVal = row.querySelector('[data-field="allowed_formats"]').value;
      result.push({
        asset_type: assetType,
        min_count: minCount,
        max_count: maxCount,
        max_file_size_mb: fileSizeVal ? Number(fileSizeVal) : null,
        max_duration_seconds: durationVal ? Number(durationVal) : null,
        allowed_formats: formatsVal ? formatsVal.split(',').map((f) => f.trim().toLowerCase()).filter(Boolean) : [],
      });
    });
    return result;
  }

  async function loadCategoriesIntoSelect() {
    const { data } = await supabase.from('categories').select('id, name').order('sort_order');
    categorySelect.innerHTML = '<option value="">Tanpa kategori</option>'
      + (data || []).map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  function linesToArray(text) {
    return text.split('\n').map((l) => l.trim()).filter(Boolean);
  }

  async function openModal(product) {
    form.reset();
    errorEl.classList.add('hidden');
    slugTouched = !!product;
    document.getElementById('produk-id').value = product?.id || '';
    document.getElementById('modal-produk-title').textContent = product ? 'Edit Paket' : 'Tambah Paket';

    nameInput.value = product?.name || '';
    slugInput.value = product?.slug || '';
    categorySelect.value = product?.category_id || '';
    document.getElementById('produk-sort').value = product?.sort_order ?? 0;
    document.getElementById('produk-active').checked = product ? product.is_active : true;
    document.getElementById('produk-price').value = product?.price ?? '';
    document.getElementById('produk-promo-price').value = product?.promo_price ?? '';
    document.getElementById('produk-revision-limit').value = product?.revision_limit ?? 0;
    document.getElementById('produk-duration').value = product?.estimated_duration_days ?? '';
    document.getElementById('produk-desc-short').value = product?.description_short || '';
    document.getElementById('produk-desc-full').value = product?.description_full || '';
    document.getElementById('produk-terms').value = product?.terms || '';
    document.getElementById('produk-benefits').value = (product?.benefits || []).join('\n');
    document.getElementById('produk-features').value = (product?.features_scope || []).join('\n');
    document.getElementById('produk-included').value = (product?.included || []).join('\n');
    document.getElementById('produk-excluded').value = (product?.excluded || []).join('\n');
    document.getElementById('produk-gallery').value = (product?.gallery || []).join('\n');
    document.getElementById('produk-thumbnail').value = product?.thumbnail_url || '';
    document.getElementById('produk-brief-url').value = product?.brief_template_url || '';
    document.getElementById('produk-max-items').value = '';
    document.getElementById('produk-min-photos').value = 1;
    document.getElementById('produk-max-photos').value = 2;

    let limitsByType = {};
    if (product) {
      const [{ data: assetLimits }, { data: itemLimit }] = await Promise.all([
        supabase.from('product_asset_limits').select('*').eq('product_id', product.id),
        supabase.from('product_item_limits').select('*').eq('product_id', product.id).maybeSingle(),
      ]);
      (assetLimits || []).forEach((l) => { limitsByType[l.asset_type] = l; });
      if (itemLimit) {
        document.getElementById('produk-max-items').value = itemLimit.max_items ?? '';
        document.getElementById('produk-min-photos').value = itemLimit.min_photos_per_item ?? 1;
        document.getElementById('produk-max-photos').value = itemLimit.max_photos_per_item ?? 2;
      }
    }
    renderAssetLimitRows(limitsByType);

    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  document.getElementById('btn-add-produk').addEventListener('click', () => openModal(null));
  document.getElementById('btn-cancel-produk').addEventListener('click', closeModal);
  document.getElementById('btn-close-produk').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  let productsCache = [];

  async function loadProduk() {
    showState('produk', 'loading');
    tableWrap.classList.add('hidden');

    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('sort_order', { ascending: true });

    if (error) {
      document.getElementById('state-error').textContent = friendlyError(error, 'produk');
      showState('produk', 'error');
      return;
    }

    productsCache = data || [];

    if (productsCache.length === 0) {
      showState('produk', 'empty');
      return;
    }

    tbody.innerHTML = productsCache.map(renderProdukRow).join('');
    document.getElementById('state-loading').classList.add('hidden');
    document.getElementById('state-empty').classList.add('hidden');
    document.getElementById('state-error').classList.add('hidden');
    tableWrap.classList.remove('hidden');

    tbody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const product = productsCache.find((p) => p.id === btn.dataset.edit);
        openModal(product);
      });
    });
    tbody.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => toggleActive(btn.dataset.toggle));
    });
    tbody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteProduk(btn.dataset.delete));
    });
  }

  function renderProdukRow(p) {
    return `
      <tr class="border-b border-outline-variant/20 last:border-0">
        <td class="px-space-md py-space-sm font-semibold text-on-surface">${p.name}</td>
        <td class="px-space-md py-space-sm text-on-surface-variant">${p.categories?.name || '—'}</td>
        <td class="px-space-md py-space-sm text-on-surface-variant">${formatRupiah(p.price)}</td>
        <td class="px-space-md py-space-sm text-on-surface-variant">${p.revision_limit}x</td>
        <td class="px-space-md py-space-sm">
          <button class="text-caption px-space-sm py-1 rounded-full ${p.is_active ? 'bg-secondary-container text-primary-container' : 'bg-surface-container text-on-surface-variant'}" data-toggle="${p.id}" type="button">
            ${p.is_active ? 'Aktif' : 'Nonaktif'}
          </button>
        </td>
        <td class="px-space-md py-space-sm text-left">
          <button class="text-primary hover:underline text-label-md mr-space-sm" data-edit="${p.id}" type="button">Edit</button>
          <button class="text-error hover:underline text-label-md" data-delete="${p.id}" type="button">Hapus</button>
        </td>
      </tr>`;
  }

  async function toggleActive(id) {
    const product = productsCache.find((p) => p.id === id);
    if (!product) return;
    const { error } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', id);
    if (error) { alert(friendlyError(error, 'produk')); return; }
    loadProduk();
  }

  async function deleteProduk(id) {
    if (!confirm('Hapus paket ini? Tindakan ini tidak bisa dibatalkan. Kalau paket sudah pernah dipesan, gunakan "Nonaktifkan" saja.')) return;

    // Hapus dulu baris turunan supaya tidak kena FK constraint, baru hapus produknya.
    await supabase.from('product_asset_limits').delete().eq('product_id', id);
    await supabase.from('product_item_limits').delete().eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      alert(friendlyError(error, 'produk'));
      return;
    }
    loadProduk();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const id = document.getElementById('produk-id').value;
    const price = Number(document.getElementById('produk-price').value);
    const promoPriceVal = document.getElementById('produk-promo-price').value;

    if (!price || price <= 0) {
      errorEl.textContent = 'Harga paket wajib diisi.';
      errorEl.classList.remove('hidden');
      return;
    }

    const payload = {
      name: nameInput.value.trim(),
      slug: slugify(slugInput.value),
      category_id: categorySelect.value || null,
      sort_order: Number(document.getElementById('produk-sort').value) || 0,
      is_active: document.getElementById('produk-active').checked,
      price,
      promo_price: promoPriceVal ? Number(promoPriceVal) : null,
      revision_limit: Number(document.getElementById('produk-revision-limit').value) || 0,
      estimated_duration_days: document.getElementById('produk-duration').value
        ? Number(document.getElementById('produk-duration').value) : null,
      description_short: document.getElementById('produk-desc-short').value.trim() || null,
      description_full: document.getElementById('produk-desc-full').value.trim() || null,
      terms: document.getElementById('produk-terms').value.trim() || null,
      benefits: linesToArray(document.getElementById('produk-benefits').value),
      features_scope: linesToArray(document.getElementById('produk-features').value),
      included: linesToArray(document.getElementById('produk-included').value),
      excluded: linesToArray(document.getElementById('produk-excluded').value),
      gallery: linesToArray(document.getElementById('produk-gallery').value),
      thumbnail_url: document.getElementById('produk-thumbnail').value.trim() || null,
      brief_template_url: document.getElementById('produk-brief-url').value.trim() || null,
    };

    const query = id
      ? supabase.from('products').update(payload).eq('id', id).select().single()
      : supabase.from('products').insert(payload).select().single();

    const { data: savedProduct, error } = await query;

    if (error) {
      errorEl.textContent = friendlyError(error, 'produk');
      errorEl.classList.remove('hidden');
      return;
    }

    const productId = savedProduct.id;

    // Asset limits: hapus semua lalu insert ulang yang diisi (lebih sederhana & aman dari duplikat).
    await supabase.from('product_asset_limits').delete().eq('product_id', productId);
    const assetLimits = collectAssetLimits().map((l) => ({ ...l, product_id: productId }));
    if (assetLimits.length > 0) {
      const { error: assetError } = await supabase.from('product_asset_limits').insert(assetLimits);
      if (assetError) {
        errorEl.textContent = 'Paket tersimpan, tapi gagal menyimpan batas asset: ' + friendlyError(assetError, 'produk');
        errorEl.classList.remove('hidden');
      }
    }

    // Item limits: satu baris per produk, hapus dulu baru insert kalau maks item diisi.
    await supabase.from('product_item_limits').delete().eq('product_id', productId);
    const maxItemsVal = document.getElementById('produk-max-items').value;
    if (maxItemsVal) {
      const { error: itemError } = await supabase.from('product_item_limits').insert({
        product_id: productId,
        max_items: Number(maxItemsVal),
        min_photos_per_item: Number(document.getElementById('produk-min-photos').value) || 1,
        max_photos_per_item: Number(document.getElementById('produk-max-photos').value) || 2,
      });
      if (itemError) {
        errorEl.textContent = 'Paket tersimpan, tapi gagal menyimpan batas item: ' + friendlyError(itemError, 'produk');
        errorEl.classList.remove('hidden');
      }
    }

    closeModal();
    loadProduk();
  });

  loadCategoriesIntoSelect();
  loadProduk();
}