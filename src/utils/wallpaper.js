// Papel de parede da conversa (BlueChat) — igual ao WhatsApp: a escolha é
// DE CADA UM e DE CADA CONVERSA. Fica só no aparelho (nada sobe pro servidor),
// então o que eu escolho não muda o fundo do outro lado da conversa.
//
// Guardado como arquivo em documentDirectory/wallpapers/. O nome carrega um
// timestamp (`<chave>__<ts>.jpg`) porque o <Image> do RN cacheia por URI:
// reescrever o mesmo caminho manteria a imagem antiga na tela. Ao salvar uma
// nova, as antigas daquela conversa são apagadas.
import * as FileSystem from 'expo-file-system';

const DIR = FileSystem.documentDirectory + 'wallpapers/';

// conv_id é UUID e grupo vira 'g_<id>' — sanitiza mesmo assim.
const safeKey = (key) => String(key || '').replace(/[^a-zA-Z0-9_-]/g, '');

export const wallpaperKey = ({ grupoId, convId }) =>
  (grupoId ? 'g_' + grupoId : convId ? 'c_' + convId : '');

async function ensureDir() {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  } catch (e) { /* fail-soft: sem papel de parede o chat funciona igual */ }
}

async function listarDaConversa(key) {
  const k = safeKey(key);
  if (!k) return [];
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) return [];
    const files = await FileSystem.readDirectoryAsync(DIR);
    return files
      .filter((f) => f.startsWith(k + '__'))
      .sort() // timestamp no nome => ordem alfabética == ordem cronológica
      .map((f) => DIR + f);
  } catch (e) { return []; }
}

// URI do papel de parede atual, ou null.
export async function getWallpaper(key) {
  const arquivos = await listarDaConversa(key);
  if (!arquivos.length) return null;
  return arquivos[arquivos.length - 1];
}

// Copia a imagem escolhida pra pasta do app e limpa as versões anteriores.
export async function setWallpaper(key, srcUri) {
  const k = safeKey(key);
  if (!k || !srcUri) return null;
  await ensureDir();
  const antigos = await listarDaConversa(k);
  const destino = DIR + k + '__' + Date.now() + '.jpg';
  await FileSystem.copyAsync({ from: srcUri, to: destino });
  await Promise.all(
    antigos.map((f) => FileSystem.deleteAsync(f, { idempotent: true }).catch(() => {}))
  );
  return destino;
}

export async function removeWallpaper(key) {
  const arquivos = await listarDaConversa(key);
  await Promise.all(
    arquivos.map((f) => FileSystem.deleteAsync(f, { idempotent: true }).catch(() => {}))
  );
}
