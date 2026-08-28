import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getSurahById } from '@/data/surahs';
import { formatGregorianDate } from '@/lib/hijri';
import { LESSON_COLORS, lessonLabel } from './LessonCard';
import type { DailyEntry } from '@/data/types';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

interface Props {
  entry: DailyEntry | null;
  teacherName: string;
  onClose: () => void;
}

/**
 * Tap-to-inspect bottom sheet for a lesson — the 8 fields listed in
 * PARENT_APP_SPEC.md §3 Screen 3.3.
 */
export function LessonDetailModal({ entry, teacherName, onClose }: Props) {
  const { t } = useTranslation();
  if (!entry) return null;

  const c = LESSON_COLORS[entry.entry_type];
  const surah = getSurahById(entry.surah_id);
  const lines = entry.line_to ? entry.line_to - (entry.line_from ?? 1) + 1 : null;

  const rows: Array<{ icon: string; label: string; value: string }> = [
    { icon: '👳', label: t('parent.ustadh'), value: teacherName },
    { icon: '📅', label: t('parent.recitationDate'), value: formatGregorianDate(new Date(entry.entry_date), 'en') },
    { icon: '📖', label: t('parent.lessonType'), value: lessonLabel(entry.entry_type, t) },
    {
      icon: '📏',
      label: t('parent.exactLines'),
      value: lines ? `${lines} (Lines ${entry.line_from ?? 1}–${entry.line_to})` : '—',
    },
    {
      icon: '🎯',
      label: t('parent.result'),
      value: entry.result === 'pass' ? t('parent.passed') + ' ✓' : t('parent.repeat') + ' ✕',
    },
    {
      icon: '👁️',
      label: t('parent.naziraPreRead'),
      value: entry.nazira_done === undefined ? '—' : entry.nazira_done ? t('parent.done') : t('parent.notDone'),
    },
    { icon: '⚠️', label: `${t('parent.mistakes')} · ${t('parent.forgets')}`, value: `${entry.mistakes} · ${entry.forgets ?? 0}` },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={[styles.header, { backgroundColor: c.bg }]}>
            <Text style={[styles.headerText, { color: c.text }]}>
              {c.icon} {t('parent.lessonDetail')}
            </Text>
            <Text style={[styles.headerSub, { color: c.text }]}>
              {surah.name_en} · {surah.name_ar}
            </Text>
          </View>

          <ScrollView style={styles.body}>
            {rows.map(r => (
              <View key={r.label} style={styles.row}>
                <Text style={styles.icon}>{r.icon}</Text>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.value}>{r.value}</Text>
              </View>
            ))}
            {entry.remark ? (
              <View style={styles.remarkBox}>
                <Text style={styles.remarkLabel}>💬 {t('parent.hazratRemark')}</Text>
                <Text style={styles.remark}>“{entry.remark}”</Text>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,27,51,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  headerText: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 2 },
  body: { padding: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  icon: { width: 26, fontSize: 15 },
  label: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 13, fontWeight: '700', color: Colors.text, maxWidth: '50%', textAlign: 'right' },
  remarkBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryWash,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  remarkLabel: { fontSize: 12, fontWeight: '800', color: Colors.primaryDark },
  remark: { fontSize: 13, color: Colors.text, fontStyle: 'italic', marginTop: 4 },
});

export default LessonDetailModal;
