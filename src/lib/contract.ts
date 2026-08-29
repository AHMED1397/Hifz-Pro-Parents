// ─────────────────────────────────────────────────────────────
// The Hifz Core contract, as code.
//
// Source of truth: https://github.com/AHMED1397/Hifz-Core (private) — the
// shared schema behind the Teacher, Parent and Admin apps. The rules below are
// transcribed into `docs/CORE_CONTRACT.md` and asserted by `npm run smoke`, so
// a change here that drifts from the contract fails the build instead of
// shipping.
//
// MULTI-APP RULE: never delete or rename a column another app reads, and always
// read with a fallback. These helpers are the single place the parent app
// interprets a lesson row, so the fallbacks live here once.
// ─────────────────────────────────────────────────────────────
import type { DailyEntry } from '@/data/types';

/** 15-line Madani mushaf. `students.current_page` is 1..604. */
export const MADANI_PAGES = 604;

export type StudentTrack = 'hifz' | 'dawr' | 'nazira';

/**
 * Juz target per academic year.
 *   Year 1 → juz 1–6 · Year 2 → juz 7–20 · Year 3 → juz 21–30 (completion)
 *   Year 4/5 are Dawr: the 30 juz are done, so there is no new target range.
 */
export const YEAR_TARGETS: Record<number, { from: number; to: number } | null> = {
  1: { from: 1, to: 6 },
  2: { from: 7, to: 20 },
  3: { from: 21, to: 30 },
  4: null,
  5: null,
};

/** The juz a year is expected to reach by its end — 30 for Dawr years. */
export function juzTargetForYear(year?: number): number {
  if (!year) return 0;
  return YEAR_TARGETS[year]?.to ?? 30;
}

/**
 * Track for a student. Year 4/5 are Dawr by definition; anything below is
 * active memorisation unless the database says otherwise.
 */
export function trackForYear(year?: number): StudentTrack {
  if (!year) return 'hifz';
  return year >= 4 ? 'dawr' : 'hifz';
}

/** True when a student no longer takes a new Sabaq. */
export function isDawr(track?: StudentTrack, year?: number): boolean {
  return (track ?? trackForYear(year)) === 'dawr';
}

/**
 * Lines credited for a lesson.
 *
 * `lines_count` is the authoritative column. Older rows only carry the
 * `line_from`/`line_to` range, so fall back to that.
 *
 * CRITICAL BUSINESS RULE: if `nazira_done = false` or `result = 'fail'`, the
 * credited lines are 0 — a failed or unprepared recitation earns no countable
 * lines even if the teacher recorded a range.
 */
export function creditedLines(entry: Pick<DailyEntry, 'lines_count' | 'line_from' | 'line_to' | 'result' | 'nazira_done'>): number {
  if (entry.result !== 'pass') return 0;
  if (entry.nazira_done === false) return 0;

  if (typeof entry.lines_count === 'number') return Math.max(0, entry.lines_count);

  const from = entry.line_from;
  const to = entry.line_to;
  if (typeof to === 'number' && typeof from === 'number' && to >= from) return to - from + 1;
  if (typeof to === 'number' && to > 0) return to;
  return 0;
}

/** Total lines credited across a set of entries — the Analytics headline. */
export function totalCreditedLines(entries: DailyEntry[]): number {
  return entries.reduce((sum, e) => sum + creditedLines(e), 0);
}

/**
 * A row that breaks the credited-lines rule. Used by the smoke check to prove
 * the demo family (and any seeded fixture) obeys the contract.
 */
export function violatesLinesRule(
  entry: Pick<DailyEntry, 'lines_count' | 'line_from' | 'line_to' | 'result' | 'nazira_done'>
): boolean {
  if (entry.result === 'pass' && entry.nazira_done !== false) return false;
  const stored = entry.lines_count;
  const ranged =
    typeof entry.line_to === 'number' && typeof entry.line_from === 'number'
      ? entry.line_to - entry.line_from + 1
      : (entry.line_to ?? 0);
  return (stored ?? 0) > 0 || ranged > 0;
}
