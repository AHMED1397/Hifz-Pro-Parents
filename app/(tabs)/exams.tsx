import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { DataSource } from '@/data/datasource';
import { useApp } from '@/context/AppProviders';
import { ExamResultCard } from '@/components/ExamResultCard';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Colors, Spacing } from '@/theme/tokens';

/** Screen 5: official exam transcripts (published results only). */
export default function ExamsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { activeChild } = useApp();
  const studentId = activeChild?.id ?? '';

  const resultsQuery = useQuery({
    queryKey: ['exam-results', studentId],
    queryFn: () => DataSource.getExamResults(studentId),
    enabled: !!studentId,
  });
  const examsQuery = useQuery({ queryKey: ['exams'], queryFn: () => DataSource.getExams() });

  const examName = (id: string) => examsQuery.data?.find(e => e.id === id)?.name;
  const results = (resultsQuery.data ?? []).map(r => ({ ...r, exam_name: r.exam_name ?? examName(r.exam_id) }));

  const best = results.length ? Math.max(...results.map(r => r.total_marks)) : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#2E6BF0', '#1544B0']} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>{t('parent.examTranscripts')}</Text>
        <Text style={styles.headerSub}>
          {activeChild?.full_name ?? ''} · {results.length} {t('parent.examTranscripts')}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {results.length > 0 ? (
          <Card style={{ marginBottom: Spacing.md }}>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>{t('parent.totalScore')}</Text>
                <Text style={styles.summaryValue}>{Math.round(best)} / 100</Text>
              </View>
              <Text style={styles.summaryNote}>6 × 10 + {t('parent.tajweed')} 25 + {t('parent.tarteel')} 15</Text>
            </View>
          </Card>
        ) : null}

        {resultsQuery.isLoading ? <ActivityIndicator color={Colors.primary} /> : null}

        {!resultsQuery.isLoading && results.length === 0 ? (
          <EmptyState icon="trophy-outline" titleKey="parent.noResultsYet" />
        ) : null}

        {results.map(r => (
          <ExamResultCard key={r.id} result={r} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  body: { padding: Spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
  summaryValue: { fontSize: 26, fontWeight: '900', color: Colors.primaryDark },
  summaryNote: { fontSize: 11, color: Colors.textSecondary, flex: 1, textAlign: 'right' },
});
