-- Fix: Add missing INSERT policies for profile tables
-- This resolves the "Error creating patient profile" issue

-- First, check if the policies exist and drop them to avoid conflicts
DROP POLICY IF EXISTS "Users can create own patient profile" ON patient_profiles;
DROP POLICY IF EXISTS "Users can create their own patient profile" ON patient_profiles;
DROP POLICY IF EXISTS "Users can create own provider profile" ON provider_profiles;
DROP POLICY IF EXISTS "Users can create their own provider profile" ON provider_profiles;

-- Create INSERT policies for patient_profiles
CREATE POLICY "Users can create own patient profile" ON patient_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Create INSERT policies for provider_profiles
CREATE POLICY "Users can create own provider profile" ON provider_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('patient_profiles', 'provider_profiles')
    AND cmd = 'INSERT'
ORDER BY tablename, policyname;
