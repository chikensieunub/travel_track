@echo off
title Travel Tracker
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed, or not on your PATH.
  echo   Install it from https://nodejs.org and run this again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo   First run - installing dependencies. This takes a minute.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   Install failed. See the messages above.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo   Starting Travel Tracker...
echo   A browser tab will open by itself. If it does not, go to:
echo.
echo       http://localhost:5173
echo.
echo   Leave this window open while you use the app.
echo   Close it, or press Ctrl+C, to stop the server.
echo.

call npm start

echo.
echo   Server stopped.
echo.
pause
