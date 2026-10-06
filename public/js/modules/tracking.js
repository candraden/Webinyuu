import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../config/env.js';
import { formatRupiah } from '../shared/formatCurrency.js';
import { getStatusInfo, getPaymentStatusInfo } from '../shared/statusBadge.js';

const GET_ORDER_URL = `${SUPABASE_URL}/functions/v1/get-order-by-token`;

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  'apikey': SUPABASE_PUBLISHABLE_KEY,
};

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('token');
  if (fromQuery) {
    sessionStorage.setItem('tracking_token', fromQuery);
    return fromQuery;
  }
  // fallback: query string hilang (misal ke-strip redirect "clean URL"
  // dari dev server) -> pakai token terakhir yang tersimpan di sesi ini.
  return sessionStorage.getItem('tracking_token');
}

function showState(id) {
  ['state-loading', 'state-invalid', 'state-notfound', 'state-content'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

function renderRevision(order) {
  const box = document.getElementById('revision-box');
  if (!order.revision_limit) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  document.getElementById('revision-text').textContent =
    `${order.revision_used} dari ${order.revision_limit} kali dipakai`;
}

const MAINT_LABEL = {
  MAINTENANCE_REQUESTED: 'Laporan diterima',
  UNDER_REVIEW: 'Sedang diperiksa admin',
  APPROVED: 'Disetujui, antre diperbaiki',
  IN_PROGRESS: 'Sedang diperbaiki',
  RESOLVED: 'Selesai diperbaiki',
  ADDITIONAL_REQUEST: 'Dihitung sebagai permintaan tambahan (berbayar)',
};
let currentToken = null;

function renderMaintenance(order) {
  const box = document.getElementById('maintenance-box');
  const m = order.maintenance;
  if (!m) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');

  const until = new Date(m.active_until).toLocaleDateString('id-ID', { dateStyle: 'long' });
  document.getElementById('maint-period').textContent = m.is_active
    ? `Perbaikan bug gratis sampai ${until}.`
    : `Masa garansi 7 hari berakhir ${until}. Website yang mati total karena kesalahan kami tetap kami perbaiki gratis; perbaikan kecil di luar masa garansi dikenakan Rp5.000 per perbaikan.`;

  document.getElementById('maint-list').innerHTML = m.requests.map(r => `
    <li class="bg-surface-container-low rounded-xl px-space-md py-space-sm">
      <p class="text-body-md">${escHtml(r.description)}</p>
      <p class="text-caption text-on-surface-variant">${new Date(r.reported_at).toLocaleDateString('id-ID')} · ${escHtml(MAINT_LABEL[r.status] || r.status)}</p>
    </li>`).join('');
}

const escHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function submitMaintenance() {
  const text = document.getElementById('maint-text');
  const err = document.getElementById('maint-error');
  const btn = document.getElementById('maint-submit');
  err.classList.add('hidden');
  btn.disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-maintenance-request`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ tracking_token: currentToken, description: text.value }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Gagal mengirim laporan.');
    text.value = '';
    await loadOrder(currentToken);
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

function renderContact(order) {
  const box = document.getElementById('contact-box');
  if (!order.admin_phone || order.order_status === 'CANCELLED') {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  document.getElementById('admin-name').textContent = order.admin_name || 'Admin Webinyuu';
  const msg = encodeURIComponent(`Halo ${order.admin_name || 'Admin'}, saya ingin menanyakan order ${order.order_number}.`);
  document.getElementById('admin-wa-link').href = `https://wa.me/${order.admin_phone}?text=${msg}`;

  const dl = document.getElementById('deadline-text');
  if (order.order_status === 'WAITING_PAYMENT' && order.payment_deadline) {
    const d = new Date(order.payment_deadline).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    dl.textContent = `Bayar DP sebelum ${d}. Jika belum dibayar, pesanan otomatis dibatalkan.`;
    dl.classList.remove('hidden');
  } else {
    dl.classList.add('hidden');
  }
}

function renderPreview(order) {
  const box = document.getElementById('preview-box');
  if (!box) return;
  if (order.order_status !== 'PREVIEW' || !order.preview_url) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  document.getElementById('preview-link').href = order.preview_url;
}

function renderRevisionRequest(order) {
  const form = document.getElementById('rev-request-box');
  const pending = document.getElementById('rev-pending-box');
  if (!form || !pending) return;
  const isPreview = order.order_status === 'PREVIEW';
  const req = isPreview ? order.pending_revision : null;

  pending.classList.toggle('hidden', !req);
  form.classList.toggle('hidden', !isPreview || !!req);

  if (req) {
    document.getElementById('rev-pending-text').textContent = req.description;
    const msg = encodeURIComponent(`Halo ${order.admin_name || 'Admin'}, saya sudah mengirim revisi untuk order ${order.order_number} lewat halaman lacak. Mohon dicek ya.`);
    const wa = document.getElementById('rev-pending-wa');
    if (order.admin_phone) { wa.href = `https://wa.me/${order.admin_phone}?text=${msg}`; wa.classList.remove('hidden'); }
    else wa.classList.add('hidden');
  }
  if (isPreview && !req) {
    const left = (order.revision_limit || 0) - (order.revision_used || 0);
    document.getElementById('rev-quota-note').textContent = left > 0
      ? `Jatah revisi tersisa ${left} kali.`
      : 'Jatah revisi paket sudah habis. Revisi tambahan dikenakan Rp5.000 per batch dan akan ditagih admin.';
  }
}

async function submitRevision() {
  const text = document.getElementById('rev-text');
  const err = document.getElementById('rev-error');
  const btn = document.getElementById('rev-submit');
  err.classList.add('hidden');
  btn.disabled = true;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-revision-request`, {
      method: 'POST', headers: AUTH_HEADERS,
      body: JSON.stringify({ tracking_token: currentToken, description: text.value }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Gagal mengirim revisi.');
    text.value = '';
    await loadOrder(currentToken);
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

function renderResult(order) {
  const box = document.getElementById('result-box');
  if (order.order_status !== 'COMPLETED' || !order.result_url) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  document.getElementById('result-link').href = order.result_url;
}

function renderOrder(order) {
  const statusInfo = getStatusInfo(order.order_status);
  const paymentInfo = getPaymentStatusInfo(order.payment_status);

  document.getElementById('order-number').textContent = order.order_number;
  document.getElementById('product-name').textContent = order.product_name;

  const statusBadge = document.getElementById('status-badge');
  statusBadge.textContent = statusInfo.label;
  statusBadge.className = `inline-flex items-center px-space-md py-1.5 rounded-full text-label-md font-bold ${statusInfo.badgeClass}`;
  document.getElementById('status-description').textContent = statusInfo.description;

  document.getElementById('total-amount').textContent = formatRupiah(order.total_amount);
  document.getElementById('paid-amount').textContent = formatRupiah(order.paid_amount);
  document.getElementById('remaining-amount').textContent = formatRupiah(order.remaining_amount);

  const paymentBadge = document.getElementById('payment-badge');
  paymentBadge.textContent = paymentInfo.label;
  paymentBadge.className = `inline-flex items-center px-space-sm py-0.5 rounded-full text-caption font-bold ${paymentInfo.badgeClass}`;

  renderContact(order);
  renderMaintenance(order);
  renderRevision(order);
  renderPreview(order);
  renderRevisionRequest(order);
  renderResult(order);

  showState('state-content');
}

async function loadOrder(token) {
  if (!token) {
    showState('state-invalid');
    return;
  }

  currentToken = token;
  showState('state-loading');

  try {
    const res = await fetch(GET_ORDER_URL, {
      method: 'POST',
      headers: AUTH_HEADERS,
      body: JSON.stringify({ tracking_token: token }),
    });
    const data = await res.json();

    if (!res.ok || !data.order) {
      showState('state-notfound');
      return;
    }

    renderOrder(data.order);
  } catch (err) {
    console.error(err);
    showState('state-notfound');
  }
}

document.getElementById('token-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const value = document.getElementById('token-input').value.trim();
  if (!value) return;
  sessionStorage.setItem('tracking_token', value);
  const url = new URL(window.location.href);
  url.searchParams.set('token', value);
  window.history.replaceState({}, '', url);
  loadOrder(value);
});

loadOrder(getTokenFromUrl());

document.getElementById('maint-submit')?.addEventListener('click', submitMaintenance);
document.getElementById('rev-submit')?.addEventListener('click', submitRevision);