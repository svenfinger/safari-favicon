# Safari Favicon

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)
[![npm version](https://img.shields.io/npm/v/safari-favicon.svg)](https://www.npmjs.com/package/safari-favicon)

Check PNG favicons for Safari tab rendering issues (contrast, transparency, predicted accent borders/plates). Rules are approximate, because the Safari behavior is undocumented.

The CLI decodes PNGs with [pngjs](https://github.com/lukeapage/pngjs) (pure JavaScript, no native binaries) and scales them to 16×16 before analysis.

## CLI

```bash
npx safari-favicon path/to/favicon.png
```

Or install globally:

```bash
npm install -g safari-favicon
safari-favicon path/to/favicon.png
```

Each check prints on its own line. The final line shows a score, verdict, and counts.

```bash
safari-favicon --version
safari-favicon --help
```

**Exit codes**

- `0` — checks passed (warnings are OK)
- `1` — invalid/missing file, decode error, or at least one failed check

## Programmatic API

```js
import {
  checkFavicon,
  analyze,
  predictMode,
  buildChecklist,
  summarize,
  loadPngFromPath,
  FAVICON_SIZE,
} from 'safari-favicon';
```

### `checkFavicon(filePath, options?)`

High-level entry: load PNG from disk, run analysis, return a full `CheckResult`.

```js
const result = await checkFavicon('./favicon.png');
// result.checks, result.analysis, result.lightMode, result.darkMode
// result.score, result.verdict ('good' | 'attention' | 'failed'), result.ok
```

Options: `{ fileName?: string }` — label used in checklist messages (defaults to the file basename).

### `loadPngFromPath(filePath)`

Load and scale a PNG to `FAVICON_SIZE` (16×16). Returns `{ data, width, height }` (RGBA, `Uint8ClampedArray`).

### `analyze(imageData)`

Pixel-level stats: transparency, full-bleed vs transparent background, luminance, visible pixel count. Works in Node or the browser if you supply `ImageData`-like `{ data, width, height }`.

### `predictMode(analysis, 'light' | 'dark')`

Predict Safari accent treatment for one tab appearance: `{ treatment, contrastRatio, tabBg, accentColor, reason, fullBleed? }` where `treatment` is `'none' | 'border' | 'plate'`.

### `buildChecklist(fileName, analysis, lightMode, darkMode)`

Build human-readable checks and attach `score`, `verdict`, and `ok` (same object shape as `checkFavicon` returns).

### `summarize(checks)`

Recompute `{ score, verdict, ok }` from a `Check[]` array.

### `FAVICON_SIZE`

`16` — Safari tab favicon size used for analysis.

## Development

```bash
npm install
npm test          # API, CLI, and PNG loading tests on test/fixtures/*.png
npm run check     # quick CLI run on test/fixtures/sample.png
npm start         # local web UI at http://localhost:3000
```

## Web UI

Try it in the browser (no install): **[safari-favicon on GitHub Pages](https://svenfinger.github.io/safari-favicon/)**

The web UI is not included in the npm package. To run it locally, open `index.html` or `npm start`, then visit http://localhost:3000. Results show the same score/verdict summary as the CLI, plus light/dark previews.

## License

[MIT](LICENSE)
