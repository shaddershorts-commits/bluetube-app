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
  await FileSystem.deleteAsync(DIR + safeKey(key) + '.json', { idempotent: true }).catch(() => {});
}

// ── AJUSTES DA IMAGEM (06/08: "ficou muito desfocada, quero ajustar") ──────
// Desfoque, escurecimento, zoom e posição — por conversa, no aparelho.
// O padrão de desfoque caiu de 6 pra 2: 6 borrava demais, a foto virava
// mancha. 2 dá textura sem competir com o texto, e quem quiser mais aumenta.
export const AJUSTE_PADRAO = { blur: 2, escuro: 0.28, zoom: 1, x: 0, y: 0 };

const arqAjuste = (key) => DIR + safeKey(key) + '.json';

export async function getAjuste(key) {
  if (!safeKey(key)) return { ...AJUSTE_PADRAO };
  try {
    const info = await FileSystem.getInfoAsync(arqAjuste(key));
    if (!info.exists) return { ...AJUSTE_PADRAO };
    const txt = await FileSystem.readAsStringAsync(arqAjuste(key));
    const j = JSON.parse(txt);
    // sanitiza: valor fora da faixa vira o padrão, nunca quebra o render
    const num = (v, min, max, pad) => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : pad);
    return {
      blur: num(j.blur, 0, 12, AJUSTE_PADRAO.blur),
      escuro: num(j.escuro, 0, 0.75, AJUSTE_PADRAO.escuro),
      zoom: num(j.zoom, 1, 3, AJUSTE_PADRAO.zoom),
      x: num(j.x, -2000, 2000, 0),
      y: num(j.y, -2000, 2000, 0),
    };
  } catch { return { ...AJUSTE_PADRAO }; }
}

export async function setAjuste(key, ajuste) {
  if (!safeKey(key)) return;
  await ensureDir();
  try {
    await FileSystem.writeAsStringAsync(arqAjuste(key), JSON.stringify(ajuste || AJUSTE_PADRAO));
  } catch { /* ajuste é conforto: falhar aqui não pode derrubar o chat */ }
}
