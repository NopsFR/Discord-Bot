async function fetchAllMembers(interaction) {
  try {
    return await interaction.guild.members.fetch();
  } catch (error) {
    throw new Error('I could not fetch all members. Enable Server Members Intent in the Discord Developer Portal, then restart the bot.');
  }
}

module.exports = {
  fetchAllMembers
};
