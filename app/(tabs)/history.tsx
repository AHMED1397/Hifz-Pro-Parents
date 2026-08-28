import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { DataSource } from '@/data/datasource';
import { getTeacherById, getSurahById } from '@/data/mock';
import { formatGregorianDate } from '@/lib/hijri';
import { useApp } from '@/context/AppProviders';
import { FilterChips } from '@/components/FilterChips';
import { LessonDetailModal } from '@/components/LessonDetailModal';
import { LESSON_COLORS, lessonLabel } from '@/components/LessonCard';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';
import type { DailyEntry } from '@/data/types';

type FilterValue = 'all' | 'sabaq' | 'sabqi' | 'manzil';

const addDays = (base: Date, delta: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
};
const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Screen 4: 30-day activity heatmap + categorized lesson history + attendance. */
export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { activeChild } = useApp();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [inspecting, setInspecting] = useState<DailyEntry | null>(null);

  const studentId = activeChild?.id ?? '';

  const entriesQuery = useQuery({
    queryKey: ['history', studentId],
    queryFn: () => DataSource.getEntries(studentId, 30),
    enabled: !!studentId,
  });
  const attQuery = useQuery({
    queryKey: ['history-att', studentId],
    queryFn: () => DataSource.getAttendance(studentId, 30),
    enabled: !!studentId,
  });
  const statsQuery = useQuery({
    queryKey: ['stats', studentId],
    queryFn: () => DataSource.getMonthStats(studentId),
    enabled: !!studentId,
  });

  const entries = useMemo<DailyEntry[]>(() => entriesQuery.data ?? [], [entriesQuery.data]);

  /** day → 'pass' | 'fail' | 'none' — grey cells are Fridays / no class. */
  const heatmap = useMemo(() => {
    const byDate = new Map<string, DailyEntry[]>();
    for (const e of entries) {
      const arr = byDate.get(e.entry_date) ?? [];
      arr.push(e);
      byDate.set(e.entry_date, arr);
    }
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = addDays(today, -(29 - i));
      const key = iso(d);
      const dayEntries = byDate.get(key) ?? [];
      const friday = d.getDay() === 5;
      const state: 'pass' | 'fail' | 'none' = dayEntries.length
        ? dayEntries.every(e => e.result === 'pass')
          ? 'pass'
          : 'fail'
        : 'none';
      return { key, date: d, state, friday, count: dayEntries.length };
    });
  }, [entries]);

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter(e => e.entry_type === filter)),
    [entries, filter]
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#2E6BF0', '#1544B0']} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>🗓 {t('parent.tabHistory')}</Text>
        <Text style={styles.headerSub}>{t('parent.last30Days')}</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* ── Heatmap ─────────────────────────────────────── */}
        <View style={styles.grid}>
          {heatmap.map(cell => (
            <View
              key={cell.key}
              style={[
                styles.cell,
                cell.state === 'pass' && styles.cellPass,
                cell.state === 'fail' && styles.cellFail,
                cell.state === 'none' && (cell.friday ? styles.cellFriday : styles.cellNone),
              ]}
            >
              <Text style={styles.cellText}>{cell.date.getDate()}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <Legend color={Colors.success} label={t('parent.greenAllPassed')} />
          <Legend color={Colors.danger} label={t('parent.redNeedsRepeat')} />
          <Legend color="#D7DEE9" label={t('parent.greyNoClass')} />
        </View>

        {/* ── Attendance breakdown ──────────────────────────── */}
        <Text style={styles.sectionTitle}>📅 {t('parent.attendanceBreakdown')}</Text>
        <View style={styles.attRow}>
          <AttStat label={t('parent.presentDays')} value={statsQuery.data?.present ?? 0} color={Colors.success} />
          <AttStat label={t('parent.absentDays')} value={statsQuery.data?.absent ?? 0} color={Colors.danger} />
          <AttStat label={t('parent.leaveDays')} value={statsQuery.data?.leave ?? 0} color={Colors.warning} />
          <AttStat label={t('parent.lateDays')} value={statsQuery.data?.late ?? 0} color={Colors.primary} />
        </View>

        {/* ── Lesson feed ───────────────────────────────────── */}
        {/* FilterChips is the reused Teacher-app component: it takes i18n
            `labelKey`s, not raw strings. */}
        <FilterChips
          options={[
            { value: 'all', labelKey: 'parent.allLessons' },
            { value: 'sabaq', labelKey: 'parent.sabaqNew' },
            { value: 'sabqi', labelKey: 'parent.sabqiRevision' },
            { value: 'manzil', labelKey: 'parent.manzilRevision' },
          ]}
          selectedValue={filter}
          onChange={v => setFilter(v as FilterValue)}
        />

        {filtered.map(e => {
          const c = LESSON_COLORS[e.entry_type];
          const surah = getSurahById(e.surah_id);
          return (
            <Pressable key={e.id} style={styles.row} onPress={() => setInspecting(e)}>
              <View style={[styles.typeTag, { backgroundColor: c.bg }]}>
                <Text style={[styles.typeText, { color: c.text }]}>{c.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {lessonLabel(e.entry_type, t)} · {surah.name_en}
                </Text>
                <Text style={styles.rowSub}>
                  {formatGregorianDate(new Date(e.entry_date), i18n.language)} · {t('parent.page')} {e.page_from}
                  {e.line_to ? ` · ${e.line_to - (e.line_from ?? 1) + 1} lines` : ''}
                </Text>
                {e.remark ? <Text style={styles.rowRemark}>“{e.remark}”</Text> : null}
              </View>
              <View style={[styles.resultChip, e.result === 'pass' ? styles.resultPass : styles.resultFail]}>
                <Text style={styles.resultText}>{e.result === 'pass' ? '✓' : '✕'}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <LessonDetailModal
        entry={inspecting}
        teacherName={inspecting ? getTeacherById(inspecting.teacher_id)?.full_name ?? '—' : ''}
        onClose={() => setInspecting(null)}
      />
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function AttStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.attStat, { borderLeftColor: color }]}>
      <Text style={[styles.attValue, { color }]}>{value}</Text>
      <Text style={styles.attLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  body: { padding: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  cell: { width: '9.4%', aspectRatio: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  cellPass: { backgroundColor: Colors.success },
  cellFail: { backgroundColor: Colors.danger },
  cellNone: { backgroundColor: '#E9EEF6' },
  cellFriday: { backgroundColor: '#D7DEE9' },
  cellText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 3, marginRight: 5 },
  legendText: { fontSize: 10, color: Colors.textSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  attRow: { flexDirection: 'row', gap: 8 },
  attStat: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  attValue: { fontSize: 18, fontWeight: '900' },
  attLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeTag: { width: 34, height: 34, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  typeText: { fontSize: 15 },
  rowTitle: { fontSize: 13, fontWeight: '800', color: Colors.text },
  rowSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  rowRemark: { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  resultChip: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultPass: { backgroundColor: Colors.successWash },
  resultFail: { backgroundColor: Colors.dangerWash },
  resultText: { fontSize: 13, fontWeight: '900', color: Colors.text },
});
