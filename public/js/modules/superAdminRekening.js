import { requireSuperAdmin, initShell } from '../lib/superAdminGuard.js';
import { supabase } from '../lib/supabaseClient.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const btn = 'whitespace-nowrap text-label-md px-space-sm py-1.5 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high';

let rows = [];

function flash(text, ok = true) {
  const f = $('flash');
  f.textContent = text;
  f.className = `rounded-xl px-space-md py-3 text-body-md ${ok ? 'bg-secondary-container text-primary-container' : 'bg-error/10 text-error'}`;
}

function render() {
  $('state-empty').classList.toggle('hidden', rows.length > 0);
  $('rek-table-wrap').classList.toggle('hidden', rows.length === 0);
  $('rek-tbody').innerHTML = rows.map((r) => `<tr class="border-b border-outline-variant/20">
    <td class="px-space-md py-space-sm font-semibold">${esc(r.bank_name)}</td>
    <td class="px-space-md py-space-sm font-mono">${esc(r.account_number)}</td>
    <td class="px-space-md py-space-sm">${esc(r.account_holder)}</td>
    <td class="px-space-md py-space-sm"><span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${r.is_active ? 'bg-secondary-container text-primary-container' : 'bg-surface-container text-on-surface-variant'}">${r.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
    <td class="px-space-md py-space-sm"><div class="flex gap-space-xs">
      <button class="${btn}" data-act="edit" data-id="${r.id}" type="button">Edit</button>
      <button class="${btn}" data-act="toggle" data-id="${r.id}" type="button">${r.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
      <button class="${btn}" data-act="delete" data-id="${r.id}" type="button">Hapus</button>
    </div></td></tr>`).join('');
}

async function load() {
  const { data, error } = await supabase.from('payment_accounts').select('*').order('sort_order').order('created_at');
  $('state-loading').classList.add('hidden');
  if (error) { $('state-error').textContent = `Gagal memuat rekening: ${error.message}`; $('state-error').classList.remove('hidden'); return; }
  rows = data || [];
  render();
}

function openModal(r) {
  $('modal-rek-title').textContent = r ? 'Edit Rekening' : 'Tambah Rekening';
  $('rek-id').value = r?.id || '';
  $('rek-bank').value = r?.bank_name || '';
  $('rek-number').value = r?.account_number || '';
  $('rek-holder').value = r?.account_holder || '';
  $('rek-sort').value = r?.sort_order ?? 0;
  $('rek-active').checked = r ? r.is_active : true;
  $('rek-form-error').classList.add('hidden');
  $('modal-rek').classList.remove('hidden');
}
const closeModal = () => $('modal-rek').classList.add('hidden');

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const r = rows.find((x) => x.id === b.dataset.id);
  if (!r) return;
  if (b.dataset.act === 'edit') return openModal(r);
  if (b.dataset.act === 'toggle') {
    const { error } = await supabase.from('payment_accounts').update({ is_active: !r.is_active, updated_at: new Date().toISOString() }).eq('id', r.id);
    if (error) return flash(error.message, false);
    flash(r.is_active ? 'Rekening dinonaktifkan. Customer tidak lagi melihatnya.' : 'Rekening diaktifkan.');
    return load();
  }
  if (b.dataset.act === 'delete') {
    if (!confirm(`Hapus rekening ${r.bank_name} ${r.account_number}? Kalau hanya ingin menyembunyikan, pakai Nonaktifkan.`)) return;
    const { error } = await supabase.from('payment_accounts').delete().eq('id', r.id);
    if (error) return flash(error.message, false);
    flash('Rekening dihapus.');
    return load();
  }
});

$('btn-add-rek').addEventListener('click', () => openModal(null));
$('btn-cancel-rek').addEventListener('click', closeModal);

$('form-rek').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('rek-form-error');
  err.classList.add('hidden');
  const number = $('rek-number').value.replace(/[\s-]/g, '');
  if (!/^\d{5,30}$/.test(number)) {
    err.textContent = 'Nomor harus berupa angka (5–30 digit).';
    return err.classList.remove('hidden');
  }
  const payload = {
    bank_name: $('rek-bank').value.trim(),
    account_number: number,
    account_holder: $('rek-holder').value.trim(),
    sort_order: Number($('rek-sort').value) || 0,
    is_active: $('rek-active').checked,
    updated_at: new Date().toISOString(),
  };
  const id = $('rek-id').value;
  $('btn-save-rek').disabled = true;
  const { error } = id
    ? await supabase.from('payment_accounts').update(payload).eq('id', id)
    : await supabase.from('payment_accounts').insert(payload);
  $('btn-save-rek').disabled = false;
  if (error) { err.textContent = error.message; return err.classList.remove('hidden'); }
  closeModal();
  flash(id ? 'Rekening diperbarui.' : 'Rekening ditambahkan.');
  load();
});

(async () => {
  const auth = await requireSuperAdmin();
  if (!auth) return;
  initShell(auth.admin);
  load();
})();
