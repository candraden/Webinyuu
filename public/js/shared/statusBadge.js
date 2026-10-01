// Peta order_status (enum di database) -> label & warna badge yang ditampilkan
// ke customer (tracking) maupun admin (dashboard). Satu sumber kebenaran biar
// label di berbagai halaman gak beda-beda sendiri.

const STATUS_MAP = {
  WAITING_PAYMENT: {
    label: 'Menunggu DP',
    description: 'Order kamu sudah dibuat, silakan bayar DP 50% supaya pengerjaan bisa dimulai.',
    badgeClass: 'bg-surface-container text-on-surface-variant',
  },
  DP_PAID: {
    label: 'DP Terverifikasi',
    description: 'DP kamu sudah diverifikasi. Pengerjaan akan segera dimulai.',
    badgeClass: 'bg-secondary-container text-primary-container',
  },
  IN_PROGRESS: {
    label: 'Sedang Dikerjakan',
    description: 'Tim Webinyuu sedang membangun landing page kamu.',
    badgeClass: 'bg-secondary-container text-primary-container',
  },
  PREVIEW: {
    label: 'Preview Siap',
    description: 'Preview landing page kamu sudah siap. Cek dan beri masukan revisi jika perlu.',
    badgeClass: 'bg-primary-container text-on-primary-container',
  },
  REVISION: {
    label: 'Proses Revisi',
    description: 'Permintaan revisi kamu sedang dikerjakan.',
    badgeClass: 'bg-primary-container text-on-primary-container',
  },
  WAITING_SETTLEMENT: {
    label: 'Menunggu Pelunasan',
    description: 'Landing page kamu sudah disetujui. Silakan lakukan pelunasan sisa pembayaran.',
    badgeClass: 'bg-surface-container text-on-surface-variant',
  },
  PAID: {
    label: 'Lunas',
    description: 'Pembayaran sudah lunas. Landing page kamu sedang difinalisasi.',
    badgeClass: 'bg-secondary-container text-primary-container',
  },
  COMPLETED: {
    label: 'Selesai',
    description: 'Order kamu sudah selesai dan landing page sudah dipublikasikan.',
    badgeClass: 'bg-secondary-container text-primary-container',
  },
  COMPLETED_UNRESPONSIVE: {
    label: 'Ditutup (Tidak Ada Respons)',
    description: 'Order ditutup karena tidak ada respons lebih dari 5 hari. Hubungi admin jika ingin melanjutkan lewat order baru.',
    badgeClass: 'bg-error/10 text-error',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    description: 'Order ini sudah dibatalkan.',
    badgeClass: 'bg-error/10 text-error',
  },
};

const FALLBACK_STATUS = {
  label: 'Tidak Diketahui',
  description: '',
  badgeClass: 'bg-surface-container text-on-surface-variant',
};

export function getStatusInfo(orderStatus) {
  return STATUS_MAP[orderStatus] || FALLBACK_STATUS;
}

const PAYMENT_STATUS_MAP = {
  UNPAID: { label: 'Belum Bayar', badgeClass: 'bg-surface-container text-on-surface-variant' },
  DP_PAID: { label: 'DP Terbayar', badgeClass: 'bg-secondary-container text-primary-container' },
  FULLY_PAID: { label: 'Lunas', badgeClass: 'bg-secondary-container text-primary-container' },
};

export function getPaymentStatusInfo(paymentStatus) {
  return PAYMENT_STATUS_MAP[paymentStatus] || FALLBACK_STATUS;
}
