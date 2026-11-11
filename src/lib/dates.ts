/** Small date helpers — all dates are local time. */

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function withHour(d: Date, hour: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0, 0);
}

/** Weeks (Monday first) covering the whole month that contains `month`. */
export function monthWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const end = addDays(last, (7 - last.getDay()) % 7);
  const weeks: Date[][] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  }
  return weeks;
}

const time = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const weekdayDayMonth = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');

/** "Mon 12 Aug, 14:00" — booking summary rows. */
export function formatSummaryDate(d: Date): string {
  return `${weekdayDayMonth(d)}, ${time(d)}`;
}

/** "Mon 12 Aug 14:00" — the Book button label. */
export function formatButtonDate(d: Date): string {
  return `${weekdayDayMonth(d)} ${time(d)}`;
}

/** "August 15, 09:45" — Home "Upcoming" cards. */
export function formatCardDate(d: Date): string {
  return `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, ${time(d)}`;
}

/** "9:00" — time slot labels. */
export function formatSlot(hour: number): string {
  return `${hour}:00`;
}

/** "August" */
export function formatMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long' });
}

/** Chat day separator: "Today", otherwise "12 August" (spec: DD Month). */
export function formatChatDay(d: Date, now: Date): string {
  return isSameDay(d, now) ? 'Today' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

/** Chat message time: "Just now" within a minute, otherwise "14:55". */
export function formatChatTime(d: Date, now: Date): string {
  const age = now.getTime() - d.getTime();
  return age >= 0 && age < 60_000 ? 'Just now' : time(d);
}
