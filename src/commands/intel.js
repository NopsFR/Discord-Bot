const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readState, writeState } = require('../utils/store');
const rustPlus = require('../services/rustPlusService');

function getOnlineSteamIds(teamInfo) {
  const members = teamInfo.members || teamInfo.teamMembers || [];
  return new Set(
    members
      .filter((member) => member.isOnline ?? member.online ?? member.alive)
      .map((member) => String(member.steamId || member.id || ''))
      .filter(Boolean)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('intel')
    .setDescription('View and manage intel watchlists.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('View an intel watchlist.')
        .addStringOption((option) => option.setName('name').setDescription('Watchlist name.').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a Steam ID to a watchlist.')
        .addStringOption((option) => option.setName('name').setDescription('Watchlist name.').setRequired(true))
        .addStringOption((option) => option.setName('steam_id').setDescription('SteamID64.').setRequired(true))
        .addStringOption((option) => option.setName('label').setDescription('Optional player label.'))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a Steam ID from a watchlist.')
        .addStringOption((option) => option.setName('name').setDescription('Watchlist name.').setRequired(true))
        .addStringOption((option) => option.setName('steam_id').setDescription('SteamID64.').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('online')
        .setDescription('See who on a watchlist is online in your Rust+ team.')
        .addStringOption((option) => option.setName('name').setDescription('Watchlist name.').setRequired(true))
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const name = interaction.options.getString('name', true).toLowerCase();
    const state = await readState();
    state.intelLists[name] ||= [];

    if (subcommand === 'add') {
      const steamId = interaction.options.getString('steam_id', true);
      const label = interaction.options.getString('label') || steamId;
      state.intelLists[name] = state.intelLists[name].filter((item) => item.steamId !== steamId);
      state.intelLists[name].push({ steamId, label, addedAt: new Date().toISOString() });
      await writeState(state);
      await interaction.editReply(`Added \`${steamId}\` to intel list \`${name}\`.`);
      return;
    }

    if (subcommand === 'remove') {
      const steamId = interaction.options.getString('steam_id', true);
      state.intelLists[name] = state.intelLists[name].filter((item) => item.steamId !== steamId);
      await writeState(state);
      await interaction.editReply(`Removed \`${steamId}\` from intel list \`${name}\`.`);
      return;
    }

    const list = state.intelLists[name];
    if (subcommand === 'online') {
      try {
        const teamInfo = await rustPlus.getTeamInfo();
        const onlineIds = getOnlineSteamIds(teamInfo);
        const online = list.filter((item) => onlineIds.has(item.steamId));
        const embed = new EmbedBuilder()
          .setTitle(`Intel Online: ${name}`)
          .setDescription(online.length ? online.map((item) => `${item.label} - \`${item.steamId}\``).join('\n') : 'Nobody on this list is online in Rust+ team info.')
          .setColor(0x22c55e);
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply(`Could not check Rust+ online intel: ${error.message}`);
      }
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Intel List: ${name}`)
      .setDescription(list.length ? list.map((item) => `${item.label} - \`${item.steamId}\``).join('\n') : 'This intel list is empty.')
      .setColor(0x38bdf8);
    await interaction.editReply({ embeds: [embed] });
  }
};
