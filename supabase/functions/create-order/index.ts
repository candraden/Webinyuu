import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildAddonItems, calcTotals } from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTrackingToken(length = 32): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function isValidWhatsapp(number: string): boolean {
  return /^62\d{8,13}$/.test(number);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { product_slug, customer_name, whatsapp_number, email, business_name } = body;

    if (!product_slug || !customer_name || !whatsapp_number || !business_name) {
      return new Response(
        JSON.stringify({ error: "Field wajib belum lengkap." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanWhatsapp = String(whatsapp_number).replace(/\D/g, "");
    if (!isValidWhatsapp(cleanWhatsapp)) {
      return new Response(
        JSON.stringify({ error: "Nomor WhatsApp tidak valid. Gunakan format 62xxxxxxxxxx." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, price, revision_limit, is_active")
      .eq("slug", product_slug)
      .eq("is_active", true)
      .single();

   if (productError || !product) {
  console.error("productError:", productError);
  return new Response(
    JSON.stringify({
      error: "Paket tidak ditemukan atau sudah tidak tersedia.",
      debug: productError,
    }),
    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

    // Order harus bisa di-assign ke admin (invoice memakai nomor WA admin). Cek sebelum insert.
    const { count: availableAdmins } = await supabase
      .from("admins")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true)
      .not("phone", "is", null);
    if (!availableAdmins) {
      return new Response(
        JSON.stringify({ error: "Saat ini belum ada admin yang tersedia. Silakan coba lagi nanti." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add-on opsional (custom domain, source code). Harga selalu dihitung ulang di server.
    const rawAddons = body.addons || {};
    const domainIn = rawAddons.custom_domain;
    let domainSel: { has_domain: boolean; domain_name: string } | null = null;
    if (domainIn) {
      const domainName = String(domainIn.domain_name ?? "").trim().slice(0, 120);
      if (!domainName) {
        return new Response(
          JSON.stringify({ error: "Isi nama domain yang dimiliki atau yang diinginkan." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      domainSel = { has_domain: !!domainIn.has_domain, domain_name: domainName };
    }
    const subtotal = Number(product.price);
    const addonItems = buildAddonItems(subtotal, { custom_domain: domainSel, source_code: !!rawAddons.source_code });
    const { additional, total: totalAmount, dp: dpAmount, remaining: remainingAmount } = calcTotals(subtotal, addonItems);
    const trackingToken = generateTrackingToken();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        tracking_token: trackingToken,
        customer_name,
        whatsapp_number: cleanWhatsapp,
        email: email || null,
        business_name,
        product_id: product.id,
        subtotal,
        additional_charges: additional,
        total_amount: totalAmount,
        dp_amount: dpAmount,
        remaining_amount: remainingAmount,
        revision_limit: product.revision_limit,
      })
      .select("id, order_number, tracking_token, dp_amount, total_amount, assigned_admin_id, created_at, payment_deadline_at")
      .single();

    if (orderError || !order) {
      console.error(orderError);
      return new Response(
        JSON.stringify({ error: "Gagal membuat pesanan. Coba lagi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      from_status: null,
      to_status: "WAITING_PAYMENT",
      note: "Order dibuat oleh customer.",
    });

    for (const item of addonItems) {
      await supabase.from("order_addons").insert({
        order_id: order.id, addon_type: item.type, quantity: 1, unit_price: item.amount, total_price: item.amount,
        note: item.type === "custom_domain" ? `Domain: ${domainSel?.domain_name}` : "Diminta saat pemesanan",
      });
    }
    if (domainSel) {
      await supabase.from("custom_domains").insert({
        order_id: order.id,
        ownership_case: domainSel.has_domain ? "has_domain" : "needs_purchase",
        domain_name: domainSel.domain_name,
        status: domainSel.has_domain ? "CUSTOMER_DOMAIN" : "DOMAIN_REQUESTED",
      });
    }
    const sourceItem = addonItems.find((i) => i.type === "source_code");
    if (sourceItem) {
      await supabase.from("source_code_requests").insert({ order_id: order.id, price: sourceItem.amount, status: "requested" });
    }

    let admin: { full_name: string; phone: string } | null = null;
    if (order.assigned_admin_id) {
      const { data } = await supabase.from("admins").select("full_name, phone").eq("id", order.assigned_admin_id).single();
      admin = data;
    }
    const paymentDeadline = order.payment_deadline_at;

    return new Response(
      JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        tracking_token: order.tracking_token,
        dp_amount: order.dp_amount,
        total_amount: order.total_amount,
        admin_name: admin?.full_name ?? null,
        admin_phone: admin?.phone ?? null,
        payment_deadline: paymentDeadline,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan server." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});