// ─────────────────────────────────────────────────────────────
// Supabase client + parent-scoped queries.
//
// SECURITY MODEL: parents are scoped by Row Level Security, not by client-side
// filtering. `parent_students` + `auth.uid()` decide what a parent can read
// (supabase/schema.sql). Every query here therefore asks for "my rows" and
// trusts the database to enforce the boundary.
// ─────────────────────────────────────────────────────────────
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { HAS_SUPABASE, SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig';
import type {
  Announcement,
  Attendance,
  DailyEntry,
  Exam,
  ExamResult,
  Notification,
  Student,
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

// ── Auth ────────────────────────────────────────────────────

/** Email/password sign-in — works as soon as parent auth users exist (Phase 0). */
export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

/** Phone OTP sign-in — needs an SMS provider enabled on the project (gap G5). */
export async function signInWithPhoneOtp(phone: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
  return data.user;
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

// ── Parent-scoped reads ─────────────────────────────────────

/** The children linked to the signed-in parent via `parent_students`. */
export async function fetchMyChildren(): Promise<Student[]> {
  if (!supabase) return [];
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('parent_students')
    .select('student:students(*)')
    .eq('parent_id', uid);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as Array<{ student: Student | Student[] | null }>)
    .map(r => (Array.isArray(r.student) ? r.student[0] : r.student))
    .filter((s): s is Student => !!s);
  return rows;
}

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
  return (data ?? []) as DailyEntry[];
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

/** Only published exams reach a parent — enforced again by RLS. */
export async function fetchExamResults(studentId: string): Promise<ExamResult[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('exam_results')
    .select('*, exam:exams(*)')
    .eq('student_id', studentId)
    .order('exam_date', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<ExamResult & { exam?: Exam | Exam[] | null }>;
  return rows.map(r => {
    const exam = Array.isArray(r.exam) ? r.exam[0] : r.exam;
    return { ...r, exam_id: exam?.id ?? r.exam_id, exam_name: exam?.name } as ExamResult & { exam_name?: string };
  });
}

export async function fetchExams(): Promise<Exam[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('exams').select('*').eq('published', true);
  if (error) throw error;
  return (data ?? []) as Exam[];
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .in('audience', ['everyone', 'all_parents'])
    .order('published_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export async function fetchNotifications(): Promise<Notification[]> {
  if (!supabase) return [];
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', uid)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markNotificationRead(id: string) {
  if (!supabase) return;
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

/** Register this device for push (device_tokens is one of the few parent writes). */
export async function upsertDeviceToken(expoToken: string, platform: 'ios' | 'android' | 'web') {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.from('device_tokens').upsert(
    { user_id: uid, expo_token: expoToken, platform, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,expo_token' }
  );
}

/** Ask the office to link another child (Admission No + date of birth). */
export async function requestChildLink(admissionNo: string, dob: string) {
  if (!supabase) return { ok: false as const, message: 'Offline — ask the office in person.' };
  const uid = await currentUserId();
  const { data: student } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('admission_no', admissionNo)
    .eq('dob', dob)
    .maybeSingle();
  if (!student) return { ok: false as const, message: 'No student matches that admission number and date of birth.' };
  const { error } = await supabase.from('parent_students').upsert(
    { parent_id: uid, student_id: (student as { id: string }).id, relation: 'father', is_primary: false },
    { onConflict: 'parent_id,student_id' }
  );
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, message: 'Child linked.' };
}
