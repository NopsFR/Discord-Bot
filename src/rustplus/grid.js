// Rust map grid cell size (constant used by the Rust+ companion app).
const GRID_DIAMETER = 146.28571428571428;

function numberToLetters(num) {
  let letters = '';
  let n = num;
  while (n >= 0) {
    letters = String.fromCharCode((n % 26) + 65) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

/**
 * Convert a Rust world coordinate into a grid reference (e.g. "G12").
 * Returns null when the position is outside the playable map (ocean).
 */
function getGrid(x, y, mapSize) {
  if (!mapSize || x == null || y == null) {
    return null;
  }
  if (x < 0 || x > mapSize || y < 0 || y > mapSize) {
    return null;
  }

  const numberOfGrids = Math.floor(mapSize / GRID_DIAMETER);
  const col = Math.floor(x / GRID_DIAMETER);
  const row = numberOfGrids - Math.floor(y / GRID_DIAMETER);
  return `${numberToLetters(col)}${row >= 0 ? row : 0}`;
}

module.exports = { getGrid, numberToLetters, GRID_DIAMETER };
