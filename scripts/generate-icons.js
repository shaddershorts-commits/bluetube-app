// Gera icon.png (1024x1024 quadrado) e adaptive-icon.png (1024x1024 com margem
// adicional pra Android adaptive). Usa o mesmo play box do splash.
const path = require('path');
const sharp = require('sharp');

const BG = '#020817';
const OUT_ICON = path.join(__dirname, '..', 'assets', 'icon.png');
const OUT_ADAPT = path.join(__dirname, '..', 'assets', 'adaptive-icon.png');

function buildPlayBoxSvg({ size, margin }) {
  const boxSize = size - margin * 2;
  const x = margin;
  const y = margin;
  const r = boxSize * 0.22;
  const triCx = x + boxSize * 0.40;
  const triTop = y + boxSize * 0.28;
  const triBottom = y + boxSize * 0.72;
  const triTip = x + boxSize * 0.72;
  const triCyMid = y + boxSize * 0.50;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00c2ff"/>
      <stop offset="55%" stop-color="#1a6bff"/>
      <stop offset="100%" stop-color="#0a3ab0"/>
    </linearGradient>
    <linearGradient id="playHighlight" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="45%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <rect x="${x}" y="${y}" width="${boxSize}" height="${boxSize}" rx="${r}" ry="${r}" fill="url(#playGrad)"/>
  <rect x="${x + 14}" y="${y + 14}" width="${boxSize - 28}" height="${boxSize - 28}" rx="${r - 6}" ry="${r - 6}"
        fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="4"/>
  <rect x="${x + 30}" y="${y + 30}" width="${boxSize - 60}" height="${boxSize * 0.45}" rx="${r - 16}" ry="${r - 16}"
        fill="url(#playHighlight)"/>
  <path d="M ${triCx} ${triTop} L ${triTip} ${triCyMid} L ${triCx} ${triBottom} Z" fill="#ffffff"/>
</svg>`;
}

async function main() {
  // icon.png: play box ocupa quase todo o canvas
  await sharp(Buffer.from(buildPlayBoxSvg({ size: 1024, margin: 80 })))
    .png({ compressionLevel: 9 })
    .toFile(OUT_ICON);
  console.log('[icons] OK icon.png');

  // adaptive-icon.png: play box menor, centralizado — Android corta em circulo/rounded
  await sharp(Buffer.from(buildPlayBoxSvg({ size: 1024, margin: 220 })))
    .png({ compressionLevel: 9 })
    .toFile(OUT_ADAPT);
  console.log('[icons] OK adaptive-icon.png');
}

main().catch((e) => { console.error(e); process.exit(1); });
