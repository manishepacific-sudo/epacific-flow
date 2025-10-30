# User Invitation Fix - Deployment Script (PowerShell)
# This script applies the database migration to fix user invitation errors

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "User Invitation Fix - Deployment Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install it first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase"
    Write-Host ""
    Write-Host "Or use the manual deployment method (see FIX_USER_INVITATION_ERRORS.md)"
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green
Write-Host ""

# Check if project is linked
if (-not (Test-Path ".supabase/config.toml")) {
    Write-Host "⚠️  Supabase project not linked yet." -ForegroundColor Yellow
    Write-Host ""
    $projectRef = Read-Host "Enter your Supabase project reference ID"
    
    Write-Host "Linking project..." -ForegroundColor Cyan
    supabase link --project-ref $projectRef
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to link project. Please try again." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Project linked" -ForegroundColor Green
Write-Host ""

# Show the migration file
Write-Host "📄 Migration file: supabase/migrations/20251030000000_fix_user_invitation_flow.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "This migration will:" -ForegroundColor Cyan
Write-Host "  1. Create the invite_tokens table"
Write-Host "  2. Add missing columns to profiles table"
Write-Host "  3. Update RLS policies for user creation"
Write-Host "  4. Grant necessary permissions"
Write-Host ""

$confirm = Read-Host "Do you want to apply this migration? (y/n)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Applying migration..." -ForegroundColor Cyan
supabase db push

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Migration failed. Please check the error above." -ForegroundColor Red
    Write-Host ""
    Write-Host "You can also apply it manually:" -ForegroundColor Yellow
    Write-Host "  1. Go to your Supabase dashboard"
    Write-Host "  2. Navigate to SQL Editor"
    Write-Host "  3. Copy the contents of supabase/migrations/20251030000000_fix_user_invitation_flow.sql"
    Write-Host "  4. Run it in the SQL Editor"
    exit 1
}

Write-Host ""
Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now deploying Edge Functions..." -ForegroundColor Cyan
supabase functions deploy user-invite

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Edge Function deployment failed, but migration succeeded." -ForegroundColor Yellow
    Write-Host "You can deploy it manually later:" -ForegroundColor Yellow
    Write-Host "  supabase functions deploy user-invite"
    Write-Host ""
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ Fix Applied Successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test user creation in the manager dashboard"
Write-Host "  2. Verify invitation emails are sent"
Write-Host "  3. Test user login and dashboard loading"
Write-Host ""
Write-Host "If you still experience issues, check FIX_USER_INVITATION_ERRORS.md" -ForegroundColor Yellow
Write-Host ""

