import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Header from '../components/Header';
import { useAuthStore } from '../store';
import { COLORS } from '../constants';

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
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    try {
      const v = Constants.expoConfig?.version || Constants.manifest?.version || '';
      const build = Constants.expoConfig?.runtimeVersion || '';
      setAppVersion(v + (build ? ` (${build})` : ''));
    } catch (_) {}
  }, []);

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Excluir conta',
      'Excluir conta é irreversível. Pra excluir, abra o suporte na versão web.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Abrir suporte', onPress: () => Linking.openURL('https://bluetubeviral.com/suporte').catch(() => {}) },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header title="Configurações" showBack />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

        <Section title="Conta">
          <SettingItem
            icon="mail-outline"
            label="Email"
            value={user?.email || '—'}
            onPress={() => Alert.alert('Email', user?.email || 'Sem email cadastrado')}
          />
          <SettingItem
            icon="key-outline"
            label="Mudar senha"
            value="Via versão web"
            onPress={() => Linking.openURL('https://bluetubeviral.com/blue?action=change-password').catch(() => {})}
          />
        </Section>

        <Section title="Conteúdo">
          <SettingItem
            icon="language-outline"
            label="Idioma"
            value="Português (BR)"
            onPress={() => Alert.alert('Em breve', 'Outros idiomas em desenvolvimento. Por enquanto: Português.')}
          />
          <SettingItem
            icon="notifications-outline"
            label="Notificações push"
            value="Em breve"
            onPress={() => Alert.alert('Em breve', 'Configuração de push em desenvolvimento')}
          />
        </Section>

        <Section title="Sobre">
          <SettingItem
            icon="document-text-outline"
            label="Termos de uso"
            onPress={() => Linking.openURL('https://bluetubeviral.com/termos').catch(() => {})}
          />
          <SettingItem
            icon="shield-outline"
            label="Política de privacidade"
            onPress={() => Linking.openURL('https://bluetubeviral.com/privacidade').catch(() => {})}
          />
          <SettingItem
            icon="help-circle-outline"
            label="Suporte"
            onPress={() => Linking.openURL('https://bluetubeviral.com/suporte').catch(() => {})}
          />
          <SettingItem
            icon="information-circle-outline"
            label="Versão do app"
            value={appVersion || 'desconhecida'}
            onPress={() => {}}
          />
        </Section>

        <Section title="Conta — perigoso">
          <SettingItem
            icon="log-out-outline"
            label="Sair desta conta"
            onPress={handleLogout}
            danger
          />
          <SettingItem
            icon="trash-outline"
            label="Excluir conta"
            onPress={handleDeleteAccount}
            danger
          />
        </Section>

        <Text style={styles.platform}>{Platform.OS === 'android' ? 'Android' : Platform.OS} · BlueTube</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 8, paddingHorizontal: 4,
  },
  sectionBody: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  value: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  platform: { color: COLORS.textDim, fontSize: 11, textAlign: 'center', marginTop: 24 },
});
