# Step-by-Step Deployment Instructions for delete-user Function

## The Error You're Seeing
The Supabase dashboard deployment is failing because it's looking for the file in the wrong location during the build process.

## Solution: Deploy via Copy-Paste

Since the file structure is correct but the dashboard upload is having issues, follow these steps:

### Step 1: Copy the Function Code

Open `supabase/functions/delete-user/index.ts` and copy the ENTIRE file contents (all 189 lines).

### Step 2: Deploy via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/functions

2. Click on the `delete-user` function in the list

3. Look for one of these options:
   - **"New Version"** button
   - **"Edit"** button  
   - **"Deploy"** tab

4. You should see a code editor. **Delete all existing code** and paste the new code from Step 1

5. Click **Deploy** or **Save and Deploy**

### Step 3: Alternative - Create New Version

If the above doesn't work:

1. In the Supabase Dashboard, go to **Edge Functions**
2. Click the **"New Function"** button
3. Name it `delete-user-v2` (temporary name)
4. Paste the code from `supabase/functions/delete-user/index.ts`
5. Deploy it
6. Update your client code temporarily to call `delete-user-v2` instead of `delete-user`
7. Test it works
8. Once confirmed, you can delete the old `delete-user` and rename `delete-user-v2` back

### Step 4: Verify Deployment

After deployment:

1. Wait 30-60 seconds for the function to be active
2. Check the function **Logs** in the Supabase dashboard
3. Try deleting a user from your application
4. In the logs, you should see:
   - ✅ New version number (should be > 84)
   - ✅ No "column profiles.role does not exist" errors
   - ✅ Logs showing "🔐 Verifying admin permissions..."

## If Dashboard Deployment Still Fails

### Option A: Use Supabase CLI (Recommended)

Install and use the Supabase CLI on your local machine:

```powershell
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (you'll need your project reference ID)
supabase link --project-ref nimxzvhzxsfkfpnbhphm

# Deploy the function
supabase functions deploy delete-user
```

### Option B: GitHub Integration

If your project is on GitHub:

1. Push the changes to your GitHub repository
2. In Supabase Dashboard, go to **Settings** → **Integrations**
3. Connect to GitHub
4. Enable auto-deployment for edge functions
5. The function will deploy automatically on push

### Option C: Manual API Deployment

If you're comfortable with APIs, you can deploy using the Supabase Management API:

```bash
curl -X POST \
  https://api.supabase.com/v1/projects/nimxzvhzxsfkfpnbhphm/functions/delete-user/deploy \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @supabase/functions/delete-user/index.ts
```

## What the Fix Does

The updated function:
- ✅ Removes the broken SQL join that caused "column profiles.role does not exist"
- ✅ Fetches profile and role in separate queries
- ✅ Handles case-insensitive email lookup
- ✅ Falls back to auth user metadata if role is missing
- ✅ Properly supports both admin and manager roles
- ✅ Validates permissions before allowing deletion

## Testing After Deployment

1. Log in as a manager (manish.payteq@gmail.com)
2. Go to User Management
3. Try to delete a regular user
4. You should see:
   - ✅ Success message
   - ✅ User removed from the list
   - ✅ No "Unauthorized: Admin profile not found" error

## Troubleshooting

### Still getting "Admin profile not found"
- Check the function version number in logs (should be > 84)
- Clear browser cache and try again
- Check that the manager user has a role in `user_roles` table

### Function not updating
- Wait 60 seconds after deployment
- Hard refresh the browser (Ctrl+Shift+R)
- Check deployment status in Supabase Dashboard

### Can't find deployment option
- Make sure you're logged in as the project owner
- Check you have the correct project selected
- Try accessing via direct URL: https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/functions/delete-user

