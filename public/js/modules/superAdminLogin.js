import { supabase } from '../lib/supabaseClient.js';

const form = document.getElementById('login-form');
const errorEl = document.getElementById('login-error');
const submitBtn = document.getElementById('btn-submit');

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

// Kalau ada pesan error dari redirect (misal ditolak karena bukan super admin)
const params = new URLSearchParams(window.location.search);
if (params.get('error')) showError(params.get('error'));

// Kalau session sudah ada & valid super admin, langsung lempar ke dashboard produk.
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: admin } = await supabase
    .from('admins')
    .select('role, is_active')
    .eq('auth_user_id', session.user.id)
    .single();

  if (admin && admin.role === 'super_admin' && admin.is_active) {
    window.location.href = '/super-admin/produk.html';
  }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.add('hidden');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Memproses...';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showError('Email atau password salah.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk';
    return;
  }

  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('role, is_active')
    .eq('auth_user_id', data.user.id)
    .single();

  if (adminError || !admin || admin.role !== 'super_admin' || !admin.is_active) {
    await supabase.auth.signOut();
    showError('Akun ini tidak memiliki akses Super Admin.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk';
    return;
  }

  window.location.href = '/super-admin/produk.html';
});
