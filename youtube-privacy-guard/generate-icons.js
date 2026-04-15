/* eslint-disable no-console */
const path = require("path");
const fs = require("fs");
const { createCanvas } = require("canvas");

const OUTPUT_DIR = path.join(__dirname, "icons");
const SIZES = [16, 32, 48, 128];

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function drawShield(ctx, size) {
  const w = size;
  const h = size;
  const centerX = w / 2;

  ctx.beginPath();
  ctx.moveTo(centerX, h * 0.12);
  ctx.bezierCurveTo(w * 0.86, h * 0.12, w * 0.88, h * 0.3, w * 0.86, h * 0.48);
  ctx.bezierCurveTo(w * 0.83, h * 0.72, w * 0.68, h * 0.88, centerX, h * 0.94);
  ctx.bezierCurveTo(w * 0.32, h * 0.88, w * 0.17, h * 0.72, w * 0.14, h * 0.48);
  ctx.bezierCurveTo(w * 0.12, h * 0.3, w * 0.14, h * 0.12, centerX, h * 0.12);
  ctx.closePath();

  ctx.fillStyle = "#ff0000";
  ctx.fill();

  ctx.lineWidth = Math.max(1, size * 0.04);
  ctx.strokeStyle = "#ff5c5c";
  ctx.stroke();
}

function drawEye(ctx, size) {
  const centerX = size / 2;
  const centerY = size * 0.5;
  const eyeWidth = size * 0.5;
  const eyeHeight = size * 0.26;

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, eyeWidth / 2, eyeHeight / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.09, 0, Math.PI * 2);
  ctx.fillStyle = "#0f0f0f";
  ctx.fill();
}

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, size, size);

  drawShield(ctx, size);
  drawEye(ctx, size);

  return canvas;
}

function writeIcon(size) {
  const canvas = drawIcon(size);
  const filePath = path.join(OUTPUT_DIR, `icon${size}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
  console.log(`[YPG] Wrote ${filePath}`);
}

function main() {
  ensureOutputDir();
  SIZES.forEach(writeIcon);
  console.log("[YPG] Icon generation complete.");
}

main();
