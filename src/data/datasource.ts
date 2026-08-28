// ─────────────────────────────────────────────────────────────
// Unified parent data interface. Screens import ONLY this module.
//
// It reads from Supabase when configured and falls back to the built-in demo
// family otherwise, so every screen still works with no backend.
// ─────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as live from './supabase';
import {
  ANNOUNCEMENTS,
  ATTENDANCE,
  DAILY_ENTRIES,
  EXAM_RESULTS,
  EXAMS,
  STUDENTS,
  TEACHERS,
  CLASSES,
  monthStatsFor,
  holdStateFor,
  getStudentById,
} from './mock';
import type { HoldState } from './mock';
import type {
  Announcement,
  Attendance,
  Class,
  DailyEntry,
  Exam,
  ExamResult,
  MonthStats,
  Student,
  Teacher,
} from './types';
import { HAS_SUPABASE } from './supabaseConfig';

export { HAS_SUPABASE };
export type { HoldState, MonthStats };

// Live lookups are cached in memory for the session — the roster barely changes
// and every lesson card needs a teacher name.
let teacherCache: Teacher[] | null = null;
let classCache: Class[] | null = null;

export const DataSource = {
  // ── Children ────────────────────────────────────────────
  /**
   * Children linked to a guardian phone via `students.guardian_phone`.
   * Returns [] when nothing matches — the caller decides what to show.
   */
  async getChildren(guardianPhone: string): Promise<Student[]> {
    if (!HAS_SUPABASE) return STUDENTS;
    if (!guardianPhone) return [];
    return live.fetchChildrenByGuardianPhone(guardianPhone);
  },

  /** The demo family, for the "try the demo" path. */
  demoChildren(): Student[] {
    return STUDENTS;
  },

  async getStudent(id: string): Promise<Student | null> {
    if (!HAS_SUPABASE) return getStudentById(id);
    const all = await live.fetchAllStudents();
    return all.find(s => s.id === id) ?? null;
  },

  async getClass(id: string): Promise<Class | null> {
    if (!HAS_SUPABASE) return CLASSES.find(c => c.id === id) ?? null;
    if (!classCache) classCache = await live.fetchClasses();
    return classCache.find(c => c.id === id) ?? null;
  },

  /** Teacher display name — used by every lesson card and margin pill. */
  async getTeacherName(id: string): Promise<string> {
    if (!HAS_SUPABASE) return TEACHERS.find(t => t.id === id)?.full_name ?? '—';
    if (!teacherCache) teacherCache = await live.fetchTeachers();
    return teacherCache.find(t => t.id === id)?.full_name ?? '—';
  },

  /** Names for a batch of teacher ids in one pass. */
  async getTeacherNames(ids: string[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    await Promise.all(
      Array.from(new Set(ids)).map(async id => {
        out[id] = await this.getTeacherName(id);
      })
    );
    return out;
  },

  // ── Daily lessons ───────────────────────────────────────
  async getEntries(studentId: string, days = 30): Promise<DailyEntry[]> {
    if (!HAS_SUPABASE) {
      return DAILY_ENTRIES.filter(e => e.student_id === studentId).sort((a, b) =>
        a.entry_date < b.entry_date ? 1 : -1
      );
    }
    return live.fetchEntries(studentId, days);
  },

  async getEntriesForDate(studentId: string, isoDate: string): Promise<DailyEntry[]> {
    const all = await this.getEntries(studentId, 45);
    return all.filter(e => e.entry_date === isoDate);
  },

  /**
   * The Hold Rule, derived from the ledger: fail Sabqi or Manzil (or skip the
   * Nazira pre-read) ⇒ tomorrow's new lesson is blocked.
   * `students.hold_active` does not exist in the live table, so this is always
   * derived rather than read.
   */
  async getHoldState(studentId: string): Promise<HoldState> {
    if (!HAS_SUPABASE) return holdStateFor(studentId);
    const entries = await this.getEntries(studentId, 7);
    const byType = (t: DailyEntry['entry_type']) => entries.find(e => e.entry_type === t);
    const sabqi = byType('sabqi');
    const manzil = byType('manzil');
    const sabaq = byType('sabaq');
    if (sabqi?.result === 'fail') {
      return {
        active: true,
        lessonType: 'sabqi',
        onDate: sabqi.entry_date,
        reason: "Sabqi revision was not passed, so tomorrow's new lesson is on hold until it is cleared.",
      };
    }
    if (manzil?.result === 'fail') {
      return {
        active: true,
        lessonType: 'manzil',
        onDate: manzil.entry_date,
        reason: "Manzil revision was not passed, so tomorrow's new lesson is on hold until it is repeated.",
      };
    }
    if (sabaq && sabaq.nazira_done === false) {
      return {
        active: true,
        lessonType: 'sabaq',
        onDate: sabaq.entry_date,
        reason: "Tomorrow's new lesson was cut because the Nazira pre-read was not done this evening.",
      };
    }
    return { active: false, reason: null, lessonType: null, onDate: null };
  },

  // ── Attendance ──────────────────────────────────────────
  async getAttendance(studentId: string, days = 30): Promise<Attendance[]> {
    if (!HAS_SUPABASE) return ATTENDANCE.filter(a => a.student_id === studentId);
    return live.fetchAttendance(studentId, days);
  },

  async getMonthStats(studentId: string, days = 30): Promise<MonthStats> {
    const entries = await this.getEntries(studentId, days);
    const att = await this.getAttendance(studentId, days);
    const passed = entries.filter(e => e.result === 'pass').length;
    const present = att.filter(a => a.status === 'present' || a.status === 'late').length;
    const marked = att.length || 1;
    return {
      present,
      absent: att.filter(a => a.status === 'absent').length,
      leave: att.filter(a => a.status === 'leave').length,
      late: att.filter(a => a.status === 'late').length,
      lessons_done: entries.length,
      lessons_passed: passed,
      lessons_failed: entries.length - passed,
      attendance_percent: Math.round((present / marked) * 100),
      pass_rate_percent: entries.length ? Math.round((passed / entries.length) * 100) : 0,
    };
  },

  // ── Exams ───────────────────────────────────────────────
  async getExamResults(studentId: string): Promise<ExamResult[]> {
    if (!HAS_SUPABASE) return EXAM_RESULTS.filter(r => r.student_id === studentId);
    return live.fetchExamResults(studentId);
  },

  async getExams(): Promise<Exam[]> {
    if (!HAS_SUPABASE) return EXAMS;
    return live.fetchExams();
  },

  // ── Notices ─────────────────────────────────────────────
  async getAnnouncements(): Promise<Announcement[]> {
    if (!HAS_SUPABASE) return ANNOUNCEMENTS;
    try {
      return await live.fetchAnnouncements();
    } catch {
      return ANNOUNCEMENTS;
    }
  },

  // ── Push tokens ─────────────────────────────────────────
  /**
   * The deployed schema has no device/token table, so the Expo push token is
   * kept on the device. A server-side relay needs a `push_tokens` table plus a
   * function to fan out; until then local notifications are what this app can
   * actually schedule (see `src/lib/notifications.ts`).
   */
  async registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    try {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, JSON.stringify({ token, platform }));
    } catch {
      /* non-fatal: notifications keep working locally without a stored token */
    }
  },
};

const PUSH_TOKEN_KEY = 'hfz-parent:push-token';

export async function readStoredPushToken(): Promise<{ token: string; platform: string } | null> {
  try {
    const raw = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
