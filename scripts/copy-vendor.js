// Copies the Chart.js UMD build out of node_modules into vendor/, so the
// static site can load it with a plain <script> tag instead of the jsdelivr
// CDN. Re-run after bumping the chart.js devDependency version.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'chart.js', 'dist', 'chart.umd.js');
const destDir = path.join(__dirname, '..', 'vendor');
const dest = path.join(destDir, 'chart.umd.js');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copied ${src} -> ${dest}`);
