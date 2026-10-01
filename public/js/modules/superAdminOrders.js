import { requireSuperAdmin, initShell } from '../lib/superAdminGuard.js';
import { supabase } from '../lib/supabaseClient.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../config/env.js';
import { getStatusInfo } from '../shared/statusBadge.js';
import { esc } from '../shared/escapeHtml.js';

const $ = (id) => document.getElementById(id);
const FINAL = ['CANCELLED', 'COMPLETED', 'COMPLETED_UNRESPONSIVE'];
let admins = [];
let orders = [];
let searchTimer;

async function callFn(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Permintaan gagal (${res.status}).`);
  return data;
}

function flash(text, ok = true) {
  const f = $('flash');
  f.textContent = text;
  f.className = `rounded-xl px-space-md py-3 text-body-md ${ok ? 'bg-secondary-container text-primary-container' : 'bg-error/10 text-error'}`;
}

function adminOptions(selectedId) {
  const opts = admins.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.full_name)}</option>`).join('');
  return (selectedId ? '' : '<option value="" selected disabled>Pilih admin...</option>') + opts;
}

function render() {
  const tbody = $('tbody');
  $('state-loading').classList.add('hidden');
  $('state-empty').classList.toggle('hidden', orders.length > 0);
  $('table-wrap').classList.toggle('hidden', orders.length === 0);
  tbody.innerHTML = orders.map(o => {
    const st = getStatusInfo(o.order_status);
    const locked = FINAL.includes(o.order_status);
    const current = o.admins?.full_name;
    const cell = locked
      ? `<span class="text-on-surface-variant">${current ? esc(current) : '-'}</span>`
      : `<select data-order="${o.id}" data-prev="${o.assigned_admin_id || ''}" class="assign-select border border-outline-variant rounded-xl px-space-sm py-2 text-body-md bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary-container">${adminOptions(o.assigned_admin_id)}</select>`;
    return `<tr class="border-b border-outline-variant/20">
      <td class="px-space-md py-space-sm"><span class="font-bold text-primary">${esc(o.order_number)}</span><br><span class="text-caption text-on-surface-variant">${new Date(o.created_at).toLocaleDateString('id-ID')}</span></td>
      <td class="px-space-md py-space-sm">${esc(o.customer_name)}<br><span class="text-caption text-on-surface-variant">${esc(o.business_name)}</span></td>
      <td class="px-space-md py-space-sm"><span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${st.badgeClass}">${esc(st.label)}</span></td>
      <td class="px-space-md py-space-sm">${cell}</td></tr>`;
  }).join('');
}

async function load() {
  $('state-loading').classList.remove('hidden');
  $('state-error').classList.add('hidden');
  let q = supabase.from('orders')
    .select('id, order_number, customer_name, business_name, order_status, assigned_admin_id, created_at, admins(full_name)')
    .order('created_at', { ascending: false }).limit(200);
  const fa = $('filter-admin').value;
  if (fa === 'none') q = q.is('assigned_admin_id', null);
  else if (fa) q = q.eq('assigned_admin_id', fa);
  const term = $('search').value.trim().replace(/[,()%*]/g, ' ');
  if (term) q = q.or(`customer_name.ilike.%${term}%,business_name.ilike.%${term}%,order_number.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) {
    $('state-loading').classList.add('hidden');
    $('state-error').textContent = error.message || 'Gagal memuat order.';
    return $('state-error').classList.remove('hidden');
  }
  orders = data;
  render();
}

(async () => {
  const auth = await requireSuperAdmin();
  if (!auth) return;
  initShell(auth.admin);

  const { data: list } = await supabase.from('admins').select('id, full_name, phone')
    .eq('role', 'admin').eq('is_active', true).not('phone', 'is', null).order('full_name');
  admins = list || [];
  $('filter-admin').insertAdjacentHTML('beforeend', admins.map(a => `<option value="${a.id}">${esc(a.full_name)}</option>`).join(''));

  $('tbody').addEventListener('change', async (e) => {
    const sel = e.target.closest('.assign-select');
    if (!sel) return;
    sel.disabled = true;
    try {
      await callFn('reassign-order', { order_id: sel.dataset.order, admin_id: sel.value });
      flash('Order dipindahkan.');
      await load();
    } catch (err) {
      flash(err.message, false);
      sel.value = sel.dataset.prev;
      sel.disabled = false;
    }
  });
  $('filter-admin').addEventListener('change', load);
  $('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 350); });
  await load();
})();
