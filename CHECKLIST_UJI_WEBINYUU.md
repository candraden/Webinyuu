# Checklist Uji Webinyuu (Fase 8)

Centang satu per satu. Kalau ada yang gagal, catat pesan error dan langkahnya.

## 0. Persiapan
- [ya ] SQL sudah dijalankan berurutan: 06, 07, 08a, 08b, 09, 10 
- [ya ] Semua Edge Function sudah di-deploy ulang
- [ya ] `npm run build:css` sudah dijalankan
- [ ya] Ada minimal 2 akun Admin aktif dengan nomor HP terisi, dan 1 Super Admin

## 1. Halaman publik
- ya[ ] Kartu paket: "Lihat Detail" dan "Pesan Sekarang" rapi, sejajar, tidak menempel
- [ ya] Menu "Cara Kerja" menuju 6 langkah; "Layanan" menuju kategori format
- [ ya] Halaman detail paket tampil benar

## 2. Form pemesanan
- [ ya] Foto Utama (Hero): bisa menambah file bertahap sampai batas paket; file ke-(maks+1) ditolak
- [ ya] Format/ukuran salah ditolak dengan pesan jelas; video melebihi durasi ditolak
- [ ya] Tombol Hapus per file bekerja; kurang dari minimal tidak bisa lanjut
- [ ] Langkah 4: centang Custom Domain / Source Code mengubah estimasi (Total, DP 50%, Sisa)
- [ ] Tidak bisa submit tanpa centang persetujuan
- [ ] Submit sukses → halaman konfirmasi menampilkan nomor WA admin, nama admin, batas bayar 24 jam

## 3. Penugasan admin
- [ ] 4 order berturut-turut terbagi bergantian ke 2 admin
- [ ] Admin tanpa nomor HP / nonaktif tidak kebagian order
- [ ] Jika tidak ada admin memenuhi syarat → form menampilkan "belum ada admin yang tersedia"

## 4. Hak akses
- [ ] Super Admin login di `/admin/login.html` → ditolak dengan pesan jelas
- [ ] Admin A hanya melihat order miliknya; buka `order-detail.html?id=` milik Admin B → gagal
- [ ] Admin A memanggil aksi pada order Admin B (lewat konsol) → 403 "bukan tugasmu"
- [ ] Super Admin: Order & Penugasan menampilkan semua order dan bisa memindahkan
- [ ] Setelah dipindah, order muncul di admin baru dan hilang dari admin lama; riwayat tercatat

## 5. Kelola Admin
- [ ya] Tambah admin dengan nomor HP (`0812…` tersimpan sebagai `62812…`)
- [ ya] Edit: nama, email, nomor HP, role bisa diubah
- [ ] Nonaktifkan admin yang punya order aktif → muncul peringatan; batal = tidak berubah

## 6. Alur order sampai selesai
- [ ] Catat DP → status DP_PAID → Mulai Pengerjaan → Kirim Preview
- [ ] Revisi dalam jatah; revisi melebihi jatah ditagih Rp5.000
- [ ] Minta Pelunasan → catat pelunasan → PAID → Selesaikan Order (isi link hasil)
- [ ] Halaman lacak menampilkan status, kontak admin, dan link hasil

## 7. Batal otomatis 24 jam
- [ ] `update orders set payment_deadline_at = now() - interval '1 minute' where order_number = '…'` lalu `select public.cancel_expired_orders();` → hasil 1, status CANCELLED, riwayat "Batal otomatis"
- [ ] Order yang sudah punya catatan pembayaran TIDAK ikut dibatalkan
- [ ] Tombol "Aktifkan Kembali" muncul hanya untuk batal otomatis; setelah itu batas bayar +24 jam, DP bisa dicatat
- [ ] Order yang dibatalkan manual oleh admin tidak punya tombol Aktifkan Kembali
- [ ] `select jobname, schedule, active from cron.job;` menunjukkan jadwal 10 menit

## 8. Add-on & kasus khusus
- [ ] Custom domain: alur status sesuai kasus (punya / belum punya); DOMAIN_CONNECTED menolak jika nama domain atau registrar kosong
- [ ] Source code: "diserahkan" ditolak sebelum lunas, berhasil sesudah lunas
- [ ] Tambah add-on pada order berjalan menaikkan total; order lunas turun ke DP_PAID
- [ ] Upgrade paket: total naik sebesar selisih, kuota revisi mengikuti paket baru
- [ ] Order PAID / COMPLETED menolak tambah tagihan & upgrade

## 9. Maintenance 7 hari
- [ ] Order COMPLETED: kartu "Garansi Perbaikan Bug" tampil di halaman lacak
- [ ] Kirim laporan <10 karakter ditolak; laporan sah masuk ke admin
- [ ] Admin: alur MAINTENANCE_REQUESTED → UNDER_REVIEW → APPROVED → IN_PROGRESS → RESOLVED
- [ ] Laporan di luar 7 hari tidak bisa dikategorikan "gratis" kecuali ditandai website mati total

## 10. Keamanan sebelum go-live
- [ ] Anon (tanpa login) tidak bisa SELECT/INSERT/UPDATE langsung ke `orders`, `payments`, dll. lewat REST API
- [ ] File credentials tidak ada di Git (`git ls-files | grep -i cred` kosong)
- [ ] Secret key & service_role key sudah di-regenerate; env Edge Function diperbarui
- [ ] `public/config/env.js` hanya berisi URL dan publishable key
