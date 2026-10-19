@echo off
title Central ITL - Compilar Instalador Windows (.exe)
echo ========================================================
echo   CENTRAL ITL - COMPILADOR DO INSTALADOR WINDOWS (.EXE)
echo ========================================================
echo.
echo Este script executara os comandos necessarios no seu Windows
echo para compilar e gerar o instalador executavel (.exe) NSIS:
echo.
echo   1. npm install
echo   2. npm run build
echo   3. npm run package:win
echo.
echo URL da Central configurada: https://centralitl.unityautomacoes.com.br
echo Modo: Visualizador DVR Nativo (Gravacao 100%% em Nuvem)
echo ========================================================
echo.
cd /d "%~dp0"

echo [Passo 1/3] Instalando dependencias do Electron...
call npm install
if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERRO] Falha ao executar 'npm install'. Verifique sua conexao e se o Node.js esta instalado.
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo [Passo 2/3] Compilando fontes TypeScript e Interface...
call npm run build
if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERRO] Falha ao executar 'npm run build'.
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo [Passo 3/3] Gerando instalador executavel Windows NSIS (.exe)...
call npm run package:win
if %ERRORLEVEL% neq 0 (
  echo.
  echo [ERRO] Falha ao gerar o instalador executavel com electron-builder.
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo  ✔ SUCESSO! O instalador Windows foi gerado com exito!
echo.
echo  Local do Instalador .exe:
echo  %~dp0release\
echo.
echo  Voce ja pode abrir e instalar o ITL DVR Agent no Windows!
echo ========================================================
pause
