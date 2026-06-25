const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move all users from one voice channel to your voice channel.')
    .addChannelOption((option) => option.setName('from').setDescription('Voice channel to move users from.')),

  async execute(interaction) {
    if (!isAdmin(interaction)) {
      await interaction.reply({ content: 'Only admins can move voice users.', ephemeral: true });
      return;
    }

    const targetChannel = interaction.member?.voice?.channel;
    if (!targetChannel) {
      await interaction.reply({ content: 'Join the destination voice channel first.', ephemeral: true });
      return;
    }

    const sourceChannel = interaction.options.getChannel('from') || targetChannel;
    const members = [...sourceChannel.members.values()].filter((member) => member.id !== interaction.user.id);
    let moved = 0;

    for (const member of members) {
      await member.voice.setChannel(targetChannel, `Moved by ${interaction.user.tag}`);
      moved += 1;
    }

    await interaction.reply({ content: `Moved ${moved} member(s) to ${targetChannel}.`, ephemeral: true });
  }
};
