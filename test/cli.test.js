import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { CASES, VERDICT_CLI_LABEL } from './cases.js';
import { MAX_SOURCE_SIZE } from '../lib/constants.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(root, 'test/fixtures');
const cli = join(root, 'cli.js');
const bin = join(root, 'bin/safari-favicon.js');

/**
 * @param {string[]} args
 */
function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    cwd: root,
  });
}

for (const expected of CASES) {
  test(`cli ${expected.file}: exit 0, clean stderr`, () => {
    const path = join(fixturesDir, expected.file);
    const result = runCli([path]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stderr, '', `unexpected stderr: ${JSON.stringify(result.stderr)}`);
    assert.match(result.stdout, /safari-favicon/);
    assert.match(result.stdout, new RegExp(VERDICT_CLI_LABEL[expected.verdict]));
  });
}

test('bin entry runs without stderr', () => {
  const result = spawnSync(process.execPath, [bin, join(fixturesDir, 'sample.png')], {
    encoding: 'utf8',
    cwd: root,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
});

test('--version', () => {
  const result = runCli(['--version']);
  assert.equal(result.status, 0);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('--help', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
});

test('no file argument exits 1', () => {
  assert.equal(runCli([]).status, 1);
});

test('missing file exits 1', () => {
  const result = runCli(['/no/such/favicon.png']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot read file/);
});

test('non-.png extension exits 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'safari-favicon-'));
  const path = join(dir, 'fake.jpg');
  writeFileSync(path, 'not a png');
  try {
    const result = runCli([path]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\.png/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('oversized PNG (> MAX_SOURCE_SIZE) exits 1 with a clear message', () => {
  const dir = mkdtempSync(join(tmpdir(), 'safari-favicon-'));
  const path = join(dir, 'too-big.png');
  const size = MAX_SOURCE_SIZE + 88;
  const png = new PNG({ width: size, height: size });
  png.data.fill(255);
  writeFileSync(path, PNG.sync.write(png));
  try {
    const result = runCli([path]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /maximum/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('invalid PNG bytes exits 1', () => {
  const dir = mkdtempSync(join(tmpdir(), 'safari-favicon-'));
  const path = join(dir, 'bad.png');
  writeFileSync(path, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  try {
    const result = runCli([path]);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.length > 0);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
