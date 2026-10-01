import { supabase } from '../lib/supabaseClient.js';

const form = document.getElementById('login-form');
const errorEl = document.getElementById('login-error');
const btn = document.getElementById('btn-submit');
const showError = (m) => { errorEl.textContent = m; errorEl.classList.remove('hidden'); };

const err = new URLSearchParams(location.search).get('error');
if (err) showError(err);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Memproses...';
  const { data, error } = await supabase.auth.signInWithPassword({
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
  });
  let ok = false;
  let isSuper = false;
  if (!error) {
    const { data: admin } = await supabase.from('admins').select('is_active, role')
      .eq('auth_user_id', data.user.id).single();
    isSuper = admin?.role === 'super_admin';
    ok = !!(admin && admin.is_active && admin.role === 'admin');
    if (!ok) await supabase.auth.signOut();
  }
  if (!ok) {
    showError(error ? 'Email atau password salah.'
      : isSuper ? 'Akun Super Admin tidak bisa masuk panel Admin. Gunakan halaman login Super Admin.'
      : 'Akun ini tidak memiliki akses Admin.');
    btn.disabled = false; btn.textContent = 'Masuk';
    return;
  }
  window.location.href = '/admin/dashboard.html';
});
