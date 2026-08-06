// requireAuth — guarda de interação para o modo guest (app guest-first).
// Guest navega o feed livremente; ao tentar interagir (curtir, comentar,
// salvar, seguir, postar, chat, perfil), abre o modal de Login na conta.
//
// Uso: if (!requireAuth(navigation, 'curtir')) return;
import { useAuthStore } from '../store';

// ANTI-ZUMBI (06/08/2026): antes bastava ter token pra ser considerado
// logado. Só que existe um estado em que o token está salvo mas o usuário
// NÃO foi verificado (token expirado + refresh que falhou por rede). Nesse
// limbo o app liberava Perfil/Editar perfil enquanto toda chamada
// autenticada voltava 401 — o usuário via tela vazia e nenhuma opção de
// entrar. Agora identidade real exige token E usuário carregado.
function sessaoValida() {
  const { token, user, sessaoNaoVerificada } = useAuthStore.getState();
  return !!token && !!user && !sessaoNaoVerificada;
}

export function requireAuth(navigation, reason) {
  if (sessaoValida()) return true;
  navigation.navigate('Login', { reason: reason || null });
  return false;
}

export function isGuest() {
  return !sessaoValida();
}
