@echo off
echo.
echo ========================================
echo   RedemptionFX Project Backup Tool
echo ========================================
echo.

REM Get current timestamp for backup folder name
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD%-%HH%%Min%%Sec%"

REM Set backup directory name
set "backupName=redemptionfx-backup-%timestamp%"
set "backupPath=..\%backupName%"

echo Creating backup: %backupName%
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo ERROR: Not in the correct project directory!
    echo Please navigate to the redemptionfx-platform folder
    pause
    exit /b 1
)

REM Create backup directory
mkdir "%backupPath%" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Could not create backup directory!
    pause
    exit /b 1
)

echo Copying project files...
echo Excluding: node_modules, .next, .git, backup files
echo.

REM Copy files excluding certain directories and files
xcopy /E /I /H /Y /EXCLUDE:backup-exclude.txt . "%backupPath%\" >nul

REM Create exclude file if it doesn't exist
if not exist "backup-exclude.txt" (
    echo node_modules\ > backup-exclude.txt
    echo .next\ >> backup-exclude.txt
    echo .git\ >> backup-exclude.txt
    echo *.log >> backup-exclude.txt
    echo backup-*.zip >> backup-exclude.txt
    echo redemptionfx-backup-* >> backup-exclude.txt
)

REM Calculate backup size
for /f %%i in ('dir "%backupPath%" /s /-c ^| find "File(s)"') do set size=%%i

echo.
echo ========================================
echo   BACKUP COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Backup Location: %backupPath%
echo Backup Size: %size% bytes
echo.
echo To restore from this backup:
echo 1. Stop your current project
echo 2. Rename current folder to "redemptionfx-old"
echo 3. Rename "%backupName%" to "redemptionfx-platform1"
echo 4. Run npm install in the restored folder
echo.
echo Press any key to continue...
pause >nul

