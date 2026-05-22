const sharp = require('sharp');
const path = require('path');

async function generate() {
  const svg = path.join(__dirname, 'public/images/logo-image-only.svg');
  
  await sharp(svg).resize(192, 192).png().toFile(path.join(__dirname, 'public/images/icon-192x192.png'));
  await sharp(svg).resize(512, 512).png().toFile(path.join(__dirname, 'public/images/icon-512x512.png'));
  await sharp(svg).resize(180, 180).png().toFile(path.join(__dirname, 'public/images/apple-touch-icon.png'));
  await sharp(svg).resize(32, 32).png().toFile(path.join(__dirname, 'public/favicon.ico'));
  
  console.log('Icons generated successfully!');
}

generate().catch(console.error);
