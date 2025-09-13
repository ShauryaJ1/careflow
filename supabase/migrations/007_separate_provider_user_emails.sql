-- Separate provider facility emails from user emails
-- This allows a user to have their personal email while the clinic has a different contact email

-- First, let's update the handle_new_user function to NOT automatically use user email for provider
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
    -- NOTE: We now use provider_email if provided, otherwise NULL (not user's email)
    IF new.raw_user_meta_data->>'role' = 'provider' AND new.raw_user_meta_data->>'provider_name' IS NOT NULL THEN
        BEGIN
            INSERT INTO public.providers (
                name, 
                type, 
                email,  -- This can be different from user's email or NULL
                languages_spoken
            ) VALUES (
                new.raw_user_meta_data->>'provider_name',
                COALESCE(new.raw_user_meta_data->>'provider_type', 'clinic')::provider_type,
                new.raw_user_meta_data->>'provider_email',  -- Use provider_email if provided, otherwise NULL
                ARRAY[COALESCE(new.raw_user_meta_data->>'preferred_language', 'English')]
            )
            RETURNING id INTO new_provider_id;
            
            -- Update profile with provider_id
            UPDATE public.profiles 
            SET provider_id = new_provider_id
            WHERE id = new.id;
        EXCEPTION 
            WHEN unique_violation THEN
                -- If provider with this email already exists, we don't auto-link
                -- This prevents accidental linking to wrong providers
                RAISE WARNING 'Provider with email % already exists', new.raw_user_meta_data->>'provider_email';
        END;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the trigger that was trying to match provider emails with user emails
-- This was preventing the separation we want
DROP TRIGGER IF EXISTS validate_provider_email ON providers;
DROP FUNCTION IF EXISTS check_provider_email_matches_user();

-- Add a comment explaining the email separation
COMMENT ON COLUMN providers.email IS 'Contact email for the provider facility (can be different from staff user emails)';
-- Note: We cannot comment on auth.users.email in hosted Supabase (no permission)

-- Create a helper function to link an existing user to an existing provider
CREATE OR REPLACE FUNCTION link_user_to_provider(
    user_id UUID,
    provider_id_to_link UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles
    SET provider_id = provider_id_to_link
    WHERE id = user_id AND role = 'provider';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_user_to_provider IS 'Links a provider user to an existing provider facility';
