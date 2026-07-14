// i18n do app — 7 idiomas (espelha o core do site).
// useLangStore: idioma persistido no SecureStore, aplicado em tempo real.
// useT(): hook que retorna t(key) reativo — componentes re-renderizam ao trocar.
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const LANGS = [
  { code: 'pt', name: 'Português (BR)', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

const T = {
  pt: {
    feed_empty: 'Nenhum vídeo ainda.', feed_reprises: '🔄 Reprises dos virais',
    discover_title: 'Descobrir', discover_tags: 'Em alta', discover_empty: 'Nenhum vídeo ainda.', discover_videos: 'vídeos',
    video_title: 'Vídeo', video_notfound: 'Vídeo não encontrado',
    comments: 'Comentários', comment_add: 'Adicionar comentário…', comment_first: 'Nenhum comentário ainda. Seja o primeiro!',
    follow: 'Seguir', following: 'Seguindo', message: 'Mensagem',
    notif_title: 'Notificações', notif_empty: 'Nenhuma notificação ainda.',
    st_title: 'Configurações', st_account: 'Conta', st_email: 'Email', st_email_none: 'Sem email cadastrado',
    st_password: 'Mudar senha', st_via_web: 'Via versão web', st_content: 'Conteúdo',
    st_lang: 'Idioma', st_push: 'Notificações push', st_soon: 'Em breve', st_push_soon: 'Configuração de push em desenvolvimento',
    st_about: 'Sobre', st_terms: 'Termos de uso', st_privacy: 'Política de privacidade', st_support: 'Suporte',
    st_version: 'Versão do app', st_danger: 'Conta — perigoso', st_logout: 'Sair desta conta',
    st_logout_t: 'Sair', st_sure: 'Tem certeza?', st_cancel: 'Cancelar',
    st_delete: 'Excluir conta', st_delete_msg: 'Excluir conta é irreversível. Pra excluir, abra o suporte na versão web.',
    st_open_support: 'Abrir suporte', st_pick_lang: 'Escolher idioma',
  },
  en: {
    feed_empty: 'No videos yet.', feed_reprises: '🔄 Viral reruns',
    discover_title: 'Discover', discover_tags: 'Trending', discover_empty: 'No videos yet.', discover_videos: 'videos',
    video_title: 'Video', video_notfound: 'Video not found',
    comments: 'Comments', comment_add: 'Add a comment…', comment_first: 'No comments yet. Be the first!',
    follow: 'Follow', following: 'Following', message: 'Message',
    notif_title: 'Notifications', notif_empty: 'No notifications yet.',
    st_title: 'Settings', st_account: 'Account', st_email: 'Email', st_email_none: 'No email registered',
    st_password: 'Change password', st_via_web: 'Via web version', st_content: 'Content',
    st_lang: 'Language', st_push: 'Push notifications', st_soon: 'Coming soon', st_push_soon: 'Push settings under development',
    st_about: 'About', st_terms: 'Terms of use', st_privacy: 'Privacy policy', st_support: 'Support',
    st_version: 'App version', st_danger: 'Account — danger zone', st_logout: 'Log out',
    st_logout_t: 'Log out', st_sure: 'Are you sure?', st_cancel: 'Cancel',
    st_delete: 'Delete account', st_delete_msg: 'Deleting your account is irreversible. To delete, open support on the web version.',
    st_open_support: 'Open support', st_pick_lang: 'Choose language',
  },
  es: {
    feed_empty: 'Aún no hay videos.', feed_reprises: '🔄 Reposiciones virales',
    discover_title: 'Descubrir', discover_tags: 'Tendencias', discover_empty: 'Aún no hay videos.', discover_videos: 'videos',
    video_title: 'Video', video_notfound: 'Video no encontrado',
    comments: 'Comentarios', comment_add: 'Añadir comentario…', comment_first: '¡Aún no hay comentarios. Sé el primero!',
    follow: 'Seguir', following: 'Siguiendo', message: 'Mensaje',
    notif_title: 'Notificaciones', notif_empty: 'Aún no hay notificaciones.',
    st_title: 'Ajustes', st_account: 'Cuenta', st_email: 'Email', st_email_none: 'Sin email registrado',
    st_password: 'Cambiar contraseña', st_via_web: 'Vía versión web', st_content: 'Contenido',
    st_lang: 'Idioma', st_push: 'Notificaciones push', st_soon: 'Próximamente', st_push_soon: 'Configuración de push en desarrollo',
    st_about: 'Acerca de', st_terms: 'Términos de uso', st_privacy: 'Política de privacidad', st_support: 'Soporte',
    st_version: 'Versión de la app', st_danger: 'Cuenta — peligro', st_logout: 'Cerrar sesión',
    st_logout_t: 'Salir', st_sure: '¿Estás seguro?', st_cancel: 'Cancelar',
    st_delete: 'Eliminar cuenta', st_delete_msg: 'Eliminar la cuenta es irreversible. Para eliminarla, abre el soporte en la versión web.',
    st_open_support: 'Abrir soporte', st_pick_lang: 'Elegir idioma',
  },
  fr: {
    feed_empty: 'Aucune vidéo pour le moment.', feed_reprises: '🔄 Rediffusions virales',
    discover_title: 'Découvrir', discover_tags: 'Tendances', discover_empty: 'Aucune vidéo pour le moment.', discover_videos: 'vidéos',
    video_title: 'Vidéo', video_notfound: 'Vidéo introuvable',
    comments: 'Commentaires', comment_add: 'Ajouter un commentaire…', comment_first: 'Pas encore de commentaires. Soyez le premier !',
    follow: 'Suivre', following: 'Abonné', message: 'Message',
    notif_title: 'Notifications', notif_empty: 'Aucune notification pour le moment.',
    st_title: 'Paramètres', st_account: 'Compte', st_email: 'Email', st_email_none: 'Aucun email enregistré',
    st_password: 'Changer le mot de passe', st_via_web: 'Via la version web', st_content: 'Contenu',
    st_lang: 'Langue', st_push: 'Notifications push', st_soon: 'Bientôt', st_push_soon: 'Réglages push en développement',
    st_about: 'À propos', st_terms: "Conditions d'utilisation", st_privacy: 'Politique de confidentialité', st_support: 'Support',
    st_version: "Version de l'app", st_danger: 'Compte — danger', st_logout: 'Se déconnecter',
    st_logout_t: 'Déconnexion', st_sure: 'Êtes-vous sûr ?', st_cancel: 'Annuler',
    st_delete: 'Supprimer le compte', st_delete_msg: 'La suppression du compte est irréversible. Pour supprimer, ouvrez le support sur la version web.',
    st_open_support: 'Ouvrir le support', st_pick_lang: 'Choisir la langue',
  },
  de: {
    feed_empty: 'Noch keine Videos.', feed_reprises: '🔄 Virale Wiederholungen',
    discover_title: 'Entdecken', discover_tags: 'Im Trend', discover_empty: 'Noch keine Videos.', discover_videos: 'Videos',
    video_title: 'Video', video_notfound: 'Video nicht gefunden',
    comments: 'Kommentare', comment_add: 'Kommentar hinzufügen…', comment_first: 'Noch keine Kommentare. Sei der Erste!',
    follow: 'Folgen', following: 'Gefolgt', message: 'Nachricht',
    notif_title: 'Benachrichtigungen', notif_empty: 'Noch keine Benachrichtigungen.',
    st_title: 'Einstellungen', st_account: 'Konto', st_email: 'E-Mail', st_email_none: 'Keine E-Mail registriert',
    st_password: 'Passwort ändern', st_via_web: 'Über die Web-Version', st_content: 'Inhalt',
    st_lang: 'Sprache', st_push: 'Push-Benachrichtigungen', st_soon: 'Demnächst', st_push_soon: 'Push-Einstellungen in Entwicklung',
    st_about: 'Über', st_terms: 'Nutzungsbedingungen', st_privacy: 'Datenschutzrichtlinie', st_support: 'Support',
    st_version: 'App-Version', st_danger: 'Konto — Gefahrenzone', st_logout: 'Abmelden',
    st_logout_t: 'Abmelden', st_sure: 'Bist du sicher?', st_cancel: 'Abbrechen',
    st_delete: 'Konto löschen', st_delete_msg: 'Das Löschen des Kontos ist unwiderruflich. Öffne dafür den Support in der Web-Version.',
    st_open_support: 'Support öffnen', st_pick_lang: 'Sprache wählen',
  },
  it: {
    feed_empty: 'Ancora nessun video.', feed_reprises: '🔄 Repliche virali',
    discover_title: 'Scopri', discover_tags: 'Di tendenza', discover_empty: 'Ancora nessun video.', discover_videos: 'video',
    video_title: 'Video', video_notfound: 'Video non trovato',
    comments: 'Commenti', comment_add: 'Aggiungi un commento…', comment_first: 'Ancora nessun commento. Sii il primo!',
    follow: 'Segui', following: 'Segui già', message: 'Messaggio',
    notif_title: 'Notifiche', notif_empty: 'Ancora nessuna notifica.',
    st_title: 'Impostazioni', st_account: 'Account', st_email: 'Email', st_email_none: 'Nessuna email registrata',
    st_password: 'Cambia password', st_via_web: 'Tramite versione web', st_content: 'Contenuto',
    st_lang: 'Lingua', st_push: 'Notifiche push', st_soon: 'Presto', st_push_soon: 'Impostazioni push in sviluppo',
    st_about: 'Info', st_terms: "Termini d'uso", st_privacy: 'Informativa sulla privacy', st_support: 'Supporto',
    st_version: "Versione dell'app", st_danger: 'Account — zona pericolo', st_logout: 'Esci',
    st_logout_t: 'Esci', st_sure: 'Sei sicuro?', st_cancel: 'Annulla',
    st_delete: 'Elimina account', st_delete_msg: "L'eliminazione dell'account è irreversibile. Per eliminarlo, apri il supporto nella versione web.",
    st_open_support: 'Apri supporto', st_pick_lang: 'Scegli la lingua',
  },
  ja: {
    feed_empty: 'まだ動画がありません。', feed_reprises: '🔄 バイラル再放送',
    discover_title: '見つける', discover_tags: 'トレンド', discover_empty: 'まだ動画がありません。', discover_videos: '本',
    video_title: '動画', video_notfound: '動画が見つかりません',
    comments: 'コメント', comment_add: 'コメントを追加…', comment_first: 'まだコメントがありません。最初のコメントを！',
    follow: 'フォロー', following: 'フォロー中', message: 'メッセージ',
    notif_title: '通知', notif_empty: 'まだ通知がありません。',
    st_title: '設定', st_account: 'アカウント', st_email: 'メール', st_email_none: 'メール未登録',
    st_password: 'パスワード変更', st_via_web: 'ウェブ版で', st_content: 'コンテンツ',
    st_lang: '言語', st_push: 'プッシュ通知', st_soon: '近日公開', st_push_soon: 'プッシュ設定は開発中です',
    st_about: '情報', st_terms: '利用規約', st_privacy: 'プライバシーポリシー', st_support: 'サポート',
    st_version: 'アプリのバージョン', st_danger: 'アカウント — 危険', st_logout: 'ログアウト',
    st_logout_t: 'ログアウト', st_sure: '本当によろしいですか？', st_cancel: 'キャンセル',
    st_delete: 'アカウント削除', st_delete_msg: 'アカウントの削除は取り消せません。削除するにはウェブ版のサポートを開いてください。',
    st_open_support: 'サポートを開く', st_pick_lang: '言語を選択',
  },
};

export const useLangStore = create((set) => ({
  lang: 'pt',
  setLang: async (lang) => {
    if (!T[lang]) return;
    set({ lang });
    await SecureStore.setItemAsync('bt_lang', lang).catch(() => {});
  },
  init: async () => {
    try {
      const saved = await SecureStore.getItemAsync('bt_lang');
      if (saved && T[saved]) set({ lang: saved });
    } catch (_) {}
  },
}));

// Hook reativo: const t = useT(); t('feed_empty')
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (key) => (T[lang] && T[lang][key]) || T.pt[key] || key;
}
