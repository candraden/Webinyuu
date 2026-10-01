import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAddonItems, calcTotals } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Publik (dipanggil form pemesanan): hitung estimasi total dari harga paket di database.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { product_slug, custom_domain, source_code } = await req.json();
    if (!product_slug) return json({ error: "product_slug wajib diisi." }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: product } = await supabase.from("products").select("price, is_active")
      .eq("slug", product_slug).eq("is_active", true).single();
    if (!product) return json({ error: "Paket tidak ditemukan." }, 404);

    const price = Number(product.price);
    const items = buildAddonItems(price, {
      custom_domain: custom_domain ? { has_domain: true } : null,
      source_code: !!source_code,
    });
    return json({ package_price: price, items, ...calcTotals(price, items) });
  } catch (err) {
    console.error(err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
});
