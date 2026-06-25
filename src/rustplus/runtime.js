const { EmbedBuilder } = require('discord.js');
const dataStore = require('./dataStore');
const fcmListener = require('./fcmListener');
const connectionManager = require('./connectionManager');
const notifications = require('./notifications');
const teamChat = require('./teamChat');
const tracking = require('./tracking');
const { detectEvents } = require('./events');
const battlemetrics = require('./battlemetrics');

const ENTITY_TYPE = { 1: 'Smart Switch', 2: 'Smart Alarm', 3: 'Storage Monitor' };
const BM_POLL_MS = 60000;

let discordClient = null;
const mapSizeCache = new Map(); // serverKey -> mapSize
const bmOnlineCache = new Map(); // `${guildId}:${trackerName}` -> Set(playerNames)
let bmTimer = null;

async function init(client) {
  discordClient = client;
  notifications.setClient(client);

  // 1) Start FCM listeners for every registered Discord user.
  const store = await dataStore.get();
  for (const credential of Object.values(store.credentials)) {
    try {
      await fcmListener.start(credential);
    } catch (error) {
      console.error(`[runtime] FCM start failed for ${credential.discordUserId}:`, error.message);
    }
  }
  fcmListener.on('notification', handleFcmNotification);

  // 2) Wire connection manager events.
  connectionManager.on('connected', ({ server }) => console.log(`[rust+] connected: ${server.name}`));
  connectionManager.on('disconnected', ({ server }) => console.log(`[rust+] disconnected: ${server.name}`));
  connectionManager.on('serverError', ({ server, error }) =>
    console.error(`[rust+] ${server.name} error:`, error?.message || error));
  connectionManager.on('teamMessage', handleTeamMessage);
  connectionManager.on('teamInfo', handleTeamInfo);
  connectionManager.on('markers', handleMarkers);

  // 3) Connect to all active paired servers.
  await connectionManager.startAll();

  // 4) BattleMetrics tracker polling loop.
  bmTimer = setInterval(() => pollTrackers().catch(() => {}), BM_POLL_MS);
}

/** Register or update a Discord user's Rust+ credentials and begin listening. */
async function saveCredential(credential) {
  await dataStore.update((store) => {
    store.credentials[credential.discordUserId] = { ...credential, updatedAt: new Date().toISOString() };
    return null;
  });
  await fcmListener.start(credential);
}

async function handleFcmNotification({ discordUserId, body }) {
  // Pairing notification for a server.
  if (body.type === 'server' || (body.ip && body.port && body.playerToken && !body.entityId)) {
    await registerServer(discordUserId, body);
    return;
  }

  // Pairing notification for a smart device (entity).
  if (body.type === 'entity' || body.entityId) {
    await registerEntity(discordUserId, body);
    return;
  }

  // Smart alarm / generic alert.
  if (body.type === 'alarm' || body.title || body.message) {
    await handleAlarm(discordUserId, body);
  }
}

async function registerServer(discordUserId, body) {
  const guildId = await resolveGuildForUser(discordUserId);
  const serverId = `${body.ip}:${body.port}`;
  const key = dataStore.serverKey(guildId, serverId);

  const server = {
    guildId,
    serverId,
    name: body.name || serverId,
    desc: body.desc || '',
    ip: body.ip,
    port: body.port,
    playerId: body.playerId,
    playerToken: body.playerToken,
    ownerDiscordId: discordUserId,
    img: body.img || null,
    logo: body.logo || null,
    url: body.url || null,
    active: true,
    channels: {}
  };

  await dataStore.update((store) => {
    const existing = store.servers[key];
    store.servers[key] = { ...existing, ...server, channels: existing?.channels || {} };
    return null;
  });

  connectionManager.add((await dataStore.get()).servers[key]);
  console.log(`[rust+] paired server ${server.name} for ${discordUserId}`);

  await dmUser(discordUserId, `Paired Rust+ server **${server.name}** (${serverId}). The bot is now connected.`);
}

async function registerEntity(discordUserId, body) {
  const guildId = await resolveGuildForUser(discordUserId);
  const serverId = `${body.ip}:${body.port}`;
  const key = dataStore.serverKey(guildId, serverId);
  const entityId = String(body.entityId);
  const typeName = ENTITY_TYPE[body.entityType] || 'Device';

  await dataStore.update((store) => {
    store.devices[key] = store.devices[key] || {};
    const existing = store.devices[key][entityId];
    store.devices[key][entityId] = {
      entityId,
      name: existing?.name || body.entityName || `${typeName} ${entityId}`,
      type: body.entityType,
      typeName,
      group: existing?.group || null
    };
    return null;
  });

  console.log(`[rust+] paired ${typeName} ${entityId} for ${discordUserId}`);
  await dmUser(discordUserId, `Paired **${typeName}** (id ${entityId}). Rename it with \`/device rename\`.`);
}

async function handleAlarm(discordUserId, body) {
  const guildId = await resolveGuildForUser(discordUserId);
  const store = await dataStore.get();
  const server = Object.values(store.servers).find((s) => s.guildId === guildId);
  const embed = new EmbedBuilder()
    .setColor(0xef4444)
    .setTitle(body.title || 'Smart Alarm')
    .setDescription(body.message || 'A smart alarm was triggered.')
    .setTimestamp();

  if (server) {
    const posted = await notifications.post(server, 'alarms', embed);
    if (posted) {
      return;
    }
  }
  await dmUser(discordUserId, { embeds: [embed] });
}

async function handleTeamMessage({ server, instance, message }) {
  // Mirror all team chat to the configured Discord chat channel.
  const embed = notifications
    .baseEmbed(server, 0x60a5fa)
    .setAuthor({ name: message.name || 'Team' })
    .setDescription(message.message || '');
  await notifications.post(server, 'chat', embed);

  // Handle in-game commands.
  await teamChat.handleCommand({ instance, server }, message).catch((error) => {
    console.error('[teamChat] command failed:', error.message);
  });
}

async function handleTeamInfo({ server, teamInfo, previous }) {
  const key = dataStore.serverKey(server.guildId, server.serverId);
  const mapSize = mapSizeCache.get(key);
  const deaths = await tracking.handleTeamInfo(server, teamInfo, previous, mapSize);

  for (const death of deaths) {
    const embed = notifications
      .baseEmbed(server, 0x9ca3af)
      .setTitle('Team Member Died')
      .setDescription(`**${death.name}** died${death.grid ? ` at **${death.grid}**` : ''}.`);
    await notifications.post(server, 'deaths', embed);
  }
}

async function handleMarkers({ server, instance, markers, previous }) {
  const key = dataStore.serverKey(server.guildId, server.serverId);

  // Cache map size for grid calculations.
  if (!mapSizeCache.has(key)) {
    const info = await instance.getInfo().catch(() => null);
    if (info?.mapSize) {
      mapSizeCache.set(key, info.mapSize);
    }
  }
  const mapSize = mapSizeCache.get(key);

  const events = detectEvents(previous, markers, mapSize);
  for (const event of events) {
    const embed = notifications.baseEmbed(server, 0xf59e0b).setTitle(event.title).setDescription(event.text);
    await notifications.post(server, 'events', embed);
    // Also announce in-game.
    instance.sendTeamMessage(event.text).catch(() => {});
  }
}

async function pollTrackers() {
  if (!discordClient) {
    return;
  }
  const store = await dataStore.get();
  for (const [guildId, trackers] of Object.entries(store.trackers)) {
    for (const tracker of trackers) {
      try {
        await pollSingleTracker(guildId, tracker);
      } catch (error) {
        console.error(`[bm] tracker ${tracker.name} failed:`, error.message);
      }
    }
  }
}

async function pollSingleTracker(guildId, tracker) {
  const online = await battlemetrics.getOnlinePlayers(tracker.battlemetricsId);
  const onlineNames = new Set(online.map((p) => p.name));
  const cacheKey = `${guildId}:${tracker.name}`;
  const previous = bmOnlineCache.get(cacheKey) || new Set();

  const watch = tracker.players?.length ? new Set(tracker.players.map((p) => p.toLowerCase())) : null;
  const transitions = [];

  for (const name of onlineNames) {
    if (!previous.has(name) && (!watch || watch.has(name.toLowerCase()))) {
      transitions.push({ name, online: true });
    }
  }
  for (const name of previous) {
    if (!onlineNames.has(name) && (!watch || watch.has(name.toLowerCase()))) {
      transitions.push({ name, online: false });
    }
  }

  bmOnlineCache.set(cacheKey, onlineNames);

  if (!transitions.length || previous.size === 0) {
    return; // skip first poll to avoid a flood
  }

  const store = await dataStore.get();
  const server = Object.values(store.servers).find((s) => s.guildId === guildId);
  for (const t of transitions) {
    const embed = new EmbedBuilder()
      .setColor(t.online ? 0x22c55e : 0x6b7280)
      .setTitle(`Player ${t.online ? 'Online' : 'Offline'}`)
      .setDescription(`**${t.name}** is now ${t.online ? 'online' : 'offline'} on ${tracker.name}.`)
      .setTimestamp();
    if (server) {
      await notifications.post(server, 'tracker', embed);
    }
  }
}

async function resolveGuildForUser(discordUserId) {
  // Prefer a guild where the user already owns a server; else the first guild
  // the bot shares. Falls back to the configured DISCORD_GUILD_ID.
  const store = await dataStore.get();
  const owned = Object.values(store.servers).find((s) => s.ownerDiscordId === discordUserId);
  if (owned) {
    return owned.guildId;
  }
  if (discordClient?.guilds?.cache?.size) {
    return discordClient.guilds.cache.first().id;
  }
  return require('../config').config.guildId;
}

async function dmUser(discordUserId, content) {
  if (!discordClient) {
    return;
  }
  try {
    const user = await discordClient.users.fetch(discordUserId);
    await user.send(content);
  } catch {
    /* user may have DMs disabled */
  }
}

module.exports = { init, saveCredential };
