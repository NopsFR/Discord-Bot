const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rustPlus = require('../services/rustPlusService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('findofflinetime')
    .setDescription('Analyze current team online data for offline timing hints.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const teamInfo = await rustPlus.getTeamInfo();
      const members = teamInfo.members || teamInfo.teamMembers || [];
      const offline = members.filter((member) => !(member.isOnline ?? member.online ?? member.alive));

      const embed = new EmbedBuilder()
        .setTitle('Offline Time Analysis')
        .setDescription(offline.length ? offline.map((member) => `${member.name || member.steamId || 'Unknown'} is currently offline.`).join('\n') : 'Nobody in the Rust+ team info is currently offline.')
        .setFooter({ text: 'Rust+ does not provide full historical activity by itself. This command will become smarter once uptime snapshots are stored.' })
        .setColor(0xf97316);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`Could not analyze Rust+ team activity: ${error.message}`);
    }
  }
};
