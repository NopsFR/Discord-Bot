const { Client, Events, GatewayIntentBits } = require('discord.js');
const { config, hasDiscordConfig } = require('./config');
const { commandMap, handleButton } = require('./commands');
const { createWebPanel } = require('./webPanel');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ]
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

client.once(Events.ClientReady, () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    try {
      await handleButton(interaction);
    } catch (error) {
      console.error(`Button ${interaction.customId} failed:`, error);
      if (!interaction.replied) {
        await interaction.reply({ content: `Button failed: ${error.message}`, ephemeral: true });
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  console.log(`Received /${interaction.commandName} from ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);

  const command = commandMap.get(interaction.commandName);

  if (!command) {
    await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Command /${interaction.commandName} failed:`, error);

    const message = `Command failed: ${error.message}`;
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(message);
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    } catch (replyError) {
      console.error(`Could not send failure response for /${interaction.commandName}:`, replyError);
    }
  }
});

createWebPanel(client);

if (!hasDiscordConfig()) {
  console.warn('Discord bot not started. Add DISCORD_TOKEN and DISCORD_CLIENT_ID to .env.');
} else {
  client.login(config.discordToken);
}
