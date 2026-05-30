import { FAVICON_SIZE, MAX_SOURCE_SIZE } from './constants.js';

// Pure, dependency-free resize + size-policy logic shared by the Node CLI
// (lib/load-png.js) and the browser UI (app.js) so both behave identically.

/**
 * @typedef {'none' | 'downscaled' | 'upscaled'} ScalingMode
 */

/**
 * @typedef {Object} MappedImage
 * @property {Uint8ClampedArray} data RGBA pixels at FAVICON_SIZE×FAVICON_SIZE
 * @property {number} width Always FAVICON_SIZE
 * @property {number} height Always FAVICON_SIZE
 * @property {number} sourceWidth Source width before mapping
 * @property {number} sourceHeight Source height before mapping
 * @property {ScalingMode} scaling How the source was mapped to FAVICON_SIZE
 */

/**
 * Box/area-average downscale of source RGBA to dstW×dstH. Every source pixel
 * that falls into a destination cell contributes to its average, so detail is
 * represented faithfully at small sizes (unlike bilinear, which samples only a
 * few neighbours). Use this only when shrinking.
 * @param {ArrayLike<number>} src
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} dstW
 * @param {number} dstH
 * @returns {Uint8ClampedArray}
 */
export function resizeAreaRgba(src, srcW, srcH, dstW, dstH) {
  const out = new Uint8ClampedArray(dstW * dstH * 4);
  const xScale = srcW / dstW;
  const yScale = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const sy0 = Math.floor(y * yScale);
    const sy1 = Math.min(srcH, Math.ceil((y + 1) * yScale));

    for (let x = 0; x < dstW; x++) {
      const sx0 = Math.floor(x * xScale);
      const sx1 = Math.min(srcW, Math.ceil((x + 1) * xScale));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const s = (sy * srcW + sx) * 4;
          r += src[s];
          g += src[s + 1];
          b += src[s + 2];
          a += src[s + 3];
          count++;
        }
      }

      const o = (y * dstW + x) * 4;
      out[o] = Math.round(r / count);
      out[o + 1] = Math.round(g / count);
      out[o + 2] = Math.round(b / count);
      out[o + 3] = Math.round(a / count);
    }
  }
  return out;
}

/**
 * Stretch source RGBA to dstW×dstH with bilinear interpolation. Appropriate for
 * upscaling, where there is no extra source detail to average.
 * @param {ArrayLike<number>} src
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} dstW
 * @param {number} dstH
 * @returns {Uint8ClampedArray}
 */
export function resizeBilinearRgba(src, srcW, srcH, dstW, dstH) {
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
 * Map decoded RGBA pixels to Safari tab size (16×16), applying the shared size
 * policy:
 *
 * - exactly 16×16 → used as-is (no resampling)
 * - larger (up to {@link MAX_SOURCE_SIZE}) → area-average downscale
 * - smaller than 16×16 → bilinear upscale (flagged as low quality upstream)
 * - larger than {@link MAX_SOURCE_SIZE} on either side → throws
 *
 * @param {ArrayLike<number> & { buffer?: ArrayBuffer, byteOffset?: number, byteLength?: number }} src RGBA bytes
 * @param {number} width Source width
 * @param {number} height Source height
 * @returns {MappedImage}
 */
export function mapToFaviconSize(src, width, height) {
  if (width > MAX_SOURCE_SIZE || height > MAX_SOURCE_SIZE) {
    throw new Error(
      `image is ${width}×${height}, larger than this tool's ${MAX_SOURCE_SIZE}×${MAX_SOURCE_SIZE} maximum. ` +
        `Resize to ${MAX_SOURCE_SIZE}px or less (a 512×512 source is plenty for a favicon).`,
    );
  }

  if (width === FAVICON_SIZE && height === FAVICON_SIZE) {
    const data = new Uint8ClampedArray(FAVICON_SIZE * FAVICON_SIZE * 4);
    data.set(src);
    return {
      data,
      width: FAVICON_SIZE,
      height: FAVICON_SIZE,
      sourceWidth: width,
      sourceHeight: height,
      scaling: 'none',
    };
  }

  const upscaling = width < FAVICON_SIZE || height < FAVICON_SIZE;
  const data = upscaling
    ? resizeBilinearRgba(src, width, height, FAVICON_SIZE, FAVICON_SIZE)
    : resizeAreaRgba(src, width, height, FAVICON_SIZE, FAVICON_SIZE);

  return {
    data,
    width: FAVICON_SIZE,
    height: FAVICON_SIZE,
    sourceWidth: width,
    sourceHeight: height,
    scaling: upscaling ? 'upscaled' : 'downscaled',
  };
}
