// StoryEditorScreen — editor de story estilo Instagram (Fase 1).
//
// Abre DEPOIS de escolher/gravar a mídia (foto ou vídeo). O usuário coloca
// camadas POR CIMA (texto, figurinha/emoji, menção @, desenho) e um filtro de
// COR. Nada é "chapado" na imagem: as camadas viajam como metadados (overlays)
// e o viewer redesenha — assim menção/link continuam clicáveis. Posições são
// salvas em FRAÇÃO da tela (0..1) pra ficar igual em qualquer aparelho.
//
// Botões desta fase: Texto · Figurinhas(emoji) · Som(mudo do vídeo) ·
// Mencionar · Desenhar · Efeitos(filtro de cor) · Mais. Áudio(música) e GIF
// entram na Fase 2. Carinhas AR ficaram de fora (decisão do dono: filtros de
// cor por enquanto).
import { useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Animated,
  PanResponder, useWindowDimensions, ScrollView, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import Svg, { Polyline } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import blueAPI from '../api';
import { COLORS_DARK as COLORS } from '../constants';

// Filtros de COR (tints). O viewer reaplica o mesmo id → mesma cor por cima.
// Nada de P&B/AR aqui (precisaria de GL/Skia — decisão: cor por enquanto).
const FILTROS = [
  { id: null, nome: 'Normal', cor: 'transparent' },
  { id: 'quente', nome: 'Quente', cor: 'rgba(255,150,40,0.20)' },
  { id: 'frio', nome: 'Frio', cor: 'rgba(50,130,255,0.20)' },
  { id: 'vintage', nome: 'Vintage', cor: 'rgba(120,80,30,0.26)' },
  { id: 'rosa', nome: 'Rosa', cor: 'rgba(255,90,150,0.20)' },
  { id: 'desbotado', nome: 'Desbotado', cor: 'rgba(255,255,255,0.16)' },
  { id: 'noite', nome: 'Noite', cor: 'rgba(10,20,60,0.34)' },
];
const CORES_TEXTO = ['#ffffff', '#000000', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#a855f7'];
const TAMANHOS = [22, 30, 40, 54];
const EMOJIS = ['😂','🥰','😍','🔥','❤️','👍','😎','🥺','😭','🎉','✨','💯','🙌','😅','🤣','😊','💪','🤝','🚀','👀','🫶','😏','🥳','😮','🤔','👏','💥','⭐','🌈','☀️'];

// Camada arrastável genérica (texto/emoji/menção). Cada uma cuida do próprio
// arraste via PanResponder + Animated (não re-renderiza a lista a cada frame).
function Camada({ layer, W, H, selecionada, onSelecionar, onMover, onApagar, children }) {
  const px0 = layer.x * W, py0 = layer.y * H;
  const pan = useRef(new Animated.ValueXY({ x: px0, y: py0 })).current;
  const base = useRef({ x: px0, y: py0 });
  const resp = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
    onPanResponderGrant: () => onSelecionar(layer.id),
    onPanResponderMove: (e, g) => pan.setValue({ x: base.current.x + g.dx, y: base.current.y + g.dy }),
    onPanResponderRelease: (e, g) => {
      base.current = { x: base.current.x + g.dx, y: base.current.y + g.dy };
      pan.setValue(base.current);
      onMover(layer.id, base.current.x / W, base.current.y / H);
    },
  })).current;
  return (
    <Animated.View
      style={[styles.camada, { transform: pan.getTranslateTransform() }, selecionada && styles.camadaSel]}
      {...resp.panHandlers}>
      {children}
      {selecionada ? (
        <TouchableOpacity style={styles.apagar} onPress={() => onApagar(layer.id)} hitSlop={10}>
          <Ionicons name="close" size={14} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

export default function StoryEditorScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  // params: { uri, tipo:'imagem'|'video', mime }
  const { uri, tipo = 'imagem', mime } = route.params || {};
  const isVideo = tipo === 'video';

  const [overlays, setOverlays] = useState([]); // camadas
  const [selId, setSelId] = useState(null);
  const [filtro, setFiltro] = useState(null);
  const [somOff, setSomOff] = useState(false);   // mudo do vídeo
  const [legenda, setLegenda] = useState('');
  const [audiencia, setAudiencia] = useState('stories'); // 'stories' | 'status'
  const [enviando, setEnviando] = useState(false);

  // painel ativo do rail: null | 'texto' | 'figurinhas' | 'mencao' | 'desenho' | 'efeitos'
  const [painel, setPainel] = useState(null);
  // edição de texto
  const [txtEdit, setTxtEdit] = useState(null); // {id?, texto, cor, tamanho}
  // busca de menção
  const [mencaoQ, setMencaoQ] = useState('');
  const [mencaoRes, setMencaoRes] = useState([]);
  // desenho em andamento
  const [desenhando, setDesenhando] = useState(false);
  const tracoRef = useRef([]);            // pontos do traço atual (px)
  const [tracoAtual, setTracoAtual] = useState([]);
  const [corTraco, setCorTraco] = useState('#ffffff');

  const novoId = () => 'ov_' + Date.now() + '_' + Math.round(Math.random() * 1e4);

  const addOverlay = (o) => setOverlays((l) => [...l, { id: novoId(), x: 0.5, y: 0.45, ...o }]);
  const moverOverlay = useCallback((id, x, y) => {
    setOverlays((l) => l.map((o) => (o.id === id ? { ...o, x, y } : o)));
  }, []);
  const apagarOverlay = useCallback((id) => {
    setOverlays((l) => l.filter((o) => o.id !== id));
    setSelId(null);
  }, []);

  // ── TEXTO ────────────────────────────────────────────────────────────────
  const abrirTexto = (existente) => {
    if (existente) setTxtEdit({ id: existente.id, texto: existente.texto, cor: existente.cor, tamanho: existente.tamanho });
    else setTxtEdit({ texto: '', cor: '#ffffff', tamanho: 30 });
    setPainel(null);
  };
  const salvarTexto = () => {
    const t = txtEdit;
    if (!t || !t.texto.trim()) { setTxtEdit(null); return; }
    if (t.id) setOverlays((l) => l.map((o) => (o.id === t.id ? { ...o, texto: t.texto, cor: t.cor, tamanho: t.tamanho } : o)));
    else addOverlay({ tipo: 'texto', texto: t.texto, cor: t.cor, tamanho: t.tamanho });
    setTxtEdit(null);
  };

  // ── MENÇÃO ───────────────────────────────────────────────────────────────
  const buscarMencao = async (q) => {
    setMencaoQ(q);
    if (!q || q.length < 2) { setMencaoRes([]); return; }
    try {
      const d = typeof blueAPI.buscarUsuarios === 'function' ? await blueAPI.buscarUsuarios(q) : null;
      const arr = (d && (d.users || d.usuarios || d.resultados)) || [];
      setMencaoRes(arr.slice(0, 12));
    } catch (e) { setMencaoRes([]); }
  };
  const addMencao = (u) => {
    addOverlay({ tipo: 'mencao', username: u.username || u.display_name, user_id: u.user_id });
    setPainel(null); setMencaoQ(''); setMencaoRes([]);
  };

  // ── DESENHO ──────────────────────────────────────────────────────────────
  const desenhoPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { tracoRef.current = [[e.nativeEvent.locationX, e.nativeEvent.locationY]]; setTracoAtual(tracoRef.current); },
    onPanResponderMove: (e) => {
      tracoRef.current = [...tracoRef.current, [e.nativeEvent.locationX, e.nativeEvent.locationY]];
      setTracoAtual([...tracoRef.current]);
    },
    onPanResponderRelease: () => {
      if (tracoRef.current.length > 1) {
        // guarda pontos em fração da tela
        const pts = tracoRef.current.map(([x, y]) => [x / W, y / H]);
        setOverlays((l) => [...l, { id: novoId(), tipo: 'desenho', pontos: pts, cor_traco: corTraco, largura: 4, x: 0, y: 0 }]);
      }
      tracoRef.current = []; setTracoAtual([]);
    },
  })).current;

  // ── ENVIAR ───────────────────────────────────────────────────────────────
  const enviar = async () => {
    if (!uri) { Alert.alert('Erro', 'Sem mídia pra publicar.'); return; }
    setEnviando(true);
    try {
      const r = await blueAPI.storyCriar(uri, {
        tipo: isVideo ? 'video' : 'imagem',
        mime: mime || (isVideo ? 'video/mp4' : 'image/jpeg'),
        audience: audiencia,
        overlays,
        filtro,
        legenda: legenda.trim() || null,
        som_off: isVideo ? somOff : undefined,
      });
      if (r?.ok || r?.story) {
        nav.goBack();
        setTimeout(() => Alert.alert('✓ Story publicado!', audiencia === 'status'
          ? 'Só seus contatos veem. Some em 24h.'
          : 'Vai pro seu perfil por 24 horas.'), 250);
      } else {
        Alert.alert('Erro', r?.error || 'Não deu pra publicar. Tenta de novo.');
      }
    } catch (e) {
      Alert.alert('Erro', e.message || 'Falha ao publicar.');
    }
    setEnviando(false);
  };

  const filtroCor = FILTROS.find((f) => f.id === filtro)?.cor || 'transparent';

  const RAIL = [
    { key: 'texto', icon: 'text', label: 'Texto', on: () => abrirTexto(null) },
    { key: 'figurinhas', icon: 'happy-outline', label: 'Figurinhas', on: () => setPainel(painel === 'figurinhas' ? null : 'figurinhas') },
    { key: 'mencao', icon: 'at', label: 'Mencionar', on: () => setPainel(painel === 'mencao' ? null : 'mencao') },
    { key: 'desenho', icon: 'brush', label: 'Desenhar', on: () => setDesenhando((v) => !v) },
    { key: 'efeitos', icon: 'color-filter-outline', label: 'Efeitos', on: () => setPainel(painel === 'efeitos' ? null : 'efeitos') },
    ...(isVideo ? [{ key: 'som', icon: somOff ? 'volume-mute' : 'volume-high', label: 'Som', on: () => setSomOff((v) => !v) }] : []),
  ];

  return (
    <View style={styles.root}>
      {/* MÍDIA */}
      <View style={StyleSheet.absoluteFill}>
        {isVideo ? (
          <Video source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted={somOff} />
        ) : (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        {/* filtro de cor */}
        {filtroCor !== 'transparent' ? <View style={[StyleSheet.absoluteFill, { backgroundColor: filtroCor }]} pointerEvents="none" /> : null}
      </View>

      {/* DESENHOS já confirmados */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {overlays.filter((o) => o.tipo === 'desenho').map((o) => (
          <Polyline key={o.id} points={o.pontos.map(([x, y]) => `${x * W},${y * H}`).join(' ')} fill="none" stroke={o.cor_traco} strokeWidth={o.largura} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {tracoAtual.length > 1 ? (
          <Polyline points={tracoAtual.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={corTraco} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
      </Svg>

      {/* CAMADAS arrastáveis (texto/emoji/menção) */}
      {!desenhando && overlays.filter((o) => o.tipo !== 'desenho').map((o) => (
        <Camada key={o.id} layer={o} W={W} H={H} selecionada={selId === o.id}
          onSelecionar={setSelId} onMover={moverOverlay} onApagar={apagarOverlay}>
          {o.tipo === 'texto' ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => { setSelId(o.id); abrirTexto(o); }}>
              <Text style={{ color: o.cor, fontSize: o.tamanho, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } }}>{o.texto}</Text>
            </TouchableOpacity>
          ) : o.tipo === 'sticker' ? (
            <Text style={{ fontSize: 56 }}>{o.emoji}</Text>
          ) : o.tipo === 'mencao' ? (
            <View style={styles.mencaoChip}><Text style={styles.mencaoTxt}>@{o.username}</Text></View>
          ) : null}
        </Camada>
      ))}

      {/* camada de captura do desenho (por cima, só no modo desenhar) */}
      {desenhando ? <View style={StyleSheet.absoluteFill} {...desenhoPan.panHandlers} /> : null}

      {/* TOPO: fechar + (no desenho) cores + concluir */}
      <View style={[styles.topbar, { top: insets.top + 6 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.topBtn} onPress={() => (desenhando ? setDesenhando(false) : nav.goBack())}>
          <Ionicons name={desenhando ? 'checkmark' : 'close'} size={24} color="#fff" />
        </TouchableOpacity>
        {desenhando ? (
          <View style={styles.corRow}>
            {CORES_TEXTO.map((c) => (
              <TouchableOpacity key={c} onPress={() => setCorTraco(c)} style={[styles.corDot, { backgroundColor: c }, corTraco === c && styles.corDotOn]} />
            ))}
          </View>
        ) : null}
      </View>

      {/* RAIL de botões (direita) — só quando não está desenhando */}
      {!desenhando ? (
        <View style={[styles.rail, { top: insets.top + 60 }]}>
          {RAIL.map((b) => (
            <TouchableOpacity key={b.key} style={styles.railBtn} onPress={b.on}>
              <Text style={styles.railLbl}>{b.label}</Text>
              <View style={styles.railIco}><Ionicons name={b.icon} size={20} color="#fff" /></View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* PAINEL Figurinhas (emoji) */}
      {painel === 'figurinhas' ? (
        <View style={[styles.painel, { bottom: insets.bottom + 90 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 4 }}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => { addOverlay({ tipo: 'sticker', emoji: e }); setPainel(null); }} style={styles.emojiBtn}>
                <Text style={{ fontSize: 30 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.painelHint}>Figurinhas em GIF chegam em breve</Text>
        </View>
      ) : null}

      {/* PAINEL Efeitos (filtros de cor) */}
      {painel === 'efeitos' ? (
        <View style={[styles.painel, { bottom: insets.bottom + 90 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 8 }}>
            {FILTROS.map((f) => (
              <TouchableOpacity key={f.nome} onPress={() => { setFiltro(f.id); }} style={[styles.filtroBtn, filtro === f.id && styles.filtroOn]}>
                <View style={[styles.filtroSwatch, { backgroundColor: f.cor === 'transparent' ? '#444' : f.cor }]} />
                <Text style={styles.filtroLbl}>{f.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* PAINEL Menção (busca) */}
      {painel === 'mencao' ? (
        <View style={[styles.painelMencao, { bottom: insets.bottom + 90 }]}>
          <TextInput
            style={styles.mencaoInput} placeholder="Buscar @usuário" placeholderTextColor="#888"
            value={mencaoQ} onChangeText={buscarMencao} autoFocus autoCapitalize="none" />
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
            {mencaoRes.map((u) => (
              <TouchableOpacity key={u.user_id} style={styles.mencaoItem} onPress={() => addMencao(u)}>
                <Text style={styles.mencaoItemTxt}>@{u.username || u.display_name}</Text>
              </TouchableOpacity>
            ))}
            {mencaoQ.length >= 2 && !mencaoRes.length ? <Text style={styles.painelHint}>Ninguém encontrado</Text> : null}
          </ScrollView>
        </View>
      ) : null}

      {/* RODAPÉ: legenda + audiência + enviar (escondido no desenho) */}
      {!desenhando ? (
        <View style={[styles.rodape, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
          <TextInput
            style={styles.legenda} placeholder="Adicione uma legenda…" placeholderTextColor="rgba(255,255,255,0.7)"
            value={legenda} onChangeText={setLegenda} />
          <View style={styles.rodapeRow}>
            <TouchableOpacity style={[styles.audBtn, audiencia === 'stories' && styles.audOn]} onPress={() => setAudiencia('stories')}>
              <Ionicons name="globe-outline" size={15} color="#fff" />
              <Text style={styles.audTxt}>Seu story</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.audBtn, audiencia === 'status' && styles.audOn]} onPress={() => setAudiencia('status')}>
              <Ionicons name="star" size={14} color="#22c55e" />
              <Text style={styles.audTxt}>Amigos Próximos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.enviar} onPress={enviar} disabled={enviando}>
              {enviando ? <ActivityIndicator color="#fff" /> : <Ionicons name="arrow-forward" size={24} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* MODAL edição de texto */}
      <Modal visible={!!txtEdit} transparent animationType="fade" onRequestClose={() => setTxtEdit(null)}>
        <View style={styles.txtModal}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={salvarTexto} />
          <TextInput
            style={[styles.txtInput, { color: txtEdit?.cor, fontSize: txtEdit?.tamanho }]}
            value={txtEdit?.texto} onChangeText={(t) => setTxtEdit((s) => ({ ...s, texto: t }))}
            placeholder="Digite…" placeholderTextColor="rgba(255,255,255,0.5)" autoFocus multiline />
          <View style={styles.txtCtrls}>
            <View style={styles.corRow}>
              {CORES_TEXTO.map((c) => (
                <TouchableOpacity key={c} onPress={() => setTxtEdit((s) => ({ ...s, cor: c }))} style={[styles.corDot, { backgroundColor: c }, txtEdit?.cor === c && styles.corDotOn]} />
              ))}
            </View>
            <View style={styles.tamRow}>
              {TAMANHOS.map((t) => (
                <TouchableOpacity key={t} onPress={() => setTxtEdit((s) => ({ ...s, tamanho: t }))} style={[styles.tamBtn, txtEdit?.tamanho === t && styles.tamOn]}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>A</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.txtOk} onPress={salvarTexto}><Text style={styles.txtOkTxt}>OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camada: { position: 'absolute', left: 0, top: 0, padding: 6 },
  camadaSel: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed', borderRadius: 8 },
  apagar: { position: 'absolute', top: -10, right: -10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  mencaoChip: { backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  mencaoTxt: { color: '#fff', fontSize: 22, fontWeight: '800' },
  topbar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  topBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', right: 8, gap: 14 },
  railBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end' },
  railLbl: { color: '#fff', fontSize: 13, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  railIco: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  painel: { position: 'absolute', left: 0, right: 0, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.55)' },
  painelHint: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center', marginTop: 8 },
  emojiBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  filtroBtn: { alignItems: 'center', gap: 5, opacity: 0.7 },
  filtroOn: { opacity: 1 },
  filtroSwatch: { width: 46, height: 46, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  filtroLbl: { color: '#fff', fontSize: 11, fontWeight: '600' },
  painelMencao: { position: 'absolute', left: 12, right: 12, backgroundColor: 'rgba(10,15,28,0.96)', borderRadius: 14, padding: 10 },
  mencaoInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 15 },
  mencaoItem: { paddingVertical: 11, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  mencaoItemTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  legenda: { color: '#fff', fontSize: 15, paddingVertical: 10, paddingHorizontal: 4 },
  rodapeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'transparent' },
  audOn: { borderColor: COLORS.neon, backgroundColor: 'rgba(0,0,0,0.7)' },
  audTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  enviar: { marginLeft: 'auto', width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.neon, alignItems: 'center', justifyContent: 'center' },
  corRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  corDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  corDotOn: { borderColor: '#fff', borderWidth: 3 },
  txtModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 },
  txtInput: { fontWeight: '800', textAlign: 'center', minHeight: 60 },
  txtCtrls: { position: 'absolute', bottom: 40, left: 16, right: 16, gap: 14, alignItems: 'center' },
  tamRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  tamBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  tamOn: { backgroundColor: COLORS.neon },
  txtOk: { backgroundColor: COLORS.neon, borderRadius: 100, paddingHorizontal: 30, paddingVertical: 10 },
  txtOkTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
