import { supabase } from '../lib/supabaseClient.js';

const grid = document.getElementById('paket-grid');
const loadingEl = document.getElementById('paket-loading');
const emptyEl = document.getElementById('paket-empty');
const errorEl = document.getElementById('paket-error');

function formatRupiah(value) {
  return 'Rp' + Number(value).toLocaleString('id-ID');
}

function renderCard(product) {
  const benefits = Array.isArray(product.benefits) ? product.benefits : [];

  const benefitItems = benefits.length
    ? benefits.map(b => `
        <li class="flex items-center gap-space-xs">
          <span class="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
          <span>${b}</span>
        </li>`).join('')
    : '';

  const revisiItem = product.revision_limit
    ? `<li class="flex items-center gap-space-xs">
         <span class="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
         <span>Revisi ${product.revision_limit}x</span>
       </li>`
    : '';

  return `
    <div class="card-hover bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col justify-between">
      <div class="flex flex-col gap-space-md">
        <span class="text-headline-sm text-primary">${product.name}</span>
        <div class="flex items-baseline gap-1">
          <span class="text-headline-xl text-primary font-bold">${formatRupiah(product.price)}</span>
          <span class="text-caption text-on-surface-variant">/ sekali bayar</span>
        </div>
        ${product.description_short ? `<p class="text-body-md text-on-surface-variant">${product.description_short}</p>` : ''}
        <div class="h-[1px] bg-surface-container w-full my-space-xs"></div>
        <ul class="flex flex-col gap-space-sm text-body-md text-on-surface">
          ${benefitItems}
          ${revisiItem}
        </ul>
      </div>
      <div class="pt-space-xl flex flex-col gap-space-sm">
        <a class="w-full inline-flex items-center justify-center border border-primary/30 text-primary text-label-md py-3 rounded-xl hover:bg-surface-container transition-all" href="/produk/detail?slug=${product.slug}" onclick="sessionStorage.setItem('selected_slug', '${product.slug}')">
          Lihat Detail
        </a>
        <a class="w-full inline-flex items-center justify-center bg-secondary-container text-primary-container text-label-md py-3 rounded-xl hover:brightness-95 transition-all" href="/pesan?paket=${product.slug}" onclick="sessionStorage.setItem('selected_paket', '${product.slug}')">
          Pesan Sekarang
        </a>
      </div>
    </div>`;
}

async function loadPaket() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  loadingEl.classList.add('hidden');

  if (error) {
    console.error('Gagal memuat produk:', error.message);
    errorEl.classList.remove('hidden');
    return;
  }

  if (!data || data.length === 0) {
    emptyEl.classList.remove('hidden');
    return;
  }

  grid.innerHTML = data.map(renderCard).join('');
}

loadPaket();