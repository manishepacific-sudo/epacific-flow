# TestSprite Test Runner with Credentials
# This script runs TestSprite tests with valid credentials configured

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       TestSprite - Epacific Flow Automated Testing        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if application is running
Write-Host "🔍 Checking if application is running on http://localhost:8080..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Application is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Application is NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start your application first:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    $startApp = Read-Host "Would you like to start it now? (y/n)"
    if ($startApp -eq 'y') {
        Write-Host "Starting application..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev"
        Write-Host "Waiting 10 seconds for app to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    } else {
        Write-Host "Exiting. Please start the application and run this script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📋 Test Credentials Configured:" -ForegroundColor Green
Write-Host "  ┌─────────────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "  │ Admin:   admin@epacific.com / Admin@123     │" -ForegroundColor Cyan
Write-Host "  │ Manager: jane.manager@epacific.com / ***    │" -ForegroundColor Cyan
Write-Host "  │ User:    john.doe@epacific.com / ***        │" -ForegroundColor Cyan
Write-Host "  └─────────────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""

Write-Host "📁 Configuration Files:" -ForegroundColor Green
Write-Host "  • testsprite_tests/test_credentials.json" -ForegroundColor White
Write-Host "  • testsprite_tests/testsprite_frontend_test_plan_with_credentials.json" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Starting TestSprite Test Execution..." -ForegroundColor Yellow
Write-Host "⏱️  This may take 5-15 minutes to complete." -ForegroundColor Yellow
Write-Host ""

# Run TestSprite
try {
    # Change to project directory
    Set-Location $PSScriptRoot
    
    # Run TestSprite generateCodeAndExecute
    $testspriteCmd = "node C:\Users\Lucifer\AppData\Local\npm-cache\_npx\8ddf6bea01b2519d\node_modules\@testsprite\testsprite-mcp\dist\index.js generateCodeAndExecute"
    
    Write-Host "Executing: $testspriteCmd" -ForegroundColor Gray
    Write-Host ""
    
    Invoke-Expression $testspriteCmd
    
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    if ($exitCode -eq 0) {
        Write-Host "✅ TestSprite execution completed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  TestSprite execution finished with code: $exitCode" -ForegroundColor Yellow
    }
    
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if report exists
    $reportPath = Join-Path $PSScriptRoot "testsprite_tests\testsprite-mcp-test-report.md"
    if (Test-Path $reportPath) {
        Write-Host "📊 Test Report Generated:" -ForegroundColor Green
        Write-Host "  $reportPath" -ForegroundColor White
        Write-Host ""
        
        $openReport = Read-Host "Would you like to open the report? (y/n)"
        if ($openReport -eq 'y') {
            Start-Process $reportPath
        }
    } else {
        Write-Host "⚠️  No test report found at $reportPath" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error running TestSprite:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. TestSprite MCP is installed" -ForegroundColor White
    Write-Host "  2. Application is running on http://localhost:8080" -ForegroundColor White
    Write-Host "  3. Network connection is stable" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "🎉 Done! Check the test results above." -ForegroundColor Green
Write-Host ""
Write-Host "📚 For more information, see:" -ForegroundColor Cyan
Write-Host "  • TESTSPRITE_SETUP_GUIDE.md" -ForegroundColor White
Write-Host "  • testsprite_tests/test_credentials.json" -ForegroundColor White
Write-Host ""

