-- Quick City Fix SQL
-- Source: data/cms-hospitals/hospitals_MD.csv
-- Generated: 2025-09-14T07:55:11.393Z
--
-- Review before running!

BEGIN;

-- MERITUS MEDICAL CENTER
UPDATE hospitals SET city = 'Hagerstown', updated_at = NOW() WHERE id = '10271e6a-aa59-475f-b0ff-ec8f42e8598d';

-- UNIVERSITY OF MARYLAND MEDICAL CENTER
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '6ff0d655-82f0-4921-aa06-4adaccffe740';

-- UNIVERSITY OF MD CAPITAL REGION MEDICAL CENTER
UPDATE hospitals SET city = 'Upper Marlboro', updated_at = NOW() WHERE id = 'ceef6413-4fbd-4c74-946d-7120aa8b98a8';

-- HOLY CROSS HOSPITAL
UPDATE hospitals SET city = 'Silver Spring', updated_at = NOW() WHERE id = '7c30cbc1-e49e-4d4b-b75e-c4a353a5e845';

-- FREDERICK HEALTH HOSPITAL
UPDATE hospitals SET city = 'Frederick', updated_at = NOW() WHERE id = '5e447810-05e1-4a6d-b48c-792b6d003613';

-- MERCY MEDICAL CENTER INC
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '998fd9c7-e0da-4cbe-9c30-6ccdba3c82a5';

-- JOHNS HOPKINS HOSPITAL, THE
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = 'f7878e73-cec0-4b1a-8509-def10449bacb';

-- SAINT AGNES HOSPITAL
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '36886480-370a-4855-91f2-d74ce90e1923';

-- SINAI HOSPITAL OF BALTIMORE
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '899bc2ec-d633-4fa8-9543-725beb9c9cf8';

-- MEDSTAR FRANKLIN SQUARE MEDICAL CENTER
UPDATE hospitals SET city = 'Rosedale', updated_at = NOW() WHERE id = '26464908-6481-47df-bc4e-52dbf2733e39';

-- ADVENTIST HEALTHCARE WHITE OAK MEDICAL CENTER
UPDATE hospitals SET city = 'Silver Spring', updated_at = NOW() WHERE id = 'e029c35c-4056-4576-b985-3ae765a63b47';

-- GARRETT REGIONAL MEDICAL CENTER (ZIP 21550)
UPDATE hospitals SET city = 'Oakland', updated_at = NOW() WHERE id = '9210a87f-a5d5-47e2-afe5-7d872f216b01';

-- MEDSTAR MONTGOMERY MEDICAL CENTER
UPDATE hospitals SET city = 'Olney', updated_at = NOW() WHERE id = 'dbfcf706-efae-4766-b84b-3da6fc13ba4b';

-- TIDALHEALTH PENINSULA REGIONAL, INC (ZIP 21801)
UPDATE hospitals SET city = 'Salisbury', updated_at = NOW() WHERE id = 'cb736e0f-045f-49bb-8e4f-85118847d320';

-- SUBURBAN HOSPITAL
UPDATE hospitals SET city = 'Bethesda', updated_at = NOW() WHERE id = '0326d3db-1ef3-4fe6-aa05-63be92d51011';

-- LUMINIS HEALTH ANNE ARUNDEL MEDICAL CENTER, INC
UPDATE hospitals SET city = 'Annapolis', updated_at = NOW() WHERE id = 'feecef87-2b66-4fb0-85d7-446c6bda83ba';

-- MEDSTAR UNION MEMORIAL HOSPITAL
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '00e2f77e-de90-4f0f-9b15-13acb29162e6';

-- WESTERN MARYLAND REGIONAL MEDICAL CENTER (ZIP 21502)
UPDATE hospitals SET city = 'Cumberland', updated_at = NOW() WHERE id = 'c834b74c-35ea-468f-bfdf-b0d764d22200';

-- MEDSTAR SAINT MARY'S HOSPITAL (ZIP 20650)
UPDATE hospitals SET city = 'Leonardtown', updated_at = NOW() WHERE id = '1134fa08-436b-41de-9b32-1ae2c96308ea';

-- JOHNS HOPKINS BAYVIEW MEDICAL CENTER
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = 'cc9e34a3-505b-423a-8dd0-23d558bc219a';

-- UNIVERSITY OF MD SHORE MEDICAL CTR AT CHESTERTOWN (ZIP 21620)
UPDATE hospitals SET city = 'Chestertown', updated_at = NOW() WHERE id = 'd30894ad-52f0-412e-9cde-608d57e7b730';

-- UNION HOSPITAL OF CECIL COUNTY (ZIP 21921)
UPDATE hospitals SET city = 'Elkton', updated_at = NOW() WHERE id = 'ad64a187-f5d4-43ad-92c4-877af6b8dc10';

-- CARROLL HOSPITAL CENTER
UPDATE hospitals SET city = 'Westminster', updated_at = NOW() WHERE id = '1ea0c491-2365-435b-8054-b59cdfe51f8c';

-- MEDSTAR HARBOR HOSPITAL
UPDATE hospitals SET city = 'Brooklyn', updated_at = NOW() WHERE id = 'da53fc83-bedc-4f67-ad4c-0a53635ce408';

-- UNIVERSITY OF MD CHARLES REGIONAL  MEDICAL CENTER (ZIP 20646)
UPDATE hospitals SET city = 'La Plata', updated_at = NOW() WHERE id = '696ff66d-176d-42ad-8cb3-428ad4d43111';

-- UNIVERSITY OF MD SHORE MEDICAL CENTER AT EASTON (ZIP 21601)
UPDATE hospitals SET city = 'Easton', updated_at = NOW() WHERE id = 'f1b2b86f-20d7-4b8c-810b-59f8304b6b60';

-- UNIVERSITY OF MD MEDICAL CENTER MIDTOWN CAMPUS
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '77a8ad63-e1af-4127-9da3-50c07ed92fe9';

-- CALVERTHEALTH MEDICAL CENTER (ZIP 20678)
UPDATE hospitals SET city = 'Prince Frederick', updated_at = NOW() WHERE id = 'bc8d9774-bb9e-43a7-b0d5-20265f0dddd8';

-- NORTHWEST HOSPITAL CENTER (ZIP 21133)
UPDATE hospitals SET city = 'Randallstown', updated_at = NOW() WHERE id = '8f772c7d-3e0b-4f8a-9007-1f64be521ac5';

-- UNIVERSITY OF MD BALTIMORE WASHINGTON MEDICAL CENTER
UPDATE hospitals SET city = 'Glen Burnie', updated_at = NOW() WHERE id = 'aa147a54-a660-490e-b569-a5da4d655def';

-- GREATER BALTIMORE MEDICAL CENTER
UPDATE hospitals SET city = 'Towson', updated_at = NOW() WHERE id = '0d5d7847-6380-4eb9-b777-ca383421e43a';

-- JOHNS HOPKINS HOWARD COUNTY MEDICAL CENTER
UPDATE hospitals SET city = 'Columbia', updated_at = NOW() WHERE id = 'faea5043-7843-43cf-9e08-d31e497a053a';

-- UMD UPPER CHESAPEAKE MEDICAL CENTER
UPDATE hospitals SET city = 'Bel Air', updated_at = NOW() WHERE id = '1ec8c132-1e86-4974-9c83-28e086501888';

-- LUMINIS HEALTH DOCTORS COMMUNITY MEDICAL CTR, INC
UPDATE hospitals SET city = 'Lanham', updated_at = NOW() WHERE id = 'bf486064-08ce-43f7-a55d-3cb8c23199c1';

-- MEDSTAR GOOD SAMARITAN HOSPITAL
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '9afa1c5d-d1b8-4653-8c4c-247bd42bd08f';

-- ADVENTIST HEALTHCARE SHADY GROVE MEDICAL CENTER
UPDATE hospitals SET city = 'Rockville', updated_at = NOW() WHERE id = '0df6b6a4-0d68-46fc-a581-dcc07eb108d9';

-- UMD REHABILITATION &  ORTHOPAEDIC INSTITUTE
UPDATE hospitals SET city = 'Gwynn Oak', updated_at = NOW() WHERE id = '3fb5e425-dfa5-4fda-b4a3-74dd892fa09b';

-- ADVENTIST HEALTHCARE FORT WASHINGTON MEDICAL CTR
UPDATE hospitals SET city = 'Fort Washington', updated_at = NOW() WHERE id = 'abad959a-09a6-462a-bf07-e7dfbdcd39cd';

-- ATLANTIC GENERAL HOSPITAL (ZIP 21811)
UPDATE hospitals SET city = 'Berlin', updated_at = NOW() WHERE id = 'ad6d3113-263e-4e21-b96a-6b28ed43dd64';

-- MEDSTAR SOUTHERN MARYLAND HOSPITAL CENTER
UPDATE hospitals SET city = 'Clinton', updated_at = NOW() WHERE id = '1420c7e9-d430-41f1-aad7-139ae6e10a48';

-- UNIVERSITY OF MD ST JOSEPH MEDICAL CENTER
UPDATE hospitals SET city = 'Towson', updated_at = NOW() WHERE id = '4446f118-2213-46d5-80f5-7548c85e41d9';

-- LEVINDALE HEBREW GERIATRIC CENTER AND HOSPITAL
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '44b2a530-c445-4cb5-a935-ec4c80f959f0';

-- HOLY CROSS GERMANTOWN HOSPITAL
UPDATE hospitals SET city = 'Germantown', updated_at = NOW() WHERE id = '2a22a268-5041-4294-bb47-b78c1214e8c1';

-- Walter Reed National Military Med Cen
UPDATE hospitals SET city = 'Bethesda', updated_at = NOW() WHERE id = '1638d7cf-4646-4404-bfd1-9e53265a1428';

-- MOUNT WASHINGTON PEDIATRIC HOSPITAL
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = 'd1516a9e-4d63-403a-9822-f75f526b57ba';

-- KENNEDY KRIEGER INSTITUTE
UPDATE hospitals SET city = 'Baltimore', updated_at = NOW() WHERE id = '589e55a0-9fdf-4ccb-93e4-0f4a00c21ec6';


-- Summary: All 46 hospitals fixed!

COMMIT;