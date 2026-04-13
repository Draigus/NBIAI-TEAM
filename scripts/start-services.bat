@echo off
REM ============================================================
REM NBI Services Startup Script
REM Starts PM2 + cloudflared independently of any terminal/IDE
REM Lives in Windows Startup folder for auto-start on login
REM Safe to run multiple times (idempotent)
REM ============================================================

set LOGFILE=%USERPROFILE%\nbi-services.log

echo [%date% %time%] ====== NBI Services starting ====== >> "%LOGFILE%"

REM --- Start PM2 daemon and restore saved processes ---
REM PM2 resurrect restores: nbi-dashboard (port 8888) + nbiai-api (port 3001)
echo [%date% %time%] Resurrecting PM2 processes... >> "%LOGFILE%"
call pm2 resurrect >> "%LOGFILE%" 2>&1

REM --- Start Cloudflare Tunnel in a detached minimised window ---
REM Check if already running first
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I "cloudflared.exe" >NUL
if %ERRORLEVEL% == 0 (
    echo [%date% %time%] cloudflared already running, skipping >> "%LOGFILE%"
) else (
    echo [%date% %time%] Starting cloudflared tunnel... >> "%LOGFILE%"
    powershell -Command "Start-Process -FilePath 'cloudflared' -ArgumentList 'tunnel','run','nbi-worksage' -WindowStyle Minimized"
    echo [%date% %time%] cloudflared launched detached >> "%LOGFILE%"
)

echo [%date% %time%] ====== NBI Services startup complete ====== >> "%LOGFILE%"
