import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Brief tidak punya baris di product_asset_limits (skema tidak mendefinisikannya),
// jadi dipagari dengan batas wajar yang sama untuk semua paket.
const BRIEF_MAX_MB = 10;
const BRIEF_FORMATS = ["pdf", "doc", "docx"];

function extOf(fileName: string) {
  return (fileName.split(".").pop() || "").toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action, order_id } = body;

    if (!action || !order_id) {
      return jsonResponse({ error: "action dan order_id wajib diisi." }, 400);
    }

    // Order harus ada dan belum final (mencegah upload/perubahan susulan pada order lama).
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, product_id, order_status")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Order tidak ditemukan." }, 404);
    }
    if (order.order_status !== "WAITING_PAYMENT") {
      return jsonResponse({ error: "Order ini sudah tidak menerima perubahan asset." }, 409);
    }

    // --- ACTION: minta signed URL untuk upload ---
    if (action === "get_upload_url") {
      const { asset_type, file_name } = body;
      if (!asset_type || !file_name) {
        return jsonResponse({ error: "asset_type dan file_name wajib diisi." }, 400);
      }

      const ext = extOf(file_name);

      if (asset_type === "brief") {
        if (!BRIEF_FORMATS.includes(ext)) {
          return jsonResponse({ error: `Format brief harus salah satu dari: ${BRIEF_FORMATS.join(", ")}.` }, 400);
        }
        const { count } = await supabase.from("order_briefs")
          .select("id", { count: "exact", head: true }).eq("order_id", order_id);
        if ((count || 0) >= 1) {
          return jsonResponse({ error: "Brief untuk order ini sudah pernah diupload." }, 409);
        }
      } else {
        const { data: limit } = await supabase.from("product_asset_limits")
          .select("*").eq("product_id", order.product_id).eq("asset_type", asset_type).single();
        if (!limit) {
          return jsonResponse({ error: "Paket ini tidak memerlukan jenis asset tersebut." }, 400);
        }
        if (limit.allowed_formats?.length && !limit.allowed_formats.includes(ext)) {
          return jsonResponse({ error: `Format tidak diizinkan. Format yang diterima: ${limit.allowed_formats.join(", ")}.` }, 400);
        }
        const { count } = await supabase.from("order_assets")
          .select("id", { count: "exact", head: true }).eq("order_id", order_id).eq("asset_type", asset_type);
        if ((count || 0) >= limit.max_count) {
          return jsonResponse({ error: `Jumlah file untuk jenis ini sudah mencapai batas maksimal (${limit.max_count}).` }, 409);
        }
      }

      const bucket = asset_type === "brief" ? "briefs" : "order-assets";
      const randomSuffix = crypto.randomUUID().slice(0, 8);
      const path = `${order_id}/${asset_type}-${randomSuffix}.${ext}`;

      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
      if (error || !data) {
        console.error(error);
        return jsonResponse({ error: "Gagal membuat signed URL." }, 500);
      }

      return jsonResponse({ bucket, path: data.path, token: data.token });
    }

    // --- ACTION: konfirmasi upload sukses, catat ke database ---
    if (action === "confirm_upload") {
      const { asset_type, path, original_file_name, file_size_bytes, mime_type, duration_seconds, description } = body;

      if (!asset_type || !path || !original_file_name) {
        return jsonResponse({ error: "Data konfirmasi upload tidak lengkap." }, 400);
      }
      // path selalu dibentuk sebagai `${order_id}/...` di get_upload_url; tolak kalau tidak cocok
      // supaya klien tidak bisa mengonfirmasi path milik order lain.
      if (!path.startsWith(`${order_id}/`)) {
        return jsonResponse({ error: "Path file tidak valid untuk order ini." }, 400);
      }

      const ext = extOf(original_file_name);
      const sizeBytes = Number(file_size_bytes) || 0;

      if (asset_type === "brief") {
        if (!BRIEF_FORMATS.includes(ext)) {
          return jsonResponse({ error: `Format brief harus salah satu dari: ${BRIEF_FORMATS.join(", ")}.` }, 400);
        }
        if (sizeBytes > BRIEF_MAX_MB * 1024 * 1024) {
          return jsonResponse({ error: `Ukuran brief maksimal ${BRIEF_MAX_MB}MB.` }, 400);
        }
        const { count } = await supabase.from("order_briefs")
          .select("id", { count: "exact", head: true }).eq("order_id", order_id);
        if ((count || 0) >= 1) {
          return jsonResponse({ error: "Brief untuk order ini sudah pernah diupload." }, 409);
        }

        const { error } = await supabase.from("order_briefs").insert({
          order_id, file_name: original_file_name, file_url: path,
        });
        if (error) { console.error(error); return jsonResponse({ error: "Gagal menyimpan data brief." }, 500); }
        return jsonResponse({ success: true });
      }

      const { data: limit } = await supabase.from("product_asset_limits")
        .select("*").eq("product_id", order.product_id).eq("asset_type", asset_type).single();
      if (!limit) {
        return jsonResponse({ error: "Paket ini tidak memerlukan jenis asset tersebut." }, 400);
      }
      if (limit.allowed_formats?.length && !limit.allowed_formats.includes(ext)) {
        return jsonResponse({ error: `Format tidak diizinkan. Format yang diterima: ${limit.allowed_formats.join(", ")}.` }, 400);
      }
      if (limit.max_file_size_mb && sizeBytes > limit.max_file_size_mb * 1024 * 1024) {
        return jsonResponse({ error: `Ukuran file maksimal ${limit.max_file_size_mb}MB.` }, 400);
      }
      // duration_seconds hanya divalidasi kalau klien mengirimkannya — Edge Function tidak
      // memproses isi video, jadi ini bukan jaminan penuh, hanya lapisan tambahan.
      if (limit.max_duration_seconds && duration_seconds && Number(duration_seconds) > limit.max_duration_seconds) {
        return jsonResponse({ error: `Durasi video maksimal ${limit.max_duration_seconds} detik.` }, 400);
      }

      // Cek ulang tepat sebelum insert untuk redam race condition (dua upload nyaris bersamaan).
      const { count } = await supabase.from("order_assets")
        .select("id", { count: "exact", head: true }).eq("order_id", order_id).eq("asset_type", asset_type);
      if ((count || 0) >= limit.max_count) {
        return jsonResponse({ error: `Jumlah file untuk jenis ini sudah mencapai batas maksimal (${limit.max_count}).` }, 409);
      }

      const { error } = await supabase.from("order_assets").insert({
        order_id,
        asset_type,
        original_file_name,
        stored_file_name: path.split("/").pop(),
        file_url: path,
        file_size_bytes: sizeBytes,
        mime_type: mime_type || "application/octet-stream",
        duration_seconds: duration_seconds ? Number(duration_seconds) : null,
        description: description || null,
      });
      if (error) { console.error(error); return jsonResponse({ error: "Gagal menyimpan data asset." }, 500); }
      return jsonResponse({ success: true });
    }

    // --- ACTION: cek batas minimum terpenuhi sebelum order dianggap lengkap ---
    if (action === "finalize_order") {
      const missing: string[] = [];

      const { count: briefCount } = await supabase.from("order_briefs")
        .select("id", { count: "exact", head: true }).eq("order_id", order_id);
      if ((briefCount || 0) < 1) missing.push("Brief wajib diupload.");

      const { data: limits } = await supabase.from("product_asset_limits")
        .select("asset_type, min_count").eq("product_id", order.product_id);

      for (const limit of limits || []) {
        if (limit.min_count <= 0) continue;
        const { count } = await supabase.from("order_assets")
          .select("id", { count: "exact", head: true }).eq("order_id", order_id).eq("asset_type", limit.asset_type);
        if ((count || 0) < limit.min_count) {
          missing.push(`${limit.asset_type} minimal ${limit.min_count} file (baru ${count || 0}).`);
        }
      }

      if (missing.length) return jsonResponse({ error: "Asset belum lengkap.", missing }, 400);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "action tidak dikenali." }, 400);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Terjadi kesalahan server." }, 500);
  }
});