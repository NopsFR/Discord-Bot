const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'rustplus.json');

/**
 * Persistent store for everything Rust+ related. This file can contain Steam
 * linked auth tokens and server pairing tokens, so it is gitignored.
 *
 * Shape:
 * {
 *   credentials: {                 // keyed by Discord user id
 *     [discordUserId]: {
 *       fcm_credentials, expo_push_token, rustplus_auth_token, steamId,
 *       discordUserId, updatedAt
 *     }
 *   },
 *   servers: {                     // keyed by `${guildId}:${serverId}`
 *     [key]: {
 *       guildId, serverId, name, desc, ip, port, playerId, playerToken,
 *       ownerDiscordId, active, channels: { events, alarms, chat, deaths },
 *       updatedAt
 *     }
 *   },
 *   devices: { [serverKey]: { [entityId]: { entityId, name, type, group } } },
 *   trackers: { [guildId]: [ { name, battlemetricsId, players: [...] } ] },
 *   deaths: { [serverKey]: [ { steamId, name, x, y, time } ] },
 *   stats: { [serverKey]: { [steamId]: { name, playtime, afktime, lastSeen } } },
 *   settings: { [serverKey]: { commandPrefix, inGameTrigger, ... } }
 * }
 */
const defaultStore = {
  credentials: {},
  servers: {},
  devices: {},
  trackers: {},
  deaths: {},
  stats: {},
  settings: {}
};

let cache = null;
let writeChain = Promise.resolve();

async function load() {
  if (cache) {
    return cache;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8');
    cache = { ...defaultStore, ...JSON.parse(raw) };
  } catch {
    cache = structuredClone(defaultStore);
  }

  return cache;
}

async function persist() {
  const snapshot = JSON.stringify(cache, null, 2);
  writeChain = writeChain.then(() =>
    fs.writeFile(STORE_FILE, `${snapshot}\n`, 'utf8').catch((error) => {
      console.error('Failed to persist Rust+ store:', error.message);
    })
  );
  return writeChain;
}

/**
 * Mutate the store atomically. The mutator receives the live store object and
 * may return a value that is forwarded to the caller.
 */
async function update(mutator) {
  const store = await load();
  const result = await mutator(store);
  await persist();
  return result;
}

async function get() {
  return load();
}

function serverKey(guildId, serverId) {
  return `${guildId}:${serverId}`;
}

module.exports = {
  get,
  update,
  serverKey,
  STORE_FILE
};
