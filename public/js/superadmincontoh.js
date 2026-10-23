import { requireSuperAdmin, initShell } from '../lib/superAdminGuard.js';
import { supabase } from '../lib/supabaseClient.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (t) => String(t).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const hostOf = (u) => { try { return new URL(u).host; } catch { return u; } };

let rows = [];

function flash(text, ok = true) {
  const f = $('flash');
  f.textContent = text;
  f.className = `rounded-xl px-space-md py-3 text-body-md ${ok ? 'bg-secondary-container text-primary-container' : 'bg-error/10 text-error'}`;
}

function render() {
  $('state-empty').classList.toggle('hidden', rows.length > 0);
  $('contoh-table-wrap').classList.toggle('hidden', rows.length === 0);
  $('contoh-tbody').innerHTML = rows.map((r) => `<tr>
    <td class="px-space-md py-space-sm"><span class="font-semibold">${esc(r.title)}</span><br><span class="text-caption text-on-surface-variant">${esc(r.subtitle || '')}</span></td>
    <td class="px-space-md py-space-sm"><a class="text-primary underline underline-offset-2 break-all" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(hostOf(r.url))}</a></td>
    <td class="px-space-md py-space-sm"><span class="inline-flex gap-1 align-middle"><i style="display:inline-block;width:22px;height:22px;border-radius:7px;background:${esc(r.bg_color1)};border:1px solid rgba(0,0,0,.15)"></i><i style="display:inline-block;width:22px;height:22px;border-radius:7px;background:${esc(r.bg_color2)};border:1px solid rgba(0,0,0,.15)"></i></span></td>
    <td class="px-space-md py-space-sm"><span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${r.is_active ? 'bg-secondary-container text-primary-container' : 'bg-surface-container text-on-surface-variant'}">${r.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
    <td class="px-space-md py-space-sm"><div class="flex flex-wrap gap-space-xs">
      <button data-act="edit" data-id="${r.id}" type="button">Edit</button>
      <button data-act="toggle" data-id="${r.id}" type="button">${r.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
      <button data-act="delete" data-id="${r.id}" type="button">Hapus</button>
    </div></td></tr>`).join('');
}

async function load() {
  const { data, error } = await supabase.from('example_sites').select('*').order('sort_order').order('created_at');
  $('state-loading').classList.add('hidden');
  if (error) {
    $('state-error').textContent = /example_sites/.test(error.message) && /relation|does not exist|schema cache/.test(error.message)
      ? 'Tabel example_sites belum dibuat. Jalankan file supabase/example_sites.sql di Supabase SQL Editor.'
      : `Gagal memuat contoh: ${error.message}`;
    $('state-error').classList.remove('hidden');
    return;
  }
  $('state-error').classList.add('hidden');
  rows = data || [];
  render();
}

function openModal(r) {
  $('modal-contoh-title').textContent = r ? 'Edit Contoh' : 'Tambah Contoh';
  $('contoh-id').value = r?.id || '';
  $('contoh-title').value = r?.title || '';
  $('contoh-subtitle').value = r?.subtitle || '';
  $('contoh-url').value = r?.url || '';
  $('contoh-c1').value = r?.bg_color1 || '#86c722';
  $('contoh-c2').value = r?.bg_color2 || '#14204f';
  $('contoh-sort').value = r?.sort_order ?? (rows.length ? Math.max(...rows.map((x) => x.sort_order || 0)) + 1 : 1);
  $('contoh-active').checked = r ? r.is_active : true;
  $('contoh-form-error').classList.add('hidden');
  $('modal-contoh').classList.remove('hidden');
}
const closeModal = () => $('modal-contoh').classList.add('hidden');

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const r = rows.find((x) => x.id === b.dataset.id);
  if (!r) return;
  if (b.dataset.act === 'edit') return openModal(r);
  if (b.dataset.act === 'toggle') {
    const { error } = await supabase.from('example_sites').update({ is_active: !r.is_active, updated_at: new Date().toISOString() }).eq('id', r.id);
    if (error) return flash(error.message, false);
    flash(r.is_active ? 'Contoh disembunyikan dari beranda.' : 'Contoh ditampilkan di beranda.');
    return load();
  }
  if (b.dataset.act === 'delete') {
    if (!confirm(`Hapus contoh "${r.title}"? Kalau hanya ingin menyembunyikan, pakai Nonaktifkan.`)) return;
    const { error } = await supabase.from('example_sites').delete().eq('id', r.id);
    if (error) return flash(error.message, false);
    flash('Contoh dihapus.');
    return load();
  }
});

$('btn-add-contoh').addEventListener('click', () => openModal(null));
$('btn-cancel-contoh').addEventListener('click', closeModal);
$('modal-contoh').addEventListener('click', (e) => { if (e.target === $('modal-contoh')) closeModal(); });

$('form-contoh').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('contoh-form-error');
  err.classList.add('hidden');
  const title = $('contoh-title').value.trim();
  let url = $('contoh-url').value.trim();
  if (!/^https?:\/\//i.test(url)) { err.textContent = 'Alamat situs harus diawali https://'; return err.classList.remove('hidden'); }
  // buang parameter pelacak (utm_*, fbclid, dll) supaya alamat bersih
  try {
    const u = new URL(url);
    [...u.searchParams.keys()].forEach((k) => { if (/^(utm_|fbclid|gclid|igshid|hl$)/i.test(k)) u.searchParams.delete(k); });
    url = u.toString();
  } catch { err.textContent = 'Alamat situs tidak valid.'; return err.classList.remove('hidden'); }

  const id = $('contoh-id').value;
  const existing = rows.find((x) => x.id === id);
  let slug = existing?.slug || slugify(title) || 'contoh';
  if (!existing) {
    let n = 2; const base = slug;
    while (rows.some((x) => x.slug === slug)) slug = `${base}-${n++}`;
  }
  const payload = {
    slug, title,
    subtitle: $('contoh-subtitle').value.trim() || null,
    url,
    bg_color1: $('contoh-c1').value,
    bg_color2: $('contoh-c2').value,
    sort_order: Number($('contoh-sort').value) || 0,
    is_active: $('contoh-active').checked,
    updated_at: new Date().toISOString(),
  };
  $('btn-save-contoh').disabled = true;
  const { error } = id
    ? await supabase.from('example_sites').update(payload).eq('id', id)
    : await supabase.from('example_sites').insert(payload);
  $('btn-save-contoh').disabled = false;
  if (error) { err.textContent = error.message; return err.classList.remove('hidden'); }
  closeModal();
  flash(id ? 'Contoh diperbarui.' : 'Contoh ditambahkan. Sudah tampil di beranda.');
  load();
});

(async () => {
  const auth = await requireSuperAdmin();
  if (!auth) return;
  initShell(auth.admin);
  load();
})();