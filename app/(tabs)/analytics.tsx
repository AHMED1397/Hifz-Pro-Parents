import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import { DataSource } from '@/data/datasource';
import { getPageInfo } from '@/data/mushaf';
import { creditedLines, isDawr, juzTargetForYear, totalCreditedLines, YEAR_TARGETS } from '@/lib/contract';
import { useApp } from '@/context/AppProviders';
import { FilterChips } from '@/components/FilterChips';
import { Card } from '@/components/Card';
import { SkeletonCard } from '@/components/Skeleton';
import { Colors, Gradients, Shadows, BorderRadius, Spacing } from '@/theme/tokens';
import { formatDateShort } from '@/lib/hijri';

const PERIODS = [
  { key: '7', labelKey: 'parent.period7', days: 7 },
  { key: '30', labelKey: 'parent.period30', days: 30 },
  { key: '90', labelKey: 'parent.period90', days: 90 },
];

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const chartW = Math.max(240, winW - 48);
  const { activeChild, teacherName, lang } = useApp();
  const [periodKey, setPeriodKey] = useState('30');
  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[1];

  const studentId = activeChild?.id ?? '';

  const entriesQuery = useQuery({
    queryKey: ['analytics-entries', studentId, period.days],
    queryFn: () => DataSource.getEntries(studentId, period.days),
    enabled: !!studentId,
  });
  const attQuery = useQuery({
    queryKey: ['analytics-att', studentId, period.days],
    queryFn: () => DataSource.getAttendance(studentId, period.days),
    enabled: !!studentId,
  });
  const statsQuery = useQuery({
    queryKey: ['analytics-stats', studentId, period.days],
    queryFn: () => DataSource.getMonthStats(studentId, period.days),
    enabled: !!studentId,
  });
  const examsQuery = useQuery({
    queryKey: ['analytics-exams', studentId],
    queryFn: () => DataSource.getExamResults(studentId),
    enabled: !!studentId,
  });

  const entries = useMemo(
    () => [...(entriesQuery.data ?? [])].sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    [entriesQuery.data]
  );

  /* ── Bar chart: juz recited per week ───────────────────── */
  const barData = useMemo(() => {
    const weeks: { label: string; total: number }[] = [];
    let bucket: { label: string; total: number } | null = null;
    let count = 0;
    for (const e of entries) {
      if (!bucket || count >= 7) {
        bucket = { label: formatDateShort(e.entry_date, lang), total: 0 };
        weeks.push(bucket);
        count = 0;
      }
      bucket.total += Number(e.juz_amount ?? 0);
      count++;
    }
    return weeks
      .map((w) => ({ value: Math.round(w.total * 100) / 100, label: w.label }))
      .slice(-12);
  }, [entries, lang]);

  /* ── Line chart: cumulative page reached ───────────────── */
  const lineData = useMemo(() => {
    let running = 0;
    const seen = new Set<string>();
    const out: { value: number; label: string }[] = [];
    for (const e of entries) {
      if (seen.has(e.entry_date)) continue;
      seen.add(e.entry_date);
      const p = Math.max(Number(e.page_to ?? 0), running);
      if (p > running) running = p;
      out.push({ value: running, label: formatDateShort(e.entry_date, lang) });
    }
    return out;
  }, [entries, lang]);

  /* ── Pie chart: lesson-type mix ────────────────────────── */
  const pieData = useMemo(() => {
    const counts: Record<string, number> = { sabaq: 0, sabqi: 0, manzil: 0 };
    for (const e of entries) counts[e.entry_type] = (counts[e.entry_type] ?? 0) + 1;
    return [
      { value: counts.sabaq, color: '#0EA46B', text: t('parent.sabaqNew') },
      { value: counts.sabqi, color: '#5B21B6', text: t('parent.sabqiRevision') },
      { value: counts.manzil, color: '#B45309', text: t('parent.manzilRevision') },
    ].filter((d) => d.value > 0);
  }, [entries, t]);

  /* ── Attendance mix ────────────────────────────────────── */
  const attMix = useMemo(() => {
    const counts: Record<string, number> = { present: 0, absent: 0, leave: 0, late: 0 };
    for (const a of attQuery.data ?? []) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return counts;
  }, [attQuery.data]);

  if (!activeChild) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 80 }]}>
        <Text style={styles.muted}>{t('common.empty')}</Text>
      </View>
    );
  }

  const stats = statsQuery.data;
  const quranProgress = Math.min(100, Math.round(((activeChild.current_page ?? 0) / 604) * 100));
  const juzInfo = getPageInfo(activeChild.current_page ?? 1);
  const dawr = isDawr(activeChild.track, activeChild.current_year);
  const latestEntry = entries[entries.length - 1];
  const classTeacher = latestEntry ? teacherName(latestEntry.teacher_id) : '—';
  const passRate = stats?.pass_rate_percent ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 16 }, Shadows.brand]}
      >
        <Text style={styles.heroTitle}>{t('parent.analyticsTitle')}</Text>
        <Text style={styles.heroSub}>
          {activeChild.full_name} · {t('parent.periodLabel', { days: period.days })}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        <FilterChips
          options={PERIODS.map((p) => ({ value: p.key, labelKey: p.labelKey }))}
          selectedValue={periodKey}
          onChange={setPeriodKey}
        />

        {entriesQuery.isLoading || statsQuery.isLoading ? <SkeletonCard /> : null}

        {/* ── KPI strip ─────────────────────────────────── */}
        <View style={styles.kpiRow}>
          <Kpi label={t('parent.lessonsDone')} value={String(stats?.lessons_done ?? 0)} icon="checkmark-done-outline" />
          <Kpi label={t('parent.passRate')} value={`${passRate}%`} icon="ribbon-outline" />
        </View>
        <View style={styles.kpiRow}>
          <Kpi label={t('parent.attendance')} value={`${stats?.attendance_percent ?? 0}%`} icon="calendar-outline" />
          <Kpi label={t('parent.linesTotal')} value={String(totalCreditedLines(entries))} icon="resize-outline" />
        </View>

        {/* ── Quran progress ────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('parent.quranProgress')}</Text>
        <Card>
          <View style={styles.progressRow}>
            <Text style={styles.progressPct}>{quranProgress}%</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.progressLabel}>
                {t('parent.page')} {activeChild.current_page} · {t('parent.juz')} {juzInfo.juz[0]}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${quranProgress}%` }]} />
              </View>
              <Text style={styles.progressSub}>{t('parent.of604', { pages: 604 })}</Text>
            </View>
          </View>
        </Card>

        {/* ── Bar chart ─────────────────────────────────── */}
        <ChartCard
          title={t('parent.chartJuzPerWeek')}
          hint={t('parent.chartJuzPerWeekHint')}
          icon="bar-chart-outline"
        >
          {barData.length ? (
            <BarChart
              data={barData}
              width={chartW}
              height={190}
              barWidth={14}
              spacing={barData.length > 8 ? 10 : 18}
              frontColor="#0EA46B"
              topLabelContainerStyle={{ display: 'none' as never }}
              noOfSections={4}
              maxValue={Math.max(2, Math.ceil(Math.max(...barData.map((d) => d.value)) * 1.15))}
              yAxisThickness={0}
              rulesColor="#E4E9F2"
              rulesType="dashed"
              xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 9 }}
              isAnimated
              animationDuration={500}
            />
          ) : (
            <EmptyChart label={t('common.noResults')} />
          )}
        </ChartCard>

        {/* ── Line chart ────────────────────────────────── */}
        <ChartCard
          title={t('parent.chartPageProgress')}
          hint={t('parent.chartPageProgressHint')}
          icon="trending-up-outline"
        >
          {lineData.length > 1 ? (
            <LineChart
              data={lineData}
              width={chartW}
              height={190}
              curved
              areaChart
              color="#0EA46B"
              thickness={2.5}
              startFillColor="#0EA46B"
              startOpacity={0.28}
              endOpacity={0.02}
              hideDataPoints
              spacing={lineData.length > 20 ? 8 : 16}
              noOfSections={4}
              yAxisThickness={0}
              rulesColor="#E4E9F2"
              rulesType="dashed"
              xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 9 }}
              isAnimated
            />
          ) : (
            <EmptyChart label={t('common.noResults')} />
          )}
        </ChartCard>

        {/* ── Pie chart ─────────────────────────────────── */}
        <ChartCard title={t('parent.chartLessonMix')} hint={t('parent.chartLessonMixHint')} icon="pie-chart-outline">
          {pieData.length ? (
            <View style={styles.pieRow}>
              <PieChart
                data={pieData}
                donut
                radius={78}
                innerRadius={46}
                showText
                textColor="#fff"
                focusOnPress
                sectionAutoFocus
              />
              <View style={styles.legend}>
                {pieData.map((d) => (
                  <View key={d.text} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                    <Text style={styles.legendText}>{d.text}</Text>
                    <Text style={styles.legendValue}>{d.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <EmptyChart label={t('common.noResults')} />
          )}
        </ChartCard>

        {/* ── Attendance breakdown ──────────────────────── */}
        <Text style={styles.sectionTitle}>{t('parent.attendanceBreakdown')}</Text>
        <Card>
          <MixRow label={t('parent.present')} value={attMix.present} total={Object.values(attMix).reduce((a, b) => a + b, 0)} color="#0EA46B" />
          <MixRow label={t('parent.absent')} value={attMix.absent} total={Object.values(attMix).reduce((a, b) => a + b, 0)} color="#DC2626" />
          <MixRow label={t('parent.late')} value={attMix.late} total={Object.values(attMix).reduce((a, b) => a + b, 0)} color="#B45309" />
          <MixRow label={t('parent.leave')} value={attMix.leave} total={Object.values(attMix).reduce((a, b) => a + b, 0)} color="#475569" />
        </Card>

        {/* ── Full details ──────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('parent.fullDetails')}</Text>
        <Card>
          <DetailRow label={t('parent.fullName')} value={activeChild.full_name} />
          <DetailRow label={t('parent.age')} value={String(activeChild.age ?? '—')} />
          <DetailRow label={t('parent.class')} value={activeChild.class_id ?? '—'} />
          <DetailRow label={t('parent.ustadh')} value={classTeacher} />
          <DetailRow label={t('parent.guardian')} value={`${activeChild.guardian_name ?? '—'} (${activeChild.guardian_relation ?? '—'})`} />
          <DetailRow label={t('parent.guardianPhone')} value={activeChild.guardian_phone ?? '—'} />
          <DetailRow label={t('parent.city')} value={activeChild.city ?? '—'} />
          <DetailRow label={t('parent.joinedOn')} value={activeChild.joined_on ? formatDateShort(activeChild.joined_on, lang) : '—'} />
          <DetailRow label={t('parent.currentYear')} value={String(activeChild.current_year ?? '—')} />
          <DetailRow
            label={t('parent.track')}
            value={
              dawr ? t('parent.trackDawr') : (activeChild.track ?? 'hifz') === 'nazira' ? t('parent.trackNazira') : t('parent.trackHifz')
            }
          />
          <DetailRow
            label={t('parent.yearTarget')}
            value={
              YEAR_TARGETS[activeChild.current_year ?? 0]
                ? `${t('parent.juz')} ${YEAR_TARGETS[activeChild.current_year ?? 0]!.from}–${YEAR_TARGETS[activeChild.current_year ?? 0]!.to}`
                : t('parent.dawrShort')
            }
          />
          <DetailRow label={t('parent.currentTarget')} value={`${t('parent.page')} ${activeChild.current_page ?? '—'}`} />
          <DetailRow label={t('parent.juzTarget')} value={String(activeChild.juz_target ?? '—')} />
          <DetailRow label={t('parent.daysBehind')} value={String(activeChild.days_behind ?? 0)} last />
        </Card>

        {/* ── Exam results ──────────────────────────────── */}
        {(examsQuery.data ?? []).length ? (
          <>
            <Text style={styles.sectionTitle}>{t('parent.examResults')}</Text>
            {(examsQuery.data ?? []).slice(0, 6).map((r, i) => (
              <Card key={r.id}>
                <View style={styles.examRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.examName}>{r.exam_name ?? '—'}</Text>
                    <Text style={styles.examMeta}>
                      {t('parent.grade')} {r.grade}
                      {r.rank ? ` · ${t('parent.position')} ${r.rank}` : ''}
                      {r.attempt && r.attempt > 1 ? ` · ${t('parent.attempt')} ${r.attempt}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.examTotal}>{r.total_marks}</Text>
                </View>
                {i < (examsQuery.data ?? []).length - 1 ? <View style={styles.rowDivider} /> : null}
              </Card>
            ))}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function Kpi({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.kpi}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function ChartCard({
  title,
  hint,
  icon,
  children,
}: {
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card>
        <View style={styles.chartHead}>
          <Ionicons name={icon} size={15} color={Colors.textSecondary} />
          <Text style={styles.chartHint}>{hint}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
          {children}
        </ScrollView>
      </Card>
    </>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <View style={styles.emptyChart}>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

function MixRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.mixRow}>
      <View style={styles.mixHead}>
        <Text style={styles.mixLabel}>{label}</Text>
        <Text style={styles.mixValue}>
          {value} · {pct}%
        </Text>
      </View>
      <View style={styles.mixTrack}>
        <View style={[styles.mixFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last ? null : { borderBottomWidth: 1, borderBottomColor: Colors.divider }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  hero: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  body: { padding: Spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginVertical: Spacing.sm, marginTop: Spacing.md },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  kpi: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 6 },
  kpiLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressPct: { fontSize: 26, fontWeight: '800', color: Colors.primaryDark, width: 62 },
  progressLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#E4E9F2', marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  progressSub: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  chartHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  chartHint: { fontSize: 11, color: Colors.textSecondary },
  emptyChart: { height: 160, alignItems: 'center', justifyContent: 'center' },
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  legendValue: { fontSize: 12, fontWeight: '800', color: Colors.text },
  mixRow: { marginBottom: Spacing.sm },
  mixHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  mixLabel: { fontSize: 12, color: Colors.textSecondary },
  mixValue: { fontSize: 12, fontWeight: '800', color: Colors.text },
  mixTrack: { height: 6, borderRadius: 3, backgroundColor: '#E4E9F2', overflow: 'hidden' },
  mixFill: { height: 6, borderRadius: 3 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  detailLabel: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  detailValue: { flex: 1.4, fontSize: 12, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  examRow: { flexDirection: 'row', alignItems: 'center' },
  examName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  examMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  examTotal: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark, marginLeft: 10 },
  rowDivider: { height: 1, backgroundColor: Colors.divider, marginTop: Spacing.sm },
  muted: { fontSize: 12, color: Colors.textMuted },
});
