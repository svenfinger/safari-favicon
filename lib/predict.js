import {
  ACCENT_DARK_MODE,
  ACCENT_LIGHT_MODE,
  CONTRAST_THRESHOLD,
  TAB_DARK,
  TAB_LIGHT,
} from './constants.js';
import { contrastRatioBetween, relativeLuminanceFromHex } from './luminance.js';

/**
 * @typedef {'none' | 'border' | 'plate'} SafariTreatment
 */

/**
 * @typedef {Object} ModePrediction
 * @property {SafariTreatment} treatment
 * @property {number} contrastRatio
 * @property {string} tabBg
 * @property {string|null} accentColor
 * @property {string} reason
 * @property {boolean} [fullBleed]
 */

/**
 * @param {import('./analyze.js').FaviconAnalysis} analysis
 * @param {'light' | 'dark'} mode
 * @returns {ModePrediction}
 */
export function predictMode(analysis, mode) {
  const { avgLuminance, edgeLuminance, fullBleed, hasVisibleContent } = analysis;
  const tabBg = mode === 'light' ? TAB_LIGHT : TAB_DARK;
  const accentColor = mode === 'light' ? ACCENT_LIGHT_MODE : ACCENT_DARK_MODE;

  if (!hasVisibleContent) {
    return {
      treatment: 'none',
      contrastRatio: 0,
      tabBg,
      accentColor: null,
      reason: 'No visible icon content',
    };
  }

  const tabLum = relativeLuminanceFromHex(tabBg);
  const sampleLum = fullBleed ? edgeLuminance : avgLuminance;
  const contrastRatio = contrastRatioBetween(sampleLum, tabLum);
  const needsAccent = contrastRatio < CONTRAST_THRESHOLD;
  const treatment = needsAccent ? (fullBleed ? 'border' : 'plate') : 'none';

  let reason;
  if (!needsAccent) {
    reason = `Estimated contrast ${contrastRatio.toFixed(2)}:1 looks sufficient`;
  } else if (fullBleed) {
    reason = `Full-bleed edge contrast ${contrastRatio.toFixed(2)}:1 is below ~${CONTRAST_THRESHOLD}:1`;
  } else {
    reason = `Glyph contrast ${contrastRatio.toFixed(2)}:1 is below ~${CONTRAST_THRESHOLD}:1`;
  }

  return {
    treatment,
    contrastRatio,
    tabBg,
    accentColor: needsAccent ? accentColor : null,
    reason,
    fullBleed,
  };
}
