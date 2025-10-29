/**
 * Centralized application configuration constants
 * 
 * IMPORTANT: Ensure BASE_APP_URL points to the domain that serves your application.
 * This URL is used across:
 * - Email notifications and deep links
 * - Supabase auth redirects
 * - User invitation flows
 * - Attendance and report submission links
 * 
 * The domain must serve all application routes including:
 * /set-password, /handle-invite, /attendance, /submit-report, 
 * /submit-payment, /reports, /payments
 * 
 * This must match the site_url and additional_redirect_urls 
 * configured in frontend/supabase/config.toml
 */
export const BASE_APP_URL = 'https://login.epacifictechnologies.com';

/**
 * Normalized base URL without trailing slashes
 * Use this for constructing paths to avoid double slashes
 */
export const APP_BASE_URL = (BASE_APP_URL || '').replace(/\/+$/, '');

/**
 * Public asset URLs
 * 
 * IMPORTANT: Ensure the logo is publicly accessible at this URL.
 * If hosted locally, make sure it's in the public directory and deployed.
 * Consider using a CDN or Supabase Storage bucket for production.
 */
export const LOGO_URL = `${APP_BASE_URL}/epacific-logo.png`;

