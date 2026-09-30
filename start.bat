@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Community - Baslat

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ================================================================
echo    Community - Baslat
echo  ================================================================

call "%ROOT%\_common.bat" :require_pnpm
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :require_deps
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :require_docker
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :compose_up
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :wait_pg
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :ensure_env
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :run_migrations
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :warn_port 3000
call "%ROOT%\_common.bat" :warn_port 5173

echo.
echo  API baslatiliyor...
start "Community API" cmd /k "cd /d ""%ROOT%"" && pnpm.cmd dev:api"

echo  WEB baslatiliyor...
start "Community WEB" cmd /k "cd /d ""%ROOT%"" && pnpm.cmd dev:web"

call "%ROOT%\_common.bat" :log_step "API bekleniyor..."
call "%ROOT%\_common.bat" :wait_api
if errorlevel 1 goto :api_fail

start "" http://localhost:5173

echo.
echo  ================================================================
echo    Calisiyor.
echo.
echo   WEB : http://localhost:5173
echo   API : http://localhost:3000
echo.
echo   API  : "Community API" penceresinde Ctrl+C
echo   WEB  : "Community WEB" penceresinde Ctrl+C
echo   Hepsi: stop.bat
echo  ================================================================
echo.
exit /b 0

:api_fail
echo.
call "%ROOT%\_common.bat" :log_err "API ayaga kalkmadi. API penceresindeki hata mesajini okuyun."
echo   Servisler yine de calisiyor olabilir; pencereleri ayrica kontrol edin.
echo.
pause
exit /b 1

:fail
echo.
call "%ROOT%\_common.bat" :log_err "Baslatma basarisiz oldu."
echo   Ilk kurulum gerekiyorsa setup.bat calistirin.
echo.
pause
exit /b 1
