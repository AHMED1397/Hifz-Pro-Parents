import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Shadows } from '@/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  elevated?: boolean;
  padded?: boolean;
}

/**
 * Standard surface used across the app: white, rounded, soft shadow.
 * Keeps every card visually consistent instead of re-declaring shadows.
 */
export const Card: React.FC<CardProps> = ({ children, style, elevated = false, padded = true }) => (
  <View
    style={[
      styles.base,
      padded && styles.padded,
      elevated ? Shadows.elevated : Shadows.card,
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  padded: {
    padding: 18,
  },
});
