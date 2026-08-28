import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DataSource, HAS_SUPABASE } from '@/data/datasource';
import { signInWithPhoneOtp } from '@/data/supabase';
import { Button } from '@/components/Button';
import { Colors, Gradients, BorderRadius, Shadows } from '@/theme/tokens';

/**
 * Screen 1: parent sign-in.
 *
 * Email/password is the path that works as soon as parent auth users exist
 * (Phase 0). Phone OTP is wired but needs an SMS provider enabled on the
 * Supabase project — see docs/PARENT_APP_PLAN.md gap G5.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'password' | 'otp'>('password');

  const onSignIn = async () => {
    if (!HAS_SUPABASE) {
      Alert.alert(t('parent.signIn'), t('parent.demoHint'));
      router.replace('/(tabs)');
      return;
    }
    setBusy(true);
    try {
      await DataSource.signInWithPassword(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(t('parent.signIn'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRequestOtp = async () => {
    if (!HAS_SUPABASE) {
      Alert.alert(t('parent.signIn'), t('parent.demoHint'));
      router.replace('/(tabs)');
      return;
    }
    setBusy(true);
    try {
      await signInWithPhoneOtp(phone.trim());
      Alert.alert(t('parent.signIn'), 'OTP sent by SMS.');
    } catch (e) {
      Alert.alert(t('parent.signIn'), (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient
      colors={Gradients.primary as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoCircle}>
            <Ionicons name="people" size={40} color="#fff" />
          </View>
          <Text style={styles.title}>Al Haqqaniyyah Hifz</Text>
          <Text style={styles.subtitle}>Parent Portal</Text>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <TabButton active={mode === 'password'} label={t('parent.password')} onPress={() => setMode('password')} />
              <TabButton active={mode === 'otp'} label="SMS OTP" onPress={() => setMode('otp')} />
            </View>

            {mode === 'password' ? (
              <>
                <Text style={styles.label}>{t('parent.email')}</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="parent@example.com"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={styles.label}>{t('parent.password')}</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                />
                <Button title={t('parent.signIn')} onPress={onSignIn} loading={busy} style={{ marginTop: 20 }} />
              </>
            ) : (
              <>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+94 77 123 4567"
                  placeholderTextColor={Colors.textMuted}
                />
                <Button title="Send OTP" onPress={onRequestOtp} loading={busy} style={{ marginTop: 20 }} />
                <Text style={styles.otpNote}>
                  Requires an SMS provider (Twilio/MessageBird) enabled on the Supabase project.
                </Text>
              </>
            )}

            {!HAS_SUPABASE ? (
              <View style={styles.demoNote}>
                <Text style={styles.demoText}>{t('parent.demoHint')}</Text>
              </View>
            ) : null}

            {busy ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <View style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]} onPress={onPress}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignItems: 'center', paddingHorizontal: 24 },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 14 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  card: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: 20,
    marginTop: 24,
    ...Shadows.card,
  },
  tabs: { flexDirection: 'row', backgroundColor: Colors.background, borderRadius: BorderRadius.sm, padding: 3, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BorderRadius.xs },
  tabActive: { backgroundColor: Colors.card },
  tabText: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  label: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  otpNote: { fontSize: 11, color: Colors.textMuted, marginTop: 10 },
  demoNote: { backgroundColor: Colors.warningWash, borderRadius: BorderRadius.sm, padding: 10, marginTop: 16 },
  demoText: { fontSize: 11, color: '#7A4E00' },
});
