// ─────────────────────────────────────────────────────────────
// Root app state: the linked children, the active child, language, and push
// preferences. Every screen reads the active child from here so the sibling
// switcher is a single setter and all queries stay consistent.
// ─────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';

import { DataSource } from '@/data/datasource';
import type { Student } from '@/data/types';
import { changeLanguage, type AppLang } from '@/i18n';

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
  children: Student[];
  activeChild: Student | null;
  setActiveChildId: (id: string) => void;
  isLoading: boolean;
  lang: AppLang;
  setLang: (l: AppLang) => void;
  prefs: PushPrefs;
  setPrefs: (p: Partial<PushPrefs>) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProviders({ children: nodes }: { children: React.ReactNode }) {
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);
  const [lang, setLangState] = useState<AppLang>('en');
  const [prefs, setPrefsState] = useState<PushPrefs>(DEFAULT_PREFS);

  const kidsQuery = useQuery({
    queryKey: ['children'],
    queryFn: () => DataSource.getChildren(),
    staleTime: 5 * 60_000,
  });

  const kids = useMemo<Student[]>(() => kidsQuery.data ?? [], [kidsQuery.data]);

  // Restore persisted choices, then apply them.
  useEffect(() => {
    (async () => {
      const [savedLang, savedPrefs, savedChild] = await Promise.all([
        AsyncStorage.getItem(LANG_KEY),
        AsyncStorage.getItem(PREFS_KEY),
        AsyncStorage.getItem(ACTIVE_CHILD_KEY),
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
    })();
  }, []);

  // Default the active child to the first linked one.
  useEffect(() => {
    if (!activeChildId && kids.length > 0) setActiveChildIdState(kids[0].id);
  }, [kids, activeChildId]);

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
      children: kids,
      activeChild,
      setActiveChildId,
      isLoading: kidsQuery.isLoading,
      lang,
      setLang,
      prefs,
      setPrefs,
    }),
    [kids, activeChild, setActiveChildId, kidsQuery.isLoading, lang, setLang, prefs, setPrefs]
  );

  return <Ctx.Provider value={value}>{nodes}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProviders>');
  return ctx;
}

/** Convenience: the active child id, or null before children have loaded. */
export function useActiveChildId(): string | null {
  return useApp().activeChild?.id ?? null;
}
