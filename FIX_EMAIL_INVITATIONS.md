# Fix Email Invitations - User Creation

## Current Status

✅ **Delete function is working!**  
⚠️ **User invitation is partially working** - users are created but emails aren't being sent

## What's Happening

The `user-invite` function is failing at this step:
```
❌ Supabase invite failed: AuthApiError: Error sending invite email
```

**Good News:** The function has a fallback mechanism that:
1. Creates the user anyway (without email)
2. Stores the invite token in the database
3. Returns an `invite_link` you can share manually

## Root Cause

Supabase's built-in email service is failing because:
1. **SMTP is not configured** in your Supabase project
2. **Email provider not set up** (Supabase needs an email service)
3. **Rate limits** on Supabase's default email service

## Solution Options

### Option 1: Use Manual Invite Links (Immediate Fix)

The function already creates users successfully and generates invite links. You just need to copy and share them manually.

#### Step 1: Update Client to Show Invite Link

In `src/components/UserManagement.tsx`, update the success toast to show the link:

```typescript
if (!result?.success) {
  throw new Error(result?.error || 'Failed to create user');
}

// Show the invite link if email failed
if (result?.emailError && result?.invite_link) {
  toast({
    title: "User created successfully",
    description: (
      <div>
        <p>Email sending failed. Please share this link:</p>
        <input 
          type="text" 
          value={result.invite_link} 
          readOnly 
          onClick={(e) => e.currentTarget.select()}
          className="w-full mt-2 p-1 border rounded text-xs"
        />
      </div>
    ),
    duration: 10000, // Show for longer
  });
} else {
  toast({
    title: "User created successfully",
    description: `Invitation email sent to ${formData.email}`,
  });
}
```

#### Step 2: Test User Creation

1. Create a new user from the Manager Dashboard
2. You'll see a success message with the invite link
3. Copy the link and send it to the user via email/WhatsApp/SMS
4. User clicks the link and sets their password

### Option 2: Configure Supabase SMTP (Recommended for Production)

#### Via Supabase Dashboard:

1. Go to https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/settings/auth

2. Scroll to **SMTP Settings**

3. Choose one of these options:

   **Option A: Use Supabase's Email Service (Easiest)**
   - Enable "Enable Custom SMTP"
   - Supabase will use their managed email service
   - Limited to 3 emails/hour on free tier

   **Option B: Configure Custom SMTP (Recommended)**
   - Use your own SMTP server (Gmail, SendGrid, Hostinger, etc.)
   - Fill in:
     ```
     SMTP Host: smtp.your-provider.com
     SMTP Port: 587 (or 465 for SSL)
     SMTP User: your-email@domain.com
     SMTP Password: your-smtp-password
     Sender Email: noreply@epacifictechnologies.com
     Sender Name: Epacific Technologies
     ```

4. **Test the configuration**:
   - Save settings
   - Try creating a new user
   - Check if email is sent

#### Popular SMTP Providers:

**Gmail (Free, 500/day limit):**
```
Host: smtp.gmail.com
Port: 587
User: your-gmail@gmail.com
Password: App-specific password (not your Gmail password)
```
[How to create Gmail app password](https://support.google.com/accounts/answer/185833)

**SendGrid (Free tier: 100/day):**
```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: Your-SendGrid-API-Key
```

**Hostinger (if you have hosting):**
```
Host: smtp.hostinger.com
Port: 587
User: noreply@epacifictechnologies.com
Password: Your-email-password
```

**Resend (Developer-friendly, 100/day free):**
```
Host: smtp.resend.com
Port: 587
User: resend
Password: Your-Resend-API-Key
```

### Option 3: Disable Email Requirement (Development Only)

If you're just testing and don't need emails:

1. Users are already being created successfully
2. The invite link is returned in the API response
3. You can manually share links with users
4. Set up proper SMTP before production

## Verify Current Behavior

Let's check if users are actually being created despite the email error:

1. Go to Supabase Dashboard → Authentication → Users
2. Try creating a user from Manager Dashboard
3. Check if the user appears in the Users list
4. If yes, the invite link should work even without email

## Testing the Fix

### After implementing Option 1 (Manual Links):

1. Create a new user
2. Copy the invite link from the toast
3. Open link in incognito window
4. Set password
5. Verify you can login

### After implementing Option 2 (SMTP):

1. Configure SMTP in Supabase
2. Create a new user
3. Check the user's email inbox
4. Click the invitation link
5. Set password and login

## Current Function Behavior

The function IS working correctly! It:
- ✅ Creates the user in auth.users
- ✅ Stores the invite token
- ✅ Generates the password setup link
- ✅ Returns `success: true`
- ⚠️ Just can't send the email

Response structure:
```json
{
  "success": true,
  "message": "User created successfully but email sending failed...",
  "user": { "id": "...", "email": "...", "full_name": "...", "role": "..." },
  "invite_link": "https://login.epacifictechnologies.com/set-password?token=...",
  "token": "secure-token-here",
  "expires_at": "2025-10-31T10:32:54.000Z",
  "emailError": "Error sending invite email"
}
```

## Quick Fix for UI

Update `UserManagement.tsx` to handle the email error gracefully:

```typescript
try {
  const { data: result, error: createError } = await supabase.functions.invoke('user-invite', {
    body: {
      email: formData.email,
      role: formData.role,
      full_name: formData.full_name,
      mobile_number: formData.mobile_number,
      station_id: formData.station_id,
      center_address: formData.center_address,
      registrar: formData.registrar,
      admin_email: profile?.email
    }
  });

  if (createError) throw createError;

  if (!result?.success) {
    throw new Error(result?.error || 'Failed to create user');
  }

  // Check if email was sent or if we need to show manual link
  if (result.emailError) {
    // Email failed but user was created
    toast({
      title: "User created (email failed)",
      description: (
        <div className="space-y-2">
          <p className="text-sm">User created but couldn't send email.</p>
          <p className="text-sm font-semibold">Share this link with {formData.email}:</p>
          <div className="bg-muted p-2 rounded">
            <input 
              type="text" 
              value={result.invite_link} 
              readOnly 
              onClick={(e) => {
                e.currentTarget.select();
                navigator.clipboard.writeText(result.invite_link);
                toast({ description: "Link copied to clipboard!" });
              }}
              className="w-full bg-transparent text-xs cursor-pointer"
            />
          </div>
        </div>
      ),
      duration: 15000,
    });
  } else {
    // Email sent successfully
    toast({
      title: "User created successfully",
      description: `Invitation email sent to ${formData.email}`,
    });
  }

  // Reset form and close dialog
  setFormData({
    full_name: "",
    email: "",
    mobile_number: "",
    station_id: "",
    center_address: "",
    registrar: "",
    role: "user"
  });
  setFormErrors({
    mobile_number: '',
    station_id: ''
  });
  setIsDialogOpen(false);
  fetchUsers();

} catch (error: any) {
  console.error('Error creating user:', error);
  toast({
    title: "Failed to create user",
    description: error.message || "An unexpected error occurred",
    variant: "destructive"
  });
}
```

## Recommended Approach

**For immediate use:**
1. Implement the UI fix above to show invite links
2. Manually share links with users

**For production:**
1. Set up SMTP (Option 2)
2. Test email delivery
3. Keep the manual link as a fallback

The system is actually working - you just need to handle the email failure in the UI!

