import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/theme/tokens';
import {
  buildHeatmapDays,
  fillFor,
  toWeeks,
  FRIDAY_FILL,
  FAIL_FILL,
  PARTIAL_FILL,
  PASS_STEPS,
  type CellState,
  type HeatmapDay,
} from '@/lib/heatmap';

export { buildHeatmapDays };
export type { CellState, HeatmapDay };

// ─────────────────────────────────────────────────────────────
// GitHub-style contribution calendar.
//
// WHY HAND-BUILT: the three React Native heatmap packages on npm were all
// evaluated and none is usable on this stack (Expo 57 / React 19.2 / RN 0.86):
//   • react-native-calendar-heatmap — throws `ReferenceError: getValueCache is
//     not defined` on first render (undeclared assignment inside a function
//     component, i.e. a botched class-property transform), and it relies on
//     `defaultProps` on a function component, which React 19 removed.
//   • react-native-heatmap — pins react-native-svg ^6.3.1 (this app uses 15.x).
//   • react-native-heatmap-chart — peer-depends on react-native ^0.41.2.
// The famous heatmaps (`react-calendar-heatmap`, `heatmap-calendar-react`) are
// web-only: they need CSS classes and the DOM.
//
// WHY PLAIN VIEWS, NOT SVG: the first version drew the cells as
// react-native-svg `Rect`s with `onPress` on the shape. That crashes at render
// on web — react-native-svg routes shape presses through the legacy
// `TouchableMixin`, which logs "TouchableMixin is deprecated" and then throws
// under React 19. `Pressable` cells are supported on every platform and let one
// `cell` value drive both the pitch and the square, so the grid cannot drift.
// ─────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface Props {
  days: HeatmapDay[];
  /** Called when a day cell is tapped. */
  onSelect?: (day: HeatmapDay) => void;
  cellSize?: number;
  gap?: number;
}

export function ActivityHeatmap({ days, onSelect, cellSize = 15, gap = 4 }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<HeatmapDay | null>(null);
  const [availW, setAvailW] = useState(0);

  const weeks = useMemo(() => toWeeks(days), [days]);

  const labelW = 16;

  // 30 days is only ~5 week columns, so fixed-size cells render as a small,
  // sparse block. Grow the squares to fill the card instead, capped so they
  // stay square and tappable.
  const cell = useMemo(() => {
    if (availW <= 0 || weeks.length === 0) return cellSize;
    const fit = Math.floor((availW - labelW - (weeks.length - 1) * gap) / weeks.length);
    return Math.max(12, Math.min(36, fit));
  }, [availW, weeks.length, cellSize, gap]);

  /** One month label per column, only where the month changes. */
  const monthLabels = useMemo(() => {
    let lastMonth = -1;
    return weeks.map(week => {
      const firstReal = week.find(Boolean);
      if (!firstReal) return '';
      const m = firstReal.date.getMonth();
      if (m === lastMonth) return '';
      lastMonth = m;
      return MONTHS[m];
    });
  }, [weeks]);

  const active = selected;
  const activeLabel = active
    ? active.state === 'friday' || active.state === 'none'
      ? t('parent.greyNoClass')
      : active.state === 'fail'
        ? t('parent.redNeedsRepeat')
        : active.state === 'partial'
          ? `${active.passed}/${active.total} · ${t('parent.redNeedsRepeat')}`
          : `${active.passed}/${active.total} · ${t('parent.greenAllPassed')}`
    : '';

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('parent.last30Days')}</Text>
        <Text style={styles.subtitle}>
          {days.length
            ? `${days[0].date.getDate()} ${MONTHS[days[0].date.getMonth()]} – ${days[
                days.length - 1
              ].date.getDate()} ${MONTHS[days[days.length - 1].date.getMonth()]}`
            : ''}
        </Text>
      </View>

      <View onLayout={e => setAvailW(e.nativeEvent.layout.width)}>
        {/* Month labels */}
        <View style={styles.monthRow}>
          <View style={{ width: labelW }} />
          {monthLabels.map((label, col) => (
            <View key={`m-${col}`} style={{ width: cell, marginRight: col === monthLabels.length - 1 ? 0 : gap }}>
              <Text style={styles.monthText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Grid: weekday gutter + one column per week */}
        <View style={styles.gridRow}>
          <View style={{ width: labelW }}>
            {WEEKDAY_LABELS.map((label, row) => (
              <Text
                key={`wd-${row}`}
                style={[styles.weekdayText, { height: cell, marginBottom: row === 6 ? 0 : gap, lineHeight: cell }]}
              >
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((week, col) => (
            <View key={`w-${col}`} style={{ marginRight: col === weeks.length - 1 ? 0 : gap }}>
              {week.map((day, row) => {
                const isLastRow = row === 6;
                if (!day) {
                  return (
                    <View
                      key={`pad-${col}-${row}`}
                      style={{ width: cell, height: cell, marginBottom: isLastRow ? 0 : gap }}
                    />
                  );
                }
                const isSelected = selected?.iso === day.iso;
                return (
                  <Pressable
                    key={day.iso}
                    onPress={() => {
                      setSelected(day);
                      onSelect?.(day);
                    }}
                    style={[
                      styles.cell,
                      {
                        width: cell,
                        height: cell,
                        marginBottom: isLastRow ? 0 : gap,
                        backgroundColor: fillFor(day),
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: Colors.primary,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendSwatch color={PASS_STEPS[1]} label={t('parent.greenAllPassed')} />
        <LegendSwatch color={PARTIAL_FILL} label={t('parent.partialLabel')} />
        <LegendSwatch color={FAIL_FILL} label={t('parent.redNeedsRepeat')} />
        <LegendSwatch color={FRIDAY_FILL} label={t('parent.greyNoClass')} />
      </View>

      {active ? (
        <View style={styles.detail}>
          <Text style={styles.detailDate}>
            {active.date.getDate()} {MONTHS[active.date.getMonth()]}
          </Text>
          <Text style={styles.detailText}>{activeLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 11, color: Colors.textSecondary },
  monthRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  monthText: { fontSize: 9, color: Colors.textSecondary },
  gridRow: { flexDirection: 'row', alignItems: 'flex-start' },
  weekdayText: { fontSize: 9, color: Colors.textSecondary },
  cell: { borderRadius: 3.5 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 11, height: 11, borderRadius: 3, marginRight: 5 },
  legendText: { fontSize: 10, color: Colors.textSecondary },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  detailDate: { fontSize: 12, fontWeight: '800', color: Colors.text, marginRight: 8 },
  detailText: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
});

export default ActivityHeatmap;
