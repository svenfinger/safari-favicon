/** Shared fixture expectations for API and CLI tests. */
export const CASES = [
  {
    file: 'sample.png',
    ok: true,
    verdict: 'good',
    light: 'none',
    dark: 'none',
  },
  {
    file: 'medium-purple-on-transparent.png',
    ok: true,
    verdict: 'good',
    light: 'none',
    dark: 'none',
  },
  {
    file: 'light-on-transparent.png',
    ok: true,
    verdict: 'attention',
    light: 'plate',
    dark: 'none',
  },
  {
    file: 'dark-on-transparent.png',
    ok: true,
    verdict: 'attention',
    light: 'none',
    dark: 'plate',
  },
  {
    file: 'full-bleed-black.png',
    ok: true,
    verdict: 'attention',
    light: 'none',
    dark: 'border',
  },
];

/** Final CLI summary line per verdict (see lib/format-cli.js). */
export const VERDICT_CLI_LABEL = {
  good: 'Good',
  attention: 'Needs attention',
  failed: 'Failed',
};
