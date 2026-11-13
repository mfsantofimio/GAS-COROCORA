@echo off
title GAS COROCORA - Workers JavaScript (External Tasks)
cd /d "%~dp0workers"
echo ==========================================================
echo   GAS COROCORA - Workers JavaScript (External Tasks)
echo ==========================================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontro Node.js. Instale la version LTS desde https://nodejs.org
  pause
  exit /b 1
)
echo [OK] Node:
node -v

if not exist node_modules (
  echo Instalando dependencias ^(solo la primera vez^)...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] Fallo npm install. Revise su conexion a internet.
    pause
    exit /b 1
  )
)

echo.
echo Esperando a que Camunda responda en http://localhost:8080/engine-rest ...
:esperar
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://localhost:8080/engine-rest/engine -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  timeout /t 5 /nobreak >nul
  goto esperar
)
echo [OK] Camunda esta arriba. Iniciando workers...
echo.
call npm.cmd start
pause
