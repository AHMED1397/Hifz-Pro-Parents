import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/theme/tokens';

interface EmptyStateProps {
  icon?: string;
  titleKey: string;
  messageKey?: string;
  actionLabelKey?: string;
  onAction?: () => void;
  style?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  titleKey,
  messageKey,
  actionLabelKey,
  onAction,
  style,
}) => {
  const { t } = useTranslation();
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon} aria-hidden={true}>{icon}</Text>
      </View>
      <Text style={styles.title}>{t(titleKey)}</Text>
      {messageKey && <Text style={styles.message}>{t(messageKey)}</Text>}
      {actionLabelKey && onAction && (
        <Text style={styles.action} onPress={onAction} accessibilityRole="button">
          {t(actionLabelKey)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
});