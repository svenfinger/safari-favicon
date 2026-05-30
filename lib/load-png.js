import fs from 'node:fs/promises';
import { PNG } from 'pngjs';
import { mapToFaviconSize } from './resize.js';

/**
 * @typedef {import('./resize.js').ScalingMode} ScalingMode
 * @typedef {import('./resize.js').MappedImage} LoadedPng
 */

/**
 * Load a PNG from disk and map it to Safari tab size (16×16).
 *
 * - exactly 16×16 → analyzed as-is (no resampling)
 * - larger (up to 512×512) → area-average downscale
 * - smaller than 16×16 → bilinear upscale (flagged as low quality upstream)
 * - larger than 512×512 on either side → rejected
 *
 * @param {string} filePath
 * @returns {Promise<LoadedPng>}
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

  return mapToFaviconSize(png.data, png.width, png.height);
}
