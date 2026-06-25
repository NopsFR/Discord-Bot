const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const dataStore = require('../rustplus/dataStore');
const battlemetrics = require('../rustplus/battlemetrics');

function parseBmId(input) {
  const match = String(input).match(/(\d{4,})/);
  return match ? match[1] : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('track')
    .setDescription('Track players via BattleMetrics and post join/leave alerts.')
    .addSubcommand((s) =>
      s.setName('add').setDescription('Add a BattleMetrics player tracker.')
        .addStringOption((o) => o.setName('name').setDescription('Tracker label').setRequired(true))
        .addStringOption((o) => o.setName('server').setDescription('BattleMetrics server URL or ID').setRequired(true))
        .addStringOption((o) => o.setName('players').setDescription('Comma-separated player names to watch (optional)'))
    )
    .addSubcommand((s) => s.setName('list').setDescription('List trackers.'))
    .addSubcommand((s) =>
      s.setName('remove').setDescription('Remove a tracker.')
        .addStringOption((o) => o.setName('name').setDescription('Tracker label').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('search').setDescription('Search BattleMetrics for a Rust server.')
        .addStringOption((o) => o.setName('query').setDescription('Server name').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'search') {
      await interaction.deferReply({ ephemeral: true });
      const servers = await battlemetrics.searchServers(interaction.options.getString('query', true));
      if (!servers.length) {
        await interaction.editReply('No servers found.');
        return;
      }
      const embed = new EmbedBuilder().setTitle('BattleMetrics Servers').setColor(0x3b82f6).setDescription(
        servers.map((s) => `**${s.name}** — ID \`${s.id}\` — ${s.players}/${s.maxPlayers} (${s.status})`).join('\n')
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === 'list') {
      const store = await dataStore.get();
      const trackers = store.trackers[interaction.guildId] || [];
      if (!trackers.length) {
        await interaction.reply({ content: 'No trackers configured.', ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder().setTitle('Player Trackers').setColor(0x3b82f6).setDescription(
        trackers.map((t) => `**${t.name}** (server ${t.battlemetricsId}) — players: ${t.players?.join(', ') || 'all'}`).join('\n')
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (!isAdmin(interaction)) {
      await interaction.reply({ content: 'Only admins can modify trackers.', ephemeral: true });
      return;
    }

    if (sub === 'add') {
      const name = interaction.options.getString('name', true);
      const bmId = parseBmId(interaction.options.getString('server', true));
      if (!bmId) {
        await interaction.reply({ content: 'Could not parse a BattleMetrics server ID from that input. Use `/track search` to find it.', ephemeral: true });
        return;
      }
      const players = (interaction.options.getString('players') || '')
        .split(',').map((p) => p.trim()).filter(Boolean);

      await dataStore.update((store) => {
        store.trackers[interaction.guildId] = store.trackers[interaction.guildId] || [];
        const existing = store.trackers[interaction.guildId].filter((t) => t.name !== name);
        existing.push({ name, battlemetricsId: bmId, players });
        store.trackers[interaction.guildId] = existing;
        return null;
      });
      await interaction.reply({ content: `Tracker **${name}** added for server ${bmId}. Set the channel with \`/rustservers channel type:tracker\`.`, ephemeral: true });
      return;
    }

    if (sub === 'remove') {
      const name = interaction.options.getString('name', true);
      await dataStore.update((store) => {
        store.trackers[interaction.guildId] = (store.trackers[interaction.guildId] || []).filter((t) => t.name !== name);
        return null;
      });
      await interaction.reply({ content: `Tracker **${name}** removed.`, ephemeral: true });
    }
  }
};
