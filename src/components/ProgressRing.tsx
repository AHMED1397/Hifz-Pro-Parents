import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Colors } from '@/theme/tokens';

interface ProgressRingProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  showText?: boolean;
  text?: string;
  textStyle?: any;
  style?: any;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 56,
  strokeWidth = 6,
  trackColor = '#E4EAF3',
  progressColor,
  showText = true,
  text,
  textStyle,
  style,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  const gradientId = React.useMemo(() => `ring-grad-${Math.random().toString(36).slice(2, 9)}`, []);
  const stroke = progressColor ?? `url(#${gradientId})`;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#2E6BF0" />
            <Stop offset="1" stopColor={Colors.primaryDark} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.progressText, textStyle]}>
            {text || `${Math.round(progress * 100)}%`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
});