const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { config } = require('../config');
const { readState } = require('../utils/store');
const { fetchAllMembers } = require('../utils/members');

async function fetchBans(steamIds) {
  const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/');
  url.searchParams.set('key', config.steamApiKey);
  url.searchParams.set('steamids', steamIds.join(','));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Steam API returned ${response.status}.`);
  }

  const data = await response.json();
  return data.players || [];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkgamebans')
    .setDescription('Check linked guild members for Steam game bans.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!config.steamApiKey) {
      await interaction.editReply('Add `STEAM_API_KEY` to `.env` to use this command.');
      return;
    }

    try {
      const [state, members] = await Promise.all([readState(), fetchAllMembers(interaction)]);
      const entries = Object.entries(state.steamLinks).filter(([memberId]) => members.has(memberId));
      const steamIds = entries.map(([, link]) => link.steamId).slice(0, 100);

      if (!steamIds.length) {
        await interaction.editReply('No linked Steam IDs found.');
        return;
      }

      const bans = await fetchBans(steamIds);
      const flagged = bans.filter((ban) => ban.NumberOfGameBans > 0 || ban.VACBanned || ban.CommunityBanned);
      const linkedBySteamId = new Map(entries.map(([memberId, link]) => [link.steamId, memberId]));

      const description = flagged.length
        ? flagged.map((ban) => `<@${linkedBySteamId.get(ban.SteamId)}> - VAC: ${ban.VACBanned ? 'Yes' : 'No'}, Game bans: ${ban.NumberOfGameBans}, Days since last ban: ${ban.DaysSinceLastBan}`).join('\n')
        : 'No VAC, community, or game bans found for linked members.';

      const embed = new EmbedBuilder()
        .setTitle('Steam Game Ban Check')
        .setDescription(description)
        .setColor(flagged.length ? 0xef4444 : 0x22c55e);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`Could not check game bans: ${error.message}`);
    }
  }
};
