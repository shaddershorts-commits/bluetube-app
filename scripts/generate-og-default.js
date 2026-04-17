// Gera C:\Users\felip\bluetube\public\og-default.png (1200x630 — Open Graph default).
// Usado pelo og-perfil/og-video do site quando nao ha thumbnail/avatar.
const sharp = require('sharp');
const path = require('path');

const OUT = path.join('C:', 'Users', 'felip', 'bluetube', 'public', 'og-default.png');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#020817"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>
    <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00c2ff"/>
      <stop offset="55%" stop-color="#1a6bff"/>
      <stop offset="100%" stop-color="#0a3ab0"/>
    </linearGradient>
    <linearGradient id="tubeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#8feaff"/>
      <stop offset="100%" stop-color="#0aa9ff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(260 195)">
    <rect x="0" y="0" width="220" height="220" rx="48" fill="url(#playGrad)"/>
    <rect x="12" y="12" width="196" height="196" rx="38" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
    <path d="M 82 62 L 170 110 L 82 158 Z" fill="#ffffff"/>
    <text x="260" y="96" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="100" fill="#ffffff" letter-spacing="-3">Blue</text>
    <text x="260" y="196" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="100" fill="url(#tubeGrad)" letter-spacing="-3">Tube</text>
  </g>
  <text x="600" y="520" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="30" fill="#29c6ff" text-anchor="middle" letter-spacing="4">A NOVA REDE SOCIAL DE VIDEOS DO BRASIL</text>
</svg>`;

sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(OUT)
  .then((info) => {
    console.log(`[og-default] OK -> ${OUT} (${info.width}x${info.height}, ${info.size} bytes)`);
  })
  .catch((e) => {
    console.error('[og-default] FAIL:', e);
    process.exit(1);
  });
