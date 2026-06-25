const axios = require('axios');

const BASE = 'https://api.battlemetrics.com';

/**
 * Search BattleMetrics for Rust servers by name.
 * @returns {Array<{ id, name, players, maxPlayers, status, rank }>}
 */
async function searchServers(query) {
  const response = await axios.get(`${BASE}/servers`, {
    params: {
      'filter[game]': 'rust',
      'filter[search]': query,
      'page[size]': 10
    },
    timeout: 10000
  });

  return (response.data?.data || []).map((server) => ({
    id: server.id,
    name: server.attributes?.name,
    players: server.attributes?.players,
    maxPlayers: server.attributes?.maxPlayers,
    status: server.attributes?.status,
    rank: server.attributes?.rank
  }));
}

/**
 * Get the list of players currently online on a server (when the server
 * exposes its player list to BattleMetrics).
 * @returns {Array<{ id, name }>}
 */
async function getOnlinePlayers(serverId) {
  const response = await axios.get(`${BASE}/servers/${serverId}`, {
    params: { include: 'player' },
    timeout: 10000
  });

  return (response.data?.included || [])
    .filter((entry) => entry.type === 'player')
    .map((entry) => ({ id: entry.id, name: entry.attributes?.name }));
}

/**
 * Search BattleMetrics for a player by name (global).
 */
async function searchPlayers(query) {
  const response = await axios.get(`${BASE}/players`, {
    params: { 'filter[search]': query, 'page[size]': 10 },
    timeout: 10000
  });
  return (response.data?.data || []).map((p) => ({ id: p.id, name: p.attributes?.name }));
}

module.exports = { searchServers, getOnlinePlayers, searchPlayers };
