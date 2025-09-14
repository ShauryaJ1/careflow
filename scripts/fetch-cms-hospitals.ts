#!/usr/bin/env node

/**
 * Fetch hospital data from CMS API and save as CSV
 * Usage: npx tsx scripts/fetch-cms-hospitals.ts <STATE_ABBREVIATION> [OUTPUT_FILE]
 * Example: npx tsx scripts/fetch-cms-hospitals.ts CA
 *          npx tsx scripts/fetch-cms-hospitals.ts CA custom_output.csv
 */

import { get_state_hospitals_with_measures } from '../lib/apis/cms';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

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

function escapeCSV(value: any): string {
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

function generateUUID(): string {
  // Simple UUID v4 generator (not cryptographically secure, but fine for this use case)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function main() {
  // Get state abbreviation from command line
  const state = process.argv[2];
  const customOutputFile = process.argv[3];
  
  if (!state || state.length !== 2) {
    console.log('Usage: npx tsx scripts/fetch-cms-hospitals.ts <STATE_ABBREVIATION> [OUTPUT_FILE]');
    console.log('Example: npx tsx scripts/fetch-cms-hospitals.ts CA');
    console.log('         npx tsx scripts/fetch-cms-hospitals.ts CA custom_output.csv');
    process.exit(1);
  }
  
  // Determine output file path
  const outputDir = join(process.cwd(), 'data', 'cms-hospitals');
  const outputFile = customOutputFile || join(outputDir, `hospitals_${state.toUpperCase()}.csv`);
  
  // Create output directory if it doesn't exist
  if (!customOutputFile && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Fetching hospital data for state: ${state.toUpperCase()}...`);
  
  try {
    // Fetch hospital data from CMS API
    const hospitals = await get_state_hospitals_with_measures(state);
    
    console.error(`Found ${hospitals.length} hospitals with CMS data`);
    
    // Create CSV output
    const csvLines: string[] = [];
    
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
    writeFileSync(outputFile, csvContent, 'utf-8');
    
    console.log(`\n✅ Success! CSV saved to: ${outputFile}`);
    console.log(`📊 Total hospitals: ${hospitals.length}`);
    console.log(`📁 File size: ${(csvContent.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('Error fetching hospital data:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
