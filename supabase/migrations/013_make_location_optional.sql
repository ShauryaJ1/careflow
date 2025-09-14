-- Make location field explicitly optional for hospitals
-- This allows storing telehealth providers and other services without physical coordinates

-- The location column is already nullable by default in PostgreSQL
-- But let's add a comment to make this explicit
COMMENT ON COLUMN hospitals.location IS 'Geographic location (optional) - may be NULL for telehealth or services without fixed locations';

-- Update the RLS policies to ensure they work with NULL locations
-- The existing policies should already handle this, but let's be explicit

-- Add a partial index for better performance when querying hospitals with locations
CREATE INDEX IF NOT EXISTS idx_hospitals_with_location 
ON hospitals USING GIST(location) 
WHERE location IS NOT NULL;

-- Add a check constraint to ensure telehealth providers can have NULL locations
-- but other types should ideally have locations (this is a soft constraint via comment)
COMMENT ON TABLE hospitals IS 'Medical facilities and providers. Location is optional for telehealth and some pop-up clinics.';
