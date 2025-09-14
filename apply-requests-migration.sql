-- =====================================================
-- APPLY REQUESTS TABLE MIGRATION
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Create the requests table
-- =====================================================
CREATE TABLE IF NOT EXISTS requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    address TEXT,
    state VARCHAR(2),
    city TEXT,
    zip_code VARCHAR(10),
    reason TEXT,
    type_of_care type_of_care,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_state ON requests(state);
CREATE INDEX IF NOT EXISTS idx_requests_city ON requests(city);
CREATE INDEX IF NOT EXISTS idx_requests_type_of_care ON requests(type_of_care);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);

-- Add geography column for spatial queries
ALTER TABLE requests ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Create index for geographic queries
CREATE INDEX IF NOT EXISTS idx_requests_location ON requests USING GIST(location);

-- Function to update location from lat/lng
CREATE OR REPLACE FUNCTION update_request_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update location when lat/lng are set
DROP TRIGGER IF EXISTS update_request_location_trigger ON requests;
CREATE TRIGGER update_request_location_trigger
    BEFORE INSERT OR UPDATE OF latitude, longitude ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_request_location();

-- Step 2: Enable RLS and create policies
-- =====================================================
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
DROP POLICY IF EXISTS "Authenticated users can insert requests" ON requests;
DROP POLICY IF EXISTS "Providers can view all requests" ON requests;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own requests" ON requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Authenticated users can insert requests
CREATE POLICY "Authenticated users can insert requests" ON requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Providers can view all requests (anonymized in view)
CREATE POLICY "Providers can view all requests" ON requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM provider_profiles
            WHERE provider_profiles.id = auth.uid()
        )
    );

-- Step 3: Create materialized view for heatmap
-- =====================================================
DROP MATERIALIZED VIEW IF EXISTS request_heatmap CASCADE;

CREATE MATERIALIZED VIEW request_heatmap AS
SELECT 
    ST_SnapToGrid(location::geometry, 0.01) as grid_point,  -- Grid cells ~1km
    COUNT(*) as request_count,
    type_of_care,
    state,
    city,
    DATE_TRUNC('week', created_at) as week_start
FROM requests
WHERE location IS NOT NULL
    AND created_at > NOW() - INTERVAL '90 days'  -- Last 90 days only
GROUP BY grid_point, type_of_care, state, city, week_start;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_request_heatmap_grid ON request_heatmap USING GIST(grid_point);
CREATE INDEX IF NOT EXISTS idx_request_heatmap_week ON request_heatmap(week_start);

-- Function to refresh heatmap (can be called via cron job)
CREATE OR REPLACE FUNCTION refresh_request_heatmap()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY request_heatmap;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for the materialized view
GRANT SELECT ON request_heatmap TO authenticated;

-- Step 4: Create a function to get heatmap data with proper JSON format
-- =====================================================
CREATE OR REPLACE FUNCTION get_request_heatmap_data(
    p_state TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_days_back INTEGER DEFAULT 90
)
RETURNS TABLE (
    lat FLOAT,
    lng FLOAT,
    intensity INTEGER,
    type_of_care type_of_care,
    city TEXT,
    state TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ST_Y(grid_point::geometry)::FLOAT as lat,
        ST_X(grid_point::geometry)::FLOAT as lng,
        request_count::INTEGER as intensity,
        rh.type_of_care,
        rh.city,
        rh.state
    FROM request_heatmap rh
    WHERE 
        rh.week_start >= NOW() - (p_days_back || ' days')::INTERVAL
        AND (p_state IS NULL OR rh.state = p_state)
        AND (p_city IS NULL OR rh.city = p_city);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_request_heatmap_data TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Requests table and related objects created successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run seed-requests-data.sql to insert sample data';
    RAISE NOTICE '2. The heatmap component will work after seeding data';
END $$;
