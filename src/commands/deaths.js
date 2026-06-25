const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Jimp = require('jimp');
const { getInstance, getInstanceOrNull } = require('../rustplus/active');
const tracking = require('../rustplus/tracking');
const mapRender = require('../rustplus/mapRender');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deaths')
    .setDescription("Show your team's recent death locations.")
    .addBooleanOption((o) => o.setName('map').setDescription('Plot the last deaths on the map image')),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const instance = getInstance(interaction);
      const deaths = (await tracking.getDeaths(instance.server)).slice(0, 5);

      if (!deaths.length) {
        await interaction.editReply('No recent team deaths recorded yet.');
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('Recent Team Deaths')
        .setColor(0x9ca3af)
        .setDescription(
          deaths.map((d, i) =>
            `**${i + 1}.** ${d.name} — ${d.grid || 'unknown'} (${new Date(d.time).toLocaleString()})`
          ).join('\n')
        );

      const files = [];
      if (interaction.options.getBoolean('map')) {
        const inst = getInstanceOrNull(interaction);
        const [map, info] = await Promise.all([inst.getMap(), inst.getInfo().catch(() => null)]);
        if (map?.jpgImage && info?.mapSize) {
          const points = deaths.map((d) => ({ x: d.x, y: d.y, color: Jimp.rgbaToInt(239, 68, 68, 255) }));
          const buffer = await mapRender.renderPoints(map, info.mapSize, points);
          files.push(new AttachmentBuilder(buffer, { name: 'deaths.png' }));
          embed.setImage('attachment://deaths.png');
        }
      }

      await interaction.editReply({ embeds: [embed], files });
    } catch (error) {
      await interaction.editReply(`Could not fetch deaths: ${error.message}`);
    }
  }
};
