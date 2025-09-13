-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Make sure we can use the UUID functions
SET search_path TO public, extensions;

-- Create enum types
CREATE TYPE provider_type AS ENUM ('clinic', 'pharmacy', 'telehealth', 'hospital', 'pop_up', 'mobile', 'urgent_care');
CREATE TYPE service_type AS ENUM ('general', 'dental', 'maternal_care', 'urgent_care', 'mental_health', 'pediatric', 'vaccination', 'specialty', 'diagnostic');
CREATE TYPE request_status AS ENUM ('pending', 'matched', 'fulfilled', 'cancelled');

-- Create providers table
CREATE TABLE providers (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type provider_type NOT NULL,
    address TEXT,
    geo_lat DECIMAL(10, 8),
    geo_long DECIMAL(11, 8),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    hours JSONB, -- Store as {"monday": {"open": "09:00", "close": "17:00"}, ...}
    services service_type[] DEFAULT '{}', -- Array of services offered
    insurance_accepted TEXT[], -- Array of insurance providers
    capacity INTEGER,
    current_wait_time INTEGER, -- in minutes
    accepts_walk_ins BOOLEAN DEFAULT false,
    telehealth_available BOOLEAN DEFAULT false,
    languages_spoken TEXT[] DEFAULT '{"English"}',
    accessibility_features TEXT[],
    rating DECIMAL(2, 1),
    total_reviews INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(100),
    metadata JSONB DEFAULT '{}', -- Flexible field for additional provider-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pop_up_events table
CREATE TABLE pop_up_events (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    date_start TIMESTAMP WITH TIME ZONE NOT NULL,
    date_end TIMESTAMP WITH TIME ZONE NOT NULL,
    address TEXT,
    geo_lat DECIMAL(10, 8),
    geo_long DECIMAL(11, 8),
    services_offered service_type[] DEFAULT '{}',
    capacity INTEGER,
    registration_required BOOLEAN DEFAULT false,
    registration_url VARCHAR(255),
    cost_info TEXT,
    is_free BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patient_requests table
CREATE TABLE patient_requests (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID, -- Optional: link to auth.users if you have user accounts
    geo_lat DECIMAL(10, 8) NOT NULL,
    geo_long DECIMAL(11, 8) NOT NULL,
    address TEXT,
    requested_service service_type NOT NULL,
    urgency_level INTEGER DEFAULT 3, -- 1 (emergency) to 5 (routine)
    preferred_date DATE,
    preferred_time_slot VARCHAR(20), -- morning, afternoon, evening
    insurance_provider VARCHAR(100),
    notes TEXT,
    matched_provider_id UUID REFERENCES providers(id),
    match_score DECIMAL(3, 2), -- 0.00 to 1.00
    status request_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cache_snapshots table for performance optimization
CREATE TABLE cache_snapshots (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL, -- e.g., "zip:90210" or "county:los-angeles" or "grid:34.05,-118.25"
    geo_area VARCHAR(100) NOT NULL,
    area_type VARCHAR(20) NOT NULL, -- 'zip', 'county', 'grid', 'city'
    results_json JSONB NOT NULL, -- Serialized provider data
    result_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create provider_metrics table for analytics
CREATE TABLE provider_metrics (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    fulfilled_requests INTEGER DEFAULT 0,
    average_wait_time INTEGER, -- in minutes
    peak_hours JSONB, -- {"hour": count} format
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_providers_geo ON providers(geo_lat, geo_long);
CREATE INDEX idx_providers_type ON providers(type);
CREATE INDEX idx_providers_active ON providers(is_active);
CREATE INDEX idx_providers_services ON providers USING GIN(services);
CREATE INDEX idx_providers_insurance ON providers USING GIN(insurance_accepted);

CREATE INDEX idx_pop_up_events_dates ON pop_up_events(date_start, date_end);
CREATE INDEX idx_pop_up_events_geo ON pop_up_events(geo_lat, geo_long);

CREATE INDEX idx_patient_requests_geo ON patient_requests(geo_lat, geo_long);
CREATE INDEX idx_patient_requests_status ON patient_requests(status);
CREATE INDEX idx_patient_requests_created ON patient_requests(created_at DESC);

CREATE INDEX idx_cache_snapshots_key ON cache_snapshots(cache_key);
CREATE INDEX idx_cache_snapshots_expires ON cache_snapshots(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pop_up_events_updated_at BEFORE UPDATE ON pop_up_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_requests_updated_at BEFORE UPDATE ON patient_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R CONSTANT DECIMAL := 3959; -- Earth's radius in miles (use 6371 for kilometers)
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2) * SIN(dlon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to find nearby providers
CREATE OR REPLACE FUNCTION find_nearby_providers(
    user_lat DECIMAL,
    user_lon DECIMAL,
    max_distance_miles DECIMAL DEFAULT 10,
    provider_type_filter provider_type DEFAULT NULL,
    service_filter service_type DEFAULT NULL,
    limit_results INTEGER DEFAULT 50
)
RETURNS TABLE (
    provider_id UUID,
    provider_name VARCHAR,
    provider_type provider_type,
    distance_miles DECIMAL,
    address TEXT,
    phone VARCHAR,
    services service_type[],
    current_wait_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.type,
        calculate_distance(user_lat, user_lon, p.geo_lat, p.geo_long) AS distance_miles,
        p.address,
        p.phone,
        p.services,
        p.current_wait_time
    FROM providers p
    WHERE 
        p.is_active = true
        AND p.geo_lat IS NOT NULL 
        AND p.geo_long IS NOT NULL
        AND calculate_distance(user_lat, user_lon, p.geo_lat, p.geo_long) <= max_distance_miles
        AND (provider_type_filter IS NULL OR p.type = provider_type_filter)
        AND (service_filter IS NULL OR service_filter = ANY(p.services))
    ORDER BY distance_miles ASC
    LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Create RLS (Row Level Security) policies
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pop_up_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_metrics ENABLE ROW LEVEL SECURITY;

-- Public read access for providers and events
CREATE POLICY "Public providers are viewable by everyone" ON providers
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public events are viewable by everyone" ON pop_up_events
    FOR SELECT USING (true);

-- Authenticated users can create patient requests
CREATE POLICY "Users can create their own requests" ON patient_requests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own requests" ON patient_requests
    FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own requests" ON patient_requests
    FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

-- Cache snapshots are public read
CREATE POLICY "Cache snapshots are viewable by everyone" ON cache_snapshots
    FOR SELECT USING (true);

-- Provider metrics are public read
CREATE POLICY "Provider metrics are viewable by everyone" ON provider_metrics
    FOR SELECT USING (true);

-- Add some helpful comments
COMMENT ON TABLE providers IS 'Main table storing all healthcare provider information';
COMMENT ON TABLE pop_up_events IS 'Temporary healthcare events like vaccination drives or health fairs';
COMMENT ON TABLE patient_requests IS 'Patient requests for healthcare services with matching capabilities';
COMMENT ON TABLE cache_snapshots IS 'Cached search results for performance optimization';
COMMENT ON TABLE provider_metrics IS 'Daily metrics and analytics for providers';
COMMENT ON COLUMN providers.hours IS 'JSON object with day names as keys and {open, close} times';
COMMENT ON COLUMN providers.metadata IS 'Flexible JSON field for provider-specific additional data';
COMMENT ON COLUMN patient_requests.urgency_level IS '1=emergency, 2=urgent, 3=soon, 4=routine, 5=preventive';
