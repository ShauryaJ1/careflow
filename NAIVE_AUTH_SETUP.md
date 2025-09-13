# Naive Authentication Setup (Development Only)

⚠️ **WARNING: This setup is for DEVELOPMENT ONLY and should NEVER be used in production!**

## Overview

Due to [Supabase's rate limits](https://supabase.com/docs/guides/auth/rate-limits) which restrict email sending to 2 emails per hour by default, we've implemented a naive authentication system that bypasses email verification for development purposes.

## What's Different?

### 1. **No Email Verification**
- Users are automatically confirmed upon signup
- No confirmation emails are sent
- Users can immediately log in after signing up

### 2. **Rate Limit Bypass**
- No email rate limits apply since no emails are sent
- Unlimited signups for testing
- No 60-second cooldown between signup attempts

### 3. **Simplified Flow**
```
User Signs Up → Auto-Confirmed → Auto-Logged In → Dashboard
```

## Configuration

### Supabase Config (`supabase/config.toml`)
```toml
[auth.email]
enable_signup = true
enable_confirmations = false  # ← Key setting
double_confirm_changes = false
secure_email_change_enabled = false
```

### Database Level (`migrations/005_naive_auth_config.sql`)
- Auto-confirm trigger on `auth.users` table
- Sets `email_confirmed_at` and `confirmed_at` on insert

## Security Implications

❌ **DO NOT USE IN PRODUCTION BECAUSE:**
- Anyone can create accounts with any email
- No email ownership verification
- Vulnerable to spam account creation
- No protection against bot registrations
- Bypasses important security checks

## Switching to Production Auth

When ready for production, follow these steps:

### 1. **Update Supabase Config**
```toml
[auth.email]
enable_confirmations = true  # ← Enable email verification
double_confirm_changes = true
secure_email_change_enabled = true

[auth.email.smtp]
enabled = true
host = "your-smtp-host"
port = 587
user = "your-smtp-user"
pass = "env(SMTP_PASSWORD)"
```

### 2. **Remove Auto-Confirm Trigger**
```sql
-- Remove the development trigger
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS auto_confirm_user();
```

### 3. **Update Sign-Up Flow**
```typescript
// components/sign-up-form.tsx
// Remove auto-login after signup
if (data?.user && !data.session) {
  router.push("/auth/sign-up-success"); // Show "check email" message
}
```

### 4. **Configure SMTP Service**
Options:
- **SendGrid**: Popular, reliable, free tier available
- **Resend**: Modern, developer-friendly
- **AWS SES**: Cost-effective for high volume
- **Custom SMTP**: Your own email server

### 5. **Implement Rate Limit Handling**
```typescript
// Add retry logic for rate-limited requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 60000; // 1 minute

async function signUpWithRetry(email, password, retries = 0) {
  try {
    return await supabase.auth.signUp({ email, password });
  } catch (error) {
    if (error.message.includes('rate limit') && retries < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return signUpWithRetry(email, password, retries + 1);
    }
    throw error;
  }
}
```

## Testing Email Locally

For local development with email testing:

1. **Use Inbucket** (included in Supabase local setup):
   - View emails at: http://localhost:54324
   - No actual emails sent
   - Perfect for testing email templates

2. **Enable email confirmations locally**:
   ```toml
   [auth.email]
   enable_confirmations = true  # Test email flow locally
   ```

## Visual Indicators

The app shows development mode warnings:
- Yellow banner on login/signup pages
- "Dev Mode" indicator on forms
- Console warnings in development

## Best Practices

1. **Use different Supabase projects** for dev/staging/production
2. **Never commit production credentials** to version control
3. **Test email flow** in staging before production
4. **Monitor rate limits** in production
5. **Implement proper CAPTCHA** for production signups

## Troubleshooting

### Users not auto-confirming?
- Check if migration `005_naive_auth_config.sql` was applied
- Verify `config.toml` has `enable_confirmations = false`
- Restart Supabase: `npx supabase stop && npx supabase start`

### Want to test with emails locally?
- Set `enable_confirmations = true` in `config.toml`
- Check emails at http://localhost:54324 (Inbucket)
- No rate limits apply to local Inbucket

### Production emails not sending?
- Verify SMTP credentials
- Check Supabase dashboard logs
- Ensure DNS records are configured (SPF, DKIM)
- Monitor rate limits in Supabase dashboard

## Rate Limit Reference

From [Supabase docs](https://supabase.com/docs/guides/auth/rate-limits):
- **Email sending**: 2 emails/hour (default)
- **OTP sending**: 30 OTPs/hour
- **Anonymous signins**: 30 requests/hour
- **Signup cooldown**: 60 seconds between requests

To increase limits:
1. Configure custom SMTP
2. Contact Supabase support for enterprise limits
3. Implement queuing system for high-volume signups
