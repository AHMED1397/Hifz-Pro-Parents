import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

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
// GitHub-style contribution calendar, drawn on react-native-svg.
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
// So this renders the same week-column layout with react-native-svg, which is
// already a dependency and is what those libraries render with anyway.
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
  const labelH = 14;

  // 30 days is only ~5 week columns, so fixed-size cells render as a small,
  // sparse block. Grow the squares to fill the card instead, capped so they
  // stay square and tappable.
  const cell = useMemo(() => {
    if (availW <= 0 || weeks.length === 0) return cellSize;
    const fit = Math.floor((availW - labelW - (weeks.length - 1) * gap) / weeks.length);
    return Math.max(12, Math.min(36, fit));
  }, [availW, weeks.length, cellSize, gap]);

  const width = labelW + weeks.length * (cell + gap);
  const height = labelH + 7 * (cell + gap);

  /** Month label whenever the month changes between two columns. */
  const monthLabels = useMemo(() => {
    const out: Array<{ x: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const firstReal = week.find(Boolean);
      if (!firstReal) return;
      const m = firstReal.date.getMonth();
      if (m !== lastMonth) {
        out.push({ x: labelW + col * (cell + gap), label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return out;
  }, [weeks, cell, gap]);

  const active = selected;
  const activeLabel = active
    ? active.state === 'friday'
      ? t('parent.greyNoClass')
      : active.state === 'none'
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
          {days.length ? `${days[0].date.getDate()} ${MONTHS[days[0].date.getMonth()]} – ` : ''}
          {days.length ? `${days[days.length - 1].date.getDate()} ${MONTHS[days[days.length - 1].date.getMonth()]}` : ''}
        </Text>
      </View>

      <View style={styles.svgWrap} onLayout={e => setAvailW(e.nativeEvent.layout.width)}>
        <Svg width={width} height={height} style={styles.svg}>
          {/* Weekday labels down the left edge */}
          {WEEKDAY_LABELS.map((label, row) => (
            <SvgText
              key={`wd-${row}`}
              x={0}
              y={labelH + row * (cell + gap) + cell - Math.max(3, cell * 0.22)}
              fontSize={Math.max(9, Math.min(12, cell * 0.55))}
              fill={row === 5 ? Colors.textMuted : Colors.textSecondary}
              fontWeight={row === 5 ? '700' : '400'}
            >
              {label}
            </SvgText>
          ))}

          {/* Month labels along the top */}
          {monthLabels.map(m => (
            <SvgText key={`m-${m.label}-${m.x}`} x={m.x} y={10} fontSize={9} fill={Colors.textSecondary}>
              {m.label}
            </SvgText>
          ))}

          {/* Day cells, one column per week */}
          {weeks.map((week, col) =>
            week.map((day, row) => {
              if (!day) return null;
              const x = labelW + col * (cell + gap);
              const y = labelH + row * (cell + gap);
              const isSelected = selected?.iso === day.iso;
              return (
                <Rect
                  key={day.iso}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={3.5}
                  ry={3.5}
                  fill={fillFor(day)}
                  stroke={isSelected ? Colors.primary : 'transparent'}
                  strokeWidth={isSelected ? 2 : 0}
                  onPress={() => {
                    setSelected(day);
                    onSelect?.(day);
                  }}
                />
              );
            })
          )}
        </Svg>
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
  svgWrap: { width: '100%' },
  svg: { alignSelf: 'center' },
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
