import { corsHeaders, json, requireAdmin, serviceClient } from "../_shared/admin.ts";

const BUCKETS = ["briefs", "order-assets", "payment-proofs"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = serviceClient();
    const auth = await requireAdmin(req, supabase);
    if (auth.error) return auth.error;
    const admin = auth.admin!;

    const { bucket, path } = await req.json();
    if (!BUCKETS.includes(bucket) || !path) return json({ error: "bucket/path tidak valid." }, 400);

    // Path selalu diawali {order_id}/ — pastikan order itu ditugaskan ke admin ini.
    const orderId = String(path).split("/")[0];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      return json({ error: "bucket/path tidak valid." }, 400);
    }
    const { data: ord } = await supabase.from("orders").select("assigned_admin_id").eq("id", orderId).single();
    if (!ord || ord.assigned_admin_id !== admin.id) return json({ error: "Order ini bukan tugasmu." }, 403);

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (error || !data) return json({ error: "Gagal membuat link file." }, 500);
    return json({ url: data.signedUrl });
  } catch (err) {
    console.error(err);
    return json({ error: "Terjadi kesalahan server." }, 500);
  }
});
