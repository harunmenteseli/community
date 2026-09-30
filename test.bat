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
echo    test.bat          unit testler (vitest)
echo    test.bat watch    API testlerini watch modunda
echo    test.bat e2e      Playwright e2e testleri
echo    test.bat all      unit + e2e
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

set "RUN_E2E=0"
if /i "%~1"=="e2e" set "RUN_E2E=1"
if /i "%~1"=="all" set "RUN_E2E=1"

call "%ROOT%\_common.bat" :log_step "Unit testler calisiyor"
pushd "%ROOT%"
call pnpm.cmd test
set "RC=!ERRORLEVEL!"
popd

if "!RC!"=="0" if "!RUN_E2E!"=="1" (
    echo.
    call "%ROOT%\_common.bat" :log_step "e2e testler calisiyor (API 4311 / Web 4310)"
    call "%ROOT%\_common.bat" :require_docker
    if not errorlevel 1 (
        pushd "%ROOT%"
        call pnpm.cmd exec docker compose up -d postgres redis
        call pnpm.cmd db:migrate
        popd
    )
    pushd "%ROOT%"
    call pnpm.cmd test:e2e
    set "RC=!ERRORLEVEL!"
    popd
)

echo.
if not "!RC!"=="0" (
    call "%ROOT%\_common.bat" :log_err "Testler basarisiz."
) else (
    call "%ROOT%\_common.bat" :log_ok "Tum testler gecti."
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
