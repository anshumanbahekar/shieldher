#!/usr/bin/env node
// ============================================
// ShieldHer — PWA Icon Generator
// Run: node scripts/generate-icons.js
// Requires: npm install sharp
// Generates all required PWA icon sizes
// ============================================

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ICONS_DIR = path.join(__dirname, "../public/icons");
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

// Base SVG — ShieldHer logo
const BASE_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="115" fill="#E5294E"/>
  <path d="M256 80 L380 130 L380 270 C380 340 320 395 256 420 C192 395 132 340 132 270 L132 130 Z"
    fill="white" opacity="0.15"/>
  <path d="M256 100 L360 145 L360 265 C360 328 305 378 256 400 C207 378 152 328 152 265 L152 145 Z"
    fill="none" stroke="white" stroke-width="8" stroke-linejoin="round"/>
  <text x="256" y="300" font-family="system-ui, sans-serif" font-weight="900"
    font-size="140" text-anchor="middle" fill="white">SOS</text>
</svg>`;

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  const svgBuffer = Buffer.from(BASE_SVG);

  for (const size of SIZES) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(ICONS_DIR, `icon-${size}x${size}.png`));
    console.log(`✅ Generated icon-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  await sharp(svgBuffer).resize(180, 180).png()
    .toFile(path.join(ICONS_DIR, "apple-touch-icon.png"));
  console.log("✅ Generated apple-touch-icon.png");

  // Favicon 32x32
  await sharp(svgBuffer).resize(32, 32).png()
    .toFile(path.join(ICONS_DIR, "favicon-32x32.png"));
  console.log("✅ Generated favicon-32x32.png");

  // Badge icon for push notifications (72x72, monochrome)
  await sharp(svgBuffer).resize(72, 72).png()
    .toFile(path.join(ICONS_DIR, "badge-72x72.png"));
  console.log("✅ Generated badge-72x72.png");

  console.log("\n🛡️ All ShieldHer icons generated successfully!");
  console.log(`📁 Saved to: ${ICONS_DIR}`);
}

generate().catch(console.error);
