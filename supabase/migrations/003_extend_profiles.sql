-- Extend profiles table for patient and provider specific information

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS geo_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS geo_long DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(100),
ADD COLUMN IF NOT EXISTS insurance_member_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS medical_conditions TEXT[],
ADD COLUMN IF NOT EXISTS current_medications TEXT[],
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50) DEFAULT 'English',
ADD COLUMN IF NOT EXISTS needs_interpreter BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accessibility_needs TEXT[],
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": false}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create patient_profiles view for patients
CREATE OR REPLACE VIEW patient_profiles AS
SELECT 
    p.id,
    p.role,
    p.full_name,
    p.phone,
    p.address,
    p.geo_lat,
    p.geo_long,
    p.date_of_birth,
    p.insurance_provider,
    p.insurance_member_id,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.medical_conditions,
    p.current_medications,
    p.allergies,
    p.preferred_language,
    p.needs_interpreter,
    p.accessibility_needs,
    p.notification_preferences,
    p.metadata,
    p.created_at,
    p.updated_at,
    u.email
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id
WHERE p.role = 'patient';

-- Create provider_profiles view for providers
CREATE OR REPLACE VIEW provider_profiles AS
SELECT 
    p.id,
    p.role,
    p.full_name,
    p.phone,
    p.provider_id,
    p.address,
    p.geo_lat,
    p.geo_long,
    p.preferred_language,
    p.notification_preferences,
    p.metadata,
    p.created_at,
    p.updated_at,
    u.email,
    pr.name as provider_name,
    pr.type as provider_type,
    pr.services,
    pr.languages_spoken,
    pr.telehealth_available,
    pr.accepts_walk_ins
FROM profiles p
INNER JOIN auth.users u ON p.id = u.id
LEFT JOIN providers pr ON p.provider_id = pr.id
WHERE p.role = 'provider';

-- Update the handle_new_user function to accept role parameter
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
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
        RETURNING id INTO new.raw_user_meta_data;
        
        -- Update profile with provider_id
        UPDATE public.profiles 
        SET provider_id = (new.raw_user_meta_data->>'id')::UUID
        WHERE id = new.id;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    user_id UUID,
    profile_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    updated_profile JSONB;
BEGIN
    -- Update the profile
    UPDATE profiles
    SET 
        full_name = COALESCE(profile_data->>'full_name', full_name),
        phone = COALESCE(profile_data->>'phone', phone),
        address = COALESCE(profile_data->>'address', address),
        geo_lat = CASE WHEN profile_data->>'geo_lat' IS NOT NULL THEN (profile_data->>'geo_lat')::DECIMAL ELSE geo_lat END,
        geo_long = CASE WHEN profile_data->>'geo_long' IS NOT NULL THEN (profile_data->>'geo_long')::DECIMAL ELSE geo_long END,
        date_of_birth = CASE WHEN profile_data->>'date_of_birth' IS NOT NULL THEN (profile_data->>'date_of_birth')::DATE ELSE date_of_birth END,
        insurance_provider = COALESCE(profile_data->>'insurance_provider', insurance_provider),
        insurance_member_id = COALESCE(profile_data->>'insurance_member_id', insurance_member_id),
        emergency_contact_name = COALESCE(profile_data->>'emergency_contact_name', emergency_contact_name),
        emergency_contact_phone = COALESCE(profile_data->>'emergency_contact_phone', emergency_contact_phone),
        medical_conditions = CASE WHEN profile_data->'medical_conditions' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'medical_conditions')) ELSE medical_conditions END,
        current_medications = CASE WHEN profile_data->'current_medications' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'current_medications')) ELSE current_medications END,
        allergies = CASE WHEN profile_data->'allergies' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'allergies')) ELSE allergies END,
        preferred_language = COALESCE(profile_data->>'preferred_language', preferred_language),
        needs_interpreter = CASE WHEN profile_data->>'needs_interpreter' IS NOT NULL THEN (profile_data->>'needs_interpreter')::BOOLEAN ELSE needs_interpreter END,
        accessibility_needs = CASE WHEN profile_data->'accessibility_needs' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'accessibility_needs')) ELSE accessibility_needs END,
        notification_preferences = COALESCE(profile_data->'notification_preferences', notification_preferences),
        metadata = COALESCE(profile_data->'metadata', metadata),
        updated_at = NOW()
    WHERE id = user_id
    RETURNING to_jsonb(profiles.*) INTO updated_profile;
    
    -- If user is a provider, also update provider record
    IF (updated_profile->>'role' = 'provider' AND updated_profile->>'provider_id' IS NOT NULL) THEN
        UPDATE providers
        SET
            name = COALESCE(profile_data->>'provider_name', name),
            address = COALESCE(profile_data->>'address', address),
            geo_lat = CASE WHEN profile_data->>'geo_lat' IS NOT NULL THEN (profile_data->>'geo_lat')::DECIMAL ELSE geo_lat END,
            geo_long = CASE WHEN profile_data->>'geo_long' IS NOT NULL THEN (profile_data->>'geo_long')::DECIMAL ELSE geo_long END,
            phone = COALESCE(profile_data->>'phone', phone),
            website = COALESCE(profile_data->>'website', website),
            languages_spoken = CASE WHEN profile_data->'languages_spoken' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'languages_spoken')) ELSE languages_spoken END,
            services = CASE WHEN profile_data->'services' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'services'))::service_type[] ELSE services END,
            insurance_accepted = CASE WHEN profile_data->'insurance_accepted' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'insurance_accepted')) ELSE insurance_accepted END,
            telehealth_available = CASE WHEN profile_data->>'telehealth_available' IS NOT NULL THEN (profile_data->>'telehealth_available')::BOOLEAN ELSE telehealth_available END,
            accepts_walk_ins = CASE WHEN profile_data->>'accepts_walk_ins' IS NOT NULL THEN (profile_data->>'accepts_walk_ins')::BOOLEAN ELSE accepts_walk_ins END,
            accessibility_features = CASE WHEN profile_data->'accessibility_features' IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(profile_data->'accessibility_features')) ELSE accessibility_features END,
            updated_at = NOW()
        WHERE id = (updated_profile->>'provider_id')::UUID;
    END IF;
    
    RETURN updated_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for views
GRANT SELECT ON patient_profiles TO authenticated;
GRANT SELECT ON provider_profiles TO authenticated;

-- Comments
COMMENT ON COLUMN profiles.medical_conditions IS 'Array of medical conditions for patients';
COMMENT ON COLUMN profiles.current_medications IS 'Array of current medications for patients';
COMMENT ON COLUMN profiles.allergies IS 'Array of allergies for patients';
COMMENT ON COLUMN profiles.preferred_language IS 'Preferred language for communication';
COMMENT ON COLUMN profiles.needs_interpreter IS 'Whether the user needs interpreter services';
COMMENT ON COLUMN profiles.accessibility_needs IS 'Array of accessibility requirements';
COMMENT ON COLUMN profiles.notification_preferences IS 'JSON object with notification settings';
COMMENT ON VIEW patient_profiles IS 'View for patient-specific profile data';
COMMENT ON VIEW provider_profiles IS 'View for provider-specific profile data';
