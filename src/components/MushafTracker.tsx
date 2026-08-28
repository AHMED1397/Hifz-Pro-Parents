import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MUSHAF_PAGES,
  getPageAyahs,
  getPageInfo,
  hasMushafFile,
  juzNameAr,
  juzPageBounds,
  toArabicNumber,
} from '@/data/mushaf';
import { ALL_SURAHS } from '@/data/surahs';
import type { DailyEntry, EntryType } from '@/data/types';
import { LESSON_COLORS } from './LessonCard';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

/** Per-lesson highlight colours from PARENT_APP_SPEC.md §3 Screen 3. */
export type HighlightFilter = 'all' | EntryType;

interface Props {
  entries: DailyEntry[];
  initialPage: number;
  teacherNameFor: (teacherId: string) => string;
  onInspect: (entry: DailyEntry) => void;
}

interface LineMark {
  entry: DailyEntry;
  type: EntryType;
}

const shortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

/**
 * Read-only Personal Quran Tracker.
 *
 * WHY THIS IS NOT `QuranPageReader.tsx`: that component (reused from the
 * Teacher app) is a *range selector* — it renders a modal and calls
 * `onConfirm(selection)` so a teacher can record a new portion. The parent app
 * needs the opposite: a read-only page with per-lesson colour highlights and
 * Hazrat margin pills. See docs/PARENT_APP_PLAN.md gap G8.
 * Both are built on the same `src/data/mushaf.ts` data layer.
 */
export function MushafTracker({ entries, initialPage, teacherNameFor, onInspect }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(Math.min(Math.max(initialPage, 1), MUSHAF_PAGES));
  const [filter, setFilter] = useState<HighlightFilter>('all');
  const [jumpOpen, setJumpOpen] = useState(false);

  const info = useMemo(() => getPageInfo(page), [page]);

  /** line number → which lessons cover it on this page. */
  const lineMarks = useMemo(() => {
    const map = new Map<number, LineMark[]>();
    for (const e of entries) {
      if (filter !== 'all' && e.entry_type !== filter) continue;
      const from = e.page_from ?? 0;
      const to = e.page_to ?? from;
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      if (page < lo || page > hi) continue;
      const startLine = page === lo ? e.line_from ?? 1 : 1;
      const endLine = page === hi ? e.line_to ?? 15 : 15;
      for (let ln = startLine; ln <= endLine; ln++) {
        const arr = map.get(ln) ?? [];
        arr.push({ entry: e, type: e.entry_type });
        map.set(ln, arr);
      }
    }
    return map;
  }, [entries, filter, page]);

  /** Lessons that END on this page get a Hazrat margin pill on that line. */
  const marginPills = useMemo(() => {
    const pills: Array<{ line: number; entry: DailyEntry }> = [];
    for (const e of entries) {
      if (filter !== 'all' && e.entry_type !== filter) continue;
      const endPage = Math.max(e.page_from ?? 0, e.page_to ?? 0);
      if (endPage !== page) continue;
      pills.push({ line: e.line_to ?? 15, entry: e });
    }
    return pills;
  }, [entries, filter, page]);

  const ayahs = useMemo(() => getPageAyahs(page), [page]);
  const hasFile = hasMushafFile();
  const lines = ayahs?.lineSegments ?? new Map<number, { ayahIndex: number; text: string }[]>();
  const lineCount = info.lineCount || 15;
  const surah = ALL_SURAHS.find(s => s.id === info.surahIds[0]);
  const pageWidth = Math.min(width - 96, 340);

  const go = (delta: number) => setPage(p => Math.min(Math.max(p + delta, 1), MUSHAF_PAGES));

  const filters: Array<{ id: HighlightFilter; label: string; color: string }> = [
    { id: 'all', label: `${t('parent.allLessons')} (${entries.length})`, color: Colors.primary },
    { id: 'sabaq', label: t('parent.sabaqNew'), color: LESSON_COLORS.sabaq.text },
    { id: 'sabqi', label: t('parent.sabqiRevision'), color: LESSON_COLORS.sabqi.text },
    { id: 'manzil', label: t('parent.manzilRevision'), color: LESSON_COLORS.manzil.text },
  ];

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📖 {t('parent.quranTracker')}</Text>
        <Text style={styles.headerSub}>
          {t('parent.current')}: {t('parent.page')} {page} ({t('parent.juz')} {info.juz.join(', ')}) ·{' '}
          {t('parent.totalProgress')} {initialPage}/{MUSHAF_PAGES}
        </Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {filters.map(f => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.filterChip, filter === f.id && { backgroundColor: f.color }]}
          >
            <Text style={[styles.filterText, filter === f.id && { color: '#fff' }]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Page */}
      <ScrollView style={styles.pageScroll} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.page, { width: pageWidth }]}>
          <View style={styles.pageHead}>
            <Text style={styles.pageHeadAr}>{juzNameAr(info.juz[0] ?? 1)}</Text>
            <Text style={styles.pageHeadAr}>{surah ? `سُورَةُ ${surah.name_ar}` : ''}</Text>
          </View>

          {Array.from({ length: lineCount }, (_, i) => i + 1).map(lineNo => {
            const segs = lines.get(lineNo) ?? [];
            const marks = lineMarks.get(lineNo) ?? [];
            const mark = marks[0];
            const pill = marginPills.find(p => p.line === lineNo);
            const c = mark ? LESSON_COLORS[mark.type] : null;
            return (
              <Pressable
                key={lineNo}
                onPress={() => mark && onInspect(mark.entry)}
                style={[styles.line, c && { backgroundColor: c.bg }]}
              >
                <Text style={[styles.lineText, c && { color: c.text }]} numberOfLines={2}>
                  {segs.map(s => s.text).join(' ') || ' '}
                </Text>
                {pill ? (
                  <View style={styles.pill}>
                    <Text style={styles.pillText} numberOfLines={1}>
                      📅 {shortDate(pill.entry.entry_date)} · {teacherNameFor(pill.entry.teacher_id)}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}

          <Text style={styles.pageNumber}>{toArabicNumber(page)}</Text>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={() => go(-1)} disabled={page <= 1}>
          <Text style={styles.navText}>◀</Text>
        </Pressable>
        <Pressable onPress={() => setJumpOpen(true)} style={styles.jumpBtn}>
          <Text style={styles.jumpText}>
            {t('parent.page')} {page} / {MUSHAF_PAGES} · {t('parent.jumpTo')} ▾
          </Text>
        </Pressable>
        <Pressable style={styles.navBtn} onPress={() => go(1)} disabled={page >= MUSHAF_PAGES}>
          <Text style={styles.navText}>▶</Text>
        </Pressable>
      </View>

      {/* Jump modal */}
      <Modal visible={jumpOpen} transparent animationType="fade" onRequestClose={() => setJumpOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setJumpOpen(false)}>
          <Pressable style={styles.jumpSheet} onPress={() => undefined}>
            <Text style={styles.jumpTitle}>{t('parent.jumpTo')}</Text>
            <Text style={styles.jumpSection}>{t('parent.juz')}</Text>
            <View style={styles.jumpGrid}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                <Pressable
                  key={j}
                  style={styles.jumpCell}
                  onPress={() => {
                    setPage(juzPageBounds(j).from);
                    setJumpOpen(false);
                  }}
                >
                  <Text style={styles.jumpCellText}>{j}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.jumpSection}>{t('parent.surah')}</Text>
            <ScrollView style={{ maxHeight: 220 }}>
              {ALL_SURAHS.slice(0, 40).map(s => (
                <Pressable
                  key={s.id}
                  style={styles.jumpSurahRow}
                  onPress={() => {
                    setPage(s.page_start);
                    setJumpOpen(false);
                  }}
                >
                  <Text style={styles.jumpSurahText}>
                    {s.id}. {s.name_en} — {s.name_ar}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {!hasFile ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            Mushaf text asset not loaded — page/juz index only. Add
            assets/quran_indopak15_pages.json to see the 15-line text.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  headerTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  headerSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  filterRow: { maxHeight: 44, paddingHorizontal: Spacing.md, marginTop: Spacing.sm },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  filterText: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary },
  pageScroll: { flex: 1 },
  page: {
    alignSelf: 'center',
    backgroundColor: '#FFFEF8',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E7DFC8',
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  pageHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E7DFC8',
    paddingBottom: 6,
    marginBottom: 6,
  },
  pageHeadAr: { fontSize: 13, color: '#7A5C12', fontWeight: '700' },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 4, borderRadius: 4 },
  lineText: { flex: 1, fontSize: 17, lineHeight: 28, color: '#1A1A1A', textAlign: 'right', writingDirection: 'rtl' },
  pill: {
    marginLeft: 6,
    backgroundColor: '#FFF7D6',
    borderWidth: 1,
    borderColor: '#E7C86A',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: 130,
  },
  pillText: { fontSize: 9, color: '#7A5C12', fontWeight: '700' },
  pageNumber: { textAlign: 'center', fontSize: 15, color: '#7A5C12', marginTop: 8, fontWeight: '700' },
  nav: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, gap: 8 },
  navBtn: {
    width: 44,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navText: { fontSize: 16, color: Colors.text },
  jumpBtn: { flex: 1, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  jumpText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(14,27,51,0.45)', justifyContent: 'flex-end' },
  jumpSheet: { backgroundColor: Colors.card, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '80%' },
  jumpTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  jumpSection: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: 6 },
  jumpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  jumpCell: { width: 42, height: 34, borderRadius: BorderRadius.xs, backgroundColor: Colors.primaryWash, alignItems: 'center', justifyContent: 'center' },
  jumpCellText: { fontSize: 12, fontWeight: '800', color: Colors.primaryDark },
  jumpSurahRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  jumpSurahText: { fontSize: 13, color: Colors.text },
  warn: { backgroundColor: Colors.warningWash, padding: Spacing.md },
  warnText: { fontSize: 11, color: '#7A4E00' },
});

export default MushafTracker;
