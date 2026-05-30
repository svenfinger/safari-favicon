import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { PNG } from 'pngjs';
import { FAVICON_SIZE } from '../lib/constants.js';
import {
  analyze,
  buildChecklist,
  checkFavicon,
  predictMode,
  summarize,
} from '../lib/index.js';
import { formatCliLines, formatResultSummary } from '../lib/format-cli.js';

/**
 * Build an ImageData-like object filled with a single RGBA color.
 * @param {[number, number, number, number]} rgba
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
function solidImage([r, g, b, a]) {
  const data = new Uint8ClampedArray(FAVICON_SIZE * FAVICON_SIZE * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  return { data, width: FAVICON_SIZE, height: FAVICON_SIZE };
}

/**
 * Write a solid-color PNG to a temp file and run checkFavicon against it.
 * @param {[number, number, number, number]} rgba
 * @param {(filePath: string) => Promise<void>} run
 */
async function withSolidPng(rgba, run) {
  const dir = mkdtempSync(join(tmpdir(), 'safari-favicon-'));
  const path = join(dir, 'generated.png');
  const png = new PNG({ width: FAVICON_SIZE, height: FAVICON_SIZE });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = rgba[0];
    png.data[i + 1] = rgba[1];
    png.data[i + 2] = rgba[2];
    png.data[i + 3] = rgba[3];
  }
  writeFileSync(path, PNG.sync.write(png));
  try {
    await run(path);
  } finally {
    rmSync(dir, { recursive: true });
  }
}

test('fully transparent icon → failed verdict, not ok', async () => {
  await withSolidPng([0, 0, 0, 0], async (path) => {
    const result = await checkFavicon(path);
    assert.equal(result.verdict, 'failed');
    assert.equal(result.ok, false);
    assert.equal(result.lightMode.treatment, 'none');
    assert.equal(result.darkMode.treatment, 'none');
    assert.ok(result.checks.some((c) => c.level === 'fail'));
  });
});

test('full-bleed white icon → light-mode border, dark-mode none', async () => {
  await withSolidPng([255, 255, 255, 255], async (path) => {
    const result = await checkFavicon(path);
    assert.equal(result.verdict, 'attention');
    assert.equal(result.ok, true);
    assert.equal(result.lightMode.treatment, 'border');
    assert.equal(result.lightMode.accentColor, '#000000');
    assert.equal(result.darkMode.treatment, 'none');
  });
});

test('analyze classifies a full-bleed opaque icon', () => {
  const analysis = analyze(solidImage([255, 255, 255, 255]));
  assert.equal(analysis.fullBleed, true);
  assert.equal(analysis.transparentBackground, false);
  assert.equal(analysis.edgeOpaqueRatio, 1);
  assert.equal(analysis.hasVisibleContent, true);
});

test('analyze classifies a transparent background', () => {
  const analysis = analyze(solidImage([0, 0, 0, 0]));
  assert.equal(analysis.transparentBackground, true);
  assert.equal(analysis.fullBleed, false);
  assert.equal(analysis.hasVisibleContent, false);
  assert.equal(analysis.edgeOpaqueRatio, 0);
});

test('predictMode returns "none" when there is no visible content', () => {
  const analysis = analyze(solidImage([0, 0, 0, 0]));
  const prediction = predictMode(analysis, 'light');
  assert.equal(prediction.treatment, 'none');
  assert.equal(prediction.contrastRatio, 0);
  assert.equal(prediction.accentColor, null);
});

test('summarize weighting and verdicts', () => {
  assert.deepEqual(
    summarize([
      { level: 'pass', message: '' },
      { level: 'pass', message: '' },
    ]),
    { score: 100, verdict: 'good', ok: true },
  );

  const warned = summarize([
    { level: 'pass', message: '' },
    { level: 'warn', message: '' },
  ]);
  assert.equal(warned.verdict, 'attention');
  assert.equal(warned.ok, true);
  assert.equal(warned.score, 75);

  const failed = summarize([
    { level: 'pass', message: '' },
    { level: 'fail', message: '' },
  ]);
  assert.equal(failed.verdict, 'failed');
  assert.equal(failed.ok, false);
  assert.equal(failed.score, 50);

  assert.equal(summarize([{ level: 'info', message: '' }]).score, 0);
});

test('format-cli renders summary and per-check lines', () => {
  const analysis = analyze(solidImage([255, 255, 255, 255]));
  const light = predictMode(analysis, 'light');
  const dark = predictMode(analysis, 'dark');
  const result = buildChecklist('generated.png', analysis, light, dark);

  assert.match(formatResultSummary(result), /Needs attention \(score \d+\/100/);

  const lines = formatCliLines(result);
  assert.equal(lines.length, result.checks.length + 2);
  assert.match(lines.at(-1), /→/);
  assert.ok(lines.some((line) => line.includes('WARN')));
});
