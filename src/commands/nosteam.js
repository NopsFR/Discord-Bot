const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readState } = require('../utils/store');
const { fetchAllMembers } = require('../utils/members');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nosteam')
    .setDescription('Show members without a linked Steam ID.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const [state, members] = await Promise.all([readState(), fetchAllMembers(interaction)]);
      const missing = members
        .filter((member) => !member.user.bot && !state.steamLinks[member.id])
        .map((member) => member.toString())
        .slice(0, 50);

      const embed = new EmbedBuilder()
        .setTitle('Members Without Steam IDs')
        .setDescription(missing.length ? missing.join('\n') : 'Everyone has a linked Steam ID.')
        .setColor(0xf59e0b)
        .setFooter({ text: missing.length === 50 ? 'Showing first 50 members.' : 'Steam link check complete.' });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(error.message);
    }
  }
};
