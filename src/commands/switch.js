const { SlashCommandBuilder } = require('discord.js');
const rustPlus = require('../services/rustPlusService');
const { getInstanceOrNull } = require('../rustplus/active');
const { isAdmin } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('switch')
    .setDescription('Turn a Rust smart switch on or off.')
    .addStringOption((option) =>
      option
        .setName('entity_id')
        .setDescription('The Rust smart switch entity ID.')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('state')
        .setDescription('Whether to turn the switch on or off.')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )
    ),

  async execute(interaction) {
    if (!isAdmin(interaction)) {
      await interaction.reply({ content: 'Only Discord admins can control Rust smart switches.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const entityId = interaction.options.getString('entity_id', true);
    const state = interaction.options.getString('state', true);

    try {
      const instance = getInstanceOrNull(interaction);
      if (instance) {
        await instance.setEntityValue(entityId, state === 'on');
      } else {
        await rustPlus.setSwitch(entityId, state);
      }
      await interaction.editReply(`Smart switch ${entityId} turned ${state}.`);
    } catch (error) {
      await interaction.editReply(`Could not control smart switch: ${error.message}`);
    }
  }
};
