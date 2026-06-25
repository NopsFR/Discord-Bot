const { SlashCommandBuilder } = require('discord.js');
const { readState, writeState } = require('../utils/store');
const { isAdmin } = require('../utils/permissions');
const { isSteamId64, normalizeSteamId } = require('../utils/steam');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changesteam')
    .setDescription("Change a user's linked Steam ID.")
    .addUserOption((option) => option.setName('member').setDescription('Discord member.').setRequired(true))
    .addStringOption((option) => option.setName('steam_id').setDescription('SteamID64 or Steam profile URL.').setRequired(true))
    .addStringOption((option) => option.setName('steam_name').setDescription('Optional Steam display name.')),

  async execute(interaction) {
    if (!isAdmin(interaction)) {
      await interaction.reply({ content: 'Only admins can change linked Steam IDs.', ephemeral: true });
      return;
    }

    const member = interaction.options.getUser('member', true);
    const steamId = normalizeSteamId(interaction.options.getString('steam_id', true));
    const steamName = interaction.options.getString('steam_name') || '';

    if (!isSteamId64(steamId)) {
      await interaction.reply({ content: 'Please provide a valid SteamID64, usually starting with 7656119.', ephemeral: true });
      return;
    }

    const state = await readState();
    state.steamLinks[member.id] = {
      steamId,
      steamName,
      updatedAt: new Date().toISOString(),
      updatedBy: interaction.user.id
    };
    await writeState(state);

    await interaction.reply({ content: `Linked ${member} to Steam ID \`${steamId}\`.`, ephemeral: true });
  }
};
