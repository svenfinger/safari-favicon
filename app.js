import { FAVICON_SIZE, TAB_DARK, TAB_LIGHT } from './lib/constants.js';
import { analyze } from './lib/analyze.js';
import { buildChecklist } from './lib/checklist.js';
import { formatResultSummary } from './lib/format-cli.js';
import { predictMode } from './lib/predict.js';
import { mapToFaviconSize } from './lib/resize.js';
import { renderPredicted } from './web/render-preview.js';

const fileInput = document.getElementById('file');
const dropzone = document.getElementById('dropzone');
const sampleBtn = document.getElementById('sample');
const themeToggle = document.getElementById('theme-toggle');
const output = document.getElementById('output');
const summaryEl = document.getElementById('summary');
const checklistEl = document.getElementById('checklist');
const lightCanvas = document.getElementById('light');
const darkCanvas = document.getElementById('dark');
const lightTabCanvas = document.getElementById('lightTab');
const darkTabCanvas = document.getElementById('darkTab');

/* ---------- Theme ---------- */

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
});

/* ---------- File input ---------- */

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) loadFile(file);
});

/* ---------- Drag and drop ---------- */

['dragenter', 'dragover'].forEach((type) => {
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
});

['dragleave', 'dragend', 'drop'].forEach((type) => {
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    if (type === 'dragleave' && dropzone.contains(e.relatedTarget)) return;
    dropzone.classList.remove('is-dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) loadFile(file);
});

dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

/* ---------- Clipboard paste ---------- */

document.addEventListener('paste', (e) => {
  const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type === 'image/png');
  if (!item) return;
  const file = item.getAsFile();
  if (file) loadFile(file);
});

/* ---------- Sample ---------- */

sampleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  loadImage(createSampleDataUrl(), 'sample-favicon.png');
});

/* ---------- Pipeline ---------- */

function loadFile(file) {
  if (file.type !== 'image/png') {
    alert('Please choose a PNG file.');
    fileInput.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => loadImage(reader.result, file.name);
  reader.onerror = () => alert('Could not read this file.');
  reader.readAsDataURL(file);
}

function loadImage(src, fileName) {
  const img = new Image();
  img.onload = () => runAnalysis(img, fileName);
  img.onerror = () => alert('Could not decode this PNG.');
  img.src = src;
}

function runAnalysis(img, fileName) {
  const sourceWidth = img.naturalWidth;
  const sourceHeight = img.naturalHeight;

  // Decode at full resolution, then apply the same size policy as the CLI
  // (reject > 512, area-average downscale, bilinear upscale) via the shared
  // module — so the web UI and CLI stay in lockstep.
  let mapped;
  try {
    const full = document.createElement('canvas');
    full.width = sourceWidth;
    full.height = sourceHeight;
    const fctx = full.getContext('2d', { willReadFrequently: true });
    fctx.clearRect(0, 0, sourceWidth, sourceHeight);
    fctx.drawImage(img, 0, 0);
    const srcData = fctx.getImageData(0, 0, sourceWidth, sourceHeight).data;
    mapped = mapToFaviconSize(srcData, sourceWidth, sourceHeight);
  } catch (err) {
    output.hidden = true;
    alert(err instanceof Error ? err.message : String(err));
    fileInput.value = '';
    return;
  }

  const imageData = new ImageData(mapped.data, FAVICON_SIZE, FAVICON_SIZE);

  const analysis = analyze(imageData);
  const lightMode = predictMode(analysis, 'light');
  const darkMode = predictMode(analysis, 'dark');
  const result = buildChecklist(fileName, analysis, lightMode, darkMode, {
    sourceWidth: mapped.sourceWidth,
    sourceHeight: mapped.sourceHeight,
    scaling: mapped.scaling,
  });

  renderPredicted(lightCanvas, imageData, TAB_LIGHT, lightMode);
  renderPredicted(darkCanvas, imageData, TAB_DARK, darkMode);
  renderPredicted(lightTabCanvas, imageData, TAB_LIGHT, lightMode);
  renderPredicted(darkTabCanvas, imageData, TAB_DARK, darkMode);
  renderSummary(result);
  renderChecklist(result);
  output.hidden = false;
  output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderSummary(result) {
  summaryEl.textContent = formatResultSummary(result);
  summaryEl.className = `summary summary--${result.verdict}`;
}

function renderChecklist(result) {
  checklistEl.innerHTML = '';
  for (const check of result.checks) {
    addCheck(check.level, check.message);
  }
}

function addCheck(level, text) {
  const li = document.createElement('li');
  li.className = `check check--${level}`;

  const badge = document.createElement('span');
  badge.className = 'check__badge';
  badge.textContent = level;

  const textEl = document.createElement('span');
  textEl.className = 'check__text';
  textEl.textContent = text;

  li.append(badge, textEl);
  checklistEl.appendChild(li);
}

/* ---------- Built-in sample ----------
 * A dark glyph on a transparent background: reads as "good" on a light tab
 * but low-contrast on a dark tab, so Safari is predicted to add an inner
 * plate in dark mode — a useful demo of what the tool catches.
 */
function createSampleDataUrl() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const pad = 8;
  const inner = size - pad * 2;

  ctx.fillStyle = '#1e1b2e';
  roundedRect(ctx, pad, pad, inner, inner, 14);
  ctx.fill();

  ctx.fillStyle = '#312a52';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, inner * 0.28, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
