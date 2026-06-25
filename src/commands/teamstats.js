const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getInstance } = require('../rustplus/active');
const tracking = require('../rustplus/tracking');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('teamstats')
    .setDescription('Show team play time and AFK time accumulated this wipe.'),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const instance = getInstance(interaction);
      const stats = await tracking.getStats(instance.server);
      const entries = Object.values(stats);

      if (!entries.length) {
        await interaction.editReply('No team statistics recorded yet. Stats accumulate while the bot is connected.');
        return;
      }

      entries.sort((a, b) => b.playtime - a.playtime);
      const totalPlay = entries.reduce((sum, s) => sum + (s.playtime || 0), 0);
      const totalAfk = entries.reduce((sum, s) => sum + (s.afktime || 0), 0);

      const embed = new EmbedBuilder()
        .setTitle('Team Statistics (this wipe)')
        .setColor(0x3b82f6)
        .setDescription(
          entries.map((s) =>
            `**${s.name}** — Played ${tracking.formatDuration(s.playtime)}, AFK ${tracking.formatDuration(s.afktime)}`
          ).join('\n')
        )
        .addFields(
          { name: 'Total Play Time', value: tracking.formatDuration(totalPlay), inline: true },
          { name: 'Total AFK Time', value: tracking.formatDuration(totalAfk), inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`Could not fetch team stats: ${error.message}`);
    }
  }
};
