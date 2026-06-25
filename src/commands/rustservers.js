const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const dataStore = require('../rustplus/dataStore');
const connectionManager = require('../rustplus/connectionManager');

const CHANNEL_KINDS = ['events', 'alarms', 'chat', 'deaths', 'tracker', 'default'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rustservers')
    .setDescription('Manage paired Rust+ servers and notification channels.')
    .addSubcommand((sub) => sub.setName('list').setDescription('List paired Rust+ servers and connection status.'))
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set which channel a notification type is posted to.')
        .addStringOption((o) =>
          o.setName('type').setDescription('Notification type').setRequired(true)
            .addChoices(...CHANNEL_KINDS.map((k) => ({ name: k, value: k })))
        )
        .addChannelOption((o) =>
          o.setName('channel').setDescription('Target channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const store = await dataStore.get();
    const guildServers = Object.values(store.servers).filter((s) => s.guildId === interaction.guildId);

    if (sub === 'list') {
      if (!guildServers.length) {
        await interaction.reply({ content: 'No Rust+ servers paired yet. Use `/pair`, then pair a server in game.', ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder().setTitle('Paired Rust+ Servers').setColor(0xd97706);
      for (const server of guildServers) {
        const instance = connectionManager.get(dataStore.serverKey(server.guildId, server.serverId));
        const channels = Object.entries(server.channels || {}).map(([k, v]) => `${k}: <#${v}>`).join(', ') || 'none set';
        embed.addFields({
          name: server.name,
          value: `Status: ${instance?.connected ? 'Connected' : 'Disconnected'}\nAddress: ${server.serverId}\nChannels: ${channels}`
        });
      }
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'channel') {
      if (!isAdmin(interaction)) {
        await interaction.reply({ content: 'Only admins can configure notification channels.', ephemeral: true });
        return;
      }
      if (!guildServers.length) {
        await interaction.reply({ content: 'No paired servers to configure.', ephemeral: true });
        return;
      }
      const type = interaction.options.getString('type', true);
      const channel = interaction.options.getChannel('channel', true);

      await dataStore.update((s) => {
        for (const server of Object.values(s.servers)) {
          if (server.guildId === interaction.guildId) {
            server.channels = server.channels || {};
            server.channels[type] = channel.id;
          }
        }
        return null;
      });

      await interaction.reply({ content: `Set **${type}** notifications to ${channel}.`, ephemeral: true });
    }
  }
};
