const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare voice channel membership against a role or another voice channel.')
    .addChannelOption((option) => option.setName('voice_a').setDescription('First voice channel.').setRequired(true))
    .addChannelOption((option) => option.setName('voice_b').setDescription('Second voice channel to compare.'))
    .addRoleOption((option) => option.setName('role').setDescription('Role to compare against.')),

  async execute(interaction) {
    const voiceA = interaction.options.getChannel('voice_a', true);
    const voiceB = interaction.options.getChannel('voice_b');
    const role = interaction.options.getRole('role');

    if (voiceA.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: '`voice_a` must be a voice channel.', ephemeral: true });
      return;
    }

    const aIds = new Set(voiceA.members.map((member) => member.id));
    let targetIds = new Set();
    let label = '';

    if (voiceB) {
      targetIds = new Set(voiceB.members.map((member) => member.id));
      label = voiceB.name;
    } else if (role) {
      targetIds = new Set(role.members.map((member) => member.id));
      label = role.name;
    } else {
      await interaction.reply({ content: 'Choose either `voice_b` or `role` to compare against.', ephemeral: true });
      return;
    }

    const missing = [...targetIds].filter((id) => !aIds.has(id)).map((id) => `<@${id}>`);
    const extra = [...aIds].filter((id) => !targetIds.has(id)).map((id) => `<@${id}>`);

    const embed = new EmbedBuilder()
      .setTitle(`Compare ${voiceA.name} vs ${label}`)
      .setColor(0x38bdf8)
      .addFields(
        { name: `Missing from ${voiceA.name}`, value: missing.slice(0, 30).join('\n') || 'None', inline: false },
        { name: `Only in ${voiceA.name}`, value: extra.slice(0, 30).join('\n') || 'None', inline: false }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
