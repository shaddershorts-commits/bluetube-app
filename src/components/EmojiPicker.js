// EmojiPicker — painel com abas estilo WhatsApp: Emojis / GIFs / Figurinhas.
// Props:
//   onPick(emoji)  → insere emoji no input (compat)
//   onGif(url)     → envia um GIF (chat) ou insere [gif]url (comentário)
//   mode           → 'chat' (3 abas: emoji/gif/figurinha) | 'comment' (emoji/gif)
// Sem GIPHY configurado, a aba GIF mostra aviso; emojis sempre funcionam.
import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { blueAPI } from '../api';

const CATS = [
  { icon: '😀', name: 'Carinhas', list: '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 🤡 💩 👻 💀 👽 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾' },
  { icon: '👍', name: 'Gestos', list: '👍 👎 👊 ✊ 🤛 🤜 🤞 ✌️ 🤟 🤘 👌 🤌 🤏 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐 🖖 👋 🤙 💪 🙏 🤝 👏 🙌 👐 🤲 ✍️ 💅 🤳 🫶 🫡' },
  { icon: '❤️', name: 'Corações', list: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 💕 💞 💓 💗 💖 💘 💝 💟 💯 💢 💥 💫 💦 💤 ✨ ⭐ 🌟 🔥 🎉 🎊 🎈 🎁' },
  { icon: '🐶', name: 'Animais', list: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦛 🐪 🐫 🦒 🦘 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🦚 🦜 🦢 🐇 🦝 🦨 🦦 🦥 🐿️' },
  { icon: '🍕', name: 'Comida', list: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🌽 🥕 🧄 🧅 🥔 🍠 🥐 🍞 🥖 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🥪 🌮 🌯 🥙 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾' },
  { icon: '⚽', name: 'Esportes', list: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🏓 🏸 🏒 🏑 🥍 🏏 🥅 ⛳ 🏹 🎣 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 🏂 🏋️ 🤸 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🎫 🎪 🤹 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 🎯 🎳 🎮 🎰 🧩' },
  { icon: '🚗', name: 'Viagem', list: '🚗 🚕 🚙 🚌 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🛴 🚲 🛵 🏍️ 🚨 🚔 🚖 🚡 🚠 🚃 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🏠 🏡 🏢 🏬 🏥 🏦 🏨 🏪 🏫 💒 ⛪ 🕌 🕍 ⛩️ 🌁 🌃 🌄 🌅 🌆 🌇 🌉 🌌' },
  { icon: '💡', name: 'Objetos', list: '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🕹️ 💽 💾 💿 📀 📷 📸 📹 🎥 📞 ☎️ 📺 📻 🎙️ 🧭 ⏰ ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯️ 💸 💵 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚙️ 🧲 💣 🔪 🛡️ 🔮 🧿 🔭 🔬 💊 💉 🧬 🦠 🧪 🌡️ 🧹 🧺 🧻 🚿 🛁 🧼 🧽 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🧸 🖼️ 🛍️ 🛒 🎁 🎀 🎊 🎉 🎏 🎐 🧧 ✉️ 📩 📨 📧 💌 📦 🏷️ 📪 📫 📬 📜 📃 📄 📊 📈 📉 📅 🗑️ 📋 📁 📂 📰 📓 📕 📗 📘 📙 📚 📖 🔖 📎 📐 📏 📌 📍 ✂️ 🖊️ ✒️ 🖌️ 🖍️ 📝 ✏️ 🔍 🔒 🔓' },
  { icon: '🔣', name: 'Símbolos', list: '💬 💭 ❗ ❓ ‼️ ⁉️ ✅ ❌ ⭕ 🛑 ⛔ 🚫 💠 ♻️ 🔱 📶 🔅 🔆 ⚠️ 🚸 🔰 ➕ ➖ ➗ ✖️ 💲 ™️ ©️ ®️ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫 🌈 ☀️ ⛅ ☁️ 🌧️ ⛈️ ❄️ ⛄ 💨 🌪️ 🌊 💧 ☔ 🎵 🎶 ♨️ 🔞 📵 🔕 🔇' },
];

export default function EmojiPicker({ onPick, onGif, mode = 'comment' }) {
  const [tab, setTab] = useState('emoji'); // emoji | gif | sticker
  const [cat, setCat] = useState(0);
  const emojis = CATS[cat].list.split(' ').filter(Boolean);

  // GIFs
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifDisabled, setGifDisabled] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Figurinhas
  const [stickers, setStickers] = useState([]);
  const [stickersLoaded, setStickersLoaded] = useState(false);

  const doSearch = useCallback(async (q) => {
    setGifLoading(true);
    const d = await blueAPI.gifSearch(q).catch(() => ({}));
    setGifLoading(false);
    if (d?.disabled) { setGifDisabled(true); setGifs([]); return; }
    setGifDisabled(false);
    setGifs(d?.gifs || []);
  }, []);

  useEffect(() => { if (tab === 'gif' && gifs.length === 0 && !gifDisabled) doSearch(''); }, [tab]);
  useEffect(() => {
    if (tab === 'sticker' && !stickersLoaded) {
      blueAPI.stickers().then((d) => { setStickers(d?.stickers || []); setStickersLoaded(true); }).catch(() => setStickersLoaded(true));
    }
  }, [tab]);

  const saveSticker = async (url) => {
    if (stickers.includes(url)) return;
    await blueAPI.saveSticker(url).catch(() => {});
    setStickers((s) => [url, ...s]);
    setSavedMsg('⭐ Salvo nas figurinhas!');
    setTimeout(() => setSavedMsg(''), 1600);
  };
  const removeSticker = async (url) => {
    await blueAPI.delSticker(url).catch(() => {});
    setStickers((s) => s.filter((u) => u !== url));
  };

  const TABS = mode === 'chat'
    ? [['emoji', 'happy-outline'], ['gif', 'GIF'], ['sticker', 'star-outline']]
    : [['emoji', 'happy-outline'], ['gif', 'GIF']];

  return (
    <View style={styles.wrap}>
      {/* Conteúdo da aba */}
      {tab === 'emoji' && (
        <>
          <View style={styles.catRow}>
            {CATS.map((c, i) => (
              <TouchableOpacity key={c.name} style={[styles.catTab, i === cat && styles.catTabActive]} onPress={() => setCat(i)}>
                <Text style={styles.catIcon}>{c.icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={emojis} keyExtractor={(e, i) => e + i} numColumns={8}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.cell} onPress={() => onPick && onPick(item)}>
                <Text style={styles.emoji}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}

      {tab === 'gif' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={COLORS.textDim} style={{ marginLeft: 10 }} />
            <TextInput
              style={styles.searchInput} placeholder="Buscar GIF…" placeholderTextColor={COLORS.textDim}
              value={gifQuery} onChangeText={setGifQuery} returnKeyType="search"
              onSubmitEditing={() => doSearch(gifQuery)} autoCorrect={false}
            />
            {gifQuery ? (
              <TouchableOpacity onPress={() => { setGifQuery(''); doSearch(''); }} hitSlop={10} style={{ paddingHorizontal: 8 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textDim} />
              </TouchableOpacity>
            ) : null}
          </View>
          {savedMsg ? <Text style={styles.savedMsg}>{savedMsg}</Text> : null}
          {gifDisabled ? (
            <View style={styles.center}><Text style={styles.hint}>🎞️ GIFs chegando em breve.</Text></View>
          ) : gifLoading ? (
            <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>
          ) : (
            <FlatList
              data={gifs} keyExtractor={(g, i) => g.url + i} numColumns={3}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.hint}>Nenhum GIF encontrado.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.gifCell} onPress={() => onGif && onGif(item.url)} onLongPress={() => saveSticker(item.url)} delayLongPress={280}>
                  <Image source={{ uri: item.preview }} style={styles.gifImg} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />
          )}
          {!gifDisabled ? <Text style={styles.tip}>Toque pra enviar · segure pra salvar como figurinha ⭐</Text> : null}
        </View>
      )}

      {tab === 'sticker' && (
        <View style={{ flex: 1 }}>
          {!stickersLoaded ? (
            <View style={styles.center}><ActivityIndicator color={COLORS.neon} /></View>
          ) : stickers.length === 0 ? (
            <View style={styles.center}><Text style={styles.hint}>Nenhuma figurinha salva ainda.{'\n'}Na aba GIF, segure um GIF pra salvar ⭐</Text></View>
          ) : (
            <FlatList
              data={stickers} keyExtractor={(u, i) => u + i} numColumns={3}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.gifCell} onPress={() => onGif && onGif(item)} onLongPress={() => removeSticker(item)} delayLongPress={350}>
                  <Image source={{ uri: item }} style={styles.gifImg} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />
          )}
          {stickers.length > 0 ? <Text style={styles.tip}>Toque pra enviar · segure pra remover</Text> : null}
        </View>
      )}

      {/* Abas de baixo (emoji / gif / figurinha) */}
      <View style={styles.bottomTabs}>
        {TABS.map(([key, icon]) => (
          <TouchableOpacity key={key} style={[styles.bTab, tab === key && styles.bTabActive]} onPress={() => setTab(key)}>
            {icon === 'GIF'
              ? <Text style={[styles.gifLabel, tab === key && styles.gifLabelActive]}>GIF</Text>
              : <Ionicons name={icon} size={22} color={tab === key ? COLORS.neon : COLORS.textDim} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 320, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  catRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catTab: { padding: 6, borderRadius: 8 },
  catTabActive: { backgroundColor: 'rgba(0,170,255,0.15)' },
  catIcon: { fontSize: 18 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  emoji: { fontSize: 26 },
  searchRow: { flexDirection: 'row', alignItems: 'center', margin: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 9, paddingHorizontal: 8 },
  gifCell: { flex: 1 / 3, aspectRatio: 1, padding: 3 },
  gifImg: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  hint: { color: COLORS.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  tip: { color: COLORS.textDim, fontSize: 10.5, textAlign: 'center', paddingVertical: 4 },
  savedMsg: { color: COLORS.neon, fontSize: 12, textAlign: 'center', paddingBottom: 4 },
  bottomTabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  bTab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  bTabActive: { backgroundColor: 'rgba(0,170,255,0.1)' },
  gifLabel: { color: COLORS.textDim, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  gifLabelActive: { color: COLORS.neon },
});
