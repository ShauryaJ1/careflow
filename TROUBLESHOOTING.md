# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Invalid login credentials" after signup

**Problem:** Getting `AuthApiError: Invalid login credentials` when trying to auto-login after signup.

**Solutions:**

1. **Check if Supabase is running locally:**
   ```bash
   npx supabase status
   ```
   If not running:
   ```bash
   npx supabase start
   ```

2. **Apply the auto-confirm migration:**
   ```bash
   npx supabase migration up
   ```
   Or manually run the migration in Supabase Studio:
   - Go to http://localhost:54323 (Supabase Studio)
   - SQL Editor → Run migration `005_naive_auth_config.sql`

3. **Reset Supabase (if needed):**
   ```bash
   npx supabase db reset
   ```
   This will re-apply all migrations fresh.

4. **Manual login fallback:**
   - If auto-login fails, the app will redirect to the login page
   - The account is created successfully, just login manually

### 2. Email verification still required

**Problem:** Users are asked to verify email despite naive auth setup.

**Solution:**
1. Check `supabase/config.toml`:
   ```toml
   [auth.email]
   enable_confirmations = false  # Must be false
   ```

2. Restart Supabase:
   ```bash
   npx supabase stop
   npx supabase start
   ```

### 3. Rate limit errors

**Problem:** Still getting rate limit errors.

**Solution:**
1. Naive auth should bypass rate limits since no emails are sent
2. If still occurring, check you're not accidentally sending emails:
   - No password reset emails
   - No magic link emails
   - Only using password-based auth

### 4. Profile not created after signup

**Problem:** User can login but profile is missing.

**Solution:**
1. Check if the trigger is working:
   ```sql
   -- In Supabase Studio SQL Editor
   SELECT * FROM profiles WHERE id = 'USER_ID_HERE';
   ```

2. Manually create profile if missing:
   ```sql
   INSERT INTO profiles (id, role, full_name)
   VALUES ('USER_ID_HERE', 'patient', 'User Name');
   ```

### 5. Provider account issues

**Problem:** Provider signup fails or provider record not created.

**Solution:**
1. Ensure provider name is provided during signup
2. Check for duplicate provider emails:
   ```sql
   SELECT * FROM providers WHERE email = 'provider@email.com';
   ```

3. Manually link provider to profile:
   ```sql
   UPDATE profiles 
   SET provider_id = 'PROVIDER_ID_HERE'
   WHERE id = 'USER_ID_HERE';
   ```

### 6. TypeScript errors

**Problem:** TypeScript compilation errors.

**Solution:**
```bash
# Check for errors
npx tsc --noEmit

# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### 7. Environment variables not loading

**Problem:** Supabase keys not found.

**Solution:**
1. Check `.env.local` exists (not `.env`)
2. Verify variables are prefixed with `NEXT_PUBLIC_`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Restart dev server after changing `.env.local`

### 8. Can't access dashboard after login

**Problem:** Redirected back to login page.

**Solution:**
1. Check middleware is not blocking authenticated routes
2. Verify user role in profiles table:
   ```sql
   SELECT role FROM profiles WHERE id = 'USER_ID';
   ```

3. Clear browser cookies and try again

## Debug Commands

```bash
# Check Supabase status
npx supabase status

# View Supabase logs
npx supabase db logs

# Reset database
npx supabase db reset

# Run specific migration
npx supabase migration up 005_naive_auth_config

# Check TypeScript
npx tsc --noEmit

# Clear Next.js cache
rm -rf .next

# Fresh install
rm -rf node_modules package-lock.json
npm install
```

## Still Having Issues?

1. Check browser console for errors
2. Check Network tab for failed requests
3. Check Supabase Studio logs: http://localhost:54323
4. Enable debug logging:
   ```javascript
   // In your code
   console.log('Auth response:', data);
   console.log('Auth error:', error);
   ```
