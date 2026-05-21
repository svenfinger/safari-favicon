import { FAVICON_SIZE } from '../lib/constants.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {ImageData} imageData
 * @param {string} tabBg
 * @param {import('../lib/predict.js').ModePrediction} mode
 */
export function renderPredicted(canvas, imageData, tabBg, mode) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = tabBg;
  ctx.fillRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);

  if (mode.treatment === 'plate' && mode.accentColor) {
    drawPlate(ctx, mode.accentColor);
  }

  const iconCanvas = document.createElement('canvas');
  iconCanvas.width = FAVICON_SIZE;
  iconCanvas.height = FAVICON_SIZE;
  iconCanvas.getContext('2d').putImageData(imageData, 0, 0);
  ctx.drawImage(iconCanvas, 0, 0);

  if (mode.treatment === 'border' && mode.accentColor) {
    drawBorder(ctx, mode.accentColor);
  }
}

function drawPlate(ctx, color) {
  ctx.fillStyle = color;
  const pad = 1;
  const size = FAVICON_SIZE - pad * 2;
  const radius = 3;
  ctx.beginPath();
  roundedRect(ctx, pad, pad, size, size, radius);
  ctx.fill();
}

function drawBorder(ctx, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const inset = 0.5;
  const size = FAVICON_SIZE - 1;
  const radius = 3;
  ctx.beginPath();
  roundedRect(ctx, inset, inset, size, size, radius);
  ctx.stroke();
}

function roundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    roundedRectPath(ctx, x, y, w, h, r);
  }
}

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
