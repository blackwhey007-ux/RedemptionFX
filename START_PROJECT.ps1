# RedemptionFX Platform - One-Click Startup Script
# Double-click this file to start your project

Write-Host "🚀 RedemptionFX Platform - One-Click Startup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Set the title
$Host.UI.RawUI.WindowTitle = "RedemptionFX Platform - Startup"

# Change to the script directory
Set-Location $PSScriptRoot

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
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

Write-Host "✅ Project directory confirmed!" -ForegroundColor Green

# Kill any existing processes on port 3000
Write-Host ""
Write-Host "🔄 Checking for existing processes..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($process in $processes) {
        $pid = $process.OwningProcess
        Write-Host "Killing process $pid on port 3000..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Failed to install dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies already installed!" -ForegroundColor Green
}

# Clear npm cache
Write-Host ""
Write-Host "🧹 Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>$null

Write-Host ""
Write-Host "🚀 Starting RedemptionFX Platform..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server will start on http://localhost:3000" -ForegroundColor White
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start the development server
try {
    npm run dev
} catch {
    Write-Host "❌ Error starting the server!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "🛑 Server stopped." -ForegroundColor Yellow
Read-Host "Press Enter to exit"



