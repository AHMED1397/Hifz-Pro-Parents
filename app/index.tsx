import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { HAS_SUPABASE } from '@/data/datasource';
import { useApp } from '@/context/AppProviders';
import { Gradients, Colors } from '@/theme/tokens';

/**
 * Entry gate.
 *
 * The deployed project has no Supabase Auth, so the session is the persisted
 * guardian number (or the demo flag) rather than an auth session — see gap G11.
 * `AppProviders` restores both from AsyncStorage before `booting` clears, so
 * this only decides once the saved state is known.
 */
export default function IndexRedirect() {
  const router = useRouter();
  const { booting, guardianPhone, demoMode } = useApp();

  useEffect(() => {
    if (booting) return;
    const signedIn = !!guardianPhone || demoMode || !HAS_SUPABASE;
    router.replace(signedIn ? '/(tabs)' : '/(auth)/login');
  }, [booting, guardianPhone, demoMode, router]);

  if (!booting) return null;

  return (
    <LinearGradient
      colors={Gradients.primary as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.logoCircle}>
        <Ionicons name="people" size={44} color={Colors.white} />
      </View>
      <Text style={styles.title}>Al Haqqaniyyah Hifz</Text>
      <Text style={styles.subtitle}>Parent Portal</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 23, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.82)' },
});
