// ─────────────────────────────────────────────────────────────
// Root app state: the guardian's number, their linked children, the active
// child, language, and push preferences.
//
// The live project has no Supabase Auth and no `parent_students` table, so the
// parent is identified by the guardian mobile number the madrasa holds on
// record (`students.guardian_phone`). See docs/PARENT_APP_PLAN.md gap G4.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

import { DataSource, HAS_SUPABASE } from '@/data/datasource';
import type { Student } from '@/data/types';
import { changeLanguage, type AppLang } from '@/i18n';

const PHONE_KEY = 'hfz-parent:guardian-phone';
const DEMO_KEY = 'hfz-parent:demo-mode';
const ACTIVE_CHILD_KEY = 'hfz-parent:active-child';
const LANG_KEY = 'hfz-parent:lang';
const PREFS_KEY = 'hfz-parent:prefs';

export interface PushPrefs {
  lessons: boolean;
  attendance: boolean;
  exams: boolean;
  announcements: boolean;
}

export const DEFAULT_PREFS: PushPrefs = {
  lessons: true,
  attendance: true,
  exams: true,
  announcements: false,
};

interface AppState {
  /** The guardian number on record; empty until the parent signs in. */
  guardianPhone: string;
  setGuardianPhone: (phone: string) => void;
  /** True when the parent chose the built-in demo family. */
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  children: Student[];
  activeChild: Student | null;
  setActiveChildId: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  /** True once we know whether a sign-in is needed. */
  booting: boolean;
  /** Teacher display names keyed by id, resolved once per session. */
  teacherNames: Record<string, string>;
  teacherName: (id: string) => string;
  lang: AppLang;
  setLang: (l: AppLang) => void;
  prefs: PushPrefs;
  setPrefs: (p: Partial<PushPrefs>) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProviders({ children: nodes }: { children: React.ReactNode }) {
  const [guardianPhone, setGuardianPhoneState] = useState('');
  const [demoMode, setDemoModeState] = useState(false);
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);
  const [lang, setLangState] = useState<AppLang>('en');
  const [prefs, setPrefsState] = useState<PushPrefs>(DEFAULT_PREFS);
  const [booting, setBooting] = useState(true);

  // Restore persisted choices before the first query runs.
  useEffect(() => {
    (async () => {
      const [savedLang, savedPrefs, savedChild, savedPhone, savedDemo] = await Promise.all([
        AsyncStorage.getItem(LANG_KEY),
        AsyncStorage.getItem(PREFS_KEY),
        AsyncStorage.getItem(ACTIVE_CHILD_KEY),
        AsyncStorage.getItem(PHONE_KEY),
        AsyncStorage.getItem(DEMO_KEY),
      ]);
      if (savedLang === 'en' || savedLang === 'ar' || savedLang === 'ta') {
        setLangState(savedLang);
        changeLanguage(savedLang);
      }
      if (savedPrefs) {
        try {
          setPrefsState({ ...DEFAULT_PREFS, ...(JSON.parse(savedPrefs) as Partial<PushPrefs>) });
        } catch {
          /* ignore a corrupt cache entry */
        }
      }
      if (savedChild) setActiveChildIdState(savedChild);
      if (savedPhone) setGuardianPhoneState(savedPhone);
      setDemoModeState(savedDemo === 'true');
      setBooting(false);
    })();
  }, []);

  const kidsQuery = useQuery({
    queryKey: ['children', guardianPhone, demoMode],
    queryFn: async () => {
      if (!HAS_SUPABASE || demoMode) return DataSource.demoChildren();
      return DataSource.getChildren(guardianPhone);
    },
    enabled: !booting && (!!guardianPhone || demoMode || !HAS_SUPABASE),
    staleTime: 5 * 60_000,
  });

  const kids = useMemo<Student[]>(() => kidsQuery.data ?? [], [kidsQuery.data]);

  // Default the active child to the first linked one.
  useEffect(() => {
    if (kids.length > 0 && !kids.some(k => k.id === activeChildId)) {
      setActiveChildIdState(kids[0].id);
    }
  }, [kids, activeChildId]);

  // Resolve every teacher name referenced by the active child's lessons once.
  const activeId = kids.find(k => k.id === activeChildId)?.id ?? kids[0]?.id ?? '';
  const teacherQuery = useQuery({
    queryKey: ['teacher-names', activeId],
    queryFn: async () => {
      const entries = await DataSource.getEntries(activeId, 90);
      return DataSource.getTeacherNames(entries.map(e => e.teacher_id));
    },
    enabled: !!activeId,
    staleTime: 30 * 60_000,
  });

  const teacherNames = useMemo<Record<string, string>>(
    () => teacherQuery.data ?? {},
    [teacherQuery.data]
  );
  const teacherName = useCallback((id: string) => teacherNames[id] ?? '—', [teacherNames]);

  const setGuardianPhone = useCallback((phone: string) => {
    setGuardianPhoneState(phone);
    setDemoModeState(false);
    AsyncStorage.setItem(PHONE_KEY, phone).catch(() => undefined);
    AsyncStorage.removeItem(DEMO_KEY).catch(() => undefined);
  }, []);

  const setDemoMode = useCallback((on: boolean) => {
    setDemoModeState(on);
    AsyncStorage.setItem(DEMO_KEY, String(on)).catch(() => undefined);
  }, []);

  const setActiveChildId = useCallback((id: string) => {
    setActiveChildIdState(id);
    AsyncStorage.setItem(ACTIVE_CHILD_KEY, id).catch(() => undefined);
  }, []);

  const setLang = useCallback((l: AppLang) => {
    setLangState(l);
    changeLanguage(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => undefined);
  }, []);

  const setPrefs = useCallback((p: Partial<PushPrefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...p };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const activeChild = useMemo(
    () => kids.find(k => k.id === activeChildId) ?? kids[0] ?? null,
    [kids, activeChildId]
  );

  const value = useMemo<AppState>(
    () => ({
      guardianPhone,
      setGuardianPhone,
      demoMode,
      setDemoMode,
      children: kids,
      activeChild,
      setActiveChildId,
      isLoading: kidsQuery.isLoading,
      isError: kidsQuery.isError,
      refetch: () => kidsQuery.refetch(),
      booting,
      teacherNames,
      teacherName,
      lang,
      setLang,
      prefs,
      setPrefs,
    }),
    [
      guardianPhone, setGuardianPhone, demoMode, setDemoMode, kids, activeChild, setActiveChildId,
      kidsQuery.isLoading, kidsQuery.isError, kidsQuery, booting, teacherNames, teacherName,
      lang, setLang, prefs, setPrefs,
    ]
  );

  return <Ctx.Provider value={value}>{nodes}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProviders>');
  return ctx;
}

export function useActiveChildId(): string | null {
  return useApp().activeChild?.id ?? null;
}
