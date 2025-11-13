@echo off
title RedemptionFX Platform - Startup
color 0A

echo.
echo ========================================
echo   RedemptionFX Platform - Quick Start
echo ========================================
echo.

REM Change to the correct directory
cd /d "%~dp0"

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please run this file from the project root directory.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js found!
echo ✅ Project directory confirmed!

REM Kill any existing processes on port 3000
echo.
echo 🔄 Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process %%a on port 3000...
    taskkill /PID %%a /F >nul 2>&1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo.
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed!
) else (
    echo ✅ Dependencies already installed!
)

REM Clear npm cache to avoid issues
echo.
echo 🧹 Clearing npm cache...
call npm cache clean --force >nul 2>&1

echo.
echo 🚀 Starting RedemptionFX Platform...
echo ========================================
echo   Server will start on http://localhost:3000
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the development server
call npm run dev

echo.
echo 🛑 Server stopped.
pause



