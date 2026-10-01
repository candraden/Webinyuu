/**
 * Webinyuu — Shared Tailwind Config
 * -----------------------------------------------------------------
 * Satu sumber warna / spacing / radius / typography untuk SEMUA
 * halaman (super admin, dsb), sesuai token di DESIGN.md.
 *
 * Cara pakai di <head>, urutannya WAJIB seperti ini:
 *   <script src="https://cdn.tailwindcss.com"></script>
 *   <script src="../assets/js/tailwind.config.js"></script>
 *
 * Kalau nanti proyek ini sudah punya pipeline build Tailwind sendiri
 * (Vite/Laravel Mix) dan menghasilkan assets/css/output.css, cukup
 * ganti 2 <script> di atas dengan:
 *   <link rel="stylesheet" href="../assets/css/output.css">
 * Nama utility class-nya sengaja dibuat identik (bg-primary-container,
 * text-headline-md, p-space-md, dst) supaya tidak perlu ubah HTML.
 */
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        surface: '#f7f9fb',
        'surface-dim': '#d8dadc',
        'surface-bright': '#f7f9fb',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f6',
        'surface-container': '#eceef0',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'on-surface': '#191c1e',
        'on-surface-variant': '#45464f',
        'inverse-surface': '#2d3133',
        'inverse-on-surface': '#eff1f3',
        outline: '#767680',
        'outline-variant': '#c6c5d0',
        'surface-tint': '#4f5c8e',
        primary: '#000f3f',
        'on-primary': '#ffffff',
        'primary-container': '#172554',
        'on-primary-container': '#808dc2',
        'inverse-primary': '#b7c4fd',
        secondary: '#446900',
        'on-secondary': '#ffffff',
        'secondary-container': '#b1f746',
        'on-secondary-container': '#486f00',
        tertiary: '#031427',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#19293d',
        'on-tertiary-container': '#8090a8',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        'primary-fixed': '#dce1ff',
        'primary-fixed-dim': '#b7c4fd',
        'on-primary-fixed': '#071747',
        'on-primary-fixed-variant': '#374475',
        'secondary-fixed': '#b1f746',
        'secondary-fixed-dim': '#97da27',
        'on-secondary-fixed': '#111f00',
        'on-secondary-fixed-variant': '#324f00',
        'tertiary-fixed': '#d3e4fe',
        'tertiary-fixed-dim': '#b7c8e1',
        'on-tertiary-fixed': '#0b1c30',
        'on-tertiary-fixed-variant': '#38485d',
        background: '#f7f9fb',
        'on-background': '#191c1e',
        'surface-variant': '#e0e3e5',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      spacing: {
        gutter: '1rem',
        'gutter-desktop': '1.5rem',
        margin: '1rem',
        'margin-desktop': '3rem',
        'space-xs': '0.5rem',
        'space-sm': '0.75rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.text-headline-xl': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '40px',
          fontWeight: '700',
          lineHeight: '48px',
        },
        '.text-headline-xl-mobile': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '32px',
          fontWeight: '700',
          lineHeight: '40px',
        },
        '.text-headline-lg': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '28px',
          fontWeight: '600',
          lineHeight: '36px',
        },
        '.text-headline-lg-mobile': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '24px',
          fontWeight: '600',
          lineHeight: '32px',
        },
        '.text-headline-md': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '20px',
          fontWeight: '600',
          lineHeight: '28px',
        },
        '.text-headline-sm': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '18px',
          fontWeight: '600',
          lineHeight: '26px',
        },
        '.text-body-lg': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '16px',
          fontWeight: '400',
          lineHeight: '24px',
        },
        '.text-body-md': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: '22px',
        },
        '.text-label-md': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '14px',
          fontWeight: '600',
          lineHeight: '20px',
        },
        '.text-caption': {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
          fontSize: '12px',
          fontWeight: '500',
          lineHeight: '16px',
        },
      });
    },
  ],
};
