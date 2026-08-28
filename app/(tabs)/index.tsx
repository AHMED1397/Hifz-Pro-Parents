import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { DataSource, HAS_SUPABASE } from '@/data/datasource';
import { getTeacherById } from '@/data/mock';
import { formatGregorianDate, formatHijriDate, getTodayISO } from '@/lib/hijri';
import { calculateQuranProgress } from '@/lib/score';
import { useApp } from '@/context/AppProviders';
import { LiveScheduleCard } from '@/components/LiveScheduleCard';
import { ChildSwitcherModal } from '@/components/ChildSwitcherModal';
import { LessonCard } from '@/components/LessonCard';
import { LessonDetailModal } from '@/components/LessonDetailModal';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { StatusChip } from '@/components/StatusChip';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { DIVISION_NAMES } from '@/data/types';
import type { DailyEntry } from '@/data/types';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { children: kids, activeChild, setActiveChildId, lang, isLoading } = useApp();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [inspecting, setInspecting] = useState<DailyEntry | null>(null);

  const today = getTodayISO();
  const studentId = activeChild?.id ?? '';

  const lessonsQuery = useQuery({
    queryKey: ['entries', studentId, today],
    queryFn: () => DataSource.getEntriesForDate(studentId, today),
    enabled: !!studentId,
  });

  const holdQuery = useQuery({
    queryKey: ['hold', studentId],
    queryFn: () => DataSource.getHoldState(studentId),
    enabled: !!studentId,
  });

  const statsQuery = useQuery({
    queryKey: ['stats', studentId],
    queryFn: () => DataSource.getMonthStats(studentId),
    enabled: !!studentId,
  });

  const attQuery = useQuery({
    queryKey: ['attendance', studentId, today],
    queryFn: async () => (await DataSource.getAttendance(studentId, 1))[0] ?? null,
    enabled: !!studentId,
  });

  const byType = useMemo(() => {
    const map: Record<string, DailyEntry | undefined> = {};
    for (const e of lessonsQuery.data ?? []) map[e.entry_type] = e;
    return map;
  }, [lessonsQuery.data]);

  const progress = calculateQuranProgress(activeChild?.current_page ?? 0);
  const klass = activeChild ? DataSource.getClass(activeChild.class_id) : null;
  const ustadh = byType.sabaq ? getTeacherById(byType.sabaq.teacher_id) : null;
  const hold = holdQuery.data;

  if (isLoading) {
    return (
      <View style={styles.body}>
        <Skeleton height={120} style={{ marginBottom: Spacing.md }} />
        <Skeleton height={150} style={{ marginBottom: Spacing.md }} />
        <Skeleton height={90} />
      </View>
    );
  }

  if (!activeChild) {
    return (
      <View style={styles.center}>
        <EmptyState icon="👪" titleKey="parent.noChildren" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header + child switcher ─────────────────────────── */}
      <LinearGradient colors={['#2E6BF0', '#1544B0']} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerTop}>
          <Text style={styles.brand}>{t('appName')}</Text>
          <View style={styles.connDot}>
            <Text style={styles.connText}>{HAS_SUPABASE ? t('parent.live') : t('parent.offline')}</Text>
          </View>
        </View>

        <Pressable style={styles.childRow} onPress={() => setSwitcherOpen(true)}>
          <View style={[styles.avatar, { backgroundColor: activeChild.avatar_color ?? '#C9973F' }]}>
            <Text style={styles.avatarText}>{activeChild.full_name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.childName}>
              👦 {activeChild.full_name} {kids.length > 1 ? '▾' : ''}
            </Text>
            <Text style={styles.childMeta}>
              {activeChild.admission_no} · {t('parent.admission')} · {klass?.name ?? '—'} ·{' '}
              {DIVISION_NAMES[activeChild.division_id]}
            </Text>
            <Text style={styles.childMeta}>
              {t('parent.ustadh')}: {ustadh?.full_name ?? '—'} · {t('parent.current')}: P.
              {activeChild.current_page} ({t('parent.juz')} {activeChild.current_juz ?? progress.juz})
            </Text>
          </View>
          <View style={styles.ringWrap}>
            <ProgressRing progress={progress.percent / 100} size={54} strokeWidth={5} showText={false} />
            <Text style={styles.ringLabel}>{progress.percent}%</Text>
          </View>
        </Pressable>

        <Text style={styles.dateLine}>
          {formatGregorianDate(new Date(), lang)} · {formatHijriDate(new Date(), lang)}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* ── Live timetable ────────────────────────────────── */}
        <LiveScheduleCard lang={lang} />

        {/* ── Hold alert ────────────────────────────────────── */}
        {hold?.active ? (
          <View style={styles.holdBanner}>
            <Text style={styles.holdTitle}>⛔ {t('parent.holdTitle')}</Text>
            <Text style={styles.holdBody}>{hold.reason}</Text>
          </View>
        ) : null}

        {/* ── Today's lessons ───────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>📖 {t('parent.todaysLessons')}</Text>
          {attQuery.data ? (
            <StatusChip
              status={
                attQuery.data.status === 'present'
                  ? 'present'
                  : attQuery.data.status === 'absent'
                    ? 'absent'
                    : attQuery.data.status === 'late'
                      ? 'late'
                      : 'leave'
              }
              size="sm"
            />
          ) : null}
        </View>

        <LessonCard type="sabaq" entry={byType.sabaq} onPress={() => setInspecting(byType.sabaq ?? null)} />
        <LessonCard type="sabqi" entry={byType.sabqi} onPress={() => setInspecting(byType.sabqi ?? null)} />
        <LessonCard type="manzil" entry={byType.manzil} onPress={() => setInspecting(byType.manzil ?? null)} />

        {/* ── Mushaf launcher ───────────────────────────────── */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/mushaf',
              params: { studentId: activeChild.id, page: String(activeChild.current_page) },
            })
          }
        >
          <LinearGradient colors={['#E0B75C', '#C9973F']} style={styles.mushafCta}>
            <Text style={styles.mushafCtaTitle}>
              📖 {t('parent.openMushaf', { name: activeChild.full_name.split(' ')[0] })} ➔
            </Text>
            <Text style={styles.mushafCtaSub}>{t('parent.mushafSub')}</Text>
          </LinearGradient>
        </Pressable>

        {/* ── Monthly stats ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>📊 {t('parent.monthlyStats')}</Text>
        <Card>
          <View style={styles.statsRow}>
            <Stat label={t('parent.attendance')} value={`${statsQuery.data?.attendance_percent ?? 0}%`} />
            <Stat label={t('parent.passRate')} value={`${statsQuery.data?.pass_rate_percent ?? 0}%`} />
            <Stat label={t('parent.lessonsDone')} value={String(statsQuery.data?.lessons_done ?? 0)} />
          </View>
        </Card>
      </View>

      <ChildSwitcherModal
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        children={kids}
        activeId={activeChild.id}
        onSelect={setActiveChildId}
      />
      <LessonDetailModal
        entry={inspecting}
        teacherName={inspecting ? getTeacherById(inspecting.teacher_id)?.full_name ?? '—' : ''}
        onClose={() => setInspecting(null)}
      />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: Colors.primaryDark }}>{value}</Text>
      <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 24 },
  emptyTitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#fff', fontSize: 13, fontWeight: '800' },
  connDot: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  connText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  childRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  avatar: { width: 46, height: 46, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  childName: { color: '#fff', fontSize: 18, fontWeight: '900' },
  childMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  dateLine: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: Spacing.sm },
  ringWrap: { alignItems: 'center' },
  ringLabel: { color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 2 },
  body: { padding: Spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: Colors.text, marginBottom: Spacing.sm },
  holdBanner: {
    backgroundColor: Colors.warningWash,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  holdTitle: { fontSize: 13, fontWeight: '900', color: '#9A5E00' },
  holdBody: { fontSize: 12, color: '#7A4E00', marginTop: 4 },
  mushafCta: { borderRadius: BorderRadius.card, padding: Spacing.lg, marginBottom: Spacing.md },
  mushafCtaTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  mushafCtaSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row' },
});
