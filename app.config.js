export default {
    expo: {
          name: 'BlueTube',
          slug: 'bluetube',
          version: '1.0.0',
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
                  permissions: [
                            'CAMERA',
                            'RECORD_AUDIO',
                            'READ_EXTERNAL_STORAGE',
                            'WRITE_EXTERNAL_STORAGE',
                            'VIBRATE',
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
                  'expo-camera',
                  'expo-media-library',
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
