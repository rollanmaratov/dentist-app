/** Mirrors the `public.specialty` enum in supabase/migrations. */
export const SPECIALTIES = [
  'Therapist',
  'Surgeon',
  'Implantologist',
  'Orthodontist',
  'Orthopedist',
  'Periodontist',
  'Pediatric dentist',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

/** Requirement: bookable dates are today + 13 days (enforced again in `is_bookable_slot`). */
export const BOOKING_WINDOW_DAYS = 14;
/** Requirement: 60-minute slots, earliest 09:00–10:00, latest 19:00–20:00. */
export const SLOT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

/** "15 000 т" — Figma writes tenge as "т". */
export function formatPrice(amount: number): string {
  return `${new Intl.NumberFormat('ru-RU').format(amount).replace(/\s/g, ' ')} т`;
}

/** "from 15 000 т" */
export function formatPriceFrom(amount: number): string {
  return `from ${formatPrice(amount)}`;
}
