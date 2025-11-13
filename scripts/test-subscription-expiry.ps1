# Test Subscription Expiry Cron Job
# Usage: .\scripts\test-subscription-expiry.ps1

param(
    [string]$Url = "http://localhost:3000/api/cron/check-subscription-expiry",
    [string]$CronSecret = $env:CRON_SECRET
)

if (-not $CronSecret) {
    Write-Host "❌ Error: CRON_SECRET not found in environment variables" -ForegroundColor Red
    Write-Host "   Set it with: `$env:CRON_SECRET = 'your-secret'" -ForegroundColor Yellow
    Write-Host "   Or check your .env.local file" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔄 Testing subscription expiry cron job..." -ForegroundColor Cyan
Write-Host "   URL: $Url" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $CronSecret"
}

try {
    $response = Invoke-RestMethod -Uri $Url -Method POST -Headers $headers -Body "{}" -ErrorAction Stop
    
    Write-Host "✅ Request successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10)
    Write-Host ""
    
    # Summary
    if ($response.success) {
        Write-Host "Summary:" -ForegroundColor Cyan
        Write-Host "  Expired Members: $($response.expiredCount)" -ForegroundColor $(if ($response.expiredCount -gt 0) { "Yellow" } else { "Green" })
        Write-Host "  Successfully Processed: $($response.successCount)" -ForegroundColor Green
        Write-Host "  Errors: $($response.errorCount)" -ForegroundColor $(if ($response.errorCount -gt 0) { "Red" } else { "Green" })
        Write-Host "  Role Downgrades: $($response.roleDowngradeCount)" -ForegroundColor Green
        Write-Host "  Telegram Removals: $($response.telegramRemovedCount)" -ForegroundColor Green
        
        if ($response.summary.warnings.Count -gt 0) {
            Write-Host ""
            Write-Host "⚠️  Warnings:" -ForegroundColor Yellow
            foreach ($warning in $response.summary.warnings) {
                Write-Host "  - $warning" -ForegroundColor Yellow
            }
        }
        
        if ($response.summary.errors.Count -gt 0) {
            Write-Host ""
            Write-Host "❌ Errors:" -ForegroundColor Red
            foreach ($error in $response.summary.errors) {
                Write-Host "  - $($error.email): $($error.error)" -ForegroundColor Red
            }
        }
    }
    
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
    
    exit 1
}

Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check Firebase Console → users collection for role changes" -ForegroundColor Gray
Write-Host "   2. Check Firebase Console → subscriptionExpiryLogs for audit trail" -ForegroundColor Gray
Write-Host "   3. Verify Telegram group to confirm removals" -ForegroundColor Gray


