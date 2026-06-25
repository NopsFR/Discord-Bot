const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const rustPlus = require('../services/rustPlusService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Download and post the current Rust+ map image.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const mapPath = await rustPlus.getMapImage();
      const attachment = new AttachmentBuilder(mapPath, { name: 'rust-map.jpg' });
      await interaction.editReply({ content: 'Current Rust map:', files: [attachment] });
    } catch (error) {
      await interaction.editReply(`Could not fetch the Rust+ map: ${error.message}`);
    }
  }
};
