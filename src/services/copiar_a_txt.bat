@echo off
setlocal

set "CARPETA=%~dp0"
echo Procesando archivos en: %CARPETA%
echo.

:: Procesar .js
for %%f in ("%CARPETA%*.js") do call :procesar "%%f"

:: Procesar .json
for %%f in ("%CARPETA%*.json") do call :procesar "%%f"

echo.
echo Terminado
pause
exit /b

:procesar
set "archivo=%~1"
set "nombre=%~dpn1.txt"

:: Crear archivo .txt con ruta en primera línea
echo %~p1%~nx1 > "%nombre%"

:: Agregar contenido original
type "%archivo%" >> "%nombre%"

:: Mostrar mensaje en pantalla (NO en el archivo)
echo Copiado: %~nx1 --^> %~n1.txt
exit /b