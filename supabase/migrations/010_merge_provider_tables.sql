-- Migration to merge provider_profiles and providers tables
-- Providers are the facilities themselves, not staff members

-- Step 1: Add all provider facility fields to provider_profiles
ALTER TABLE provider_profiles 
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS provider_type provider_type DEFAULT 'clinic',
ADD COLUMN IF NOT EXISTS services service_type[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS hours JSONB,
ADD COLUMN IF NOT EXISTS insurance_accepted TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS capacity INTEGER,
ADD COLUMN IF NOT EXISTS current_wait_time INTEGER,
ADD COLUMN IF NOT EXISTS accepts_walk_ins BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS telehealth_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT '{"English"}',
ADD COLUMN IF NOT EXISTS accessibility_features TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rating DECIMAL(2, 1),
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Step 2: Copy data from providers table to provider_profiles (if any exists)
UPDATE provider_profiles pp
SET 
    provider_name = p.name,
    provider_type = p.type,
    services = p.services,
    website = p.website,
    hours = p.hours,
    insurance_accepted = p.insurance_accepted,
    capacity = p.capacity,
    current_wait_time = p.current_wait_time,
    accepts_walk_ins = p.accepts_walk_ins,
    telehealth_available = p.telehealth_available,
    languages_spoken = p.languages_spoken,
    accessibility_features = p.accessibility_features,
    rating = p.rating,
    total_reviews = p.total_reviews,
    is_active = p.is_active,
    last_verified = p.last_verified,
    source = p.source
FROM providers p
WHERE pp.provider_id = p.id;

-- Step 3: Drop the provider_id column as we no longer need it
ALTER TABLE provider_profiles 
DROP COLUMN IF EXISTS provider_id;

-- Step 4: Update references in other tables to point to provider_profiles instead of providers
-- Update pop_up_events
ALTER TABLE pop_up_events 
DROP CONSTRAINT IF EXISTS pop_up_events_provider_id_fkey;

ALTER TABLE pop_up_events 
ADD CONSTRAINT pop_up_events_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE;

-- Update patient_requests
ALTER TABLE patient_requests 
DROP CONSTRAINT IF EXISTS patient_requests_matched_provider_id_fkey;

ALTER TABLE patient_requests 
ADD CONSTRAINT patient_requests_matched_provider_id_fkey 
FOREIGN KEY (matched_provider_id) REFERENCES provider_profiles(id);

-- Update provider_metrics
ALTER TABLE provider_metrics 
DROP CONSTRAINT IF EXISTS provider_metrics_provider_id_fkey;

ALTER TABLE provider_metrics 
ADD CONSTRAINT provider_metrics_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE;

-- Step 5: Create new trigger function for provider signup
CREATE OR REPLACE FUNCTION handle_new_user_v3() 
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get the role from metadata
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'patient');
    
    IF user_role = 'patient' THEN
        -- Create patient profile
        INSERT INTO public.patient_profiles (
            id, 
            full_name, 
            preferred_language
        )
        VALUES (
            new.id, 
            new.raw_user_meta_data->>'full_name',
            COALESCE(new.raw_user_meta_data->>'preferred_language', 'English')
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            preferred_language = EXCLUDED.preferred_language,
            updated_at = NOW();
            
    ELSIF user_role = 'provider' THEN
        -- Create provider profile with facility info
        INSERT INTO public.provider_profiles (
            id, 
            full_name,
            provider_name,
            provider_type,
            preferred_language,
            languages_spoken
        )
        VALUES (
            new.id, 
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'provider_name',
            COALESCE(new.raw_user_meta_data->>'provider_type', 'clinic')::provider_type,
            COALESCE(new.raw_user_meta_data->>'preferred_language', 'English'),
            ARRAY[COALESCE(new.raw_user_meta_data->>'preferred_language', 'English')]
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            provider_name = EXCLUDED.provider_name,
            provider_type = EXCLUDED.provider_type,
            preferred_language = EXCLUDED.preferred_language,
            languages_spoken = EXCLUDED.languages_spoken,
            updated_at = NOW();
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_v3();

-- Step 7: Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_provider_profiles_type ON provider_profiles(provider_type);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_services ON provider_profiles USING GIN(services);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_active ON provider_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_geo ON provider_profiles(geo_lat, geo_long);

-- Step 8: Update functions that referenced providers table
CREATE OR REPLACE FUNCTION find_nearby_providers(
    lat DECIMAL,
    long DECIMAL,
    radius_miles INTEGER DEFAULT 10
)
RETURNS TABLE (
    provider_id UUID,
    provider_name VARCHAR,
    distance_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS provider_id,
        p.provider_name,
        calculate_distance(lat, long, p.geo_lat, p.geo_long) AS distance_miles
    FROM provider_profiles p
    WHERE 
        p.is_active = true
        AND p.geo_lat IS NOT NULL 
        AND p.geo_long IS NOT NULL
        AND calculate_distance(lat, long, p.geo_lat, p.geo_long) <= radius_miles
    ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add comment
COMMENT ON TABLE provider_profiles IS 'Healthcare provider facilities (clinics, hospitals, pharmacies)';
COMMENT ON COLUMN provider_profiles.provider_name IS 'Name of the healthcare facility';
COMMENT ON COLUMN provider_profiles.provider_type IS 'Type of healthcare facility';
COMMENT ON COLUMN provider_profiles.services IS 'Array of services offered by this facility';

-- Note: We'll drop the providers table after confirming everything works
-- For now, keep it as backup
