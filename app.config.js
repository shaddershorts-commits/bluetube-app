export default {
    expo: {
          name: 'BlueTube',
          slug: 'bluetube',
          // 1.5.1 → 1.5.2: primeira mudança NATIVA desde o lançamento
          // (google-services.json / FCM). runtimeVersion segue a version, então
          // os updates OTA publicados no runtime 1.5.1 NÃO alcançam este build:
          // depois de gerar o AAB é obrigatório republicar `eas update` pra
          // nascer o runtime 1.5.2, senão quem instalar o 152 fica sem os
          // ajustes já publicados.
          version: '1.5.2',
          // SDK 53 liga a nova arquitetura por padrão; mantida DESLIGADA no
          // lançamento pra não somar variável de risco (libs validadas na antiga).
          newArchEnabled: false,
          // OTA (EAS Update): fingerprint garante que um update JS so cai em
          // builds nativos compativeis. Mudanca nativa (permissao/modulo novo)
          // muda o fingerprint => exige AAB novo; ai o update nao cai em build
          // antigo por engano. Polir features e funcoes JS = OTA instantaneo.
          // appVersion (não fingerprint): fingerprint quebra no Windows com
          // core.autocrlf=true (hash local CRLF ≠ hash LF do builder EAS).
          // Regra: mudança NATIVA sempre acompanha bump de version — update JS
          // só cai em build da MESMA version.
          runtimeVersion: {
                  policy: 'appVersion',
          },
          updates: {
                  url: 'https://u.expo.dev/c7a657a7-92a2-42ba-9cab-77a54a62077f',
          },
          orientation: 'portrait',
          icon: './assets/icon.png',
          userInterfaceStyle: 'dark',
          scheme: 'bluetube',
          splash: {
                  image: './assets/splash.png',
                  resizeMode: 'contain',
                  backgroundColor: '#020817',
          },
          assetBundlePatterns: ['**/*'],
          ios: {
                  supportsTablet: false,
                  bundleIdentifier: 'com.bluetube.app',
                  infoPlist: {
                            NSCameraUsageDescription: 'Para gravar videos e fazer lives',
                            NSMicrophoneUsageDescription: 'Para gravar audio nos videos e lives',
                            NSPhotoLibraryUsageDescription: 'Para acessar seus videos e fotos',
                  },
          },
          android: {
                  adaptiveIcon: {
                            foregroundImage: './assets/adaptive-icon.png',
                            backgroundColor: '#020817',
                  },
                  package: 'com.bluetube.app',
                  // versionCode manual (autoIncrement não suporta app.config.js dinâmico).
                  // Regra: +1 a cada AAB enviado pra loja. 1.5.1 → 151 (SDK 53, 16 KB).
                  // 152 = FCM/push (projeto Firebase bluetube-143e8).
                  versionCode: 152,
                  // Firebase Cloud Messaging: SEM este arquivo dentro do build o
                  // aparelho não consegue nem PEDIR token de push —
                  // getExpoPushTokenAsync() estoura e o registro morre calado.
                  // Era essa a raiz de `user_push_tokens` vazia no app inteiro.
                  // Não é segredo (viaja dentro de todo APK); o que é segredo é
                  // a chave de serviço, que fica só no EAS.
                  googleServicesFile: './google-services.json',
                  // Permissões mínimas (política Play 2025/26): foto/vídeo via
                  // Photo Picker do sistema (SEM READ_MEDIA_*); storage legacy fora.
                  permissions: [
                            'CAMERA',
                            'RECORD_AUDIO',
                            'VIBRATE',
                          ],
                  blockedPermissions: [
                            'android.permission.READ_MEDIA_IMAGES',
                            'android.permission.READ_MEDIA_VIDEO',
                            'android.permission.READ_EXTERNAL_STORAGE',
                            'android.permission.WRITE_EXTERNAL_STORAGE',
                          ],
                  // Deep links: captura https://bluetubeviral.com/blue/* e bluetube://
                  // autoVerify: true exige assetlinks.json em /.well-known/assetlinks.json
                  // do dominio (ja provisionado no repo web do bluetube).
                  intentFilters: [
                            {
                                      action: 'VIEW',
                                      autoVerify: true,
                                      data: [
                                                { scheme: 'https', host: 'bluetubeviral.com', pathPrefix: '/blue' },
                                                { scheme: 'http',  host: 'bluetubeviral.com', pathPrefix: '/blue' },
                                      ],
                                      category: ['BROWSABLE', 'DEFAULT'],
                            },
                            {
                                      action: 'VIEW',
                                      data: [{ scheme: 'bluetube' }],
                                      category: ['BROWSABLE', 'DEFAULT'],
                            },
                  ],
          },
          // @sentry/react-native/expo plugin removido temporariamente —
          // faltava config organization/project e provavelmente quebrava
          // o gradle no upload de sourcemaps. O SDK JS (@sentry/react-native)
          // continua capturando erros em runtime normalmente.
          plugins: [
                  // targetSdk 35 = exigência Google Play pra apps novos (ago/2025+).
                  // Expo SDK 52 default é 34 — sem isso o upload do AAB é rejeitado.
                  ['expo-build-properties', {
                            android: { compileSdkVersion: 35, targetSdkVersion: 35 },
                  }],
                  // Chamadas de voz/vídeo (v1.5.2 / AAB 153): react-native-webrtc.
                  // O plugin ajusta o gradle/manifest pro WebRTC; câmera e microfone
                  // JÁ estavam nas permissions (nenhuma permissão nova pra revisão).
                  '@config-plugins/react-native-webrtc',
                  'expo-camera',
                  // expo-media-library REMOVIDO (política Photo & Video Permissions):
                  // adicionava READ_MEDIA_IMAGES/VIDEO ao manifest. Seleção de mídia
                  // usa o Photo Picker do sistema (expo-image-picker, sem permissão).
                  'expo-notifications',
                  'expo-av',
                ],
          extra: {
                  supabaseUrl: process.env.SUPABASE_URL || 'https://pokpfvjrccviwgguwuck.supabase.co',
                  supabaseKey: process.env.SUPABASE_ANON_KEY || '',
                  apiBaseUrl: process.env.API_BASE_URL || 'https://bluetubeviral.com/api',
                  sentryDsn: process.env.SENTRY_DSN || '',
                  // URLs lidas pela Apple/Google ao submeter app pra loja
                  privacyPolicyUrl: 'https://bluetubeviral.com/privacidade',
                  termsOfServiceUrl: 'https://bluetubeviral.com/termos',
                  eas: { projectId: 'c7a657a7-92a2-42ba-9cab-77a54a62077f' },
          },
    },
};
