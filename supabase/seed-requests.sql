-- Sample request data for testing the heatmap visualization
-- This creates some sample patient requests across Maryland

-- Insert sample requests (assuming the requests table exists)
INSERT INTO requests (user_id, latitude, longitude, address, state, city, zip_code, reason, type_of_care, created_at)
VALUES
  -- Baltimore area requests
  (null, 39.2904, -76.6122, '100 N Charles St', 'MD', 'Baltimore', '21201', 'Chest pain', 'ER', NOW() - INTERVAL '1 day'),
  (null, 39.2904, -76.6122, '200 E Pratt St', 'MD', 'Baltimore', '21202', 'High fever', 'urgent_care', NOW() - INTERVAL '2 days'),
  (null, 39.3293, -76.6205, '3333 N Calvert St', 'MD', 'Baltimore', '21218', 'Severe headache', 'ER', NOW() - INTERVAL '3 days'),
  (null, 39.2544, -76.7105, '5601 Loch Raven Blvd', 'MD', 'Baltimore', '21239', 'Broken arm', 'ER', NOW() - INTERVAL '4 days'),
  (null, 39.3142, -76.6347, '1800 Orleans St', 'MD', 'Baltimore', '21287', 'COVID symptoms', 'urgent_care', NOW() - INTERVAL '5 days'),
  
  -- Silver Spring area requests
  (null, 38.9907, -77.0261, '8656 Colesville Rd', 'MD', 'Silver Spring', '20910', 'Asthma attack', 'urgent_care', NOW() - INTERVAL '1 day'),
  (null, 39.0024, -77.0163, '8757 Georgia Ave', 'MD', 'Silver Spring', '20910', 'Allergic reaction', 'urgent_care', NOW() - INTERVAL '2 days'),
  (null, 38.9959, -77.0277, '1101 Spring St', 'MD', 'Silver Spring', '20910', 'Mental health', 'telehealth', NOW() - INTERVAL '3 days'),
  
  -- Bethesda area requests
  (null, 38.9847, -77.0947, '7500 Old Georgetown Rd', 'MD', 'Bethesda', '20814', 'Chest pain', 'ER', NOW() - INTERVAL '1 day'),
  (null, 38.9806, -77.1003, '4831 Bethesda Ave', 'MD', 'Bethesda', '20814', 'Minor cuts', 'clinic', NOW() - INTERVAL '2 days'),
  (null, 38.9862, -77.0989, '7301 Woodmont Ave', 'MD', 'Bethesda', '20814', 'Flu symptoms', 'urgent_care', NOW() - INTERVAL '3 days'),
  
  -- Rockville area requests
  (null, 39.0840, -77.1528, '255 Rockville Pike', 'MD', 'Rockville', '20850', 'Back pain', 'clinic', NOW() - INTERVAL '1 day'),
  (null, 39.0817, -77.1527, '11 N Washington St', 'MD', 'Rockville', '20850', 'Pregnancy checkup', 'practitioner', NOW() - INTERVAL '2 days'),
  
  -- Frederick area requests
  (null, 39.4143, -77.4105, '400 W 7th St', 'MD', 'Frederick', '21701', 'Sports injury', 'urgent_care', NOW() - INTERVAL '1 day'),
  (null, 39.4143, -77.4204, '141 Thomas Johnson Dr', 'MD', 'Frederick', '21702', 'Vaccination', 'pop_up_clinic', NOW() - INTERVAL '2 days'),
  
  -- Annapolis area requests
  (null, 38.9784, -76.4922, '123 Main St', 'MD', 'Annapolis', '21401', 'Routine checkup', 'clinic', NOW() - INTERVAL '1 day'),
  (null, 38.9729, -76.5018, '2001 Medical Pkwy', 'MD', 'Annapolis', '21401', 'Emergency', 'ER', NOW() - INTERVAL '2 days'),
  
  -- Columbia area requests
  (null, 39.2037, -76.8610, '10710 Little Patuxent Pkwy', 'MD', 'Columbia', '21044', 'Pediatric care', 'clinic', NOW() - INTERVAL '1 day'),
  (null, 39.2156, -76.8599, '5450 Knoll North Dr', 'MD', 'Columbia', '21045', 'Mental health counseling', 'telehealth', NOW() - INTERVAL '2 days'),
  
  -- Hagerstown area requests
  (null, 39.6418, -77.7200, '11116 Medical Campus Rd', 'MD', 'Hagerstown', '21742', 'Severe pain', 'ER', NOW() - INTERVAL '1 day'),
  (null, 39.6418, -77.7200, '12916 Conamar Dr', 'MD', 'Hagerstown', '21742', 'Urgent care needed', 'urgent_care', NOW() - INTERVAL '2 days'),
  
  -- Eastern Shore (Salisbury) requests
  (null, 38.3607, -75.5994, '100 E Carroll St', 'MD', 'Salisbury', '21801', 'Emergency care', 'ER', NOW() - INTERVAL '1 day'),
  (null, 38.3665, -75.5868, '106 Milford St', 'MD', 'Salisbury', '21804', 'Walk-in clinic', 'clinic', NOW() - INTERVAL '2 days');

-- Update the location geography column for all inserted records
UPDATE requests 
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Refresh the materialized view to include new data
REFRESH MATERIALIZED VIEW request_heatmap;
