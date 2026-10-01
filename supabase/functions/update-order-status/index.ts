import { corsHeaders, json, requireAdmin, serviceClient } from "../_shared/admin.ts";

// Harus sama dengan NEXT di public/js/modules/adminOrderDetail.js.
// WAITING_SETTLEMENT -> PAID hanya lewat verify-payment (otomatis saat lunas).
const ALLOWED: Record<string, string[]> = {
  WAITING_PAYMENT: ["CANCELLED"],
  DP_PAID: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["PREVIEW", "CANCELLED"],
  PREVIEW: ["REVISION", "WAITING_SETTLEMENT", "COMPLETED_UNRESPONSIVE"],
  REVISION: ["PREVIEW"],
  WAITING_SETTLEMENT: ["COMPLETED_UNRESPONSIVE", "CANCELLED"],
  PAID: ["COMPLETED"],
  // Hanya untuk order yang dibatalkan otomatis (dicek di bawah).
  CANCELLED: ["WAITING_PAYMENT"],
};
const EXTRA_REVISION_FEE = 5000; // Rp5.000/batch di luar jatah paket

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(req, supabase);
    if (auth.error) return auth.error;
    const admin = auth.admin!;

    const { order_id, to_status, note, result_url, revision_description } = await req.json();
    if (!order_id || !to_status) return json({ error: "order_id dan to_status wajib diisi." }, 400);

    const { data: o } = await supabase.from("orders")
      .select("id, order_status, payment_status, revision_used, revision_limit, total_amount, paid_amount, assigned_admin_id")
      .eq("id", order_id).single();
    if (!o) return json({ error: "Order tidak ditemukan." }, 404);
    if (o.assigned_admin_id !== admin.id) return json({ error: "Order ini bukan tugasmu." }, 403);
    if (!(ALLOWED[o.order_status] || []).includes(to_status)) {
      return json({ error: `Status tidak bisa diubah dari ${o.order_status} ke ${to_status}.` }, 409);
    }
    if (to_status === "COMPLETED" && (o.payment_status !== "FULLY_PAID" || !result_url)) {
      return json({ error: "Menyelesaikan order butuh pembayaran lunas dan link hasil." }, 400);
    }
    if (to_status === "REVISION" && !revision_description) {
      return json({ error: "Isi rangkuman revisi di kolom catatan." }, 400);
    }

    const patch: Record<string, unknown> = { order_status: to_status };
    if (to_status === "COMPLETED") { patch.result_url = result_url; patch.published_at = new Date().toISOString(); }

    // Aktifkan kembali: hanya order yang dibatalkan OTOMATIS (bukan dibatalkan manual admin).
    if (o.order_status === "CANCELLED") {
      const { data: last } = await supabase.from("order_status_history").select("note")
        .eq("order_id", order_id).eq("to_status", "CANCELLED").order("created_at", { ascending: false }).limit(1).single();
      if (!last?.note?.startsWith("Batal otomatis")) {
        return json({ error: "Hanya order yang batal otomatis yang bisa diaktifkan kembali." }, 409);
      }
      patch.payment_deadline_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    if (to_status === "REVISION") {
      const n = o.revision_used + 1;
      const chargeable = o.revision_used >= o.revision_limit;
      const { error } = await supabase.from("revisions").insert({
        order_id, revision_number: n, batch_description: revision_description, status: "in_progress",
        is_chargeable: chargeable, charge_amount: chargeable ? EXTRA_REVISION_FEE : 0,
      });
      if (error) { console.error(error); return json({ error: "Gagal mencatat revisi." }, 500); }
      patch.revision_used = n;
      if (chargeable) {
        await supabase.from("order_addons").insert({
          order_id, addon_type: "extra_revision", quantity: 1, unit_price: EXTRA_REVISION_FEE,
          total_price: EXTRA_REVISION_FEE, note: `Revisi ke-${n}`, created_by: admin.id,
        });
        const total = Number(o.total_amount) + EXTRA_REVISION_FEE;
        patch.total_amount = total;
        patch.remaining_amount = total - Number(o.paid_amount);
        if (o.payment_status === "FULLY_PAID") patch.payment_status = "DP_PAID";
      }
    }
    if (o.order_status === "REVISION" && to_status === "PREVIEW") {
      await supabase.from("revisions").update({ status: "done", resolved_at: new Date().toISOString() })
        .eq("order_id", order_id).eq("status", "in_progress");
    }

    const { error } = await supabase.from("orders").update(patch).eq("id", order_id);
    if (error) { console.error(error); return json({ error: "Gagal mengubah status." }, 500); }

    await supabase.from("order_status_history").insert({
      order_id, from_status: o.order_status, to_status, changed_by: admin.id, note: note || null,
    });
    return json({ order_status: to_status });
  } catch (err) {
    console.error(err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
});
