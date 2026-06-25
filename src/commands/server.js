const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rustPlus = require('../services/rustPlusService');
const { getInstanceOrNull } = require('../rustplus/active');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Show Rust+ server info and population.'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const instance = getInstanceOrNull(interaction);
      const info = instance ? await instance.getInfo() : await rustPlus.getServerInfo();
      const embed = new EmbedBuilder()
        .setTitle(info.name || 'Rust Server')
        .setColor(0xd97706)
        .addFields(
          { name: 'Players', value: String(info.players ?? info.playerCount ?? 'Unknown'), inline: true },
          { name: 'Max Players', value: String(info.maxPlayers ?? info.capacity ?? 'Unknown'), inline: true },
          { name: 'Size', value: String(info.size ?? 'Unknown'), inline: true },
          { name: 'Map', value: String(info.map || info.mapName || 'Unknown'), inline: true },
          { name: 'Wipe Time', value: String(info.wipeTime || info.lastWipe || 'Use /wipe for saved schedules'), inline: false }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`Could not fetch Rust+ server info: ${error.message}`);
    }
  }
};
