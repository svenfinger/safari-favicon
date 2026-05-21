import { FAVICON_SIZE, TAB_DARK, TAB_LIGHT } from './lib/constants.js';
import { analyze } from './lib/analyze.js';
import { buildChecklist } from './lib/checklist.js';
import { formatResultSummary } from './lib/format-cli.js';
import { predictMode } from './lib/predict.js';
import { renderPredicted } from './web/render-preview.js';

const fileInput = document.getElementById('file');
const output = document.getElementById('output');
const summaryEl = document.getElementById('summary');
const checklistEl = document.getElementById('checklist');
const lightCanvas = document.getElementById('light');
const darkCanvas = document.getElementById('dark');

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  if (file.type !== 'image/png') {
    alert('Please choose a PNG file.');
    fileInput.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => runAnalysis(img, file.name);
    img.onerror = () => alert('Could not decode this PNG.');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

function runAnalysis(img, fileName) {
  const source = document.createElement('canvas');
  source.width = FAVICON_SIZE;
  source.height = FAVICON_SIZE;
  const ctx = source.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
  ctx.drawImage(img, 0, 0, FAVICON_SIZE, FAVICON_SIZE);
  const imageData = ctx.getImageData(0, 0, FAVICON_SIZE, FAVICON_SIZE);

  const analysis = analyze(imageData);
  const lightMode = predictMode(analysis, 'light');
  const darkMode = predictMode(analysis, 'dark');
  const result = buildChecklist(fileName, analysis, lightMode, darkMode);

  renderPredicted(lightCanvas, imageData, TAB_LIGHT, lightMode);
  renderPredicted(darkCanvas, imageData, TAB_DARK, darkMode);
  renderSummary(result);
  renderChecklist(result);
  output.hidden = false;
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
