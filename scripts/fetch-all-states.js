#!/usr/bin/env node

/**
 * Batch fetch hospital data from CMS API for multiple states
 * Usage: node scripts/fetch-all-states.js [state1] [state2] ...
 * Example: node scripts/fetch-all-states.js CA NY TX
 * 
 * If no states provided, fetches all 50 states + DC
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// All US states + DC
const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL',
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME',
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH',
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Common states to fetch (can be customized)
const DEFAULT_STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

async function fetchState(state) {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(process.cwd(), 'data', 'cms-hospitals');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `hospitals_${state}.csv`);
    const logFile = fs.createWriteStream(outputFile);
    
    console.log(`Fetching ${state}...`);
    
    const child = spawn('node', [path.join(__dirname, 'fetch-cms-hospitals.js'), state]);
    
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      logFile.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    child.on('close', (code) => {
      logFile.end();
      if (code !== 0) {
        console.error(`❌ Failed to fetch ${state}: ${errorOutput}`);
        reject(new Error(`Failed to fetch ${state}`));
      } else {
        // Extract row count from stderr
        const match = errorOutput.match(/(\d+) rows written/);
        const rowCount = match ? match[1] : '?';
        console.log(`✅ ${state}: ${rowCount} hospitals → ${outputFile}`);
        resolve({ state, rowCount, file: outputFile });
      }
    });
  });
}

async function main() {
  // Get states from command line or use defaults
  let states = process.argv.slice(2);
  
  if (states.length === 0) {
    console.log('No states specified. Using default states:', DEFAULT_STATES.join(', '));
    console.log('To fetch all states, run: node scripts/fetch-all-states.js ALL');
    console.log('To fetch specific states, run: node scripts/fetch-all-states.js CA NY TX');
    states = DEFAULT_STATES;
  } else if (states.length === 1 && states[0].toUpperCase() === 'ALL') {
    console.log('Fetching all US states + DC...');
    states = ALL_STATES;
  }
  
  // Validate state codes
  states = states.map(s => s.toUpperCase());
  const invalidStates = states.filter(s => !ALL_STATES.includes(s));
  if (invalidStates.length > 0) {
    console.error('Invalid state codes:', invalidStates.join(', '));
    console.error('Valid codes are:', ALL_STATES.join(', '));
    process.exit(1);
  }
  
  console.log(`\nFetching hospital data for ${states.length} states...`);
  console.log('States:', states.join(', '));
  console.log('Output directory: data/cms-hospitals/\n');
  
  const startTime = Date.now();
  const results = [];
  
  // Process states in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < states.length; i += batchSize) {
    const batch = states.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(state => fetchState(state))
    );
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`Failed to fetch ${batch[index]}:`, result.reason);
      }
    });
    
    // Small delay between batches
    if (i + batchSize < states.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Successfully fetched: ${results.length}/${states.length} states`);
  console.log(`Time taken: ${duration} seconds`);
  console.log(`Output directory: ${path.join(process.cwd(), 'data', 'cms-hospitals')}`);
  
  if (results.length > 0) {
    const totalHospitals = results.reduce((sum, r) => sum + parseInt(r.rowCount || 0), 0);
    console.log(`Total hospitals: ${totalHospitals}`);
    
    // Create a combined CSV file
    const combinedFile = path.join(process.cwd(), 'data', 'cms-hospitals', 'combined_all_states.csv');
    console.log(`\nCombining all CSVs into: ${combinedFile}`);
    
    const writeStream = fs.createWriteStream(combinedFile);
    let headerWritten = false;
    
    for (const result of results) {
      const content = fs.readFileSync(result.file, 'utf-8');
      const lines = content.split('\n');
      
      if (!headerWritten) {
        // Write header from first file
        writeStream.write(lines[0] + '\n');
        headerWritten = true;
      }
      
      // Write data rows (skip header)
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          writeStream.write(lines[i] + '\n');
        }
      }
    }
    
    writeStream.end();
    console.log('✅ Combined CSV created successfully');
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
