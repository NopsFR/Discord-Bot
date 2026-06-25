const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readState } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription("View a player's stored stats.")
    .addUserOption((option) => option.setName('member').setDescription('Discord member.'))
    .addStringOption((option) => option.setName('steam_id').setDescription('SteamID64 to look up.')),

  async execute(interaction) {
    const member = interaction.options.getUser('member') || interaction.user;
    const steamId = interaction.options.getString('steam_id');
    const state = await readState();
    const link = steamId
      ? Object.values(state.steamLinks).find((item) => item.steamId === steamId)
      : state.steamLinks[member.id];
    const stats = state.eventStats[member.id] || { events: 0, points: 0, wins: 0 };

    const embed = new EmbedBuilder()
      .setTitle(`Player: ${member.username}`)
      .setColor(0x5865f2)
      .addFields(
        { name: 'Steam ID', value: link?.steamId || steamId || 'Not linked', inline: false },
        { name: 'Steam Name', value: link?.steamName || 'Not saved', inline: true },
        { name: 'Events', value: String(stats.events || 0), inline: true },
        { name: 'Points', value: String(stats.points || 0), inline: true },
        { name: 'Wins', value: String(stats.wins || 0), inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
