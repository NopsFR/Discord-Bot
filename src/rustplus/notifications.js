const { EmbedBuilder } = require('discord.js');

let discordClient = null;

function setClient(client) {
  discordClient = client;
}

/**
 * Resolve the configured channel for a given notification kind on a server.
 * Falls back to the server-wide `default` channel when a specific one is unset.
 */
async function resolveChannel(server, kind) {
  if (!discordClient) {
    return null;
  }
  const channels = server.channels || {};
  const channelId = channels[kind] || channels.default;
  if (!channelId) {
    return null;
  }
  try {
    return await discordClient.channels.fetch(channelId);
  } catch {
    return null;
  }
}

async function post(server, kind, embed) {
  const channel = await resolveChannel(server, kind);
  if (!channel || typeof channel.send !== 'function') {
    return false;
  }
  try {
    await channel.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error(`[notify] failed to post ${kind} for ${server.name}:`, error.message);
    return false;
  }
}

function baseEmbed(server, color) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: server.name || 'Rust+ Server' })
    .setTimestamp();
}

module.exports = {
  setClient,
  resolveChannel,
  post,
  baseEmbed
};
