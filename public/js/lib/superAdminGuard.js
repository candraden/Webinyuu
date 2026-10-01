import { supabase } from './supabaseClient.js';

// Pastikan session ada DAN baris di tabel admins berstatus role=super_admin & is_active=true.
// Dipanggil di awal setiap halaman public/super-admin/*.html (kecuali login.html).
// Return: { session, admin } jika valid. Jika tidak valid, redirect ke login.html dan reject.
export async function requireSuperAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirectToLogin();
    return null;
  }

  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, full_name, role, is_active')
    .eq('auth_user_id', session.user.id)
    .single();

  if (error || !admin || admin.role !== 'super_admin' || !admin.is_active) {
    // Akun login valid tapi bukan super admin (atau nonaktif) -> tolak akses, jangan biarkan nyangkut di panel ini.
    await supabase.auth.signOut();
    redirectToLogin('Akun ini tidak memiliki akses Super Admin.');
    return null;
  }

  return { session, admin };
}

function redirectToLogin(message) {
  const params = message ? `?error=${encodeURIComponent(message)}` : '';
  window.location.href = `/super-admin/login.html${params}`;
}

// Dipakai di tombol "Keluar" pada tiap halaman.
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/super-admin/login.html';
}

// Isi nama admin yang login & pasang handler tombol logout. Dipanggil setelah requireSuperAdmin() sukses.
export function initShell(admin) {
  const nameEl = document.getElementById('sa-admin-name');
  if (nameEl) nameEl.textContent = admin.full_name;

  const logoutBtn = document.getElementById('sa-logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}
