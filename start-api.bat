@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Community - Sadece API

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ================================================================
echo    Community - API baslatiliyor (sadece backend)
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

echo.
echo  API : http://localhost:3000
echo  Ctrl+C ile durdurun.
echo.

pushd "%ROOT%"
call pnpm.cmd dev:api
set "RC=!ERRORLEVEL!"
popd

exit /b !RC!

:fail
echo.
call "%ROOT%\_common.bat" :log_err "API baslatilamadi."
echo.
pause
exit /b 1
