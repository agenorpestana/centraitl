const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Compilando ITL DVR Agent Desktop ===');

// 1. Executar TypeScript Compiler
console.log('1. Executando compilação TypeScript (tsc)...');
try {
  execSync('npx tsc -p tsconfig.json', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
} catch (err) {
  console.error('Falha na compilação TypeScript.');
  process.exit(1);
}

// 2. Copiar arquivos HTML e estáticos do renderer para dist/renderer
console.log('2. Copiando assets do renderer para dist/renderer...');
const baseDir = path.resolve(__dirname, '..');
const srcRenderer = path.join(baseDir, 'src', 'renderer');
const distRenderer = path.join(baseDir, 'dist', 'renderer');

fs.mkdirSync(distRenderer, { recursive: true });

if (fs.existsSync(path.join(srcRenderer, 'index.html'))) {
  fs.copyFileSync(path.join(srcRenderer, 'index.html'), path.join(distRenderer, 'index.html'));
  console.log('✔ index.html copiado para dist/renderer/');
}

// Copiar dvr-config.json se existir
const configSrc = path.join(baseDir, 'dvr-config.json');
const configDist = path.join(baseDir, 'dist', 'dvr-config.json');
if (fs.existsSync(configSrc)) {
  fs.copyFileSync(configSrc, configDist);
  console.log('✔ dvr-config.json copiado para dist/');
}

console.log('=== Build do DVR Agent Desktop concluído com sucesso! ===');
