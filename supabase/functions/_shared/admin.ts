import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Verifikasi JWT pemanggil + pastikan dia aktif dan rolenya termasuk allowedRoles.
// Default hanya 'admin' (Super Admin tidak boleh memakai fungsi panel Admin).
// Return { admin } jika valid, atau { error: Response } jika tidak.
export async function requireAdmin(
  req: Request,
  supabase: ReturnType<typeof serviceClient>,
  allowedRoles: string[] = ["admin"],
) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Belum login." }, 401) };

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return { error: json({ error: "Sesi tidak valid." }, 401) };

  const { data: admin } = await supabase
    .from("admins")
    .select("id, full_name, role, is_active")
    .eq("auth_user_id", userData.user.id)
    .single();

  if (!admin || !admin.is_active || !allowedRoles.includes(admin.role)) {
    return { error: json({ error: "Akses ditolak." }, 403) };
  }
  return { admin };
}
