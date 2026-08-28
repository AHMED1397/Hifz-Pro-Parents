import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { DataSource } from '@/data/datasource';
import { formatGregorianDate } from '@/lib/hijri';
import { Card } from '@/components/Card';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';
import type { Announcement } from '@/data/types';

const PRIORITY_STYLE: Record<Announcement['priority'], { bg: string; text: string; icon: string }> = {
  urgent: { bg: '#FDEAEA', text: '#B22525', icon: '🚨' },
  high: { bg: '#FDF1DD', text: '#9A5E00', icon: '⚠️' },
  normal: { bg: '#EEF4FF', text: '#1544B0', icon: '📢' },
  low: { bg: '#E9EEF6', text: '#5A6B85', icon: 'ℹ️' },
};

/** Screen 6: madrasa notices and circulars for parents. */
export default function AnnouncementsScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const query = useQuery({ queryKey: ['announcements'], queryFn: () => DataSource.getAnnouncements() });
  const items = query.data ?? [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#2E6BF0', '#1544B0']} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>📢 {t('parent.announcements')}</Text>
      </LinearGradient>

      <View style={styles.body}>
        {items.map(a => {
          const s = PRIORITY_STYLE[a.priority] ?? PRIORITY_STYLE.normal;
          return (
            <Card key={a.id} style={{ marginBottom: Spacing.md }}>
              <View style={styles.row}>
                <View style={[styles.priority, { backgroundColor: s.bg }]}>
                  <Text style={[styles.priorityText, { color: s.text }]}>
                    {s.icon} {a.priority.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.date}>{formatGregorianDate(new Date(a.published_at), i18n.language)}</Text>
              </View>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.bodyText}>{a.body}</Text>
            </Card>
          );
        })}
        {items.length === 0 ? <Text style={styles.empty}>—</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  body: { padding: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priority: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  priorityText: { fontSize: 10, fontWeight: '800' },
  date: { fontSize: 11, color: Colors.textSecondary },
  title: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: Spacing.sm },
  bodyText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 19 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xl },
});
