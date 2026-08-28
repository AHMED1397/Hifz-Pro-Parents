import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, TextInput, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HAS_SUPABASE } from '@/data/datasource';
import { useApp } from '@/context/AppProviders';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LANG_LABELS, type AppLang } from '@/i18n';
import { scheduleTestNotification } from '@/lib/notifications';
import { Colors, Gradients, Shadows, BorderRadius, Spacing } from '@/theme/tokens';

/** Screen 7: family, guardian number, language and notification preferences. */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { children: kids, lang, setLang, prefs, setPrefs, guardianPhone, setGuardianPhone, setDemoMode } = useApp();
  const [phone, setPhone] = useState('');

  const onSavePhone = () => {
    if (!phone.trim()) return;
    setDemoMode(false);
    setGuardianPhone(phone.trim());
    setPhone('');
  };

  const onSignOut = () => {
    setGuardianPhone('');
    setDemoMode(false);
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + Spacing.md }, Shadows.brand]}
      >
        <Text style={styles.headerTitle}>{t('parent.tabMore')}</Text>
        <Text style={styles.headerSub}>{HAS_SUPABASE ? t('parent.live') : t('parent.demoHint')}</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* ── Family ──────────────────────────────────────── */}
        <SectionTitle icon="people-outline">{t('parent.family')}</SectionTitle>
        {kids.map(kid => (
          <Card key={kid.id} style={{ marginBottom: Spacing.sm }}>
            <View style={styles.kidRow}>
              <View style={[styles.avatar, { backgroundColor: kid.avatar_color ?? Colors.primary }]}>
                <Text style={styles.avatarText}>{kid.full_name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kidName}>{kid.full_name}</Text>
                <Text style={styles.kidSub}>
                  {t('parent.page')} {kid.current_page}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {/* ── Guardian number ─────────────────────────────── */}
        <SectionTitle icon="call-outline">{t('parent.guardianNumber')}</SectionTitle>
        <Card>
          <Text style={styles.cardSub}>{t('parent.guardianNumberHint')}</Text>
          <View style={styles.currentRow}>
            <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
            <Text style={styles.currentPhone}>{guardianPhone || '—'}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="07X XXX XXXX"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />
          <Button title={t('common.save')} onPress={onSavePhone} size="sm" style={{ marginTop: Spacing.md }} />
        </Card>

        {/* ── Language ────────────────────────────────────── */}
        <SectionTitle icon="language-outline">{t('parent.language')}</SectionTitle>
        <View style={styles.langRow}>
          {(Object.keys(LANG_LABELS) as AppLang[]).map(code => (
            <Pressable
              key={code}
              style={[styles.langChip, lang === code && styles.langChipActive]}
              onPress={() => setLang(code)}
            >
              <Text style={[styles.langText, lang === code && styles.langTextActive]}>{LANG_LABELS[code]}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Notifications ───────────────────────────────── */}
        <SectionTitle icon="notifications-outline">{t('parent.pushPreferences')}</SectionTitle>
        <Card>
          <ToggleRow label={t('parent.prefLessons')} value={prefs.lessons} onChange={v => setPrefs({ lessons: v })} />
          <ToggleRow label={t('parent.attendance')} value={prefs.attendance} onChange={v => setPrefs({ attendance: v })} />
          <ToggleRow label={t('parent.prefExams')} value={prefs.exams} onChange={v => setPrefs({ exams: v })} />
          <ToggleRow
            label={t('parent.prefAnnouncements')}
            value={prefs.announcements}
            onChange={v => setPrefs({ announcements: v })}
            last
          />
        </Card>
        <Button
          title={t('parent.sendTest')}
          variant="outline"
          size="sm"
          style={{ marginTop: Spacing.sm }}
          onPress={() => scheduleTestNotification(t('notif.testTitle'), t('notif.testBody'))}
        />

        {/* ── Contact ─────────────────────────────────────── */}
        <SectionTitle icon="location-outline">{t('parent.contact')}</SectionTitle>
        <Card>
          <Text style={styles.contactLine}>Al Haqqaniyyah Arabic College — Hifz Section</Text>
          <Text style={styles.contactSub}>Daskara, Kandy, Sri Lanka</Text>
        </Card>

        <Button
          title={t('parent.signOut')}
          variant="danger"
          style={{ marginTop: Spacing.lg }}
          onPress={onSignOut}
        />
      </View>
    </ScrollView>
  );
}

function SectionTitle({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Ionicons name={icon} size={15} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{children}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !last && styles.toggleBorder]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: Colors.primary, false: '#D7DEE9' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  body: { padding: Spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: Colors.text },
  kidRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  kidName: { fontSize: 14, fontWeight: '800', color: Colors.text },
  kidSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  cardSub: { fontSize: 11, color: Colors.textSecondary },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  currentPhone: { fontSize: 14, fontWeight: '800', color: Colors.text },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  langRow: { flexDirection: 'row', gap: 8 },
  langChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  langText: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary },
  langTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  toggleBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  toggleLabel: { fontSize: 13, color: Colors.text },
  contactLine: { fontSize: 13, fontWeight: '700', color: Colors.text },
  contactSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
