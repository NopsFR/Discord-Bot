const items = require('./data/items.json');

// Build lookup tables once at load.
const byId = new Map();
const byShortname = new Map();
const list = [];

for (const [id, item] of Object.entries(items)) {
  const record = { id, name: item.name, shortname: item.shortname, description: item.description };
  byId.set(id, record);
  byId.set(Number(id), record);
  byShortname.set(item.shortname.toLowerCase(), record);
  list.push(record);
}

function getById(id) {
  return byId.get(id) || byId.get(String(id)) || byId.get(Number(id)) || null;
}

function nameById(id) {
  const item = getById(id);
  return item ? item.name : `Item ${id}`;
}

/**
 * Fuzzy search by display name or shortname. Returns best matches first.
 */
function search(query, limit = 10) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) {
    return [];
  }

  const exact = byShortname.get(q);
  const scored = [];

  for (const item of list) {
    const name = item.name.toLowerCase();
    const shortname = item.shortname.toLowerCase();
    let score = 0;
    if (name === q || shortname === q) {
      score = 100;
    } else if (name.startsWith(q) || shortname.startsWith(q)) {
      score = 60;
    } else if (name.includes(q) || shortname.includes(q)) {
      score = 30;
    }
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.item.name.length - b.item.name.length);
  const results = scored.map((entry) => entry.item);

  if (exact && !results.includes(exact)) {
    results.unshift(exact);
  }

  return results.slice(0, limit);
}

module.exports = { getById, nameById, search, all: list };
