#!/usr/bin/env node

/**
 * Generate SQL UPDATE statements to fix missing cities in hospital records
 * Uses free Zippopotam.us API to lookup cities from ZIP codes
 * 
 * Usage: node scripts/generate-city-fix-sql.js <CSV_FILE> [OUTPUT_SQL]
 * Example: node scripts/generate-city-fix-sql.js data/cms-hospitals/hospitals_MD.csv
 * 
 * This will create: fix_cities_MD_[timestamp].sql
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Free API to get city from ZIP code
 * No API key required, but be respectful with rate limiting
 */
async function getCityFromZipAPI(zipCode) {
  // Clean ZIP code (get first 5 digits)
  const cleanZip = zipCode.replace(/[^0-9]/g, '').substring(0, 5);
  
  if (!cleanZip || cleanZip.length !== 5) {
    return null;
  }
  
  return new Promise((resolve) => {
    const url = `https://api.zippopotam.us/us/${cleanZip}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            if (json.places && json.places[0]) {
              // Return the primary city name
              resolve(json.places[0]['place name']);
            } else {
              resolve(null);
            }
          } else {
            // ZIP not found or API error
            resolve(null);
          }
        } catch (e) {
          console.error(`Error parsing response for ZIP ${cleanZip}:`, e.message);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error(`Network error for ZIP ${cleanZip}:`, err.message);
      resolve(null);
    });
  });
}

/**
 * Alternative free API (backup)
 * Uses Open Postcode Geo API
 */
async function getCityFromZipBackup(zipCode) {
  const cleanZip = zipCode.replace(/[^0-9]/g, '').substring(0, 5);
  
  return new Promise((resolve) => {
    const url = `https://public.opendatasoft.com/api/records/1.0/search/?dataset=us-zip-code-latitude-and-longitude&q=${cleanZip}&facet=state&facet=timezone&facet=dst`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            if (json.records && json.records[0] && json.records[0].fields) {
              resolve(json.records[0].fields.city);
            } else {
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    // Parse CSV line respecting quotes
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        if (inQuotes && lines[i][j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    // Create row object
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

function escapeSQLString(str) {
  if (!str) return 'NULL';
  // Escape single quotes for SQL
  return `'${str.replace(/'/g, "''")}'`;
}

async function main() {
  const csvFile = process.argv[2];
  
  if (!csvFile) {
    console.log('Usage: node scripts/generate-city-fix-sql.js <CSV_FILE> [OUTPUT_SQL]');
    console.log('Example: node scripts/generate-city-fix-sql.js data/cms-hospitals/hospitals_MD.csv');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error(`Error: File not found: ${csvFile}`);
    process.exit(1);
  }
  
  // Determine output file
  const state = path.basename(csvFile).match(/hospitals_([A-Z]{2})/)?.[1] || 'unknown';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const outputFile = process.argv[3] || `fix_cities_${state}_${timestamp}.sql`;
  
  console.log('🔍 City Lookup & SQL Generator');
  console.log('================================');
  console.log(`Input CSV: ${csvFile}`);
  console.log(`Output SQL: ${outputFile}`);
  console.log('');
  
  // Read and parse CSV
  const content = fs.readFileSync(csvFile, 'utf-8');
  const { headers, rows } = parseCSV(content);
  
  // Check for required columns
  if (!headers.includes('id')) {
    console.error('Error: CSV must have an "id" column');
    process.exit(1);
  }
  if (!headers.includes('city')) {
    console.error('Error: CSV must have a "city" column');
    process.exit(1);
  }
  if (!headers.includes('zip_code')) {
    console.error('Error: CSV must have a "zip_code" column');
    process.exit(1);
  }
  
  console.log(`Found ${rows.length} hospitals in CSV`);
  console.log('Checking for missing cities...\n');
  
  // Find hospitals with missing cities
  const missingCities = rows.filter(row => !row.city || row.city.trim() === '');
  
  if (missingCities.length === 0) {
    console.log('✅ All hospitals have cities! No fixes needed.');
    process.exit(0);
  }
  
  console.log(`Found ${missingCities.length} hospitals with missing cities`);
  console.log('Looking up cities from ZIP codes...\n');
  
  // Process each hospital with missing city
  const sqlStatements = [];
  const summary = {
    fixed: 0,
    failed: 0,
    skipped: 0
  };
  
  // Add header to SQL file
  sqlStatements.push('-- SQL script to fix missing cities in hospital records');
  sqlStatements.push(`-- Generated from: ${csvFile}`);
  sqlStatements.push(`-- Generated on: ${new Date().toISOString()}`);
  sqlStatements.push(`-- Total hospitals with missing cities: ${missingCities.length}`);
  sqlStatements.push('');
  sqlStatements.push('BEGIN;');
  sqlStatements.push('');
  
  for (let i = 0; i < missingCities.length; i++) {
    const hospital = missingCities[i];
    const progress = `[${i + 1}/${missingCities.length}]`;
    
    if (!hospital.zip_code || hospital.zip_code.trim() === '') {
      console.log(`${progress} ⚠️  ${hospital.name} - No ZIP code, skipping`);
      sqlStatements.push(`-- Skipped: ${hospital.name} (no ZIP code)`);
      summary.skipped++;
      continue;
    }
    
    console.log(`${progress} Looking up ZIP ${hospital.zip_code} for ${hospital.name}...`);
    
    // Try primary API
    let city = await getCityFromZipAPI(hospital.zip_code);
    
    // If failed, try backup API
    if (!city) {
      console.log(`    Trying backup API...`);
      city = await getCityFromZipBackup(hospital.zip_code);
    }
    
    if (city) {
      console.log(`    ✅ Found: ${city}`);
      
      // Generate UPDATE statement
      const updateSQL = `UPDATE hospitals 
SET city = ${escapeSQLString(city)}, 
    updated_at = NOW() 
WHERE id = '${hospital.id}';`;
      
      sqlStatements.push(`-- ${hospital.name} (ZIP: ${hospital.zip_code})`);
      sqlStatements.push(updateSQL);
      sqlStatements.push('');
      
      summary.fixed++;
    } else {
      console.log(`    ❌ Could not find city for ZIP ${hospital.zip_code}`);
      sqlStatements.push(`-- FAILED: ${hospital.name} (ZIP: ${hospital.zip_code} not found)`);
      sqlStatements.push('');
      summary.failed++;
    }
    
    // Rate limiting - be respectful to free APIs (2 seconds to match our geocoding rate)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Add summary and footer
  sqlStatements.push('-- Summary:');
  sqlStatements.push(`-- Fixed: ${summary.fixed} hospitals`);
  sqlStatements.push(`-- Failed: ${summary.failed} hospitals`);
  sqlStatements.push(`-- Skipped: ${summary.skipped} hospitals`);
  sqlStatements.push('');
  sqlStatements.push('COMMIT;');
  sqlStatements.push('');
  sqlStatements.push('-- To execute this script:');
  sqlStatements.push('-- psql -U your_user -d your_database -f ' + outputFile);
  sqlStatements.push('-- Or in Supabase SQL editor, copy and paste the content above');
  
  // Write SQL file
  fs.writeFileSync(outputFile, sqlStatements.join('\n'), 'utf-8');
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successfully looked up: ${summary.fixed} cities`);
  console.log(`❌ Failed to find: ${summary.failed} cities`);
  console.log(`⏩ Skipped (no ZIP): ${summary.skipped} hospitals`);
  console.log('');
  console.log(`📄 SQL script saved to: ${outputFile}`);
  console.log('');
  console.log('To apply these fixes to your database:');
  console.log('1. Review the SQL file to ensure the cities are correct');
  console.log('2. Run in Supabase SQL editor or via psql');
  console.log(`3. Or use: npx supabase db push < ${outputFile}`);
  
  // Create a verification report
  if (summary.fixed > 0) {
    const reportFile = outputFile.replace('.sql', '_report.txt');
    const report = [];
    
    report.push('City Fix Verification Report');
    report.push('=' .repeat(50));
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Source: ${csvFile}`);
    report.push('');
    report.push('Fixed Hospitals:');
    report.push('-'.repeat(50));
    
    let fixedCount = 0;
    for (let i = 0; i < missingCities.length; i++) {
      const hospital = missingCities[i];
      if (hospital.zip_code) {
        const city = await getCityFromZipAPI(hospital.zip_code);
        if (city) {
          report.push(`${++fixedCount}. ${hospital.name}`);
          report.push(`   ID: ${hospital.id}`);
          report.push(`   ZIP: ${hospital.zip_code} → City: ${city}`);
          report.push('');
        }
      }
    }
    
    fs.writeFileSync(reportFile, report.join('\n'), 'utf-8');
    console.log(`📋 Verification report saved to: ${reportFile}`);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
