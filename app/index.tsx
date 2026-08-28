import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { HAS_SUPABASE } from '@/data/datasource';
import { supabase } from '@/data/supabase';
import { Gradients, Colors } from '@/theme/tokens';

/**
 * Entry gate.
 *
 * With Supabase configured it requires a signed-in parent (Phase 0/6). Without
 * keys it goes straight to the dashboard on the demo family, so the app is
 * reviewable with no backend at all.
 */
export default function IndexRedirect() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      if (!HAS_SUPABASE || !supabase) {
        router.replace('/(tabs)');
        setChecking(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      router.replace(data.session ? '/(tabs)' : '/(auth)/login');
      setChecking(false);
    })();
  }, [router]);

  if (!checking) return null;

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
