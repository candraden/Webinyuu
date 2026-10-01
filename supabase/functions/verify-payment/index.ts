import { corsHeaders, json, requireAdmin, serviceClient } from "../_shared/admin.ts";

const TYPES = ["dp", "settlement", "additional", "late_fee", "tip"];
const FINAL = ["CANCELLED", "COMPLETED", "COMPLETED_UNRESPONSIVE"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(req, supabase);
    if (auth.error) return auth.error;
    const admin = auth.admin!;

    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();
    let orderId = body.order_id as string;
    let pending: { id: string; amount: number; payment_type: string; order_id: string; status: string } | null = null;

    if (action === "verify" || action === "reject") {
      const { data } = await supabase.from("payments").select("id, amount, payment_type, order_id, status").eq("id", body.payment_id).single();
      if (!data || data.status !== "pending") return json({ error: "Pembayaran tidak ditemukan atau sudah diproses." }, 404);
      pending = data; orderId = data.order_id;
    } else if (action !== "record") {
      return json({ error: "action harus record, verify, atau reject." }, 400);
    }

    const { data: order } = await supabase.from("orders")
      .select("id, order_status, total_amount, dp_amount, assigned_admin_id").eq("id", orderId).single();
    if (!order) return json({ error: "Order tidak ditemukan." }, 404);
    if (order.assigned_admin_id !== admin.id) return json({ error: "Order ini bukan tugasmu." }, 403);
    if (FINAL.includes(order.order_status)) return json({ error: "Order sudah berstatus final." }, 409);

    if (action === "reject") {
      await supabase.from("payments").update({ status: "rejected", verified_by: admin.id, verified_at: now }).eq("id", pending!.id);
      return json({ ok: true });
    }

    // Total sah sebelum transaksi ini (tip tidak menghitung ke tagihan).
    const { data: prev } = await supabase.from("payments").select("amount")
      .eq("order_id", orderId).eq("status", "verified").neq("payment_type", "tip");
    const already = (prev || []).reduce((s, p) => s + Number(p.amount), 0);
    const total = Number(order.total_amount);

    const type = pending ? pending.payment_type : body.payment_type;
    const amt = pending ? Number(pending.amount) : Number(body.amount);
    if (!TYPES.includes(type) || !(amt > 0)) return json({ error: "payment_type / amount tidak valid." }, 400);

    // Kelebihan dari sisa tagihan dicatat sebagai tip (Business Rules §7).
    const applied = type === "tip" ? 0 : Math.min(amt, Math.max(total - already, 0));
    const tip = type === "tip" ? amt : amt - applied;
    const stamp = { status: "verified", verified_by: admin.id, verified_at: now };

    if (pending) {
      if (applied > 0) await supabase.from("payments").update({ ...stamp, amount: applied }).eq("id", pending.id);
      else await supabase.from("payments").update({ ...stamp, payment_type: "tip" }).eq("id", pending.id);
      if (applied > 0 && tip > 0) await supabase.from("payments").insert({ order_id: orderId, payment_type: "tip", amount: tip, note: "Kelebihan pembayaran", ...stamp });
    } else {
      const rows = [];
      if (applied > 0) rows.push({ order_id: orderId, payment_type: type, amount: applied, note: body.note || null, ...stamp });
      if (tip > 0) rows.push({ order_id: orderId, payment_type: "tip", amount: tip, note: type === "tip" ? body.note || null : "Kelebihan pembayaran", ...stamp });
      const { error } = await supabase.from("payments").insert(rows);
      if (error) { console.error(error); return json({ error: "Gagal mencatat pembayaran." }, 500); }
    }

    const paid = already + applied;
    const paymentStatus = paid >= total ? "FULLY_PAID" : paid >= Number(order.dp_amount) ? "DP_PAID" : "UNPAID";
    let next = order.order_status;
    if (next === "WAITING_PAYMENT" && paymentStatus !== "UNPAID") next = "DP_PAID";
    if (next === "WAITING_SETTLEMENT" && paymentStatus === "FULLY_PAID") next = "PAID";

    const { error: upd } = await supabase.from("orders").update({
      paid_amount: paid, remaining_amount: total - paid, payment_status: paymentStatus, order_status: next,
    }).eq("id", orderId);
    if (upd) { console.error(upd); return json({ error: "Gagal memperbarui order." }, 500); }

    if (next !== order.order_status) {
      await supabase.from("order_status_history").insert({
        order_id: orderId, from_status: order.order_status, to_status: next,
        changed_by: admin.id, note: "Pembayaran terverifikasi.",
      });
    }
    return json({ payment_status: paymentStatus, order_status: next, paid_amount: paid, tip });
  } catch (err) {
    console.error(err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
});
