const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rustPlus = require('../services/rustPlusService');

function formatMember(member) {
  const name = member.name || member.displayName || member.steamId || member.id || 'Unknown player';
  const online = member.isOnline ?? member.online ?? member.alive ?? false;
  const status = online ? 'Online' : 'Offline';
  const position = member.x && member.y ? ` (${Math.round(member.x)}, ${Math.round(member.y)})` : '';
  return `${status}: ${name}${position}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('online')
    .setDescription('Show Rust+ team members and who is online.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const teamInfo = await rustPlus.getTeamInfo();
      const members = teamInfo.members || teamInfo.teamMembers || [];

      if (!members.length) {
        await interaction.editReply('Rust+ connected, but no team members were returned. Make sure your player is in a Rust team.');
        return;
      }

      const description = members.map(formatMember).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('Rust Team Online')
        .setDescription(description)
        .setColor(0x3fb950)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`Could not fetch Rust+ team info: ${error.message}`);
    }
  }
};
