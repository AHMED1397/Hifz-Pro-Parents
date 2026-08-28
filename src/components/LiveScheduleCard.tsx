import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import {
  dayTypeBanner,
  formatDuration,
  formatRange,
  getLivePeriod,
  periodTitle,
  type LivePeriod,
} from '@/lib/timetable';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';
import type { AppLang } from '@/i18n';

/**
 * "Live Madrasa Timetable" widget.
 * Resolves the current period from src/lib/timetable.ts and re-renders every
 * 15 s so the progress bar and countdown stay honest.
 */
export function LiveScheduleCard({ lang = 'en' }: { lang?: AppLang }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const live: LivePeriod = useMemo(() => getLivePeriod(now), [now]);
  const banner = useMemo(() => dayTypeBanner(now), [now]);
  const title = periodTitle(live.period, lang);
  const nextTitle = live.next ? periodTitle(live.next, lang) : null;

  return (
    <LinearGradient colors={['#2E6BF0', '#1544B0']} style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.eyebrow}>{t('parent.liveTimetable')}</Text>
        </View>
        <View style={[styles.badge, live.period.isLesson ? styles.badgeLive : styles.badgeIdle]}>
          {live.period.isLesson ? (
            <Text style={styles.badgeText}>{t('parent.lessonNow')}</Text>
          ) : (
            <Ionicons name={live.period.icon as never} size={12} color="#fff" />
          )}
        </View>
      </View>

      <View style={styles.periodRow}>
        <Ionicons name={live.period.icon as never} size={18} color="#fff" />
        <Text style={styles.period}>{title}</Text>
      </View>
      <Text style={styles.range}>
        {formatRange(live.period)} · {t('parent.endsIn')} {formatDuration(live.minutesRemaining)}
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.round(live.progress * 100))}%` }]} />
      </View>

      {!!nextTitle && live.next && (
        <View style={styles.nextRow}>
          <Ionicons name="hourglass-outline" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={styles.next}>
            {t('parent.nextPeriod')}: {nextTitle} · {t('parent.startsIn')}{' '}
            {formatDuration(live.minutesUntilNext)}
          </Text>
        </View>
      )}

      {live.period.note ? <Text style={styles.note}>{live.period.note}</Text> : null}

      {banner ? (
        <View style={styles.banner}>
          <Ionicons name={banner.icon as never} size={14} color="#fff" />
          <Text style={styles.bannerText}>
            {lang === 'ar' ? banner.ar : lang === 'ta' ? banner.ta : banner.en}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeLive: { backgroundColor: '#22C08A' },
  badgeIdle: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  period: { color: '#fff', fontSize: 18, fontWeight: '800' },
  range: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  track: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: Spacing.md },
  fill: { height: 6, borderRadius: 999, backgroundColor: '#FFD66B' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  next: { flex: 1, color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  note: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: Spacing.xs, fontStyle: 'italic' },
  banner: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerText: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '600' },
});

export default LiveScheduleCard;
