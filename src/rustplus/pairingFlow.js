const crypto = require('node:crypto');
const { registerFcmCredentials, registerWithRustPlus } = require('./fcmRegister');
const runtime = require('./runtime');

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const sessions = new Map(); // sessionId -> { discordUserId, fcmCredentials, expoPushToken, createdAt, status }

function createSession(discordUserId) {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const session = {
    sessionId,
    discordUserId,
    fcmCredentials: null,
    expoPushToken: null,
    status: 'registering',
    error: null,
    createdAt: Date.now()
  };
  sessions.set(sessionId, session);

  // Register FCM credentials in the background so they're ready when the user
  // completes the Steam login.
  registerFcmCredentials()
    .then(({ fcmCredentials, expoPushToken }) => {
      session.fcmCredentials = fcmCredentials;
      session.expoPushToken = expoPushToken;
      session.status = 'ready';
    })
    .catch((error) => {
      session.status = 'error';
      session.error = error.message;
      console.error('[pairing] FCM registration failed:', error.message);
    });

  pruneSessions();
  return session;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

function pruneSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

/**
 * Decode the steamId embedded in a Rust+ auth token. The token is
 * `<base64(JSON)>.<signature>` where the JSON contains `steamId`.
 */
function steamIdFromAuthToken(authToken) {
  try {
    const payload = authToken.split('.')[0];
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    return json.steamId || null;
  } catch {
    return null;
  }
}

/**
 * Complete pairing once we have the Steam-linked auth token.
 */
async function completeWithToken(sessionId, rustplusAuthToken) {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error('Pairing session expired. Run /pair again.');
  }
  if (session.status === 'registering' || !session.expoPushToken) {
    throw new Error('Still registering FCM credentials, please wait a few seconds and retry.');
  }

  await registerWithRustPlus(rustplusAuthToken, session.expoPushToken);

  const credential = {
    discordUserId: session.discordUserId,
    fcm_credentials: session.fcmCredentials,
    expo_push_token: session.expoPushToken,
    rustplus_auth_token: rustplusAuthToken,
    steamId: steamIdFromAuthToken(rustplusAuthToken)
  };

  await runtime.saveCredential(credential);
  session.status = 'complete';
  sessions.delete(sessionId);
  return credential;
}

/**
 * Manual fallback: the user pastes a full rustplus.config.json (obtained from
 * the rustplus.js CLI / credential app) together with their steamId.
 */
async function completeWithConfig(discordUserId, config) {
  if (!config?.fcm_credentials?.gcm?.androidId || !config?.expo_push_token || !config?.rustplus_auth_token) {
    throw new Error('Config is missing fcm_credentials, expo_push_token or rustplus_auth_token.');
  }

  const credential = {
    discordUserId,
    fcm_credentials: config.fcm_credentials,
    expo_push_token: config.expo_push_token,
    rustplus_auth_token: config.rustplus_auth_token,
    steamId: config.steamId || steamIdFromAuthToken(config.rustplus_auth_token)
  };

  await runtime.saveCredential(credential);
  return credential;
}

module.exports = {
  createSession,
  getSession,
  completeWithToken,
  completeWithConfig,
  steamIdFromAuthToken
};
