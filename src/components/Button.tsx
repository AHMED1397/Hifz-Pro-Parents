import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, BorderRadius, Shadows } from '@/theme/tokens';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

type ButtonRef = React.ElementRef<typeof TouchableOpacity>;

const variantStyles: Record<NonNullable<ButtonProps['variant']>, ViewStyle> = {
  primary: { backgroundColor: 'transparent' },
  gold: { backgroundColor: 'transparent' },
  secondary: { backgroundColor: Colors.primaryWash },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  danger: { backgroundColor: Colors.danger },
  ghost: { backgroundColor: 'transparent' },
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, ViewStyle> = {
  sm: { paddingVertical: 9, paddingHorizontal: 16, minHeight: 38 },
  md: { paddingVertical: 13, paddingHorizontal: 24, minHeight: 50 },
  lg: { paddingVertical: 16, paddingHorizontal: 32, minHeight: 56 },
};

const variantText: Record<NonNullable<ButtonProps['variant']>, TextStyle> = {
  primary: { color: Colors.white },
  gold: { color: Colors.white },
  secondary: { color: Colors.primary },
  outline: { color: Colors.primary },
  danger: { color: Colors.white },
  ghost: { color: Colors.primary },
};

const sizeText: Record<NonNullable<ButtonProps['size']>, TextStyle> = {
  sm: { fontSize: 13 },
  md: { fontSize: 16 },
  lg: { fontSize: 17 },
};

export const Button = React.forwardRef<ButtonRef, ButtonProps>(({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
}, ref) => {
  const isDisabled = disabled || loading;
  const isGradient = variant === 'primary' || variant === 'gold';
  const spinnerColor = variant === 'secondary' || variant === 'outline' || variant === 'ghost'
    ? Colors.primary
    : Colors.white;

  const inner = loading ? (
    <ActivityIndicator size="small" color={spinnerColor} />
  ) : (
    <>
      {leftIcon}
      <Text style={[styles.textBase, variantText[variant], sizeText[size], textStyle]}>{title}</Text>
      {rightIcon}
    </>
  );

  return (
    <TouchableOpacity
      ref={ref}
      style={[
        styles.wrapper,
        fullWidth && styles.fullWidth,
        !isGradient && styles.base,
        !isGradient && variantStyles[variant],
        !isGradient && sizeStyles[size],
        isGradient && !isDisabled && Shadows.brand,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {isGradient ? (
        <LinearGradient
          colors={(variant === 'gold' ? Gradients.gold : Gradients.primary) as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, sizeStyles[size], fullWidth && styles.fullWidth]}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});

Button.displayName = 'Button';
