@echo off
REM ============================================================================
REM  Rebuild and restart the system in production mode.
REM
REM  Run this after ANY code change (or git pull). In production mode the
REM  servers run the pre-built output, so source edits do not appear until
REM  you rebuild.
REM
REM  Usage: double-click this file, or run  scripts\deploy-prod.cmd
REM ============================================================================

REM Stop on the first failing step instead of continuing with a broken build.
setlocal
set PM2="%APPDATA%\npm\pm2.cmd"

REM Move to the project root (the parent of this scripts folder).
cd /d "%~dp0.."

echo.
echo [1/5] Stopping the running servers...
REM next build cannot overwrite .next while next start is using it.
call %PM2% stop all >nul 2>&1

echo [2/5] Applying database migrations (prisma migrate deploy)...
REM "deploy" only applies existing migration files; it never creates new
REM ones or resets data, which makes it the safe command for production.
pushd apps\api
call npx prisma migrate deploy || goto :failed
popd

echo [3/5] Building the API (NestJS)...
call npm run build:api || goto :failed

echo [4/5] Building the web app (Next.js)...
call npm run build:web || goto :failed

echo [5/5] Starting the servers with PM2...
REM "startOrReload" starts apps that are missing and reloads ones that exist.
call %PM2% startOrReload ecosystem.config.cjs || goto :failed
REM Save the process list so it is restored at the next Windows logon.
call %PM2% save >nul

echo.
echo Done. Open http://localhost:3000  (or http://^<this-PC-IP^>:3000 from another device)
call %PM2% ls
goto :eof

:failed
echo.
echo *** Deploy FAILED at the step above. Servers were left stopped. ***
echo *** Fix the error, then run this script again.                 ***
REM If the failure happened inside apps\api, return to the root.
popd 2>nul
exit /b 1
