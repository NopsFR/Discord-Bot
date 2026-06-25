const { SlashCommandBuilder } = require('discord.js');
const { readState } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emergency')
    .setDescription('Send emergency DM notifications to linked team members.')
    .addStringOption((option) => option.setName('message').setDescription('Emergency message.').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const message = interaction.options.getString('message', true);
    const state = await readState();
    const memberIds = Object.keys(state.steamLinks).filter((id) => id !== interaction.user.id);
    let sent = 0;
    let failed = 0;

    for (const memberId of memberIds) {
      const user = await interaction.client.users.fetch(memberId).catch(() => null);
      if (!user) {
        failed += 1;
        continue;
      }

      try {
        await user.send(`Emergency from ${interaction.user.tag}: ${message}`);
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    await interaction.editReply(`Emergency sent to ${sent} linked member(s). ${failed} failed.`);
  }
};
