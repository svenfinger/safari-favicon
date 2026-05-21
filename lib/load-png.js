import fs from 'node:fs/promises';
import { PNG } from 'pngjs';
import { FAVICON_SIZE } from './constants.js';

/**
 * @typedef {import('./analyze.js').ImageDataLike} ImageDataLike
 */

/**
 * Stretch source RGBA to dstW×dstH (sharp `fit: 'fill'`).
 * @param {Buffer | Uint8Array} src
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} dstW
 * @param {number} dstH
 * @returns {Uint8ClampedArray}
 */
function resizeFillRgba(src, srcW, srcH, dstW, dstH) {
  const out = new Uint8ClampedArray(dstW * dstH * 4);
  const xScale = srcW / dstW;
  const yScale = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const sy = (y + 0.5) * yScale - 0.5;
    const y0 = Math.max(0, Math.floor(sy));
    const y1 = Math.min(srcH - 1, y0 + 1);
    const fy = sy - y0;

    for (let x = 0; x < dstW; x++) {
      const sx = (x + 0.5) * xScale - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const x1 = Math.min(srcW - 1, x0 + 1);
      const fx = sx - x0;
      const o = (y * dstW + x) * 4;

      for (let c = 0; c < 4; c++) {
        const v00 = src[(y0 * srcW + x0) * 4 + c];
        const v10 = src[(y0 * srcW + x1) * 4 + c];
        const v01 = src[(y1 * srcW + x0) * 4 + c];
        const v11 = src[(y1 * srcW + x1) * 4 + c];
        out[o + c] = Math.round(
          v00 * (1 - fx) * (1 - fy) +
            v10 * fx * (1 - fy) +
            v01 * (1 - fx) * fy +
            v11 * fx * fy,
        );
      }
    }
  }
  return out;
}

/**
 * Load a PNG from disk, scale to Safari tab size (16×16), return RGBA pixels.
 * @param {string} filePath
 * @returns {Promise<ImageDataLike>}
 */
export async function loadPngFromPath(filePath) {
  const buffer = await fs.readFile(filePath);
  let png;
  try {
    png = PNG.sync.read(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid PNG';
    throw new Error(message);
  }

  const { width, height, data } = png;
  if (width === FAVICON_SIZE && height === FAVICON_SIZE) {
    return {
      data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
      width,
      height,
    };
  }

  return {
    data: resizeFillRgba(data, width, height, FAVICON_SIZE, FAVICON_SIZE),
    width: FAVICON_SIZE,
    height: FAVICON_SIZE,
  };
}
