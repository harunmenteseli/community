@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Community - Kurulum

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ================================================================
echo    Community - Ilk Kurulum
echo    Futbol oyunlari toplulugu platformu
echo  ================================================================

call "%ROOT%\_common.bat" :log_step "1/5  Kontrol: pnpm"
call "%ROOT%\_common.bat" :require_pnpm
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :log_step "2/5  Bagimliliklar"
call "%ROOT%\_common.bat" :require_deps
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :log_ok "Bagimliliklar hazir."

call "%ROOT%\_common.bat" :log_step "3/5  Docker Desktop"
call "%ROOT%\_common.bat" :require_docker
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :log_step "4/5  Veritabani ve Redis"
call "%ROOT%\_common.bat" :compose_up
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :wait_pg
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :log_step "5/5  API ortam dosyasi ve migration"
call "%ROOT%\_common.bat" :ensure_env
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :run_migrations
if errorlevel 1 goto :fail

echo.
echo  ================================================================
echo    Kurulum tamamlandi.
echo.
echo   Projeyi baslatmak icin:  start.bat
echo  ================================================================
echo.
pause
exit /b 0

:fail
echo.
call "%ROOT%\_common.bat" :log_err "Kurulum basarisiz oldu. Yukaridaki mesaji kontrol et."
echo.
pause
exit /b 1
