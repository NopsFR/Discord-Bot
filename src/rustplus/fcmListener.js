const EventEmitter = require('node:events');
const PushReceiverClient = require('@liamcottle/push-receiver/src/client');

/**
 * Extract the Rust+ payload (the `body` field) from an FCM notification object.
 * Rust+ pairing notifications arrive unencrypted, so `appData` is an array of
 * `{ key, value }` pairs. We also handle the decrypted notification shape just
 * in case.
 */
function extractBody(object) {
  let appData = object?.appData;

  // Decrypted notifications expose data under notification.data.
  if (!appData && object?.notification?.data) {
    const data = object.notification.data;
    return safeParse(data.body) || data;
  }

  if (!Array.isArray(appData)) {
    return null;
  }

  const bodyEntry = appData.find((entry) => entry.key === 'body');
  if (!bodyEntry) {
    return null;
  }

  return safeParse(bodyEntry.value);
}

function safeParse(value) {
  if (typeof value !== 'string') {
    return value || null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Manages one FCM push-receiver connection per registered Discord user. Emits a
 * `notification` event with `{ discordUserId, steamId, body }` whenever a Rust+
 * pairing / alarm notification is received.
 */
class FcmListenerManager extends EventEmitter {
  constructor() {
    super();
    this.clients = new Map(); // discordUserId -> PushReceiverClient
  }

  /**
   * Start (or restart) a listener for a stored credential set.
   * @param {object} credential dataStore credentials entry
   */
  async start(credential) {
    const { discordUserId } = credential;
    const gcm = credential?.fcm_credentials?.gcm;

    if (!gcm?.androidId || !gcm?.securityToken) {
      throw new Error('Credential is missing FCM androidId/securityToken.');
    }

    await this.stop(discordUserId);

    const client = new PushReceiverClient(gcm.androidId, gcm.securityToken, []);

    const handler = (object) => {
      const body = extractBody(object);
      if (!body) {
        return;
      }
      this.emit('notification', {
        discordUserId,
        steamId: credential.steamId || null,
        body
      });
    };

    client.on('ON_DATA_RECEIVED', handler);
    client.on('ON_NOTIFICATION_RECEIVED', handler);
    client.on('connect', () => console.log(`[FCM] Listening for ${discordUserId}`));
    client.on('error', (error) => console.error(`[FCM] ${discordUserId} error:`, error?.message || error));

    this.clients.set(discordUserId, client);

    // connect() resolves once the socket is established; it auto-retries on drop.
    await client.connect();
    return client;
  }

  async stop(discordUserId) {
    const existing = this.clients.get(discordUserId);
    if (!existing) {
      return;
    }
    try {
      existing.removeAllListeners();
      if (typeof existing.destroy === 'function') {
        existing.destroy();
      }
    } catch (error) {
      console.error(`[FCM] Failed to stop ${discordUserId}:`, error.message);
    }
    this.clients.delete(discordUserId);
  }

  async stopAll() {
    await Promise.all([...this.clients.keys()].map((id) => this.stop(id)));
  }
}

module.exports = new FcmListenerManager();
module.exports.extractBody = extractBody;
