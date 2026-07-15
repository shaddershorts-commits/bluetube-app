// EmojiPicker embutido (zero dependência — emoji é unicode puro).
// Listas separadas por espaço → split(' ') segmenta com segurança,
// inclusive emojis compostos (ZWJ). onPick(emoji) insere no input.
import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

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

export default function EmojiPicker({ onPick }) {
  const [cat, setCat] = useState(0);
  const emojis = CATS[cat].list.split(' ').filter(Boolean);

  return (
    <View style={styles.wrap}>
      <View style={styles.tabs}>
        {CATS.map((c, i) => (
          <TouchableOpacity key={c.name} style={[styles.tab, i === cat && styles.tabActive]} onPress={() => setCat(i)}>
            <Text style={styles.tabIcon}>{c.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={emojis}
        keyExtractor={(e, i) => e + i}
        numColumns={8}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.cell} onPress={() => onPick(item)}>
            <Text style={styles.emoji}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 280, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { padding: 6, borderRadius: 8 },
  tabActive: { backgroundColor: 'rgba(0,170,255,0.15)' },
  tabIcon: { fontSize: 18 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  emoji: { fontSize: 26 },
});
