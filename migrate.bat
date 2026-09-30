@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Community - DB Migration

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ================================================================
echo    Community - Veritabani Migration
echo.
echo    migrate.bat            bekleyen migration'lari uygular
echo    migrate.bat generate   yeni migration dosyasi uretir
echo  ================================================================

call "%ROOT%\_common.bat" :require_pnpm
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :require_docker
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :compose_up
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :wait_pg
if errorlevel 1 goto :fail

set "MODE=%~1"
if /i "!MODE!"=="generate" goto :generate

call "%ROOT%\_common.bat" :log_step "Bekleyen migration'lar uygulaniyor"
pushd "%ROOT%"
call pnpm.cmd db:migrate
set "RC=!ERRORLEVEL!"
popd
if not "!RC!"=="0" goto :fail
call "%ROOT%\_common.bat" :log_ok "Migration'lar uygulandi."
goto :done

:generate
call "%ROOT%\_common.bat" :log_step "Yeni migration dosyasi uretiliyor"
echo   Not: Semada degisiklik yapmadan generate calistirmak no-op olur.
pushd "%ROOT%"
call pnpm.cmd db:generate
set "RC=!ERRORLEVEL!"
popd
if not "!RC!"=="0" goto :fail
call "%ROOT%\_common.bat" :log_ok "Migration dosyalari uretildi."
echo.
echo   Simdi uygulamak icin: migrate.bat
goto :done

:done
echo.
call "%ROOT%\_common.bat" :log_ok "Islem tamamlandi."
echo.
pause
exit /b 0

:fail
echo.
call "%ROOT%\_common.bat" :log_err "Islem basarisiz oldu."
echo.
pause
exit /b 1
