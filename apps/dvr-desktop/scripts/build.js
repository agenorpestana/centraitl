const fs = require('fs');
const path = require('path');

console.log('=== Compilando ITL DVR Agent Desktop ===');

const baseDir = path.resolve(__dirname, '..');
const srcDir = path.join(baseDir, 'src');
const distDir = path.join(baseDir, 'dist');

// Ensure directories exist
fs.mkdirSync(path.join(distDir, 'main'), { recursive: true });
fs.mkdirSync(path.join(distDir, 'renderer'), { recursive: true });

// Helper to copy if exists
function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✔ Copiado: ${path.relative(baseDir, dest)}`);
  }
}

// 1. Copy main process files
copyIfExists(path.join(srcDir, 'main', 'index.js'), path.join(distDir, 'main', 'index.js'));
copyIfExists(path.join(srcDir, 'main', 'preload.js'), path.join(distDir, 'main', 'preload.js'));
copyIfExists(path.join(srcDir, 'main', 'security-vault.js'), path.join(distDir, 'main', 'security-vault.js'));

// 2. Copy renderer files
copyIfExists(path.join(srcDir, 'renderer', 'index.html'), path.join(distDir, 'renderer', 'index.html'));
copyIfExists(path.join(srcDir, 'renderer', 'renderer.js'), path.join(distDir, 'renderer', 'renderer.js'));
copyIfExists(path.join(srcDir, 'renderer', 'hls.min.js'), path.join(distDir, 'renderer', 'hls.min.js'));

// Copy renderer assets if exist
const srcAssets = path.join(srcDir, 'renderer', 'assets');
const distAssets = path.join(distDir, 'renderer', 'assets');
if (fs.existsSync(srcAssets)) {
  fs.mkdirSync(distAssets, { recursive: true });
  fs.readdirSync(srcAssets).forEach((file) => {
    fs.copyFileSync(path.join(srcAssets, file), path.join(distAssets, file));
  });
}

// 3. Copy dvr-config.json
copyIfExists(path.join(baseDir, 'dvr-config.json'), path.join(distDir, 'dvr-config.json'));

console.log('=== Build do DVR Agent Desktop concluído com sucesso! ===');
