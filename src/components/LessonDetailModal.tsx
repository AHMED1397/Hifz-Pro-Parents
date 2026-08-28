import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

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

  const passed = entry.result === 'pass';

  const rows: Array<{ icon: string; label: string; value: string }> = [
    { icon: 'person-outline', label: t('parent.ustadh'), value: teacherName },
    { icon: 'calendar-outline', label: t('parent.recitationDate'), value: formatGregorianDate(new Date(entry.entry_date), 'en') },
    { icon: 'book-outline', label: t('parent.lessonType'), value: lessonLabel(entry.entry_type, t) },
    {
      icon: 'resize-outline',
      label: t('parent.exactLines'),
      value: lines ? `${lines} (Lines ${entry.line_from ?? 1}–${entry.line_to})` : '—',
    },
    {
      icon: 'eye-outline',
      label: t('parent.naziraPreRead'),
      value: entry.nazira_done === undefined ? '—' : entry.nazira_done ? t('parent.done') : t('parent.notDone'),
    },
    { icon: 'alert-circle-outline', label: `${t('parent.mistakes')} · ${t('parent.forgets')}`, value: `${entry.mistakes} · ${entry.forgets ?? 0}` },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={[styles.header, { backgroundColor: c.bg }]}>
            <View style={styles.headerRow}>
              <Ionicons name={c.icon as never} size={17} color={c.text} />
              <Text style={[styles.headerText, { color: c.text }]}>{t('parent.lessonDetail')}</Text>
            </View>
            <Text style={[styles.headerSub, { color: c.text }]}>
              {surah.name_en} · {surah.name_ar}
            </Text>
          </View>

          <ScrollView style={styles.body}>
            <View style={styles.row}>
              <Ionicons
                name={passed ? 'checkmark-circle' : 'close-circle'}
                size={17}
                color={passed ? Colors.success : Colors.danger}
              />
              <Text style={styles.label}>{t('parent.result')}</Text>
              <Text style={[styles.value, { color: passed ? Colors.success : Colors.danger }]}>
                {passed ? t('parent.passed') : t('parent.repeat')}
              </Text>
            </View>
            {rows.map(r => (
              <View key={r.label} style={styles.row}>
                <Ionicons name={r.icon as never} size={16} color={Colors.textMuted} />
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.value}>{r.value}</Text>
              </View>
            ))}
            {entry.remark ? (
              <View style={styles.remarkBox}>
                <View style={styles.remarkLabelRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={13} color={Colors.primaryDark} />
                  <Text style={styles.remarkLabel}>{t('parent.hazratRemark')}</Text>
                </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 2 },
  body: { padding: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  label: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 13, fontWeight: '700', color: Colors.text, maxWidth: '50%', textAlign: 'right' },
  remarkBox: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryWash,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  remarkLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remarkLabel: { fontSize: 12, fontWeight: '800', color: Colors.primaryDark },
  remark: { fontSize: 13, color: Colors.text, fontStyle: 'italic', marginTop: 4 },
});

export default LessonDetailModal;
