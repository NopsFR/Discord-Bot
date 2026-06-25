const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readState } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('findplayers')
    .setDescription('Find linked players by partial Discord, Steam name, or Steam ID.')
    .addStringOption((option) => option.setName('query').setDescription('Partial username, Steam name, or Steam ID.').setRequired(true)),

  async execute(interaction) {
    const query = interaction.options.getString('query', true).toLowerCase();
    const state = await readState();
    const results = [];

    for (const [memberId, link] of Object.entries(state.steamLinks)) {
      const member = await interaction.guild.members.fetch(memberId).catch(() => null);
      const haystack = [member?.user?.username, member?.displayName, link.steamName, link.steamId].filter(Boolean).join(' ').toLowerCase();
      if (haystack.includes(query)) {
        results.push(`${member || `<@${memberId}>`} - ${link.steamName || 'Unknown Steam name'} - \`${link.steamId}\``);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('Player Search')
      .setDescription(results.length ? results.slice(0, 20).join('\n') : 'No linked players matched that search.')
      .setColor(0x38bdf8);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
