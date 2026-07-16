// Moderação UGC (exigência Google Play pra apps sociais): denunciar
// conteúdo/usuário e bloquear usuário, de qualquer tela.
// Backend já existente: api/blue-report.js (reportar / bloquear toggle /
// bloqueados) — o feed já filtra bloqueados no servidor.
//
// Uso: openModeration(nav, { tipoAlvo:'video'|'comentario'|'usuario'|'mensagem',
//                            alvoId, userId?, username?, onBlocked? })
import { Alert } from 'react-native';
import blueAPI from '../api';
import { requireAuth } from './requireAuth';

async function enviarReport(tipoAlvo, alvoId, motivo) {
  const r = await blueAPI.reportar(tipoAlvo, alvoId, motivo).catch((e) => ({ error: e.message }));
  if (r?.error) Alert.alert('Não foi possível denunciar', r.error);
  else Alert.alert('Denúncia enviada', 'Obrigado! Nossa equipe vai analisar. Conteúdo que violar as regras é removido.');
}

function menuMotivos(tipoAlvo, alvoId) {
  Alert.alert('Denunciar', 'Qual é o problema?', [
    { text: 'Spam ou golpe', onPress: () => enviarReport(tipoAlvo, alvoId, 'spam') },
    { text: 'Conteúdo impróprio', onPress: () => menuImproprio(tipoAlvo, alvoId) },
    { text: 'Outro motivo', onPress: () => enviarReport(tipoAlvo, alvoId, 'outro') },
  ], { cancelable: true });
}

function menuImproprio(tipoAlvo, alvoId) {
  Alert.alert('Conteúdo impróprio', 'Especifique:', [
    { text: 'Nudez/sexual', onPress: () => enviarReport(tipoAlvo, alvoId, 'nudez') },
    { text: 'Violência/ódio', onPress: () => enviarReport(tipoAlvo, alvoId, 'violencia') },
    { text: 'Envolve menor de idade', onPress: () => enviarReport(tipoAlvo, alvoId, 'menor_risco') },
  ], { cancelable: true });
}

function confirmarBloqueio(userId, username, onBlocked) {
  Alert.alert(
    `Bloquear @${username || 'usuário'}?`,
    'Você não vai mais ver os vídeos, comentários e mensagens desta pessoa. Dá pra desbloquear depois no perfil dela.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear', style: 'destructive',
        onPress: async () => {
          const r = await blueAPI.bloquear(userId).catch((e) => ({ error: e.message }));
          if (r?.error) { Alert.alert('Erro', r.error); return; }
          const { addBlocked, removeBlocked } = require('../store').useAuthStore.getState();
          if (r?.bloqueado) { addBlocked?.(userId); Alert.alert('Bloqueado', `@${username || 'usuário'} foi bloqueado.`); }
          else removeBlocked?.(userId);
          onBlocked?.(r?.bloqueado !== false);
        },
      },
    ],
  );
}

export function openModeration(navigation, { tipoAlvo, alvoId, userId, username, onBlocked }) {
  if (!requireAuth(navigation, 'denunciar')) return;
  const botoes = [{ text: 'Denunciar', onPress: () => menuMotivos(tipoAlvo, alvoId) }];
  if (userId) botoes.push({ text: `Bloquear @${username || 'usuário'}`, style: 'destructive', onPress: () => confirmarBloqueio(userId, username, onBlocked) });
  botoes.push({ text: 'Cancelar', style: 'cancel' });
  Alert.alert(username ? `@${username}` : 'Opções', 'O que você quer fazer?', botoes, { cancelable: true });
}
