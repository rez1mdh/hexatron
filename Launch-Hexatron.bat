@echo off
setlocal enabledelayedexpansion
title Hexatron World Builder

echo ===================================================
echo             HEXATRON - WORLD BUILDER
echo ===================================================
echo.

:: Ensure we are in the project folder
cd /d "%~dp0"

:: Check if Node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found on your computer.
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Once installed, double-click this launcher again.
    echo.
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found. Please ensure Node.js is installed properly.
    pause
    exit /b 1
)

echo [1/2] Checking local dependencies...
if not exist "node_modules\" (
    echo Installing dependencies for first-time setup...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install encountered an issue.
        pause
        exit /b 1
    )
)

echo [2/2] Starting Hexatron local application server...
echo.
echo ---------------------------------------------------
echo  Hexatron is launching at: http://localhost:5173
echo  Your browser will open automatically in a moment.
echo ---------------------------------------------------
echo.
echo  * To STOP the app safely: Close this window or press Ctrl + C.
echo  * Your worldbuilding data is saved safely in your browser database.
echo.

:: Open browser after a short delay in background
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173"

:: Start the Vite server
call npm run dev -- --host 0.0.0.0 --port 5173

pause
