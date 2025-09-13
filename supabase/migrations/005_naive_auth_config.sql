-- Configure naive authentication (no email verification) for development
-- WARNING: This is for development/testing only. DO NOT use in production!
-- This version works with hosted Supabase (no auth.users modifications)

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

-- Update the handle_new_user function to work with auto-confirmed users
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    new_provider_id UUID;
BEGIN
    -- Create profile for the new user
    INSERT INTO public.profiles (id, full_name, role, preferred_language)
    VALUES (
        new.id, 
        new.raw_user_meta_data->>'full_name',
        COALESCE(new.raw_user_meta_data->>'role', 'patient'),
        COALESCE(new.raw_user_meta_data->>'preferred_language', 'English')
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate profile creation
    
    -- If user is a provider and provider_name is provided, create a provider record
    IF new.raw_user_meta_data->>'role' = 'provider' AND new.raw_user_meta_data->>'provider_name' IS NOT NULL THEN
        BEGIN
            INSERT INTO public.providers (
                name, 
                type, 
                email,
                languages_spoken,
                is_active
            ) VALUES (
                new.raw_user_meta_data->>'provider_name',
                COALESCE(new.raw_user_meta_data->>'provider_type', 'clinic')::provider_type,
                new.email,
                ARRAY[COALESCE(new.raw_user_meta_data->>'preferred_language', 'English')],
                true
            )
            RETURNING id INTO new_provider_id;
            
            -- Update profile with provider_id
            UPDATE public.profiles 
            SET provider_id = new_provider_id
            WHERE id = new.id;
        EXCEPTION 
            WHEN unique_violation THEN
                -- If provider with this email already exists, link to existing provider
                SELECT id INTO new_provider_id
                FROM public.providers
                WHERE email = new.email
                LIMIT 1;
                
                IF new_provider_id IS NOT NULL THEN
                    UPDATE public.profiles 
                    SET provider_id = new_provider_id
                    WHERE id = new.id;
                END IF;
        END;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (in case it was dropped)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add development warning message
DO $$
BEGIN
    RAISE NOTICE '
    ⚠️  NOTICE: Email confirmation has been disabled
    ====================================================
    Make sure to disable email confirmations in:
    Supabase Dashboard > Authentication > Email Auth
    
    Toggle OFF "Confirm email" setting
    ====================================================
    ';
END $$;
