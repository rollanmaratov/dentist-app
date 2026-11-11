/**
 * Design tokens mirrored from the Figma file "Dentist app | Study Kvo".
 * Names follow the Figma variables (`--color-*`, `--space-*`, `--radius-*`)
 * so a token can be traced back to the design by name.
 *
 * The design is light-mode only, so there is a single palette.
 */
import type { TextStyle } from 'react-native';

export const colors = {
  // Backgrounds
  bgCanvas: '#F1F1F7', // neutral/background-greyblue, --color-bg-subtle
  bgSurface: '#FFFFFF', // --color-bg-surface
  bgInput: '#E3E3EF', // --color-bg-input
  bgBrand: '#6F2CFE', // --color-bg-brand, primary/purple
  bgBrandTint: '#F4EFFF', // --color-bg-brand-tint
  bgBrandSubtle: '#F8F5FF', // --color-bg-brand-subtle
  bgDangerSubtle: '#FFEDEE', // --color-bg-danger-subtle

  // Text
  textPrimary: '#151515', // --color-text-primary, text/black
  textSecondary: '#535353', // --color-text-secondary, text/gray
  textTertiary: '#797979', // --color-text-tertiary, neutral/grey
  textPlaceholder: '#AEAEAE', // --color-text-placeholder
  textBrand: '#6F2CFE', // --color-text-brand
  textOnBrand: '#FFFFFF', // --color-text-on-brand

  // Borders
  borderSubtle: '#EAEAEA', // --color-border-subtle
  borderDefault: '#DEDEDE', // --color-border-default
  borderBrand: '#6F2CFE', // --color-border-brand

  // Status
  star: '#F9D236', // star
  danger: '#D11515', // system/error (form validation, e.g. wrong code)
  dangerAction: '#FE2C2F', // "Danger outline" button (Cancel, Delete profile)

  // One-off values used by specific Figma components
  divider: 'rgba(0, 0, 0, 0.05)', // card dividers
  textMuted: '#979797', // dropdown placeholder
  textTerms: '#8B8B8B', // sign-in terms line
  textDisabled: '#BEBEBE', // unavailable time slot
  textCalendarDay: '#292929', // available calendar day
  textCalendarInactive: '#C0C0C0', // bookable day while the date picker is inactive
  textBlack: '#000000', // Labels/Primary (iOS kit) — slot labels, card names
  bgDisabledSelected: '#636363', // selected day while the date picker is inactive
  textOnBrandSoft: '#FCFEFF', // neutral/background white-blue — text on selected slot

  // Support chat (Figma "Chats / Chat")
  textBubbleIncoming: '#232323', // incoming message text
  textBubbleOutgoing: '#F4F4F4', // outgoing message text on the brand bubble
  textChatMeta: '#6C6C6C', // sender name, day separator
  textChatTime: '#848484', // message time, sent/delivered ticks
  borderChatInput: '#DBE2E7', // message field outline
  bgPhotoViewer: '#000000', // full-screen chat photo
  bgPromotion: '#2B2B2B', // promotion page while its photo loads
} as const;

/** --space-N */
export const space = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
} as const;

/** --radius-* */
export const radius = {
  xs: 5,
  sm: 8,
  md: 10,
  lg: 16,
  xl: 21,
  '2xl': 24,
  '3xl': 31,
  full: 1000,
} as const;

/** shadow/* effects, as CSS box-shadow strings (supported by React Native's `boxShadow`). */
export const shadow = {
  subtle: '0px 4px 10px rgba(0, 0, 0, 0.05)',
  card: '0px 2px 20px rgba(0, 0, 0, 0.07)',
  dialog: '0px 8px 32px rgba(0, 0, 0, 0.15)',
  /** Image thumbnails in chat messages. */
  chatImage: '0px -2px 4px 1px rgba(0, 0, 0, 0.1)',
} as const;

/**
 * How far `shadow.card` reaches past its view (20pt blur + 2pt offset, rounded up).
 * Scroll views clip at their bounds, so carousels of shadowed cards pad by this much.
 */
export const SHADOW_BLEED = 24;

/** Gradient overlays (CSS syntax, for `experimental_backgroundImage`). */
export const gradients = {
  /** Promotion tiles: darkens the bottom so the white title stays legible. */
  promotionTile: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
  /** Promotion page photo (Figma 4203:2254). */
  promotionPage: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(0,0,0,0.5) 84.79%)',
} as const;

/**
 * iOS system font families. `ui-rounded` maps to SF Pro Rounded.
 *
 * Only React Native <Text> understands `ui-rounded`. The native navigation header
 * resolves fonts differently and silently falls back to regular SF Pro, so rounded
 * page titles are rendered in content with <PageTitle>, never via header styles.
 */
export const fonts = {
  sans: 'system-ui',
  rounded: 'ui-rounded',
} as const;

/** Figma text styles (named ones first, then one-off styles used by specific screens). */
export const typography = {
  /** "Heading 1" — page titles in the iOS large-title toolbar, "Booking confirmed". */
  heading1: { fontFamily: fonts.rounded, fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4 },
  /** "Heading 2" — tab page titles (My Appointments, Profile), section and card titles. */
  heading2: { fontFamily: fonts.rounded, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  /** "Headline/Regular" (iOS kit) — inline nav titles, emphasized labels. */
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.43 },
  /** Sign-in titles ("Welcome", "We sent you a code"). Figma uses SF Compact Rounded
   *  Medium 32, which iOS apps can't load — SF Pro Rounded Medium is the closest system font. */
  display: { fontFamily: fonts.rounded, fontSize: 32, lineHeight: 38, fontWeight: '500' },
  /** iOS Body (17/22) — sign-in subtitles and inputs. */
  bodyLarge: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.43 },
  /** "Body" */
  body: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  /** Button labels and text links ("View all"): SF Pro Semibold 15/22. */
  button: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  /** Date picker month title: SF Pro Rounded Regular 20/28. */
  calendarMonth: { fontFamily: fonts.rounded, fontSize: 20, lineHeight: 28, fontWeight: '400' },
  /** Date picker day number: SF Pro Rounded Regular 17. */
  calendarDay: { fontFamily: fonts.rounded, fontSize: 17, lineHeight: 22, fontWeight: '400' },
  /** Time slot: SF Pro Rounded Regular 15. */
  slot: { fontFamily: fonts.rounded, fontSize: 15, lineHeight: 19, fontWeight: '400' },
  small: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  /** Promotion page label "PROMOTION": Figma uses Inter Bold 14 (+1.4 tracking); SF Pro Bold is the system match. */
  promoEyebrow: { fontSize: 14, lineHeight: 17, fontWeight: '700', letterSpacing: 1.4 },
  /** Promotion page headline: SF Pro Rounded Bold 24. */
  promoHeadline: { fontFamily: fonts.rounded, fontSize: 24, lineHeight: 29, fontWeight: '700' },
  /** Chat message text: SF Pro Regular 16, line height "normal". */
  chatMessage: { fontSize: 16, lineHeight: 19, fontWeight: '400' },
  /** Chat sender name: SF Pro Regular 14. */
  chatName: { fontSize: 14, lineHeight: 17, fontWeight: '400' },
  /** Chat day separator ("Today", "12 August"): SF Pro Semibold 14. */
  chatDay: { fontSize: 14, lineHeight: 17, fontWeight: '600' },
  /** Chat message time: SF Pro Regular 12. */
  chatTime: { fontSize: 12, lineHeight: 14, fontWeight: '400' },
  menu: { fontSize: 10, lineHeight: 12, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
export type ColorToken = keyof typeof colors;
