# Fix for User Invitation and Dashboard Errors

## Issues Identified

### 1. **Edge Function Error: "Failed to invite user - Edge Function returned a non-2xx status code"**

**Root Cause:** The `user-invite` Edge Function is trying to insert data into an `invite_tokens` table that doesn't exist in your database.

**Location:** The Edge Function at `supabase/functions/user-invite/index.ts` line 210 attempts to insert into `invite_tokens`:

```typescript
const { error: tokenError } = await supabaseAdmin
  .from("invite_tokens")
  .insert(tokenData);
```

But this table was never created in any migration file.

### 2. **User Dashboard Not Loading After Login**

**Root Cause:** When a new user is created, their profile might be missing required fields, or there are permission issues preventing the profile from being loaded.

**Location:** The AuthProvider at `src/components/AuthProvider.tsx` tries to fetch the user profile, and if it fails, the UserDashboard shows an error after a 5-second timeout.

## Solution

I've created a comprehensive database migration that fixes all these issues:

### Migration File: `supabase/migrations/20251030000000_fix_user_invitation_flow.sql`

This migration does the following:

1. ✅ **Creates the `invite_tokens` table** with proper structure and indexes
2. ✅ **Adds missing columns to `profiles` table**: `password_set`, `is_demo`, `registrar`
3. ✅ **Makes columns nullable** that don't need to be required: `mobile_number`, `station_id`, `center_address`
4. ✅ **Updates RLS policies** to allow service role to manage profiles and user_roles during user creation
5. ✅ **Adds cleanup function** to remove expired invitation tokens
6. ✅ **Grants necessary permissions** to service_role and authenticated users

## How to Apply the Fix

### Option 1: Using Supabase CLI (Recommended)

```bash
# 1. Make sure you're logged in to Supabase
supabase login

# 2. Link your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# 3. Apply the migration
supabase db push

# 4. Restart your Edge Functions (to reload any cached connections)
supabase functions deploy user-invite
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/20251030000000_fix_user_invitation_flow.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute the migration
7. You should see success messages in the output

### Option 3: Manual Deployment

If you're running Supabase locally:

```bash
# Start Supabase local
supabase start

# Push migrations
supabase db push

# Deploy functions
supabase functions deploy user-invite
```

## Verification Steps

After applying the migration, verify that everything works:

### 1. Check Database Tables

In your Supabase SQL Editor, run:

```sql
-- Check if invite_tokens table exists
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'invite_tokens';

-- Check profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- Check user_roles table
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_roles';
```

### 2. Test User Creation

1. Log in as a manager or admin
2. Navigate to the User Management page
3. Try creating a new user
4. You should see a success message instead of the error
5. The user should receive an invitation email

### 3. Test User Login

1. Use the invitation link from the email
2. Set a password for the new user
3. Log in with the new credentials
4. The user dashboard should load without errors

## Additional Notes

### Environment Variables

Make sure your Edge Function has these environment variables set:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (not anon key!)
- `BASE_APP_URL` - Your app's base URL (e.g., `https://login.epacifictechnologies.com` or `http://localhost:5173`)

To check/set these in Supabase:
1. Go to **Edge Functions** in your Supabase dashboard
2. Select the `user-invite` function
3. Check the **Environment Variables** section

### Profiles Table Changes

The migration makes these columns optional:
- `mobile_number`
- `station_id`
- `center_address`

This allows users to be created even if these fields are not provided initially. They can be updated later in the user profile settings.

### RLS Policy Changes

The migration adds special policies for the `service_role` to bypass RLS restrictions. This is necessary because:
- The Edge Function uses service role credentials
- It needs to create profiles and roles during user invitation
- Normal RLS policies would block these operations

### Security

The `invite_tokens` table:
- Stores temporary invitation tokens
- Tokens expire after 24 hours
- Used tokens are marked and can be cleaned up
- Only service role can create tokens
- Users can only view tokens for their own email

## Troubleshooting

### If the error persists:

1. **Check Edge Function Logs:**
   ```bash
   supabase functions logs user-invite
   ```

2. **Verify Environment Variables:**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
   - Ensure `SUPABASE_URL` is correct
   - Ensure `BASE_APP_URL` matches your app's URL

3. **Check Database Connection:**
   - Verify the Edge Function can connect to the database
   - Check for any firewall or network issues

4. **Review RLS Policies:**
   ```sql
   -- Check RLS policies on profiles
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   
   -- Check RLS policies on user_roles
   SELECT * FROM pg_policies WHERE tablename = 'user_roles';
   
   -- Check RLS policies on invite_tokens
   SELECT * FROM pg_policies WHERE tablename = 'invite_tokens';
   ```

### If user dashboard still doesn't load:

1. **Check browser console for errors**
2. **Verify profile was created:**
   ```sql
   SELECT * FROM profiles WHERE email = 'user@example.com';
   ```

3. **Verify user role was assigned:**
   ```sql
   SELECT ur.*, p.email 
   FROM user_roles ur 
   JOIN profiles p ON ur.user_id = p.user_id 
   WHERE p.email = 'user@example.com';
   ```

## Contact

If you continue to experience issues after applying this fix, please check:
1. Supabase Edge Function logs
2. Browser console errors
3. Network tab in browser developer tools for failed API calls

The logs will show exactly where the process is failing.

