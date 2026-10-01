// Format angka jadi Rupiah, contoh: formatRupiah(30000) -> "Rp30.000"
export function formatRupiah(value) {
  return 'Rp' + Number(value || 0).toLocaleString('id-ID');
}
