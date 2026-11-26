@echo off
REM ============================================================================
REM  Auto-start script for the Asset Management System.
REM
REM  Windows Task Scheduler runs this at user logon
REM  (task name: AssetManagementSystem-AutoStart).
REM  It brings back the PM2-managed servers: ams-api (3001) and ams-web (3000).
REM
REM  Comments are in English on purpose: cmd.exe reads .cmd files in the
REM  console code page, and non-ASCII text can break parsing.
REM ============================================================================

REM Give the PostgreSQL Windows service time to finish starting, otherwise
REM the API may boot before the database accepts connections.
timeout /t 20 /nobreak >nul

REM Move to the project root (the parent folder of this scripts folder),
REM so the relative path "ecosystem.config.cjs" below resolves correctly.
cd /d "%~dp0.."

REM Restore the process list saved earlier with "pm2 save".
REM This also starts the PM2 background daemon if it is not running.
call "%APPDATA%\npm\pm2.cmd" resurrect

REM Safety net: if nothing was restored (no saved list, or it was cleared),
REM "pm2 describe" fails, so start the apps from the config file instead.
call "%APPDATA%\npm\pm2.cmd" describe ams-api >nul 2>&1
if errorlevel 1 call "%APPDATA%\npm\pm2.cmd" start ecosystem.config.cjs
