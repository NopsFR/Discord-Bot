const recycleData = require('./data/rustlabsRecycleData.json');
const craftData = require('./data/rustlabsCraftData.json');
const decayData = require('./data/rustlabsDecayData.json');
const despawnData = require('./data/rustlabsDespawnData.json');
const items = require('./items');

function resolveItem(query) {
  const matches = items.search(query, 1);
  return matches[0] || null;
}

/**
 * Recycler output for an item. Returns { item, recycler: [{name, quantity}] }.
 */
function getRecycle(query, recyclerType = 'recycler') {
  const item = resolveItem(query);
  if (!item) {
    return null;
  }
  const entry = recycleData[item.id];
  if (!entry || !entry[recyclerType]) {
    return { item, yield: [], efficiency: null };
  }
  const data = entry[recyclerType];
  const result = (data.yield || []).map((y) => ({
    name: items.nameById(y.id),
    quantity: y.quantity,
    probability: y.probability
  }));
  return { item, yield: result, efficiency: data.efficiency };
}

/**
 * Crafting cost for an item.
 */
function getCraft(query) {
  const item = resolveItem(query);
  if (!item) {
    return null;
  }
  const entry = craftData[item.id];
  if (!entry) {
    return { item, ingredients: [], time: null };
  }
  const ingredients = (entry.ingredients || []).map((ing) => ({
    name: items.nameById(ing.id),
    quantity: ing.quantity
  }));
  return {
    item,
    ingredients,
    time: entry.timeString || (entry.time ? `${entry.time}s` : null),
    workbench: entry.workbench ? items.nameById(entry.workbench) : 'None'
  };
}

/**
 * Decay information for a building block / item.
 */
function getDecay(query) {
  const item = resolveItem(query);
  if (!item) {
    return null;
  }
  const entry = decayData.items?.[item.id] || decayData[item.id];
  if (!entry) {
    return { item, decay: null };
  }
  return {
    item,
    hp: entry.hpString || entry.hp,
    decay: entry.decayString || entry.decay,
    decayOutside: entry.decayOutsideString,
    decayInside: entry.decayInsideString
  };
}

function getDespawn(query) {
  const item = resolveItem(query);
  if (!item) {
    return null;
  }
  const entry = despawnData[item.id];
  return { item, time: entry ? entry.timeString : null };
}

module.exports = { getRecycle, getCraft, getDecay, getDespawn, resolveItem };
