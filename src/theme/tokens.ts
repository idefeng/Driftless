/**
 * Driftless design tokens — v2「黑 + 荧光运动绿」。
 *
 * Brand rule (PRD §1.5, v2.0 修订)：一个品牌色（荧光运动绿 #C6FF3D）+ 近黑 / 中性灰。
 * 不再引入第二个高饱和强调色。默认界面为黑底（standard），另保留白底高对比的
 * 「日光强光」模式（solar）供户外强光使用。荧光绿上的文字 / 图标一律用近黑
 * （`onBrand`），白字在荧光绿上对比度不足。
 */

// ── Brand ramp (immutable across themes) ───────────────────────────────
export const brand = {
  base: '#C6FF3D', // primary — volt green
  deep: '#8FD400', // pressed / gradient-dark end
  light: '#E3FF9E', // light fill / highlight
  glow: '#D4FF6A', // gradient-light end
  ink: '#0B0D0A', // content drawn on top of brand fills
} as const;

export type ColorScheme = 'light' | 'dark';
export type VisualMode = 'standard' | 'solar';

export interface Palette {
  scheme: ColorScheme;
  // surfaces
  bg: string;
  bgGradientTop: string;
  bgGradientBottom: string;
  card: string;
  cardAlt: string; // subtle filled card / track background
  chipNeutral: string; // neutral pill background
  chipAccent: string; // brand-tinted pill background
  // text
  text: string; // primary
  textStrong: string; // brightest (big numerals)
  textMuted: string; // secondary
  textFaint: string; // tertiary / captions
  textOnBrand: string; // brand-colored text over a brand-tinted chip
  // lines & misc
  divider: string;
  trackInactive: string;
  // brand-on-surface accents
  brand: string; // brand fill tuned per scheme
  brandText: string; // brand-colored text legible on this scheme
  onBrand: string; // text / icons on top of a `brand` fill
  // shadow tint for brand elevations
  brandShadow: string;
}

const dark: Palette = {
  scheme: 'dark',
  bg: '#0B0D0A',
  bgGradientTop: '#11140F',
  bgGradientBottom: '#070806',
  card: '#151912',
  cardAlt: '#1C2118',
  chipNeutral: '#1C2118',
  chipAccent: 'rgba(198,255,61,0.14)',
  text: '#EEF3E8',
  textStrong: '#FFFFFF',
  textMuted: '#9AA391',
  textFaint: '#6E7766',
  textOnBrand: brand.base,
  divider: 'rgba(255,255,255,0.08)',
  trackInactive: '#2A3024',
  brand: brand.base,
  brandText: brand.base,
  onBrand: brand.ink,
  brandShadow: 'rgba(198,255,61,0.35)',
};

const solar: Palette = {
  scheme: 'light',
  bg: '#FFFFFF',
  bgGradientTop: '#FFFFFF',
  bgGradientBottom: '#F2F4EF',
  card: '#F3F5F0',
  cardAlt: '#E6EAE1',
  chipNeutral: '#FFFFFF',
  chipAccent: '#E6F5C8',
  text: '#000000',
  textStrong: '#000000',
  textMuted: '#2E3328',
  textFaint: '#4F5647',
  textOnBrand: '#3D6B00',
  divider: 'rgba(0,0,0,0.20)',
  trackInactive: '#DDE2D6',
  brand: '#7CC400',
  brandText: '#3D6B00',
  onBrand: brand.ink,
  brandShadow: 'rgba(94,158,0,0.35)',
};

export const palettes: Record<VisualMode, Palette> = { standard: dark, solar };

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
