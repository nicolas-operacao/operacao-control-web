// Script para gerar ícones PWA usando SVG puro -> PNG via browser não disponível em node
// Gera um SVG que o Vite vai servir como ícone
import { writeFileSync } from 'fs';

// SVG do ícone — escudo amarelo com "OC"
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#09090b"/>
  <path d="M256 60 L420 130 L420 280 Q420 390 256 460 Q92 390 92 280 L92 130 Z" fill="#facc15" opacity="0.15" stroke="#facc15" stroke-width="8"/>
  <path d="M256 90 L400 150 L400 280 Q400 375 256 435 Q112 375 112 280 L112 150 Z" fill="#facc15" opacity="0.25"/>
  <text x="256" y="295" font-family="Arial Black, sans-serif" font-size="140" font-weight="900" fill="#facc15" text-anchor="middle" dominant-baseline="middle">OC</text>
</svg>`;

writeFileSync('public/icon.svg', svg);
console.log('SVG gerado em public/icon.svg');
console.log('NOTA: Para gerar os PNGs (icon-192.png e icon-512.png), use qualquer conversor SVG->PNG online com os tamanhos 192x192 e 512x512, ou use o icon.svg como fallback.');
