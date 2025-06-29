// Generate PWA manifest and copy static files for Vercel deployment
const fs = require('fs');
const path = require('path');

// Copy manifest.json to public directory
const manifestSource = path.join(__dirname, 'static', 'manifest.json');
const manifestDest = path.join(__dirname, 'public', 'manifest.json');

if (fs.existsSync(manifestSource)) {
  fs.copyFileSync(manifestSource, manifestDest);
  console.log('✅ Manifest copied to public directory');
} else {
  console.log('❌ Manifest.json not found in static directory');
}

// Copy service worker
const swSource = path.join(__dirname, '..', 'sw.js');
const swDest = path.join(__dirname, 'public', 'sw.js');

if (fs.existsSync(swSource)) {
  fs.copyFileSync(swSource, swDest);
  console.log('✅ Service worker copied to public directory');
} else {
  console.log('❌ sw.js not found');
}

console.log('🚀 Frontend build preparation complete');