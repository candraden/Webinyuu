import { supabase } from '../lib/supabaseClient.js';
import { requireAdmin, initShell, callFn } from '../lib/adminGuard.js';
import { getStatusInfo, getPaymentStatusInfo } from '../shared/statusBadge.js';
import { esc } from '../shared/escapeHtml.js';
import { renderAddonCards, bindAddonEvents } from './adminAddons.js';

// Cermin ALLOWED di Edge Function update-order-status (server tetap yang memvalidasi).
const NEXT = {
  WAITING_PAYMENT: ['CANCELLED'],
  DP_PAID: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['PREVIEW', 'CANCELLED'],
  PREVIEW: ['REVISION', 'WAITING_SETTLEMENT', 'COMPLETED_UNRESPONSIVE'],
  REVISION: ['PREVIEW'],
  WAITING_SETTLEMENT: ['COMPLETED_UNRESPONSIVE', 'CANCELLED'],
  PAID: ['COMPLETED'],
};
const ACTION_LABEL = {
  IN_PROGRESS: 'Mulai Pengerjaan', PREVIEW: 'Kirim Preview', REVISION: 'Mulai Revisi',
  WAITING_SETTLEMENT: 'Minta Pelunasan', COMPLETED: 'Selesaikan Order',
  COMPLETED_UNRESPONSIVE: 'Tutup (Tidak Respons)', CANCELLED: 'Batalkan Order',
  WAITING_PAYMENT: 'Aktifkan Kembali (batas bayar 24 jam)',
};
const PAY_TYPES = { dp: 'DP', settlement: 'Pelunasan', additional: 'Biaya Tambahan', late_fee: 'Denda Keterlambatan', tip: 'Tip (kelebihan bayar)' };
const ASSET_LABEL = { logo: 'Logo', hero_photo: 'Foto Hero', product_photo: 'Foto Produk', testimonial_photo: 'Testimonial', portfolio_photo: 'Portfolio', extra_material: 'Materi Tambahan', video: 'Video' };

const orderId = new URLSearchParams(location.search).get('id');
const el = (id) => document.getElementById(id);
const rupiah = (v) => 'Rp' + Number(v || 0).toLocaleString('id-ID');
const fmtDate = (d) => d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const card = (title, body) => `<section class="min-w-0 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm"><h2 class="text-headline-sm text-primary">${title}</h2>${body}</section>`;
const inputCls = 'border border-outline-variant rounded-xl px-space-md py-2.5 text-base sm:text-body-md focus:outline-none focus:ring-2 focus:ring-secondary-container';
const btnPrimary = 'bg-secondary-container text-primary-container text-label-md px-space-md py-2.5 rounded-xl shadow-sm hover:brightness-95 disabled:opacity-60';
const btnGhost = 'bg-surface-container text-on-surface-variant text-label-md px-space-md py-2.5 rounded-xl hover:bg-surface-container-high disabled:opacity-60';

function toast(msg, isError = false) {
  const t = el('toast');
  t.textContent = msg;
  t.className = `${isError ? 'bg-error/10 text-error' : 'bg-secondary-container text-primary-container'} text-body-md rounded-xl px-space-md py-3`;
  t.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function load() {
  const [o, pays, assets, briefs, revs, hist, addons, domain, source, upgrades, maint, products, revReqs] = await Promise.all([
    supabase.from('orders').select('*, products(name)').eq('id', orderId).single(),
    supabase.from('payments').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
    supabase.from('order_assets').select('*').eq('order_id', orderId).order('asset_type').order('sort_order'),
    supabase.from('order_briefs').select('*').eq('order_id', orderId),
    supabase.from('revisions').select('*').eq('order_id', orderId).order('revision_number', { ascending: false }),
    supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
    supabase.from('order_addons').select('*').eq('order_id', orderId).order('created_at'),
    supabase.from('custom_domains').select('*').eq('order_id', orderId).maybeSingle(),
    supabase.from('source_code_requests').select('*').eq('order_id', orderId).maybeSingle(),
    supabase.from('order_package_upgrades').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
    supabase.from('maintenance_requests').select('*').eq('order_id', orderId).order('reported_at', { ascending: false }),
    supabase.from('products').select('id, name, price').eq('is_active', true).order('price'),
    supabase.from('revision_requests').select('*').eq('order_id', orderId).order('created_at', { ascending: false }),
  ]);
  if (o.error || !o.data) throw new Error('Order tidak ditemukan atau tidak ada akses (cek patch RLS 06).');
  render({ order: o.data, pays: pays.data || [], assets: assets.data || [], briefs: briefs.data || [], revs: revs.data || [], hist: hist.data || [],
    addons: addons.data || [], domain: domain.data || null, source: source.data || null,
    upgrades: upgrades.data || [], maint: maint.data || [], products: products.data || [], revReqs: revReqs.data || [] });
}

function render({ order, pays, assets, briefs, revs, hist, addons, domain, source, upgrades, maint, products, revReqs }) {
  const st = getStatusInfo(order.order_status), ps = getPaymentStatusInfo(order.payment_status);
  // Aktifkan kembali hanya untuk order yang batal OTOMATIS (customer mungkin sudah transfer tapi belum dicatat).
  const autoCancelled = order.order_status === 'CANCELLED'
    && (hist.find(h => h.to_status === 'CANCELLED')?.note || '').startsWith('Batal otomatis');
  const actions = autoCancelled ? ['WAITING_PAYMENT'] : (NEXT[order.order_status] || []);
  const addonCards = renderAddonCards({ order, addons, domain, source, upgrades, maint, products });
  const wa = String(order.whatsapp_number).replace(/\D/g, '');

  const head = `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
    <div><h1 class="text-headline-lg text-primary">${esc(order.order_number)}</h1>
    <p class="text-body-md text-on-surface-variant">${esc(order.products?.name || '-')} · dibuat ${fmtDate(order.created_at)}</p></div>
    <div class="flex gap-space-xs flex-wrap">
      <span class="px-space-md py-1.5 rounded-full text-label-md font-bold ${st.badgeClass}">${esc(st.label)}</span>
      <span class="px-space-md py-1.5 rounded-full text-label-md font-bold ${ps.badgeClass}">${esc(ps.label)}</span>
    </div></div>`;

  const cust = card('Data Pemesan', `<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-space-xs text-body-md">
    <div><dt class="text-caption text-on-surface-variant">Nama</dt><dd class="font-semibold">${esc(order.customer_name)}</dd></div>
    <div><dt class="text-caption text-on-surface-variant">Usaha</dt><dd class="font-semibold">${esc(order.business_name)}</dd></div>
    <div><dt class="text-caption text-on-surface-variant">WhatsApp</dt><dd><a class="text-primary underline underline-offset-4 font-semibold" target="_blank" rel="noopener" href="https://wa.me/${wa}">${esc(order.whatsapp_number)}</a></dd></div>
    <div><dt class="text-caption text-on-surface-variant">Email</dt><dd class="font-semibold">${esc(order.email || '-')}</dd></div>
    <div><dt class="text-caption text-on-surface-variant">Revisi terpakai</dt><dd class="font-semibold">${order.revision_used} / ${order.revision_limit}</dd></div>
    <div><dt class="text-caption text-on-surface-variant">Link hasil</dt><dd class="font-semibold break-all">${order.result_url ? `<a class="text-primary underline" target="_blank" rel="noopener" href="${esc(order.result_url)}">${esc(order.result_url)}</a>` : '-'}</dd></div>
  </dl>`);

  // Permintaan revisi yang dikirim customer lewat halaman lacak (belum diproses).
  const pendingReq = revReqs.find(r => r.status === 'pending') || null;
  const pendingBox = pendingReq ? `<div class="bg-secondary-container/40 rounded-xl p-space-md flex flex-col gap-1">
    <p class="text-label-md font-bold text-primary">Customer mengirim revisi · ${fmtDate(pendingReq.created_at)}</p>
    <p class="text-body-md whitespace-pre-line">${esc(pendingReq.description)}</p>
    <p class="text-caption text-on-surface-variant">${actions.includes('REVISION') ? 'Klik "Mulai Revisi" untuk memproses (catatan terisi otomatis dari revisi ini).' : 'Status order saat ini tidak bisa memulai revisi.'}</p></div>` : '';
  const notePrefill = actions.includes('REVISION') && pendingReq ? esc(pendingReq.description) : '';

  // Pesan WhatsApp siap kirim ke customer (dikirim manual oleh admin, bukan otomatis).
  const trackUrl = `${location.origin}/pesanan/lacak?token=${order.tracking_token}`;
  const waMsgByStatus = {
    PREVIEW: `Halo ${order.customer_name}, preview landing page untuk order ${order.order_number} sudah siap${order.preview_url ? ': ' + order.preview_url : ''}. Silakan dicek, lalu kirim revisi (jika ada) lewat halaman lacak: ${trackUrl}`,
    REVISION: `Halo ${order.customer_name}, revisi kamu untuk order ${order.order_number} sedang kami kerjakan. Kami kabari lagi setelah preview barunya siap.`,
    WAITING_SETTLEMENT: `Halo ${order.customer_name}, landing page untuk order ${order.order_number} sudah siap difinalisasi. Sisa pelunasan ${rupiah(order.remaining_amount)}. Mohon kirim bukti transfernya ke chat ini.`,
  };
  const waBtn = waMsgByStatus[order.order_status]
    ? `<a target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent(waMsgByStatus[order.order_status])}" class="self-start inline-flex items-center gap-space-xs bg-[#25D366] text-white text-label-md px-space-md py-2.5 rounded-xl shadow-sm hover:brightness-95">Kabari Customer via WhatsApp</a>`
    : '';

  const statusCard = card('Ubah Status', pendingBox + (actions.length ? `
    <div class="flex flex-col gap-space-sm">
      <textarea id="status-note" rows="3" placeholder="Catatan (opsional; untuk Revisi = rangkuman perubahan yang diminta)" class="${inputCls}">${notePrefill}</textarea>
      ${actions.includes('PREVIEW') ? `<input id="preview-url" type="url" placeholder="Link preview (https://...) — wajib untuk Kirim Preview" value="${esc(order.preview_url || '')}" class="${inputCls}">` : ''}
      ${actions.includes('COMPLETED') ? `<input id="result-url" type="url" placeholder="Link hasil (https://...) — wajib untuk menyelesaikan" value="${esc(order.result_url || '')}" class="${inputCls}">` : ''}
      <div class="flex flex-wrap gap-space-xs">${actions.map(a => `<button type="button" data-to="${a}" class="status-btn ${['CANCELLED', 'COMPLETED_UNRESPONSIVE'].includes(a) ? btnGhost : btnPrimary}">${ACTION_LABEL[a]}</button>`).join('')}</div>
    </div>` : `<p class="text-body-md text-on-surface-variant">${order.order_status === 'WAITING_PAYMENT' ? 'Menunggu DP. Status maju otomatis setelah pembayaran DP dicatat.' : 'Tidak ada perubahan status manual untuk status ini.'}</p>`) + waBtn);

  const payRows = pays.map(p => `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs border-b border-surface-container pb-space-sm last:border-0">
    <div><p class="text-body-md font-semibold">${esc(PAY_TYPES[p.payment_type] || p.payment_type)} · ${rupiah(p.amount)}</p>
    <p class="text-caption text-on-surface-variant">${fmtDate(p.created_at)}${p.note ? ' · ' + esc(p.note) : ''}</p></div>
    <div class="flex items-center gap-space-xs">
      ${p.proof_url ? `<button type="button" data-file="payment-proofs|${esc(p.proof_url)}" class="file-btn ${btnGhost}">Bukti</button>` : ''}
      ${p.status === 'pending'
        ? `<button type="button" data-pay="${p.id}" data-decision="verify" class="pay-btn ${btnPrimary}">Verifikasi</button><button type="button" data-pay="${p.id}" data-decision="reject" class="pay-btn ${btnGhost}">Tolak</button>`
        : `<span class="px-space-sm py-0.5 rounded-full text-caption font-bold ${p.status === 'verified' ? 'bg-secondary-container text-primary-container' : 'bg-error/10 text-error'}">${p.status === 'verified' ? 'Terverifikasi' : 'Ditolak'}</span>`}
    </div></div>`).join('') || '<p class="text-body-md text-on-surface-variant">Belum ada pembayaran tercatat.</p>';

  const payCard = card('Pembayaran', `
    <div class="grid grid-cols-3 gap-space-sm text-center bg-surface-container-low rounded-xl p-space-md">
      <div><p class="text-caption text-on-surface-variant">Total</p><p class="text-label-md font-bold text-primary">${rupiah(order.total_amount)}</p></div>
      <div><p class="text-caption text-on-surface-variant">Terbayar</p><p class="text-label-md font-bold text-primary">${rupiah(order.paid_amount)}</p></div>
      <div><p class="text-caption text-on-surface-variant">Sisa</p><p class="text-label-md font-bold text-primary">${rupiah(order.remaining_amount)}</p></div>
    </div>
    <p class="text-caption text-on-surface-variant">DP yang diminta: ${rupiah(order.dp_amount)}</p>
    <div class="flex flex-col gap-space-sm">${payRows}</div>
    <form id="pay-form" class="flex flex-wrap gap-space-xs pt-space-sm border-t border-surface-container">
      <select id="pay-type" class="${inputCls} min-w-0">${Object.entries(PAY_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <input id="pay-amount" type="number" min="1" step="1" required placeholder="Nominal (Rp)" class="${inputCls} min-w-0 w-full sm:w-[160px]">
      <input id="pay-note" type="text" placeholder="Catatan (opsional)" class="${inputCls} min-w-0 flex-1 basis-[180px]">
      <button type="submit" class="${btnPrimary} whitespace-nowrap">Catat Terverifikasi</button>
    </form>
    <p class="text-caption text-on-surface-variant">Catat pembayaran dari bukti transfer yang dikirim via WhatsApp. Kelebihan transfer dicatat sebagai Tip terpisah.</p>`);

  const fileBtn = (bucket, path, label) => `<button type="button" data-file="${bucket}|${esc(path)}" class="file-btn text-left text-primary underline underline-offset-4 text-body-md break-all">${esc(label)}</button>`;
  zipItems = [
    ...briefs.map(b => ({ bucket: 'briefs', path: b.file_url, folder: 'brief', name: b.file_name })),
    ...assets.map(a => ({ bucket: 'order-assets', path: a.file_url, folder: a.asset_type, name: a.original_file_name || a.stored_file_name })),
  ];
  zipName = `${order.order_number}-materi.zip`;
  const filesCard = card('Brief & Asset', `<div class="flex flex-col gap-space-xs">
    ${zipItems.length ? `<button type="button" id="zip-btn" class="self-start ${btnPrimary}">Unduh Semua (ZIP) · ${zipItems.length} file</button>` : ''}
    ${briefs.map(b => `<div class="flex justify-between gap-space-sm"><span class="text-caption text-on-surface-variant shrink-0">Brief</span>${fileBtn('briefs', b.file_url, b.file_name)}</div>`).join('')}
    ${assets.map(a => `<div class="flex justify-between gap-space-sm"><span class="text-caption text-on-surface-variant shrink-0">${esc(ASSET_LABEL[a.asset_type] || a.asset_type)}</span><div class="text-right">${fileBtn('order-assets', a.file_url, a.stored_file_name)}${a.description ? `<p class="text-caption text-on-surface-variant">${esc(a.description)}</p>` : ''}</div></div>`).join('')}
    ${!briefs.length && !assets.length ? '<p class="text-body-md text-on-surface-variant">Belum ada file.</p>' : ''}</div>`);

  const revCard = card('Revisi', revs.length ? revs.map(r => `<div class="border-b border-surface-container pb-space-sm last:border-0"><p class="text-body-md font-semibold">Revisi #${r.revision_number} · ${esc(r.status)}${r.is_chargeable ? ` · berbayar ${rupiah(r.charge_amount)}` : ''}</p><p class="text-body-md text-on-surface-variant whitespace-pre-line">${esc(r.batch_description)}</p></div>`).join('') : '<p class="text-body-md text-on-surface-variant">Belum ada revisi.</p>');

  const histCard = card('Riwayat Status', hist.map(h => `<div class="text-body-md"><span class="font-semibold">${esc(getStatusInfo(h.to_status).label)}</span> <span class="text-caption text-on-surface-variant">· ${fmtDate(h.created_at)}${h.note ? ' · ' + esc(h.note) : ''}</span></div>`).join('') || '<p class="text-body-md text-on-surface-variant">Belum ada riwayat.</p>');

  const d = el('detail');
  d.innerHTML = head + `<div class="grid grid-cols-1 xl:grid-cols-2 gap-space-md"><div class="min-w-0 flex flex-col gap-space-md">${cust}${statusCard}${addonCards}${revCard}</div><div class="min-w-0 flex flex-col gap-space-md">${payCard}${filesCard}${histCard}</div></div>`;
  d.classList.remove('hidden');
  el('state-loading').classList.add('hidden');
}

async function run(btn, fn, okMsg) {
  const all = document.querySelectorAll('#detail button');
  all.forEach(b => b.disabled = true);
  try { await fn(); await load(); toast(okMsg); }
  catch (e) { all.forEach(b => b.disabled = false); toast(e.message, true); }
}

let zipItems = [];
let zipName = 'materi.zip';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Gagal memuat library ZIP.'));
    document.head.appendChild(s);
  });
}

async function downloadZip(btn) {
  const label = btn.textContent;
  btn.disabled = true;
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    const zip = new window.JSZip();
    const used = new Set();
    let done = 0;
    for (const it of zipItems) {
      btn.textContent = `Mengambil file ${done + 1}/${zipItems.length}...`;
      const { url } = await callFn('admin-signed-url', { bucket: it.bucket, path: it.path });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Gagal mengunduh ${it.name}.`);
      let path = `${it.folder}/${it.name}`;
      for (let n = 2; used.has(path); n++) path = `${it.folder}/${n}-${it.name}`;
      used.add(path);
      zip.file(path, await res.blob());
      done += 1;
    }
    btn.textContent = 'Membuat ZIP...';
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = zipName;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast('ZIP berhasil dibuat.');
  } catch (err) {
    toast(err.message || 'Gagal membuat ZIP.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

document.addEventListener('click', async (e) => {
  const sBtn = e.target.closest('.status-btn');
  if (sBtn) {
    const to = sBtn.dataset.to;
    if (['CANCELLED', 'COMPLETED_UNRESPONSIVE'].includes(to) && !confirm(`${ACTION_LABEL[to]}? Tindakan ini tidak bisa dibatalkan.`)) return;
    if (to === 'WAITING_PAYMENT' && !confirm('Aktifkan kembali order ini? Batas bayar DP diperpanjang 24 jam. Setelah itu catat pembayaran DP-nya jika customer memang sudah transfer.')) return;
    const note = el('status-note')?.value.trim();
    const previewUrl = el('preview-url')?.value.trim() || '';
    if (to === 'PREVIEW' && !/^https?:\/\/\S+$/i.test(previewUrl)) return toast('Isi link preview yang valid (https://...) dulu.', true);
    return run(sBtn, () => callFn('update-order-status', {
      order_id: orderId, to_status: to, note: note || null,
      preview_url: to === 'PREVIEW' ? previewUrl : null,
      result_url: el('result-url')?.value.trim() || null,
      revision_description: note || null,
    }), 'Status diperbarui.');
  }
  const pBtn = e.target.closest('.pay-btn');
  if (pBtn) return run(pBtn, () => callFn('verify-payment', { action: pBtn.dataset.decision, payment_id: pBtn.dataset.pay }), 'Pembayaran diproses.');

  const zBtn = e.target.closest('#zip-btn');
  if (zBtn) return downloadZip(zBtn);

  const fBtn = e.target.closest('.file-btn');
  if (fBtn) {
    const [bucket, ...rest] = fBtn.dataset.file.split('|');
    try { const { url } = await callFn('admin-signed-url', { bucket, path: rest.join('|') }); window.open(url, '_blank', 'noopener'); }
    catch (err) { toast(err.message, true); }
  }
});

bindAddonEvents({ orderId, run, toast });

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'pay-form') return;
  e.preventDefault();
  run(e.submitter, () => callFn('verify-payment', {
    action: 'record', order_id: orderId,
    payment_type: el('pay-type').value, amount: Number(el('pay-amount').value), note: el('pay-note').value.trim() || null,
  }), 'Pembayaran tercatat.');
});

(async () => {
  if (!orderId) { el('state-loading').classList.add('hidden'); el('state-error').textContent = 'ID order tidak ada di URL.'; return el('state-error').classList.remove('hidden'); }
  const auth = await requireAdmin();
  if (!auth) return;
  initShell(auth.admin);
  try { await load(); }
  catch (err) { el('state-loading').classList.add('hidden'); el('state-error').textContent = err.message; el('state-error').classList.remove('hidden'); }
})();