# Deploy user-invite Function Fix

Write-Host "Copying function code to clipboard..." -ForegroundColor Yellow
$functionCode = Get-Content ".\supabase\functions\user-invite\index.ts" -Raw
Set-Clipboard -Value $functionCode
Write-Host "Function code copied to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to Supabase Dashboard" -ForegroundColor White
Write-Host "2. Navigate to Functions > user-invite" -ForegroundColor White
Write-Host "3. Click Deploy new version" -ForegroundColor White
Write-Host "4. Paste code (Ctrl+V) and Deploy" -ForegroundColor White
Write-Host ""
Write-Host "Dashboard URL copied too - paste in browser:" -ForegroundColor Yellow
Set-Clipboard -Value "https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/functions/user-invite"
Start-Sleep -Seconds 1
$functionCode | Set-Clipboard
Write-Host "Code is in clipboard now!" -ForegroundColor Green
