const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getInstance } = require('../rustplus/active');
const items = require('../rustplus/items');
const { MarkerType } = require('../rustplus/events');
const { getGrid } = require('../rustplus/grid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vending')
    .setDescription('Search vending machines on the map for an item.')
    .addStringOption((o) => o.setName('item').setDescription('Item name to search for').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const instance = getInstance(interaction);
      const query = interaction.options.getString('item', true);
      const match = items.search(query, 1)[0];
      if (!match) {
        await interaction.editReply(`No Rust item matches "${query}".`);
        return;
      }

      const [markers, info] = await Promise.all([instance.getMapMarkers(), instance.getInfo().catch(() => null)]);
      const mapSize = info?.mapSize;
      const results = [];

      for (const marker of markers) {
        if (marker.type !== MarkerType.VendingMachine || !marker.sellOrders) {
          continue;
        }
        for (const order of marker.sellOrders) {
          if (String(order.itemId) === String(match.id) && order.amountInStock > 0) {
            const currency = items.nameById(order.currencyId);
            results.push({
              grid: getGrid(marker.x, marker.y, mapSize) || 'ocean',
              shop: marker.name || 'Vending Machine',
              quantity: order.quantity,
              cost: order.costPerItem,
              currency,
              stock: order.amountInStock,
              blueprint: order.itemIsBlueprint
            });
          }
        }
      }

      if (!results.length) {
        await interaction.editReply(`No vending machine currently sells **${match.name}**.`);
        return;
      }

      results.sort((a, b) => a.cost - b.cost);
      const embed = new EmbedBuilder()
        .setTitle(`Vending Machines selling ${match.name}`)
        .setColor(0xd97706)
        .setDescription(
          results.slice(0, 15).map((r) =>
            `**${r.grid}** — ${r.quantity}x${r.blueprint ? ' (BP)' : ''} for ${r.cost}x ${r.currency} (stock: ${r.stock})`
          ).join('\n')
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`Vending search failed: ${error.message}`);
    }
  }
};
