@echo off
title ITL DVR Agent - Inicializador
echo ========================================================
echo   ITL DVR AGENT - MONITORAMENTO E GRAVACAO LOCAL
echo ========================================================
echo Servidor Central: https://monitoramento.unityautomacoes.com.br
echo.
cd /d "%~dp0"
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" .
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
