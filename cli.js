import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { checkFavicon } from './lib/index.js';
import { formatCliLines } from './lib/format-cli.js';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

const USAGE = `Usage: safari-favicon <path-to.png> [options]

Check a PNG favicon for likely Safari tab rendering issues.

Options:
  --json         Print the full result as JSON instead of human-readable text.
  -v, --version  Print the version and exit.
  -h, --help     Print this help and exit.

Exit code 0 when checks pass; 1 on invalid input or failed checks.`;

async function main(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('-')));
  const positionals = argv.filter((arg) => !arg.startsWith('-'));
  const filePath = positionals[0];
  const asJson = flags.has('--json');

  if (flags.has('-v') || flags.has('--version')) {
    console.log(version);
    process.exit(0);
  }

  if (flags.has('-h') || flags.has('--help')) {
    console.log(USAGE);
    process.exit(0);
  }

  if (!filePath) {
    console.log(USAGE);
    process.exit(1);
  }

  try {
    await access(filePath, constants.R_OK);
  } catch {
    console.error(`Error: cannot read file "${filePath}"`);
    process.exit(1);
  }

  if (!filePath.toLowerCase().endsWith('.png')) {
    console.error('Error: file must be a .png');
    process.exit(1);
  }

  let result;
  try {
    result = await checkFavicon(filePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }

  if (asJson) {
    console.log(JSON.stringify({ file: filePath, version, ...result }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  console.log(`safari-favicon — ${filePath}\n`);
  for (const line of formatCliLines(result)) {
    console.log(line);
  }

  process.exit(result.ok ? 0 : 1);
}

main(process.argv.slice(2));
