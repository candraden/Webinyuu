import { supabase } from '../lib/supabaseClient.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

let cache = null;
async function loadAccounts() {
  if (cache) return cache;
  const { data, error } = await supabase
    .from('payment_accounts')
    .select('id, bank_name, account_number, account_holder')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at');
  if (error) throw error;
  cache = data || [];
  return cache;
}

// Isi `box` dengan kartu rekening tujuan. `amount` = nominal yang harus ditransfer sekarang.
// Mengembalikan true jika ada rekening yang ditampilkan.
export async function renderPaymentAccounts(box, { amount, label = 'Nominal transfer' } = {}) {
  if (!box) return false;
  let accounts = [];
  try { accounts = await loadAccounts(); } catch (e) { console.error(e); }
  if (!accounts.length) { box.classList.add('hidden'); box.innerHTML = ''; return false; }

  box.innerHTML = `
    <h3 class="text-headline-sm text-primary">Transfer ke rekening Webinyuu</h3>
    ${amount ? `<p class="text-body-md text-on-surface-variant">${esc(label)}: <span class="font-bold text-primary">${rupiah(amount)}</span>. Transfer sesuai nominal; kelebihan transfer tidak dikembalikan.</p>` : ''}
    <div class="flex flex-col gap-space-sm">
      ${accounts.map((a) => `
        <div class="bg-surface-container-low rounded-xl px-space-md py-space-sm flex items-center justify-between gap-space-sm">
          <div class="min-w-0">
            <p class="text-caption text-on-surface-variant">${esc(a.bank_name)}</p>
            <p class="text-headline-sm text-primary font-bold tracking-wide break-all">${esc(a.account_number)}</p>
            <p class="text-body-md text-on-surface-variant">a.n. ${esc(a.account_holder)}</p>
          </div>
          <button type="button" data-copy="${esc(a.account_number)}" class="pay-copy shrink-0 text-label-md px-space-md py-2 rounded-lg bg-secondary-container text-primary-container hover:brightness-95">Salin</button>
        </div>`).join('')}
    </div>
    <p class="text-caption text-on-surface-variant">Setelah transfer, kirim bukti ke admin lewat WhatsApp.</p>`;
  box.classList.remove('hidden');

  if (!box.dataset.copyBound) {
    box.dataset.copyBound = '1';
    box.addEventListener('click', async (e) => {
      const b = e.target.closest('.pay-copy');
      if (!b) return;
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Tersalin'; }
      catch { b.textContent = 'Salin manual'; }
      setTimeout(() => { b.textContent = 'Salin'; }, 1800);
    });
  }
  return true;
}
