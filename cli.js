import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { checkFavicon } from './lib/index.js';
import { formatCliLines } from './lib/format-cli.js';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

const USAGE = `Usage: safari-favicon <path-to.png>

Check a PNG favicon for likely Safari tab rendering issues.
Exit code 0 when checks pass; 1 on invalid input or failed checks.`;

async function main(argv) {
  const filePath = argv[0];

  if (filePath === '-v' || filePath === '--version') {
    console.log(version);
    process.exit(0);
  }

  if (!filePath || filePath === '-h' || filePath === '--help') {
    console.log(USAGE);
    process.exit(filePath ? 0 : 1);
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

  console.log(`safari-favicon — ${filePath}\n`);
  for (const line of formatCliLines(result)) {
    console.log(line);
  }

  process.exit(result.ok ? 0 : 1);
}

main(process.argv.slice(2));
