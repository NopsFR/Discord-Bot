const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder
} = require('discord.js');
const { readState, writeState } = require('../utils/store');
const { isAdmin } = require('../utils/permissions');

function inviteButton(customId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customId)
      .setLabel('Get Clan Invite')
      .setStyle(ButtonStyle.Primary)
  );
}

async function createInvite(interaction, mass) {
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: 'Only admins can create clan invite embeds.', ephemeral: true });
    return;
  }

  const role = interaction.options.getRole('role', true);
  const title = interaction.options.getString('title') || 'Clan Invite';
  const body = interaction.options.getString('message') || 'Press the button below to get access.';
  const customId = mass ? `massinvite:${role.id}` : `claninvite:${role.id}`;

  const state = await readState();
  state.clanInvites[customId] = {
    roleId: role.id,
    mass,
    createdAt: new Date().toISOString(),
    createdBy: interaction.user.id
  };
  await writeState(state);

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(body)
    .setColor(0x5865f2);

  await interaction.reply({ embeds: [embed], components: [inviteButton(customId)] });
}

module.exports = {
  createInviteCommand: {
    data: new SlashCommandBuilder()
      .setName('createinvite')
      .setDescription('Create a clan invite embed that users can press to get a clan invite role.')
      .addRoleOption((option) => option.setName('role').setDescription('Role to give when pressed.').setRequired(true))
      .addStringOption((option) => option.setName('title').setDescription('Embed title.'))
      .addStringOption((option) => option.setName('message').setDescription('Embed message.')),

    execute(interaction) {
      return createInvite(interaction, false);
    }
  },

  makeMassInviteCommand: {
    data: new SlashCommandBuilder()
      .setName('makemassinvite')
      .setDescription('Create a bind command to mass invite linked players.')
      .addRoleOption((option) => option.setName('role').setDescription('Role to give when pressed.').setRequired(true))
      .addStringOption((option) => option.setName('title').setDescription('Embed title.'))
      .addStringOption((option) => option.setName('message').setDescription('Embed message.')),

    execute(interaction) {
      return createInvite(interaction, true);
    }
  },

  async handleButton(interaction) {
    if (!interaction.customId.startsWith('claninvite:') && !interaction.customId.startsWith('massinvite:')) {
      return false;
    }

    const roleId = interaction.customId.split(':')[1];
    const role = interaction.guild.roles.cache.get(roleId);
    const member = interaction.member;

    if (!role || !member) {
      await interaction.reply({ content: 'This invite is no longer valid.', ephemeral: true });
      return true;
    }

    await member.roles.add(role);
    await interaction.reply({ content: `You now have ${role}.`, ephemeral: true });
    return true;
  }
};
