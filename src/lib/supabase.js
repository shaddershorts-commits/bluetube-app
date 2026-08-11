import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// IDENTIDADE NO TEMPO REAL (auditoria 11/08).
//
// O cliente acima nasce com a chave anon, que está dentro do APK e qualquer
// um extrai. Sem mais nada, os canais de broadcast aceitam essa chave sozinha
// — e como os nomes são previsíveis (`ring-<uid>`, `call-<id>`), dava pra
// entrar no canal de qualquer usuário: tocar o telefone dele fingindo ser
// outra pessoa, ou entrar na sinalização de uma chamada em andamento.
//
// Provado em teste: dois clientes anônimos entraram no mesmo canal e
// trocaram mensagem, sem nenhuma credencial de usuário.
//
// A partir daqui o Realtime passa a mandar o JWT do usuário. Isso sozinho já
// dá identidade; quem fecha a porta é a policy em realtime.messages
// (sql/realtime_lockdown_2026_08_11.sql), que só pode ser ligada DEPOIS que
// esta versão do app estiver nos aparelhos — senão o app antigo, que não
// manda token, perde as chamadas.
export async function autenticarRealtime() {
  try {
    const token = await SecureStore.getItemAsync('bt_token');
    // Sem token (visitante), volta pra chave anon: o feed público continua
    // funcionando. Nunca deixa um token velho grudado no cliente.
    supabase.realtime.setAuth(token || SUPABASE_ANON_KEY);
    return !!token;
  } catch (e) {
    return false;
  }
}
