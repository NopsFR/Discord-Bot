const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readState } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eventleaderboard')
    .setDescription('View event statistics leaderboard.'),

  async execute(interaction) {
    const state = await readState();
    const rows = Object.entries(state.eventStats)
      .sort(([, a], [, b]) => (b.points || 0) - (a.points || 0))
      .slice(0, 10)
      .map(([memberId, stats], index) => `${index + 1}. <@${memberId}> - ${stats.points || 0} points, ${stats.wins || 0} wins`);

    const embed = new EmbedBuilder()
      .setTitle('Event Leaderboard')
      .setDescription(rows.length ? rows.join('\n') : 'No event stats saved yet.')
      .setColor(0xa78bfa);

    await interaction.reply({ embeds: [embed] });
  }
};
