@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Community - Testler

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ================================================================
echo    Community - Testler
echo.
echo    test.bat          testleri calistirir
echo    test.bat watch    API testlerini watch modunda calistirir
echo  ================================================================

call "%ROOT%\_common.bat" :require_pnpm
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :require_deps
if errorlevel 1 goto :fail

if /i "%~1"=="watch" (
    call "%ROOT%\_common.bat" :log_step "Testler watch modunda (Ctrl+C ile cik)"
    pushd "%ROOT%"
    call pnpm.cmd --filter @community/api test:watch
    set "RC=!ERRORLEVEL!"
    popd
    exit /b !RC!
)

call "%ROOT%\_common.bat" :log_step "Testler calisiyor"
pushd "%ROOT%"
call pnpm.cmd test
set "RC=!ERRORLEVEL!"
popd

echo.
if not "!RC!"=="0" (
    call "%ROOT%\_common.bat" :log_err "Testler basarisiz."
) else (
    call "%ROOT%\_common.bat" :log_ok "Testler gecti."
)
echo.
pause
exit /b !RC!

:fail
echo.
call "%ROOT%\_common.bat" :log_err "Testler calistirilamadi."
echo.
pause
exit /b 1
