@echo off
title Central ITL - Visualizador DVR Nativo
echo ========================================================
echo   CENTRAL ITL - VISUALIZADOR DVR NATIVO (WINDOWS)
echo ========================================================
echo Servidor Central: https://centralitl.unityautomacoes.com.br
echo Modo: Visualizador de Cameras (Gravacao 100%% em Nuvem)
echo.
cd /d "%~dp0"

REM 1. Verificar se o executável descompactado já existe
if exist "release\win-unpacked\ITL DVR Agent.exe" (
  echo Iniciando executavel nativo...
  start "" "release\win-unpacked\ITL DVR Agent.exe"
  exit
)
if exist "win-unpacked\ITL DVR Agent.exe" (
  echo Iniciando executavel nativo...
  start "" "win-unpacked\ITL DVR Agent.exe"
  exit
)
if exist "ITL DVR Agent.exe" (
  echo Iniciando executavel nativo...
  start "" "ITL DVR Agent.exe"
  exit
)

REM 2. Verificar runtime Electron local em node_modules
if exist "node_modules\electron\dist\electron.exe" (
  echo Iniciando via Electron local...
  start "" "node_modules\electron\dist\electron.exe" .
  exit
)

REM 3. Fallback via npx / electron global
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo Iniciando via npx electron...
  start "" npx electron .
  exit
)

echo ========================================================
echo [AVISO] Node.js ou Electron nao encontrado neste computador.
echo Para gerar o instalador executavel (.exe) ou rodar o visualizador:
echo   1. Certifique-se de ter o Node.js v20+ instalado (nodejs.org)
echo   2. Execute o arquivo "compilar-instalador-windows.bat"
echo ========================================================
pause
