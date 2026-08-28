import React, { useMemo, useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { DataSource } from '@/data/datasource';
import { MushafTracker } from '@/components/MushafTracker';
import { LessonDetailModal } from '@/components/LessonDetailModal';
import { useApp } from '@/context/AppProviders';
import { Colors, Spacing } from '@/theme/tokens';
import type { DailyEntry } from '@/data/types';

/**
 * Fullscreen Personal Quran Tracker for one child.
 * Opened from the dashboard with ?studentId=…&page=…
 */
export default function MushafScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeChild, teacherName } = useApp();
  const params = useLocalSearchParams<{ studentId?: string; page?: string }>();
  const [inspecting, setInspecting] = useState<DailyEntry | null>(null);

  const studentId = params.studentId ?? activeChild?.id ?? '';
  const initialPage = Number(params.page ?? activeChild?.current_page ?? 1) || 1;

  const entriesQuery = useQuery({
    queryKey: ['mushaf-entries', studentId],
    queryFn: () => DataSource.getEntries(studentId, 90),
    enabled: !!studentId,
  });

  const entries = useMemo<DailyEntry[]>(() => entriesQuery.data ?? [], [entriesQuery.data]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: Colors.background }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color="#fff" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {activeChild?.full_name ?? ''}
        </Text>
        <View style={styles.closeBtn} />
      </View>

      <MushafTracker
        entries={entries}
        initialPage={initialPage}
        teacherNameFor={id => teacherName(id)}
        onInspect={setInspecting}
      />

      <LessonDetailModal
        entry={inspecting}
        teacherName={inspecting ? teacherName(inspecting.teacher_id) : ''}
        onClose={() => setInspecting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, color: Colors.text },
  title: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: Colors.text },
});
