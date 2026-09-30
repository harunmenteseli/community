@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title Community - Durdur

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ================================================================
echo    Community - Durdur
echo  ================================================================
echo.
echo   Bu pencereyi iki kez calistirirsaniz container'lari da durdurur:
echo   stop.bat --docker
echo.

call "%ROOT%\_common.bat" :log_step "Node surecleri kapatiliyor"
call "%ROOT%\_common.bat" :kill_port 3000
call "%ROOT%\_common.bat" :kill_port 5173
call "%ROOT%\_common.bat" :kill_port 5174

if /i "%~1"=="--docker" goto :stop_docker

echo.
set "ANSWER="
set /p "ANSWER=   Container'lari da durdurmak ister misiniz? [e/H]: "
if /i "!ANSWER!"=="e" goto :stop_docker
if /i "!ANSWER!"=="y" goto :stop_docker

echo.
call "%ROOT%\_common.bat" :log_ok "Node surecleri durduruldu. Container'lar ayakta kaldi."
echo   Tamamen durdurmak icin: stop.bat --docker
exit /b 0

:stop_docker
call "%ROOT%\_common.bat" :log_step "Container'lar durduruluyor"
pushd "%ROOT%"
docker compose stop
set "RC=!ERRORLEVEL!"
popd
if not "!RC!"=="0" (
    call "%ROOT%\_common.bat" :log_warn "docker compose stop hata verdi."
    exit /b 1
)

echo.
call "%ROOT%\_common.bat" :log_ok "Her sey durduruldu. Tekrar baslatmak icin: start.bat"
exit /b 0
