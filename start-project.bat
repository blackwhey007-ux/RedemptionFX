@echo off
echo.
echo ========================================
echo   RedemptionFX Platform Startup
echo ========================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found! Checking project directory...
if not exist "package.json" (
    echo ERROR: Not in the correct project directory!
    echo Please navigate to the redemptionfx-platform folder
    pause
    exit /b 1
)

echo Project directory found! Installing dependencies...
call npm install

echo.
echo Dependencies installed! Starting development server...
echo.
echo ========================================
echo   Server will start on http://localhost:3000
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

echo Starting development server...
start /B npm run dev

echo.
echo Waiting for server to start...
timeout /t 8 /nobreak >nul

echo.
echo Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo   Server is running at http://localhost:3000
echo   Browser should open automatically
echo   Press Ctrl+C in the terminal to stop the server
echo ========================================
echo.

pause

