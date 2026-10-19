const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('=== Empacotador do Visualizador ITL DVR Nativo Desktop ===');

const baseDesktopDir = path.resolve(__dirname, '..');
const rootAppDir = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(baseDesktopDir, '../..');
const serverUrl = process.argv[2] || 'https://centralitl.unityautomacoes.com.br';

console.log(`- Diretório DVR Desktop: ${baseDesktopDir}`);
console.log(`- Diretório Raiz do Sistema: ${rootAppDir}`);
console.log(`- URL da Central configurada: ${serverUrl}`);

// 1. Criar ou atualizar dvr-config.json
const configData = {
  serverUrl: serverUrl.replace(/\/$/, ''),
  systemName: 'Central ITL de Câmeras & Monitoramento',
  mode: 'DVR_VIEWER',
  cloudRecording: true,
  description: 'Visualizador Nativo DVR Desktop - Gravação contínua em nuvem 24 horas sem limitações de navegador',
  generatedAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(baseDesktopDir, 'dvr-config.json'), JSON.stringify(configData, null, 2));
if (fs.existsSync(path.join(baseDesktopDir, 'dist'))) {
  fs.writeFileSync(path.join(baseDesktopDir, 'dist', 'dvr-config.json'), JSON.stringify(configData, null, 2));
}
console.log('✔ dvr-config.json configurado.');

// 2. Preparar pasta de distribuição temporária
const stagingDir = path.join(baseDesktopDir, 'release', 'ITL-DVR-Viewer-Windows');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Função para copiar pasta recursivamente
function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

// Copiar arquivos do projeto
copyFolderSync(path.join(baseDesktopDir, 'dist'), path.join(stagingDir, 'dist'));
copyFolderSync(path.join(baseDesktopDir, 'src'), path.join(stagingDir, 'src'));
copyFolderSync(path.join(baseDesktopDir, 'scripts'), path.join(stagingDir, 'scripts'));

fs.copyFileSync(path.join(baseDesktopDir, 'package.json'), path.join(stagingDir, 'package.json'));
fs.copyFileSync(path.join(baseDesktopDir, 'tsconfig.json'), path.join(stagingDir, 'tsconfig.json'));
fs.copyFileSync(path.join(baseDesktopDir, 'dvr-config.json'), path.join(stagingDir, 'dvr-config.json'));
fs.copyFileSync(path.join(baseDesktopDir, 'iniciar-dvr.bat'), path.join(stagingDir, 'iniciar-dvr.bat'));
fs.copyFileSync(path.join(baseDesktopDir, 'compilar-instalador-windows.bat'), path.join(stagingDir, 'compilar-instalador-windows.bat'));

// Criar README instrutivo
const readmeContent = `====================================================================
           CENTRAL ITL - VISUALIZADOR DVR NATIVO (WINDOWS)
               Gravação Contínua em Nuvem 24 Horas
====================================================================

Servidor Central: ${configData.serverUrl}
Gerado em: ${configData.generatedAt}

Este pacote contém o Visualizador DVR Nativo para Windows, permitindo
monitorar todas as suas câmeras em formato de mural DVR (grades 1x1,
2x2, 3x3 e 4x4) com máxima aceleração de hardware e sem as limitações
de conexões simultâneas dos navegadores web.

IMPORTANTE: Todas as gravações permanecem ativas e seguras em nuvem
pela Central ITL. Nenhum espaço em disco local é consumido para gravação.

--------------------------------------------------------------------
COMO USAR NO WINDOWS:
--------------------------------------------------------------------

OPÇÃO 1: EXECUÇÃO DIRETA (INICIAR O VISUALIZADOR AGORA)
  1. Dê um duplo clique em "iniciar-dvr.bat".
  2. O visualizador nativo se abrirá conectando à Central ITL.
  3. Insira seu e-mail e senha de acesso.

OPÇÃO 2: GERAR O INSTALADOR EXECUTÁVEL (.EXE) NO WINDOWS
  Se você preferir ter o instalador oficial Windows (.exe) com atalho
  no Desktop e Menu Iniciar:
  1. Dê um duplo clique em "compilar-instalador-windows.bat".
  2. O script executará automaticamente os comandos:
       npm install
       npm run build
       npm run package:win
  3. O instalador final (.exe) será gerado na pasta "release\\".

Dúvidas ou suporte: Central ITL de Câmeras & Monitoramento
`;

fs.writeFileSync(path.join(stagingDir, 'LEIA-ME.txt'), readmeContent);

// 3. Compactar em arquivo .ZIP usando python3 zipfile
const downloadsDir = path.join(rootAppDir, 'public', 'downloads');
const distDownloadsDir = path.join(rootAppDir, 'dist', 'downloads');
fs.mkdirSync(downloadsDir, { recursive: true });
fs.mkdirSync(distDownloadsDir, { recursive: true });

const zipFileName = 'itl-dvr-agent-windows.zip';
const targetZipPath = path.join(downloadsDir, zipFileName);
const targetDistZipPath = path.join(distDownloadsDir, zipFileName);

console.log(`3. Compactando arquivo ${zipFileName}...`);
try {
  execSync(`python3 -m zipfile -c "${targetZipPath}" "${stagingDir}"`, { stdio: 'inherit' });
  fs.copyFileSync(targetZipPath, targetDistZipPath);
  console.log(`✔ Arquivo ZIP gerado com sucesso em: ${targetZipPath}`);
} catch (err) {
  console.error('Aviso ao gerar ZIP com python3:', err.message);
}

// 4. Se existir instalador .exe gerado, copiar também
const releaseDir = path.join(baseDesktopDir, 'release');
if (fs.existsSync(releaseDir)) {
  const files = fs.readdirSync(releaseDir);
  const exeFile = files.find(f => f.endsWith('.exe'));
  if (exeFile) {
    const srcExe = path.join(releaseDir, exeFile);
    fs.copyFileSync(srcExe, path.join(downloadsDir, exeFile));
    fs.copyFileSync(srcExe, path.join(distDownloadsDir, exeFile));
    console.log(`✔ Instalador NSIS .exe copiado para downloads: ${exeFile}`);
  }
}

// 5. Salvar metadados do instalador para o frontend
const zipStats = fs.existsSync(targetZipPath) ? fs.statSync(targetZipPath) : null;
let sha256 = '';
if (zipStats && fs.existsSync(targetZipPath)) {
  const fileBuffer = fs.readFileSync(targetZipPath);
  sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

const infoData = {
  isAvailable: Boolean(zipStats),
  version: '1.0.0',
  fileName: zipFileName,
  downloadUrl: `/downloads/${zipFileName}`,
  serverUrl: configData.serverUrl,
  sizeBytes: zipStats ? zipStats.size : 0,
  sizeFormatted: zipStats ? `${(zipStats.size / (1024 * 1024)).toFixed(2)} MB` : '0 MB',
  sha256,
  generatedAt: configData.generatedAt,
  mode: 'DVR_VIEWER',
  cloudRecording: true,
};

fs.writeFileSync(path.join(downloadsDir, 'installer-info.json'), JSON.stringify(infoData, null, 2));
fs.writeFileSync(path.join(distDownloadsDir, 'installer-info.json'), JSON.stringify(infoData, null, 2));

console.log('✔ Metadados do instalador salvos em installer-info.json.');
console.log('=== Empacotamento concluído com sucesso! ===');
