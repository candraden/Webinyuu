// supabase/functions/get-order-by-token/index.ts
//
// Dipanggil dari public/js/modules/tracking.js dengan anon key.
// Pakai service_role di sisi server supaya bisa baca tabel `orders`
// walau RLS aktif, TAPI hanya mengembalikan kolom yang aman untuk
// customer (tidak expose id internal produk/admin, dsb).
//
// Deploy: supabase functions deploy get-order-by-token

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Relasi many-to-one dari PostgREST berupa objek; tipe tanpa skema terbaca array, jadi diseragamkan.
const one = <T>(v: unknown): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null)) as T | null;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { tracking_token } = await req.json();

    if (!tracking_token || typeof tracking_token !== 'string') {
      return new Response(JSON.stringify({ error: 'tracking_token wajib diisi.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        order_status,
        payment_status,
        total_amount,
        paid_amount,
        remaining_amount,
        revision_used,
        revision_limit,
        result_url,
        preview_url,
        created_at,
        payment_deadline_at,
        published_at,
        updated_at,
        products ( name ),
        admins ( full_name, phone )
      `)
      .eq('tracking_token', tracking_token)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order tidak ditemukan.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hanya kirim field yang aman/relevan untuk customer.
    const safeOrder = {
      order_number: order.order_number,
      product_name: one<{ name: string }>(order.products)?.name ?? '-',
      order_status: order.order_status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      paid_amount: order.paid_amount,
      remaining_amount: order.remaining_amount,
      revision_used: order.revision_used,
      revision_limit: order.revision_limit,
      result_url: order.result_url,
      // Link preview hanya relevan saat status Preview Siap.
      preview_url: order.order_status === 'PREVIEW' ? order.preview_url : null,
      // Admin yang menangani (dipakai invoice/tracking untuk kontak WhatsApp).
      admin_name: one<{ full_name: string; phone: string }>(order.admins)?.full_name ?? null,
      admin_phone: one<{ full_name: string; phone: string }>(order.admins)?.phone ?? null,
      // Batas bayar DP (24 jam sejak dibuat; diperpanjang jika order diaktifkan kembali).
      payment_deadline: order.payment_deadline_at,
      maintenance: null as unknown,
      pending_revision: null as unknown,
    };

    // Revisi dari customer yang masih menunggu diproses admin.
    if (order.order_status === 'PREVIEW') {
      const { data: pend } = await supabaseAdmin.from('revision_requests').select('description, created_at')
        .eq('order_id', order.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle();
      safeOrder.pending_revision = pend ?? null;
    }

    // Garansi perbaikan bug 7 hari setelah website diserahkan.
    if (order.order_status === 'COMPLETED') {
      const start = new Date(order.published_at ?? order.updated_at).getTime();
      const { data: reqs } = await supabaseAdmin
        .from('maintenance_requests')
        .select('description, status, category, is_within_period, reported_at')
        .eq('order_id', order.id)
        .order('reported_at', { ascending: false })
        .limit(20);
      safeOrder.maintenance = {
        active_until: new Date(start + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: Date.now() <= start + 7 * 24 * 60 * 60 * 1000,
        requests: reqs ?? [],
      };
    }

    return new Response(JSON.stringify({ order: safeOrder }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan server.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});