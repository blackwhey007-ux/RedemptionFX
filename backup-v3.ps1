# Simple Backup Script for v3
$timestamp = "2025-10-29-045100"
$backupName = "redemptionfx-backup-v3-$timestamp"
$backupPath = Join-Path ".." $backupName

Write-Host "Creating backup: $backupName" -ForegroundColor Green

# Create backup directory
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
Write-Host "Backup directory created: $backupPath" -ForegroundColor Green

# Copy all files except exclusions
$excludePatterns = @("node_modules", ".next", ".git", "*.log", "*.tmp", "*.temp")

Get-ChildItem -Path "." -Recurse | Where-Object {
    $item = $_
    $shouldExclude = $false
    
    foreach ($pattern in $excludePatterns) {
        if ($item.Name -like $pattern -or $item.FullName -like "*\$pattern\*") {
            $shouldExclude = $true
            break
        }
    }
    
    -not $shouldExclude
} | ForEach-Object {
    $relativePath = $_.FullName.Substring((Resolve-Path ".").Path.Length + 1)
    $destinationPath = Join-Path $backupPath $relativePath
    
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
    } else {
        $destinationDir = Split-Path $destinationPath -Parent
        if (-not (Test-Path $destinationDir)) {
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        }
        Copy-Item -Path $_.FullName -Destination $destinationPath -Force
    }
}

# Calculate backup size
$backupSize = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)

Write-Host "Backup completed!" -ForegroundColor Green
Write-Host "Location: $backupPath" -ForegroundColor Yellow
Write-Host "Size: $backupSizeMB MB" -ForegroundColor Yellow

# Create version info file
$versionInfo = @"
VIP Telegram Reports v3 Backup
==============================

Version: v3
Date: October 29, 2025
Backup Time: $timestamp
Backup Size: $backupSizeMB MB

Features Included:
- VIP Telegram Reports System
- Automated Daily/Weekly/Monthly Reports
- Manual Report Triggering
- Marketing Links Integration
- Dual Channel Support (VIP + Public)
- Comprehensive Logging
- Bug Fixes Applied

Files Created:
- src/lib/reportService.ts
- app/api/telegram/send-report/route.ts
- app/api/cron/send-reports/route.ts

Files Modified:
- src/types/telegram.ts
- app/dashboard/admin/telegram-settings/page.tsx
- src/lib/telegramService.ts
- app/api/telegram/send-report/route.ts (URL fix)
- app/api/cron/send-reports/route.ts (URL fix)

Status: Complete and Functional
"@

$versionInfo | Out-File -FilePath (Join-Path $backupPath "VERSION_INFO.txt") -Encoding UTF8

Write-Host "Version info file created" -ForegroundColor Green
Write-Host "Backup ready!" -ForegroundColor Cyan



