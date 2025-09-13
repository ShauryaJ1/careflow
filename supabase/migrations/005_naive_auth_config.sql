-- Configure naive authentication (no email verification) for development
-- WARNING: This is for development/testing only. DO NOT use in production!

-- Update auth configuration to disable email confirmations
-- Note: These settings are typically managed via Supabase Dashboard or config.toml
-- but we document them here for clarity

-- Ensure new users can sign up without email confirmation
-- This is controlled by the auth.email.enable_confirmations setting in config.toml

-- Create a function to auto-confirm users on signup
CREATE OR REPLACE FUNCTION auto_confirm_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically confirm the user's email
    NEW.email_confirmed_at = NOW();
    NEW.confirmed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm new users
-- Note: This trigger is for development only
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auto_confirm_user();

-- Add a comment to document this is for development
COMMENT ON FUNCTION auto_confirm_user IS 'Development only: Auto-confirms user emails on signup to bypass email verification';
COMMENT ON TRIGGER on_auth_user_created_auto_confirm ON auth.users IS 'Development only: Trigger to auto-confirm users without email verification';

-- Create a helper function to check if a user exists by email
CREATE OR REPLACE FUNCTION check_email_exists(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = LOWER(TRIM(user_email))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_email_exists TO authenticated;

-- Add development warning message
DO $$
BEGIN
    RAISE NOTICE '
    ⚠️  WARNING: Naive authentication is enabled!
    ====================================================
    Email verification has been DISABLED for development.
    Users will be auto-confirmed upon signup.
    
    DO NOT use this configuration in production!
    
    To enable email verification for production:
    1. Remove the auto_confirm_user trigger
    2. Update config.toml to enable email confirmations
    3. Configure a proper SMTP service
    ====================================================
    ';
END $$;
