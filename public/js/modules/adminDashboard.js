import { supabase } from '../lib/supabaseClient.js';
import { requireAdmin, initShell } from '../lib/adminGuard.js';
import { getStatusInfo } from '../shared/statusBadge.js';
import { esc } from '../shared/escapeHtml.js';

const el = (id) => document.getElementById(id);
const rupiah = (v) => 'Rp' + Number(v || 0).toLocaleString('id-ID');

const ACTIVE = ['WAITING_PAYMENT', 'DP_PAID', 'IN_PROGRESS', 'PREVIEW', 'REVISION', 'WAITING_SETTLEMENT', 'PAID'];

// Kartu ringkasan: tiap kartu = kumpulan status yang dibuka di Daftar Order.
const CARDS = [
  { label: 'Order Saya (Aktif)', statuses: ACTIVE, icon: 'inventory_2', tone: 'bg-primary-container text-on-primary-container' },
  { label: 'Perlu Dikerjakan', statuses: ['DP_PAID', 'PAID'], icon: 'assignment_late', tone: 'bg-secondary-container text-primary-container', hint: 'DP sudah masuk / sudah lunas, siap dikerjakan atau diserahkan' },
  { label: 'Sedang Dikerjakan', statuses: ['IN_PROGRESS'], icon: 'construction', tone: 'bg-surface-container text-primary' },
  { label: 'Menunggu Review', statuses: ['PREVIEW'], icon: 'visibility', tone: 'bg-surface-container text-primary', hint: 'Preview sudah dikirim, menunggu customer' },
  { label: 'Revisi', statuses: ['REVISION'], icon: 'edit_note', tone: 'bg-surface-container text-primary' },
  { label: 'Menunggu Pembayaran', statuses: ['WAITING_PAYMENT', 'WAITING_SETTLEMENT'], icon: 'payments', tone: 'bg-surface-container text-primary' },
  { label: 'Selesai', statuses: ['COMPLETED', 'COMPLETED_UNRESPONSIVE'], icon: 'task_alt', tone: 'bg-surface-container text-primary' },
];

// Urutan prioritas daftar "Perlu Tindakan": yang paling mendesak dulu.
const TODO_ORDER = ['DP_PAID', 'REVISION', 'PAID', 'WAITING_PAYMENT', 'WAITING_SETTLEMENT'];
const TODO_NOTE = {
  DP_PAID: 'DP terverifikasi, mulai pengerjaan',
  REVISION: 'Customer minta revisi',
  PAID: 'Sudah lunas, serahkan hasil',
  WAITING_PAYMENT: 'Menunggu DP, catat jika sudah transfer',
  WAITING_SETTLEMENT: 'Menunggu pelunasan',
};

(async () => {
  const auth = await requireAdmin();
  if (!auth) return;
  initShell(auth.admin);

  // RLS membatasi hasil ke order yang ditugaskan ke admin ini.
  const [{ data: orders, error }, { data: maint }] = await Promise.all([
    supabase.from('orders')
      .select('id, order_number, customer_name, business_name, order_status, total_amount, updated_at, products(name)')
      .order('updated_at', { ascending: false }).limit(500),
    supabase.from('maintenance_requests').select('id').in('status', ['MAINTENANCE_REQUESTED', 'UNDER_REVIEW']),
  ]);
  el('state-loading').classList.add('hidden');
  if (error) {
    el('state-error').textContent = 'Gagal memuat data. Pastikan patch RLS 06 dan 09 sudah dijalankan.';
    return el('state-error').classList.remove('hidden');
  }

  const count = (statuses) => orders.filter(o => statuses.includes(o.order_status)).length;
  const cards = CARDS.map(c => ({ ...c, n: count(c.statuses) }));
  const maintN = (maint || []).length;
  if (maintN > 0) cards.push({ label: 'Laporan Maintenance', n: maintN, icon: 'build', tone: 'bg-error/10 text-error', hint: 'Laporan masalah dari customer, buka detail order', statuses: ['COMPLETED'] });

  el('stat-cards').innerHTML = cards.map(c => `
    <a href="/admin/orders.html?status=${c.statuses.join(',')}" title="${esc(c.hint || '')}" class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col gap-space-sm">
      <span class="w-10 h-10 rounded-xl ${c.tone} flex items-center justify-center"><span class="material-symbols-outlined text-[22px]">${c.icon}</span></span>
      <span class="text-headline-lg text-primary font-bold leading-none">${c.n}</span>
      <span class="text-label-md text-on-surface-variant">${esc(c.label)}</span>
    </a>`).join('');

  const todo = orders
    .filter(o => TODO_ORDER.includes(o.order_status))
    .sort((a, b) => TODO_ORDER.indexOf(a.order_status) - TODO_ORDER.indexOf(b.order_status))
    .slice(0, 10);
  el('todo-empty').classList.toggle('hidden', todo.length > 0);
  el('todo-list').innerHTML = todo.map(o => {
    const st = getStatusInfo(o.order_status);
    return `<a href="/admin/order-detail.html?id=${encodeURIComponent(o.id)}" class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
      <div class="min-w-0">
        <div class="flex items-center gap-space-sm flex-wrap">
          <span class="text-label-md font-bold text-primary">${esc(o.order_number)}</span>
          <span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${st.badgeClass}">${esc(st.label)}</span>
        </div>
        <p class="text-body-md mt-1 truncate">${esc(o.customer_name)} · ${esc(o.business_name)}</p>
        <p class="text-caption text-on-surface-variant">${esc(TODO_NOTE[o.order_status])}</p>
      </div>
      <p class="text-label-md font-bold text-primary shrink-0">${rupiah(o.total_amount)}</p>
    </a>`;
  }).join('');
  el('dash').classList.remove('hidden');
})();
