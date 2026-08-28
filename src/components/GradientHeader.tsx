import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, BorderRadius, Shadows } from '@/theme/tokens';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  children?: React.ReactNode;
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * Rounded gradient hero header used at the top of stack screens.
 * Gives the app a cohesive, premium identity and safe-area aware padding.
 */
export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  onBack,
  right,
  colors = Gradients.primary,
  children,
  compact = false,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: compact ? 18 : 24 },
        Shadows.brand,
        style,
      ]}
    >
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={Colors.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 4 }} />
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <View style={styles.rightWrap}>{right}</View>
      </View>
      {children ? <View style={styles.children}>{children}</View> : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
    fontWeight: '500',
  },
  rightWrap: {
    minWidth: 4,
    alignItems: 'flex-end',
  },
  children: {
    marginTop: 16,
  },
});
