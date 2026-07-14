import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';
import { LANGS, useLangStore, useT } from '../i18n';

function SettingItem({ icon, label, value, onPress, danger }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.row} activeOpacity={0.7}>
      <Ionicons name={icon} size={20} color={danger ? COLORS.red : COLORS.text} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, danger && { color: COLORS.red }]}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />}
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <GlassCard padded={false}>
        {children}
      </GlassCard>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [appVersion, setAppVersion] = useState('');
  const [langModal, setLangModal] = useState(false);
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const t = useT();
  const currentLang = LANGS.find((l) => l.code === lang) || LANGS[0];

  useEffect(() => {
    try {
      const v = Constants.expoConfig?.version || Constants.manifest?.version || '';
      const build = Constants.expoConfig?.runtimeVersion || '';
      setAppVersion(v + (build ? ` (${build})` : ''));
    } catch (_) {}
  }, []);

  const handleLogout = () => {
    Alert.alert(t('st_logout_t'), t('st_sure'), [
      { text: t('st_cancel'), style: 'cancel' },
      { text: t('st_logout_t'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('st_delete'),
      t('st_delete_msg'),
      [
        { text: t('st_cancel'), style: 'cancel' },
        { text: t('st_open_support'), onPress: () => Linking.openURL('https://bluetubeviral.com/suporte').catch(() => {}) },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title={t('st_title')} showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

        <Section title={t('st_account')}>
          <SettingItem
            icon="mail-outline"
            label={t('st_email')}
            value={user?.email || '—'}
            onPress={() => Alert.alert(t('st_email'), user?.email || t('st_email_none'))}
          />
          <SettingItem
            icon="key-outline"
            label={t('st_password')}
            value={t('st_via_web')}
            onPress={() => Linking.openURL('https://bluetubeviral.com/blue?action=change-password').catch(() => {})}
          />
        </Section>

        <Section title={t('st_content')}>
          <SettingItem
            icon="language-outline"
            label={t('st_lang')}
            value={`${currentLang.flag} ${currentLang.name}`}
            onPress={() => setLangModal(true)}
          />
          <SettingItem
            icon="notifications-outline"
            label={t('st_push')}
            value={t('st_soon')}
            onPress={() => Alert.alert(t('st_soon'), t('st_push_soon'))}
          />
        </Section>

        <Section title={t('st_about')}>
          <SettingItem
            icon="document-text-outline"
            label={t('st_terms')}
            onPress={() => Linking.openURL('https://bluetubeviral.com/termos').catch(() => {})}
          />
          <SettingItem
            icon="shield-outline"
            label={t('st_privacy')}
            onPress={() => Linking.openURL('https://bluetubeviral.com/privacidade').catch(() => {})}
          />
          <SettingItem
            icon="help-circle-outline"
            label={t('st_support')}
            onPress={() => Linking.openURL('https://bluetubeviral.com/suporte').catch(() => {})}
          />
          <SettingItem
            icon="information-circle-outline"
            label={t('st_version')}
            value={appVersion || '—'}
            onPress={() => {}}
          />
        </Section>

        <Section title={t('st_danger')}>
          <SettingItem
            icon="log-out-outline"
            label={t('st_logout')}
            onPress={handleLogout}
            danger
          />
          <SettingItem
            icon="trash-outline"
            label={t('st_delete')}
            onPress={handleDeleteAccount}
            danger
          />
        </Section>

        <Text style={styles.platform}>{Platform.OS === 'android' ? 'Android' : Platform.OS} · BlueTube</Text>
      </ScrollView>

      {/* Seletor de idioma — antes era um Alert "Em breve" (stub morto) */}
      <Modal visible={langModal} transparent animationType="fade" onRequestClose={() => setLangModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t('st_pick_lang')}</Text>
            {LANGS.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langRow, l.code === lang && styles.langRowActive]}
                activeOpacity={0.7}
                onPress={() => { setLang(l.code); setLangModal(false); }}>
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langName, l.code === lang && { color: COLORS.neon }]}>{l.name}</Text>
                {l.code === lang && <Ionicons name="checkmark" size={18} color={COLORS.neon} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 8, paddingHorizontal: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  value: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  platform: { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 24 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modalCard: {
    width: '100%', backgroundColor: '#0a1020', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(0,170,255,0.2)',
  },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  langRowActive: { backgroundColor: 'rgba(0,170,255,0.08)' },
  langFlag: { fontSize: 20 },
  langName: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 },
});
