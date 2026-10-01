import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_OPEN = 5;

// Publik (lewat tracking token): customer melaporkan masalah pada website yang sudah diserahkan.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { tracking_token, description } = await req.json();
    const text = String(description ?? "").trim();
    if (!tracking_token) return json({ error: "Token tidak valid." }, 400);
    if (text.length < 10) return json({ error: "Jelaskan masalahnya minimal 10 karakter." }, 400);
    if (text.length > 1000) return json({ error: "Deskripsi maksimal 1000 karakter." }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order } = await supabase.from("orders")
      .select("id, order_status, published_at, updated_at").eq("tracking_token", tracking_token).single();
    if (!order) return json({ error: "Pesanan tidak ditemukan." }, 404);
    if (order.order_status !== "COMPLETED") return json({ error: "Laporan hanya bisa dikirim setelah website diserahkan." }, 409);

    const { count } = await supabase.from("maintenance_requests").select("id", { count: "exact", head: true })
      .eq("order_id", order.id).in("status", ["MAINTENANCE_REQUESTED", "UNDER_REVIEW", "APPROVED", "IN_PROGRESS"]);
    if ((count || 0) >= MAX_OPEN) return json({ error: "Masih ada beberapa laporan yang sedang diproses. Tunggu admin menyelesaikannya dulu." }, 429);

    // Patokan 7 hari = waktu LAPOR (SOP Maintenance), dihitung sejak website diserahkan.
    const start = new Date(order.published_at ?? order.updated_at).getTime();
    const within = Date.now() <= start + WINDOW_MS;

    const { error } = await supabase.from("maintenance_requests").insert({
      order_id: order.id, description: text, is_within_period: within,
    });
    if (error) { console.error(error); return json({ error: "Gagal mengirim laporan." }, 500); }
    return json({ ok: true, is_within_period: within }, 201);
  } catch (err) {
    console.error(err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
});
