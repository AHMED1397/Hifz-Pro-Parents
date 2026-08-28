import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/theme/tokens';

interface FilterChipOption {
  value: string;
  labelKey: string;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  scrollable?: boolean;
  variant?: 'default' | 'outline';
  style?: any;
  contentContainerStyle?: any;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selectedValue,
  onChange,
  scrollable = true,
  variant = 'default',
  style,
  contentContainerStyle,
}) => {
  const { t } = useTranslation();
  
  const renderChips = () => (
    <>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.chip,
            styles[variant],
            selectedValue === option.value ? styles.selected : styles.unselected,
            { borderColor: selectedValue === option.value ? Colors.primary : Colors.border },
          ]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedValue === option.value }}
        >
          <Text style={[
            styles.chipText,
            selectedValue === option.value ? styles.selectedText : styles.unselectedText,
          ]}>
            {t(option.labelKey)}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );
  
  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[{ paddingHorizontal: 16, gap: 8 }, contentContainerStyle]}
        style={style}
      >
        {renderChips()}
      </ScrollView>
    );
  }
  
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>
      {renderChips()}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1.5,
    minHeight: 38,
    justifyContent: 'center',
  },
  default: {
    backgroundColor: Colors.card,
  },
  outline: {
    backgroundColor: 'transparent',
  },
  selected: {
    backgroundColor: Colors.primaryWash,
    borderColor: Colors.primary,
  },
  unselected: {
    backgroundColor: Colors.card,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectedText: {
    color: Colors.primaryDark,
  },
  unselectedText: {
    color: Colors.textSecondary,
  },
});