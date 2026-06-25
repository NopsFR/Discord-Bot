const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../config');
const { getInstance } = require('../rustplus/active');
const camera = require('../rustplus/camera');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('camera')
    .setDescription('Capture a frame from a Rust+ CCTV camera / drone / turret.')
    .addStringOption((o) =>
      o.setName('identifier').setDescription('Camera identifier (e.g. DOME1, OILRIG1L1, or a custom id)').setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const instance = getInstance(interaction);
      const identifier = interaction.options.getString('identifier', true);
      const frame = await camera.captureFrame(instance, identifier);
      const attachment = new AttachmentBuilder(frame, { name: `${identifier}.png` });

      const base = config.publicUrl || `http://localhost:${config.port}`;
      const stationUrl = `${base}/camera?guild=${interaction.guildId}&id=${encodeURIComponent(identifier)}`;
      const embed = new EmbedBuilder()
        .setTitle(`Camera: ${identifier}`)
        .setColor(0x111827)
        .setImage(`attachment://${identifier}.png`)
        .setDescription(`Live viewing & control: [Camera Station](${stationUrl}) _(offline-only viewing)_`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    } catch (error) {
      await interaction.editReply(`Could not capture camera: ${error.message}`);
    }
  }
};
