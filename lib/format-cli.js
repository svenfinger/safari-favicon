/** @typedef {import('./checklist.js').Check} Check */
/** @typedef {import('./checklist.js').CheckResult} CheckResult */

const PREFIX = {
  pass: '✓',
  info: '·',
  warn: '⚠',
  fail: '✗',
};

export const VERDICT_LABEL = {
  good: 'Good',
  attention: 'Needs attention',
  failed: 'Failed',
};

/**
 * @param {CheckResult} result
 * @returns {string}
 */
export function formatResultSummary(result) {
  const label = VERDICT_LABEL[result.verdict];
  const failCount = result.checks.filter((c) => c.level === 'fail').length;
  const warnCount = result.checks.filter((c) => c.level === 'warn').length;

  let detail = `score ${result.score}/100`;
  if (failCount > 0) {
    detail += `, ${failCount} error${failCount === 1 ? '' : 's'}`;
  }
  if (warnCount > 0) {
    detail += `, ${warnCount} warning${warnCount === 1 ? '' : 's'}`;
  }

  return `${label} (${detail})`;
}

/**
 * @param {CheckResult} result
 * @returns {string[]}
 */
export function formatCliLines(result) {
  const lines = result.checks.map((check) => formatCheckLine(check));
  lines.push('');
  lines.push(formatSummary(result));
  return lines;
}

/**
 * @param {Check} check
 * @returns {string}
 */
function formatCheckLine(check) {
  const prefix = PREFIX[check.level];
  const tag = check.level.toUpperCase().padEnd(4);
  return `  ${prefix}  ${tag}  ${check.message}`;
}

/**
 * @param {CheckResult} result
 * @returns {string}
 */
function formatSummary(result) {
  return `  →  ${formatResultSummary(result)}`;
}
