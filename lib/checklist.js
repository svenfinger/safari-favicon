import {
  ACCENT_DARK_MODE,
  ACCENT_LIGHT_MODE,
  FAVICON_SIZE,
} from './constants.js';

/** @typedef {'pass' | 'info' | 'warn' | 'fail'} CheckLevel */

/**
 * @typedef {Object} Check
 * @property {CheckLevel} level
 * @property {string} message
 */

/**
 * @typedef {Object} CheckResult
 * @property {Check[]} checks
 * @property {import('./analyze.js').FaviconAnalysis} analysis
 * @property {import('./predict.js').ModePrediction} lightMode
 * @property {import('./predict.js').ModePrediction} darkMode
 * @property {number} score
 * @property {'good' | 'attention' | 'failed'} verdict
 * @property {boolean} ok
 */

/**
 * @param {string} fileName
 * @param {import('./analyze.js').FaviconAnalysis} analysis
 * @param {import('./predict.js').ModePrediction} lightMode
 * @param {import('./predict.js').ModePrediction} darkMode
 * @returns {CheckResult}
 */
export function buildChecklist(fileName, analysis, lightMode, darkMode) {
  /** @type {Check[]} */
  const checks = [];

  checks.push({ level: 'pass', message: `PNG loaded: ${fileName}` });
  checks.push({
    level: 'pass',
    message: `Scaled to ${FAVICON_SIZE}×${FAVICON_SIZE} (Safari tab size)`,
  });

  if (analysis.hasTransparency) {
    checks.push({
      level: 'pass',
      message: `Transparency detected (${Math.round(analysis.transparentRatio * 100)}% of pixels not fully opaque)`,
    });
  } else {
    checks.push({
      level: 'info',
      message: 'No transparency detected — fully opaque PNG',
    });
  }

  if (analysis.transparentBackground) {
    checks.push({
      level: 'pass',
      message:
        'Transparent background (edges mostly transparent) — low contrast may add an inner plate behind the glyph',
    });
  } else if (analysis.fullBleed) {
    checks.push({
      level: 'warn',
      message: `Full-bleed icon (${Math.round(analysis.edgeOpaqueRatio * 100)}% opaque edges) — low edge contrast may add an outer border that traces the square`,
    });
  } else {
    checks.push({
      level: 'warn',
      message: 'Mixed/opaque edges — not clearly transparent or full-bleed',
    });
  }

  if (analysis.hasVisibleContent) {
    checks.push({
      level: 'pass',
      message: `Visible icon content (${analysis.visiblePixels} pixels)`,
    });
    checks.push({
      level: 'info',
      message: `Average glyph luminance: ${(analysis.avgLuminance * 100).toFixed(0)}%`,
    });
    if (analysis.fullBleed) {
      checks.push({
        level: 'info',
        message: `Edge/background luminance: ${(analysis.edgeLuminance * 100).toFixed(0)}% (used for full-bleed contrast)`,
      });
    }
  } else {
    checks.push({
      level: 'fail',
      message: 'Not enough visible content — icon may appear empty',
    });
  }

  addModeCheck(checks, 'Light mode', lightMode);
  addModeCheck(checks, 'Dark mode', darkMode);

  checks.push({
    level: 'info',
    message: 'Compare with Safari tabs using the same PNG. Rules here are guessed.',
  });

  const { score, verdict, ok } = summarize(checks);

  return {
    checks,
    analysis,
    lightMode,
    darkMode,
    score,
    verdict,
    ok,
  };
}

/**
 * @param {Check[]} checks
 * @returns {{ score: number, verdict: 'good' | 'attention' | 'failed', ok: boolean }}
 */
export function summarize(checks) {
  const scored = checks.filter((c) => c.level !== 'info');
  const weights = { pass: 1, warn: 0.5, fail: 0, info: 0 };
  const maxWeight = scored.length * weights.pass;
  const total = scored.reduce((sum, c) => sum + weights[c.level], 0);
  const score = maxWeight > 0 ? Math.round((total / maxWeight) * 100) : 0;

  const failCount = checks.filter((c) => c.level === 'fail').length;
  const warnCount = checks.filter((c) => c.level === 'warn').length;

  let verdict;
  if (failCount > 0) {
    verdict = 'failed';
  } else if (warnCount > 0) {
    verdict = 'attention';
  } else {
    verdict = 'good';
  }

  return { score, verdict, ok: verdict !== 'failed' };
}

/**
 * @param {Check[]} checks
 * @param {string} label
 * @param {import('./predict.js').ModePrediction} mode
 */
/**
 * @param {string|null|undefined} color
 * @returns {string}
 */
function accentLabel(color) {
  if (color === ACCENT_LIGHT_MODE) return 'black';
  if (color === ACCENT_DARK_MODE) return 'white';
  return 'accent';
}

function addModeCheck(checks, label, mode) {
  if (mode.treatment === 'none') {
    checks.push({
      level: 'pass',
      message: `${label}: ${mode.reason} — no Safari accent predicted`,
    });
    return;
  }

  const accent = accentLabel(mode.accentColor);
  if (mode.treatment === 'border') {
    checks.push({
      level: 'warn',
      message: `${label}: ${mode.reason} — ${accent} outer border predicted (full-bleed)`,
    });
  } else {
    checks.push({
      level: 'warn',
      message: `${label}: ${mode.reason} — ${accent} inner plate predicted (transparent background)`,
    });
  }
}
