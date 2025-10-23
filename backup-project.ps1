# RedemptionFX Project Backup Tool (PowerShell)
# Usage: .\backup-project.ps1

Write-Host "💾 RedemptionFX Project Backup Tool" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERROR: Not in the correct project directory!" -ForegroundColor Red
    Write-Host "Please navigate to the redemptionfx-platform folder first." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Get current timestamp for backup folder name
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$backupName = "redemptionfx-backup-$timestamp"
$backupPath = Join-Path ".." $backupName

Write-Host "📦 Creating backup: $backupName" -ForegroundColor Green
Write-Host ""

# Create backup directory
try {
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
    Write-Host "✅ Backup directory created: $backupPath" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Could not create backup directory!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Define files/folders to exclude
$excludePatterns = @(
    "node_modules",
    ".next",
    ".git",
    "*.log",
    "backup-*.zip",
    "redemptionfx-backup-*",
    "*.tmp",
    "*.temp"
)

Write-Host "📋 Copying project files..." -ForegroundColor Yellow
Write-Host "🚫 Excluding: node_modules, .next, .git, logs, temp files" -ForegroundColor Gray
Write-Host ""

# Copy files with progress
$sourcePath = "."
$items = Get-ChildItem -Path $sourcePath -Recurse | Where-Object {
    $item = $_
    $shouldExclude = $false
    
    foreach ($pattern in $excludePatterns) {
        if ($item.Name -like $pattern -or $item.FullName -like "*\$pattern\*") {
            $shouldExclude = $true
            break
        }
    }
    
    -not $shouldExclude
}

$totalItems = $items.Count
$currentItem = 0

foreach ($item in $items) {
    $currentItem++
    $progress = [math]::Round(($currentItem / $totalItems) * 100)
    
    $relativePath = $item.FullName.Substring((Resolve-Path $sourcePath).Path.Length + 1)
    $destinationPath = Join-Path $backupPath $relativePath
    
    if ($item.PSIsContainer) {
        # Create directory
        New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null
    } else {
        # Copy file
        $destinationDir = Split-Path $destinationPath -Parent
        if (-not (Test-Path $destinationDir)) {
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
        }
        Copy-Item -Path $item.FullName -Destination $destinationPath -Force
    }
    
    Write-Progress -Activity "Backing up files" -Status "Copying: $relativePath" -PercentComplete $progress
}

Write-Progress -Activity "Backing up files" -Completed

# Calculate backup size
$backupSize = (Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ BACKUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Backup Location: $backupPath" -ForegroundColor Yellow
Write-Host "📊 Backup Size: $backupSizeMB MB" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 To restore from this backup:" -ForegroundColor Cyan
Write-Host "   1. Stop your current project" -ForegroundColor White
Write-Host "   2. Rename current folder to 'redemptionfx-old'" -ForegroundColor White
Write-Host "   3. Rename '$backupName' to 'redemptionfx-platform1'" -ForegroundColor White
Write-Host "   4. Run npm install in the restored folder" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: You can also use Git to restore:" -ForegroundColor Green
Write-Host "   git log --oneline" -ForegroundColor Gray
Write-Host "   git reset --hard <commit-hash>" -ForegroundColor Gray
Write-Host ""

# Ask if user wants to compress the backup
$compress = Read-Host "Do you want to compress the backup? (y/n)"
if ($compress -eq "y" -or $compress -eq "Y") {
    Write-Host "🗜️ Compressing backup..." -ForegroundColor Yellow
    $zipPath = "$backupPath.zip"
    
    try {
        Compress-Archive -Path $backupPath -DestinationPath $zipPath -Force
        Remove-Item -Path $backupPath -Recurse -Force
        Write-Host "✅ Backup compressed to: $zipPath" -ForegroundColor Green
        
        $zipSize = (Get-Item $zipPath).Length / 1MB
        Write-Host "📊 Compressed size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Yellow
    } catch {
        Write-Host "❌ Failed to compress backup" -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "Press Enter to continue"

