#!/usr/bin/env node
// ============================================
// ShieldHer — Ambient Sound Setup Guide
// Run: node scripts/setup-sounds.js
// ============================================

const fs = require("fs");
const path = require("path");

const SOUNDS_DIR = path.join(__dirname, "../public/sounds");
if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true });

const SOUND_FILES = [
  { file: "ambient-office.mp3", description: "Office background — keyboard typing, occasional voices, AC hum" },
  { file: "ambient-cafe.mp3", description: "Coffee shop — espresso machine, gentle chatter, light music" },
  { file: "ambient-street.mp3", description: "Street ambience — traffic, footsteps, distant voices" },
  { file: "ambient-home.mp3", description: "Home environment — TV in background, quiet suburban sounds" },
];

console.log("🔊 ShieldHer Ambient Sound Setup\n");
console.log("The following sound files are needed in /public/sounds/:\n");

SOUND_FILES.forEach(({ file, description }) => {
  const filePath = path.join(SOUNDS_DIR, file);
  const exists = fs.existsSync(filePath);
  console.log(`  ${exists ? "✅" : "❌"} ${file}`);
  console.log(`     → ${description}\n`);
});

console.log("📥 HOW TO GET SOUND FILES:");
console.log("");
console.log("Option 1 — Free sources (recommended):");
console.log("  • freesound.org (search: office ambience, cafe ambience, etc.)");
console.log("  • pixabay.com/sound-effects/");
console.log("  • soundbible.com");
console.log("");
console.log("Option 2 — Generate with AI:");
console.log("  • ElevenLabs Sound Effects");
console.log("  • Suno AI");
console.log("");
console.log("Option 3 — Record yourself:");
console.log("  • Record 30-60 seconds of ambient sound");
console.log("  • Convert to MP3 (128kbps is fine)");
console.log("  • Name files exactly as listed above");
console.log("");
console.log(`📁 Save files to: ${SOUNDS_DIR}`);
console.log("");
console.log("NOTE: Files should be 30-60 seconds, looped by the Web Audio API.");
console.log("Keep files under 500KB each for fast loading.");
