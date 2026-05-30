import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { FAVICON_SIZE, loadPngFromPath } from '../lib/index.js';
import { MAX_SOURCE_SIZE } from '../lib/constants.js';
import { CASES } from './cases.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

/**
 * Write a solid-color PNG of the given size to a temp file, run `fn(path)`,
 * then clean up.
 * @param {number} width
 * @param {number} height
 * @param {(path: string) => Promise<void> | void} fn
 */
async function withPng(width, height, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'safari-favicon-'));
  const path = join(dir, `${width}x${height}.png`);
  const png = new PNG({ width, height });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write(png));
  try {
    await fn(path);
  } finally {
    rmSync(dir, { recursive: true });
  }
}

for (const { file } of CASES) {
  test(`loadPngFromPath ${file} → 16×16 RGBA`, async () => {
    const img = await loadPngFromPath(join(fixturesDir, file));
    assert.equal(img.width, FAVICON_SIZE);
    assert.equal(img.height, FAVICON_SIZE);
    assert.equal(img.data.length, FAVICON_SIZE * FAVICON_SIZE * 4);
    assert.ok(img.data instanceof Uint8ClampedArray);
  });
}

test('16×16 source skips resize (scaling: none)', async () => {
  await withPng(FAVICON_SIZE, FAVICON_SIZE, async (path) => {
    const img = await loadPngFromPath(path);
    assert.equal(img.width, FAVICON_SIZE);
    assert.equal(img.height, FAVICON_SIZE);
    assert.equal(img.scaling, 'none');
    assert.equal(img.sourceWidth, FAVICON_SIZE);
    assert.equal(img.sourceHeight, FAVICON_SIZE);
    assert.equal(img.data[0], 255);
    assert.equal(img.data[3], 255);
  });
});

test('larger source is downscaled (area-average)', async () => {
  await withPng(64, 64, async (path) => {
    const img = await loadPngFromPath(path);
    assert.equal(img.width, FAVICON_SIZE);
    assert.equal(img.height, FAVICON_SIZE);
    assert.equal(img.scaling, 'downscaled');
    assert.equal(img.sourceWidth, 64);
    assert.equal(img.sourceHeight, 64);
    assert.equal(img.data.length, FAVICON_SIZE * FAVICON_SIZE * 4);
    assert.equal(img.data[0], 255);
  });
});

test('exactly MAX_SOURCE_SIZE is accepted and downscaled', async () => {
  await withPng(MAX_SOURCE_SIZE, MAX_SOURCE_SIZE, async (path) => {
    const img = await loadPngFromPath(path);
    assert.equal(img.scaling, 'downscaled');
    assert.equal(img.width, FAVICON_SIZE);
  });
});

test('smaller source is upscaled (flagged)', async () => {
  await withPng(8, 8, async (path) => {
    const img = await loadPngFromPath(path);
    assert.equal(img.width, FAVICON_SIZE);
    assert.equal(img.height, FAVICON_SIZE);
    assert.equal(img.scaling, 'upscaled');
    assert.equal(img.sourceWidth, 8);
  });
});

test('source larger than MAX_SOURCE_SIZE is rejected', async () => {
  await withPng(MAX_SOURCE_SIZE + 1, MAX_SOURCE_SIZE + 1, async (path) => {
    await assert.rejects(
      () => loadPngFromPath(path),
      /larger than this tool's .* maximum/,
    );
  });
});
