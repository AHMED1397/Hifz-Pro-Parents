import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HAS_SUPABASE } from '@/data/datasource';
import { Button } from '@/components/Button';
import { useApp } from '@/context/AppProviders';
import { Colors, Gradients, BorderRadius, Shadows, Spacing } from '@/theme/tokens';

/**
 * Screen 1: guardian sign-in.
 *
 * The deployed Supabase project has no Supabase Auth users and RLS is open, so
 * the only parent→child link that exists in the live data is
 * `students.guardian_phone`. Signing in therefore means entering the phone
 * number the madrasa holds for the guardian; the family is resolved by
 * matching its last nine digits. Phone OTP would still need an SMS provider
 * on the project — see docs/PARENT_APP_PLAN.md gap G5.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setGuardianPhone, setDemoMode } = useApp();

  const [phone, setPhone] = useState('');

  const onContinue = () => {
    setDemoMode(false);
    setGuardianPhone(phone.trim());
    router.replace('/(tabs)');
  };

  const onDemo = () => {
    setDemoMode(true);
    setGuardianPhone('');
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + Spacing.xl }, Shadows.brand]}
      >
        <View style={styles.markWrap}>
          <Ionicons name="book" size={28} color="#fff" />
        </View>
        <Text style={styles.title}>{t('appName')}</Text>
        <Text style={styles.subtitle}>{t('parent.loginSubtitle')}</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>{t('parent.guardianPhone')}</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="07X XXX XXXX"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>
          <Text style={styles.hint}>{t('parent.loginHint')}</Text>

          <Button title={t('parent.continue')} onPress={onContinue} size="lg" style={{ marginTop: Spacing.lg }} />

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>{t('common.or')}</Text>
            <View style={styles.orLine} />
          </View>

          <Button title={t('parent.tryDemo')} variant="outline" onPress={onDemo} />

          {!HAS_SUPABASE ? (
            <View style={styles.noteCard}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.noteText}>{t('parent.demoHint')}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  markWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4, lineHeight: 19 },
  body: { flex: 1 },
  label: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: Colors.text },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 8, lineHeight: 17 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: Spacing.lg },
  orLine: { flex: 1, height: 1, backgroundColor: Colors.divider },
  orText: { fontSize: 11, color: Colors.textMuted },
  noteCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.primaryWash,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  noteText: { flex: 1, fontSize: 12, color: Colors.primaryDark, lineHeight: 17 },
});
