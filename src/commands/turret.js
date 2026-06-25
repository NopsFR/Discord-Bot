const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const turret = require('../rustplus/turret');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('turret')
    .setDescription('Calculate Auto Turret / SAM Site interference.')
    .addIntegerOption((o) =>
      o.setName('count')
        .setDescription('Number of turrets/SAM sites within 30m (including this one)')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const count = interaction.options.getInteger('count', true);
    const result = turret.calculate(count);

    const embed = new EmbedBuilder()
      .setTitle('Auto Turret Interference')
      .setColor(result.disabled ? 0xef4444 : 0x22c55e)
      .setDescription(result.summary)
      .addFields(
        { name: 'Sources within 30m', value: String(result.count), inline: true },
        { name: 'Interference', value: String(result.interference), inline: true },
        { name: 'Until shutdown', value: result.disabled ? 'Disabled' : `${result.remaining} more`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
