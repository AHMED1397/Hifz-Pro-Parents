import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatGregorianDate } from '@/lib/hijri';
import { getGradeFromTotal } from '@/lib/score';
import type { ExamResult } from '@/data/types';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

interface Props {
  result: ExamResult & { exam_name?: string };
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#0B7D4E',
  A: '#0FA968',
  B: '#1E5FE0',
  C: '#E08A00',
  D: '#E23B3B',
};

/**
 * Official 100-mark transcript card — 6 recall questions (10 each) +
 * Tajweed 25 + Tarteel 15, with grade, class rank and the examiner's name.
 * The grade is taken from the shared `getGradeFromTotal`, never re-implemented.
 */
export function ExamResultCard({ result }: Props) {
  const { t } = useTranslation();
  const q = [1, 2, 3, 4, 5, 6].map(n => result.marks[`q${n}`] ?? 0);
  const tajweed = result.marks.tajweed ?? 0;
  const tarteel = result.marks.tarteel ?? 0;
  const grade = result.grade || getGradeFromTotal(result.total_marks);
  const gradeColor = GRADE_COLORS[grade] ?? Colors.text;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{result.exam_name ?? t('parent.examTranscripts')}</Text>

      <View style={styles.subRow}>
        <Text style={styles.sub}>👳 {t('parent.examiner')}: {result.examiner_name ?? '—'}</Text>
        <Text style={styles.sub}>{formatGregorianDate(new Date(result.exam_date), 'en')}</Text>
      </View>

      <Text style={styles.section}>{t('parent.questionBreakdown')}</Text>
      <View style={styles.grid}>
        {q.map((mark, i) => (
          <View key={`q${i}`} style={styles.chip}>
            <Text style={styles.chipLabel}>Q{i + 1}</Text>
            <Text style={styles.chipValue}>{mark}/10</Text>
          </View>
        ))}
        <View style={[styles.chip, styles.chipWide]}>
          <Text style={styles.chipLabel}>{t('parent.tajweed')}</Text>
          <Text style={styles.chipValue}>{tajweed}/25</Text>
        </View>
        <View style={[styles.chip, styles.chipWide]}>
          <Text style={styles.chipLabel}>{t('parent.tarteel')}</Text>
          <Text style={styles.chipValue}>{tarteel}/15</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>{t('parent.totalScore')}</Text>
          <Text style={styles.total}>{Math.round(result.total_marks)} / 100</Text>
        </View>
        <View style={styles.totalRight}>
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
            <Text style={styles.gradeText}>{grade}</Text>
          </View>
          {result.rank ? (
            <Text style={styles.rank}>
              {t('parent.rankInClass')}: #{result.rank}
              {result.class_size ? ` / ${result.class_size}` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {result.notes ? <Text style={styles.notes}>{result.notes}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 15, fontWeight: '800', color: Colors.text },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sub: { fontSize: 12, color: Colors.textSecondary },
  section: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.primaryWash,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  chipWide: { minWidth: 96 },
  chipLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700' },
  chipValue: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
  total: { fontSize: 24, fontWeight: '900', color: Colors.text },
  totalRight: { alignItems: 'flex-end' },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  gradeText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  rank: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontWeight: '700' },
  notes: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', marginTop: Spacing.md },
});

export default ExamResultCard;
