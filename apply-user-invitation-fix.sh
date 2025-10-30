#!/bin/bash

# User Invitation Fix - Deployment Script
# This script applies the database migration to fix user invitation errors

echo "========================================="
echo "User Invitation Fix - Deployment Script"
echo "========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or use the manual deployment method (see FIX_USER_INVITATION_ERRORS.md)"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Supabase project not linked yet."
    echo ""
    read -p "Enter your Supabase project reference ID: " PROJECT_REF
    
    echo "Linking project..."
    supabase link --project-ref "$PROJECT_REF"
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to link project. Please try again."
        exit 1
    fi
fi

echo "✅ Project linked"
echo ""

# Show the migration file
echo "📄 Migration file: supabase/migrations/20251030000000_fix_user_invitation_flow.sql"
echo ""
echo "This migration will:"
echo "  1. Create the invite_tokens table"
echo "  2. Add missing columns to profiles table"
echo "  3. Update RLS policies for user creation"
echo "  4. Grant necessary permissions"
echo ""

read -p "Do you want to apply this migration? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Applying migration..."
supabase db push

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Migration failed. Please check the error above."
    echo ""
    echo "You can also apply it manually:"
    echo "  1. Go to your Supabase dashboard"
    echo "  2. Navigate to SQL Editor"
    echo "  3. Copy the contents of supabase/migrations/20251030000000_fix_user_invitation_flow.sql"
    echo "  4. Run it in the SQL Editor"
    exit 1
fi

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "Now deploying Edge Functions..."
supabase functions deploy user-invite

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Edge Function deployment failed, but migration succeeded."
    echo "You can deploy it manually later:"
    echo "  supabase functions deploy user-invite"
    echo ""
fi

echo ""
echo "========================================="
echo "✅ Fix Applied Successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Test user creation in the manager dashboard"
echo "  2. Verify invitation emails are sent"
echo "  3. Test user login and dashboard loading"
echo ""
echo "If you still experience issues, check FIX_USER_INVITATION_ERRORS.md"
echo ""

