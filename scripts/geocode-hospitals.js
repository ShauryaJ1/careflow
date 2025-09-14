#!/usr/bin/env node

/**
 * Geocode hospitals in the database that are missing location coordinates
 * This script will:
 * 1. Fetch hospitals without coordinates from Supabase
 * 2. Geocode them using the geocoding API
 * 3. Update the database with the coordinates
 * 
 * Usage: node scripts/geocode-hospitals.js [STATE]
 * Example: node scripts/geocode-hospitals.js MD
 *          node scripts/geocode-hospitals.js  (geocodes all states)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Geocode using your existing API endpoint
async function geocodeAddress(address, city, state, zipCode) {
  try {
    const query = `${address}, ${city}, ${state} ${zipCode}`.replace(/,\s*,/g, ',').trim();
    
    // Call your existing geocode API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      console.error(`Geocoding API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.lat && data.lon) {
      return {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Alternative: Direct Nominatim geocoding (fallback)
async function geocodeWithNominatim(address, city, state, zipCode) {
  try {
    // Build query string
    let query = '';
    if (address && address.trim()) query += address + ', ';
    if (city && city.trim()) query += city + ', ';
    if (state && state.trim()) query += state + ' ';
    if (zipCode && zipCode.trim()) query += zipCode;
    
    query = query.replace(/,\s*,/g, ',').trim();
    
    if (!query) return null;
    
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.append('q', query);
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '1');
    url.searchParams.append('countrycodes', 'us');
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CareFlow Healthcare App',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Nominatim error:', error);
    return null;
  }
}

async function main() {
  const stateFilter = process.argv[2]?.toUpperCase();
  
  console.log('🏥 Hospital Geocoding Script');
  console.log('============================');
  
  if (stateFilter) {
    console.log(`Filtering for state: ${stateFilter}`);
  } else {
    console.log('Processing all states');
  }
  
  // Fetch hospitals without coordinates
  let query = supabase
    .from('hospitals')
    .select('*')
    .is('location', null)  // Only get hospitals without coordinates
    .not('type_of_care', 'eq', 'telehealth');  // Skip telehealth
  
  if (stateFilter) {
    query = query.eq('state', stateFilter);
  }
  
  const { data: hospitals, error } = await query;
  
  if (error) {
    console.error('Error fetching hospitals:', error);
    process.exit(1);
  }
  
  if (!hospitals || hospitals.length === 0) {
    console.log('✅ No hospitals need geocoding!');
    process.exit(0);
  }
  
  console.log(`\nFound ${hospitals.length} hospitals without coordinates`);
  console.log('Starting geocoding...\n');
  
  let successCount = 0;
  let failCount = 0;
  const failedHospitals = [];
  
  for (let i = 0; i < hospitals.length; i++) {
    const hospital = hospitals[i];
    
    // Skip if missing critical address info
    if (!hospital.address || !hospital.state) {
      console.log(`⚠️  [${i+1}/${hospitals.length}] Skipping ${hospital.name} - missing address info`);
      failCount++;
      failedHospitals.push({
        name: hospital.name,
        reason: 'Missing address or state',
      });
      continue;
    }
    
    // Skip "Online" addresses
    if (hospital.address === 'Online' || hospital.address.toLowerCase().includes('online')) {
      console.log(`⚠️  [${i+1}/${hospitals.length}] Skipping ${hospital.name} - online/virtual address`);
      continue;
    }
    
    console.log(`📍 [${i+1}/${hospitals.length}] Geocoding: ${hospital.name}`);
    console.log(`   Address: ${hospital.address}, ${hospital.city || '(no city)'}, ${hospital.state} ${hospital.zip_code}`);
    
    // Try geocoding with the API first, then fallback to Nominatim
    let coords = null;
    
    // Try with full address
    coords = await geocodeWithNominatim(
      hospital.address,
      hospital.city,
      hospital.state,
      hospital.zip_code
    );
    
    // If no city, try with just state and zip
    if (!coords && !hospital.city) {
      console.log('   Trying with state and ZIP only...');
      coords = await geocodeWithNominatim(
        hospital.address,
        null,
        hospital.state,
        hospital.zip_code
      );
    }
    
    if (coords) {
      // Update the hospital with coordinates
      // PostGIS format: POINT(longitude latitude)
      const point = `POINT(${coords.lng} ${coords.lat})`;
      
      const { error: updateError } = await supabase
        .from('hospitals')
        .update({ 
          location: point,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hospital.id);
      
      if (updateError) {
        console.error(`   ❌ Failed to update database: ${updateError.message}`);
        failCount++;
        failedHospitals.push({
          name: hospital.name,
          reason: 'Database update failed',
        });
      } else {
        console.log(`   ✅ Success! Coordinates: ${coords.lat}, ${coords.lng}`);
        successCount++;
      }
    } else {
      console.log(`   ❌ Could not geocode this address`);
      failCount++;
      failedHospitals.push({
        name: hospital.name,
        address: `${hospital.address}, ${hospital.city || '(no city)'}, ${hospital.state} ${hospital.zip_code}`,
        reason: 'Geocoding failed',
      });
    }
    
    // Rate limiting - wait 2 seconds between requests to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n========================================');
  console.log('GEOCODING COMPLETE');
  console.log('========================================');
  console.log(`✅ Successfully geocoded: ${successCount} hospitals`);
  console.log(`❌ Failed to geocode: ${failCount} hospitals`);
  console.log(`⏩ Skipped: ${hospitals.length - successCount - failCount} hospitals`);
  
  if (failedHospitals.length > 0) {
    console.log('\nFailed hospitals:');
    failedHospitals.forEach(h => {
      console.log(`  - ${h.name}`);
      if (h.address) console.log(`    Address: ${h.address}`);
      console.log(`    Reason: ${h.reason}`);
    });
    
    // Save failed hospitals to a file for manual review
    const fs = require('fs');
    const outputFile = `failed_geocoding_${stateFilter || 'all'}_${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(failedHospitals, null, 2));
    console.log(`\n📄 Failed hospitals saved to: ${outputFile}`);
  }
  
  console.log('\n🎉 Done!');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
