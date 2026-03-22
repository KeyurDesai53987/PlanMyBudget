const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#475569"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <path d="M128 192 L224 288 L384 128" stroke="#10b981" stroke-width="40" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="160" y="280" width="192" height="24" rx="12" fill="#ffffff" opacity="0.3"/>
  <rect x="160" y="320" width="128" height="24" rx="12" fill="#ffffff" opacity="0.2"/>
</svg>`;

async function generateIcons() {
  const iconsDir = path.join(__dirname, 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  const sizes = [
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
  ];
  
  for (const { name, size } of sizes) {
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, name));
    console.log(`Generated ${name}`);
  }
  
  // Also copy to public root for manifest
  await sharp(Buffer.from(svgContent))
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, 'public', 'pwa-192x192.png'));
    
  await sharp(Buffer.from(svgContent))
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, 'public', 'pwa-512x512.png'));
    
  console.log('All icons generated!');
}

generateIcons().catch(console.error);
