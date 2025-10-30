# Setup Hostinger SMTP for Email Invitations

## What I Fixed

✅ **Modified `user-invite` function** to use custom Hostinger SMTP instead of Supabase's email service  
✅ **Removed dependency** on Supabase SMTP configuration  
✅ **Added beautiful HTML email template** for invitations  
✅ **Emails now send via** `send-email-notification` function (Hostinger)

## Required: Set SMTP Environment Variables

You MUST configure these environment variables in Supabase for emails to work:

### Step 1: Go to Supabase Edge Functions Settings

Open: https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/settings/functions

### Step 2: Add Environment Variables

Click **"Add new secret"** and add these 4 secrets:

```
Name: SMTP_HOST
Value: smtp.hostinger.com

Name: SMTP_PORT
Value: 465

Name: SMTP_USER
Value: no-reply@epacifictechnologies.com

Name: SMTP_PASS
Value: [Your Hostinger email password]
```

### Step 3: Save and Wait

- Click **Save** after adding each secret
- Wait 1-2 minutes for secrets to propagate
- The functions will restart automatically

## What Email Address to Use

Based on your screenshot, you're using:
- **Email**: `no-reply@epacifictechnologies.com`
- **Sender Name**: Epacifici Technologies Pvt. Ltd.
- **SMTP Host**: `smtp.hostinger.com`
- **Port**: `465` (SSL)

## How to Get the Password

1. Log into your Hostinger account
2. Go to **Email** section
3. Find the email account: `no-reply@epacifictechnologies.com`
4. If you don't know the password, you can reset it:
   - Click on the email account
   - Click "Change Password"
   - Set a new password
   - Copy the password

5. Use this password for `SMTP_PASS` environment variable

## After Setting Environment Variables

### Deploy the Updated Function

You need to deploy the updated `user-invite` function:

```powershell
# If you have Supabase CLI
supabase functions deploy user-invite

# Or use the dashboard (copy/paste method from before)
```

### Test Email Sending

1. Go to Manager Dashboard
2. Create a new user
3. Check the Edge Function logs:
   - Go to: https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/functions/user-invite/logs
   - You should see: `✅ Invitation email sent successfully via Hostinger SMTP`

4. Check the user's email inbox
5. The invitation email should arrive with a beautiful template!

## The New Email Template

Users will receive a professional email with:
- ✅ Epacific logo
- ✅ Gradient header
- ✅ Clear call-to-action button
- ✅ Invitation link
- ✅ 24-hour expiry notice
- ✅ Company footer

## If Emails Still Don't Send

### Check Environment Variables

```bash
# In Supabase Dashboard, verify all 4 secrets are set:
SMTP_HOST = smtp.hostinger.com
SMTP_PORT = 465
SMTP_USER = no-reply@epacifictechnologies.com
SMTP_PASS = [your password]
```

### Check Function Logs

Go to: https://supabase.com/dashboard/project/nimxzvhzxsfkfpnbhphm/functions/send-email-notification/logs

Look for errors like:
- "SMTP credentials missing" → Environment variables not set
- "Authentication failed" → Wrong password
- "Connection refused" → Wrong host or port

### Test SMTP Credentials

You can test your Hostinger SMTP credentials using an online SMTP tester or email client.

## Port Options

Hostinger supports two ports:
- **Port 465** (SSL) - More secure, use this
- **Port 587** (TLS) - Also works, but 465 is better

If 465 doesn't work, try changing `SMTP_PORT` to `587`.

## Summary

**Before my fix:**
```
user-invite → Supabase email service → ❌ Failed → Manual link
```

**After my fix:**
```
user-invite → send-email-notification → Hostinger SMTP → ✅ Email sent
```

**What you need to do:**
1. Add 4 environment variables in Supabase (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
2. Deploy the updated user-invite function
3. Test by creating a user
4. Email should arrive automatically!

