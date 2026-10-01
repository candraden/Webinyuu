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
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// Validasi JWT pemanggil lalu pastikan dia admin/super admin aktif. Return admin row atau null.
export async function requireAdmin(req: Request, supabase: ReturnType<typeof serviceClient>) {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: admin } = await supabase
    .from("admins")
    .select("id, full_name, role, is_active")
    .eq("auth_user_id", user.id)
    .single();
  return admin && admin.is_active ? admin : null;
}
