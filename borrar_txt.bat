@echo off
setlocal

:: Carpeta actual (donde está este archivo .bat)
set "CARPETA=%~dp0"

echo ⚠️  Eliminando todos los archivos .txt en:
echo    %CARPETA%
echo    (incluyendo subcarpetas...)

:: /S = incluye subdirectorios
:: /Q = modo silencioso (sin preguntar)
del /S /Q "%CARPETA%*.txt" >nul

echo.
echo ✅ Todos los archivos .txt han sido eliminados.
pause