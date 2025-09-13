-- Seed data for Northern Virginia hospitals and healthcare facilities
-- Run this file to populate the database with sample data

-- Insert hospitals in Northern Virginia area
INSERT INTO hospitals (
  id,
  name,
  address,
  city,
  state,
  zip_code,
  type_of_care,
  wait_score,
  cooldown,
  op_22,
  website,
  email,
  phone_number,
  description,
  open_time,
  created_at,
  updated_at
) VALUES
  -- Fairfax County Hospitals
  (
    gen_random_uuid(),
    'Inova Fairfax Hospital',
    '3300 Gallows Road',
    'Falls Church',
    'VA',
    '22042',
    'ER',
    4.2,
    0.8,
    45,
    'https://www.inova.org/locations/inova-fairfax-hospital',
    'info.fairfax@inova.org',
    '703-776-4001',
    'Northern Virginia''s premier healthcare facility offering comprehensive emergency and specialized care services.',
    '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Virginia Hospital Center',
    '1701 N George Mason Dr',
    'Arlington',
    'VA',
    '22205',
    'ER',
    4.5,
    0.7,
    38,
    'https://www.virginiahospitalcenter.com',
    'contact@vhc.com',
    '703-558-5000',
    'Arlington''s leading medical center providing emergency care and advanced medical services.',
    '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Inova Alexandria Hospital',
    '4320 Seminary Road',
    'Alexandria',
    'VA',
    '22304',
    'ER',
    4.0,
    0.9,
    52,
    'https://www.inova.org/locations/inova-alexandria-hospital',
    'info.alexandria@inova.org',
    '703-504-3000',
    'Full-service community hospital serving Alexandria and surrounding areas with 24/7 emergency care.',
    '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}',
    NOW(),
    NOW()
  ),
  
  -- Urgent Care Centers
  (
    gen_random_uuid(),
    'MedStar Urgent Care - Arlington',
    '3801 Fairfax Dr',
    'Arlington',
    'VA',
    '22203',
    'urgent_care',
    3.8,
    0.5,
    25,
    'https://www.medstarhealth.org/locations/medstar-health-urgent-care-arlington',
    'urgentcare.arlington@medstar.net',
    '703-717-9000',
    'Walk-in urgent care for non-life-threatening injuries and illnesses. No appointment needed.',
    '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "09:00", "close": "17:00"}, "sunday": {"open": "09:00", "close": "17:00"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Patient First - Fair Oaks',
    '12585 Fair Lakes Circle',
    'Fairfax',
    'VA',
    '22033',
    'urgent_care',
    3.5,
    0.6,
    30,
    'https://www.patientfirst.com',
    'fairoaks@patientfirst.com',
    '703-391-1250',
    'Primary and urgent care center open every day with extended hours. Walk-ins welcome.',
    '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "08:00", "close": "22:00"}, "saturday": {"open": "08:00", "close": "22:00"}, "sunday": {"open": "08:00", "close": "22:00"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'CVS MinuteClinic - Alexandria',
    '6811 Richmond Hwy',
    'Alexandria',
    'VA',
    '22306',
    'urgent_care',
    2.8,
    0.4,
    20,
    'https://www.cvs.com/minuteclinic',
    NULL,
    '703-765-4902',
    'Walk-in clinic inside CVS for minor illnesses, injuries, and wellness services.',
    '{"monday": {"open": "08:30", "close": "19:30"}, "tuesday": {"open": "08:30", "close": "19:30"}, "wednesday": {"open": "08:30", "close": "19:30"}, "thursday": {"open": "08:30", "close": "19:30"}, "friday": {"open": "08:30", "close": "19:30"}, "saturday": {"open": "09:00", "close": "17:30"}, "sunday": {"open": "10:00", "close": "17:30"}}',
    NOW(),
    NOW()
  ),
  
  -- Clinics
  (
    gen_random_uuid(),
    'Arlington Free Clinic',
    '2921 11th St S',
    'Arlington',
    'VA',
    '22204',
    'clinic',
    3.2,
    0.3,
    15,
    'https://www.arlingtonfreeclinic.org',
    'info@arlingtonfreeclinic.org',
    '703-979-1400',
    'Free medical care for uninsured Arlington County adults. By appointment only.',
    '{"monday": {"open": "09:00", "close": "21:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "friday": {"open": "09:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "13:00"}, "sunday": {"open": "closed", "close": "closed"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Neighborhood Health - Alexandria',
    '2 East Glebe Road',
    'Alexandria',
    'VA',
    '22305',
    'clinic',
    3.0,
    0.4,
    18,
    'https://www.neighborhoodhealthva.org',
    'alexandria@neighborhoodhealth.org',
    '703-535-5568',
    'Community health center providing affordable primary care, dental, and behavioral health services.',
    '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"open": "closed", "close": "closed"}, "sunday": {"open": "closed", "close": "closed"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Inova Cares Clinic - Fairfax',
    '8110 Gatehouse Rd',
    'Falls Church',
    'VA',
    '22042',
    'clinic',
    2.5,
    0.5,
    22,
    'https://www.inova.org/our-services/inova-cares-clinic',
    'inovacares@inova.org',
    '703-698-2550',
    'Free clinic for uninsured adults in Fairfax County. Primary and specialty care available.',
    '{"monday": {"open": "08:30", "close": "16:30"}, "tuesday": {"open": "08:30", "close": "16:30"}, "wednesday": {"open": "08:30", "close": "16:30"}, "thursday": {"open": "08:30", "close": "16:30"}, "friday": {"open": "08:30", "close": "16:30"}, "saturday": {"open": "closed", "close": "closed"}, "sunday": {"open": "closed", "close": "closed"}}',
    NOW(),
    NOW()
  ),
  
  -- Pop-up Clinics (Temporary/Mobile)
  (
    gen_random_uuid(),
    'Mobile Health Unit - Fairfax County',
    '12000 Government Center Pkwy',
    'Fairfax',
    'VA',
    '22035',
    'pop_up_clinic',
    2.0,
    0.3,
    12,
    'https://www.fairfaxcounty.gov/health',
    'healthdept@fairfaxcounty.gov',
    '703-246-2411',
    'Mobile clinic providing free health screenings and vaccinations. Check website for schedule and locations.',
    '{"monday": {"open": "09:00", "close": "15:00"}, "tuesday": {"open": "closed", "close": "closed"}, "wednesday": {"open": "09:00", "close": "15:00"}, "thursday": {"open": "closed", "close": "closed"}, "friday": {"open": "09:00", "close": "15:00"}, "saturday": {"open": "closed", "close": "closed"}, "sunday": {"open": "closed", "close": "closed"}}',
    NOW(),
    NOW()
  ),
  
  -- Telehealth Options
  (
    gen_random_uuid(),
    'Inova Virtual Health',
    'Online',
    'Fairfax',
    'VA',
    '22030',
    'telehealth',
    1.5,
    0.1,
    5,
    'https://www.inova.org/our-services/inova-virtual-health',
    'virtualhealth@inova.org',
    '571-472-0750',
    'Virtual urgent care visits available 24/7. Video visits with board-certified providers.',
    '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}',
    NOW(),
    NOW()
  ),
  
  -- Additional Urgent Care Centers
  (
    gen_random_uuid(),
    'Velocity Urgent Care - Woodbridge',
    '14904 Jefferson Davis Hwy',
    'Woodbridge',
    'VA',
    '22191',
    'urgent_care',
    3.3,
    0.5,
    28,
    'https://www.velocityuc.com',
    'woodbridge@velocityuc.com',
    '703-492-2255',
    'Fast, friendly urgent care with online check-in available. X-ray and lab services on-site.',
    '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "09:00", "close": "19:00"}, "sunday": {"open": "09:00", "close": "19:00"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'GoHealth Urgent Care - McLean',
    '6862 Elm Street',
    'McLean',
    'VA',
    '22101',
    'urgent_care',
    3.6,
    0.4,
    24,
    'https://www.gohealthuc.com',
    'mclean@gohealthuc.com',
    '703-734-3700',
    'Modern urgent care center with virtual check-in. Partner with local health systems for continuity of care.',
    '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "20:00"}, "sunday": {"open": "08:00", "close": "20:00"}}',
    NOW(),
    NOW()
  ),
  
  -- Practitioner/Specialist
  (
    gen_random_uuid(),
    'Capital Area Pediatrics - Reston',
    '1850 Town Center Pkwy',
    'Reston',
    'VA',
    '20190',
    'practitioner',
    2.8,
    0.3,
    15,
    'https://www.capitalareaped.com',
    'reston@capitalareaped.com',
    '703-435-1300',
    'Pediatric practice offering same-day sick visits and comprehensive child healthcare.',
    '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}, "saturday": {"open": "09:00", "close": "12:00"}, "sunday": {"open": "closed", "close": "closed"}}',
    NOW(),
    NOW()
  ),
  
  -- More Emergency Rooms
  (
    gen_random_uuid(),
    'Inova Loudoun Hospital',
    '44045 Riverside Pkwy',
    'Leesburg',
    'VA',
    '20176',
    'ER',
    4.1,
    0.8,
    42,
    'https://www.inova.org/locations/inova-loudoun-hospital',
    'info.loudoun@inova.org',
    '703-858-6000',
    'State-of-the-art hospital serving Loudoun County with comprehensive emergency and specialty services.',
    '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Reston Hospital Center',
    '1850 Town Center Pkwy',
    'Reston',
    'VA',
    '20190',
    'ER',
    3.9,
    0.9,
    48,
    'https://www.restonhospital.com',
    'info@restonhospital.com',
    '703-689-9000',
    'HCA Virginia hospital providing 24/7 emergency care and comprehensive medical services.',
    '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'Sentara Northern Virginia Medical Center',
    '2300 Opitz Blvd',
    'Woodbridge',
    'VA',
    '22191',
    'ER',
    3.7,
    1.0,
    55,
    'https://www.sentara.com/northern-virginia',
    'nova@sentara.com',
    '703-523-1000',
    'Full-service medical center with Level III Trauma Center and comprehensive emergency services.',
    '{"monday": {"open": "00:00", "close": "23:59"}, "tuesday": {"open": "00:00", "close": "23:59"}, "wednesday": {"open": "00:00", "close": "23:59"}, "thursday": {"open": "00:00", "close": "23:59"}, "friday": {"open": "00:00", "close": "23:59"}, "saturday": {"open": "00:00", "close": "23:59"}, "sunday": {"open": "00:00", "close": "23:59"}}',
    NOW(),
    NOW()
  );

-- Update the location column with geographic coordinates for mapping
-- Note: These are approximate coordinates for the Northern Virginia area
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.1728, 38.8816), 4326) WHERE name = 'Inova Fairfax Hospital';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.1067, 38.8800), 4326) WHERE name = 'Virginia Hospital Center';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.1411, 38.8234), 4326) WHERE name = 'Inova Alexandria Hospital';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.0847, 38.8699), 4326) WHERE name = 'MedStar Urgent Care - Arlington';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.3827, 38.8754), 4326) WHERE name = 'Patient First - Fair Oaks';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.1527, 38.7395), 4326) WHERE name = 'CVS MinuteClinic - Alexandria';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.0919, 38.8462), 4326) WHERE name = 'Arlington Free Clinic';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.1386, 38.8304), 4326) WHERE name = 'Neighborhood Health - Alexandria';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.2273, 38.9197), 4326) WHERE name = 'Inova Cares Clinic - Fairfax';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.2706, 38.8462), 4326) WHERE name = 'Mobile Health Unit - Fairfax County';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.2706, 38.8462), 4326) WHERE name = 'Inova Virtual Health';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.2806, 38.6581), 4326) WHERE name = 'Velocity Urgent Care - Woodbridge';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.2167, 38.9386), 4326) WHERE name = 'GoHealth Urgent Care - McLean';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.3361, 38.9586), 4326) WHERE name = 'Capital Area Pediatrics - Reston';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.5636, 39.1157), 4326) WHERE name = 'Inova Loudoun Hospital';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.3361, 38.9586), 4326) WHERE name = 'Reston Hospital Center';
UPDATE hospitals SET location = ST_SetSRID(ST_MakePoint(-77.2594, 38.6304), 4326) WHERE name = 'Sentara Northern Virginia Medical Center';

-- Add a comment to indicate successful seeding
DO $$
BEGIN
  RAISE NOTICE 'Successfully seeded % hospitals in Northern Virginia area', (SELECT COUNT(*) FROM hospitals WHERE state = 'VA');
END $$;
