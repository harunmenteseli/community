@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Community - Sadece Web

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ================================================================
echo    Community - WEB baslatiliyor (sadece frontend)
echo  ================================================================
echo.
echo   NOT: API ayrica calismali. Gerekirse baska pencerede
echo        start-api.bat calistirin.
echo.

call "%ROOT%\_common.bat" :require_pnpm
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :require_deps
if errorlevel 1 goto :fail

call "%ROOT%\_common.bat" :warn_port 5173

echo.
echo  WEB : http://localhost:5173
echo  Ctrl+C ile durdurun.
echo.

pushd "%ROOT%"
call pnpm.cmd dev:web
set "RC=!ERRORLEVEL!"
popd

exit /b !RC!

:fail
echo.
call "%ROOT%\_common.bat" :log_err "WEB baslatilamadi."
echo.
pause
exit /b 1
