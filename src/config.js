require('dotenv').config();

function normalizeHost(value) {
  const host = String(value || '').trim();

  if (!host.includes(':')) {
    return host;
  }

  try {
    return new URL(`rust://${host}`).hostname;
  } catch {
    return host.split(':')[0];
  }
}

const config = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  adminRoleName: process.env.ADMIN_ROLE_NAME || 'Admin',
  port: Number(process.env.PORT || 3001),
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  panelUsername: process.env.PANEL_USERNAME || '',
  panelPassword: process.env.PANEL_PASSWORD || '',
  steamApiKey: process.env.STEAM_API_KEY || '',
  rust: {
    serverIp: normalizeHost(process.env.RUST_SERVER_IP),
    appPort: process.env.RUST_APP_PORT,
    playerId: process.env.RUST_PLAYER_ID,
    playerToken: process.env.RUST_PLAYER_TOKEN
  }
};

function hasDiscordConfig() {
  return Boolean(config.discordToken && config.clientId);
}

function hasRustConfig() {
  return Boolean(
    config.rust.serverIp &&
    config.rust.appPort &&
    config.rust.playerId &&
    config.rust.playerToken
  );
}

module.exports = {
  config,
  hasDiscordConfig,
  hasRustConfig
};
