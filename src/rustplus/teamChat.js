const dataStore = require('./dataStore');
const { getGrid } = require('./grid');
const { MarkerType } = require('./events');
const rustlabs = require('./rustlabs');
const turret = require('./turret');

const DEFAULT_PREFIX = '!';

function help(prefix) {
  return [
    `${prefix}time`, `${prefix}pop`, `${prefix}online`, `${prefix}wipe`,
    `${prefix}leader`, `${prefix}cargo`, `${prefix}heli`,
    `${prefix}device <name> on|off`, `${prefix}turret <count>`,
    `${prefix}craft <item>`, `${prefix}recycle <item>`
  ].join('  ');
}

async function getSettings(serverKey) {
  const store = await dataStore.get();
  return store.settings[serverKey] || {};
}

/**
 * Handle a single in-game team chat message. Returns a reply string (already
 * sent in-game by this function) or null when the message is not a command.
 */
async function handleCommand({ instance, server }, message) {
  const serverKey = dataStore.serverKey(server.guildId, server.serverId);
  const settings = await getSettings(serverKey);
  const prefix = settings.commandPrefix || DEFAULT_PREFIX;

  const text = String(message.message || '').trim();
  if (!text.startsWith(prefix)) {
    return null;
  }

  const withoutPrefix = text.slice(prefix.length).trim();
  const [command, ...args] = withoutPrefix.split(/\s+/);
  const cmd = (command || '').toLowerCase();
  const argString = args.join(' ');

  let reply = null;

  try {
    switch (cmd) {
      case 'help':
        reply = `Commands: ${help(prefix)}`;
        break;

      case 'time': {
        const time = await instance.getTime();
        reply = `In-game time: ${formatGameTime(time)}`;
        break;
      }

      case 'pop': {
        const info = await instance.getInfo();
        reply = `Population: ${info.players}/${info.maxPlayers}${info.queuedPlayers ? ` (+${info.queuedPlayers} queued)` : ''}`;
        break;
      }

      case 'online':
      case 'team': {
        const team = await instance.getTeamInfo();
        const online = (team.members || []).filter((m) => m.isOnline);
        reply = `Online (${online.length}): ${online.map((m) => m.name).join(', ') || 'nobody'}`;
        break;
      }

      case 'wipe': {
        reply = await nextWipeText(server);
        break;
      }

      case 'leader': {
        await instance.promoteToLeader(message.steamId);
        reply = `${message.name} promoted to team leader.`;
        break;
      }

      case 'cargo':
      case 'heli': {
        reply = await eventStatus(instance, cmd);
        break;
      }

      case 'device':
      case 'switch': {
        reply = await toggleDevice(instance, serverKey, args);
        break;
      }

      case 'turret': {
        const count = Number(args[0]);
        reply = Number.isFinite(count) ? turret.calculate(count).summary : `Usage: ${prefix}turret <count>`;
        break;
      }

      case 'craft': {
        const data = rustlabs.getCraft(argString);
        reply = data
          ? `${data.item.name} craft: ${data.ingredients.map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'n/a'}`
          : `No craft data for "${argString}"`;
        break;
      }

      case 'recycle': {
        const data = rustlabs.getRecycle(argString);
        reply = data
          ? `${data.item.name} recycles into: ${data.yield.map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'nothing'}`
          : `No recycle data for "${argString}"`;
        break;
      }

      default:
        reply = `Unknown command. ${help(prefix)}`;
        break;
    }
  } catch (error) {
    reply = `Error: ${error.message || error}`;
  }

  if (reply) {
    await instance.sendTeamMessage(reply).catch(() => {});
  }
  return reply;
}

function formatGameTime(time) {
  const t = time?.time ?? time;
  if (typeof t !== 'number') {
    return 'unknown';
  }
  const hours = Math.floor(t);
  const minutes = Math.floor((t - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

async function nextWipeText(server) {
  try {
    const { readState } = require('../utils/store');
    const state = await readState();
    const wipe = (state.wipes || []).find((w) => w.server.toLowerCase() === (server.name || '').toLowerCase()) || state.wipes?.[0];
    return wipe ? `Next wipe (${wipe.server}): ${wipe.date}` : 'No wipe schedule saved.';
  } catch {
    return 'No wipe schedule saved.';
  }
}

async function eventStatus(instance, kind) {
  const markers = await instance.getMapMarkers();
  const info = await instance.getInfo().catch(() => null);
  const mapSize = info?.mapSize;
  const wanted = kind === 'cargo' ? MarkerType.CargoShip : MarkerType.PatrolHelicopter;
  const found = markers.filter((m) => m.type === wanted);
  if (!found.length) {
    return `No ${kind === 'cargo' ? 'Cargo Ship' : 'Patrol Helicopter'} currently on the map.`;
  }
  const grids = found.map((m) => getGrid(m.x, m.y, mapSize) || 'ocean').join(', ');
  return `${kind === 'cargo' ? 'Cargo Ship' : 'Patrol Helicopter'} at: ${grids}`;
}

async function toggleDevice(instance, serverKey, args) {
  const state = (args[args.length - 1] || '').toLowerCase();
  const name = args.slice(0, -1).join(' ');
  if (!name || !['on', 'off'].includes(state)) {
    return 'Usage: device <name> on|off';
  }
  const store = await dataStore.get();
  const devices = store.devices[serverKey] || {};
  const device = Object.values(devices).find((d) => d.name?.toLowerCase() === name.toLowerCase());
  if (!device) {
    return `No paired device named "${name}".`;
  }
  await instance.setEntityValue(device.entityId, state === 'on');
  return `${device.name} turned ${state}.`;
}

module.exports = { handleCommand, DEFAULT_PREFIX, help };
