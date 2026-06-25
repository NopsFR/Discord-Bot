const { SlashCommandBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Manage custom Discord roles.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('give')
        .setDescription('Give a role to a member.')
        .addUserOption((option) => option.setName('member').setDescription('Member to update.').setRequired(true))
        .addRoleOption((option) => option.setName('role').setDescription('Role to give.').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a member.')
        .addUserOption((option) => option.setName('member').setDescription('Member to update.').setRequired(true))
        .addRoleOption((option) => option.setName('role').setDescription('Role to remove.').setRequired(true))
    ),

  async execute(interaction) {
    if (!isAdmin(interaction)) {
      await interaction.reply({ content: 'Only Discord admins can manage roles with this bot.', ephemeral: true });
      return;
    }

    const member = interaction.options.getMember('member');
    const role = interaction.options.getRole('role');
    const subcommand = interaction.options.getSubcommand();

    if (!member || !role) {
      await interaction.reply({ content: 'Could not find that member or role.', ephemeral: true });
      return;
    }

    if (subcommand === 'give') {
      await member.roles.add(role);
      await interaction.reply({ content: `Gave ${role} to ${member}.`, ephemeral: true });
      return;
    }

    await member.roles.remove(role);
    await interaction.reply({ content: `Removed ${role} from ${member}.`, ephemeral: true });
  }
};
