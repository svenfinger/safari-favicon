import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkFavicon } from '../lib/index.js';
import { CASES } from './cases.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

for (const expected of CASES) {
  test(`checkFavicon ${expected.file}`, async () => {
    const result = await checkFavicon(join(fixturesDir, expected.file));

    assert.equal(result.ok, expected.ok);
    assert.equal(result.verdict, expected.verdict);
    assert.equal(result.lightMode.treatment, expected.light);
    assert.equal(result.darkMode.treatment, expected.dark);
    assert.ok(result.checks.length > 0);
    assert.ok(result.score >= 0 && result.score <= 100);
  });
}

test('checkFavicon fileName option', async () => {
  const result = await checkFavicon(join(fixturesDir, 'sample.png'), {
    fileName: 'custom-label.png',
  });
  assert.ok(result.checks.some((c) => c.message.includes('custom-label.png')));
});
