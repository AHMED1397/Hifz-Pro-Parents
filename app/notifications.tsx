import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { DataSource } from '@/data/datasource';
import { useApp } from '@/context/AppProviders';
import { FilterChips } from '@/components/FilterChips';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonCard } from '@/components/Skeleton';
import { Colors, Gradients, Shadows, BorderRadius, Spacing } from '@/theme/tokens';
import { formatDateShort, getTodayISO } from '@/lib/hijri';

/** Matches the push codes used across the app (see docs/PARENT_APP_PLAN.md). */
type NoticeCode =
  | 'sabaq_pass'
  | 'sabaq_fail'
  | 'hold_active'
  | 'absent'
  | 'exam_publish'
  | 'announcement';

interface Notice {
  id: string;
  code: NoticeCode;
  title: string;
  body: string;
  date: string; // ISO yyyy-mm-dd
  childName?: string;
}

const TONE: Record<NoticeCode, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  sabaq_pass: { bg: '#DCFCE7', fg: '#0EA46B', icon: 'checkmark-circle' },
  sabaq_fail: { bg: '#FEE2E2', fg: '#DC2626', icon: 'close-circle' },
  hold_active: { bg: '#FEF3C7', fg: '#B45309', icon: 'pause-circle' },
  absent: { bg: '#FEE2E2', fg: '#DC2626', icon: 'person-remove' },
  exam_publish: { bg: '#DCE8FF', fg: '#1544B0', icon: 'trophy' },
  announcement: { bg: '#EDE9FE', fg: '#5B21B6', icon: 'megaphone' },
};

const FILTERS = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'lessons', labelKey: 'parent.filterLessons' },
  { value: 'madrasa', labelKey: 'parent.filterMadrasa' },
];

/**
 * Notification centre — the target of the bell on Home.
 *
 * The deployed schema has no notifications table and there is no push relay,
 * so this feed is derived on the fly from the same data the rest of the app
 * reads: lesson entries, attendance, hold state, published exam results and
 * madrasa announcements.
 */
export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { children: kids, lang } = useApp();
  const [filter, setFilter] = useState('all');

  const ids = useMemo(() => kids.map(k => k.id), [kids]);
  const today = getTodayISO();

  const entriesQuery = useQuery({
    queryKey: ['notif-entries', ids],
    queryFn: async () => {
      const rows = await Promise.all(ids.map(id => DataSource.getEntries(id, 14)));
      return rows.flat();
    },
    enabled: ids.length > 0,
  });
  const attQuery = useQuery({
    queryKey: ['notif-att', ids],
    queryFn: async () => {
      const rows = await Promise.all(ids.map(id => DataSource.getAttendance(id, 14)));
      return rows.flat();
    },
    enabled: ids.length > 0,
  });
  const holdsQuery = useQuery({
    queryKey: ['notif-holds', ids],
    queryFn: async () => {
      const rows = await Promise.all(ids.map(id => DataSource.getHoldState(id)));
      return rows;
    },
    enabled: ids.length > 0,
  });
  const examsQuery = useQuery({
    queryKey: ['notif-exams', ids],
    queryFn: async () => {
      const rows = await Promise.all(ids.map(id => DataSource.getExamResults(id)));
      return rows.flat();
    },
    enabled: ids.length > 0,
  });
  const noticesQuery = useQuery({
    queryKey: ['notif-announcements'],
    queryFn: () => DataSource.getAnnouncements(),
  });

  const notices = useMemo<Notice[]>(() => {
    const out: Notice[] = [];
    const nameOf = (studentId: string) => kids.find(k => k.id === studentId)?.full_name;

    for (const e of entriesQuery.data ?? []) {
      if (e.entry_type === 'sabaq') {
        const pass = e.result === 'pass';
        out.push({
          id: `entry-${e.id}`,
          code: pass ? 'sabaq_pass' : 'sabaq_fail',
          title: pass ? t('notif.sabaqPass') : t('notif.sabaqFail'),
          body: `${t('parent.page')} ${e.page_from}${e.page_to && e.page_to !== e.page_from ? `–${e.page_to}` : ''}${e.mistakes ? ` · ${e.mistakes} ${t('parent.mistakes')}` : ''}`,
          date: e.entry_date,
          childName: nameOf(e.student_id),
        });
      } else if (e.result === 'fail') {
        out.push({
          id: `entry-${e.id}`,
          code: 'sabaq_fail',
          title: t('notif.revisionFail', { type: t(`parent.${e.entry_type === 'sabqi' ? 'sabqiRevision' : 'manzilRevision'}`).toLowerCase() }),
          body: t('notif.revisionFailBody'),
          date: e.entry_date,
          childName: nameOf(e.student_id),
        });
      }
    }

    for (const a of attQuery.data ?? []) {
      if (a.status === 'absent') {
        out.push({
          id: `att-${a.id}`,
          code: 'absent',
          title: t('notif.absent'),
          body: a.reason || t('notif.absentBody'),
          date: a.att_date,
          childName: nameOf(a.student_id),
        });
      }
    }

    (holdsQuery.data ?? []).forEach((h, i) => {
      if (h?.active) {
        out.push({
          id: `hold-${i}`,
          code: 'hold_active',
          title: t('parent.holdTitle'),
          body: h.reason ?? '',
          date: today,
          childName: kids[i]?.full_name,
        });
      }
    });

    for (const r of examsQuery.data ?? []) {
      out.push({
        id: `exam-${r.id}`,
        code: 'exam_publish',
        title: t('notif.examPublished'),
        body: `${r.exam_name ?? ''} · ${t('parent.grade')} ${r.grade} · ${r.total_marks}`,
        date: r.exam_date || today,
        childName: nameOf(r.student_id),
      });
    }

    for (const a of noticesQuery.data ?? []) {
      out.push({
        id: `ann-${a.id}`,
        code: 'announcement',
        title: a.title,
        body: a.body,
        date: (a.published_at ?? today).slice(0, 10),
      });
    }

    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entriesQuery.data, attQuery.data, holdsQuery.data, examsQuery.data, noticesQuery.data, kids, t, today]);

  const visible = useMemo(() => {
    if (filter === 'lessons') {
      return notices.filter(n => n.code === 'sabaq_pass' || n.code === 'sabaq_fail' || n.code === 'hold_active' || n.code === 'absent' || n.code === 'exam_publish');
    }
    if (filter === 'madrasa') return notices.filter(n => n.code === 'announcement');
    return notices;
  }, [notices, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, Notice[]>();
    for (const n of visible) {
      const list = map.get(n.date) ?? [];
      list.push(n);
      map.set(n.date, list);
    }
    return [...map.entries()];
  }, [visible]);

  const loading = entriesQuery.isLoading || noticesQuery.isLoading;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }, Shadows.brand]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('parent.notifications')}</Text>
        <View style={{ width: 42 }} />
      </LinearGradient>

      <View style={styles.chips}>
        <FilterChips options={FILTERS} selectedValue={filter} onChange={setFilter} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <SkeletonCard /> : null}

        {!loading && !visible.length ? (
          <EmptyState icon="notifications-off-outline" titleKey="notif.empty" messageKey="notif.emptyBody" />
        ) : null}

        {groups.map(([date, items]) => (
          <View key={date} style={{ marginBottom: Spacing.md }}>
            <Text style={styles.dateLabel}>
              {date === today ? t('parent.today') : formatDateShort(date, lang ?? i18n.language)}
            </Text>
            {items.map(n => {
              const tone = TONE[n.code];
              return (
                <View key={n.id} style={styles.item}>
                  <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
                    <Ionicons name={tone.icon} size={18} color={tone.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {n.childName ? `${n.childName} · ` : ''}
                      {n.title}
                    </Text>
                    <Text style={styles.itemBody} numberOfLines={2}>
                      {n.body}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  backBtn: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 17, fontWeight: '800' },
  chips: { padding: Spacing.md, paddingBottom: 0 },
  dateLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.md,
    marginBottom: 8,
  },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 13, fontWeight: '800', color: Colors.text },
  itemBody: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
});
