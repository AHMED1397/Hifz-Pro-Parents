import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getSurahById } from '@/data/surahs';
import type { DailyEntry, EntryType } from '@/data/types';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

/** Per-lesson colours, exactly as specified in PARENT_APP_SPEC.md §3 Screen 3. */
export const LESSON_COLORS: Record<EntryType, { bg: string; text: string; icon: string }> = {
  sabaq: { bg: '#FEF08A', text: '#78350F', icon: '⚡' },
  sabqi: { bg: '#EDE9FE', text: '#5B21B6', icon: '🔄' },
  manzil: { bg: '#D1FAE5', text: '#065F46', icon: '📚' },
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
 * Renders "PENDING ⏳" when the ustadh has not recorded that lesson yet.
 */
export function LessonCard({ entry, type, onPress }: Props) {
  const { t } = useTranslation();
  const c = LESSON_COLORS[type];

  const status = !entry
    ? { label: t('parent.pending'), color: Colors.textMuted, icon: '⏳' }
    : entry.result === 'pass'
      ? { label: t('parent.passed'), color: Colors.success, icon: '✓' }
      : { label: t('parent.repeat'), color: Colors.danger, icon: '✕' };

  const surah = entry ? getSurahById(entry.surah_id) : null;

  return (
    <Pressable onPress={entry ? onPress : undefined} style={[styles.card, !entry && styles.cardEmpty]}>
      <View style={[styles.tag, { backgroundColor: c.bg }]}>
        <Text style={[styles.tagText, { color: c.text }]}>
          {c.icon} {lessonLabel(type, t)}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.status, { color: status.color }]}>
          {status.icon} {status.label}
        </Text>
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

          {entry.line_to ? (
            <Text style={styles.detail}>
              📏 {t('parent.linesRecited')}: {entry.line_to - (entry.line_from ?? 1) + 1}
            </Text>
          ) : null}

          {type === 'sabaq' ? (
            <Text style={styles.detail}>
              👁️ {t('parent.naziraPreRead')}: {entry.nazira_done ? t('parent.done') + ' ✓' : t('parent.notDone') + ' ✕'}
            </Text>
          ) : null}

          <Text style={styles.detail}>
            ⚠️ {t('parent.mistakes')}: {entry.mistakes} · {t('parent.forgets')}: {entry.forgets ?? 0}
          </Text>

          {entry.remark ? <Text style={styles.remark}>💬 “{entry.remark}”</Text> : null}
        </>
      ) : (
        <Text style={styles.body}>—</Text>
      )}
    </Pressable>
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
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  tagText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -18 },
  status: { fontSize: 12, fontWeight: '800' },
  body: { fontSize: 14, fontWeight: '700', color: Colors.text, marginTop: Spacing.xs },
  detail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  remark: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryWashStrong,
    paddingLeft: Spacing.sm,
  },
});

export default LessonCard;
