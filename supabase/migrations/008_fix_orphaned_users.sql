-- Fix orphaned users (users in auth.users without profiles)

-- Function to find orphaned users (in auth.users but not in profiles)
CREATE OR REPLACE FUNCTION find_orphaned_users()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::TEXT,
        au.created_at
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create missing profile for an existing auth user
CREATE OR REPLACE FUNCTION create_missing_profile(
    user_id UUID,
    user_role VARCHAR DEFAULT 'patient'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_record auth.users%ROWTYPE;
BEGIN
    -- Get the user record
    SELECT * INTO user_record FROM auth.users WHERE id = user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with ID % not found', user_id;
    END IF;
    
    -- Create the profile
    INSERT INTO profiles (
        id, 
        full_name, 
        role, 
        preferred_language,
        created_at
    ) VALUES (
        user_record.id,
        COALESCE(user_record.raw_user_meta_data->>'full_name', 'Unknown'),
        COALESCE(user_record.raw_user_meta_data->>'role', user_role),
        COALESCE(user_record.raw_user_meta_data->>'preferred_language', 'English'),
        user_record.created_at
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned auth users (delete users without profiles)
-- Use with caution! This will permanently delete auth users
CREATE OR REPLACE FUNCTION delete_orphaned_user(user_email TEXT)
RETURNS JSONB AS $$
DECLARE
    user_record auth.users%ROWTYPE;
    result JSONB;
BEGIN
    -- Find the user by email
    SELECT * INTO user_record FROM auth.users WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found with email: ' || user_email
        );
    END IF;
    
    -- Check if profile exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = user_record.id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User has a profile. Cannot delete non-orphaned user.'
        );
    END IF;
    
    -- Delete from auth.users (this will cascade delete from other auth tables)
    DELETE FROM auth.users WHERE id = user_record.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Orphaned user deleted successfully',
        'user_id', user_record.id,
        'email', user_record.email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to repair all orphaned users at once
CREATE OR REPLACE FUNCTION repair_all_orphaned_users()
RETURNS JSONB AS $$
DECLARE
    orphan_count INTEGER;
    repaired_count INTEGER := 0;
    orphan RECORD;
BEGIN
    -- Count orphans
    SELECT COUNT(*) INTO orphan_count
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL;
    
    -- Repair each orphan
    FOR orphan IN 
        SELECT au.id, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN profiles p ON au.id = p.id
        WHERE p.id IS NULL
    LOOP
        IF create_missing_profile(orphan.id) THEN
            repaired_count := repaired_count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'orphans_found', orphan_count,
        'profiles_created', repaired_count,
        'success', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    new_provider_id UUID;
BEGIN
    -- Create profile for the new user with better error handling
    BEGIN
        INSERT INTO public.profiles (id, full_name, role, preferred_language)
        VALUES (
            new.id, 
            new.raw_user_meta_data->>'full_name',
            COALESCE(new.raw_user_meta_data->>'role', 'patient'),
            COALESCE(new.raw_user_meta_data->>'preferred_language', 'English')
        )
        ON CONFLICT (id) DO UPDATE SET
            -- If profile somehow exists, update it
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            preferred_language = EXCLUDED.preferred_language,
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
    END;
    
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
                new.raw_user_meta_data->>'provider_email',
                ARRAY[COALESCE(new.raw_user_meta_data->>'preferred_language', 'English')]
            )
            RETURNING id INTO new_provider_id;
            
            -- Update profile with provider_id
            UPDATE public.profiles 
            SET provider_id = new_provider_id
            WHERE id = new.id;
        EXCEPTION 
            WHEN unique_violation THEN
                RAISE WARNING 'Provider with email % already exists', new.raw_user_meta_data->>'provider_email';
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create provider for user %: %', new.id, SQLERRM;
        END;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION find_orphaned_users IS 'Lists all users in auth.users without corresponding profiles';
COMMENT ON FUNCTION create_missing_profile IS 'Creates a profile for an existing auth user who is missing one';
COMMENT ON FUNCTION delete_orphaned_user IS 'Deletes an auth user that has no profile (use with caution!)';
COMMENT ON FUNCTION repair_all_orphaned_users IS 'Creates profiles for all orphaned auth users';

-- Grant execute permissions to authenticated users for diagnostic functions
GRANT EXECUTE ON FUNCTION find_orphaned_users TO authenticated;
GRANT EXECUTE ON FUNCTION create_missing_profile TO authenticated;
GRANT EXECUTE ON FUNCTION repair_all_orphaned_users TO authenticated;
-- Note: delete_orphaned_user is intentionally not granted to regular users for safety
