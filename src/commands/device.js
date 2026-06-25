const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin } = require('../utils/permissions');
const dataStore = require('../rustplus/dataStore');
const { getInstance } = require('../rustplus/active');

async function getGuildDevices(guildId) {
  const store = await dataStore.get();
  const result = [];
  for (const [key, devices] of Object.entries(store.devices)) {
    if (key.startsWith(`${guildId}:`)) {
      for (const device of Object.values(devices)) {
        result.push({ key, ...device });
      }
    }
  }
  return result;
}

function findDevice(devices, nameOrId) {
  const needle = String(nameOrId).toLowerCase();
  return devices.find((d) => String(d.entityId) === String(nameOrId) || d.name?.toLowerCase() === needle);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('device')
    .setDescription('Manage and control paired Rust+ smart devices.')
    .addSubcommand((s) => s.setName('list').setDescription('List paired smart devices.'))
    .addSubcommand((s) =>
      s.setName('rename').setDescription('Rename a smart device.')
        .addStringOption((o) => o.setName('device').setDescription('Current name or entity id').setRequired(true))
        .addStringOption((o) => o.setName('name').setDescription('New name').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('group').setDescription('Assign a device to a group.')
        .addStringOption((o) => o.setName('device').setDescription('Name or entity id').setRequired(true))
        .addStringOption((o) => o.setName('group').setDescription('Group name').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('on').setDescription('Turn a smart switch on.')
        .addStringOption((o) => o.setName('device').setDescription('Name or entity id').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('off').setDescription('Turn a smart switch off.')
        .addStringOption((o) => o.setName('device').setDescription('Name or entity id').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const devices = await getGuildDevices(interaction.guildId);

    if (sub === 'list') {
      if (!devices.length) {
        await interaction.reply({ content: 'No smart devices paired yet. Pair them in the Rust+ app after `/pair`.', ephemeral: true });
        return;
      }
      const embed = new EmbedBuilder().setTitle('Paired Smart Devices').setColor(0x22c55e);
      const byGroup = {};
      for (const d of devices) {
        const g = d.group || 'Ungrouped';
        byGroup[g] = byGroup[g] || [];
        byGroup[g].push(`${d.name} — ${d.typeName} (id ${d.entityId})`);
      }
      for (const [group, lines] of Object.entries(byGroup)) {
        embed.addFields({ name: group, value: lines.join('\n') });
      }
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const target = findDevice(devices, interaction.options.getString('device', true));
    if (!target) {
      await interaction.reply({ content: 'Device not found. Use `/device list`.', ephemeral: true });
      return;
    }

    if (sub === 'rename' || sub === 'group') {
      const value = interaction.options.getString(sub === 'rename' ? 'name' : 'group', true);
      await dataStore.update((store) => {
        const device = store.devices[target.key]?.[target.entityId];
        if (device) {
          if (sub === 'rename') device.name = value;
          else device.group = value;
        }
        return null;
      });
      await interaction.reply({ content: `Device updated (${sub} → ${value}).`, ephemeral: true });
      return;
    }

    // on / off
    if (!isAdmin(interaction)) {
      await interaction.reply({ content: 'Only admins can control smart devices.', ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    try {
      const instance = getInstance(interaction);
      await instance.setEntityValue(target.entityId, sub === 'on');
      await interaction.editReply(`${target.name} turned ${sub}.`);
    } catch (error) {
      await interaction.editReply(`Could not control device: ${error.message}`);
    }
  }
};
