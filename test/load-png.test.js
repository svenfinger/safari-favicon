import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { FAVICON_SIZE, loadPngFromPath } from '../lib/index.js';
import { CASES } from './cases.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

for (const { file } of CASES) {
  test(`loadPngFromPath ${file} → 16×16 RGBA`, async () => {
    const img = await loadPngFromPath(join(fixturesDir, file));
    assert.equal(img.width, FAVICON_SIZE);
    assert.equal(img.height, FAVICON_SIZE);
    assert.equal(img.data.length, FAVICON_SIZE * FAVICON_SIZE * 4);
    assert.ok(img.data instanceof Uint8ClampedArray);
  });
}

test('16×16 source skips resize', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'safari-favicon-'));
  const path = join(dir, 'exact-16.png');
  const png = new PNG({ width: FAVICON_SIZE, height: FAVICON_SIZE });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write(png));
  try {
    const img = await loadPngFromPath(path);
    assert.equal(img.width, FAVICON_SIZE);
    assert.equal(img.height, FAVICON_SIZE);
    assert.equal(img.data[0], 255);
    assert.equal(img.data[3], 255);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
