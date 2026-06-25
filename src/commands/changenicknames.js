const { SlashCommandBuilder } = require('discord.js');
const { readState } = require('../utils/store');
const { isAdmin } = require('../utils/permissions');
const { fetchAllMembers } = require('../utils/members');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changenicknames')
    .setDescription("Change linked members' nicknames to include their Steam names.")
    .addBooleanOption((option) => option.setName('dry_run').setDescription('Preview changes without editing nicknames.')),

  async execute(interaction) {
    if (!isAdmin(interaction)) {
      await interaction.reply({ content: 'Only admins can change nicknames.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const state = await readState();
      const members = await fetchAllMembers(interaction);
      const dryRun = interaction.options.getBoolean('dry_run') ?? true;
      let changed = 0;
      let skipped = 0;

      for (const [memberId, link] of Object.entries(state.steamLinks)) {
        const member = members.get(memberId);
        if (!member || !member.manageable) {
          skipped += 1;
          continue;
        }

        const steamLabel = link.steamName || link.steamId;
        const nickname = `${member.user.username} | ${steamLabel}`.slice(0, 32);

        if (!dryRun) {
          await member.setNickname(nickname, 'Sync nickname with linked Steam name');
        }

        changed += 1;
      }

      await interaction.editReply(`${dryRun ? 'Preview:' : 'Done:'} ${changed} nickname(s) ${dryRun ? 'would be changed' : 'changed'} and ${skipped} skipped. Run with \`dry_run: False\` to apply.`);
    } catch (error) {
      await interaction.editReply(error.message);
    }
  }
};
