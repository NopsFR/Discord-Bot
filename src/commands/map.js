const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const rustPlus = require('../services/rustPlusService');
const { getInstanceOrNull } = require('../rustplus/active');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Download and post the current Rust+ map image.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const instance = getInstanceOrNull(interaction);
      let attachment;
      if (instance) {
        const map = await instance.getMap();
        if (!map?.jpgImage) {
          throw new Error('Rust+ did not return a map image.');
        }
        attachment = new AttachmentBuilder(Buffer.from(map.jpgImage), { name: 'rust-map.jpg' });
      } else {
        const mapPath = await rustPlus.getMapImage();
        attachment = new AttachmentBuilder(mapPath, { name: 'rust-map.jpg' });
      }
      await interaction.editReply({ content: 'Current Rust map:', files: [attachment] });
    } catch (error) {
      await interaction.editReply(`Could not fetch the Rust+ map: ${error.message}`);
    }
  }
};
