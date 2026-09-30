@echo off
REM ============================================================================
REM  Community - ortak yardimci dosya
REM
REM  Dogrudan calistirilmaz. Diger .bat dosyalari su sekilde cagirir:
REM      call "%ROOT%\_common.bat" :log_ok "mesaj"
REM
REM  Her cagri kendi setlocal icinde calisir; cikis kodu EXIT_OK / EXIT_FAIL
REM  ile doner, bu yuzden cagiran tarafta "if errorlevel 1" kullanilir.
REM ============================================================================

setlocal EnableExtensions EnableDelayedExpansion

REM Not: .bat dosyalarinda ANSI renk kodu guvenilir degil (ESC karakteri
REM cogu konsolda duz metne donusur), bu yuzden isaretler duz metin basilir.

if "%ROOT%"=="" set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "EXIT_OK=0"
set "EXIT_FAIL=1"

REM --- dispatch ---------------------------------------------------------------
if "%~1"=="" exit /b %EXIT_OK%
goto %~1

REM ============================================================================
REM  Yazma yardimcilari
REM ============================================================================

:log
echo %~2
exit /b %EXIT_OK%

:log_ok
echo [OK] %~2
exit /b %EXIT_OK%

:log_warn
echo [!] %~2
exit /b %EXIT_OK%

:log_err
echo [HATA] %~2
exit /b %EXIT_FAIL%

:log_step
echo.
echo === %~2 ===
exit /b %EXIT_OK%

REM ============================================================================
REM  Kontroller
REM ============================================================================

:require_pnpm
where pnpm.cmd >nul 2>&1
if errorlevel 1 (
    call :log_err "pnpm bulunamadi."
    echo         Node.js 20+ ve pnpm kurulu olmali: https://pnpm.io/installation
    exit /b %EXIT_FAIL%
)
exit /b %EXIT_OK%

:require_deps
if exist "%ROOT%\node_modules" exit /b %EXIT_OK%
call :log_warn "Bagimliliklar kurulu degil, pnpm install calistiriliyor..."
pushd "%ROOT%"
call pnpm.cmd install
set "RC=!ERRORLEVEL!"
popd
if not "!RC!"=="0" (
    call :log_err "pnpm install basarisiz oldu."
    exit /b %EXIT_FAIL%
)
exit /b %EXIT_OK%

:require_docker
docker info >nul 2>&1
if not errorlevel 1 exit /b %EXIT_OK%

call :log_warn "Docker Desktop calismiyor, baslatiliyor..."
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
) else (
    call :log_err "Docker Desktop bulunamadi."
    echo         Kurulum: https://docs.docker.com/desktop/install/windows-install/
    exit /b %EXIT_FAIL%
)

set "TRIES=0"
:wait_docker_loop
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 (
    call :log_ok "Docker hazir."
    exit /b %EXIT_OK%
)
set /a TRIES+=1
if !TRIES! GEQ 40 (
    call :log_err "Docker 120 saniyede acilmadi."
    exit /b %EXIT_FAIL%
)
goto :wait_docker_loop

:compose_up
call :log_step "PostgreSQL (5433) ve Redis (6380) baslatiliyor..."
pushd "%ROOT%"
docker compose up -d postgres redis
set "RC=!ERRORLEVEL!"
popd
if not "!RC!"=="0" (
    call :log_err "docker compose up basarisiz oldu."
    exit /b %EXIT_FAIL%
)
call :log_ok "Container'lar ayaga kalkti."
exit /b %EXIT_OK%

:wait_pg
set "TRIES=0"
:wait_pg_loop
docker exec community-postgres pg_isready -U community -d community >nul 2>&1
if not errorlevel 1 (
    call :log_ok "PostgreSQL hazir."
    exit /b %EXIT_OK%
)
set /a TRIES+=1
if !TRIES! GEQ 30 (
    call :log_err "PostgreSQL 60 saniyede hazir olmadi."
    echo         Container durumu: docker compose ps
    exit /b %EXIT_FAIL%
)
timeout /t 2 /nobreak >nul
goto :wait_pg_loop

:ensure_env
if exist "%ROOT%\apps\api\.env" exit /b %EXIT_OK%
if exist "%ROOT%\apps\api\.env.example" (
    copy /y "%ROOT%\apps\api\.env.example" "%ROOT%\apps\api\.env" >nul
    call :log_ok "apps\api\.env olusturuldu (.env.example kopyalandi)."
    exit /b %EXIT_OK%
)
call :log_err "apps\api\.env ve .env.example bulunamadi."
exit /b %EXIT_FAIL%

:run_migrations
call :log_step "Veritabani migration'lari uygulaniyor..."
pushd "%ROOT%"
call pnpm.cmd db:migrate
set "RC=!ERRORLEVEL!"
popd
if not "!RC!"=="0" (
    call :log_err "Migration basarisiz oldu."
    exit /b %EXIT_FAIL%
)
call :log_ok "Migration'lar uygulandi."
exit /b %EXIT_OK%

REM ============================================================================
REM  Port yardimcilari
REM ============================================================================

REM Not: findstr /R ile /C birlikte kullanilamaz; sabit metin aramasi /L ile
REM yapilir. ":<port> " ifadesi IPv6 adreslerde de eslesir.

:port_in_use
netstat -ano | findstr /L ":%~2 " | findstr /L "LISTENING" >nul 2>&1
exit /b %ERRORLEVEL%

:warn_port
call :port_in_use none %~1
if errorlevel 1 exit /b %EXIT_OK%
echo [!] Port %~1 su an kullanimda.
echo         Eski bir surec calisiyor olabilir. Once stop.bat calistirin.
exit /b %EXIT_OK%

:kill_port
set "TARGET=%~1"
set "KILLED=0"
for /f "tokens=5" %%I in ('netstat -ano ^| findstr /L ":!TARGET! " ^| findstr /L "LISTENING"') do (
    if not "%%I"=="0" (
        echo   Port !TARGET! -^> PID %%I kapatiliyor...
        taskkill /F /T /PID %%I >nul 2>&1
        set "KILLED=1"
    )
)
if "!KILLED!"=="0" (
    echo   Port %~1 - dinleyen surec yok.
    exit /b %EXIT_OK%
)
timeout /t 1 /nobreak >nul
call :port_in_use none %~1
if errorlevel 1 (
    call :log_ok "Port %~1 serbest birakildi."
    exit /b %EXIT_OK%
)
call :log_warn "Port %~1 hala kullanimda. Islemi elle kapatin."
exit /b %EXIT_FAIL%

:wait_api
set "TRIES=0"
:wait_api_loop
curl.exe -s -o nul http://localhost:3000/health 2>nul | findstr /L "\"status\"" >nul 2>&1
if not errorlevel 1 (
    call :log_ok "API hazir: http://localhost:3000/health"
    exit /b %EXIT_OK%
)
set /a TRIES+=1
if !TRIES! GEQ 40 (
    call :log_err "API 80 saniyede yanit vermedi."
    echo         "Community API" penceresine bak.
    exit /b %EXIT_FAIL%
)
timeout /t 2 /nobreak >nul
goto :wait_api_loop

exit /b %EXIT_OK%
