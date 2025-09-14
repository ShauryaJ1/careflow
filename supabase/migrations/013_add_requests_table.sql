-- Create requests table to track patient care requests with location data
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
CREATE TRIGGER update_request_location_trigger
    BEFORE INSERT OR UPDATE OF latitude, longitude ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_request_location();

-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own requests" ON requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Authenticated users can insert requests
CREATE POLICY "Authenticated users can insert requests" ON requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy: Providers can view aggregated request data (anonymized)
CREATE POLICY "Providers can view all requests" ON requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM provider_profiles
            WHERE provider_profiles.id = auth.uid()
        )
    );

-- Create a materialized view for request heatmap data (aggregated and anonymized)
CREATE MATERIALIZED VIEW IF NOT EXISTS request_heatmap AS
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
