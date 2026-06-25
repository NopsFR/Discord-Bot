const dataStore = require('./dataStore');
const { getGrid } = require('./grid');

const POLL_SECONDS = 20;
const AFK_MOVE_THRESHOLD = 2; // world units; below this between polls counts as AFK
const MAX_DEATHS_STORED = 50;

/**
 * Process a team info poll: detect deaths and accumulate play/AFK time.
 * Returns an array of death notifications: { name, steamId, grid, x, y }.
 */
async function handleTeamInfo(server, teamInfo, previous, mapSize) {
  const serverKey = dataStore.serverKey(server.guildId, server.serverId);
  const members = teamInfo?.members || [];
  const prevMembers = new Map((previous?.members || []).map((m) => [String(m.steamId), m]));
  const deaths = [];

  await dataStore.update((store) => {
    store.stats[serverKey] = store.stats[serverKey] || {};
    store.deaths[serverKey] = store.deaths[serverKey] || [];
    const stats = store.stats[serverKey];

    for (const member of members) {
      const id = String(member.steamId);
      const prev = prevMembers.get(id);

      // Death detection: was alive, now dead.
      if (prev && prev.isAlive && !member.isAlive) {
        const grid = getGrid(member.x, member.y, mapSize);
        const death = {
          steamId: id,
          name: member.name,
          x: member.x,
          y: member.y,
          grid,
          time: Date.now()
        };
        store.deaths[serverKey].unshift(death);
        store.deaths[serverKey] = store.deaths[serverKey].slice(0, MAX_DEATHS_STORED);
        deaths.push(death);
      }

      // Stats accumulation.
      const stat = stats[id] || { name: member.name, playtime: 0, afktime: 0, lastX: member.x, lastY: member.y };
      stat.name = member.name;
      stat.lastSeen = Date.now();
      if (member.isOnline) {
        stat.playtime += POLL_SECONDS;
        const moved = Math.hypot((member.x ?? 0) - (stat.lastX ?? 0), (member.y ?? 0) - (stat.lastY ?? 0));
        if (moved < AFK_MOVE_THRESHOLD) {
          stat.afktime += POLL_SECONDS;
        }
      }
      stat.lastX = member.x;
      stat.lastY = member.y;
      stats[id] = stat;
    }

    return null;
  });

  return deaths;
}

function formatDuration(seconds) {
  const s = Math.floor(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

async function getStats(server) {
  const serverKey = dataStore.serverKey(server.guildId, server.serverId);
  const store = await dataStore.get();
  return store.stats[serverKey] || {};
}

async function getDeaths(server) {
  const serverKey = dataStore.serverKey(server.guildId, server.serverId);
  const store = await dataStore.get();
  return store.deaths[serverKey] || [];
}

module.exports = { handleTeamInfo, getStats, getDeaths, formatDuration, POLL_SECONDS };
