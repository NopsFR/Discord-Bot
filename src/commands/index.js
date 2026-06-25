const online = require('./online');
const server = require('./server');
const map = require('./map');
const switchCommand = require('./switch');
const wipe = require('./wipe');
const roles = require('./roles');
const changenicknames = require('./changenicknames');
const changesteam = require('./changesteam');
const checkgamebans = require('./checkgamebans');
const compare = require('./compare');
const craft = require('./craft');
const { createInviteCommand, makeMassInviteCommand, handleButton } = require('./invites');
const emergency = require('./emergency');
const eventleaderboard = require('./eventleaderboard');
const eventstats = require('./eventstats');
const findofflinetime = require('./findofflinetime');
const findplayers = require('./findplayers');
const intel = require('./intel');
const move = require('./move');
const noreact = require('./noreact');
const nosteam = require('./nosteam');
const player = require('./player');
const pair = require('./pair');
const rustservers = require('./rustservers');
const device = require('./device');
const vending = require('./vending');
const track = require('./track');
const rustcamera = require('./rustcamera');
const rustlabs = require('./rustlabs');
const leader = require('./leader');
const deaths = require('./deaths');
const teamstats = require('./teamstats');
const turret = require('./turret');

const commands = [
  pair,
  rustservers,
  device,
  vending,
  track,
  rustcamera,
  rustlabs,
  leader,
  deaths,
  teamstats,
  turret,
  changenicknames,
  changesteam,
  checkgamebans,
  compare,
  craft,
  createInviteCommand,
  emergency,
  eventleaderboard,
  eventstats,
  findofflinetime,
  findplayers,
  intel,
  makeMassInviteCommand,
  move,
  noreact,
  nosteam,
  online,
  player,
  server,
  map,
  switchCommand,
  wipe,
  roles
];

module.exports = {
  commands,
  commandData: commands.map((command) => command.data.toJSON()),
  commandMap: new Map(commands.map((command) => [command.data.name, command])),
  handleButton
};
