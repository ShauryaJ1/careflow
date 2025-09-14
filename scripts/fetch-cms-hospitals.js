#!/usr/bin/env node

/**
 * Fetch hospital data from CMS API and save as CSV
 * Usage: node scripts/fetch-cms-hospitals.js <STATE_ABBREVIATION> [OUTPUT_FILE]
 * Example: node scripts/fetch-cms-hospitals.js CA
 *          node scripts/fetch-cms-hospitals.js CA custom_output.csv
 */

const fs = require('fs');
const path = require('path');

// Use dynamic import for the TypeScript module
async function main() {
  const state = process.argv[2];
  const customOutputFile = process.argv[3];
  
  if (!state || state.length !== 2) {
    console.log('Usage: node scripts/fetch-cms-hospitals.js <STATE_ABBREVIATION> [OUTPUT_FILE]');
    console.log('Example: node scripts/fetch-cms-hospitals.js CA');
    console.log('         node scripts/fetch-cms-hospitals.js CA custom_output.csv');
    process.exit(1);
  }
  
  // Determine output file path
  const outputDir = path.join(process.cwd(), 'data', 'cms-hospitals');
  const outputFile = customOutputFile || path.join(outputDir, `hospitals_${state.toUpperCase()}.csv`);
  
  // Create output directory if it doesn't exist
  if (!customOutputFile && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Fetching hospital data for state: ${state.toUpperCase()}...`);
  
  try {
    // Import the CMS API module
    const { get_state_hospitals_with_measures } = await import('../lib/apis/cms.js');
    
    // Fetch hospital data from CMS API
    const hospitals = await get_state_hospitals_with_measures(state);
    
    console.log(`Found ${hospitals.length} hospitals with CMS data`);
    
    // CSV headers matching the hospital schema
    const CSV_HEADERS = [
      'id',
      'name',
      'address',
      'city',
      'state',
      'zip_code',
      'type_of_care',
      'wait_score', // OP_22
      'cooldown',   // OP_18b
      'op_22',      // Also storing raw OP_22
      'website',
      'email',
      'phone_number',
      'description',
      'open_time',
      'created_at',
      'updated_at',
      'start_at',
      'end_at',
      'location'
    ];
    
    // Helper functions
    function escapeCSV(value) {
      if (value === null || value === undefined) {
        return '';
      }
      
      const str = String(value);
      
      // If the value contains comma, newline, or double quote, wrap in quotes
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        // Escape double quotes by doubling them
        return `"${str.replace(/"/g, '""')}"`;
      }
      
      return str;
    }
    
    function generateUUID() {
      // Simple UUID v4 generator
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    // Create CSV output
    const csvLines = [];
    
    // Add header row
    csvLines.push(CSV_HEADERS.join(','));
    
    // Add data rows
    const now = new Date().toISOString();
    
    for (const hospital of hospitals) {
      const row = [
        generateUUID(),                           // id
        escapeCSV(hospital.facility_name || ''),  // name
        escapeCSV(hospital.address || ''),        // address
        escapeCSV(hospital.city || ''),           // city
        escapeCSV(hospital.state || ''),          // state
        escapeCSV(hospital.zip_code || ''),       // zip_code
        'ER',                                      // type_of_care (defaulting to ER for hospitals)
        hospital.OP_22 ?? '',                      // wait_score (OP_22)
        hospital.OP_18b ?? '',                     // cooldown (OP_18b)
        hospital.OP_22 ?? '',                      // op_22 (raw value)
        '',                                        // website
        '',                                        // email
        '',                                        // phone_number
        '',                                        // description
        '',                                        // open_time (JSONB)
        now,                                       // created_at
        now,                                       // updated_at
        now,                                       // start_at
        '',                                        // end_at
        ''                                         // location (geography)
      ];
      
      csvLines.push(row.join(','));
    }
    
    // Save CSV to file
    const csvContent = csvLines.join('\n');
    fs.writeFileSync(outputFile, csvContent, 'utf-8');
    
    console.log(`\n✅ Success! CSV saved to: ${outputFile}`);
    console.log(`📊 Total hospitals: ${hospitals.length}`);
    console.log(`📁 File size: ${(csvContent.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('Error:', error.message || error);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
