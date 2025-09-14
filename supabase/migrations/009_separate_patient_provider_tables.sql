-- Migration to separate patient and provider profiles into different tables
-- This creates a cleaner architecture with dedicated tables for each user type

-- Step 1: Drop any existing views that might conflict (from previous migrations)
DROP VIEW IF EXISTS patient_profiles CASCADE;
DROP VIEW IF EXISTS provider_profiles CASCADE;

-- Step 2: Create patient_profiles table
CREATE TABLE IF NOT EXISTS patient_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    geo_lat DECIMAL(10, 8),
    geo_long DECIMAL(11, 8),
    date_of_birth DATE,
    insurance_provider VARCHAR(100),
    insurance_member_id VARCHAR(100),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    medical_conditions TEXT[],
    current_medications TEXT[],
    allergies TEXT[],
    preferred_language VARCHAR(50) DEFAULT 'English',
    needs_interpreter BOOLEAN DEFAULT false,
    accessibility_needs TEXT[],
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": false}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create provider_profiles table (for healthcare staff members)
CREATE TABLE IF NOT EXISTS provider_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    provider_id UUID REFERENCES providers(id), -- Links to the healthcare facility they work at
    address TEXT,
    geo_lat DECIMAL(10, 8),
    geo_long DECIMAL(11, 8),
    preferred_language VARCHAR(50) DEFAULT 'English',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": false}',
    specialty VARCHAR(100), -- e.g., "Cardiologist", "Nurse Practitioner"
    license_number VARCHAR(100),
    years_of_experience INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_profiles_insurance ON patient_profiles(insurance_provider);
CREATE INDEX IF NOT EXISTS idx_patient_profiles_created ON patient_profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_provider_id ON provider_profiles(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_created ON provider_profiles(created_at DESC);

-- Step 5: Migrate existing data from profiles table (if it exists)
DO $$
BEGIN
    -- Only migrate if the profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Migrate patients
        INSERT INTO patient_profiles (
            id, full_name, phone, address, geo_lat, geo_long,
            date_of_birth, insurance_provider, insurance_member_id,
            emergency_contact_name, emergency_contact_phone,
            medical_conditions, current_medications, allergies,
            preferred_language, needs_interpreter, accessibility_needs,
            notification_preferences, metadata, created_at, updated_at
        )
        SELECT 
            id, full_name, phone, address, geo_lat, geo_long,
            date_of_birth, insurance_provider, insurance_member_id,
            emergency_contact_name, emergency_contact_phone,
            medical_conditions, current_medications, allergies,
            preferred_language, needs_interpreter, accessibility_needs,
            notification_preferences, metadata, created_at, updated_at
        FROM profiles
        WHERE role = 'patient'
        ON CONFLICT (id) DO NOTHING;

        -- Migrate providers
        INSERT INTO provider_profiles (
            id, full_name, phone, provider_id, address, geo_lat, geo_long,
            preferred_language, notification_preferences, metadata,
            created_at, updated_at
        )
        SELECT 
            id, full_name, phone, provider_id, address, geo_lat, geo_long,
            preferred_language, notification_preferences, metadata,
            created_at, updated_at
        FROM profiles
        WHERE role = 'provider'
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Step 6: Create updated trigger function for new user signup
CREATE OR REPLACE FUNCTION handle_new_user_v2() 
RETURNS TRIGGER AS $$
DECLARE
    new_provider_id UUID;
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
        -- Create provider profile
        INSERT INTO public.provider_profiles (
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
        
        -- If provider facility info is provided, create or link to provider
        IF new.raw_user_meta_data->>'provider_name' IS NOT NULL THEN
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
                
                -- Update provider profile with provider_id
                UPDATE public.provider_profiles 
                SET provider_id = new_provider_id
                WHERE id = new.id;
            EXCEPTION 
                WHEN unique_violation THEN
                    RAISE WARNING 'Provider with email % already exists', new.raw_user_meta_data->>'provider_email';
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to create provider for user %: %', new.id, SQLERRM;
            END;
        END IF;
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Update the trigger to use the new function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_v2();

-- Step 8: Create RLS policies for new tables
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;

-- Patients can view, create and update their own profile
CREATE POLICY "Users can view own patient profile" ON patient_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own patient profile" ON patient_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own patient profile" ON patient_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Providers can view, create and update their own profile
CREATE POLICY "Users can view own provider profile" ON provider_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own provider profile" ON provider_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own provider profile" ON provider_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Step 9: Create helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- Check patient_profiles first
    IF EXISTS (SELECT 1 FROM patient_profiles WHERE id = user_id) THEN
        RETURN 'patient';
    END IF;
    
    -- Check provider_profiles
    IF EXISTS (SELECT 1 FROM provider_profiles WHERE id = user_id) THEN
        RETURN 'provider';
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Update orphaned user functions to work with new tables
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
    LEFT JOIN patient_profiles pp ON au.id = pp.id
    LEFT JOIN provider_profiles pr ON au.id = pr.id
    WHERE pp.id IS NULL AND pr.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    
    IF user_role = 'patient' THEN
        -- Create patient profile
        INSERT INTO patient_profiles (
            id, 
            full_name, 
            preferred_language,
            created_at
        ) VALUES (
            user_record.id,
            COALESCE(user_record.raw_user_meta_data->>'full_name', 'Unknown'),
            COALESCE(user_record.raw_user_meta_data->>'preferred_language', 'English'),
            user_record.created_at
        )
        ON CONFLICT (id) DO NOTHING;
    ELSE
        -- Create provider profile
        INSERT INTO provider_profiles (
            id, 
            full_name, 
            preferred_language,
            created_at
        ) VALUES (
            user_record.id,
            COALESCE(user_record.raw_user_meta_data->>'full_name', 'Unknown'),
            COALESCE(user_record.raw_user_meta_data->>'preferred_language', 'English'),
            user_record.created_at
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Add update timestamp triggers
CREATE TRIGGER update_patient_profiles_updated_at
    BEFORE UPDATE ON patient_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_profiles_updated_at
    BEFORE UPDATE ON provider_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 12: Add helpful comments
COMMENT ON TABLE patient_profiles IS 'Profile information for patients using the healthcare system';
COMMENT ON TABLE provider_profiles IS 'Profile information for healthcare provider staff members (doctors, nurses, admins)';
COMMENT ON COLUMN provider_profiles.provider_id IS 'Links staff member to the healthcare facility (clinic, hospital) they work at';
COMMENT ON FUNCTION get_user_role IS 'Returns the role (patient or provider) for a given user ID';
COMMENT ON FUNCTION find_orphaned_users IS 'Finds auth users without a profile in either table';
COMMENT ON FUNCTION create_missing_profile IS 'Creates a missing profile in the appropriate table for an orphaned user';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION find_orphaned_users TO authenticated;
GRANT EXECUTE ON FUNCTION create_missing_profile TO authenticated;