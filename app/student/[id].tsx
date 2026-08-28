import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DataSource } from '@/data/datasource';
import { DIVISION_NAMES } from '@/data/types';
import { calculateQuranProgress } from '@/lib/score';
import { Card } from '@/components/Card';
import { GradientHeader } from '@/components/GradientHeader';
import { ProgressRing } from '@/components/ProgressRing';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

/** Child profile: memorization position, pace and target. */
export default function StudentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const studentQuery = useQuery({ queryKey: ['student', id], queryFn: () => DataSource.getStudent(String(id)) });
  const statsQuery = useQuery({
    queryKey: ['stats', id],
    queryFn: () => DataSource.getMonthStats(String(id)),
    enabled: !!id,
  });

  const s = studentQuery.data;
  if (!s) return <View style={styles.screen} />;

  const progress = calculateQuranProgress(s.current_page);
  const klass = DataSource.getClass(s.class_id);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}>
      <GradientHeader
        title={s.full_name}
        subtitle={`${s.admission_no} · ${klass?.name ?? '—'} · ${DIVISION_NAMES[s.division_id]}`}
        onBack={router.back}
        style={{ paddingTop: insets.top + Spacing.sm }}
      >
        <View style={styles.headerBody}>
          <View style={[styles.avatar, { backgroundColor: s.avatar_color ?? '#C9973F' }]}>
            <Text style={styles.avatarText}>{s.full_name.charAt(0)}</Text>
          </View>
        </View>
      </GradientHeader>

      <View style={styles.body}>
        <Card>
          <View style={styles.progressRow}>
            <ProgressRing progress={progress.percent / 100} size={92} strokeWidth={9} showText={false} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={styles.bigNum}>{progress.percent}%</Text>
              <Text style={styles.subLabel}>
                {t('parent.totalProgress')}: {s.current_page} / 604
              </Text>
              <Text style={styles.subLabel}>
                {t('parent.juz')} {s.current_juz ?? progress.juz} · {t('parent.current')} {t('parent.page')} {s.current_page}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: Spacing.md }}>
          <Row label={t('parent.ustadh')} value={s.guardian_relation ? String(s.guardian_relation) : '—'} />
          <Row label={t('parent.attendance')} value={`${statsQuery.data?.attendance_percent ?? 0}%`} />
          <Row label={t('parent.passRate')} value={`${statsQuery.data?.pass_rate_percent ?? 0}%`} />
          <Row label={t('parent.lessonsDone')} value={String(statsQuery.data?.lessons_done ?? 0)} />
          <Row label="Target" value={`${s.juz_target ?? '—'} juz`} last />
        </Card>
      </View>
    </ScrollView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  headerBody: { alignItems: 'center', marginTop: Spacing.sm },
  avatar: { width: 62, height: 62, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '900' },
  body: { padding: Spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  bigNum: { fontSize: 28, fontWeight: '900', color: Colors.primaryDark },
  subLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  rowLabel: { fontSize: 13, color: Colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '800', color: Colors.text },
});
