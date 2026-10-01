import { supabase } from './supabaseClient.js';

// Untuk semua halaman public/admin/* (kecuali login). Hanya role 'admin' aktif yang boleh masuk; Super Admin punya panel sendiri.
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return toLogin();
  const { data: admin } = await supabase
    .from('admins').select('id, full_name, role, is_active')
    .eq('auth_user_id', session.user.id).single();
  if (!admin || !admin.is_active || admin.role !== 'admin') {
    await supabase.auth.signOut();
    return toLogin(admin?.role === 'super_admin'
      ? 'Akun Super Admin tidak bisa masuk panel Admin. Gunakan halaman login Super Admin.'
      : 'Akun ini tidak memiliki akses Admin.');
  }
  return { session, admin };
}

function toLogin(message) {
  window.location.href = '/admin/login.html' + (message ? `?error=${encodeURIComponent(message)}` : '');
  return null;
}

export function initShell(admin) {
  document.getElementById('ad-name').textContent = admin.full_name;
  document.getElementById('ad-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login.html';
  });
}

// Panggil Edge Function dengan JWT admin (bukan anon key).
export async function callFn(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await import('../../config/env.js');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Permintaan gagal.');
  return data;
}
