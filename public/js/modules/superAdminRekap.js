import { supabase } from '../lib/supabaseClient.js';
import { requireSuperAdmin, initShell } from '../lib/superAdminGuard.js';
import { formatRupiah } from '../shared/formatCurrency.js';
import { getStatusInfo } from '../shared/statusBadge.js';

const ORDER_STATUSES = [
  'WAITING_PAYMENT', 'DP_PAID', 'IN_PROGRESS', 'PREVIEW', 'REVISION',
  'WAITING_SETTLEMENT', 'PAID', 'COMPLETED', 'COMPLETED_UNRESPONSIVE', 'CANCELLED',
];
const SELESAI_STATUSES = ['COMPLETED', 'COMPLETED_UNRESPONSIVE'];
const BATAL_STATUSES = ['CANCELLED'];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadFilterOptions() {
  const [{ data: products }, { data: admins }] = await Promise.all([
    supabase.from('products').select('id, name').order('sort_order'),
    supabase.from('admins').select('id, full_name').eq('is_active', true).order('full_name'),
  ]);

  const produkSelect = document.getElementById('filter-produk');
  produkSelect.innerHTML = '<option value="">Semua Paket</option>'
    + (products || []).map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

  const adminSelect = document.getElementById('filter-admin');
  adminSelect.innerHTML = '<option value="">Semua Admin</option>'
    + (admins || []).map((a) => `<option value="${a.id}">${a.full_name}</option>`).join('');

  const statusSelect = document.getElementById('filter-status');
  statusSelect.innerHTML = '<option value="">Semua Status</option>'
    + ORDER_STATUSES.map((s) => `<option value="${s}">${getStatusInfo(s).label}</option>`).join('');
}

function getFilters() {
  return {
    dari: document.getElementById('filter-dari').value,
    sampai: document.getElementById('filter-sampai').value,
    produk: document.getElementById('filter-produk').value,
    admin: document.getElementById('filter-admin').value,
    status: document.getElementById('filter-status').value,
  };
}

async function loadRekap() {
  const loadingEl = document.getElementById('state-loading');
  const emptyEl = document.getElementById('state-empty');
  const errorEl = document.getElementById('state-error');
  const tableWrap = document.getElementById('rekap-table-wrap');

  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  tableWrap.classList.add('hidden');

  const f = getFilters();

  let query = supabase
    .from('orders')
    .select('id, order_number, customer_name, business_name, order_status, total_amount, paid_amount, created_at, published_at, product_id, assigned_admin_id, products(name), admins(full_name)')
    .order('created_at', { ascending: false });

  if (f.dari) query = query.gte('created_at', f.dari);
  if (f.sampai) query = query.lte('created_at', f.sampai + 'T23:59:59');
  if (f.produk) query = query.eq('product_id', f.produk);
  if (f.admin) query = query.eq('assigned_admin_id', f.admin);
  if (f.status) query = query.eq('order_status', f.status);

  const { data: orders, error } = await query;

  loadingEl.classList.add('hidden');

  if (error) {
    errorEl.textContent = error.message || 'Gagal memuat data rekap.';
    errorEl.classList.remove('hidden');
    return;
  }

  renderSummary(orders || []);
  await loadTipTotal(f);

  if (!orders || orders.length === 0) {
    emptyEl.classList.remove('hidden');
    document.getElementById('rekap-tbody').innerHTML = '';
    return;
  }

  document.getElementById('rekap-tbody').innerHTML = orders.map(renderRow).join('');
  tableWrap.classList.remove('hidden');
}

function renderSummary(orders) {
  const total = orders.length;
  const selesai = orders.filter((o) => SELESAI_STATUSES.includes(o.order_status)).length;
  const batal = orders.filter((o) => BATAL_STATUSES.includes(o.order_status)).length;
  const berjalan = total - selesai - batal;
  const pendapatan = orders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-berjalan').textContent = berjalan;
  document.getElementById('stat-selesai').textContent = selesai;
  document.getElementById('stat-batal').textContent = batal;
  document.getElementById('stat-pendapatan').textContent = formatRupiah(pendapatan);
}

async function loadTipTotal(f) {
  // Tip dicatat terpisah di payments (payment_type = 'tip', status = 'verified').
  // Difilter berdasarkan tanggal payments dibuat supaya konsisten dengan filter periode di atas.
  let query = supabase.from('payments').select('amount, created_at').eq('payment_type', 'tip').eq('status', 'verified');
  if (f.dari) query = query.gte('created_at', f.dari);
  if (f.sampai) query = query.lte('created_at', f.sampai + 'T23:59:59');

  const { data } = await query;
  const totalTip = (data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  document.getElementById('stat-tip').textContent = formatRupiah(totalTip);
}

function renderRow(o) {
  const info = getStatusInfo(o.order_status);
  return `
    <tr class="border-b border-outline-variant/20 last:border-0">
      <td class="px-space-md py-space-sm font-semibold text-on-surface">${o.order_number}</td>
      <td class="px-space-md py-space-sm text-on-surface-variant">${o.customer_name}<br><span class="text-caption">${o.business_name}</span></td>
      <td class="px-space-md py-space-sm text-on-surface-variant">${o.products?.name || '—'}</td>
      <td class="px-space-md py-space-sm text-on-surface-variant">${o.admins?.full_name || '—'}</td>
      <td class="px-space-md py-space-sm">
        <span class="text-caption px-space-sm py-1 rounded-full ${info.badgeClass}">${info.label}</span>
      </td>
      <td class="px-space-md py-space-sm text-right text-on-surface-variant">${formatRupiah(o.total_amount)}</td>
      <td class="px-space-md py-space-sm text-right text-on-surface-variant">${formatRupiah(o.paid_amount)}</td>
      <td class="px-space-md py-space-sm text-on-surface-variant">${formatDate(o.created_at)}</td>
      <td class="px-space-md py-space-sm text-on-surface-variant">${formatDate(o.published_at)}</td>
    </tr>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const auth = await requireSuperAdmin();
  if (!auth) return;
  initShell(auth.admin);

  await loadFilterOptions();

  document.getElementById('filter-form').addEventListener('submit', (e) => {
    e.preventDefault();
    loadRekap();
  });

  document.getElementById('btn-reset-filter').addEventListener('click', () => {
    document.getElementById('filter-form').reset();
    loadRekap();
  });

  loadRekap();
});
