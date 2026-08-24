const fs = require('fs')
const path = require('path')

// Create SVG icon
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

sizes.forEach(size => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#AAFF00;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#22C55E;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="${size/2}" y="${size * 0.68}" 
    font-family="Arial Black, Arial" 
    font-weight="900" 
    font-size="${size * 0.55}" 
    fill="#000000" 
    text-anchor="middle">H</text>
</svg>`

  fs.writeFileSync(path.join('public', 'icons', `icon-${size}.png`), svg)
  console.log(`Created icon-${size}.png`)
})
console.log('All icons created!')