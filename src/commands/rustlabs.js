const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const rustlabs = require('../rustplus/rustlabs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rustlabs')
    .setDescription('Rust Labs data: crafting, recycling, decay and despawn times.')
    .addSubcommand((s) =>
      s.setName('craft').setDescription('Crafting cost for an item.')
        .addStringOption((o) => o.setName('item').setDescription('Item name').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('recycle').setDescription('Recycler output for an item.')
        .addStringOption((o) => o.setName('item').setDescription('Item name').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('decay').setDescription('Decay / HP info for a building block or item.')
        .addStringOption((o) => o.setName('item').setDescription('Item name').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('despawn').setDescription('Ground despawn time for an item.')
        .addStringOption((o) => o.setName('item').setDescription('Item name').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const query = interaction.options.getString('item', true);

    if (sub === 'craft') {
      const data = rustlabs.getCraft(query);
      if (!data) return interaction.reply({ content: `No item matches "${query}".`, ephemeral: true });
      const embed = new EmbedBuilder().setTitle(`Craft: ${data.item.name}`).setColor(0xd97706)
        .setDescription(data.ingredients.length ? data.ingredients.map((i) => `${i.quantity}x ${i.name}`).join('\n') : 'Not craftable.')
        .addFields(
          { name: 'Workbench', value: String(data.workbench || 'None'), inline: true },
          { name: 'Time', value: String(data.time || 'n/a'), inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'recycle') {
      const data = rustlabs.getRecycle(query);
      if (!data) return interaction.reply({ content: `No item matches "${query}".`, ephemeral: true });
      const embed = new EmbedBuilder().setTitle(`Recycle: ${data.item.name}`).setColor(0x22c55e)
        .setDescription(data.yield.length ? data.yield.map((i) => `${i.quantity}x ${i.name}`).join('\n') : 'No recycle output.');
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'decay') {
      const data = rustlabs.getDecay(query);
      if (!data) return interaction.reply({ content: `No item matches "${query}".`, ephemeral: true });
      const embed = new EmbedBuilder().setTitle(`Decay: ${data.item.name}`).setColor(0x9ca3af)
        .addFields(
          { name: 'HP', value: String(data.hp || 'n/a'), inline: true },
          { name: 'Decay', value: String(data.decay || 'n/a'), inline: true }
        );
      if (data.decayOutside) embed.addFields({ name: 'Outside', value: String(data.decayOutside), inline: true });
      if (data.decayInside) embed.addFields({ name: 'Inside', value: String(data.decayInside), inline: true });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'despawn') {
      const data = rustlabs.getDespawn(query);
      if (!data) return interaction.reply({ content: `No item matches "${query}".`, ephemeral: true });
      const embed = new EmbedBuilder().setTitle(`Despawn: ${data.item.name}`).setColor(0x6b7280)
        .setDescription(`Ground despawn time: **${data.time || 'unknown'}**`);
      return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply({ content: 'Unknown subcommand.', ephemeral: true });
  }
};
