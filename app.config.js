export default {
    expo: {
          name: 'BlueTube',
          slug: 'bluetube',
          version: '1.5.0',
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
                  // Regra: +1 a cada AAB enviado pra loja. 1.5.0 → 150.
                  versionCode: 150,
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
