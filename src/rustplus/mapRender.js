const Jimp = require('jimp');

/**
 * Render points onto a Rust map image.
 * @param {object} map      result of getMap() (has jpgImage, width, height, oceanMargin)
 * @param {number} mapSize  world size from getInfo().mapSize
 * @param {Array<{x:number,y:number,color?:number,label?:string}>} points
 * @returns {Promise<Buffer>} PNG buffer
 */
async function renderPoints(map, mapSize, points) {
  const image = await Jimp.read(Buffer.from(map.jpgImage));
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  // Map markers in Rust use an ocean margin around the playable area.
  const margin = map.oceanMargin || 0;
  const playable = mapSize;
  const scale = (width - margin * 2) / playable;

  for (const point of points) {
    const px = Math.round(margin + point.x * scale);
    // World Y origin is bottom-left; image Y origin is top-left.
    const py = Math.round(height - margin - point.y * scale);
    drawMarker(image, px, py, point.color ?? Jimp.rgbaToInt(239, 68, 68, 255));
  }

  return image.getBufferAsync(Jimp.MIME_PNG);
}

function drawMarker(image, cx, cy, color, size = 6) {
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  for (let dx = -size; dx <= size; dx++) {
    for (let dy = -size; dy <= size; dy++) {
      if (dx * dx + dy * dy > size * size) {
        continue;
      }
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        image.setPixelColor(color, x, y);
      }
    }
  }
}

module.exports = { renderPoints };
