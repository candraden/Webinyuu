import { corsHeaders, json, requireAdmin, serviceClient } from "../_shared/admin.ts";
import { CUSTOM_DOMAIN_FEE, SOURCE_CODE_RATE } from "../_shared/pricing.ts";

// Add-on & kasus khusus per order (khusus Admin yang menangani order):
// add_addon, update_domain, update_source_code, upgrade_package, update_maintenance.

// Status order yang masih boleh menambah tagihan. PAID (sudah lunas, tinggal diserahkan) dan status final tidak.
const BILLABLE = ["DP_PAID", "IN_PROGRESS", "PREVIEW", "REVISION", "WAITING_SETTLEMENT"];

const DOMAIN_FLOW: Record<string, string[]> = {
  needs_purchase: ["DOMAIN_REQUESTED", "DOMAIN_PURCHASE_PENDING", "DOMAIN_REGISTERED", "DNS_PENDING", "DNS_CONFIGURED", "DOMAIN_VERIFYING", "DOMAIN_CONNECTED", "DOMAIN_ERROR"],
  has_domain: ["CUSTOMER_DOMAIN", "DNS_PENDING", "DNS_CONFIGURED", "DOMAIN_VERIFYING", "DOMAIN_CONNECTED", "DOMAIN_ERROR"],
};
const MAINT_NEXT: Record<string, string[]> = {
  MAINTENANCE_REQUESTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["APPROVED", "ADDITIONAL_REQUEST"],
  APPROVED: ["IN_PROGRESS"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: [],
  ADDITIONAL_REQUEST: [],
};

const ORDER_COLS = "id, order_status, payment_status, product_id, total_amount, additional_charges, paid_amount, assigned_admin_id";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(req, supabase);
    if (auth.error) return auth.error;
    const admin = auth.admin!;

    const body = await req.json();
    const { action } = body;

    // Cari order (dari order_id, atau dari id maintenance request), lalu pastikan milik admin ini.
    let orderId: string | undefined = body.order_id;
    let maint: Record<string, any> | null = null;
    if (action === "update_maintenance") {
      const { data } = await supabase.from("maintenance_requests").select("*").eq("id", body.request_id).single();
      if (!data) return json({ error: "Laporan tidak ditemukan." }, 404);
      maint = data;
      orderId = data.order_id;
    }
    if (!orderId) return json({ error: "order_id wajib diisi." }, 400);

    const { data: order } = await supabase.from("orders").select(ORDER_COLS).eq("id", orderId).single();
    if (!order) return json({ error: "Order tidak ditemukan." }, 404);
    if (order.assigned_admin_id !== admin.id) return json({ error: "Order ini bukan tugasmu." }, 403);

    const history = (note: string) => supabase.from("order_status_history").insert({
      order_id: orderId, from_status: order.order_status, to_status: order.order_status, changed_by: admin.id, note,
    });

    // Tambah tagihan ke order + sesuaikan status pembayaran.
    const addCharge = async (delta: number, extra: Record<string, unknown> = {}) => {
      const total = Number(order.total_amount) + delta;
      const patch: Record<string, unknown> = {
        total_amount: total,
        additional_charges: Number(order.additional_charges) + delta,
        remaining_amount: total - Number(order.paid_amount),
        ...extra,
      };
      if (order.payment_status === "FULLY_PAID") patch.payment_status = "DP_PAID";
      const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
      return error;
    };

    // ---------------------------------------------------------------- add_addon
    if (action === "add_addon") {
      if (!BILLABLE.includes(order.order_status)) return json({ error: "Tambahan tagihan hanya bisa saat order sedang berjalan (belum lunas/selesai)." }, 409);

      if (body.addon === "custom_domain") {
        const name = String(body.domain_name ?? "").trim().slice(0, 120);
        if (!name) return json({ error: "Nama domain wajib diisi." }, 400);
        const { count } = await supabase.from("custom_domains").select("id", { count: "exact", head: true }).eq("order_id", orderId);
        if (count) return json({ error: "Order ini sudah punya custom domain." }, 409);

        const hasDomain = !!body.has_domain;
        const err = await addCharge(CUSTOM_DOMAIN_FEE);
        if (err) { console.error(err); return json({ error: "Gagal menambah tagihan." }, 500); }
        await supabase.from("order_addons").insert({ order_id: orderId, addon_type: "custom_domain", quantity: 1, unit_price: CUSTOM_DOMAIN_FEE, total_price: CUSTOM_DOMAIN_FEE, note: `Domain: ${name}`, created_by: admin.id });
        await supabase.from("custom_domains").insert({
          order_id: orderId, ownership_case: hasDomain ? "has_domain" : "needs_purchase", domain_name: name,
          status: hasDomain ? "CUSTOMER_DOMAIN" : "DOMAIN_REQUESTED",
        });
        await history(`Ditambahkan: Custom Domain (${name}), biaya konfigurasi Rp${CUSTOM_DOMAIN_FEE.toLocaleString("id-ID")}.`);
        return json({ ok: true });
      }

      if (body.addon === "source_code") {
        const { count } = await supabase.from("source_code_requests").select("id", { count: "exact", head: true }).eq("order_id", orderId);
        if (count) return json({ error: "Order ini sudah punya permintaan source code." }, 409);
        const { data: prod } = await supabase.from("products").select("price").eq("id", order.product_id).single();
        const price = Math.round(Number(prod?.price ?? 0) * SOURCE_CODE_RATE);
        const err = await addCharge(price);
        if (err) { console.error(err); return json({ error: "Gagal menambah tagihan." }, 500); }
        await supabase.from("order_addons").insert({ order_id: orderId, addon_type: "source_code", quantity: 1, unit_price: price, total_price: price, note: "Source code (50% harga paket)", created_by: admin.id });
        await supabase.from("source_code_requests").insert({ order_id: orderId, price, status: "requested" });
        await history(`Ditambahkan: Source Code, Rp${price.toLocaleString("id-ID")}.`);
        return json({ ok: true });
      }
      return json({ error: "addon tidak dikenali." }, 400);
    }

    // ------------------------------------------------------------ update_domain
    if (action === "update_domain") {
      const { data: d } = await supabase.from("custom_domains").select("*").eq("order_id", orderId).single();
      if (!d) return json({ error: "Order ini tidak punya custom domain." }, 404);

      const patch: Record<string, unknown> = {};
      const status = body.status ?? d.status;
      if (!DOMAIN_FLOW[d.ownership_case].includes(status)) return json({ error: "Status tidak sesuai alur domain ini." }, 400);
      patch.status = status;
      if (body.domain_name !== undefined) patch.domain_name = String(body.domain_name).trim().slice(0, 120) || null;
      if (body.registrar !== undefined) patch.registrar = String(body.registrar).trim().slice(0, 80) || null;
      if (body.notes !== undefined) patch.notes = String(body.notes).trim().slice(0, 1000) || null;
      if (body.domain_price !== undefined) {
        const n = body.domain_price === "" || body.domain_price === null ? null : Number(body.domain_price);
        if (n !== null && (!Number.isFinite(n) || n < 0)) return json({ error: "Harga domain tidak valid." }, 400);
        patch.domain_price = n;
      }
      if (status === "DOMAIN_CONNECTED") {
        const name = (patch.domain_name ?? d.domain_name) as string | null;
        const reg = (patch.registrar ?? d.registrar) as string | null;
        if (!name || !reg) return json({ error: "Sebelum DOMAIN_CONNECTED, nama domain dan registrar wajib tercatat (checklist SOP)." }, 400);
        patch.connected_at = new Date().toISOString();
      }
      const { error } = await supabase.from("custom_domains").update(patch).eq("id", d.id);
      if (error) { console.error(error); return json({ error: "Gagal menyimpan domain." }, 500); }
      if (status !== d.status) await history(`Status domain: ${d.status} → ${status}.`);
      return json({ ok: true });
    }

    // ------------------------------------------------------- update_source_code
    if (action === "update_source_code") {
      const { data: r } = await supabase.from("source_code_requests").select("*").eq("order_id", orderId).single();
      if (!r) return json({ error: "Order ini tidak punya permintaan source code." }, 404);
      if (!["requested", "paid", "delivered"].includes(body.status)) return json({ error: "Status tidak valid." }, 400);
      if (body.status === "delivered" && order.payment_status !== "FULLY_PAID") {
        return json({ error: "Source code baru bisa diserahkan setelah pembayaran lunas." }, 409);
      }
      const { error } = await supabase.from("source_code_requests").update({
        status: body.status, delivered_at: body.status === "delivered" ? new Date().toISOString() : null,
      }).eq("id", r.id);
      if (error) { console.error(error); return json({ error: "Gagal menyimpan." }, 500); }
      if (body.status !== r.status) await history(`Status source code: ${r.status} → ${body.status}.`);
      return json({ ok: true });
    }

    // ---------------------------------------------------------- upgrade_package
    if (action === "upgrade_package") {
      if (!BILLABLE.includes(order.order_status)) return json({ error: "Upgrade hanya bisa saat order sedang berjalan (belum lunas/selesai)." }, 409);
      const { data: from } = await supabase.from("products").select("id, name, price").eq("id", order.product_id).single();
      const { data: to } = await supabase.from("products").select("id, name, price, revision_limit, is_active").eq("id", body.to_product_id).single();
      if (!from || !to || !to.is_active) return json({ error: "Paket tujuan tidak tersedia." }, 404);
      const diff = Number(to.price) - Number(from.price);
      if (diff <= 0) return json({ error: "Upgrade hanya ke paket yang lebih tinggi." }, 400);

      const { data: ord } = await supabase.from("orders").select("revision_used").eq("id", orderId).single();
      const total = Number(order.total_amount) + diff;
      const patch: Record<string, unknown> = {
        product_id: to.id, revision_limit: to.revision_limit,
        subtotal: Number(to.price), total_amount: total, remaining_amount: total - Number(order.paid_amount),
      };
      if (order.payment_status === "FULLY_PAID") patch.payment_status = "DP_PAID";
      const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
      if (error) { console.error(error); return json({ error: "Gagal upgrade paket." }, 500); }

      await supabase.from("order_package_upgrades").insert({
        order_id: orderId, from_product_id: from.id, to_product_id: to.id, price_difference: diff,
        revision_used_before: ord?.revision_used ?? 0, new_revision_limit: to.revision_limit,
      });
      await history(`Upgrade paket: ${from.name} → ${to.name}, selisih Rp${diff.toLocaleString("id-ID")}.`);
      return json({ ok: true, price_difference: diff });
    }

    // -------------------------------------------------------- update_maintenance
    if (action === "update_maintenance" && maint) {
      const patch: Record<string, unknown> = {};
      const status = body.status ?? maint.status;
      if (status !== maint.status && !(MAINT_NEXT[maint.status] || []).includes(status)) {
        return json({ error: `Status tidak bisa diubah dari ${maint.status} ke ${status}.` }, 409);
      }
      patch.status = status;

      let category = body.category !== undefined ? (body.category || null) : maint.category;
      if (category && !["maintenance", "additional_request"].includes(category)) return json({ error: "Kategori tidak valid." }, 400);
      if (status === "ADDITIONAL_REQUEST") category = "additional_request";
      const severe = typeof body.is_severe_downtime === "boolean" ? body.is_severe_downtime : maint.is_severe_downtime;

      // Aturan SOP: di luar 7 hari, hanya website down total (kesalahan Webinyuu) yang tetap gratis.
      if (category === "maintenance" && maint.is_within_period === false && !severe) {
        return json({ error: "Di luar 7 hari, hanya website down total yang gratis. Klasifikasikan sebagai Additional Request." }, 400);
      }
      if (["APPROVED", "IN_PROGRESS", "RESOLVED"].includes(status) && category !== "maintenance") {
        return json({ error: "Tentukan kategori Maintenance dulu sebelum menyetujui/mengerjakan." }, 400);
      }
      patch.category = category;
      patch.is_severe_downtime = severe;
      if (body.admin_note !== undefined) patch.admin_note = String(body.admin_note).trim().slice(0, 1000) || null;
      if (status === "RESOLVED") patch.resolved_at = new Date().toISOString();

      const { error } = await supabase.from("maintenance_requests").update(patch).eq("id", maint.id);
      if (error) { console.error(error); return json({ error: "Gagal menyimpan laporan." }, 500); }
      if (status !== maint.status) await history(`Maintenance: ${maint.status} → ${status}.`);
      return json({ ok: true });
    }

    return json({ error: "action tidak dikenali." }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
});
