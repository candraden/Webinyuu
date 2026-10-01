// Sumber tunggal aturan harga add-on (Business Rules §8-9, SOP Custom Domain).
// Dipakai create-order, calculate-addon-price, dan manage-addons supaya angkanya selalu sama.
export const CUSTOM_DOMAIN_FEE = 25000;   // biaya konfigurasi, di luar harga beli domain
export const SOURCE_CODE_RATE = 0.5;      // 50% dari harga paket
export const DP_RATE = 0.5;

export type AddonSelection = {
  custom_domain?: { has_domain: boolean; domain_name?: string } | null;
  source_code?: boolean;
};

export type AddonItem = { type: "custom_domain" | "source_code"; label: string; amount: number };

export function buildAddonItems(packagePrice: number, sel: AddonSelection | null | undefined): AddonItem[] {
  const items: AddonItem[] = [];
  if (sel?.custom_domain) {
    items.push({ type: "custom_domain", label: "Konfigurasi Custom Domain", amount: CUSTOM_DOMAIN_FEE });
  }
  if (sel?.source_code) {
    items.push({ type: "source_code", label: "Source Code (50% harga paket)", amount: Math.round(packagePrice * SOURCE_CODE_RATE) });
  }
  return items;
}

export function calcTotals(packagePrice: number, items: AddonItem[]) {
  const additional = items.reduce((s, i) => s + i.amount, 0);
  const total = packagePrice + additional;
  const dp = Math.round(total * DP_RATE);
  return { additional, total, dp, remaining: total - dp };
}
