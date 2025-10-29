# Deployment Configuration Guide

This document covers important configuration requirements for deploying the Epacific Flow application.

## Base URL Configuration

The application uses a centralized base URL configuration to ensure consistency across all email notifications, redirects, and deep links.

### Configuration Files

The base URL must be configured consistently in the following locations:

1. **Frontend Application** (`src/config/constants.ts`)
   ```typescript
   export const BASE_APP_URL = 'https://login.epacifictechnologies.com';
   ```

2. **Supabase Configuration** (`frontend/supabase/config.toml`)
   ```toml
   [auth]
   site_url = "https://login.epacifictechnologies.com"
   additional_redirect_urls = [
     "https://login.epacifictechnologies.com",
     "https://login.epacifictechnologies.com/set-password",
     "https://login.epacifictechnologies.com/handle-invite"
   ]
   ```

3. **Edge Functions** (`frontend/supabase/functions/user-invite/index.ts` and `frontend/supabase/functions/update-attendance-status/index.ts`)
   
   These functions now read `BASE_APP_URL` from environment variables with a fallback to the production URL:
   ```typescript
   const BASE_APP_URL = Deno.env.get('BASE_APP_URL') || "https://login.epacifictechnologies.com";
   ```
   
   **Setting Environment Variables for Edge Functions:**
   
   For **production**, set the environment variable in your Supabase project:
   ```bash
   supabase secrets set BASE_APP_URL=https://login.epacifictechnologies.com
   ```
   
   For **local development**, you can set environment variables in two ways:
   
   Option 1: Create a `.env.local` file in `frontend/supabase/`:
   ```
   BASE_APP_URL=http://localhost:5173
   ```
   
   Option 2: Set the environment variable when starting Supabase:
   ```bash
   BASE_APP_URL=http://localhost:5173 supabase start
   ```

### Important: Domain Requirements

The configured domain (`https://login.epacifictechnologies.com`) **must** serve all application routes, including:

- `/set-password` - Password setup for new users
- `/handle-invite` - User invitation handling
- `/attendance` - Attendance management
- `/submit-report` - Report submission
- `/submit-payment` - Payment submission
- `/reports` - Reports listing
- `/payments` - Payments listing

**If your application runs on a different domain**, update all references to the correct URL in the files listed above.

## Email Logo Configuration

### Logo URL Requirement

The application includes the Epacific Technologies logo in all email notifications. The logo **must be publicly accessible** at:

```
https://login.epacifictechnologies.com/epacific-logo.png
```

This URL is configured in `src/config/constants.ts`:

```typescript
export const LOGO_URL = `${BASE_APP_URL}/epacific-logo.png`;
```

### Deployment Options

You have several options to ensure the logo is accessible:

#### Option 1: Deploy with Application (Recommended for Quick Setup)
1. Place `epacific-logo.png` in the `public/` directory
2. Ensure your build process copies it to the deployment root
3. Verify it's accessible at `https://your-domain.com/epacific-logo.png`

#### Option 2: Use Supabase Storage (Recommended for Production)
1. Upload the logo to a public Supabase Storage bucket
2. Get the public URL (e.g., `https://[project-ref].supabase.co/storage/v1/object/public/assets/epacific-logo.png`)
3. Update `LOGO_URL` in `src/config/constants.ts` to use this URL

**Example:**
```typescript
export const LOGO_URL = 'https://nimxzvhzxsfkfpnbhphm.supabase.co/storage/v1/object/public/assets/epacific-logo.png';
```

#### Option 3: Use a CDN (Recommended for High-Traffic Production)
1. Upload the logo to your CDN provider (e.g., Cloudflare, CloudFront, etc.)
2. Get the CDN URL
3. Update `LOGO_URL` in `src/config/constants.ts`

**Example:**
```typescript
export const LOGO_URL = 'https://cdn.epacifictechnologies.com/logo.png';
```

### Verification

After deployment, verify the logo URL is accessible by:

1. Opening the URL in a browser
2. Sending a test notification email and checking if the logo displays
3. Using the create-test-notifications edge function

## Supabase Configuration

### Invalid Configuration Removed

The following configuration key has been **removed** from `frontend/supabase/config.toml` as it is not supported by Supabase:

```toml
# REMOVED - Not a valid Supabase configuration key
# external_redirect_scheme = "https://login.epacifictechnologies.com/"
```

If you need to support custom URL schemes for native mobile apps:
1. Add the full custom scheme URLs to `additional_redirect_urls`
2. Pass them via the `redirectTo` parameter when calling Supabase auth methods

## Local Development Configuration

When developing locally, you need to configure the application to use `http://localhost` URLs instead of the production domain.

### Step 1: Configure Supabase Auth Redirects

Edit `frontend/supabase/config.toml`:

1. Change `site_url` to your local development URL:
   ```toml
   site_url = "http://localhost:5173"
   ```

2. Uncomment the localhost URLs in `additional_redirect_urls`:
   ```toml
   additional_redirect_urls = [
     # Production URLs (comment these out for local dev)
     # "https://login.epacifictechnologies.com",
     # "https://login.epacifictechnologies.com/set-password",
     # "https://login.epacifictechnologies.com/handle-invite",
     # Local development URLs
     "http://localhost:5173",
     "http://localhost:5173/set-password",
     "http://localhost:5173/handle-invite"
   ]
   ```

### Step 2: Set Edge Function Environment Variables

Create a `.env.local` file in `frontend/supabase/`:

```bash
BASE_APP_URL=http://localhost:5173
```

Or set the environment variable when running Supabase:

```bash
BASE_APP_URL=http://localhost:5173 supabase start
```

### Step 3: Update Frontend Constants (Optional)

If you want to test with localhost URLs in the frontend, update `src/config/constants.ts`:

```typescript
export const BASE_APP_URL = 'http://localhost:5173';
```

**⚠️ Important:** Do NOT commit local development values to version control. Always restore production URLs before committing.

### Step 4: Restart Supabase

After making these changes, restart your local Supabase instance:

```bash
supabase stop
supabase start
```

### Local Development Testing

Test the following flows with localhost URLs:

1. User invitation emails should link to `http://localhost:5173/set-password`
2. Attendance rejection emails should link to `http://localhost:5173/attendance`
3. Auth redirects should work with localhost URLs

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] Base URL is correctly configured in all locations listed above
- [ ] The configured domain serves all required application routes
- [ ] Logo image is publicly accessible at the configured URL
- [ ] Test email notifications display the logo correctly
- [ ] All redirect URLs work properly after authentication
- [ ] `external_redirect_scheme` has been removed from config.toml
- [ ] All local development URLs have been reverted to production URLs
- [ ] Edge function environment variable `BASE_APP_URL` is set in production

## Testing

### Test Email Notifications

After deployment, test that emails work correctly:

1. Invite a new user (tests user-invite function and logo URL)
2. Submit a report and reject it (tests report rejection email)
3. Submit a payment and approve it (tests payment approval email)
4. Mark attendance and have it rejected (tests attendance email)

Verify in each email:
- Logo displays correctly
- All links point to the correct domain
- Links navigate to the expected pages

### Test Authentication Flow

1. Invite a new user
2. Click the invitation link in the email
3. Verify it redirects to the correct password setup page
4. Complete password setup
5. Verify successful login

## Troubleshooting

### Logo Not Displaying in Emails

**Symptom:** Broken image icon in email notifications

**Solutions:**
1. Verify the logo URL is publicly accessible (no authentication required)
2. Check that the logo file exists at the exact path specified
3. Ensure the file extension matches (`.png`)
4. Check email client doesn't block external images
5. Use an absolute URL, not a relative path

### Redirect URLs Not Working

**Symptom:** After authentication, users see a 404 or redirect to wrong page

**Solutions:**
1. Verify `site_url` in `frontend/supabase/config.toml` matches your deployed domain
2. Ensure all URLs in `additional_redirect_urls` are accessible
3. Check that `BASE_APP_URL` in `src/config/constants.ts` matches
4. Verify your hosting serves the React app routes correctly (enable client-side routing)

### Inconsistent URLs Across Application

**Symptom:** Some emails/redirects use different domains than others

**Solutions:**
1. Search codebase for any hardcoded URLs
2. Verify all edge functions use the `BASE_APP_URL` constant
3. Check that no old cached builds are deployed
4. Clear browser cache and test again

## Production Recommendations

For production deployments:

1. **Use Environment Variables**: Consider making `BASE_APP_URL` configurable via environment variables
2. **CDN for Static Assets**: Host logos and other static assets on a CDN for better performance
3. **Domain Verification**: Ensure your domain has proper SSL certificates
4. **Email Testing**: Use a staging environment to test all email flows before production
5. **Monitoring**: Set up monitoring for failed email deliveries and broken links

