-- Additional tables for CareFlow

-- Create profiles table for user roles
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role VARCHAR(50) DEFAULT 'patient',
    full_name VARCHAR(255),
    phone VARCHAR(20),
    provider_id UUID REFERENCES providers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scraper_jobs table for tracking data pipeline jobs
CREATE TABLE scraper_jobs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    query TEXT,
    location JSONB,
    max_results INTEGER DEFAULT 20,
    status VARCHAR(20) DEFAULT 'pending',
    results_count INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create triage_results table for AI triage history
CREATE TABLE triage_results (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    input JSONB NOT NULL,
    result JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create capacity_snapshots table for tracking provider capacity over time
CREATE TABLE capacity_snapshots (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    capacity INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_provider_id ON profiles(provider_id);
CREATE INDEX idx_scraper_jobs_status ON scraper_jobs(status);
CREATE INDEX idx_scraper_jobs_created ON scraper_jobs(created_at DESC);
CREATE INDEX idx_triage_results_user ON triage_results(user_id);
CREATE INDEX idx_triage_results_created ON triage_results(created_at DESC);
CREATE INDEX idx_capacity_snapshots_provider ON capacity_snapshots(provider_id);
CREATE INDEX idx_capacity_snapshots_timestamp ON capacity_snapshots(timestamp DESC);

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS policies for scraper_jobs (admin only)
ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view scraper jobs" ON scraper_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS policies for triage_results
ALTER TABLE triage_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own triage results" ON triage_results
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can create triage results" ON triage_results
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

-- RLS policies for capacity_snapshots
ALTER TABLE capacity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view capacity snapshots" ON capacity_snapshots
    FOR SELECT USING (true);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to match request with providers (returns matches)
CREATE OR REPLACE FUNCTION match_request_with_providers(request_id UUID)
RETURNS TABLE (
    provider_id UUID,
    provider_name VARCHAR,
    distance_miles DECIMAL,
    score DECIMAL
) AS $$
DECLARE
    req patient_requests%ROWTYPE;
BEGIN
    -- Get the request details
    SELECT * INTO req FROM patient_requests WHERE id = request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found';
    END IF;
    
    -- Find and score nearby providers
    RETURN QUERY
    WITH provider_scores AS (
        SELECT 
            p.id,
            p.name,
            calculate_distance(req.geo_lat, req.geo_long, p.geo_lat, p.geo_long) AS dist,
            CASE 
                WHEN p.current_wait_time IS NULL THEN 0.5
                ELSE GREATEST(0, 1 - (p.current_wait_time::DECIMAL / 120))
            END AS wait_score,
            CASE 
                WHEN req.requested_service = ANY(p.services) THEN 1.0
                ELSE 0.5
            END AS service_match
        FROM providers p
        WHERE 
            p.is_active = true
            AND p.geo_lat IS NOT NULL 
            AND p.geo_long IS NOT NULL
            AND calculate_distance(req.geo_lat, req.geo_long, p.geo_lat, p.geo_long) <= 20
    )
    SELECT 
        ps.id AS provider_id,
        ps.name AS provider_name,
        ps.dist AS distance_miles,
        LEAST(1.0, (
            (GREATEST(0, 1 - (ps.dist / 20)) * 0.4) +  -- Distance factor (40%)
            (ps.wait_score * 0.3) +                      -- Wait time factor (30%)
            (ps.service_match * 0.3)                     -- Service match factor (30%)
        )) AS score
    FROM provider_scores ps
    ORDER BY score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE profiles IS 'User profiles with roles for access control';
COMMENT ON TABLE scraper_jobs IS 'Track data pipeline scraper jobs from Trigger.dev';
COMMENT ON TABLE triage_results IS 'Store AI triage results from Gemini agents';
COMMENT ON TABLE capacity_snapshots IS 'Track provider capacity changes over time';
COMMENT ON FUNCTION match_request_with_providers IS 'Smart matching algorithm for patient requests';
