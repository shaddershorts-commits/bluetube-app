# BlueTube — App Android/iOS

App nativo do BlueTube construído com React Native + Expo.

## Stack

- **Expo SDK 52** + React Native 0.76
- **React Navigation** (Bottom Tabs + Stack)
- **Zustand** para estado global
- **Supabase** para realtime (chat)
- **APIs existentes** em `bluetubeviral.com/api` (não replica backend)

## Estrutura

```
bluetube-app/
├── App.js                 # Entry point
├── app.config.js          # Expo config (bundle id, permissions)
├── eas.json               # EAS Build profiles
├── src/
│   ├── api/               # Cliente das APIs do BlueTube
│   ├── components/        # Avatar, VideoCard, StoriesBar, etc
│   ├── constants/         # COLORS, API_BASE
│   ├── hooks/             # useNotifications
│   ├── lib/               # supabase client
│   ├── navigation/        # Stack + Tabs
│   ├── screens/           # Login, Feed, Camera, Chat, Profile...
│   └── store/             # Zustand (auth, feed)
└── assets/                # icon.png, splash.png, adaptive-icon.png
```

## Telas implementadas

- ✅ **Login** — signin/signup integrado com `/api/auth`
- ✅ **Feed** — FlashList pagiada, autoplay, like, save, share
- ✅ **Descobrir** — trending hashtags
- ✅ **Camera** — gravação nativa 15s/30s/60s com flip e permissões
- ✅ **Chat** — lista de conversas + chat individual com polling
- ✅ **Perfil** — dados do usuário + menu de monetização/logout
- ✅ **Comentários** — modal de comentários por vídeo
- ✅ **Perfil de outros** — com botão seguir
- ✅ **Live** — placeholder (usar web)

## Setup local

```bash
# 1. Instalar deps
cd bluetube-app
npm install

# 2. Configurar .env
cp .env.example .env
# edite com suas chaves Supabase

# 3. Rodar em dev
npm start
# abra Expo Go no celular e escaneie o QR code
```

## Build APK (preview — instalável no Android)

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Login (criar conta gratuita em expo.dev)
eas login

# 3. Configurar projeto (primeira vez)
eas build:configure

# 4. Build APK
eas build --platform android --profile preview

# 5. Baixar APK pelo link que aparece
# Instalar no Android: Configurações → Segurança → Fontes desconhecidas
```

## Build para Play Store (AAB)

```bash
eas build --platform android --profile production

# Upload manual no Play Console:
# play.google.com/console → Novo app → Upload .aab
```

## Assets necessários

Antes do primeiro build, adicione em `assets/`:
- `icon.png` — 1024×1024 (ícone do app)
- `splash.png` — 1284×2778 (splash screen)
- `adaptive-icon.png` — 432×432 (ícone adaptativo Android)

Exporte do Figma ou use gerador online como [easyappicon.com](https://easyappicon.com).

## Variáveis de ambiente

No **Expo Dashboard** (expo.dev/accounts/seu-user/projects) adicione:

```
SUPABASE_URL=https://pokpfvjrccviwgguwuck.supabase.co
SUPABASE_ANON_KEY=<sua anon key>
API_BASE_URL=https://bluetubeviral.com/api
```

## Backend

**Nenhum backend novo necessário.** O app consome as APIs já existentes em:
- `bluetubeviral.com/api/auth` — autenticação
- `bluetubeviral.com/api/blue-feed` — feed e trending
- `bluetubeviral.com/api/blue-interact` — likes, saves, views
- `bluetubeviral.com/api/blue-comment` — comentários
- `bluetubeviral.com/api/blue-chat` — mensagens diretas
- `bluetubeviral.com/api/blue-profile` — perfis
- `bluetubeviral.com/api/blue-stories` — stories
- `bluetubeviral.com/api/blue-lives` — lives (placeholder no app)
- `bluetubeviral.com/api/blue-coins` — BlueCoins
- `bluetubeviral.com/api/blue-monetizacao` — Stripe Connect
- `bluetubeviral.com/api/blue-onboarding` — wizard
- `bluetubeviral.com/api/blue-report` — moderação

## Publicação Play Store

1. Conta Google Play Console ($25 único): [play.google.com/console](https://play.google.com/console)
2. Criar app: nome "BlueTube", categoria Social
3. Upload do `.aab` gerado pelo EAS Build production
4. Ficha da loja: título, descrição, 2-8 screenshots, ícone 512×512
5. Política de privacidade: `https://bluetubeviral.com/privacidade.html`
6. Preço: Gratuito
7. Enviar para revisão (1-3 dias)

## Limitações conhecidas

- **Lives**: placeholder — 100ms SDK nativo não implementado, use web
- **Filtros AR**: não implementado no app (use web em `/blue-camera.html`)
- **Upload**: câmera grava e salva na galeria — upload completo está no pipeline
- **Push notifications**: infraestrutura pronta (useNotifications), precisa de VAPID configurado

## Licença

Privado — BlueTube Viral
