// Ajuste do papel de parede da conversa (pedido do dono 06/08: "ficou muito
// desfocada; vamos deixar personalizável — zoom, posicionamento, do jeito dele").
//
// Abre logo depois de escolher a foto, com PRÉ-VISUALIZAÇÃO REAL: as mesmas
// bolhas de mensagem por cima, pra decidir olhando o resultado e não um
// número abstrato.
//
// Arrastar = posiciona · − / + = zoom · chips = desfoque e escurecimento.
// PanResponder em vez de gesture-handler: já é usado no VideoCard, não
// acrescenta dependência nativa e portanto sai por OTA.
import { useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, PanResponder, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { AJUSTE_PADRAO } from '../utils/wallpaper';

const BLURS = [
  { v: 0, nome: 'Nítida' },
  { v: 2, nome: 'Leve' },
  { v: 5, nome: 'Média' },
  { v: 9, nome: 'Forte' },
];
const ESCUROS = [
  { v: 0, nome: 'Sem véu' },
  { v: 0.28, nome: 'Leve' },
  { v: 0.45, nome: 'Médio' },
  { v: 0.6, nome: 'Escuro' },
];

export default function AjustarPapelParede({ visible, uri, inicial, onCancelar, onSalvar }) {
  const [aj, setAj] = useState(inicial || AJUSTE_PADRAO);
  // posição durante o arraste fica em ref (não re-renderiza a cada pixel)
  const base = useRef({ x: aj.x, y: aj.y });
  const [pos, setPos] = useState({ x: aj.x, y: aj.y });

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderMove: (_e, g) => {
        setPos({ x: base.current.x + g.dx, y: base.current.y + g.dy });
      },
      onPanResponderRelease: (_e, g) => {
        base.current = { x: base.current.x + g.dx, y: base.current.y + g.dy };
        setPos({ ...base.current });
      },
    })
  ).current;

  const zoomar = (delta) => {
    setAj((a) => ({ ...a, zoom: Math.min(3, Math.max(1, Math.round((a.zoom + delta) * 10) / 10)) }));
  };

  const salvar = () => onSalvar({ ...aj, x: pos.x, y: pos.y });

  const resetar = () => {
    setAj({ ...AJUSTE_PADRAO });
    base.current = { x: 0, y: 0 };
    setPos({ x: 0, y: 0 });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancelar}>
      <View style={styles.tela}>
        {/* preview ocupa a tela toda, com as bolhas por cima */}
        <View style={styles.preview} {...pan.panHandlers}>
          <Image
            source={{ uri }}
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: aj.zoom }] },
            ]}
            resizeMode="cover"
            blurRadius={aj.blur}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${aj.escuro})` }]} />

          <View style={styles.bolhas} pointerEvents="none">
            <View style={[styles.bolha, styles.bolhaOutro]}>
              <Text style={styles.txtOutro}>Assim ficam as mensagens dele</Text>
            </View>
            <View style={[styles.bolha, styles.bolhaMinha]}>
              <Text style={styles.txtMinha}>E assim ficam as suas 👌</Text>
            </View>
            <View style={[styles.bolha, styles.bolhaOutro]}>
              <Text style={styles.txtOutro}>Arraste a foto pra posicionar</Text>
            </View>
          </View>

          <View style={styles.dica} pointerEvents="none">
            <Ionicons name="move" size={14} color="#fff" />
            <Text style={styles.dicaTxt}>Arraste para posicionar</Text>
          </View>
        </View>

        {/* controles */}
        <View style={styles.painel}>
          <View style={styles.linhaZoom}>
            <Text style={styles.rotulo}>Zoom</Text>
            <View style={styles.zoomBtns}>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomar(-0.1)}>
                <Ionicons name="remove" size={18} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.zoomVal}>{aj.zoom.toFixed(1)}x</Text>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomar(0.1)}>
                <Ionicons name="add" size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.rotulo}>Desfoque</Text>
          <View style={styles.chips}>
            {BLURS.map((b) => (
              <TouchableOpacity
                key={b.v}
                style={[styles.chip, aj.blur === b.v && styles.chipOn]}
                onPress={() => setAj((a) => ({ ...a, blur: b.v }))}>
                <Text style={[styles.chipTxt, aj.blur === b.v && styles.chipTxtOn]}>{b.nome}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.rotulo}>Escurecer (ajuda a ler as mensagens)</Text>
          <View style={styles.chips}>
            {ESCUROS.map((e) => (
              <TouchableOpacity
                key={e.v}
                style={[styles.chip, aj.escuro === e.v && styles.chipOn]}
                onPress={() => setAj((a) => ({ ...a, escuro: e.v }))}>
                <Text style={[styles.chipTxt, aj.escuro === e.v && styles.chipTxtOn]}>{e.nome}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.acoes}>
            <TouchableOpacity style={styles.btnGhost} onPress={onCancelar}>
              <Text style={styles.btnGhostTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={resetar}>
              <Text style={styles.btnGhostTxt}>Padrão</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCta} onPress={salvar}>
              <Text style={styles.btnCtaTxt}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COLORS.background },
  preview: { flex: 1, overflow: 'hidden', backgroundColor: '#000' },
  bolhas: { position: 'absolute', left: 0, right: 0, bottom: 24, padding: 14, gap: 8 },
  bolha: { maxWidth: '78%', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14 },
  bolhaOutro: { alignSelf: 'flex-start', backgroundColor: COLORS.surface },
  bolhaMinha: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  txtOutro: { color: COLORS.text, fontSize: 13.5 },
  txtMinha: { color: '#fff', fontSize: 13.5 },
  dica: {
    position: 'absolute', top: 16, alignSelf: 'center', flexDirection: 'row',
    alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
  },
  dicaTxt: { color: '#fff', fontSize: 11.5, fontWeight: '600' },
  painel: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  rotulo: { color: COLORS.textSecondary, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 },
  linhaZoom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  zoomBtns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoomBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  zoomVal: { color: COLORS.text, fontSize: 13, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 7, marginBottom: 4 },
  chip: {
    flex: 1, paddingVertical: 8, borderRadius: 100, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipOn: { backgroundColor: COLORS.chipBg, borderColor: COLORS.neon },
  chipTxt: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTxtOn: { color: COLORS.neon, fontWeight: '800' },
  acoes: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btnGhost: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnGhostTxt: { color: COLORS.text, fontSize: 13.5, fontWeight: '700' },
  btnCta: { flex: 1.4, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary },
  btnCtaTxt: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
});
