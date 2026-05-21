/**
 * Pixel coordinates along the outer border of a width×height image.
 * @param {number} width
 * @param {number} height
 * @returns {[number, number][]}
 */
export function edgeCoordinates(width, height) {
  const coords = [];
  for (let x = 0; x < width; x++) {
    coords.push([x, 0], [x, height - 1]);
  }
  for (let y = 1; y < height - 1; y++) {
    coords.push([0, y], [width - 1, y]);
  }
  return coords;
}
