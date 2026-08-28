// ─────────────────────────────────────────────────────────────
// Unified parent data interface.
//
// Screens import ONLY this module. It talks to Supabase when keys are present
// and falls back to the built-in demo dataset otherwise, so the app is fully
// explorable with no backend at all.
// ─────────────────────────────────────────────────────────────
import * as live from './supabase';
import {
  ANNOUNCEMENTS,
  ATTENDANCE,
  DAILY_ENTRIES,
  EXAM_RESULTS,
  EXAMS,
  STUDENTS,
  monthStatsFor,
  holdStateFor,
  getStudentById,
  getClassById,
  getTeacherById,
} from './mock';
import type { HoldState } from './mock';
import type {
  Announcement,
  Attendance,
  DailyEntry,
  Exam,
  ExamResult,
  MonthStats,
  Student,
  Notification as AppNotification,
  Class,
  Teacher,
} from './types';
import { HAS_SUPABASE } from './supabaseConfig';

export { HAS_SUPABASE };
export type { HoldState, MonthStats };

export const DataSource = {
  // ── Auth ────────────────────────────────────────────────
  async signInWithPassword(email: string, password: string) {
    return live.signInWithPassword(email, password);
  },
  async signOut() {
    return live.signOut();
  },

  // ── Children ────────────────────────────────────────────
  async getChildren(): Promise<Student[]> {
    if (!HAS_SUPABASE) return STUDENTS;
    const kids = await live.fetchMyChildren();
    return kids.length ? kids : [];
  },
  async getStudent(id: string): Promise<Student | null> {
    if (!HAS_SUPABASE) return getStudentById(id);
    const kids = await this.getChildren();
    return kids.find(s => s.id === id) ?? null;
  },
  getClass(id: string): Class | null {
    return getClassById(id);
  },
  getTeacher(id: string): Teacher | null {
    return getTeacherById(id);
  },

  // ── Daily lessons ───────────────────────────────────────
  async getEntries(studentId: string, days = 30): Promise<DailyEntry[]> {
    if (!HAS_SUPABASE) {
      return DAILY_ENTRIES.filter(e => e.student_id === studentId)
        .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
    }
    return live.fetchEntries(studentId, days);
  },

  /** The three lessons for one date (Sabaq, Sabqi, Manzil). */
  async getEntriesForDate(studentId: string, isoDate: string): Promise<DailyEntry[]> {
    const all = await this.getEntries(studentId, 45);
    return all.filter(e => e.entry_date === isoDate);
  },

  async getHoldState(studentId: string): Promise<HoldState> {
    if (!HAS_SUPABASE) return holdStateFor(studentId);
    // With live data the server already flags students.hold_active; re-derive
    // the parent-friendly reason from the most recent lessons.
    const entries = await this.getEntries(studentId, 7);
    const byType = (t: DailyEntry['entry_type']) => entries.find(e => e.entry_type === t);
    const sabqi = byType('sabqi');
    const manzil = byType('manzil');
    const sabaq = byType('sabaq');
    if (sabqi?.result === 'fail') {
      return { active: true, lessonType: 'sabqi', onDate: sabqi.entry_date,
        reason: "Today's Sabqi revision was not passed, so tomorrow's new Sabaq is on hold until it is cleared." };
    }
    if (manzil?.result === 'fail') {
      return { active: true, lessonType: 'manzil', onDate: manzil.entry_date,
        reason: "Manzil revision was not passed, so tomorrow's new Sabaq is on hold until it is repeated." };
    }
    if (sabaq && sabaq.nazira_done === false) {
      return { active: true, lessonType: 'sabaq', onDate: sabaq.entry_date,
        reason: "Tomorrow's new lesson was cut because the Nazira pre-read was not done this evening." };
    }
    const student = await this.getStudent(studentId);
    return { active: !!student?.hold_active, reason: student?.hold_reason ?? null, lessonType: null, onDate: null };
  },

  // ── Attendance ──────────────────────────────────────────
  async getAttendance(studentId: string, days = 30): Promise<Attendance[]> {
    if (!HAS_SUPABASE) return ATTENDANCE.filter(a => a.student_id === studentId);
    return live.fetchAttendance(studentId, days);
  },

  async getMonthStats(studentId: string): Promise<MonthStats> {
    if (!HAS_SUPABASE) return monthStatsFor(studentId);
    const entries = await this.getEntries(studentId, 30);
    const att = await this.getAttendance(studentId, 30);
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

  // ── Announcements & notifications ───────────────────────
  async getAnnouncements(): Promise<Announcement[]> {
    if (!HAS_SUPABASE) return ANNOUNCEMENTS;
    return live.fetchAnnouncements();
  },
  async getNotifications(): Promise<AppNotification[]> {
    if (!HAS_SUPABASE) return [];
    return live.fetchNotifications();
  },
  async markNotificationRead(id: string) {
    return live.markNotificationRead(id);
  },
  async registerPushToken(token: string, platform: 'ios' | 'android' | 'web') {
    return live.upsertDeviceToken(token, platform);
  },
  async requestChildLink(admissionNo: string, dob: string) {
    return live.requestChildLink(admissionNo, dob);
  },
};
