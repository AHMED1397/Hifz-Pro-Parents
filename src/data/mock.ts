// ─────────────────────────────────────────────────────────────
// Hfz-Parent — offline / demo dataset.
//
// The app runs entirely on this file when no Supabase keys are present
// (`HAS_SUPABASE === false`), exactly like the Teacher app does. Data here is
// illustrative demo data, NOT the live roster.
//
// `src/lib/score.ts` (reused verbatim from the Teacher app) imports its types
// from '../data/mock', so this module re-exports './types'.
// ─────────────────────────────────────────────────────────────
import { getSurahById as surahById } from './surahs';

export * from './types';

import type {
  Announcement,
  Attendance,
  AttendanceStatus,
  Class,
  DailyEntry,
  Exam,
  ExamResult,
  EntryType,
  Parent,
  Student,
  Teacher,
  TargetPlan,
  MonthStats,
} from './types';

// ── People & structure ──────────────────────────────────────
export const PARENT: Parent = {
  id: 'p-demo-1',
  full_name: 'Mr. Abdul Rahman',
  phone: '+94 77 123 4567',
  relation: 'father',
  preferred_lang: 'en',
};

export const TEACHERS: Teacher[] = [
  { id: 't1', full_name: 'Ash-Sheikh Dilhan', phone: '+94 71 000 0001' },
  { id: 't2', full_name: 'Ash-Sheikh Ibrahim', phone: '+94 71 000 0002' },
  { id: 't3', full_name: 'Ash-Sheikh Numan', phone: '+94 71 000 0003' },
];

export const CLASSES: Class[] = [
  { id: 'c1', name: 'Floor 3 · Class 3-A', floor: 3, division_id: 1 },
  { id: 'c2', name: 'Floor 2 · Class 2-B', floor: 2, division_id: 1 },
];

export const STUDENTS: Student[] = [
  {
    id: 's1',
    admission_no: 'HFZ-2101',
    full_name: 'Muhammad Bilal',
    age: 13,
    class_id: 'c1',
    division_id: 1,
    current_juz: 8,
    current_page: 146,
    current_line: 10,
    current_year: 2,
    track: 'hifz',
    juz_target: 20,
    days_behind: 0,
    hold_active: false,
    hold_reason: null,
    guardian_name: PARENT.full_name,
    guardian_phone: PARENT.phone,
    guardian_relation: 'father',
    city: 'Kandy',
    joined_on: '2024-05-06',
    status: 'active',
    avatar_color: '#1E5FE0',
  },
  {
    id: 's2',
    admission_no: 'HFZ-2244',
    full_name: 'Abdullah Rahman',
    age: 11,
    class_id: 'c2',
    division_id: 1,
    current_juz: 30,
    current_page: 582,
    current_line: 6,
    current_year: 1,
    track: 'hifz',
    juz_target: 6,
    days_behind: 1.5,
    hold_active: true,
    // Reason is derived from the ledger by holdStateFor(), not stored here.
    hold_reason: null,
    guardian_name: PARENT.full_name,
    guardian_phone: PARENT.phone,
    guardian_relation: 'father',
    city: 'Kandy',
    joined_on: '2025-05-05',
    status: 'active',
    avatar_color: '#C9973F',
  },
];

export const TARGET_PLANS: TargetPlan[] = [
  {
    id: 'tp1',
    student_id: 's1',
    start_page: 1,
    end_page: 604,
    daily_target_lines: 12,
    daily_target_pages: 0.8,
    start_date: '2025-01-01',
    target_date: '2027-06-30',
  },
  {
    id: 'tp2',
    student_id: 's2',
    start_page: 582,
    end_page: 604,
    daily_target_lines: 10,
    daily_target_pages: 0.66,
    start_date: '2025-06-01',
    target_date: '2026-12-31',
  },
];

// ── Helpers ─────────────────────────────────────────────────
export const getSurahById = (id: number) => surahById(id);
export const getStudentById = (id: string) => STUDENTS.find(s => s.id === id) ?? null;
export const getClassById = (id: string) => CLASSES.find(c => c.id === id) ?? null;
export const getTeacherById = (id: string) => TEACHERS.find(t => t.id === id) ?? null;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

// ── Daily entries: last 30 days, 3 lessons/day, Fridays skipped ──
//
// Deliberately includes a failed SABQI for the second child so the Hold banner
// on the dashboard has something real to render.
const ENTRY_SEQUENCE: Array<{ type: EntryType; teacher: string; nazira: boolean }> = [
  { type: 'sabaq', teacher: 't1', nazira: true },
  { type: 'sabqi', teacher: 't1', nazira: false },
  { type: 'manzil', teacher: 't2', nazira: false },
];

const REMARKS_PASS = [
  "Masha'Allah, fluent recitation.",
  'Strong Hifz, keep up the pace.',
  'Very good — minor tajweed note on Madd.',
  "Excellent, recited without a single prompt.",
];
const REMARKS_FAIL = [
  'Needs revision — repeated hesitations in the middle of the page.',
  'Forgot twice. Please revise at home tonight.',
  'Tajweed of Ghunnah needs work before moving on.',
];

function buildEntries(): DailyEntry[] {
  const out: DailyEntry[] = [];
  const today = new Date();

  // The most recent teaching day (Fridays have no lessons). The demo hold for
  // the second child is pinned to it, so the dashboard always has a real
  // "Sabaq on hold" case to render regardless of what day it is today.
  let lastTeachingBack = 0;
  for (let back = 0; back < 30; back++) {
    if (addDays(today, -back).getDay() !== 5) {
      lastTeachingBack = back;
      break;
    }
  }

  for (let back = 29; back >= 0; back--) {
    const date = addDays(today, -back);
    if (date.getDay() === 5) continue; // Friday — no lessons
    const iso = toISODate(date);
    for (const student of STUDENTS) {
      const plan = TARGET_PLANS.find(tp => tp.student_id === student.id)!;
      // Second child fails Sabqi on the most recent teaching day.
      const failSabqi = student.id === 's2' && back === lastTeachingBack;
      let offset = back;
      for (const slot of ENTRY_SEQUENCE) {
        const surahId = Math.max(1, Math.min(114, 114 - Math.floor((student.current_page ?? 600) / 20) + 1));
        const pageFrom = Math.max(1, (student.current_page ?? 1) - offset);
        const pageTo = slot.type === 'sabaq' ? pageFrom : Math.max(1, pageFrom - (slot.type === 'sabqi' ? 3 : 18));
        const lines = slot.type === 'sabaq' ? (student.id === 's1' ? 10 : 8) : undefined;
        // A failed Sabaq on its own does NOT trigger the hold rule (only a
        // failed Sabqi/Manzil or a missed Nazira does), so the first child
        // stays off hold while still giving the history heatmap red days.
        const occasionalSabaqFail = slot.type === 'sabaq' && student.id === 's1' && back % 11 === 3;
        const result: 'pass' | 'fail' =
          (slot.type === 'sabqi' && failSabqi) ||
          (slot.type === 'manzil' && back === 7 && student.id === 's2') ||
          occasionalSabaqFail
            ? 'fail'
            : 'pass';
        const creditedLines = result === 'pass' ? (lines ?? 0) : 0;
        out.push({
          id: `e-${student.id}-${iso}-${slot.type}`,
          student_id: student.id,
          class_id: student.class_id,
          teacher_id: slot.teacher,
          entry_date: iso,
          entry_type: slot.type,
          surah_id: surahId,
          surah_to: surahId,
          ayah_from: 1,
          ayah_to: slot.type === 'sabaq' ? 8 : 40,
          page_from: slot.type === 'manzil' ? pageTo : pageFrom,
          page_to: pageFrom,
          // CRITICAL BUSINESS RULE (Hifz Core): a failed lesson, or a Sabaq
          // whose Nazira was not done, credits 0 lines — so it stores no range
          // either. Revision slots are measured in juz, not lines.
          line_from: creditedLines ? 1 : undefined,
          line_to: creditedLines || undefined,
          lines_count: creditedLines,
          juz_start: slot.type === 'manzil' ? 30 : student.current_juz,
          juz_list: slot.type === 'manzil' ? [29, 30] : undefined,
          juz_amount: slot.type === 'manzil' ? 2 : undefined,
          result,
          nazira_done: slot.type === 'sabaq' ? slot.nazira : undefined,
          mistakes: result === 'pass' ? (back % 3) : 4,
          forgets: result === 'pass' ? 0 : 2,
          remark: result === 'pass' ? REMARKS_PASS[back % REMARKS_PASS.length] : REMARKS_FAIL[back % REMARKS_FAIL.length],
          days_behind: plan.daily_target_pages > 0 ? Math.max(0, (back % 5) * 0.5) : 0,
          created_at: `${iso}T08:30:00+05:30`,
        });
      }
    }
  }
  return out;
}

export const DAILY_ENTRIES: DailyEntry[] = buildEntries();

// ── Attendance ──────────────────────────────────────────────
function buildAttendance(): Attendance[] {
  const out: Attendance[] = [];
  const today = new Date();
  for (let back = 29; back >= 0; back--) {
    const date = addDays(today, -back);
    if (date.getDay() === 5) continue;
    const iso = toISODate(date);
    for (const student of STUDENTS) {
      let status: AttendanceStatus = 'present';
      if (back === 12 && student.id === 's2') status = 'absent';
      else if (back === 20 && student.id === 's1') status = 'leave';
      else if (back === 4 && student.id === 's1') status = 'late';
      out.push({
        id: `a-${student.id}-${iso}`,
        student_id: student.id,
        att_date: iso,
        status,
        reason: status === 'leave' ? 'Family visit — approved by the office' : undefined,
        marked_by: 't1',
      });
    }
  }
  return out;
}

export const ATTENDANCE: Attendance[] = buildAttendance();

// ── Exams & results (100-mark matrix: 6×10 + tajweed 25 + tarteel 15) ──
export const EXAM_COMPONENTS: Record<string, number> = {
  q1: 10, q2: 10, q3: 10, q4: 10, q5: 10, q6: 10, tajweed: 25, tarteel: 15,
};

export const EXAMS: Exam[] = [
  {
    id: 'e10', name: '10-Juz Milestone Examination', category: 'stage', year: 2026, month: 8,
    juz_target: 21, pass_mark: 60, components: EXAM_COMPONENTS, published: true, held_on: '2026-08-15',
  },
  {
    id: 'e11', name: 'Monthly Examination — August 2026', category: 'monthly', year: 2026, month: 8,
    pass_mark: 60, components: EXAM_COMPONENTS, published: true, held_on: '2026-08-05',
  },
  {
    id: 'e12', name: 'Year-End Examination 2026', category: 'year_end', year: 2026,
    pass_mark: 60, components: EXAM_COMPONENTS, published: false, held_on: '2026-12-10',
  },
];

export const EXAM_RESULTS: ExamResult[] = [
  {
    id: 'r1', exam_id: 'e10', student_id: 's1', examiner_id: 't1', examiner_name: 'Ash-Sheikh Dilhan',
    attempt: 1, exam_date: '2026-08-15',
    marks: { q1: 10, q2: 10, q3: 10, q4: 10, q5: 10, q6: 6, tajweed: 23, tarteel: 14 },
    total_marks: 93, grade: 'A+', result: 'pass', absent: false, rank: 1, class_size: 24,
    notes: 'Outstanding. Only Q6 needed a prompt.',
  },
  {
    id: 'r2', exam_id: 'e11', student_id: 's1', examiner_id: 't3', examiner_name: 'Ash-Sheikh Numan',
    attempt: 1, exam_date: '2026-08-05',
    marks: { q1: 9, q2: 10, q3: 8, q4: 9, q5: 10, q6: 8, tajweed: 21, tarteel: 13 },
    total_marks: 88, grade: 'A', result: 'pass', absent: false, rank: 3, class_size: 24,
  },
  {
    id: 'r3', exam_id: 'e11', student_id: 's2', examiner_id: 't3', examiner_name: 'Ash-Sheikh Numan',
    attempt: 1, exam_date: '2026-08-05',
    marks: { q1: 7, q2: 8, q3: 7, q4: 8, q5: 7, q6: 6, tajweed: 17, tarteel: 11 },
    total_marks: 71, grade: 'B', result: 'pass', absent: false, rank: 9, class_size: 22,
  },
];

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'an1', title: 'Year-End Examination — Dates Released',
    body: 'The Year-End Hifz Examination will be held from 10 December 2026. Students must complete their assigned juz before 1 December.',
    audience: 'all_parents', priority: 'high', published_at: '2026-08-26T09:00:00+05:30',
  },
  {
    id: 'an2', title: 'Hifz Completion Function — Invitation',
    body: 'We invite all parents to the Hifz Function honouring this year\'s Huffaz, after Asar on the last Friday of the term.',
    audience: 'everyone', priority: 'normal', published_at: '2026-08-20T16:30:00+05:30',
  },
  {
    id: 'an3', title: 'Term Break',
    body: 'The madrasa will be closed for the term break from 25 September to 5 October. Students must continue their Manzil at home.',
    audience: 'all_parents', priority: 'normal', published_at: '2026-08-15T10:00:00+05:30',
  },
];

// ── Derived stats for a student ─────────────────────────────
export function monthStatsFor(studentId: string, days = 30): MonthStats {
  const entries = DAILY_ENTRIES.filter(e => e.student_id === studentId).slice(-days * 3);
  const att = ATTENDANCE.filter(a => a.student_id === studentId).slice(-days);
  const passed = entries.filter(e => e.result === 'pass').length;
  const failed = entries.length - passed;
  const present = att.filter(a => a.status === 'present' || a.status === 'late').length;
  const absent = att.filter(a => a.status === 'absent').length;
  const leave = att.filter(a => a.status === 'leave').length;
  const marked = att.length || 1;
  return {
    present,
    absent,
    leave,
    late: att.filter(a => a.status === 'late').length,
    lessons_done: entries.length,
    lessons_passed: passed,
    lessons_failed: failed,
    attendance_percent: Math.round((present / marked) * 100),
    pass_rate_percent: entries.length ? Math.round((passed / entries.length) * 100) : 0,
  };
}

/**
 * The Hold Rule, derived from the ledger.
 * Fail SABQI or MANZIL (or skip Nazira) ⇒ tomorrow's new Sabaq is blocked.
 * Source: docs/hifz_section_structure.md §3 and ADMIN_WEBAPP_SPEC.md §2.4.
 */
export interface HoldState {
  active: boolean;
  reason: string | null;
  lessonType: EntryType | null;
  onDate: string | null;
}

export function holdStateFor(studentId: string): HoldState {
  const student = getStudentById(studentId);
  const sorted = DAILY_ENTRIES.filter(e => e.student_id === studentId).sort((a, b) =>
    a.entry_date < b.entry_date ? 1 : -1
  );
  const latestSabqi = sorted.find(e => e.entry_type === 'sabqi');
  const latestManzil = sorted.find(e => e.entry_type === 'manzil');
  const latestSabaq = sorted.find(e => e.entry_type === 'sabaq');

  if (latestSabqi?.result === 'fail') {
    return {
      active: true,
      reason: "Today's Sabqi revision was not passed, so tomorrow's new Sabaq is on hold until it is cleared.",
      lessonType: 'sabqi',
      onDate: latestSabqi.entry_date,
    };
  }
  if (latestManzil?.result === 'fail') {
    return {
      active: true,
      reason: "Manzil revision was not passed, so tomorrow's new Sabaq is on hold until it is repeated.",
      lessonType: 'manzil',
      onDate: latestManzil.entry_date,
    };
  }
  if (latestSabaq && latestSabaq.nazira_done === false) {
    return {
      active: true,
      reason: "Tomorrow's new lesson was cut because the Nazira pre-read was not done this evening.",
      lessonType: 'sabaq',
      onDate: latestSabaq.entry_date,
    };
  }
  return {
    active: !!student?.hold_active,
    reason: student?.hold_reason ?? null,
    lessonType: null,
    onDate: null,
  };
}
