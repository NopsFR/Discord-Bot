const { getGrid } = require('./grid');

const MarkerType = {
  Player: 1,
  Explosion: 2,
  VendingMachine: 3,
  CH47: 4,
  CargoShip: 5,
  Crate: 6,
  GenericRadius: 7,
  PatrolHelicopter: 8
};

function indexById(markers) {
  const map = new Map();
  for (const marker of markers) {
    map.set(marker.id, marker);
  }
  return map;
}

/**
 * Diff the previous and current map markers and produce human readable server
 * event notifications (heli, cargo, chinook, locked crate, explosions).
 *
 * @returns {Array<{ kind: string, title: string, text: string }>}
 */
function detectEvents(previous, current, mapSize) {
  const prev = indexById(previous || []);
  const curr = indexById(current || []);
  const events = [];

  const gridOf = (marker) => getGrid(marker.x, marker.y, mapSize) || 'the ocean';

  // Appeared markers
  for (const [id, marker] of curr) {
    if (prev.has(id)) {
      continue;
    }
    switch (marker.type) {
      case MarkerType.CargoShip:
        events.push({ kind: 'events', title: 'Cargo Ship', text: `Cargo Ship entered the map at ${gridOf(marker)}.` });
        break;
      case MarkerType.PatrolHelicopter:
        events.push({ kind: 'events', title: 'Patrol Helicopter', text: `Patrol Helicopter is roaming at ${gridOf(marker)}.` });
        break;
      case MarkerType.CH47:
        events.push({ kind: 'events', title: 'Chinook 47', text: `Chinook 47 entered the map at ${gridOf(marker)} (locked crate inbound).` });
        break;
      case MarkerType.Crate:
        events.push({ kind: 'events', title: 'Locked Crate', text: `A locked crate is available at ${gridOf(marker)}.` });
        break;
      case MarkerType.Explosion:
        events.push({ kind: 'events', title: 'Explosion', text: `Explosion detected at ${gridOf(marker)} (Bradley / Heli crate).` });
        break;
      default:
        break;
    }
  }

  // Disappeared markers (cargo / heli leaving)
  for (const [id, marker] of prev) {
    if (curr.has(id)) {
      continue;
    }
    switch (marker.type) {
      case MarkerType.CargoShip:
        events.push({ kind: 'events', title: 'Cargo Ship', text: 'Cargo Ship has left the map.' });
        break;
      case MarkerType.PatrolHelicopter:
        events.push({ kind: 'events', title: 'Patrol Helicopter', text: 'Patrol Helicopter is no longer on the map (downed or left).' });
        break;
      default:
        break;
    }
  }

  return events;
}

module.exports = { detectEvents, MarkerType };
