const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../config');
const pairingFlow = require('../rustplus/pairingFlow');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pair')
    .setDescription('Link your Rust+ (Steam) account so the bot can use Rust+ on your behalf.'),

  async execute(interaction) {
    const session = pairingFlow.createSession(interaction.user.id);
    const base = config.publicUrl || `http://localhost:${config.port}`;
    const url = `${base}/rustplus/login?session=${session.sessionId}`;

    const embed = new EmbedBuilder()
      .setTitle('Rust+ Login')
      .setColor(0xd97706)
      .setDescription(
        [
          '**1.** Open your personal Rust+ login link below.',
          '**2.** Sign in with Steam to link your Rust+ account.',
          '**3.** In game, open **Rust+** → pair your server and smart devices.',
          '',
          'Pairing notifications are delivered to the bot automatically. Your server connects within a few seconds of pairing.',
          '',
          `[Open your Rust+ Login page](${url})`,
          '',
          '_The link is private to you and expires in 15 minutes._'
        ].join('\n')
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
