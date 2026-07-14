// requireAuth — guarda de interação para o modo guest (app guest-first).
// Guest navega o feed livremente; ao tentar interagir (curtir, comentar,
// salvar, seguir, postar, chat, perfil), abre o modal de Login na conta.
//
// Uso: if (!requireAuth(navigation, 'curtir')) return;
import { useAuthStore } from '../store';

export function requireAuth(navigation, reason) {
  const token = useAuthStore.getState().token;
  if (token) return true;
  navigation.navigate('Login', { reason: reason || null });
  return false;
}

export function isGuest() {
  return !useAuthStore.getState().token;
}
