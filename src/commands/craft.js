const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readState, writeState } = require('../utils/store');

const recipes = {
  boom: {
    title: 'Boom Craft Bind',
    defaults: ['Rocket launcher', 'Rockets', 'Explosive ammo', 'C4', 'GP', 'Sulfur']
  },
  fullkit: {
    title: 'Fullkit Craft Bind',
    defaults: ['Metal facemask', 'Metal chestplate', 'Hoodie', 'Pants', 'Roadsign gloves', 'Boots', 'Meds', 'Ammo']
  },
  turret: {
    title: 'Auto Turret Craft Bind',
    defaults: ['Auto turret', 'Python/SAR', 'Ammo', 'Electrical branch', 'Wire tool', 'Battery', 'Switch']
  }
};

function makeDescription(items, notes) {
  const lines = items.map((item) => `- ${item}`);
  if (notes) {
    lines.push('', `Notes: ${notes}`);
  }
  return lines.join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Create or view Rust crafting bind commands.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('boom')
        .setDescription('Create a bind command for crafting explosive items.')
        .addStringOption((option) => option.setName('notes').setDescription('Optional custom notes.'))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('fullkit')
        .setDescription('Make a customizable full kit bind.')
        .addBooleanOption((option) => option.setName('hide_meds').setDescription('Remove meds from the kit list.'))
        .addBooleanOption((option) => option.setName('hide_ammo').setDescription('Remove ammo from the kit list.'))
        .addStringOption((option) => option.setName('notes').setDescription('Optional custom notes.'))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('turret')
        .setDescription('Make a customizable auto turret setup bind.')
        .addStringOption((option) => option.setName('notes').setDescription('Optional custom notes.'))
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const notes = interaction.options.getString('notes') || '';
    const recipe = recipes[subcommand];
    let items = [...recipe.defaults];

    if (subcommand === 'fullkit') {
      if (interaction.options.getBoolean('hide_meds')) {
        items = items.filter((item) => item !== 'Meds');
      }
      if (interaction.options.getBoolean('hide_ammo')) {
        items = items.filter((item) => item !== 'Ammo');
      }
    }

    const state = await readState();
    state.craftBinds[`${interaction.user.id}:${subcommand}`] = {
      command: subcommand,
      items,
      notes,
      updatedAt: new Date().toISOString()
    };
    await writeState(state);

    const embed = new EmbedBuilder()
      .setTitle(recipe.title)
      .setDescription(makeDescription(items, notes))
      .setColor(0xd97706);

    await interaction.reply({ embeds: [embed] });
  }
};
