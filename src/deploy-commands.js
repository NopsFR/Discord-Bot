require('dotenv').config();

const { REST, Routes } = require('discord.js');
const { config, hasDiscordConfig } = require('./config');
const { commandData } = require('./commands');

async function main() {
  if (!hasDiscordConfig() || !config.guildId) {
    throw new Error('DISCORD_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID must be set in .env before deploying commands.');
  }

  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  console.log(`Deploying ${commandData.length} slash commands to guild ${config.guildId}...`);
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commandData }
  );
  console.log('Slash commands deployed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
