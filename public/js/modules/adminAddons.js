import { callFn } from '../lib/adminGuard.js';
import { esc } from '../shared/escapeHtml.js';

// Kartu add-on & kasus khusus di detail order: layanan tambahan, custom domain, source code,
// upgrade paket, maintenance. Semua perubahan lewat Edge Function manage-addons (server memvalidasi).

const BILLABLE = ['DP_PAID', 'IN_PROGRESS', 'PREVIEW', 'REVISION', 'WAITING_SETTLEMENT'];
const rupiah = (v) => 'Rp' + Number(v || 0).toLocaleString('id-ID');
const fmt = (d) => d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const inputCls = 'border border-outline-variant rounded-xl px-space-md py-2.5 text-base sm:text-body-md focus:outline-none focus:ring-2 focus:ring-secondary-container';
const btnPrimary = 'bg-secondary-container text-primary-container text-label-md px-space-md py-2.5 rounded-xl shadow-sm hover:brightness-95 disabled:opacity-60';
const card = (title, body) => `<section class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm"><h2 class="text-headline-sm text-primary">${title}</h2>${body}</section>`;
const muted = (t) => `<p class="text-body-md text-on-surface-variant">${t}</p>`;
const field = (label, control) => `<div class="flex flex-col gap-1"><label class="text-caption text-on-surface-variant">${label}</label>${control}</div>`;

const DOMAIN_FLOW = {
  needs_purchase: ['DOMAIN_REQUESTED', 'DOMAIN_PURCHASE_PENDING', 'DOMAIN_REGISTERED', 'DNS_PENDING', 'DNS_CONFIGURED', 'DOMAIN_VERIFYING', 'DOMAIN_CONNECTED', 'DOMAIN_ERROR'],
  has_domain: ['CUSTOMER_DOMAIN', 'DNS_PENDING', 'DNS_CONFIGURED', 'DOMAIN_VERIFYING', 'DOMAIN_CONNECTED', 'DOMAIN_ERROR'],
};
const DOMAIN_LABEL = {
  CUSTOMER_DOMAIN: 'Customer sudah punya domain', DOMAIN_REQUESTED: 'Domain diminta', DOMAIN_PURCHASE_PENDING: 'Menunggu pembelian domain',
  DOMAIN_REGISTERED: 'Domain terdaftar', DNS_PENDING: 'Menunggu pengaturan DNS', DNS_CONFIGURED: 'DNS sudah diatur',
  DOMAIN_VERIFYING: 'Verifikasi domain', DOMAIN_CONNECTED: 'Domain tersambung', DOMAIN_ERROR: 'Error domain',
};
const MAINT_LABEL = {
  MAINTENANCE_REQUESTED: 'Laporan masuk', UNDER_REVIEW: 'Ditinjau', APPROVED: 'Disetujui', IN_PROGRESS: 'Dikerjakan',
  RESOLVED: 'Selesai', ADDITIONAL_REQUEST: 'Permintaan tambahan (berbayar)',
};
const MAINT_NEXT = {
  MAINTENANCE_REQUESTED: ['UNDER_REVIEW'], UNDER_REVIEW: ['APPROVED', 'ADDITIONAL_REQUEST'],
  APPROVED: ['IN_PROGRESS'], IN_PROGRESS: ['RESOLVED'], RESOLVED: [], ADDITIONAL_REQUEST: [],
};
const opts = (list, selected, labels) => list.map(v => `<option value="${v}" ${v === selected ? 'selected' : ''}>${esc(labels?.[v] || v)}</option>`).join('');

export function renderAddonCards({ order, addons, domain, source, upgrades, maint, products }) {
  const canBill = BILLABLE.includes(order.order_status);
  const current = products.find(p => p.id === order.product_id);
  const out = [];

  // ---- Layanan tambahan ----
  const list = addons.length
    ? `<ul class="flex flex-col gap-1 text-body-md">${addons.map(a => `<li class="flex justify-between gap-space-sm"><span>${esc(a.addon_type)}${a.note ? ` <span class="text-caption text-on-surface-variant">· ${esc(a.note)}</span>` : ''}</span><span class="font-semibold">${rupiah(a.total_price)}</span></li>`).join('')}</ul>`
    : muted('Belum ada layanan tambahan.');
  let adders = '';
  if (canBill && !domain) {
    adders += `<div class="border-t border-surface-container pt-space-sm flex flex-col gap-space-xs">
      <p class="text-label-md text-primary">Tambah Custom Domain (+Rp25.000)</p>
      <select id="ad-domain-case" class="${inputCls}"><option value="has">Customer sudah punya domain</option><option value="needs">Customer belum punya, kami bantu</option></select>
      <input id="ad-domain-name" class="${inputCls}" maxlength="120" placeholder="Nama domain">
      <button type="button" class="ad-add-domain self-start ${btnPrimary}">Tambahkan</button></div>`;
  }
  if (canBill && !source && current) {
    adders += `<div class="border-t border-surface-container pt-space-sm flex items-center justify-between gap-space-sm">
      <p class="text-label-md text-primary">Tambah Source Code (+${rupiah(Math.round(Number(current.price) * 0.5))})</p>
      <button type="button" class="ad-add-source ${btnPrimary}">Tambahkan</button></div>`;
  }
  if (!canBill && !addons.length) adders = muted('Tagihan tambahan hanya bisa ditambah saat order sedang berjalan dan belum lunas.');
  out.push(card('Layanan Tambahan', list + adders));

  // ---- Upgrade paket ----
  const higher = current ? products.filter(p => Number(p.price) > Number(current.price)) : [];
  const upHist = upgrades.length ? `<ul class="text-caption text-on-surface-variant">${upgrades.map(u => `<li>${fmt(u.created_at)} · selisih ${rupiah(u.price_difference)} · kuota revisi baru ${u.new_revision_limit}</li>`).join('')}</ul>` : '';
  if ((canBill && higher.length) || upgrades.length) {
    out.push(card('Upgrade Paket', `${muted(`Paket sekarang: <b>${esc(current?.name || '-')}</b>. Customer hanya membayar selisih harga; kuota revisi mengikuti paket baru.`)}
      ${canBill && higher.length ? `<div class="flex flex-col sm:flex-row gap-space-xs">
        <select id="ad-upgrade-to" class="${inputCls} flex-1">${higher.map(p => `<option value="${p.id}">${esc(p.name)} · selisih ${rupiah(Number(p.price) - Number(current.price))}</option>`).join('')}</select>
        <button type="button" class="ad-upgrade ${btnPrimary}">Upgrade</button></div>` : ''}${upHist}`));
  }

  // ---- Custom domain ----
  if (domain) {
    const flow = DOMAIN_FLOW[domain.ownership_case] || [];
    out.push(card('Custom Domain', `
      ${muted(domain.ownership_case === 'needs_purchase' ? 'Customer belum punya domain (kami bantu beli). Domain terdaftar atas nama customer.' : 'Customer sudah punya domain; kami hanya membantu menyambungkan.')}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
        ${field('Status', `<select id="dm-status" class="${inputCls}">${opts(flow, domain.status, DOMAIN_LABEL)}</select>`)}
        ${field('Nama domain', `<input id="dm-name" class="${inputCls}" maxlength="120" value="${esc(domain.domain_name || '')}">`)}
        ${field('Registrar', `<input id="dm-registrar" class="${inputCls}" maxlength="80" value="${esc(domain.registrar || '')}" placeholder="mis. Niagahoster">`)}
        ${field('Harga domain (diteruskan ke customer)', `<input id="dm-price" type="number" min="0" class="${inputCls}" value="${domain.domain_price ?? ''}">`)}
      </div>
      ${field('Catatan (kedaluwarsa domain, record DNS, dll.)', `<textarea id="dm-notes" rows="2" maxlength="1000" class="${inputCls}">${esc(domain.notes || '')}</textarea>`)}
      <p class="text-caption text-on-surface-variant">Harga beli domain bukan pendapatan Webinyuu. Tagihkan terpisah lewat Pembayaran jenis Biaya Tambahan. Sebelum DOMAIN_CONNECTED, nama domain dan registrar wajib terisi.</p>
      <button type="button" class="ad-save-domain self-start ${btnPrimary}">Simpan Domain</button>
      ${domain.connected_at ? `<p class="text-caption text-on-surface-variant">Tersambung ${fmt(domain.connected_at)}</p>` : ''}`));
  }

  // ---- Source code ----
  if (source) {
    out.push(card('Source Code', `
      ${muted(`Harga ${rupiah(source.price)}. Baru bisa diserahkan setelah pembayaran lunas.`)}
      <div class="flex flex-col sm:flex-row gap-space-xs">
        <select id="sc-status" class="${inputCls} flex-1">${opts(['requested', 'paid', 'delivered'], source.status, { requested: 'Diminta', paid: 'Sudah dibayar', delivered: 'Sudah diserahkan' })}</select>
        <button type="button" class="ad-save-source ${btnPrimary}">Simpan</button></div>
      ${source.delivered_at ? `<p class="text-caption text-on-surface-variant">Diserahkan ${fmt(source.delivered_at)}</p>` : ''}`));
  }

  // ---- Maintenance ----
  if (order.order_status === 'COMPLETED' || maint.length) {
    const start = new Date(order.published_at || order.updated_at).getTime();
    const until = new Date(start + 7 * 86400000);
    const info = order.order_status === 'COMPLETED'
      ? muted(`Garansi bug 7 hari: ${Date.now() <= until.getTime() ? 'aktif sampai' : 'berakhir'} ${fmt(until)}. Di luar masa ini hanya website mati total karena kesalahan kami yang tetap gratis.`)
      : '';
    const rows = maint.map(m => `<div data-maint="${m.id}" class="border-t border-surface-container pt-space-sm flex flex-col gap-space-xs">
      <p class="text-body-md whitespace-pre-line">${esc(m.description)}</p>
      <p class="text-caption text-on-surface-variant">Dilapor ${fmt(m.reported_at)} · ${m.is_within_period ? 'dalam 7 hari' : '<b>di luar 7 hari</b>'}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-xs">
        ${field('Kategori', `<select class="mt-category ${inputCls}"><option value="">Belum diklasifikasi</option>${opts(['maintenance', 'additional_request'], m.category, { maintenance: 'Maintenance (gratis)', additional_request: 'Additional Request (berbayar)' })}</select>`)}
        ${field('Status', `<select class="mt-status ${inputCls}">${opts([m.status, ...MAINT_NEXT[m.status]], m.status, MAINT_LABEL)}</select>`)}
      </div>
      <label class="flex items-center gap-space-xs text-body-md"><input type="checkbox" class="mt-severe" ${m.is_severe_downtime ? 'checked' : ''}> Website mati total karena kesalahan Webinyuu (gratis tanpa batas waktu)</label>
      <textarea class="mt-note ${inputCls}" rows="2" maxlength="1000" placeholder="Catatan admin">${esc(m.admin_note || '')}</textarea>
      <button type="button" class="mt-save self-start ${btnPrimary}">Simpan</button></div>`).join('');
    out.push(card('Maintenance', info + (rows || muted('Belum ada laporan dari customer.'))));
  }

  return out.join('');
}

// Satu pendengar klik untuk semua kartu di atas. `run(btn, fn, okMsg)` berasal dari halaman detail.
export function bindAddonEvents({ orderId, run, toast }) {
  document.addEventListener('click', (e) => {
    const t = e.target;
    const $ = (id) => document.getElementById(id);

    if (t.closest('.ad-add-domain')) {
      return run(t.closest('button'), () => callFn('manage-addons', {
        action: 'add_addon', addon: 'custom_domain', order_id: orderId,
        has_domain: $('ad-domain-case').value !== 'needs', domain_name: $('ad-domain-name').value.trim(),
      }), 'Custom domain ditambahkan.');
    }
    if (t.closest('.ad-add-source')) {
      if (!confirm('Tambahkan Source Code ke tagihan order ini?')) return;
      return run(t.closest('button'), () => callFn('manage-addons', { action: 'add_addon', addon: 'source_code', order_id: orderId }), 'Source code ditambahkan.');
    }
    if (t.closest('.ad-upgrade')) {
      const sel = $('ad-upgrade-to');
      if (!confirm(`Upgrade ke "${sel.selectedOptions[0].textContent}"? Total tagihan naik sebesar selisihnya.`)) return;
      return run(t.closest('button'), () => callFn('manage-addons', { action: 'upgrade_package', order_id: orderId, to_product_id: sel.value }), 'Paket di-upgrade.');
    }
    if (t.closest('.ad-save-domain')) {
      return run(t.closest('button'), () => callFn('manage-addons', {
        action: 'update_domain', order_id: orderId, status: $('dm-status').value, domain_name: $('dm-name').value,
        registrar: $('dm-registrar').value, domain_price: $('dm-price').value, notes: $('dm-notes').value,
      }), 'Domain disimpan.');
    }
    if (t.closest('.ad-save-source')) {
      return run(t.closest('button'), () => callFn('manage-addons', { action: 'update_source_code', order_id: orderId, status: $('sc-status').value }), 'Source code disimpan.');
    }
    const ms = t.closest('.mt-save');
    if (ms) {
      const row = ms.closest('[data-maint]');
      return run(ms, () => callFn('manage-addons', {
        action: 'update_maintenance', request_id: row.dataset.maint,
        category: row.querySelector('.mt-category').value, status: row.querySelector('.mt-status').value,
        is_severe_downtime: row.querySelector('.mt-severe').checked, admin_note: row.querySelector('.mt-note').value,
      }), 'Laporan disimpan.');
    }
  });
}
