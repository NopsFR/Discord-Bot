const { SlashCommandBuilder } = require('discord.js');
const { getInstance } = require('../rustplus/active');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leader')
    .setDescription('Transfer Rust team leadership to a team member (by SteamID).')
    .addStringOption((o) =>
      o.setName('steamid').setDescription('SteamID of the member to promote (default: the registered owner)').setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const instance = getInstance(interaction);
      let steamId = interaction.options.getString('steamid');

      if (!steamId) {
        // Default to the team leader's own steam id (the paired account).
        steamId = instance.server.steamId || instance.server.playerId;
      }

      await instance.promoteToLeader(steamId);
      await interaction.editReply(`Promoted SteamID ${steamId} to team leader.`);
    } catch (error) {
      await interaction.editReply(`Could not transfer leadership: ${error.message}`);
    }
  }
};
