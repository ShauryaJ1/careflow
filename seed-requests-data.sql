-- =====================================================
-- SEED DATA FOR REQUESTS TABLE
-- Run this after applying the migration
-- Creates realistic patient request data across Maryland
-- =====================================================

-- Clear existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM requests WHERE reason LIKE 'Test:%';

-- Helper function to create random timestamps within last 30 days
CREATE OR REPLACE FUNCTION random_timestamp_last_n_days(n INTEGER)
RETURNS TIMESTAMP AS $$
BEGIN
    RETURN NOW() - (random() * n || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Insert sample requests across Maryland
-- These represent realistic patient care requests with varied reasons and locations
INSERT INTO requests (user_id, latitude, longitude, address, state, city, zip_code, reason, type_of_care, created_at)
VALUES
  -- Baltimore City (High density urban area)
  (null, 39.2904, -76.6122, '100 N Charles St', 'MD', 'Baltimore', '21201', 'Severe chest pain and shortness of breath', 'ER', random_timestamp_last_n_days(7)),
  (null, 39.2850, -76.6200, '200 E Pratt St', 'MD', 'Baltimore', '21202', 'High fever (103°F) for 3 days', 'urgent_care', random_timestamp_last_n_days(5)),
  (null, 39.3293, -76.6205, '3333 N Calvert St', 'MD', 'Baltimore', '21218', 'Severe migraine with vision changes', 'ER', random_timestamp_last_n_days(3)),
  (null, 39.2544, -76.7105, '5601 Loch Raven Blvd', 'MD', 'Baltimore', '21239', 'Possible broken arm from fall', 'ER', random_timestamp_last_n_days(2)),
  (null, 39.3142, -76.6347, '1800 Orleans St', 'MD', 'Baltimore', '21287', 'COVID-19 symptoms - need testing', 'urgent_care', random_timestamp_last_n_days(4)),
  (null, 39.2771, -76.5932, '1000 Hillen St', 'MD', 'Baltimore', '21202', 'Severe abdominal pain', 'ER', random_timestamp_last_n_days(1)),
  (null, 39.3002, -76.6097, '100 Hopkins Pl', 'MD', 'Baltimore', '21201', 'Anxiety and panic attacks', 'telehealth', random_timestamp_last_n_days(6)),
  (null, 39.2964, -76.6230, '501 W Fayette St', 'MD', 'Baltimore', '21201', 'Prescription refill needed', 'telehealth', random_timestamp_last_n_days(8)),
  (null, 39.3120, -76.6178, '2401 W Belvedere Ave', 'MD', 'Baltimore', '21215', 'Deep cut requiring stitches', 'urgent_care', random_timestamp_last_n_days(3)),
  (null, 39.2833, -76.6021, '900 Caton Ave', 'MD', 'Baltimore', '21229', 'Pediatric ear infection', 'clinic', random_timestamp_last_n_days(7)),
  
  -- Montgomery County (Suburban with high demand)
  (null, 38.9907, -77.0261, '8656 Colesville Rd', 'MD', 'Silver Spring', '20910', 'Severe asthma attack', 'urgent_care', random_timestamp_last_n_days(2)),
  (null, 39.0024, -77.0163, '8757 Georgia Ave', 'MD', 'Silver Spring', '20910', 'Allergic reaction to food', 'urgent_care', random_timestamp_last_n_days(4)),
  (null, 38.9959, -77.0277, '1101 Spring St', 'MD', 'Silver Spring', '20910', 'Depression and mental health counseling', 'telehealth', random_timestamp_last_n_days(10)),
  (null, 39.0840, -77.1528, '255 Rockville Pike', 'MD', 'Rockville', '20850', 'Chronic back pain flare-up', 'clinic', random_timestamp_last_n_days(5)),
  (null, 39.0817, -77.1527, '11 N Washington St', 'MD', 'Rockville', '20850', 'Prenatal checkup needed', 'practitioner', random_timestamp_last_n_days(7)),
  (null, 38.9847, -77.0947, '7500 Old Georgetown Rd', 'MD', 'Bethesda', '20814', 'Chest pain with arm numbness', 'ER', random_timestamp_last_n_days(1)),
  (null, 38.9806, -77.1003, '4831 Bethesda Ave', 'MD', 'Bethesda', '20814', 'Minor burns from cooking accident', 'urgent_care', random_timestamp_last_n_days(3)),
  (null, 38.9862, -77.0989, '7301 Woodmont Ave', 'MD', 'Bethesda', '20814', 'Flu symptoms and body aches', 'urgent_care', random_timestamp_last_n_days(6)),
  (null, 39.0790, -77.1365, '51 Monroe St', 'MD', 'Rockville', '20850', 'Diabetes management consultation', 'telehealth', random_timestamp_last_n_days(12)),
  (null, 39.1180, -77.1658, '18330 Montgomery Village Ave', 'MD', 'Gaithersburg', '20879', 'Child vaccination needed', 'pop_up_clinic', random_timestamp_last_n_days(9)),
  
  -- Prince George's County
  (null, 38.8157, -76.9345, '3311 Toledo Terrace', 'MD', 'Hyattsville', '20782', 'Severe tooth pain', 'urgent_care', random_timestamp_last_n_days(2)),
  (null, 38.9885, -76.9374, '9800 Rhode Island Ave', 'MD', 'College Park', '20740', 'Sports injury - knee pain', 'clinic', random_timestamp_last_n_days(4)),
  (null, 38.7849, -76.8721, '901 Harry S Truman Dr', 'MD', 'Upper Marlboro', '20774', 'Breathing difficulties', 'ER', random_timestamp_last_n_days(1)),
  (null, 38.8267, -76.9817, '3001 Hospital Dr', 'MD', 'Cheverly', '20785', 'Pregnancy complications', 'ER', random_timestamp_last_n_days(3)),
  (null, 38.9337, -76.8351, '8118 Good Luck Rd', 'MD', 'Lanham', '20706', 'Mental health crisis', 'urgent_care', random_timestamp_last_n_days(5)),
  
  -- Anne Arundel County
  (null, 38.9784, -76.4922, '123 Main St', 'MD', 'Annapolis', '21401', 'Annual physical needed', 'clinic', random_timestamp_last_n_days(15)),
  (null, 38.9729, -76.5018, '2001 Medical Pkwy', 'MD', 'Annapolis', '21401', 'Severe allergic reaction', 'ER', random_timestamp_last_n_days(2)),
  (null, 39.0628, -76.5494, '7901 Corporate Dr', 'MD', 'Glen Burnie', '21061', 'Work injury - back strain', 'urgent_care', random_timestamp_last_n_days(7)),
  (null, 39.1583, -76.6997, '8265 Veterans Hwy', 'MD', 'Millersville', '21108', 'Child with high fever', 'urgent_care', random_timestamp_last_n_days(4)),
  
  -- Howard County
  (null, 39.2037, -76.8610, '10710 Little Patuxent Pkwy', 'MD', 'Columbia', '21044', 'Pediatric wellness visit', 'clinic', random_timestamp_last_n_days(10)),
  (null, 39.2156, -76.8599, '5450 Knoll North Dr', 'MD', 'Columbia', '21045', 'Therapy session needed', 'telehealth', random_timestamp_last_n_days(8)),
  (null, 39.2673, -76.7983, '8850 Stanford Blvd', 'MD', 'Columbia', '21045', 'Sudden vision problems', 'urgent_care', random_timestamp_last_n_days(3)),
  (null, 39.2517, -76.9275, '8960 State Route 108', 'MD', 'Ellicott City', '21043', 'Chest congestion and cough', 'clinic', random_timestamp_last_n_days(6)),
  
  -- Frederick County (Mix of urban and rural)
  (null, 39.4143, -77.4105, '400 W 7th St', 'MD', 'Frederick', '21701', 'Sports injury - ankle sprain', 'urgent_care', random_timestamp_last_n_days(5)),
  (null, 39.4143, -77.4204, '141 Thomas Johnson Dr', 'MD', 'Frederick', '21702', 'COVID-19 booster needed', 'pop_up_clinic', random_timestamp_last_n_days(12)),
  (null, 39.4426, -77.3939, '1 Frederick Health Way', 'MD', 'Frederick', '21701', 'Severe headache and dizziness', 'ER', random_timestamp_last_n_days(1)),
  (null, 39.4676, -77.4011, '1450 Clover Rd', 'MD', 'Frederick', '21701', 'Diabetes check-up', 'practitioner', random_timestamp_last_n_days(20)),
  
  -- Washington County (Rural area)
  (null, 39.6418, -77.7200, '11116 Medical Campus Rd', 'MD', 'Hagerstown', '21742', 'Severe abdominal pain', 'ER', random_timestamp_last_n_days(3)),
  (null, 39.6418, -77.7200, '12916 Conamar Dr', 'MD', 'Hagerstown', '21742', 'Urgent care for infection', 'urgent_care', random_timestamp_last_n_days(7)),
  (null, 39.6088, -77.7314, '1741 Underpass Way', 'MD', 'Hagerstown', '21740', 'Mental health consultation', 'telehealth', random_timestamp_last_n_days(14)),
  
  -- Eastern Shore (Rural/underserved areas)
  (null, 38.3607, -75.5994, '100 E Carroll St', 'MD', 'Salisbury', '21801', 'Emergency cardiac symptoms', 'ER', random_timestamp_last_n_days(2)),
  (null, 38.3665, -75.5868, '106 Milford St', 'MD', 'Salisbury', '21804', 'Walk-in clinic for flu', 'clinic', random_timestamp_last_n_days(8)),
  (null, 38.5693, -75.6963, '219 S Washington St', 'MD', 'Easton', '21601', 'Chronic pain management', 'practitioner', random_timestamp_last_n_days(10)),
  (null, 38.3364, -75.0849, '9801 Golf Course Rd', 'MD', 'Berlin', '21811', 'Urgent care needed', 'urgent_care', random_timestamp_last_n_days(5)),
  
  -- Carroll County
  (null, 39.5751, -77.0037, '200 Memorial Ave', 'MD', 'Westminster', '21157', 'Child immunizations', 'pop_up_clinic', random_timestamp_last_n_days(15)),
  (null, 39.5361, -76.9794, '292 Stoner Ave', 'MD', 'Westminster', '21157', 'Elderly care consultation', 'telehealth', random_timestamp_last_n_days(18)),
  
  -- Harford County
  (null, 39.5396, -76.3483, '520 Upper Chesapeake Dr', 'MD', 'Bel Air', '21014', 'Maternity care needed', 'practitioner', random_timestamp_last_n_days(12)),
  (null, 39.4701, -76.1663, '501 S Union Ave', 'MD', 'Havre de Grace', '21078', 'Mental health support', 'telehealth', random_timestamp_last_n_days(20)),
  
  -- Cecil County (Rural northern area)
  (null, 39.6556, -75.9497, '106 Bow St', 'MD', 'Elkton', '21921', 'Farm accident injury', 'ER', random_timestamp_last_n_days(4)),
  
  -- Additional clusters to show demand patterns
  -- Downtown Baltimore cluster (showing high urban demand)
  (null, 39.2893, -76.6121, '10 Light St', 'MD', 'Baltimore', '21202', 'Workplace injury', 'urgent_care', random_timestamp_last_n_days(11)),
  (null, 39.2901, -76.6135, '250 W Pratt St', 'MD', 'Baltimore', '21201', 'Severe cough and fever', 'urgent_care', random_timestamp_last_n_days(9)),
  (null, 39.2888, -76.6110, '400 E Pratt St', 'MD', 'Baltimore', '21202', 'Emergency dental pain', 'urgent_care', random_timestamp_last_n_days(13)),
  
  -- Rural Western Maryland (showing underserved area needs)
  (null, 39.7087, -78.7625, '12502 Willowbrook Rd', 'MD', 'Cumberland', '21502', 'Rural health clinic needed', 'pop_up_clinic', random_timestamp_last_n_days(25)),
  (null, 39.4126, -79.3731, '219 S 2nd St', 'MD', 'Oakland', '21550', 'Telehealth for chronic condition', 'telehealth', random_timestamp_last_n_days(22));

-- Update the location geography column for all inserted records
UPDATE requests 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Refresh the materialized view to include new data
REFRESH MATERIALIZED VIEW request_heatmap;

-- Show statistics about the seeded data
DO $$
DECLARE
    total_requests INTEGER;
    er_count INTEGER;
    urgent_count INTEGER;
    telehealth_count INTEGER;
    clinic_count INTEGER;
    popup_count INTEGER;
    practitioner_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_requests FROM requests;
    SELECT COUNT(*) INTO er_count FROM requests WHERE type_of_care = 'ER';
    SELECT COUNT(*) INTO urgent_count FROM requests WHERE type_of_care = 'urgent_care';
    SELECT COUNT(*) INTO telehealth_count FROM requests WHERE type_of_care = 'telehealth';
    SELECT COUNT(*) INTO clinic_count FROM requests WHERE type_of_care = 'clinic';
    SELECT COUNT(*) INTO popup_count FROM requests WHERE type_of_care = 'pop_up_clinic';
    SELECT COUNT(*) INTO practitioner_count FROM requests WHERE type_of_care = 'practitioner';
    
    RAISE NOTICE '===================================';
    RAISE NOTICE 'SEED DATA SUMMARY';
    RAISE NOTICE '===================================';
    RAISE NOTICE 'Total requests created: %', total_requests;
    RAISE NOTICE 'By type of care:';
    RAISE NOTICE '  - Emergency Room: %', er_count;
    RAISE NOTICE '  - Urgent Care: %', urgent_count;
    RAISE NOTICE '  - Telehealth: %', telehealth_count;
    RAISE NOTICE '  - Clinic: %', clinic_count;
    RAISE NOTICE '  - Pop-up Clinic: %', popup_count;
    RAISE NOTICE '  - Practitioner: %', practitioner_count;
    RAISE NOTICE '===================================';
    RAISE NOTICE 'Heatmap view refreshed successfully!';
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS random_timestamp_last_n_days(INTEGER);
