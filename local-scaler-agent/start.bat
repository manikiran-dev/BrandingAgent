@echo off
rem Starts the Scaler agent (API on :5000, dashboard on :3000). Close this window or press Ctrl+C to stop.
cd /d "%~dp0"
rem A terminal opened before Node was installed has a stale PATH, so add the default install folder.
where node >nul 2>nul
if errorlevel 1 if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install it with: winget install OpenJS.NodeJS.LTS
  echo Then close this window and run start.bat again.
  pause
  exit /b 1
)
if not exist "server\node_modules" call npm.cmd run install:all
start "" http://localhost:3000
call npm.cmd run dev
pause
