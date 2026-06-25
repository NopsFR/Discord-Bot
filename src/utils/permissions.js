const { PermissionFlagsBits } = require('discord.js');
const { config } = require('../config');

function isAdmin(interaction) {
  if (!interaction.member) {
    return false;
  }

  const permissions = interaction.member.permissions;
  if (permissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  return interaction.member.roles.cache.some((role) => role.name === config.adminRoleName);
}

module.exports = {
  isAdmin
};
