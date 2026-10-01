import { supabase } from '../lib/supabaseClient.js';
import { requireAdmin, initShell } from '../lib/adminGuard.js';
import { getStatusInfo, getPaymentStatusInfo } from '../shared/statusBadge.js';
import { esc } from '../shared/escapeHtml.js';

const STATUSES = ['WAITING_PAYMENT', 'DP_PAID', 'IN_PROGRESS', 'PREVIEW', 'REVISION', 'WAITING_SETTLEMENT', 'PAID', 'COMPLETED', 'COMPLETED_UNRESPONSIVE', 'CANCELLED'];
let activeStatus = new URLSearchParams(location.search).get('status') || ''; // boleh beberapa status dipisah koma
let searchTimer;

const rupiah = (v) => 'Rp' + Number(v || 0).toLocaleString('id-ID');
const el = (id) => document.getElementById(id);

function renderChips() {
  const chips = [{ key: '', label: 'Semua' }, ...STATUSES.map(s => ({ key: s, label: getStatusInfo(s).label }))];
  el('status-chips').innerHTML = chips.map(c => {
    const on = c.key === activeStatus;
    return `<button type="button" data-status="${c.key}" class="px-space-md py-1.5 rounded-full text-label-md ${on ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}">${esc(c.label)}</button>`;
  }).join('');
}

async function loadOrders() {
  el('state-loading').classList.remove('hidden');
  el('state-empty').classList.add('hidden');
  el('state-error').classList.add('hidden');
  el('orders-list').innerHTML = '';

  let q = supabase.from('orders')
    .select('id, order_number, customer_name, business_name, whatsapp_number, order_status, payment_status, total_amount, paid_amount, created_at, products(name)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (activeStatus) q = q.in('order_status', activeStatus.split(',').filter(s => STATUSES.includes(s)));

  // Buang karakter yang bisa merusak sintaks filter PostgREST
  const term = el('search').value.trim().replace(/[,()%*]/g, ' ');
  if (term) q = q.or(`customer_name.ilike.%${term}%,business_name.ilike.%${term}%,whatsapp_number.ilike.%${term}%,order_number.ilike.%${term}%`);

  const { data, error } = await q;
  el('state-loading').classList.add('hidden');
  if (error) {
    el('state-error').textContent = 'Gagal memuat order. Pastikan patch RLS 06 sudah dijalankan.';
    return el('state-error').classList.remove('hidden');
  }
  if (!data.length) return el('state-empty').classList.remove('hidden');

  el('orders-list').innerHTML = data.map(o => {
    const st = getStatusInfo(o.order_status), ps = getPaymentStatusInfo(o.payment_status);
    return `<a href="/admin/order-detail.html?id=${encodeURIComponent(o.id)}" class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
      <div class="min-w-0">
        <div class="flex items-center gap-space-sm flex-wrap">
          <span class="text-label-md font-bold text-primary">${esc(o.order_number)}</span>
          <span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${st.badgeClass}">${esc(st.label)}</span>
          <span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${ps.badgeClass}">${esc(ps.label)}</span>
        </div>
        <p class="text-body-md mt-1 truncate">${esc(o.customer_name)} · ${esc(o.business_name)}</p>
        <p class="text-caption text-on-surface-variant">${esc(o.products?.name || '-')} · ${esc(o.whatsapp_number)} · ${new Date(o.created_at).toLocaleDateString('id-ID')}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="text-label-md font-bold text-primary">${rupiah(o.total_amount)}</p>
        <p class="text-caption text-on-surface-variant">Terbayar ${rupiah(o.paid_amount)}</p>
      </div>
    </a>`;
  }).join('');
}

(async () => {
  const auth = await requireAdmin();
  if (!auth) return;
  initShell(auth.admin);
  renderChips();
  el('status-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-status]');
    if (!b) return;
    activeStatus = b.dataset.status; renderChips(); loadOrders();
  });
  el('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadOrders, 350); });
  loadOrders();
})();
