import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// DSN vem via app.config.js → Constants.expoConfig.extra.sentryDsn
// (process.env não existe em runtime no Expo — tem que passar pelo extra).
const DSN = Constants.expoConfig?.extra?.sentryDsn || '';
const RELEASE = Constants.expoConfig?.version || '1.0.0';

let _initialized = false;

export function initSentry() {
  if (_initialized) return;
  if (!DSN) {
    if (__DEV__) console.log('[sentry] DSN vazio — Sentry desativado');
    return;
  }
  Sentry.init({
    dsn: DSN,
    release: `bluetube-app@${RELEASE}`,
    environment: __DEV__ ? 'development' : 'production',
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    attachStacktrace: true,
    beforeSend(event) {
      if (__DEV__) return null;
      return event;
    },
  });
  _initialized = true;
}

export function setUserContext(user) {
  if (!_initialized || !user) return;
  Sentry.setUser({
    id: user.id,
    username: user.user_metadata?.username || user.email?.split('@')[0],
    email: user.email,
  });
}

export function clearUserContext() {
  if (!_initialized) return;
  Sentry.setUser(null);
}

export function captureError(error, context = {}) {
  if (__DEV__) console.error('[sentry]', error, context);
  if (!_initialized) return;
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
    Sentry.captureException(error);
  });
}

export function captureMessage(message, level = 'info') {
  if (!_initialized) return;
  Sentry.captureMessage(message, level);
}

export function addBreadcrumb(message, category = 'app', data = {}) {
  if (!_initialized) return;
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

export function wrap(App) {
  // Sentry.wrap é seguro de chamar mesmo quando DSN está vazio
  return Sentry.wrap ? Sentry.wrap(App) : App;
}
