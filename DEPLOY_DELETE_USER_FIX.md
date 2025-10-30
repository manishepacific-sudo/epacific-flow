# Deploy Delete-User Function Fix

## Problem
The `delete-user` edge function is failing with "Unauthorized: Admin profile not found" because the deployed version (v84) contains a broken SQL join query that tries to access `profiles.role` which doesn't exist.

## Solution
The code has been fixed in `supabase/functions/delete-user/index.ts` to:
1. Remove the broken `user_roles!inner(role)` join
2. Fetch profile and role separately
3. Add proper fallbacks for auth user lookup

## Deployment Options

### Option 1: Supabase CLI (Recommended)

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref nimxzvhzxsfkfpnbhphm

# Deploy the fixed function
supabase functions deploy delete-user
```

### Option 2: Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm
2. Navigate to **Edge Functions** in the left sidebar
3. Find the `delete-user` function
4. Click **Deploy new version**
5. Copy the entire contents of `supabase/functions/delete-user/index.ts`
6. Paste it into the editor
7. Click **Deploy**

### Option 3: Manual File Upload

1. Go to https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm
2. Navigate to **Edge Functions**
3. Click on `delete-user`
4. Click **Settings** or **Edit**
5. Upload or paste the file: `supabase/functions/delete-user/index.ts`
6. Save and deploy

## Verification

After deployment:

1. Wait 30-60 seconds for the new version to be active
2. Try deleting a user from the Manager Dashboard
3. Check the Edge Function logs - you should see:
   - Version number > 84
   - No "column profiles.role does not exist" errors
   - Successful admin resolution

## What Changed

**Before (Broken):**
```typescript
// This caused "column profiles.role does not exist"
const { data: joinedAdmin } = await supabase
  .from("profiles")
  .select("user_id, email, user_roles: user_roles!inner(role)")
  .ilike("email", normalizedEmail)
  .maybeSingle();
```

**After (Fixed):**
```typescript
// Fetch profile first
const { data: adminProfile } = await supabase
  .from("profiles")
  .select("user_id, email")
  .eq("email", normalizedEmail)
  .maybeSingle();

// Then fetch role separately
const { data: roleData } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", adminUserId)
  .maybeSingle();
```

## Rollback

If the new version causes issues, you can rollback in the Supabase Dashboard:
1. Go to Edge Functions > delete-user
2. Click **Versions** or **History**
3. Select version 84 (or the last working version)
4. Click **Restore**

