// ─────────────────────────────────────────────────────────────
// Supabase data access for the Parent app.
//
// IMPORTANT — this targets the schema that is ACTUALLY DEPLOYED on the shared
// project (`supabase/setup_schema.sql`, the same one the Teacher app writes
// to), NOT the aspirational UUID schema in `supabase/schema.sql`:
//
//   • ids are TEXT, not uuid
//   • `students` primary key is `admission_no`; every FK points at
//     `students.legacy_id` ('s1'..'s336')
//   • there is NO `parents` and NO `parent_students` table
//   • `exam_results` uses `total` / `outcome` / `position`, not
//     `total_marks` / `result` / `rank`
//   • `announcements` has `created_at` and no `priority`
//   • `students` has no `current_juz`, `division_id` or `hold_active`
//
// Because there is no `parent_students`, a parent is matched to their children
// through `students.guardian_phone`. That is the only link the live database
// actually carries. See docs/PARENT_APP_PLAN.md gap G4.
// ─────────────────────────────────────────────────────────────
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { HAS_SUPABASE, SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig';
import { getPageInfo } from './mushaf';
import { juzTargetForYear, trackForYear } from '../lib/contract';
import type {
  Announcement,
  Attendance,
  Class,
  DailyEntry,
  Exam,
  ExamResult,
  Student,
  Teacher,
} from './types';

export const supabase = HAS_SUPABASE
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const isLive = () => !!supabase;

// ── Row shapes as they exist in the live database ───────────
interface StudentRow {
  /** Core contract column; absent on rows written before it existed. */
  track?: string;
  admission_no: string;
  legacy_id: string;
  full_name: string;
  age?: number | null;
  class_id?: string | null;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  guardian_phone?: string | null;
  city?: string | null;
  current_year?: number | null;
  juz_target?: number | null;
  joined_on?: string | null;
  status?: string | null;
  current_page?: number | null;
  days_behind?: number | null;
}

/** Only digits, so '+94 77 123 4567' matches '0771234567'-style variants. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Match on the last 9 digits so country-code and spacing differences don't matter. */
function phoneTail(value: string): string {
  const d = digitsOnly(value);
  return d.slice(-9);
}

/** A live `students` row → the app's Student shape (missing columns derived). */
function toStudent(row: StudentRow): Student {
  const page = row.current_page ?? 1;
  // `current_juz` and `division_id` do not exist in the live table; derive the
  // juz from the mushaf page index and default the division to Hifzul Quran.
  const juz = getPageInfo(page).juz[0];
  return {
    id: row.legacy_id,
    admission_no: row.admission_no,
    full_name: row.full_name,
    age: row.age ?? undefined,
    class_id: row.class_id ?? '',
    division_id: 1,
    current_juz: juz,
    current_page: page,
    current_year: row.current_year ?? undefined,
    // `track` is part of the Core contract; older rows may not carry it, so
    // derive it from the academic year (Year 4/5 are Dawr).
    track: (row.track as Student['track']) ?? trackForYear(row.current_year ?? undefined),
    juz_target: row.juz_target ?? juzTargetForYear(row.current_year ?? undefined),
    days_behind: Number(row.days_behind ?? 0),
    hold_active: false,
    hold_reason: null,
    guardian_name: row.guardian_name ?? undefined,
    guardian_phone: row.guardian_phone ?? undefined,
    guardian_relation: (row.guardian_relation as Student['guardian_relation']) ?? undefined,
    city: row.city ?? undefined,
    joined_on: row.joined_on ?? '',
    status: (row.status as Student['status']) ?? 'active',
  };
}

// ── Children ────────────────────────────────────────────────

/**
 * Every student whose `guardian_phone` matches. The live database has no
 * `parent_students`, so this is how a parent finds their children.
 */
export async function fetchChildrenByGuardianPhone(phone: string): Promise<Student[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('status', 'active')
    .order('full_name');
  if (error) throw error;
  const tail = phoneTail(phone);
  if (!tail) return [];
  return ((data ?? []) as StudentRow[])
    .filter(r => !!r.guardian_phone && phoneTail(r.guardian_phone) === tail)
    .map(toStudent);
}

/** All students — used to resolve names when the phone lookup finds nothing. */
export async function fetchAllStudents(): Promise<Student[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('students').select('*').order('full_name');
  if (error) throw error;
  return ((data ?? []) as StudentRow[]).map(toStudent);
}

export async function fetchClasses(): Promise<Class[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('classes').select('*');
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; name: string; floor: number }>).map(c => ({
    id: c.id,
    name: c.name,
    floor: c.floor,
    division_id: 1,
  }));
}

export async function fetchTeachers(): Promise<Teacher[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('teachers').select('*');
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; full_name: string; phone?: string }>).map(t => ({
    id: t.id,
    full_name: t.full_name,
    phone: t.phone,
  }));
}

// ── Academic records ────────────────────────────────────────

export async function fetchEntries(studentId: string, days = 30): Promise<DailyEntry[]> {
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('student_id', studentId)
    .gte('entry_date', since.toISOString().slice(0, 10))
    .order('entry_date', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DailyEntry[]).map(e => ({
    ...e,
    mistakes: e.mistakes ?? 0,
    forgets: e.forgets ?? 0,
    remark: e.remark ?? '',
    // Multi-app rule: never assume a column another app owns is present.
    lines_count: e.lines_count ?? 0,
    days_behind: Number(e.days_behind ?? 0),
  }));
}

export async function fetchAttendance(studentId: string, days = 30): Promise<Attendance[]> {
  if (!supabase) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .gte('att_date', since.toISOString().slice(0, 10))
    .order('att_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

/**
 * Published exams joined to this child's results, plus the examiner resolved
 * through `exam_examiners` → `teachers`.
 */
export async function fetchExamResults(studentId: string): Promise<ExamResult[]> {
  if (!supabase) return [];
  const { data: results, error } = await supabase
    .from('exam_results')
    .select('*, exam:exams(*), examiner:exam_examiners(teacher:teachers(id, full_name))')
    .eq('student_id', studentId);
  if (error) throw error;

  type JoinedRow = {
    id: string;
    exam_id: string;
    student_id: string;
    attempt?: number;
    marks?: Record<string, number> | null;
    total?: number | null;
    grade?: string | null;
    position?: number | null;
    outcome?: string | null;
    exam?: unknown;
    examiner?: unknown;
  };

  const unwrap = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Record<string, unknown> | undefined;

  return ((results ?? []) as JoinedRow[])
    .map((r): ExamResult | null => {
      const exam = unwrap(r.exam);
      if (!exam || exam.published !== true) return null; // never show unpublished exams
      const examinerJoin = unwrap(r.examiner);
      const examinerTeacher = unwrap(examinerJoin?.teacher);
      const total = Number(r.total ?? 0);
      const heldOn = (exam.held_on as string | undefined) ?? '';
      return {
        id: r.id,
        exam_id: r.exam_id,
        exam_name: exam.name as string,
        student_id: r.student_id,
        examiner_id: (examinerTeacher?.id as string) ?? null,
        examiner_name: (examinerTeacher?.full_name as string) ?? undefined,
        attempt: r.attempt ?? 1,
        exam_date: heldOn,
        marks: (r.marks as Record<string, number>) ?? {},
        total_marks: total,
        grade: (r.grade as ExamResult['grade']) ?? 'C',
        result: (r.outcome as ExamResult['result']) ?? (total >= 60 ? 'pass' : 'fail'),
        absent: false,
        rank: r.position ?? undefined,
      };
    })
    .filter((r): r is ExamResult => r !== null)
    .sort((a, b) => (a.exam_date < b.exam_date ? 1 : -1));
}

export async function fetchExams(): Promise<Exam[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('exams').select('*').eq('published', true);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map(e => ({
    id: e.id as string,
    name: e.name as string,
    category: (e.category as Exam['category']) ?? 'monthly',
    faculty: e.faculty as string,
    year: e.year as number | undefined,
    month: e.month as number | undefined,
    pass_mark: 60,
    components: (e.components as Record<string, number>) ?? {},
    published: true,
    held_on: e.held_on as string | undefined,
  }));
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>)
    // The live table has no audience targeting for parents beyond a text tag;
    // teacher-only notices are filtered out client-side.
    .filter(a => a.audience !== 'all_teachers')
    .map(a => ({
      id: a.id as string,
      title: (a.title as string) ?? '',
      body: (a.body as string) ?? '',
      audience: ((a.audience as Announcement['audience']) ?? 'all_parents') as Announcement['audience'],
      priority: 'normal' as const,
      published_at: (a.created_at as string) ?? new Date().toISOString(),
    }));
}
