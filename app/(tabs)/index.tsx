import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { DataSource } from '@/data/datasource';
import { formatGregorianDate, formatHijriDate, getTodayISO } from '@/lib/hijri';
import { useApp } from '@/context/AppProviders';
import { LiveScheduleCard } from '@/components/LiveScheduleCard';
import { ChildSwitcherModal } from '@/components/ChildSwitcherModal';
import { LessonCard } from '@/components/LessonCard';
import { LessonDetailModal } from '@/components/LessonDetailModal';
import { Card } from '@/components/Card';
import { StatusChip } from '@/components/StatusChip';
import { Colors, Gradients, Shadows, BorderRadius, Spacing } from '@/theme/tokens';
import type { DailyEntry } from '@/data/types';

export default function DashboardScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    children: kids,
    activeChild,
    setActiveChildId,
    lang,
    isLoading,
    refetch,
    teacherName,
  } = useApp();

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [inspecting, setInspecting] = useState<DailyEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    queryKey: ['attendance-today', studentId, today],
    queryFn: async () => (await DataSource.getAttendance(studentId, 1))[0] ?? null,
    enabled: !!studentId,
  });

  const byType = useMemo(() => {
    const map: Record<string, DailyEntry | undefined> = {};
    for (const e of lessonsQuery.data ?? []) map[e.entry_type] = e;
    return map;
  }, [lessonsQuery.data]);

  const hold = holdQuery.data;
  const firstName = activeChild?.full_name.split(' ')[0] ?? '';

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      >
        {/* ── Hero header (mirrors the Teacher app) ─────────── */}
        <LinearGradient
          colors={Gradients.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }, Shadows.brand]}
        >
          <View style={styles.heroTopRow}>
            <Pressable style={styles.childBtn} onPress={() => setSwitcherOpen(true)}>
              <Text style={styles.greeting}>{t('appName').split('·')[0].trim()}</Text>
              <View style={styles.nameRow}>
                <Text style={styles.childName} numberOfLines={1}>
                  {activeChild?.full_name ?? '—'}
                </Text>
                {kids.length > 1 ? <Ionicons name="chevron-down" size={16} color="#fff" /> : null}
              </View>
            </Pressable>

            {/* Notifications */}
            <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={22} color={Colors.white} />
            </Pressable>
          </View>

          {/* Glass card: teacher + today's date */}
          <View style={styles.glassCard}>
            <View style={styles.glassRow}>
              <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.85)" />
              <View style={{ flex: 1 }}>
                <Text style={styles.glassLabel}>{t('parent.ustadh')}</Text>
                <Text style={styles.glassValue} numberOfLines={1}>
                  {byType.sabaq ? teacherName(byType.sabaq.teacher_id) : '—'}
                </Text>
              </View>
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

            <View style={styles.glassDivider} />

            <View style={styles.glassRow}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.85)" />
              <View style={{ flex: 1 }}>
                <Text style={styles.glassValue}>{formatGregorianDate(new Date(), i18n.language)}</Text>
                <Text style={styles.glassLabel}>{formatHijriDate(new Date(), lang === 'ar' ? 'ar' : 'en')}</Text>
              </View>
              {activeChild ? (
                <View style={styles.pagePill}>
                  <Text style={styles.pagePillText}>
                    {t('parent.page')} {activeChild.current_page} · {t('parent.juz')}{' '}
                    {activeChild.current_juz ?? '—'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── Live timetable ────────────────────────────── */}
          <LiveScheduleCard lang={lang} />

          {/* ── Hold alert ────────────────────────────────── */}
          {hold?.active ? (
            <View style={styles.holdBanner}>
              <View style={styles.holdRow}>
                <Ionicons name="pause-circle" size={18} color="#9A5E00" />
                <Text style={styles.holdTitle}>{t('parent.holdTitle')}</Text>
              </View>
              <Text style={styles.holdBody}>{hold.reason}</Text>
            </View>
          ) : null}

          {/* ── Today's lessons ───────────────────────────── */}
          <Text style={styles.sectionTitle}>{t('parent.todaysLessons')}</Text>
          <LessonCard type="sabaq" entry={byType.sabaq} onPress={() => setInspecting(byType.sabaq ?? null)} />
          <LessonCard type="sabqi" entry={byType.sabqi} onPress={() => setInspecting(byType.sabqi ?? null)} />
          <LessonCard type="manzil" entry={byType.manzil} onPress={() => setInspecting(byType.manzil ?? null)} />

          {/* ── Mushaf launcher ───────────────────────────── */}
          <Pressable
            onPress={() =>
              activeChild &&
              router.push({
                pathname: '/mushaf',
                params: { studentId: activeChild.id, page: String(activeChild.current_page) },
              })
            }
          >
            <LinearGradient colors={Gradients.gold as [string, string]} style={styles.mushafCta}>
              <View style={styles.ctaRow}>
                <Ionicons name="book-outline" size={22} color="#fff" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.ctaTitle}>{t('parent.openMushaf', { name: firstName })}</Text>
                  <Text style={styles.ctaSub}>{t('parent.mushafSub')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>

          {/* ── Monthly stats ─────────────────────────────── */}
          <Text style={styles.sectionTitle}>{t('parent.monthlyStats')}</Text>
          <Card>
            <View style={styles.statsRow}>
              <Stat label={t('parent.attendance')} value={`${statsQuery.data?.attendance_percent ?? 0}%`} />
              <Divider />
              <Stat label={t('parent.passRate')} value={`${statsQuery.data?.pass_rate_percent ?? 0}%`} />
              <Divider />
              <Stat label={t('parent.lessonsDone')} value={String(statsQuery.data?.lessons_done ?? 0)} />
            </View>
          </Card>
        </View>
      </ScrollView>

      <ChildSwitcherModal
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        children={kids}
        activeId={activeChild?.id ?? null}
        onSelect={setActiveChildId}
      />
      <LessonDetailModal
        entry={inspecting}
        teacherName={inspecting ? teacherName(inspecting.teacher_id) : ''}
        onClose={() => setInspecting(null)}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.statDivider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  childBtn: { flex: 1, paddingRight: Spacing.sm },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  childName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.card,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: Spacing.md,
  },
  glassRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glassDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: Spacing.sm },
  glassLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  glassValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  pagePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pagePillText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  body: { padding: Spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  holdBanner: {
    backgroundColor: Colors.warningWash,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  holdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  holdTitle: { fontSize: 13, fontWeight: '800', color: '#9A5E00' },
  holdBody: { fontSize: 12, color: '#7A4E00', marginTop: 6, lineHeight: 17 },
  mushafCta: { borderRadius: BorderRadius.card, padding: Spacing.md, marginBottom: Spacing.md },
  ctaRow: { flexDirection: 'row', alignItems: 'center' },
  ctaTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.divider },
});
