import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, TextInput, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { DataSource, HAS_SUPABASE } from '@/data/datasource';
import { DIVISION_NAMES } from '@/data/types';
import { useApp } from '@/context/AppProviders';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LANG_LABELS, type AppLang } from '@/i18n';
import { scheduleTestNotification } from '@/lib/notifications';
import { Colors, BorderRadius, Spacing } from '@/theme/tokens';

/** Screen 7: family management, language, and notification preferences. */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { children: kids, lang, setLang, prefs, setPrefs } = useApp();
  const [admissionNo, setAdmissionNo] = useState('');
  const [dob, setDob] = useState('');

  const onAddChild = async () => {
    if (!admissionNo.trim()) return;
    const res = await DataSource.requestChildLink(admissionNo.trim(), dob.trim());
    Alert.alert(t('parent.addChild'), res.message);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#2E6BF0', '#1544B0']} style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>⚙️ {t('parent.tabMore')}</Text>
        <Text style={styles.headerSub}>{HAS_SUPABASE ? t('parent.live') : t('parent.demoHint')}</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* ── Family ──────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>👪 {t('parent.family')}</Text>
        {kids.map(kid => (
          <Card key={kid.id} style={{ marginBottom: Spacing.sm }}>
            <View style={styles.kidRow}>
              <View style={[styles.avatar, { backgroundColor: kid.avatar_color ?? Colors.primary }]}>
                <Text style={styles.avatarText}>{kid.full_name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kidName}>{kid.full_name}</Text>
                <Text style={styles.kidSub}>
                  {kid.admission_no} · {DIVISION_NAMES[kid.division_id]} · {t('parent.current')} P.{kid.current_page}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        <Card style={{ marginTop: Spacing.md }}>
          <Text style={styles.cardTitle}>{t('parent.addChild')}</Text>
          <Text style={styles.cardSub}>{t('parent.admissionNumber')}</Text>
          <TextInput
            style={styles.input}
            value={admissionNo}
            onChangeText={setAdmissionNo}
            placeholder="HFZ-2101"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
          />
          <Text style={styles.cardSub}>{t('parent.dateOfBirth')}</Text>
          <TextInput
            style={styles.input}
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
          />
          <Button title={t('parent.addChild')} onPress={onAddChild} size="sm" style={{ marginTop: Spacing.md }} />
        </Card>

        {/* ── Language ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>🌐 {t('parent.language')}</Text>
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
        <Text style={styles.sectionTitle}>🔔 {t('parent.pushPreferences')}</Text>
        <Card>
          <ToggleRow label={t('parent.prefLessons')} value={prefs.lessons} onChange={v => setPrefs({ lessons: v })} />
          <ToggleRow label={t('parent.prefAttendance')} value={prefs.attendance} onChange={v => setPrefs({ attendance: v })} />
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
          onPress={() =>
            scheduleTestNotification('📖 Sabaq Passed ✓', "Test push from the Hfz-Parent app.")
          }
        />

        {/* ── Contact ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>📞 {t('parent.contact')}</Text>
        <Card>
          <Text style={styles.contactLine}>Al Haqqaniyyah Arabic College — Hifz Section</Text>
          <Text style={styles.contactSub}>Daskara, Kandy, Sri Lanka</Text>
        </Card>

        <Button title={t('parent.signOut')} variant="danger" style={{ marginTop: Spacing.lg }} onPress={() => DataSource.signOut()} />
      </View>
    </ScrollView>
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  body: { padding: Spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  kidRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  kidName: { fontSize: 14, fontWeight: '800', color: Colors.text },
  kidSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  cardSub: { fontSize: 11, color: Colors.textSecondary, marginTop: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
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
