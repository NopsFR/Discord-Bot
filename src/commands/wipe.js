const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readState, upsertWipe } = require('../utils/store');
const { isAdmin } = require('../utils/permissions');

function formatWipe(wipe) {
  const notes = wipe.notes ? ` - ${wipe.notes}` : '';
  return `**${wipe.server}**: ${wipe.date}${notes}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wipe')
    .setDescription('View or save Rust server wipe schedules.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Show saved wipe schedules.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Save a wipe schedule for a server.')
        .addStringOption((option) =>
          option.setName('server').setDescription('Server name.').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('date').setDescription('Wipe date/time, for example 2026-07-04 19:00 UK.').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('notes').setDescription('Optional notes like weekly, monthly, BP wipe, or map wipe.')
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      if (!isAdmin(interaction)) {
        await interaction.reply({ content: 'Only Discord admins can set wipe schedules.', ephemeral: true });
        return;
      }

      const wipe = {
        server: interaction.options.getString('server', true),
        date: interaction.options.getString('date', true),
        notes: interaction.options.getString('notes') || ''
      };

      await upsertWipe(wipe);
      await interaction.reply(`Saved wipe schedule for **${wipe.server}**: ${wipe.date}`);
      return;
    }

    const state = await readState();
    const description = state.wipes.length
      ? state.wipes.map(formatWipe).join('\n')
      : 'No wipe schedules saved yet. Admins can add one with `/wipe set`.';

    const embed = new EmbedBuilder()
      .setTitle('Rust Wipe Schedules')
      .setDescription(description)
      .setColor(0x5865f2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
