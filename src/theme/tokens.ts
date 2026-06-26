/**
 * Driftless design tokens — derived from the Cloud Design prototype (Driftless.dc.html)
 * and PRD v1.7. Single brand color: 阳光橙 / sunny orange #FF8C2B.
 *
 * Brand rule (PRD §1.5): one brand color (orange) + warm neutrals only.
 * No second high-saturation accent. Dark mode uses warm charcoal, never pure black.
 */

// ── Brand ramp (immutable across themes) ───────────────────────────────
export const brand = {
  base: '#FF8C2B', // primary — sunny orange
  deep: '#F47216', // pressed / gradient-dark end / dark-bg stroke
  light: '#FFB066', // light fill / highlight
  glow: '#FF9A45', // gradient-light end, dark-mode beat color
} as const;

// Shared semantic accent (system green) — used ONLY for the "on" switch track,
// matching iOS. Not a brand accent.
export const systemGreen = '#34C759';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  scheme: ColorScheme;
  // surfaces
  bg: string;
  bgGradientTop: string;
  bgGradientBottom: string;
  card: string;
  cardAlt: string; // subtle filled card / track background
  chipNeutral: string; // neutral pill background
  chipAccent: string; // orange-tinted pill background
  // text
  text: string; // primary
  textStrong: string; // brightest (big numerals)
  textMuted: string; // secondary
  textFaint: string; // tertiary / captions
  textOnBrand: string; // text drawn over orange tint (light: deep orange)
  // lines & misc
  divider: string;
  trackInactive: string;
  // brand-on-surface accents
  brand: string; // brand color tuned per scheme for contrast
  brandText: string; // brand-colored text legible on this scheme
  // shadow tint for orange elevations
  brandShadow: string;
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    scheme: 'light',
    bg: '#F7F5F2',
    bgGradientTop: '#F7F5F2',
    bgGradientBottom: '#F1EDE7',
    card: '#FFFFFF',
    cardAlt: '#F1EEEA',
    chipNeutral: '#FFFFFF',
    chipAccent: '#FFEAD6',
    text: '#211C16',
    textStrong: '#211C16',
    textMuted: '#6B6358',
    textFaint: '#9C9384',
    textOnBrand: '#C2620F',
    divider: 'rgba(33,28,22,0.10)',
    trackInactive: '#ECE8E2',
    brand: brand.base,
    brandText: '#C2620F',
    brandShadow: 'rgba(244,114,22,0.40)',
  },
  dark: {
    scheme: 'dark',
    bg: '#141109',
    bgGradientTop: '#1C1810',
    bgGradientBottom: '#0C0A06',
    card: '#1D190F',
    cardAlt: '#221E16',
    chipNeutral: '#221E16',
    chipAccent: 'rgba(255,140,43,0.16)',
    text: '#F4EFE6',
    textStrong: '#FFF6EC',
    textMuted: '#9C9384',
    textFaint: '#7E7565',
    textOnBrand: '#FFB066',
    divider: 'rgba(255,255,255,0.08)',
    trackInactive: '#3A3328',
    brand: brand.glow,
    brandText: '#FFB066',
    brandShadow: 'rgba(244,114,22,0.55)',
  },
};

// ── Typography ─────────────────────────────────────────────────────────
// Sora = display / numerals; Manrope = body. Loaded in app/_layout.tsx.
export const fonts = {
  // Sora
  displayRegular: 'Sora_400Regular',
  displayMedium: 'Sora_500Medium',
  displaySemiBold: 'Sora_600SemiBold',
  displayBold: 'Sora_700Bold',
  displayExtraBold: 'Sora_800ExtraBold',
  // Manrope
  bodyRegular: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemiBold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyExtraBold: 'Manrope_800ExtraBold',
} as const;

export const radius = {
  chip: 100,
  card: 22,
  bigButton: 30,
  pill: 14,
} as const;
