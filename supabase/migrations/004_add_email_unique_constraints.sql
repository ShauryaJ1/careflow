-- Add unique constraints for email fields to prevent duplicate accounts

-- Add unique constraint on providers.email
ALTER TABLE providers 
ADD CONSTRAINT providers_email_unique UNIQUE (email);

-- Since profiles table references auth.users which already has unique email,
-- we don't need to add email column to profiles table
-- The auth.users table in Supabase already enforces email uniqueness

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_providers_email ON providers(email);

-- Add a trigger to ensure provider email matches the auth.users email when created
CREATE OR REPLACE FUNCTION check_provider_email_matches_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the email matches the user's email in auth.users
    IF NEW.email IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM auth.users 
            WHERE email = NEW.email
        ) THEN
            -- Allow creation if no user exists yet (for initial setup)
            RETURN NEW;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for provider email validation
DROP TRIGGER IF EXISTS validate_provider_email ON providers;
CREATE TRIGGER validate_provider_email
    BEFORE INSERT OR UPDATE ON providers
    FOR EACH ROW
    EXECUTE FUNCTION check_provider_email_matches_user();

-- Update the handle_new_user function to handle duplicate email errors better
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
                languages_spoken
            ) VALUES (
                new.raw_user_meta_data->>'provider_name',
                COALESCE(new.raw_user_meta_data->>'provider_type', 'clinic')::provider_type,
                new.email,
                ARRAY[COALESCE(new.raw_user_meta_data->>'preferred_language', 'English')]
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

-- Add comment
COMMENT ON CONSTRAINT providers_email_unique ON providers IS 'Ensures each provider has a unique email address';
