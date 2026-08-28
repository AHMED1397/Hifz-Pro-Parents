// ─────────────────────────────────────────────────────────────
// Al Haqqaniyyah Hifz — Design System (refined blue + gold)
// Single source of truth for color, type, spacing, elevation.
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // Brand — a deeper, richer royal blue
  primary: '#1E5FE0',
  primaryDark: '#1544B0',
  primaryPressed: '#1544B0',
  primaryWash: '#EEF4FF',
  primaryWashStrong: '#DCE8FF',

  // Accent — warm gold for achievement / highlights
  accentGold: '#C9973F',
  accentGoldSoft: '#F6EAD2',
  accentGoldText: '#8A6314',

  // Semantic
  success: '#0FA968',
  successWash: '#E4F7EF',
  warning: '#E08A00',
  warningWash: '#FDF1DD',
  danger: '#E23B3B',
  dangerWash: '#FDEAEA',
  info: '#1E5FE0',

  // Neutrals
  neutral: '#64748B',
  background: '#F4F7FC',
  card: '#FFFFFF',
  text: '#0E1B33',
  textSecondary: '#5A6B85',
  textMuted: '#95A2B8',
  border: '#E4EAF3',
  divider: '#EEF2F8',

  white: '#FFFFFF',

  status: {
    done: '#0FA968',
    behind: '#E08A00',
    absent: '#E23B3B',
    pending: '#95A2B8',
  },
} as const;

// Gradient stops for LinearGradient (start → end)
export const Gradients = {
  primary: ['#2E6BF0', '#1544B0'] as const,
  primaryVivid: ['#3B82F6', '#1E40AF'] as const,
  gold: ['#E0B75C', '#C9973F'] as const,
  success: ['#22C08A', '#0F9D63'] as const,
  danger: ['#F0605F', '#D32F2F'] as const,
  night: ['#16337A', '#0E1B33'] as const,
  wash: ['#FFFFFF', '#EEF4FF'] as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  screen: 16,
} as const;

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  card: 20,
  lg: 24,
  xl: 28,
  full: 9999,
} as const;

export const Typography = {
  fontFamilies: {
    tamil: 'NotoSansTamil_400Regular',
    tamilBold: 'NotoSansTamil_700Bold',
    arabic: 'NotoNaskhArabic_400Regular',
    arabicBold: 'NotoNaskhArabic_700Bold',
    system: 'System',
  },
  sizes: {
    display: 28,
    title: 22,
    heading: 18,
    body: 16,
    label: 13,
    quran: 20,
    small: 11,
  },
  lineHeights: {
    display: 34,
    title: 28,
    body: 24,
    label: 20,
    quran: 28,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;

export const Layout = {
  screenPadding: 16,
  cardRadius: 20,
  touchTarget: 48,
  rosterRowHeight: 76,
  bottomTabHeight: 68,
  grid: 4,
} as const;

export const Shadows = {
  // Subtle resting elevation for cards
  card: {
    shadowColor: '#0E1B33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  // Raised / interactive surfaces
  elevated: {
    shadowColor: '#0E1B33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  // Coloured glow under primary CTAs / hero header
  brand: {
    shadowColor: '#1E5FE0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
} as const;
