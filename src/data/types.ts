// ─────────────────────────────────────────────────────────────
// Hfz-Parent — shared domain types.
// Mirrors `supabase/schema.sql` (the UUID schema) exactly, so a Supabase row
// and a mock row are the same shape and screens need no adapters.
//
// NOTE: `src/lib/score.ts` is reused verbatim from the Teacher app and imports
// these types from '../data/mock', which re-exports this file.
// ─────────────────────────────────────────────────────────────

export type Quality = 4 | 3 | 2 | 1;
export type EntryType = 'sabaq' | 'sabqi' | 'manzil';
export type LessonResult = 'pass' | 'fail';
export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'late';
export type StudentStatus = 'active' | 'alumni' | 'left';
export type ExamCategory = 'stage' | 'cumulative' | 'monthly' | 'year_end' | 'riwayah';
export type GuardianRelation = 'father' | 'mother' | 'guardian' | 'other';
export type Lang = 'en' | 'ar' | 'ta';
export type DivisionId = 1 | 2 | 3 | 4; // Hifzul Quran · Girdan · Riwayath · Dawr

export const DIVISION_NAMES: Record<DivisionId, string> = {
  1: 'Hifzul Quran',
  2: 'Qirdhan (Girdan)',
  3: 'Riwayath',
  4: 'Dawr',
};

export interface Teacher {
  id: string;
  full_name: string;
  phone?: string;
}

export interface Class {
  id: string;
  name: string;
  floor: number;
  division_id: DivisionId;
}

export interface Student {
  id: string;
  admission_no: string;
  full_name: string;
  dob?: string;
  age?: number;
  class_id: string;
  division_id: DivisionId;
  current_juz?: number;
  current_page: number;
  current_line?: number;
  current_year?: number;
  juz_target?: number;
  days_behind: number;
  hold_active: boolean;
  hold_reason?: string | null;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: GuardianRelation;
  city?: string;
  joined_on: string;
  status: StudentStatus;
  avatar_color?: string;
}

export interface Surah {
  id: number;
  name_ar: string;
  name_en: string;
  name_ta: string;
  ayah_count: number;
  juz_start: number;
  page_start: number;
}

export interface TargetPlan {
  id: string;
  student_id: string;
  start_page: number;
  end_page: number;
  daily_target_pages: number;
  daily_target_lines?: number;
  start_date: string;
  target_date: string;
}

/** One row per (student, date, lesson type) — the core academic ledger. */
export interface DailyEntry {
  id: string;
  student_id: string;
  class_id: string;
  teacher_id: string;
  entry_date: string;
  entry_type: EntryType;
  surah_id: number;
  surah_to?: number;
  ayah_from: number;
  ayah_to: number;
  page_from: number;
  page_to: number;
  line_from?: number;
  line_to?: number;
  juz_start?: number;
  juz_amount?: number;
  juz_list?: number[];
  result: LessonResult;
  nazira_done?: boolean;
  mistakes: number;
  forgets?: number;
  remark: string;
  quality?: Quality;
  days_behind: number;
  created_at: string;
  edited_at?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  att_date: string;
  status: AttendanceStatus;
  reason?: string;
  marked_by: string;
}

export interface Exam {
  id: string;
  name: string;
  category: ExamCategory;
  faculty?: string;
  year?: number;
  month?: number;
  juz_target?: number;
  pass_mark: number;
  /** Max marks per component — {"q1":10,...,"tajweed":25,"tarteel":15} */
  components: Record<string, number>;
  /** schema.sql exposes `published boolean` (NOT `status`). See plan gap G3. */
  published: boolean;
  held_on?: string;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  examiner_id?: string | null;
  /** Resolved display name, so a parent never needs the teachers table. */
  examiner_name?: string;
  /** Resolved exam title, joined by the datasource. */
  exam_name?: string;
  attempt: number;
  exam_date: string;
  marks: Record<string, number>;
  total_marks: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  result: 'pass' | 'fail';
  absent: boolean;
  notes?: string;
  /** Class position, computed server-side or from the result set. */
  rank?: number;
  class_size?: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: 'everyone' | 'all_teachers' | 'all_parents' | 'floor' | 'class';
  floor?: number;
  class_id?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  published_at: string;
  expires_at?: string;
}

export interface Parent {
  id: string;
  full_name: string;
  phone: string;
  relation: GuardianRelation;
  preferred_lang: Lang;
}

export interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: 'teacher' | 'parent' | 'admin';
  student_id?: string;
  title: string;
  body: string;
  category: 'daily_update' | 'hold_alert' | 'exam_result' | 'attendance_alert' | 'announcement';
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

/** A lesson the parent taps on in the Mushaf margin pills / dashboard cards. */
export interface LessonSummary {
  entry: DailyEntry;
  teacher_name: string;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_ta: string;
}

export interface MonthStats {
  present: number;
  absent: number;
  leave: number;
  late: number;
  lessons_done: number;
  lessons_passed: number;
  lessons_failed: number;
  attendance_percent: number;
  pass_rate_percent: number;
}
