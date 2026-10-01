import { corsHeaders, json, requireAdmin, serviceClient } from "../_shared/admin.ts";

const FINAL = ["CANCELLED", "COMPLETED", "COMPLETED_UNRESPONSIVE"];

// Khusus Super Admin: pindahkan order ke admin lain (atau tugaskan order yang belum punya admin).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(req, supabase, ["super_admin"]);
    if (auth.error) return auth.error;
    const me = auth.admin!;

    const { order_id, admin_id } = await req.json();
    if (!order_id || !admin_id) return json({ error: "order_id dan admin_id wajib diisi." }, 400);

    const { data: target } = await supabase.from("admins")
      .select("id, full_name, role, is_active, phone").eq("id", admin_id).single();
    if (!target || target.role !== "admin" || !target.is_active) {
      return json({ error: "Admin tujuan harus berrole Admin dan aktif." }, 400);
    }
    if (!target.phone) return json({ error: "Admin tujuan belum punya nomor HP." }, 400);

    const { data: order } = await supabase.from("orders")
      .select("id, order_status, assigned_admin_id").eq("id", order_id).single();
    if (!order) return json({ error: "Order tidak ditemukan." }, 404);
    if (FINAL.includes(order.order_status)) return json({ error: "Order sudah berstatus final." }, 409);
    if (order.assigned_admin_id === target.id) return json({ ok: true, unchanged: true });

    let fromName = "belum ada admin";
    if (order.assigned_admin_id) {
      const { data: prev } = await supabase.from("admins").select("full_name").eq("id", order.assigned_admin_id).single();
      fromName = prev?.full_name ?? "admin sebelumnya";
    }

    const { error } = await supabase.from("orders")
      .update({ assigned_admin_id: target.id, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (error) { console.error(error); return json({ error: "Gagal memindahkan order." }, 500); }

    await supabase.from("order_status_history").insert({
      order_id: order.id, from_status: order.order_status, to_status: order.order_status,
      changed_by: me.id, note: `Order dipindahkan dari ${fromName} ke ${target.full_name}.`,
    });
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
});
