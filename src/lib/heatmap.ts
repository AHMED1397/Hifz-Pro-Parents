// ─────────────────────────────────────────────────────────────
// Pure calendar/heatmap logic — no React Native imports, so it can be executed
// and asserted by `npm run smoke`.
// ─────────────────────────────────────────────────────────────
import type { DailyEntry } from '@/data/types';

export type CellState =
  /** No lessons recorded (and not a Friday) — no class, or not yet entered. */
  | 'none'
  /** Friday — the madrasa day off (see src/lib/timetable.ts). */
  | 'friday'
  /** Every lesson that day passed. */
  | 'pass'
  /** Some lessons passed, at least one did not. */
  | 'partial'
  /** No lesson passed. */
  | 'fail';

export interface HeatmapDay {
  iso: string;
  date: Date;
  state: CellState;
  passed: number;
  total: number;
}

export const EMPTY_FILL = '#EDF1F7';
export const FRIDAY_FILL = '#DCE3EC';
export const FAIL_FILL = '#E23B3B';
export const PARTIAL_FILL = '#F0A93B';
/** Four green steps, lightest → darkest, by how many lessons passed that day. */
export const PASS_STEPS = ['#CFEBD9', '#9BD9B4', '#4FBE81', '#0FA968'] as const;

export function fillFor(day: HeatmapDay): string {
  switch (day.state) {
    case 'friday':
      return FRIDAY_FILL;
    case 'none':
      return EMPTY_FILL;
    case 'fail':
      return FAIL_FILL;
    case 'partial':
      return PARTIAL_FILL;
    case 'pass': {
      const steps = PASS_STEPS.length;
      const idx = Math.min(steps - 1, Math.max(0, Math.round(((day.passed || 1) / 3) * steps) - 1));
      return PASS_STEPS[idx];
    }
    default:
      return EMPTY_FILL;
  }
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * One cell per calendar day for the last `numDays` days, oldest first, so the
 * grid reads left → right like GitHub's contribution graph.
 *
 * Fridays are marked `friday` regardless of whether anything was recorded,
 * because the madrasa takes Friday off.
 */
export function buildHeatmapDays(entries: DailyEntry[], numDays = 30, today = new Date()): HeatmapDay[] {
  const byDate = new Map<string, DailyEntry[]>();
  for (const e of entries) {
    const arr = byDate.get(e.entry_date) ?? [];
    arr.push(e);
    byDate.set(e.entry_date, arr);
  }
  return Array.from({ length: numDays }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (numDays - 1 - i));
    const iso = toISODate(date);
    const dayEntries = byDate.get(iso) ?? [];
    const passed = dayEntries.filter(e => e.result === 'pass').length;
    const total = dayEntries.length;
    const state: CellState =
      date.getDay() === 5
        ? 'friday'
        : total === 0
          ? 'none'
          : passed === total
            ? 'pass'
            : passed === 0
              ? 'fail'
              : 'partial';
    return { iso, date, state, passed, total };
  });
}

/**
 * Fold a flat day list into Sunday-first week columns.
 * Leading and trailing slots are `null` so the columns line up with the
 * weekday labels.
 */
export function toWeeks(days: HeatmapDay[]): Array<Array<HeatmapDay | null>> {
  if (days.length === 0) return [];
  const leading = days[0].date.getDay(); // 0 = Sunday
  const weeks: Array<Array<HeatmapDay | null>> = [];
  let week: Array<HeatmapDay | null> = new Array(leading).fill(null);
  for (const d of days) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}
