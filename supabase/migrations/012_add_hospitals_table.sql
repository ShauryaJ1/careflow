-- Create ENUM type for type of care
DO $$ BEGIN
    CREATE TYPE type_of_care AS ENUM (
        'ER',
        'urgent_care',
        'telehealth',
        'clinic',
        'pop_up_clinic',
        'practitioner'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create hospitals table
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    type_of_care type_of_care NOT NULL,
    wait_score NUMERIC,
    cooldown NUMERIC,
    op_22 NUMERIC,
    website TEXT,
    email TEXT,
    phone_number TEXT,
    description TEXT,
    open_time JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    start_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    end_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_state ON hospitals(state);
CREATE INDEX IF NOT EXISTS idx_hospitals_zip_code ON hospitals(zip_code);
CREATE INDEX IF NOT EXISTS idx_hospitals_type_of_care ON hospitals(type_of_care);
CREATE INDEX IF NOT EXISTS idx_hospitals_active ON hospitals(start_at, end_at);

-- Add PostGIS extension if not already added
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column for location-based queries
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Create index for geographic queries
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals USING GIST(location);

-- Add RLS policies
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all hospitals
CREATE POLICY "Anyone can view hospitals" ON hospitals
    FOR SELECT
    USING (true);

-- Only authenticated providers can insert/update hospitals
CREATE POLICY "Providers can insert hospitals" ON hospitals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM provider_profiles
            WHERE provider_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Providers can update hospitals" ON hospitals
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM provider_profiles
            WHERE provider_profiles.id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM provider_profiles
            WHERE provider_profiles.id = auth.uid()
        )
    );

-- Providers can delete hospitals (for now, any provider can delete any hospital - adjust as needed)
CREATE POLICY "Providers can delete hospitals" ON hospitals
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM provider_profiles
            WHERE provider_profiles.id = auth.uid()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hospitals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hospitals_updated_at
    BEFORE UPDATE ON hospitals
    FOR EACH ROW
    EXECUTE FUNCTION update_hospitals_updated_at();

-- Function to calculate location from address (to be used when inserting/updating)
CREATE OR REPLACE FUNCTION update_hospital_location()
RETURNS TRIGGER AS $$
BEGIN
    -- This is a placeholder - in production you'd use a geocoding service
    -- For now, we'll leave the location null and handle geocoding in the application
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hospital_location
    BEFORE INSERT OR UPDATE OF address, city, state, zip_code ON hospitals
    FOR EACH ROW
    EXECUTE FUNCTION update_hospital_location();
