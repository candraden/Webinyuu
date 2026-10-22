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
  const check = '<span class="material-symbols-outlined pt3-ico">check_circle</span>';

  const benefitItems = benefits.map(b => `<li>${check}<span>${b}</span></li>`).join('');
  const revisiItem = product.revision_limit ? `<li>${check}<span>Revisi ${product.revision_limit}x</span></li>` : '';

  // Gaya kartu: assets/css/pricing.css (warna aksen berganti otomatis per kartu)
  return `
    <div class="pt3">
      <div class="pt3-head">
        <h4 class="pt3-name">${product.name}</h4>
        ${product.description_short ? `<p class="pt3-desc">${product.description_short}</p>` : ''}
      </div>
      <div class="pt3-price">
        <span class="pt3-amount">${formatRupiah(product.price)}</span>
        <span class="pt3-per">/ sekali bayar</span>
      </div>
      <div class="pt3-body">
        <ul class="pt3-list">
          ${benefitItems}
          ${revisiItem}
        </ul>
        <div class="pt3-actions">
          <a class="w-full inline-flex items-center justify-center border border-primary/30 text-primary text-label-md py-3 rounded-xl hover:bg-surface-container transition-all" href="/produk/detail?slug=${product.slug}" onclick="sessionStorage.setItem('selected_slug', '${product.slug}')">
            Lihat Detail
          </a>
          <a class="w-full inline-flex items-center justify-center bg-secondary-container text-primary-container text-label-md py-3 rounded-xl hover:brightness-95 transition-all" href="/pesan?paket=${product.slug}" onclick="sessionStorage.setItem('selected_paket', '${product.slug}')">
            Pesan Sekarang
          </a>
        </div>
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