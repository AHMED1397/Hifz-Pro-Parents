import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/theme/tokens';

interface StatusChipProps {
  status: 'done' | 'behind' | 'absent' | 'pending' | 'present' | 'leave' | 'late';
  size?: 'sm' | 'md';
  showIcon?: boolean;
  label?: string;
}

const statusConfig = {
  done: { bg: Colors.successWash, text: '#0B7D4E', dot: Colors.success, icon: '✓', labelKey: 'common.done' },
  present: { bg: Colors.successWash, text: '#0B7D4E', dot: Colors.success, icon: '✓', labelKey: 'present' },
  behind: { bg: Colors.warningWash, text: '#9A5E00', dot: Colors.warning, icon: '!', labelKey: 'behind' },
  absent: { bg: Colors.dangerWash, text: '#B22525', dot: Colors.danger, icon: '✕', labelKey: 'absent' },
  late: { bg: Colors.dangerWash, text: '#B22525', dot: Colors.danger, icon: '⏰', labelKey: 'attendanceStatus.late' },
  pending: { bg: '#EEF2F8', text: Colors.textSecondary, dot: Colors.textMuted, icon: '•', labelKey: 'notYet' },
  leave: { bg: Colors.primaryWash, text: Colors.primaryDark, dot: Colors.primary, icon: '↪', labelKey: 'leave' },
};

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  size = 'md',
  showIcon = true,
  label,
}) => {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <View style={[styles.chip, styles[size], { backgroundColor: config.bg }]}>
      {showIcon && <View style={[styles.dot, { backgroundColor: config.dot }]} />}
      <Text style={[styles.label, { color: config.text }, styles[size === 'sm' ? 'labelSm' : 'labelMd']]}>
        {label ?? t(config.labelKey)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    gap: 5,
  },
  sm: {
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  md: {
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelSm: {
    fontSize: 11,
  },
  labelMd: {
    fontSize: 12.5,
  },
});
