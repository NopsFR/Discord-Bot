const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchAllMembers } = require('../utils/members');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('noreact')
    .setDescription("Show members who have not reacted to a message.")
    .addStringOption((option) => option.setName('message_id').setDescription('Message ID to check.').setRequired(true))
    .addChannelOption((option) => option.setName('channel').setDescription('Channel containing the message.'))
    .addStringOption((option) => option.setName('emoji').setDescription('Optional emoji to check.')),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const messageId = interaction.options.getString('message_id', true);
      const emoji = interaction.options.getString('emoji');
      const message = await channel.messages.fetch(messageId);
      const members = await fetchAllMembers(interaction);
      const reacted = new Set();

      for (const reaction of message.reactions.cache.values()) {
        if (emoji && reaction.emoji.name !== emoji && reaction.emoji.toString() !== emoji) {
          continue;
        }

        const users = await reaction.users.fetch();
        users.forEach((user) => reacted.add(user.id));
      }

      const missing = members
        .filter((member) => !member.user.bot && !reacted.has(member.id))
        .map((member) => member.toString())
        .slice(0, 50);

      const embed = new EmbedBuilder()
        .setTitle('Members Without Reaction')
        .setDescription(missing.length ? missing.join('\n') : 'Everyone reacted.')
        .setColor(0xf59e0b);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`Could not check reactions: ${error.message}`);
    }
  }
};
