import {
  ALPHA_OPAQUE,
  ALPHA_VISIBLE,
  EDGE_OPAQUE_RATIO,
  MIN_VISIBLE_PIXELS,
} from './constants.js';
import { edgeCoordinates } from './edge-coords.js';
import { relativeLuminance } from './luminance.js';

/**
 * @typedef {Object} ImageDataLike
 * @property {Uint8ClampedArray|Uint8Array} data
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} FaviconAnalysis
 * @property {boolean} hasTransparency
 * @property {number} transparentRatio
 * @property {boolean} transparentBackground
 * @property {boolean} fullBleed
 * @property {number} edgeLuminance
 * @property {number} edgeOpaqueRatio
 * @property {number} visiblePixels
 * @property {number} avgLuminance
 * @property {boolean} hasVisibleContent
 */

/**
 * @param {ImageDataLike} imageData
 * @returns {FaviconAnalysis}
 */
export function analyze(imageData) {
  const { data, width, height } = imageData;
  let transparentPixels = 0;
  let visiblePixels = 0;
  let luminanceSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < ALPHA_OPAQUE) transparentPixels++;
    if (a >= ALPHA_VISIBLE) {
      visiblePixels++;
      luminanceSum += relativeLuminance(data[i], data[i + 1], data[i + 2]);
    }
  }

  const totalPixels = width * height;
  const avgLuminance = visiblePixels > 0 ? luminanceSum / visiblePixels : 0;
  const transparentBackground = hasTransparentBackground(data, width, height);
  const edgeStats = sampleEdgePixels(data, width, height);

  return {
    hasTransparency: transparentPixels > 0,
    transparentRatio: transparentPixels / totalPixels,
    transparentBackground,
    fullBleed: edgeStats.opaqueRatio >= EDGE_OPAQUE_RATIO && !transparentBackground,
    edgeLuminance: edgeStats.luminance,
    edgeOpaqueRatio: edgeStats.opaqueRatio,
    visiblePixels,
    avgLuminance,
    hasVisibleContent: visiblePixels >= MIN_VISIBLE_PIXELS,
  };
}

function sampleEdgePixels(data, width, height) {
  const edgeCoords = edgeCoordinates(width, height);

  let opaqueEdge = 0;
  let luminanceSum = 0;
  for (const [x, y] of edgeCoords) {
    const i = (y * width + x) * 4;
    const a = data[i + 3];
    if (a >= ALPHA_VISIBLE) {
      opaqueEdge++;
      luminanceSum += relativeLuminance(data[i], data[i + 1], data[i + 2]);
    }
  }

  return {
    opaqueRatio: opaqueEdge / edgeCoords.length,
    luminance: opaqueEdge > 0 ? luminanceSum / opaqueEdge : 0,
  };
}

function hasTransparentBackground(data, width, height) {
  const edgeCoords = edgeCoordinates(width, height);

  let transparentEdge = 0;
  for (const [x, y] of edgeCoords) {
    const i = (y * width + x) * 4;
    if (data[i + 3] < ALPHA_OPAQUE) transparentEdge++;
  }

  return transparentEdge / edgeCoords.length >= 0.6;
}
