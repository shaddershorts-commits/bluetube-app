import { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Animated, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store';
import { COLORS, API_BASE } from '../constants';
import blueAPI from '../api';

const NICHOS = [
    'Musica','Danca','Humor','Beleza','Moda','Fitness',
    'Culinaria','Viagem','Games','Tech','Arte','Educacao',
    'Esporte','Pet','Lifestyle','Motivacao',
  ];
const TOTAL_STEPS = 6;

function ProgressBar({ step }) {
    return (
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 28, marginTop: 8 }}>
{Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={{
                                                   flex: 1, height: 3, borderRadius: 2,
                      backgroundColor: i < step ? COLORS.accent : 'rgba(0,170,255,0.15)',
          }} />
      ))}
</View>
  );
}

function Confetti({ visible }) {
    const particles = useRef(
          Array.from({ length: 18 }, (_, i) => ({
                  x: (i / 18),
                  y: new Animated.Value(0),
                  opacity: new Animated.Value(1),
                  color: ['#00aaff','#1a6bff','#22c55e','#FFD700','#f59e0b'][i % 5],
          }))
        ).current;

  useEffect(() => {
        if (!visible) return;
        const anims = particles.map(p => {
                p.y.setValue(0); p.opacity.setValue(1);
                return Animated.parallel([
                          Animated.timing(p.y, { toValue: 1, duration: 1800, useNativeDriver: true }),
                          Animated.timing(p.opacity, { toValue: 0, duration: 1800, delay: 500, useNativeDriver: true }),
                        ]);
        });
        Animated.stagger(50, anims).start();
  }, [visible]);

  if (!visible) return null;
    return (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
{particles.map((p, i) => (
          <Animated.View key={i} style={{
                         position: 'absolute', left: `${p.x * 100}%`,
                      width: 8, height: 8, borderRadius: 4, backgroundColor: p.color,
                      opacity: p.opacity,
                      transform: [{ translateY: p.y.interpolate({ inputRange: [0, 1], outputRange: [-10, 580] }) }],
          }} />
                     ))}
</View>
  );
}

export default function SetupPerfilScreen({ navigation }) {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState(null);
    const [nome, setNome] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState(null);
    const [nichosSel, setNichosSel] = useState([]);
    const [sugestoes, setSugestoes] = useState([]);
    const [seguindo, setSeguindo] = useState(new Set());
    const [loadingSug, setLoadingSug] = useState(false);
    const [notifOk, setNotifOk] = useState(false);
    const [loading, setLoading] = useState(false);
    const [confetti, setConfetti] = useState(false);
    const debounceRef = useRef(null);

  useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (username.length < 3) { setUsernameStatus(null); return; }
        if (!/^[a-z0-9_.]{3,30}$/.test(username)) { setUsernameStatus('invalid'); return; }
        setUsernameStatus('checking');
        debounceRef.current = setTimeout(async () => {
                try {
                          // TODO: blue-profile.js precisa ter action=check-username
                  const r = await fetch(`${API_BASE}/blue-profile?action=check-username&username=${encodeURIComponent(username)}`);
                          const d = await r.json().catch(() => ({}));
                          if (d.available === false || d.exists === true) setUsernameStatus('taken');
                          else setUsernameStatus('ok');
                } catch { setUsernameStatus('ok'); }
        }, 500);
  }, [username]);

  const pickImage = async (src) => {
        try {
                let result;
                if (src === 'camera') {
                          const p = await ImagePicker.requestCameraPermissionsAsync();
                          if (!p.granted) { Alert.alert('Permissao negada'); return; }
                          result = await ImagePicker.launchCameraAsync({ mediaTypes: 'Images', quality: 0.7, allowsEditing: true, aspect: [1,1] });
                } else {
                          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
                          if (!p.granted) { Alert.alert('Permissao negada'); return; }
                          result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images', quality: 0.7, allowsEditing: true, aspect: [1,1] });
                }
                if (!result.canceled && result.assets?.[0]?.uri) setAvatar(result.assets[0].uri);
        } catch { Alert.alert('Erro', 'Nao foi possivel acessar a imagem.'); }
  };

  const uploadAvatar = async (uri) => {
        // TODO: blue-upload.js precisa ter action=upload-avatar; se nao existir, retorna null silenciosamente
        try {
                const fd = new FormData();
                fd.append('file', { uri, name: 'avatar.jpg', type: 'image/jpeg' });
                fd.append('action', 'upload-avatar');
                const r = await fetch(`${API_BASE}/blue-upload`, { method: 'POST', body: fd });
                const d = await r.json().catch(() => ({}));
                return d.url || d.avatar_url || null;
        } catch { return null; }
  };

  const toggleNicho = (n) => setNichosSel(prev => {
        if (prev.includes(n)) return prev.filter(x => x !== n);
        if (prev.length >= 3) return prev;
        return [...prev, n];
  });

  const loadSugestoes = useCallback(async () => {
        setLoadingSug(true);
        try {
                // TODO: blue-profile.js precisa ter action=sugestoes-seguir
          const d = await blueAPI.sugestoesSeguir?.() || {};
                setSugestoes(d.users || d.sugestoes || []);
        } catch { setSugestoes([]); }
        setLoadingSug(false);
  }, []);

  useEffect(() => { if (step === 5) loadSugestoes(); }, [step]);

  const toggleSeguir = async (uid) => {
        const next = new Set(seguindo);
        if (next.has(uid)) next.delete(uid); else next.add(uid);
        setSeguindo(next);
        try { await blueAPI.seguir(uid, useAuthStore.getState().user?.id); } catch {}
  };

  const saveStep = async () => {
        setLoading(true);
        try {
                if (step === 1) {
                          if (usernameStatus !== 'ok') { setLoading(false); return; }
                          await fetch(`${API_BASE}/blue-profile`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'update', username }) }).catch(() => {});
                }
                if (step === 2) {
                          await fetch(`${API_BASE}/blue-profile`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'update', nome, bio }) }).catch(() => {});
                }
                if (step === 3 && avatar) {
                          const url = await uploadAvatar(avatar);
                          if (url) await fetch(`${API_BASE}/blue-profile`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'update', avatar_url: url }) }).catch(() => {});
                }
                if (step === 4 && nichosSel.length > 0) await blueAPI.onboardingInteresses(nichosSel);
                if (step === 6) {
                          await blueAPI.onboardingCompletar();
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                          setConfetti(true);
                          setTimeout(() => navigation.replace('Main'), 2200);
                          setLoading(false);
                          return;
                }
                setStep(s => s + 1);
        } catch { setStep(s => Math.min(s + 1, TOTAL_STEPS)); }
        setLoading(false);
  };

  const canProceed = step === 1 ? (usernameStatus === 'ok' && username.length >= 3) : true;

  const renderStep = () => {
        if (step === 1) return (
                <View>
                  <Text style={S.title}>Escolha seu @username</Text>
            <Text style={S.sub}>Como os outros vao te encontrar</Text>
            <View style={S.uRow}>
                    <Text style={S.at}>@</Text>
              <TextInput style={S.uInput} value={username} onChangeText={t => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g,''))} placeholder="meu_username" placeholderTextColor={COLORS.textDim} autoCapitalize="none" autoCorrect={false} maxLength={30} />
        {usernameStatus==='checking' && <ActivityIndicator size="small" color={COLORS.accent} />}
         {usernameStatus==='ok' && <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />}
    {usernameStatus==='taken' && <Ionicons name="close-circle" size={22} color={COLORS.error} />}
      </View>
    {usernameStatus==='taken' && <Text style={S.err}>Username ja em uso</Text>}
  {usernameStatus==='invalid' && <Text style={S.err}>Use letras minusculas, numeros, . e _</Text>}
    </View>
       );
       if (step === 2) return (
               <View>
                 <Text style={S.title}>Fale sobre voce</Text>
           <Text style={S.sub}>Aparece no seu perfil publico</Text>
           <TextInput style={[S.field,{marginBottom:14}]} value={nome} onChangeText={setNome} placeholder="Seu nome" placeholderTextColor={COLORS.textDim} maxLength={60} />
                 <TextInput style={[S.field,{height:90,textAlignVertical:'top'}]} value={bio} onChangeText={t => (bio.length<150||t.length<bio.length) && setBio(t)} placeholder="Bio (opcional)" placeholderTextColor={COLORS.textDim} multiline maxLength={150} />
            <Text style={S.cnt}>{bio.length}/150</Text>
  </View>
    );
    if (step === 3) return (
            <View style={{alignItems:'center'}}>
        <Text style={S.title}>Foto de perfil</Text>
        <Text style={S.sub}>Perfis com foto ganham mais seguidores</Text>
        <TouchableOpacity style={S.avWrap} onPress={() => Alert.alert('Foto','Escolha a origem',[{text:'Camera',onPress:()=>pickImage('camera')},{text:'Galeria',onPress:()=>pickImage('gallery')},{text:'Cancelar',style:'cancel'}])}>
    {avatar ? <Image source={{uri:avatar}} style={S.avImg} /> : <View style={S.avPh}><Ionicons name="camera-outline" size={32} color={COLORS.textDim} /><Text style={{color:COLORS.textDim,fontSize:12,marginTop:6}}>Toque para adicionar</Text></View>}
      </TouchableOpacity>
      </View>
    );
    if (step === 4) return (
            <View>
              <Text style={S.title}>Seus interesses</Text>
        <Text style={S.sub}>Ate 3 nichos para personalizar o feed</Text>
        <View style={S.grid}>
    {NICHOS.map(n => {
                  const sel = nichosSel.includes(n);
                  return <TouchableOpacity key={n} onPress={()=>toggleNicho(n)} style={[S.pill, sel && S.pillSel]}><Text style={[S.pillTxt,sel&&S.pillTxtSel]}>{n}</Text></TouchableOpacity>;
})}
</View>
        <Text style={S.cnt}>{nichosSel.length}/3 selecionados</Text>
  </View>
    );
    if (step === 5) return (
            <View>
              <Text style={S.title}>Quem seguir?</Text>
        <Text style={S.sub}>Sugestoes personalizadas para voce</Text>
{loadingSug ? <ActivityIndicator color={COLORS.accent} style={{marginTop:40}} /> :
          sugestoes.length === 0 ? <Text style={{color:COLORS.textSecondary,textAlign:'center',marginTop:40}}>Nenhuma sugestao no momento</Text> :
          sugestoes.slice(0,8).map(u => (
                        <View key={u.id||u.user_id} style={S.sugRow}>
              <View style={S.sugAv}>{u.avatar_url ? <Image source={{uri:u.avatar_url}} style={{width:'100%',height:'100%'}} /> : <Ionicons name="person" size={18} color={COLORS.textDim} />}</View>
              <View style={{flex:1}}>
                <Text style={{color:COLORS.text,fontWeight:'700',fontSize:14}}>{u.nome||u.name||u.username}</Text>
                <Text style={{color:COLORS.textSecondary,fontSize:12}}>@{u.username}</Text>
            </View>
              <TouchableOpacity onPress={()=>toggleSeguir(u.id||u.user_id)} style={[S.followBtn,seguindo.has(u.id||u.user_id)&&S.followOn]}>
                            <Text style={[S.followTxt,seguindo.has(u.id||u.user_id)&&{color:'#fff'}]}>{seguindo.has(u.id||u.user_id)?'Seguindo':'Seguir'}</Text>
            </TouchableOpacity>
            </View>
          ))
}
            </View>
    );
    if (step === 6) return (
            <View style={{alignItems:'center'}}>
        <Text style={S.title}>Notificacoes</Text>
        <Text style={S.sub}>Saiba quando alguem curtir ou seguir voce</Text>
        <TouchableOpacity style={[S.notifBtn, notifOk&&S.notifOn]} onPress={()=>setNotifOk(v=>!v)}>
          <Ionicons name={notifOk?'notifications':'notifications-outline'} size={28} color={notifOk?'#fff':COLORS.textDim} />
                <Text style={[S.notifTxt,notifOk&&{color:'#fff'}]}>{notifOk?'Notificacoes ativas!':'Ativar notificacoes'}</Text>
      </TouchableOpacity>
{confetti && <View style={{alignItems:'center',marginTop:28}}><Text style={{fontSize:28}}>🎉</Text><Text style={{color:COLORS.text,fontSize:18,fontWeight:'800',marginTop:8}}>Tudo pronto!</Text><Text style={{color:COLORS.textSecondary,textAlign:'center',marginTop:6}}>Bem-vindo ao BlueTube!</Text></View>}
  </View>
    );
};

  return (
        <LinearGradient colors={[COLORS.background, COLORS.surface]} style={{flex:1}}>
      <StatusBar style="light" />
          <Confetti visible={confetti} />
          <ScrollView contentContainerStyle={S.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={S.hdr}>CONFIGURAR PERFIL</Text>
        <ProgressBar step={step} />
  {renderStep()}
        <View style={{marginTop:32}}>
          <TouchableOpacity activeOpacity={0.85} onPress={saveStep} disabled={loading||!canProceed} style={[S.btnWrap,(!canProceed||loading)&&{opacity:0.5}]}>
                <LinearGradient colors={[COLORS.primary,COLORS.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={S.btn}>
  {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.btnTxt}>{step===TOTAL_STEPS?'Concluir':'Continuar'}</Text>}
    </LinearGradient>
    </TouchableOpacity>
{step!==TOTAL_STEPS && <TouchableOpacity onPress={()=>step<TOTAL_STEPS?setStep(s=>s+1):navigation.replace('Main')} style={{marginTop:14,padding:8,alignItems:'center'}}><Text style={{color:COLORS.textSecondary,fontSize:13}}>Pular por agora</Text></TouchableOpacity>}
  </View>
  </ScrollView>
  </LinearGradient>
  );
}

const S = StyleSheet.create({
    container: { flexGrow:1, padding:24, paddingTop:60, paddingBottom:40 },
    hdr: { color:COLORS.textSecondary, fontSize:11, fontWeight:'700', letterSpacing:1.2, marginBottom:4 },
    title: { color:COLORS.text, fontSize:22, fontWeight:'800', marginBottom:8 },
    sub: { color:COLORS.textSecondary, fontSize:14, marginBottom:24, lineHeight:20 },
    uRow: { flexDirection:'row', alignItems:'center', backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(0,170,255,0.3)', borderRadius:14, paddingHorizontal:14, paddingVertical:4 },
    at: { color:COLORS.accent, fontSize:18, fontWeight:'700', marginRight:4 },
    uInput: { flex:1, paddingVertical:12, color:'#fff', fontSize:16 },
    err: { color:COLORS.error, fontSize:12, marginTop:6 },
    field: { backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1, borderColor:'rgba(0,170,255,0.2)', borderRadius:14, paddingHorizontal:14, paddingVertical:12, color:'#fff', fontSize:15 },
    cnt: { color:COLORS.textDim, fontSize:11, textAlign:'right', marginTop:4 },
    avWrap: { width:120, height:120, borderRadius:60, overflow:'hidden', marginTop:16, borderWidth:2, borderColor:'rgba(0,170,255,0.3)' },
    avImg: { width:'100%', height:'100%' },
    avPh: { flex:1, backgroundColor:'rgba(255,255,255,0.04)', alignItems:'center', justifyContent:'center' },
    grid: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:8 },
    pill: { paddingHorizontal:14, paddingVertical:8, borderRadius:20, borderWidth:1, borderColor:'rgba(0,170,255,0.25)', backgroundColor:'rgba(255,255,255,0.03)' },
    pillSel: { backgroundColor:'rgba(0,170,255,0.2)', borderColor:COLORS.accent },
    pillTxt: { color:COLORS.textSecondary, fontSize:13 },
    pillTxtSel: { color:COLORS.accent, fontWeight:'700' },
    sugRow: { flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderBottomColor:'rgba(0,170,255,0.08)', gap:12 },
    sugAv: { width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.05)', alignItems:'center', justifyContent:'center', overflow:'hidden' },
    followBtn: { paddingHorizontal:14, paddingVertical:6, borderRadius:16, borderWidth:1, borderColor:COLORS.accent },
    followOn: { backgroundColor:COLORS.accent },
    followTxt: { color:COLORS.accent, fontSize:13, fontWeight:'700' },
    notifBtn: { flexDirection:'row', alignItems:'center', gap:12, paddingVertical:18, paddingHorizontal:24, borderRadius:16, borderWidth:1.5, borderColor:'rgba(0,170,255,0.3)', backgroundColor:'rgba(255,255,255,0.04)', marginTop:16 },
    notifOn: { backgroundColor:'rgba(0,170,255,0.2)', borderColor:COLORS.accent },
    notifTxt: { color:COLORS.textSecondary, fontSize:16, fontWeight:'600' },
    btnWrap: { borderRadius:14, shadowColor:COLORS.accent, shadowOpacity:0.4, shadowRadius:12, shadowOffset:{width:0,height:4}, elevation:6 },
    btn: { paddingVertical:16, borderRadius:14, alignItems:'center' },
    btnTxt: { color:'#fff', fontWeight:'800', fontSize:15, letterSpacing:0.3 },
});
