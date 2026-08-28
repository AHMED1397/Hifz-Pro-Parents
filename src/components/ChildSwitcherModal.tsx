import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import type { Student } from '@/data/types';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: Student[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Quick sibling selector — PARENT_APP_SPEC.md §3 Screen 2, "Child Switcher". */
export function ChildSwitcherModal({ visible, onClose, children: kids, activeId, onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.title}>{t('parent.switchChild')}</Text>
          {kids.length === 0 ? <Text style={styles.empty}>{t('parent.noChildren')}</Text> : null}
          {kids.map(kid => {
            const active = kid.id === activeId;
            return (
              <Pressable
                key={kid.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => {
                  onSelect(kid.id);
                  onClose();
                }}
              >
                <View style={[styles.avatar, { backgroundColor: kid.avatar_color ?? Colors.primary }]}>
                  <Text style={styles.avatarText}>{kid.full_name.charAt(0)}</Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.name}>{kid.full_name}</Text>
                  <Text style={styles.sub}>
                    {t('parent.page')} {kid.current_page}
                  </Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,27,51,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  title: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  empty: { color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  rowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryWash },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  meta: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});

export default ChildSwitcherModal;
