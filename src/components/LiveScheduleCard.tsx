import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

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
        <Text style={styles.eyebrow}>⏰ {t('parent.liveTimetable')}</Text>
        <View style={[styles.badge, live.period.isLesson ? styles.badgeLive : styles.badgeIdle]}>
          <Text style={styles.badgeText}>{live.period.isLesson ? t('parent.lessonNow') : live.period.icon}</Text>
        </View>
      </View>

      <Text style={styles.period}>
        {live.period.icon} {title}
      </Text>
      <Text style={styles.range}>
        {formatRange(live.period)} · {t('parent.endsIn')} {formatDuration(live.minutesRemaining)}
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.round(live.progress * 100))}%` }]} />
      </View>

      {!!nextTitle && live.next && (
        <Text style={styles.next}>
          ⏳ {t('parent.nextPeriod')}: {live.next.icon} {nextTitle} · {t('parent.startsIn')}{' '}
          {formatDuration(live.minutesUntilNext)}
        </Text>
      )}

      {live.period.note ? <Text style={styles.note}>{live.period.note}</Text> : null}

      {banner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {banner.icon} {lang === 'ar' ? banner.ar : lang === 'ta' ? banner.ta : banner.en}
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
  eyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeLive: { backgroundColor: '#22C08A' },
  badgeIdle: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  period: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: Spacing.sm },
  range: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  track: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: Spacing.md },
  fill: { height: 6, borderRadius: 999, backgroundColor: '#FFD66B' },
  next: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: Spacing.sm },
  note: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: Spacing.xs, fontStyle: 'italic' },
  banner: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  bannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

export default LiveScheduleCard;
