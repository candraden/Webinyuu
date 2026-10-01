import { supabase } from '../lib/supabaseClient.js';

function formatRupiah(value) {
  return 'Rp' + Number(value).toLocaleString('id-ID');
}

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('slug');
  if (fromQuery) {
    sessionStorage.setItem('selected_slug', fromQuery);
    return fromQuery;
  }
  // fallback: query string hilang (misal ke-strip redirect "clean URL"
  // dari dev server) -> pakai slug terakhir yang disimpan saat link
  // "Lihat Detail" diklik di catalog.js.
  return sessionStorage.getItem('selected_slug');
}

function renderCheckItem(text, positive = true) {
  const icon = positive ? 'check' : 'close';
  const iconBg = positive ? 'bg-secondary-container text-primary-container' : 'bg-surface-container-highest text-outline';
  return `
    <div class="flex items-start gap-space-sm bg-surface-container-low/60 p-space-md rounded-xl">
      <div class="w-6 h-6 rounded-full ${iconBg} flex items-center justify-center shrink-0 mt-0.5">
        <span class="material-symbols-outlined text-[16px]">${icon}</span>
      </div>
      <p class="text-body-md text-on-surface">${text}</p>
    </div>`;
}

function renderBenefitCard(text) {
  return `
    <div class="card-hover bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-xs">
      <div class="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-primary-container">
        <span class="material-symbols-outlined text-[22px]">check_circle</span>
      </div>
      <p class="text-body-md text-on-surface">${text}</p>
    </div>`;
}

async function loadDetail() {
  const slug = getSlugFromUrl();
  const loadingEl = document.getElementById('state-loading');
  const notFoundEl = document.getElementById('state-notfound');
  const contentEl = document.getElementById('detail-content');

  if (!slug) {
    loadingEl.classList.add('hidden');
    notFoundEl.classList.remove('hidden');
    return;
  }

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  loadingEl.classList.add('hidden');

  if (error || !product) {
    notFoundEl.classList.remove('hidden');
    return;
  }

  document.title = `${product.name} — Webinyuu`;
  document.getElementById('breadcrumb-name').textContent = product.name;
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-desc-short').textContent = product.description_short || '';
  document.getElementById('product-price').textContent = formatRupiah(product.price);

  const ctaPesan = document.getElementById('cta-pesan');
  ctaPesan.href = `/pesan.html?paket=${product.slug}`;
  ctaPesan.addEventListener('click', () => sessionStorage.setItem('selected_paket', product.slug));

  const ctaHeader = document.getElementById('cta-header');
  ctaHeader.href = `/pesan.html?paket=${product.slug}`;
  ctaHeader.addEventListener('click', () => sessionStorage.setItem('selected_paket', product.slug));

  if (product.estimated_duration_days) {
    const durEl = document.getElementById('product-duration');
    durEl.classList.remove('hidden');
    durEl.querySelector('span:last-child').textContent = `${product.estimated_duration_days} hari kerja`;
  }

  if (product.brief_template_url) {
    const briefEl = document.getElementById('cta-brief');
    briefEl.classList.remove('hidden');
    briefEl.href = product.brief_template_url;
  }

  if (product.thumbnail_url) {
    const imgEl = document.getElementById('product-thumbnail');
    imgEl.src = product.thumbnail_url;
    imgEl.alt = product.name;
    imgEl.classList.remove('hidden');
  }

  const benefits = Array.isArray(product.benefits) ? product.benefits : [];
  if (benefits.length) {
    document.getElementById('section-benefits').classList.remove('hidden');
    document.getElementById('benefits-grid').innerHTML = benefits.map(renderBenefitCard).join('');
  }

  const included = Array.isArray(product.included) ? product.included : [];
  document.getElementById('tab-termasuk').innerHTML = included.length
    ? included.map(t => renderCheckItem(t, true)).join('')
    : `<p class="text-body-md text-on-surface-variant col-span-2">Belum ada data.</p>`;

  const excluded = Array.isArray(product.excluded) ? product.excluded : [];
  document.getElementById('tab-belum').innerHTML = excluded.length
    ? excluded.map(t => renderCheckItem(t, false)).join('')
    : `<p class="text-body-md text-on-surface-variant col-span-2">Belum ada data.</p>`;

  document.getElementById('terms-text').textContent = product.terms || 'Belum ada ketentuan tercatat.';

  contentEl.classList.remove('hidden');
}

loadDetail();