import { corsHeaders, json, requireAdmin, serviceClient } from "../_shared/admin.ts";

const BAN_FOREVER = "876000h";
const validPassword = (p: unknown) => typeof p === "string" && p.length >= 8;
const validEmail = (e: unknown) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const FINAL_STATUSES = ["COMPLETED", "COMPLETED_UNRESPONSIVE", "CANCELLED"];

// Jumlah order aktif (belum final) per admin.
async function activeOrderCounts(supabase: ReturnType<typeof serviceClient>, onlyAdminId?: string) {
  let q = supabase.from("orders").select("assigned_admin_id")
    .not("assigned_admin_id", "is", null)
    .not("order_status", "in", `(${FINAL_STATUSES.join(",")})`);
  if (onlyAdminId) q = q.eq("assigned_admin_id", onlyAdminId);
  const { data } = await q;
  const counts = new Map<string, number>();
  for (const r of data || []) counts.set(r.assigned_admin_id, (counts.get(r.assigned_admin_id) || 0) + 1);
  return counts;
}

// Normalisasi nomor HP ke format 62xxxxxxxxxx. Return null jika tidak valid.
function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^62[0-9]{8,13}$/.test(d) ? d : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(req, supabase, ["super_admin"]);
    if (auth.error) return auth.error;
    const me = auth.admin!;

    const body = await req.json();
    const { action } = body;

    // Pastikan setelah perubahan masih ada minimal 1 super admin aktif selain target.
    async function hasOtherSuperAdmin(exceptId: string) {
      const { count } = await supabase.from("admins").select("id", { count: "exact", head: true })
        .eq("role", "super_admin").eq("is_active", true).neq("id", exceptId);
      return (count || 0) > 0;
    }

    if (action === "list") {
      const { data: admins, error } = await supabase.from("admins")
        .select("id, auth_user_id, full_name, phone, role, is_active, created_at").order("created_at");
      if (error) return json({ error: "Gagal memuat admin." }, 500);
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const emails = new Map((users?.users || []).map((u) => [u.id, u.email]));
      const counts = await activeOrderCounts(supabase);
      return json({ admins: admins!.map((a) => ({ ...a, email: emails.get(a.auth_user_id) || "-", active_orders: counts.get(a.id) || 0 })) });
    }

    if (action === "create") {
      const { password, full_name, role } = body;
      const email = String(body.email ?? "").trim();
      if (!validEmail(email) || !full_name || !["admin", "super_admin"].includes(role)) return json({ error: "Nama, email, dan role wajib valid." }, 400);
      if (!validPassword(password)) return json({ error: "Password minimal 8 karakter." }, 400);
      const hasPhone = String(body.phone ?? "").trim() !== "";
      const phone = hasPhone ? normalizePhone(body.phone) : null;
      if (hasPhone && !phone) return json({ error: "Nomor HP tidak valid. Contoh: 081234567890." }, 400);
      if (role === "admin" && !phone) return json({ error: "Nomor HP wajib diisi untuk Admin (dipakai di invoice customer)." }, 400);

      const { data: created, error: authErr } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
      if (authErr || !created.user) return json({ error: authErr?.message?.includes("already") ? "Email sudah terdaftar." : "Gagal membuat akun login." }, 400);

      const { error: insErr } = await supabase.from("admins").insert({ auth_user_id: created.user.id, full_name: String(full_name).trim(), phone, role });
      if (insErr) {
        console.error(insErr);
        await supabase.auth.admin.deleteUser(created.user.id); // rollback
        return json({ error: "Gagal menyimpan admin." }, 500);
      }
      return json({ ok: true }, 201);
    }

    const { admin_id } = body;
    const { data: target } = await supabase.from("admins").select("id, auth_user_id, role, is_active").eq("id", admin_id).single();
    if (!target) return json({ error: "Admin tidak ditemukan." }, 404);

    if (action === "reset_password") {
      if (!validPassword(body.password)) return json({ error: "Password minimal 8 karakter." }, 400);
      const { error } = await supabase.auth.admin.updateUserById(target.auth_user_id, { password: body.password });
      return error ? json({ error: "Gagal reset password." }, 500) : json({ ok: true });
    }

    if (action === "update") {
      const patch: Record<string, unknown> = {};
      if (typeof body.full_name === "string" && body.full_name.trim()) patch.full_name = body.full_name.trim();
      if (body.role !== undefined) {
        if (!["admin", "super_admin"].includes(body.role)) return json({ error: "Role tidak valid." }, 400);
        patch.role = body.role;
      }
      if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

      // Menonaktifkan admin / mengubah rolenya jadi non-admin saat masih memegang order aktif
      // membuat order menggantung. Minta konfirmasi (force) dulu.
      const losesOrders = (patch.is_active === false && target.is_active) ||
        (patch.role !== undefined && patch.role !== "admin" && target.role === "admin");
      if (losesOrders && body.force !== true) {
        const n = (await activeOrderCounts(supabase, target.id)).get(target.id) || 0;
        if (n > 0) {
          return json({
            error: `Admin ini masih menangani ${n} order aktif. Pindahkan dulu lewat menu Order & Penugasan agar tidak menggantung.`,
            code: "HAS_ACTIVE_ORDERS", active_orders: n,
          }, 409);
        }
      }
      if (body.phone !== undefined) {
        if (String(body.phone).trim() === "") {
          if ((patch.role ?? target.role) === "admin") return json({ error: "Nomor HP wajib diisi untuk Admin." }, 400);
          patch.phone = null;
        } else {
          const phone = normalizePhone(body.phone);
          if (!phone) return json({ error: "Nomor HP tidak valid. Contoh: 081234567890." }, 400);
          patch.phone = phone;
        }
      }
      let newEmail: string | null = null;
      if (body.email !== undefined) {
        if (!validEmail(body.email)) return json({ error: "Format email tidak valid." }, 400);
        newEmail = String(body.email).trim();
      }

      const demoting = patch.role === "admin" && target.role === "super_admin";
      const deactivating = patch.is_active === false && target.is_active;
      if (target.id === me.id && (demoting || deactivating)) {
        return json({ error: "Kamu tidak bisa menurunkan atau menonaktifkan akunmu sendiri." }, 400);
      }
      if ((demoting || deactivating) && target.role === "super_admin" && !(await hasOtherSuperAdmin(target.id))) {
        return json({ error: "Harus tersisa minimal 1 Super Admin aktif." }, 400);
      }

      if (newEmail) {
        const { data: cur } = await supabase.auth.admin.getUserById(target.auth_user_id);
        if (cur?.user?.email?.toLowerCase() !== newEmail.toLowerCase()) {
          const { error: mailErr } = await supabase.auth.admin.updateUserById(target.auth_user_id, { email: newEmail, email_confirm: true });
          if (mailErr) return json({ error: mailErr.message?.toLowerCase().includes("already") ? "Email sudah dipakai akun lain." : "Gagal mengubah email." }, 400);
        }
      }

      const { error } = await supabase.from("admins").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", target.id);
      if (error) { console.error(error); return json({ error: "Gagal menyimpan perubahan." }, 500); }
      if (typeof patch.is_active === "boolean") {
        await supabase.auth.admin.updateUserById(target.auth_user_id, { ban_duration: patch.is_active ? "none" : BAN_FOREVER });
      }
      return json({ ok: true });
    }

    return json({ error: "action tidak dikenali." }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
});
