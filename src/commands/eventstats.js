const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readState } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eventstats')
    .setDescription('View your personal event statistics.'),

  async execute(interaction) {
    const state = await readState();
    const stats = state.eventStats[interaction.user.id] || { events: 0, points: 0, wins: 0 };

    const embed = new EmbedBuilder()
      .setTitle('Your Event Stats')
      .setColor(0xa78bfa)
      .addFields(
        { name: 'Events', value: String(stats.events || 0), inline: true },
        { name: 'Points', value: String(stats.points || 0), inline: true },
        { name: 'Wins', value: String(stats.wins || 0), inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
