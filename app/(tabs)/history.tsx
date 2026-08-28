import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { DataSource } from '@/data/datasource';
import { getSurahById } from '@/data/mock';
import { formatGregorianDate } from '@/lib/hijri';
import { buildHeatmapDays, heatmapTotals, type HeatmapDay } from '@/lib/heatmap';
import { useApp } from '@/context/AppProviders';
import { FilterChips } from '@/components/FilterChips';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { LessonDetailModal } from '@/components/LessonDetailModal';
import { LESSON_COLORS, lessonLabel } from '@/components/LessonCard';
import { Card } from '@/components/Card';
import { Colors, Gradients, Shadows, BorderRadius, Spacing } from '@/theme/tokens';
import type { DailyEntry } from '@/data/types';

type FilterValue = 'all' | 'sabaq' | 'sabqi' | 'manzil';

/** Screen 4: activity heatmap + categorised lesson history + attendance. */
export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { activeChild, teacherName } = useApp();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<DailyEntry | null>(null);

  const studentId = activeChild?.id ?? '';

  const entriesQuery = useQuery({
    queryKey: ['history', studentId],
    queryFn: () => DataSource.getEntries(studentId, 90),
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

  /** One cell per day, coloured by src/lib/heatmap.ts. */
  const days = useMemo(() => buildHeatmapDays(entries, 90), [entries]);
  const totals = useMemo(() => heatmapTotals(days), [days]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? entries : entries.filter(e => e.entry_type === filter);
    if (selectedDate) list = list.filter(e => e.entry_date === selectedDate);
    return [...list].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  }, [entries, filter, selectedDate]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.md }, Shadows.brand]}
      >
        <Text style={styles.headerTitle}>{t('parent.tabHistory')}</Text>
        <Text style={styles.headerSub}>
          {totals.activeDays} {t('parent.activeDays')} · {totals.passed} {t('parent.passed')} · {totals.failed}{' '}
          {t('parent.repeat')}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* ── Heatmap ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('parent.activityTitle')}</Text>
        <Card>
          <ActivityHeatmap days={days} onSelect={(day: HeatmapDay) => setSelectedDate(day.iso)} />
          {selectedDate ? (
            <Pressable style={styles.clearRow} onPress={() => setSelectedDate(null)}>
              <Ionicons name="close-circle-outline" size={14} color={Colors.primary} />
              <Text style={styles.clearText}>{t('parent.clearFilter', { date: selectedDate })}</Text>
            </Pressable>
          ) : null}
        </Card>

        {/* ── Attendance breakdown ──────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('parent.attendanceBreakdown')}</Text>
        <View style={styles.attRow}>
          <AttStat label={t('parent.presentDays')} value={statsQuery.data?.present ?? 0} color={Colors.success} />
          <AttStat label={t('parent.absentDays')} value={statsQuery.data?.absent ?? 0} color={Colors.danger} />
          <AttStat label={t('parent.leaveDays')} value={statsQuery.data?.leave ?? 0} color={Colors.warning} />
          <AttStat label={t('parent.lateDays')} value={statsQuery.data?.late ?? 0} color={Colors.primary} />
        </View>

        {/* ── Lesson feed ───────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('parent.allLessons')}</Text>
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

        {!filtered.length ? <Text style={styles.empty}>{t('parent.noLessonsOnDate')}</Text> : null}

        {filtered.map(e => {
          const c = LESSON_COLORS[e.entry_type];
          const surah = getSurahById(e.surah_id);
          const pass = e.result === 'pass';
          return (
            <Pressable key={e.id} style={styles.row} onPress={() => setInspecting(e)}>
              <View style={[styles.typeTag, { backgroundColor: c.bg }]}>
                <Ionicons name={c.icon as never} size={16} color={c.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {lessonLabel(e.entry_type, t)} · {surah.name_en}
                </Text>
                <Text style={styles.rowSub}>
                  {formatGregorianDate(new Date(e.entry_date), i18n.language)} · {t('parent.page')} {e.page_from}
                  {e.line_to ? ` · ${e.line_to - (e.line_from ?? 1) + 1} ${t('parent.lines')}` : ''}
                </Text>
                {e.remark ? <Text style={styles.rowRemark}>{e.remark}</Text> : null}
              </View>
              <View style={[styles.resultChip, pass ? styles.resultPass : styles.resultFail]}>
                <Ionicons
                  name={pass ? 'checkmark' : 'close'}
                  size={14}
                  color={pass ? Colors.success : Colors.danger}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <LessonDetailModal
        entry={inspecting}
        teacherName={inspecting ? teacherName(inspecting.teacher_id) : ''}
        onClose={() => setInspecting(null)}
      />
    </ScrollView>
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
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  body: { padding: Spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  clearRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  clearText: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  empty: { fontSize: 12, color: Colors.textMuted, marginTop: Spacing.md, textAlign: 'center' },
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
  rowTitle: { fontSize: 13, fontWeight: '800', color: Colors.text },
  rowSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  rowRemark: { fontSize: 11, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
  resultChip: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultPass: { backgroundColor: Colors.successWash },
  resultFail: { backgroundColor: Colors.dangerWash },
});
