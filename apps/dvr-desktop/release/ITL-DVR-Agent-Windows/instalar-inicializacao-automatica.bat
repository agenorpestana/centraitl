@echo off
title Instalador ITL DVR Agent - Inicializacao Automatica
echo Configurando ITL DVR Agent para iniciar junto com o Windows...
set TARGET_DIR=%~dp0
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ITLDvrAgent" /t REG_SZ /d "\"%TARGET_DIR%iniciar-dvr.bat\"" /f
echo.
echo ✔ DVR Agent configurado com sucesso para inicializacao automatica!
echo Pressione qualquer tecla para iniciar o DVR agora...
pause >nul
start "" "%TARGET_DIR%iniciar-dvr.bat"
exit
