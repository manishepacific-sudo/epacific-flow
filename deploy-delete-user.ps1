# Deploy delete-user Edge Function to Supabase
# This script helps deploy the fixed delete-user function

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deploy delete-user Function Fix" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if ($null -eq $supabaseCli) {
    Write-Host "❌ Supabase CLI is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please choose one of the following deployment methods:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Method 1: Install Supabase CLI (Recommended)" -ForegroundColor Green
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host "  Then run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Method 2: Manual Deployment via Dashboard" -ForegroundColor Green
    Write-Host "  1. Open: https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/functions" -ForegroundColor White
    Write-Host "  2. Click on 'delete-user' function" -ForegroundColor White
    Write-Host "  3. Click 'Deploy new version' or 'Edit'" -ForegroundColor White
    Write-Host "  4. Copy all contents from: supabase\functions\delete-user\index.ts" -ForegroundColor White
    Write-Host "  5. Paste and click 'Deploy'" -ForegroundColor White
    Write-Host ""
    Write-Host "Method 3: Copy function code to clipboard" -ForegroundColor Green
    
    $copyChoice = Read-Host "Would you like to copy the function code to clipboard now? (y/n)"
    if ($copyChoice -eq "y" -or $copyChoice -eq "Y") {
        $functionCode = Get-Content ".\supabase\functions\delete-user\index.ts" -Raw
        Set-Clipboard -Value $functionCode
        Write-Host "✅ Function code copied to clipboard!" -ForegroundColor Green
        Write-Host "   Now paste it in the Supabase Dashboard" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "See DEPLOY_INSTRUCTIONS.md for detailed steps" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Supabase login status..." -ForegroundColor Yellow
$loginCheck = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Supabase" -ForegroundColor Yellow
    Write-Host "Running: supabase login" -ForegroundColor White
    supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Check if linked to project
Write-Host "Checking project link..." -ForegroundColor Yellow
$linkCheck = supabase link --project-ref nimxzvhzxsfkfpnbhphm 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Project not linked, attempting to link..." -ForegroundColor Yellow
    supabase link --project-ref nimxzvhzxsfkfpnbhphm
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to link project" -ForegroundColor Red
        Write-Host "Please link manually: supabase link --project-ref nimxzvhzxsfkfpnbhphm" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Project linked" -ForegroundColor Green
Write-Host ""

# Deploy the function
Write-Host "Deploying delete-user function..." -ForegroundColor Yellow
Write-Host "Running: supabase functions deploy delete-user" -ForegroundColor White
Write-Host ""

supabase functions deploy delete-user

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Wait 30-60 seconds for the function to be active" -ForegroundColor White
    Write-Host "2. Try deleting a user from the Manager Dashboard" -ForegroundColor White
    Write-Host "3. Check the Supabase function logs for confirmation" -ForegroundColor White
    Write-Host ""
    Write-Host "The function should now work without 'Admin profile not found' errors" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "❌ Deployment Failed" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please try manual deployment via Dashboard:" -ForegroundColor Yellow
    Write-Host "See DEPLOY_INSTRUCTIONS.md for detailed steps" -ForegroundColor White
    Write-Host ""
    
    $copyChoice = Read-Host "Copy function code to clipboard for manual deployment? (y/n)"
    if ($copyChoice -eq "y" -or $copyChoice -eq "Y") {
        $functionCode = Get-Content ".\supabase\functions\delete-user\index.ts" -Raw
        Set-Clipboard -Value $functionCode
        Write-Host "✅ Function code copied to clipboard!" -ForegroundColor Green
        Write-Host "   Paste it in: https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/functions/delete-user" -ForegroundColor White
    }
}

