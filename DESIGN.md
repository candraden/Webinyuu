---
name: Webinyuu
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767680'
  outline-variant: '#c6c5d0'
  surface-tint: '#4f5c8e'
  primary: '#000f3f'
  on-primary: '#ffffff'
  primary-container: '#172554'
  on-primary-container: '#808dc2'
  inverse-primary: '#b7c4fd'
  secondary: '#446900'
  on-secondary: '#ffffff'
  secondary-container: '#b1f746'
  on-secondary-container: '#486f00'
  tertiary: '#031427'
  on-tertiary: '#ffffff'
  tertiary-container: '#19293d'
  on-tertiary-container: '#8090a8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4fd'
  on-primary-fixed: '#071747'
  on-primary-fixed-variant: '#374475'
  secondary-fixed: '#b1f746'
  secondary-fixed-dim: '#97da27'
  on-secondary-fixed: '#111f00'
  on-secondary-fixed-variant: '#324f00'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 3rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies an approachable, dependable, and forward-moving aesthetic tailored specifically for micro, small, and medium-sized enterprise (UMKM) owners. It deliberately avoids high-barrier, overly technical jargon and visually sterile enterprise patterns. Instead, the visual direction blends modern utility with human warmth—delivering clarity, pragmatism, and unpretentious accessibility.

The aesthetic philosophy draws on **Modern Approachable Functionalism**:
- **Clarity over Complexity:** Generous whitespace, direct hierarchy, and scannable content structures ensure non-technical merchants instantly grasp product offerings (websites, digital catalogs, landing pages) without friction.
- **Empowering Optimism:** Crisp, structured layouts convey corporate legitimacy and security, while energetic accents signal business growth, speed, and modern commercial viability.
- **Democratic Value:** The interface feels fresh, polished, and contemporary, purposefully resisting cold luxury or intimidating enterprise aesthetics to celebrate accessible digital growth starting from everyday price points.

## Colors

The palette operates on a strict **70 / 20 / 10** distribution model to retain crisp readability, professional trust, and surgical conversion focus:

- **70% Foundation (Light Surfaces & Canvas):** Canvas is dominated by Pure White (`#FFFFFF`) and Soft Slate Light (`#F8FAFC`). Primary body typography utilizes High-Contrast Ink (`#111827`) to maintain effortless legibility for long-form reading and mobile viewport scannability.
- **20% Structural Trust (Deep Navy):** Deep Navy (`#172554`) anchors brand marks, major headings, key functional cards, structural navbars, and primary button labels. It signals institutional trust, stability, and digital reliability.
- **10% Kinetic Growth (Lime Accent):** Vibrant Lime (`#A2E635`) is applied strictly as an intentional focal driver. It is reserved for high-impact call-to-actions, pricing highlight ribbons, micro-interaction tags, and key value indicators (e.g., pricing flags, verification ticks). Lime must never be used as full-bleed section backgrounds to protect optical comfort and accessibility.
- **Supporting Neutral Tone:** Slate Gray (`#64748B`) handles descriptive subheadings, metadata timestamps, input placeholder states, and muted interface lines (`#E2E8F0`).

## Typography

The design system relies on **Plus Jakarta Sans** across all textual hierarchies. Its geometric construction, wide apertures, and humanist touches deliver crisp legibility across small mobile screens while projecting a friendly, forward-looking identity.

- **Scale Rationale:** Headlines are tightly coupled to strict line-heights to avoid erratic spacing when Indonesian merchant product names wrap across mobile screens.
- **Headings (700 / 600 weight):** Rendered in Deep Navy (`#172554`) to establish commanding, readable hierarchy without overwhelming visual noise.
- **Body & Secondary Copy (400 / 500 weight):** Body copy uses High-Contrast Ink (`#111827`) for standard readability and Slate Gray (`#64748B`) for supplementary guidance and metadata.
- **Numbers & Metrics:** When displaying pricing points (e.g., "Rp30.000"), apply `headline-md` or `headline-lg` with `700` weight to produce immediate clarity and value perception.

## Layout & Spacing

Layout and spatial decisions are constructed around an 8px base rhythm (`0.5rem`), fostering uniform visual harmony across device ecosystems.

- **Grid Architecture:**
  - **Mobile (< 768px):** 4-column fluid layout with `16px` (`margin`) outer gutters and `16px` (`gutter`) column separation.
  - **Tablet (768px – 1024px):** 8-column layout with `24px` margins and `16px` gutters.
  - **Desktop (> 1024px):** 12-column layout capped at an optimal `1200px` content container, using `48px` (`margin-desktop`) canvas padding and `24px` (`gutter-desktop`) gutters.
- **Spacing Token Utility:**
  - `space-xs` (8px): Micro-gaps between icons and text, inner chip padding.
  - `space-sm` (12px): Compact component padding, list item vertical gaps.
  - `space-md` (16px): Standard card interior padding on mobile, form field spacing.
  - `space-lg` (24px): Card padding on desktop, inter-component stack gaps.
  - `space-xl` (32px): Separation between section blocks and card grids.

## Elevation & Depth

Visual hierarchy leverages light-handed, ambient depth instead of heavy shadows or dark overlays. This keeps the interface airy, fast-loading, and natural for daily operational browsing.

- **Flat Foundation:** Default container states sit directly on the `#F8FAFC` canvas using pure `#FFFFFF` background fill bordered by a hairline stroke: `1px solid #E2E8F0`.
- **Level 1 (Card Rest State):** Low-contrast ambient blur tinted with deep slate:
  `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02);`
  Complemented by a soft border stroke (`#E2E8F0`).
- **Level 2 (Hover & Active Interactive States):** Applied when interactive cards or catalog previews are engaged:
  `box-shadow: 0 10px 20px -3px rgba(23, 37, 84, 0.06), 0 4px 6px -2px rgba(23, 37, 84, 0.03);`
  Along with a gentle `-2px` Y-axis transition.
- **Level 3 (Sticky Navigation & Bottom Action Bars):**
  `box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);` with a translucent white background (`rgba(255, 255, 255, 0.92)`) and a `backdrop-filter: blur(8px)`.

## Shapes

The geometric identity relies on friendly, balanced rounding (`roundedness: 2` scale) that eliminates aggressive corners while preserving structured, professional layout boundaries.

- **Interactive Primary Elements (Buttons, Inputs):** Standardized at `10px` to `12px` border-radius (`rounded-md` to `rounded-lg`). This creates an ergonomic, clickable silhouette that feels responsive to touch input.
- **Surfaces & Cards:** Defined with `14px` to `16px` border-radius (`rounded-lg` to `rounded-xl`), producing a soft container for catalog items, price cards, and testimonials.
- **Badges & Pills:** Full curvature (`9999px`) reserved specifically for category chips, feature badges, and notification tags to instantly separate contextual tags from structural cards.

## Components

### Buttons
- **Primary Action (Conversion / CTA):** Background `#A2E635` (Lime), text `#172554` (Navy, weight 600). Radius `12px`. Padding: `12px 24px` for desktop, `14px 20px` for mobile touch targets (minimum height 48px). No inner shadow; subtle hover tint transition (`brightness: 0.96`).
- **Secondary Action:** Background `#172554` (Navy), text `#FFFFFF` (White, weight 600). Radius `12px`. Used for portal logins, dashboard entries, or alternative paths.
- **Tertiary / Ghost Button:** Transparent background, `1.5px` border in `#E2E8F0`, text `#172554`. Hover state shifts border to `#172554` with a neutral tint background `#F1F5F9`.

### Cards & Catalogs
- **Standard Service / Catalog Card:** Pure White `#FFFFFF` surface, `14px` radius, `1px solid #E2E8F0` border, Level 1 ambient shadow. Padding `20px` on desktop, `16px` on mobile.
- **Featured / Tier Highlight Card:** Same white base with a targeted top edge accent or bordered in `#172554` featuring an offset Lime `#A2E635` badge ("Paling Laris" / "Mulai Rp30rb").

### Badges & Status Chips
- **Pricing & Accent Badge:** Background `#A2E635`, text `#172554`, font size `12px` (`caption`), weight `700`, radius `9999px`, padding `4px 10px`.
- **Informational Chip:** Background `#F1F5F9`, text `#64748B`, font size `12px`, radius `9999px`, padding `4px 12px`.

### Form Fields & Inputs
- **Text Fields:** White `#FFFFFF` fill with `1.5px solid #CBD5E1` border, `10px` radius. Height 48px. Text `#111827`, placeholder text `#94A3B8`.
- **Focus State:** Border transitions crisply to `#172554` with a `3px` outer ring in `#A2E635` at 35% opacity to guarantee dual-color brand reinforcement and clear accessibility.

### Selection Controls (Checkboxes & Radios)
- **Checkboxes:** `20px x 20px` square with `6px` radius. Resting state has `1.5px solid #CBD5E1`. Selected state fills with `#172554` housing a clean white checkmark vector.
- **Radio Buttons:** `20px` circular diameter. Selected state exhibits a `#172554` rim surrounding a centered `#A2E635` active disc.

### Pricing Callout Block (UMKM-Specific)
- A dedicated micro-component for quick-pitch affordability: Clean slate surface (`#F8FAFC`), Navy headline declaring feature scope, an oversized numeric block (`#172554`), accented with an inline Lime indicator pill (`Rp30.000 / bln`), and a full-width Lime CTA button below.