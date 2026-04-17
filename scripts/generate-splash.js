// Gera assets/splash.png a partir de um SVG que reproduz a logo BlueTube.
// Fundo escuro (#020817), logo centralizada verticalmente, dimensao 1284x2778 (portrait iOS).
//
// NOTA: sharp NAO eh mais devDependency do projeto porque EAS Build (container Linux)
// falhava com binarios nativos dele. Pra rodar este script, instale temporariamente:
//   npm install sharp --no-save
//   node scripts/generate-splash.js
// Depois o assets/splash.png fica commitado e sharp nao eh mais necessario.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const W = 1284;
const H = 2778;
const BG = '#020817';

// Logo centralizada: play icon + "Blue" em cima, "Tube" em baixo, tagline "CRIADOR VIRAL" abaixo.
// viewBox = 1200x780 (aspect ~1.54) desenhado, depois escalado pra encaixar no splash.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00c2ff"/>
      <stop offset="55%" stop-color="#1a6bff"/>
      <stop offset="100%" stop-color="#0a3ab0"/>
    </linearGradient>
    <linearGradient id="playHighlight" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="40%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <linearGradient id="tubeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#8feaff"/>
      <stop offset="55%" stop-color="#29c6ff"/>
      <stop offset="100%" stop-color="#0aa9ff"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Grupo da logo centralizado (translate calculado pra centro aprox) -->
  <g transform="translate(${(W - 900) / 2}, ${(H - 760) / 2})">

    <!-- Play box azul -->
    <rect x="0" y="80" width="380" height="380" rx="70" ry="70" fill="url(#playGrad)"/>
    <rect x="14" y="94" width="352" height="352" rx="60" ry="60" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="3"/>
    <!-- Highlight interno (brilho topo) -->
    <rect x="28" y="108" width="324" height="180" rx="40" ry="40" fill="url(#playHighlight)"/>
    <!-- Triangulo de play -->
    <path d="M 150 180 L 290 270 L 150 360 Z" fill="#ffffff"/>

    <!-- Texto "Blue" -->
    <text x="430" y="230" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="200"
          fill="#ffffff" letter-spacing="-4">Blue</text>
    <!-- Texto "Tube" -->
    <text x="430" y="430" font-family="Arial Black, Helvetica, sans-serif" font-weight="900" font-size="200"
          fill="url(#tubeGrad)" letter-spacing="-4">Tube</text>

    <!-- Tagline -->
    <text x="430" y="500" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="52"
          fill="#1a8fd6" letter-spacing="18">CRIADOR VIRAL</text>

  </g>
</svg>`;

const outPath = path.join(__dirname, '..', 'assets', 'splash.png');

sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(outPath)
  .then((info) => {
    console.log(`[generate-splash] OK -> ${outPath} (${info.width}x${info.height}, ${info.size} bytes)`);
  })
  .catch((e) => {
    console.error('[generate-splash] FAIL:', e.message);
    process.exit(1);
  });
