@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Community - Kontrol (typecheck / lint / build)

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ================================================================
echo    Community - Kalite Kontrolu
echo    1) typecheck   2) lint   3) build
echo  ================================================================

call "%ROOT%\_common.bat" :require_pnpm
if errorlevel 1 goto :fail
call "%ROOT%\_common.bat" :require_deps
if errorlevel 1 goto :fail

set "FAILED="

call "%ROOT%\_common.bat" :log_step "1/3  Typecheck"
pushd "%ROOT%"
call pnpm.cmd typecheck
if errorlevel 1 (
    set "FAILED=1"
    call "%ROOT%\_common.bat" :log_err "Typecheck BASARISIZ"
)
popd

call "%ROOT%\_common.bat" :log_step "2/3  Lint"
pushd "%ROOT%"
call pnpm.cmd lint
if errorlevel 1 (
    set "FAILED=1"
    call "%ROOT%\_common.bat" :log_err "Lint BASARISIZ"
)
popd

call "%ROOT%\_common.bat" :log_step "3/3  Build"
pushd "%ROOT%"
call pnpm.cmd build
if errorlevel 1 (
    set "FAILED=1"
    call "%ROOT%\_common.bat" :log_err "Build BASARISIZ"
)
popd

echo.
if "!FAILED!"=="1" (
    call "%ROOT%\_common.bat" :log_err "Kontrol basarisiz. Yukaridaki ciktiyi inceleyin."
) else (
    call "%ROOT%\_common.bat" :log_ok "Tum kontroller gecti."
)
echo.
pause
if "!FAILED!"=="1" exit /b 1
exit /b 0

:fail
echo.
call "%ROOT%\_common.bat" :log_err "pnpm bulunamadi veya bagimliliklar kurulamadi."
echo.
pause
exit /b 1
