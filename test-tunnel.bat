@echo off
echo 🔍 ========================================
echo 🔍 TEST DE CONEXIÓN EXPO TUNNEL (Windows)
echo 🔍 ========================================
echo.

set problemas=0
set advertencias=0

REM 1. Verificar Node
echo 📌 1. Verificando Node.js...
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js: %%i
) else (
    echo ❌ Node.js no instalado
    set /a problemas+=1
)

REM 2. Verificar NPM
echo.
echo 📌 2. Verificando NPM...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ NPM: %%i
) else (
    echo ❌ NPM no instalado
    set /a problemas+=1
)

REM 3. Verificar Expo
echo.
echo 📌 3. Verificando Expo CLI...
where expo >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('expo --version') do echo ✅ Expo CLI: %%i
) else (
    echo ⚠️ Expo CLI no encontrado (usando npx)
    set /a advertencias+=1
)

REM 4. Test de conexión
echo.
echo 📌 4. Test de conexión a exp.host...
curl -s --head --request GET https://exp.host >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Conexión a exp.host: OK
) else (
    echo ❌ No se pudo conectar a exp.host
    set /a problemas+=1
)

REM 5. Verificar puertos
echo.
echo 📌 5. Verificando puertos...
for %%p in (8081 19000 19001 19002) do (
    netstat -ano | findstr :%%p >nul 2>nul
    if %errorlevel% equ 0 (
        echo ⚠️ Puerto %%p: EN USO
        set /a advertencias+=1
    ) else (
        echo ✅ Puerto %%p: DISPONIBLE
    )
)

REM 6. Verificar package.json
echo.
echo 📌 6. Verificando package.json...
if exist "./package.json" (
    echo ✅ package.json existe
) else (
    echo ❌ package.json no existe
    set /a problemas+=1
)

REM 7. Verificar node_modules
echo.
echo 📌 7. Verificando node_modules...
if exist "./node_modules" (
    echo ✅ node_modules existe
) else (
    echo ❌ node_modules no existe
    echo 💡 Ejecuta: npm install
    set /a problemas+=1
)

REM Resumen
echo.
echo 🔍 ========================================
echo 🔍 RESUMEN
echo 🔍 ========================================
echo ❌ Problemas: %problemas%
echo ⚠️ Advertencias: %advertencias%

if %problemas% equ 0 (
    echo 🎉 ¡Configuración lista para Expo Tunnel!
) else (
    echo ⚠️ Resuelve los problemas antes de continuar
)
echo 🔍 ========================================
echo.
pause