# Delete-User Function Fix Summary

## Problem
Manager was unable to delete users, receiving error: `{"error":"Unauthorized: Admin profile not found"}`

## Root Cause
The deployed edge function (version 84) had a broken SQL query:
```typescript
.select("user_id, email, user_roles: user_roles!inner(role)")
.ilike("email", normalizedEmail)
```

This caused PostgreSQL error: `column profiles.role does not exist` because:
1. The `!inner` join tried to access a non-existent column
2. The `ilike` operator was being used incorrectly with the join syntax

## Fix Applied

### Files Modified
1. ✅ `supabase/functions/delete-user/index.ts` - Fixed admin resolution logic
2. ✅ `supabase/config.toml` - Added delete-user function configuration
3. ✅ Created deployment scripts and documentation

### Changes Made

**Before (Broken):**
```typescript
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

## Deployment Required

⚠️ **IMPORTANT**: The code is fixed locally but must be deployed to Supabase.

### Quick Deployment Methods

**Option 1: PowerShell Script (Easiest)**
```powershell
.\deploy-delete-user.ps1
```

**Option 2: Supabase CLI**
```bash
npm install -g supabase
supabase login
supabase link --project-ref nimxzvhzxsfkfpnbhphm
supabase functions deploy delete-user
```

**Option 3: Supabase Dashboard (Manual)**
1. Go to: https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/functions
2. Click on `delete-user`
3. Deploy new version with code from `supabase/functions/delete-user/index.ts`

See `DEPLOY_INSTRUCTIONS.md` for detailed steps.

## What the Fix Does

✅ Removes broken SQL join
✅ Fetches profile and role in separate, clean queries  
✅ Case-insensitive email matching
✅ Fallback to auth user lookup if profile missing
✅ Fallback to auth metadata if role missing
✅ Supports both admin and manager roles
✅ Proper permission validation

## Testing After Deployment

1. Login as manager: `manish.payteq@gmail.com`
2. Navigate to User Management page
3. Try to delete a regular user (not admin, not yourself)
4. Expected result: ✅ User deleted successfully

## Verification

After deployment, check:
- [ ] Function version in logs is > 84
- [ ] No "column profiles.role does not exist" errors in logs
- [ ] Can delete users from Manager Dashboard
- [ ] Proper error messages for invalid operations (can't delete admin as manager, can't delete self)

## Files Created

- `DEPLOY_DELETE_USER_FIX.md` - Original deployment guide
- `DEPLOY_INSTRUCTIONS.md` - Detailed step-by-step instructions
- `deploy-delete-user.ps1` - PowerShell deployment script
- `DELETE_USER_FIX_SUMMARY.md` - This file

## Implementation Status

- [x] Identified root cause
- [x] Fixed code locally
- [x] Added function to config.toml
- [x] Created deployment scripts
- [ ] **NEEDS DEPLOYMENT** - Run deployment to make fix live

## Related Issue

This was discovered while implementing Comment 1 from code review:
> "Optional: avoid extra round-trip for roles after get-users"

The get-users function was already optimized server-side. When investigating delete-user for consistency, the broken join was discovered.

