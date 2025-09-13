-- Fix the handle_new_user function to properly handle provider signup

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
    );
    
    -- If user is a provider and provider_name is provided, create a provider record
    IF new.raw_user_meta_data->>'role' = 'provider' AND new.raw_user_meta_data->>'provider_name' IS NOT NULL THEN
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
        RETURNING id INTO new_provider_id;  -- Store in a variable instead
        
        -- Update profile with provider_id
        UPDATE public.profiles 
        SET provider_id = new_provider_id  -- Use the variable
        WHERE id = new.id;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment to document the fix
COMMENT ON FUNCTION handle_new_user IS 'Fixed version: Properly handles provider signup by using a variable to store the new provider ID';
