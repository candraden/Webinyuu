import { requireSuperAdmin, initShell } from '../lib/superAdminGuard.js';
import { supabase } from '../lib/supabaseClient.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../config/env.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Dipanggil dengan JWT super admin (bukan anon key) supaya manage-admins bisa memverifikasi role.
async function callFn(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || `Permintaan gagal (${res.status}).`); e.code = data.code; throw e; }
  return data;
}
const ROLE = { admin: 'Admin', super_admin: 'Super Admin' };
const btn = 'whitespace-nowrap text-label-md px-space-sm py-1.5 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high';
let admins = [];
let me = null;
let mode = 'create';
let editing = null;

function flash(text, ok = true) {
  const f = $('flash');
  f.textContent = text;
  f.className = `rounded-xl px-space-md py-3 text-body-md ${ok ? 'bg-secondary-container text-primary-container' : 'bg-error/10 text-error'}`;
}

function render() {
  $('admin-tbody').innerHTML = admins.map(a => {
    const self = a.id === me.id;
    return `<tr class="border-b border-outline-variant/20">
      <td class="px-space-md py-space-sm font-semibold">${esc(a.full_name)}${self ? ' <span class="text-caption text-on-surface-variant">(kamu)</span>' : ''}</td>
      <td class="px-space-md py-space-sm">${esc(a.email)}</td>
      <td class="px-space-md py-space-sm">${a.phone ? esc(a.phone) : '<span class="text-caption text-error">Belum diisi</span>'}</td>
      <td class="px-space-md py-space-sm">${esc(ROLE[a.role])}</td>
      <td class="px-space-md py-space-sm"><span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${a.is_active ? 'bg-secondary-container text-primary-container' : 'bg-surface-container text-on-surface-variant'}">${a.is_active ? 'Aktif' : 'Nonaktif'}</span>${a.active_orders > 0 ? ` <span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${a.is_active ? 'bg-surface-container text-primary' : 'bg-error/10 text-error'}" title="Order aktif yang ditangani">${a.active_orders} order aktif</span>` : ''}${!a.is_active && a.active_orders > 0 ? '<br><span class="text-caption text-error">Pindahkan order-nya!</span>' : ''}</td>
      <td class="px-space-md py-space-sm"><div class="flex justify-start gap-space-xs">
        <button class="${btn}" data-act="edit" data-id="${a.id}" type="button">Edit</button>
        <button class="${btn}" data-act="reset" data-id="${a.id}" type="button">Reset Password</button>
        ${self ? '' : `<button class="${btn}" data-act="toggle" data-id="${a.id}" type="button">${a.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>`}
      </div></td></tr>`;
  }).join('');
}

async function load() {
  try {
    const { admins: list } = await callFn('manage-admins', { action: 'list' });
    admins = list;
    $('state-loading').classList.add('hidden');
    $('admin-table-wrap').classList.remove('hidden');
    render();
  } catch (e) {
    $('state-loading').classList.add('hidden');
    $('state-error').textContent = e.message;
    $('state-error').classList.remove('hidden');
  }
}

function setPasswordVisible(show) {
  const btn = $('btn-toggle-password');
  $('admin-password').type = show ? 'text' : 'password';
  btn.setAttribute('aria-pressed', String(show));
  btn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
  btn.firstElementChild.textContent = show ? 'visibility_off' : 'visibility';
}

function openModal(m, admin = null) {
  mode = m; editing = admin;
  $('form-admin').reset();
  setPasswordVisible(false);
  $('admin-form-error').classList.add('hidden');
  $('modal-admin-title').textContent = { create: 'Tambah Admin', edit: 'Edit Admin', reset: `Reset Password — ${admin?.full_name}` }[m];
  document.querySelectorAll('#form-admin [data-mode]').forEach(el => {
    const on = el.dataset.mode.split(' ').includes(m);
    el.classList.toggle('hidden', !on);
    el.querySelectorAll('input').forEach(i => { i.required = on && ['admin-name', 'admin-email', 'admin-password'].includes(i.id); });
  });
  if (m === 'edit') {
    $('admin-name').value = admin.full_name; $('admin-email').value = admin.email === '-' ? '' : admin.email;
    $('admin-phone').value = admin.phone || ''; $('admin-role').value = admin.role;
  }
  syncPhoneRequired();
  $('modal-admin').classList.remove('hidden');
}
// Nomor HP wajib hanya untuk role Admin (Super Admin tidak menangani order).
function syncPhoneRequired() {
  const need = $('admin-role').value === 'admin';
  $('admin-phone').required = need && mode !== 'reset';
  $('admin-phone-req').classList.toggle('hidden', !need);
}
const closeModal = () => $('modal-admin').classList.add('hidden');

async function submitForm(e) {
  e.preventDefault();
  const saveBtn = $('btn-save-admin');
  saveBtn.disabled = true;
  try {
    if (mode === 'create') await callFn('manage-admins', { action: 'create', full_name: $('admin-name').value.trim(), email: $('admin-email').value.trim(), phone: $('admin-phone').value.trim(), password: $('admin-password').value, role: $('admin-role').value });
    if (mode === 'edit') {
      const payload = { action: 'update', admin_id: editing.id, full_name: $('admin-name').value.trim(), email: $('admin-email').value.trim(), phone: $('admin-phone').value.trim(), role: $('admin-role').value };
      try { await callFn('manage-admins', payload); }
      catch (err) {
        if (err.code !== 'HAS_ACTIVE_ORDERS' || !confirm(`${err.message}\n\nTetap lanjutkan?`)) throw err;
        await callFn('manage-admins', { ...payload, force: true });
      }
    }
    if (mode === 'reset') await callFn('manage-admins', { action: 'reset_password', admin_id: editing.id, password: $('admin-password').value });
    closeModal();
    flash({ create: 'Admin dibuat.', edit: 'Perubahan disimpan.', reset: 'Password direset.' }[mode]);
    if (mode !== 'reset') await load();
  } catch (err) {
    $('admin-form-error').textContent = err.message;
    $('admin-form-error').classList.remove('hidden');
  }
  saveBtn.disabled = false;
}

(async () => {
  $('btn-add-admin').addEventListener('click', () => openModal('create'));
  $('btn-cancel-admin').addEventListener('click', closeModal);
  $('btn-toggle-password').addEventListener('click', () => setPasswordVisible($('admin-password').type === 'password'));
  $('modal-admin').addEventListener('click', (e) => { if (e.target === $('modal-admin')) closeModal(); });
  $('admin-role').addEventListener('change', syncPhoneRequired);
  $('form-admin').addEventListener('submit', submitForm);
  const auth = await requireSuperAdmin();
  if (!auth) return;
  initShell(auth.admin);
  me = auth.admin;
  $('admin-tbody').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = admins.find(x => x.id === b.dataset.id);
    if (b.dataset.act === 'edit') return openModal('edit', a);
    if (b.dataset.act === 'reset') return openModal('reset', a);
    if (!confirm(`${a.is_active ? 'Nonaktifkan' : 'Aktifkan'} ${a.full_name}?`)) return;
    const payload = { action: 'update', admin_id: a.id, is_active: !a.is_active };
    try {
      try { await callFn('manage-admins', payload); }
      catch (err) {
        if (err.code !== 'HAS_ACTIVE_ORDERS') throw err;
        if (!confirm(`${err.message}\n\nTetap nonaktifkan? Order-nya tidak akan ada yang menangani sampai dipindahkan.`)) return;
        await callFn('manage-admins', { ...payload, force: true });
      }
      flash('Status diperbarui.'); await load();
    } catch (err) { flash(err.message, false); }
  });
  await load();
})();