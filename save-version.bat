@echo off
echo.
echo ========================================
echo   RedemptionFX Version Saver
echo ========================================
echo.

REM Check if we're in a git repository
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not in a git repository!
    echo Please run this script from your project directory.
    pause
    exit /b 1
)

REM Check if there are changes to commit
git status --porcelain >nul 2>&1
if %errorlevel% neq 0 (
    echo No changes to commit. Working directory is clean.
    pause
    exit /b 0
)

echo Enter a description for this version:
echo (e.g., "Added backup system", "Fixed login bug", etc.)
echo.
set /p description="Description: "

if "%description%"=="" (
    echo ERROR: Description cannot be empty!
    pause
    exit /b 1
)

echo.
echo Adding changes to git...
git add .

echo Creating commit...
for /f %%i in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"') do set timestamp=%%i
git commit -m "%description% - %timestamp%"

echo.
echo Recent commits:
echo ==================
git log --oneline -5

echo.
echo ========================================
echo   Version saved successfully!
echo ========================================
echo.
echo To restore to this version later, use:
echo   git reset --hard ^<commit-hash^>
echo   npm install
echo.
pause

