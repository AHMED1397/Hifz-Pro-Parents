import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { getSurahById } from '@/data/surahs';
import { creditedLines } from '@/lib/contract';
import type { DailyEntry, EntryType } from '@/data/types';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

/** Per-lesson colours, exactly as specified in PARENT_APP_SPEC.md §3 Screen 3. */
export const LESSON_COLORS: Record<EntryType, { bg: string; text: string; icon: string }> = {
  sabaq: { bg: '#FEF08A', text: '#78350F', icon: 'flash-outline' },
  sabqi: { bg: '#EDE9FE', text: '#5B21B6', icon: 'refresh-outline' },
  manzil: { bg: '#D1FAE5', text: '#065F46', icon: 'layers-outline' },
};

export function lessonLabel(type: EntryType, t: (k: string) => string): string {
  if (type === 'sabaq') return t('parent.sabaqNew');
  if (type === 'sabqi') return t('parent.sabqiRevision');
  return t('parent.manzilRevision');
}

interface Props {
  entry?: DailyEntry;
  type: EntryType;
  onPress?: () => void;
}

/**
 * One of the three daily lesson cards on the dashboard.
 * Shows "Pending" until the ustadh records that lesson.
 */
export function LessonCard({ entry, type, onPress }: Props) {
  const { t } = useTranslation();
  const c = LESSON_COLORS[type];

  const status = !entry
    ? { label: t('parent.pending'), color: Colors.textMuted, icon: 'time-outline' }
    : entry.result === 'pass'
      ? { label: t('parent.passed'), color: Colors.success, icon: 'checkmark-circle' }
      : { label: t('parent.repeat'), color: Colors.danger, icon: 'close-circle' };

  const surah = entry ? getSurahById(entry.surah_id) : null;

  return (
    <Pressable onPress={entry ? onPress : undefined} style={[styles.card, !entry && styles.cardEmpty]}>
      <View style={styles.headRow}>
        <View style={[styles.tag, { backgroundColor: c.bg }]}>
          <Ionicons name={c.icon as never} size={12} color={c.text} />
          <Text style={[styles.tagText, { color: c.text }]}>{lessonLabel(type, t)}</Text>
        </View>

        <View style={styles.statusRow}>
          <Ionicons name={status.icon as never} size={14} color={status.color} />
          <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {entry ? (
        <>
          <Text style={styles.body}>
            {type === 'manzil'
              ? `${t('parent.juz')} ${entry.juz_list?.length ? entry.juz_list.join(', ') : entry.juz_start ?? ''}`
              : `${surah?.name_en ?? '—'} · ${t('parent.page')} ${entry.page_from}${
                  entry.page_to && entry.page_to !== entry.page_from ? ` – ${entry.page_to}` : ''
                }`}
          </Text>

          {creditedLines(entry) > 0 ? (
            <DetailRow icon="resize-outline">
              {t('parent.linesRecited')}: {creditedLines(entry)}
            </DetailRow>
          ) : null}

          {type === 'sabaq' ? (
            <DetailRow icon="eye-outline">
              {t('parent.naziraPreRead')}: {entry.nazira_done ? t('parent.done') : t('parent.notDone')}
            </DetailRow>
          ) : null}

          <DetailRow icon="alert-circle-outline">
            {t('parent.mistakes')}: {entry.mistakes} · {t('parent.forgets')}: {entry.forgets ?? 0}
          </DetailRow>

          {entry.remark ? (
            <View style={styles.remarkRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.remark}>{entry.remark}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.body}>—</Text>
      )}
    </Pressable>
  );
}

function DetailRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as never} size={13} color={Colors.textMuted} />
      <Text style={styles.detail}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardEmpty: { borderStyle: 'dashed', opacity: 0.85 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  tagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { fontSize: 12, fontWeight: '800' },
  body: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: Spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detail: { fontSize: 12, color: Colors.textSecondary },
  remarkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: Spacing.sm },
  remark: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryWashStrong,
    paddingLeft: Spacing.sm,
  },
});

export default LessonCard;
