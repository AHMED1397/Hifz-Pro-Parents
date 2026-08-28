// ─────────────────────────────────────────────────────────────
// Smoke check — runs the pure-logic modules under Node so the pedagogical
// rules are verified by execution, not just by the type checker.
//
//   npm run smoke
//
// Covers: the new timetable engine (gap G1), the Hold Rule derivation, the
// lazily-loaded 15-line mushaf asset, and the shared scoring helpers.
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert';

import {
  getDayType,
  getLivePeriod,
  getPeriods,
  formatClock,
  formatDuration,
  hasLessonsToday,
  getNaziraSlot,
} from '../src/lib/timetable';
import {
  DAILY_ENTRIES,
  STUDENTS,
  holdStateFor,
  monthStatsFor,
  ATTENDANCE,
  EXAM_RESULTS,
} from '../src/data/mock';
import { getMushafPage, getPageAyahs, getPageInfo, hasMushafFile, MUSHAF_PAGES } from '../src/data/mushaf';
import { getSurahById } from '../src/data/surahs';
import { calculateQuranProgress, getGradeFromTotal } from '../src/lib/score';
import { buildHeatmapDays, toWeeks, fillFor, toISODate, heatmapTotals, FRIDAY_FILL } from '../src/lib/heatmap';

let checks = 0;
const ok = (label: string, cond: unknown, detail = '') => {
  assert.ok(cond, `${label}${detail ? ` — ${detail}` : ''}`);
  checks++;
  console.log(`  ✓ ${label}${detail ? ` (${detail})` : ''}`);
};

// ── 1. Timetable engine ─────────────────────────────────────
console.log('\nTimetable engine (src/lib/timetable.ts)');

// 2026-08-28 is a Friday; 2026-08-29 a Saturday; 2026-08-30 a Sunday.
const friday = new Date(2026, 7, 28, 6, 0, 0);
const saturday = new Date(2026, 7, 29, 12, 0, 0);
const sunday = new Date(2026, 7, 30, 6, 0, 0);

ok('Friday is recognised as the day off', getDayType(friday) === 'friday');
ok('Saturday is a half day', getDayType(saturday) === 'saturday');
ok('Sunday is a full day', getDayType(sunday) === 'full');
ok('No lessons on Friday', hasLessonsToday(friday) === false);
ok('Lessons on Saturday', hasLessonsToday(saturday) === true);

const fridayPeriods = getPeriods(friday);
ok(
  "Friday morning is Al-Kahf, not a lesson",
  fridayPeriods.some(p => p.id === 'kahf' && p.isLesson === false)
);
ok(
  'Saturday morning is off until 11:30',
  getPeriods(saturday).some(p => p.id === 'sat_morning_off' && p.endMin === 11 * 60 + 30)
);
ok(
  'Full day hears Sabaq 05:30–07:30',
  getPeriods(sunday).some(p => p.id === 'morning_class' && p.startMin === 330 && p.endMin === 450 && p.isLesson)
);
ok('Nazira slot exists on a full day', getNaziraSlot(sunday)?.id === 'nazira');

// 06:00 on a full day falls inside the morning Sabaq class.
const live = getLivePeriod(new Date(2026, 7, 30, 6, 0, 0));
ok('Live resolver finds the morning class at 06:00', live.period.id === 'morning_class');
ok('Live resolver says a lesson is on', live.isLessonTime === true);
ok('Progress is ~0.25 an hour into a 2-hour block', Math.abs(live.progress - 0.25) < 0.01, `${live.progress.toFixed(2)}`);
ok('Next period is breakfast', live.next?.id === 'breakfast');

// 02:00 is before the day starts — must still resolve, never throw.
const beforeDawn = getLivePeriod(new Date(2026, 7, 30, 2, 0, 0));
ok('Resolves before 03:45 without crashing', beforeDawn.period.id === 'wake');

ok('formatClock renders 12-hour', formatClock(330) === '5:30 AM', formatClock(330));
ok('formatDuration renders hours+minutes', formatDuration(95) === '1 hr 35 min', formatDuration(95));

// ── 2. The Hold Rule ────────────────────────────────────────
console.log('\nHold Rule (docs/hifz_section_structure.md §3)');

const held = holdStateFor('s2');
ok('Child with a failed Sabqi is on hold', held.active === true);
ok('Hold names Sabqi as the cause', held.lessonType === 'sabqi', String(held.lessonType));
ok('Hold carries a parent-readable reason', (held.reason ?? '').length > 20);

const clear = holdStateFor('s1');
ok('Child who passed everything is not on hold', clear.active === false);

// ── 3. Mock ledger shape ────────────────────────────────────
console.log('\nLedger (src/data/mock.ts)');

ok('Two children linked to the demo parent', STUDENTS.length === 2);
ok('Entries generated for both children', DAILY_ENTRIES.length > 100, `${DAILY_ENTRIES.length} rows`);
ok(
  'No entries recorded on a Friday',
  DAILY_ENTRIES.every(e => new Date(e.entry_date + 'T00:00:00').getDay() !== 5)
);
ok('Exactly one row per (child, date, lesson)', new Set(DAILY_ENTRIES.map(e => `${e.student_id}|${e.entry_date}|${e.entry_type}`)).size === DAILY_ENTRIES.length);
ok(
  'Sabaq rows carry the Nazira flag',
  DAILY_ENTRIES.filter(e => e.entry_type === 'sabaq').every(e => typeof e.nazira_done === 'boolean')
);
const stats = monthStatsFor('s1');
ok('Attendance % is in range', stats.attendance_percent >= 0 && stats.attendance_percent <= 100, `${stats.attendance_percent}%`);
ok('Pass rate is in range', stats.pass_rate_percent >= 0 && stats.pass_rate_percent <= 100, `${stats.pass_rate_percent}%`);
ok('Attendance rows exist', ATTENDANCE.length > 40, `${ATTENDANCE.length} rows`);
ok('Published exam results exist', EXAM_RESULTS.length > 0);
ok(
  'Exam totals match their component marks',
  EXAM_RESULTS.every(r => {
    const sum = Object.values(r.marks).reduce((a, b) => a + b, 0);
    return sum === r.total_marks;
  })
);

// ── 4. Mushaf data asset ────────────────────────────────────
console.log('\nMushaf data (assets/quran_indopak15_pages.json)');

ok('The real IndoPak file is present', hasMushafFile() === true);
ok('Page 146 loads', !!getMushafPage(146));
ok('Page 146 has 15 lines', getMushafPage(146)?.lines.length === 15, `${getMushafPage(146)?.lines.length} lines`);
const info = getPageInfo(146);
ok('Page 146 is derived from the file', info.fromFile === true);
ok('Page 146 resolves a juz', info.juz.length > 0, `juz ${info.juz.join(',')}`);
const ayahs = getPageAyahs(146);
ok('Page 146 breaks into ayah units', (ayahs?.ayahs.length ?? 0) > 0, `${ayahs?.ayahs.length} ayahs`);
ok('Page 146 has Arabic line text', (ayahs?.lineSegments.get(1)?.[0]?.text.length ?? 0) > 5);
ok('Mushaf covers 604 pages', MUSHAF_PAGES === 604);
ok('Surah catalog has 114 entries', getSurahById(114).id === 114);

// ── 5. Heatmap calendar (src/lib/heatmap.ts) ────────────────
console.log('\nHeatmap calendar (src/lib/heatmap.ts)');

// A fixed "today" so the assertions are deterministic: 2026-08-28 is a Friday.
const fixedToday = new Date(2026, 7, 28, 12, 0, 0);
const days = buildHeatmapDays(DAILY_ENTRIES, 30, fixedToday);

ok('One cell per day for 30 days', days.length === 30, `${days.length} cells`);
ok('Oldest cell first', days[0].date < days[29].date);
ok('Last cell is today', toISODate(days[29].date) === toISODate(fixedToday));
ok(
  'Every Friday cell is marked friday even with entries recorded',
  days.filter(d => d.date.getDay() === 5).every(d => d.state === 'friday')
);
ok('Friday cells exist in the window', days.filter(d => d.state === 'friday').length >= 4,
  `${days.filter(d => d.state === 'friday').length} fridays`);
ok(
  'Teaching days with entries are never "none"',
  days.filter(d => d.date.getDay() !== 5 && d.total > 0).every(d => d.state !== 'none')
);
ok(
  'A day with mixed results is "partial", not "pass"',
  days.filter(d => d.passed > 0 && d.passed < d.total).every(d => d.state === 'partial')
);
ok(
  'A day where nothing passed is "fail"',
  days.filter(d => d.total > 0 && d.passed === 0).every(d => d.state === 'fail')
);
ok('passed never exceeds total', days.every(d => d.passed <= d.total));

const weeks = toWeeks(days);
ok('Cells fold into week columns', weeks.length >= 5 && weeks.length <= 6, `${weeks.length} columns`);
ok('Every column has exactly 7 slots', weeks.every(w => w.length === 7));
ok(
  'Leading blanks match the first day\'s weekday',
  weeks[0].slice(0, days[0].date.getDay()).every(c => c === null)
);
ok(
  'Every real cell sits on the row matching its weekday',
  weeks.every(w => w.every((c, row) => c === null || c.date.getDay() === row))
);
ok('No cell is lost by the grouping', weeks.flat().filter(Boolean).length === 30);
ok(
  'Friday cells land on row 5',
  weeks.every(w => w[5] === null || w[5]?.state === 'friday')
);
ok('fillFor gives Fridays the off-day colour', fillFor(days.find(d => d.state === 'friday')!) === FRIDAY_FILL);
ok('fillFor distinguishes fail from pass', fillFor({ ...days[0], state: 'fail' }) !== fillFor({ ...days[0], state: 'pass' }));

const totals = heatmapTotals(days);
ok('Totals reconcile with the day list',
  totals.lessons === days.reduce((s, d) => s + d.total, 0), `${totals.lessons} lessons`);
ok('Totals split into passed and repeated', totals.passed + totals.failed === totals.lessons,
  `${totals.passed}/${totals.lessons} passed`);
ok('Totals count the days that had lessons',
  totals.activeDays === days.filter(d => d.total > 0).length && totals.activeDays > 0,
  `${totals.activeDays} active days`);

// ── 5. Shared scoring ───────────────────────────────────────
console.log('\nShared scoring (src/lib/score.ts)');

const prog = calculateQuranProgress(146);
ok('Quran progress for page 146', prog.percent > 20 && prog.percent < 30, `${prog.percent}%`);
ok('Grade A+ at 93', getGradeFromTotal(93) === 'A+');
ok('Grade A at 88', getGradeFromTotal(88) === 'A');
ok('Grade C at 62', getGradeFromTotal(62) === 'C');
ok('Grade D below 60', getGradeFromTotal(55) === 'D');

console.log(`\nAll ${checks} checks passed.\n`);
