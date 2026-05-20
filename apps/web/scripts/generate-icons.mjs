// Generates PWA icon PNGs from the Saifit brand spec.
// Run: node apps/web/scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, "../public/icons");

function appIconSvg(size) {
  const glyph = size * 0.58;
  const glyphOffset = (size - glyph) / 2;
  // stroke width scales with glyph size
  const sw = Math.round(glyph * 0.11);
  const r6 = Math.round(glyph * 0.065);
  // Glyph paths (viewBox 100×100, scaled to glyph px)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="30%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#1a0f2e"/>
      <stop offset="70%" stop-color="#0d0d16"/>
    </radialGradient>
    <linearGradient id="glyph" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9d6fff"/>
      <stop offset="100%" stop-color="#5a64e6"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="${Math.round(glyph * 0.05)}" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- subtle corner glow -->
    <radialGradient id="corner" cx="20%" cy="20%" r="50%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#bg)"/>

  <!-- Corner glow overlay -->
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#corner)"/>

  <!-- Grid overlay (very faint) -->
  <g opacity="0.08">
    ${Array.from({ length: Math.ceil(size / 14) + 1 }, (_, i) => `
    <line x1="${i * 14}" y1="0" x2="${i * 14}" y2="${size}" stroke="white" stroke-width="0.5"/>
    <line x1="0" y1="${i * 14}" x2="${size}" y2="${i * 14}" stroke="white" stroke-width="0.5"/>`).join("")}
  </g>

  <!-- Saifit S glyph (scaled from 100×100 viewBox into glyph×glyph) -->
  <g transform="translate(${glyphOffset}, ${glyphOffset}) scale(${glyph / 100})" filter="url(#glow)">
    <!-- Top bar -->
    <path d="M 22 28 L 78 22" stroke="url(#glyph)" stroke-width="${sw}" stroke-linecap="round"/>
    <circle cx="22" cy="28" r="${r6}" fill="url(#glyph)"/>
    <circle cx="78" cy="22" r="${r6}" fill="url(#glyph)"/>
    <!-- Diagonal connector -->
    <path d="M 70 32 L 30 68" stroke="url(#glyph)" stroke-width="${sw * 0.9}" stroke-linecap="round"/>
    <!-- Bottom bar -->
    <path d="M 22 78 L 78 72" stroke="url(#glyph)" stroke-width="${sw}" stroke-linecap="round"/>
    <circle cx="22" cy="78" r="${r6}" fill="url(#glyph)"/>
    <circle cx="78" cy="72" r="${r6}" fill="url(#glyph)"/>
  </g>
</svg>`;
}

const sizes = [192, 256, 384, 512];

for (const size of sizes) {
  const svg = appIconSvg(size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const outPath = join(outDir, `icon-${size}.png`);
  writeFileSync(outPath, buf);
  console.log(`✓ icon-${size}.png`);
}

console.log("Icons generated in public/icons/");
