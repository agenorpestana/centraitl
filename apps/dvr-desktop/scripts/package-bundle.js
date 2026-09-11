const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

console.log('=== Empacotador do Instalador ITL DVR Agent Desktop ===');

const baseDesktopDir = path.resolve(__dirname, '..');
const rootAppDir = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(baseDesktopDir, '../..');
const serverUrl = process.argv[2] || 'https://monitoramento.unityautomacoes.com.br';

console.log(`- Diretório DVR Desktop: ${baseDesktopDir}`);
console.log(`- Diretório Raiz do Sistema: ${rootAppDir}`);
console.log(`- URL da Central configurada: ${serverUrl}`);

// 1. Criar ou atualizar dvr-config.json
const configData = {
  serverUrl: serverUrl.replace(/\/$/, ''),
  systemName: 'Central ITL de Câmeras & Monitoramento',
  generatedAt: new Date().toISOString(),
  defaultRetentionDays: 7,
  defaultStorageLimitGB: 100,
  autoStartOnBoot: true,
};

fs.writeFileSync(path.join(baseDesktopDir, 'dvr-config.json'), JSON.stringify(configData, null, 2));
fs.writeFileSync(path.join(baseDesktopDir, 'dist', 'dvr-config.json'), JSON.stringify(configData, null, 2));
console.log('✔ dvr-config.json configurado.');

// 2. Preparar pasta de distribuição temporária
const stagingDir = path.join(baseDesktopDir, 'release', 'ITL-DVR-Agent-Windows');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Copiar dist completo
function copyFolderSync(from, to) {
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

copyFolderSync(path.join(baseDesktopDir, 'dist'), path.join(stagingDir, 'dist'));
fs.copyFileSync(path.join(baseDesktopDir, 'package.json'), path.join(stagingDir, 'package.json'));
fs.copyFileSync(path.join(baseDesktopDir, 'dvr-config.json'), path.join(stagingDir, 'dvr-config.json'));

// Criar script de inicialização batch para Windows
const batContent = `@echo off
title ITL DVR Agent - Inicializador
echo ========================================================
echo   ITL DVR AGENT - MONITORAMENTO E GRAVACAO LOCAL
echo ========================================================
echo Servidor Central: ${configData.serverUrl}
echo.
cd /d "%~dp0"
if exist "node_modules\\electron\\dist\\electron.exe" (
  start "" "node_modules\\electron\\dist\\electron.exe" .
) else (
  where npx >nul 2>nul
  if %ERRORLEVEL% equ 0 (
    echo Executando via electron...
    start "" npx electron .
  ) else (
    echo ERRO: Node.js/Electron nao encontrado.
    echo Por favor, instale o Node.js v20+ ou o runtime do Electron.
    pause
  )
)
exit
`;
fs.writeFileSync(path.join(stagingDir, 'iniciar-dvr.bat'), batContent);

// Criar script de instalação de serviço / inicialização automática
const installBatContent = `@echo off
title Instalador ITL DVR Agent - Inicializacao Automatica
echo Configurando ITL DVR Agent para iniciar junto com o Windows...
set TARGET_DIR=%~dp0
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "ITLDvrAgent" /t REG_SZ /d "\\"%TARGET_DIR%iniciar-dvr.bat\\"" /f
echo.
echo ✔ DVR Agent configurado com sucesso para inicializacao automatica!
echo Pressione qualquer tecla para iniciar o DVR agora...
pause >nul
start "" "%TARGET_DIR%iniciar-dvr.bat"
exit
`;
fs.writeFileSync(path.join(stagingDir, 'instalar-inicializacao-automatica.bat'), installBatContent);

// Criar README instrutivo
const readmeContent = `====================================================================
               ITL DVR AGENT DESKTOP - GUIA DE INSTALACAO
====================================================================

Este pacote contem o agente de gravacao local do sistema ITL Monitoramento,
pre-configurado para conectar diretamente ao seu servidor:
${configData.serverUrl}

COMO USAR NO WINDOWS:
--------------------------------------------------------------------
1. Extraia todo o conteudo deste arquivo ZIP em uma pasta segura
   (Recomendado: C:\\ITL-DVR-Agent).

2. Para iniciar manualmente:
   - Dê um duplo clique em "iniciar-dvr.bat".

3. Para que o DVR inicie automaticamente com o Windows:
   - Execute "instalar-inicializacao-automatica.bat" como Administrador.

4. Na primeira abertura:
   - A URL da sua Central já virá preenchida (${configData.serverUrl}).
   - Insira o nome do DVR (ex: "DVR Recepcao") e suas credenciais de acesso.
   - O agente comecara imediatamente a gravar as cameras na pasta configurada
     (padrao: Videos\\ITL_Recordings) e sincronizar o status com a Central!

Gerado em: ${configData.generatedAt}
`;
fs.writeFileSync(path.join(stagingDir, 'LEIA-ME.txt'), readmeContent);

// 3. Compactar em arquivo .ZIP usando Python zipfile
const downloadsDir = path.join(rootAppDir, 'public', 'downloads');
const distDownloadsDir = path.join(rootAppDir, 'dist', 'downloads');
fs.mkdirSync(downloadsDir, { recursive: true });
fs.mkdirSync(distDownloadsDir, { recursive: true });

const zipFileName = 'itl-dvr-agent-windows.zip';
const targetZipPath = path.join(downloadsDir, zipFileName);
const targetDistZipPath = path.join(distDownloadsDir, zipFileName);

console.log(`3. Criando arquivo compactado ${zipFileName}...`);
try {
  // Use python3 -m zipfile to ensure universal cross-platform zip creation
  execSync(`python3 -m zipfile -c "${targetZipPath}" "${stagingDir}"`, { stdio: 'inherit' });
  fs.copyFileSync(targetZipPath, targetDistZipPath);
  console.log(`✔ Arquivo ZIP gerado com sucesso em: ${targetZipPath}`);
} catch (err) {
  console.error('Aviso ao gerar ZIP com python3:', err.message);
}

// 4. Se existir o instalador NSIS .exe compilado pelo electron-builder, copiar também
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
};

fs.writeFileSync(path.join(downloadsDir, 'installer-info.json'), JSON.stringify(infoData, null, 2));
fs.writeFileSync(path.join(distDownloadsDir, 'installer-info.json'), JSON.stringify(infoData, null, 2));

console.log('✔ Metadados do instalador salvos em installer-info.json.');
console.log('=== Empacotamento concluído com sucesso! ===');
