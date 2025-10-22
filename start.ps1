# RedemptionFX Platform - PowerShell Quick Start Script
# Usage: .\start.ps1

Write-Host "🚀 RedemptionFX Platform - Quick Start" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERROR: Not in the correct project directory!" -ForegroundColor Red
    Write-Host "Please navigate to the redemptionfx-platform folder first." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "🔥 Starting development server..." -ForegroundColor Green
Write-Host ""

# Start the development server in background
$process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden

# Wait a moment for the server to start
Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Open browser
Write-Host "🌐 Opening browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Server is running at http://localhost:3000" -ForegroundColor Green
Write-Host "✅ Browser should open automatically" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop the server, close this window or press Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Keep the script running and show the server output
try {
    $process.WaitForExit()
} catch {
    Write-Host "Server stopped." -ForegroundColor Yellow
}
