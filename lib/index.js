export { FAVICON_SIZE } from './constants.js';
export { analyze } from './analyze.js';
export { predictMode } from './predict.js';
export { buildChecklist, summarize } from './checklist.js';
export { loadPngFromPath } from './load-png.js';

import { analyze } from './analyze.js';
import { buildChecklist } from './checklist.js';
import { loadPngFromPath } from './load-png.js';
import { predictMode } from './predict.js';

/**
 * Analyze a PNG favicon file and return structured check results.
 * @param {string} filePath - Absolute or relative path to a PNG file
 * @param {{ fileName?: string }} [options]
 * @returns {Promise<import('./checklist.js').CheckResult>}
 */
export async function checkFavicon(filePath, options = {}) {
  const imageData = await loadPngFromPath(filePath);
  const fileName = options.fileName ?? filePath.split(/[/\\]/).pop() ?? filePath;
  const analysis = analyze(imageData);
  const lightMode = predictMode(analysis, 'light');
  const darkMode = predictMode(analysis, 'dark');
  return buildChecklist(fileName, analysis, lightMode, darkMode);
}
