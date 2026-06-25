const connectionManager = require('./connectionManager');

/**
 * Resolve the active Rust+ connection for the guild an interaction came from.
 * Throws a user-friendly error when nothing is paired/connected.
 */
function getInstance(interaction) {
  const guildId = interaction.guildId;
  const instance = connectionManager.getForGuild(guildId);
  if (!instance) {
    throw new Error('No Rust+ server is paired for this Discord server yet. Use `/pair` to link your Rust+ account, then pair a server in-game.');
  }
  if (!instance.connected) {
    throw new Error(`Connecting to **${instance.server.name}**… try again in a few seconds.`);
  }
  return instance;
}

function getInstanceOrNull(interaction) {
  try {
    return getInstance(interaction);
  } catch {
    return null;
  }
}

module.exports = { getInstance, getInstanceOrNull };
