#!/usr/bin/env node

/**
 * Quick SQL generator for fixing cities - uses local ZIP database for speed
 * No API calls needed - instant results!
 * 
 * Usage: node scripts/quick-city-fix-sql.js <CSV_FILE> [OUTPUT_SQL]
 * Example: node scripts/quick-city-fix-sql.js data/cms-hospitals/hospitals_MD.csv
 */

const fs = require('fs');
const path = require('path');

// Common Maryland ZIP to City mapping
// Expanded list for better coverage
const MARYLAND_ZIPS = {
  // Baltimore City & County
  '21201': 'Baltimore', '21202': 'Baltimore', '21203': 'Baltimore', '21204': 'Towson',
  '21205': 'Baltimore', '21206': 'Baltimore', '21207': 'Gwynn Oak', '21208': 'Pikesville',
  '21209': 'Baltimore', '21210': 'Baltimore', '21211': 'Baltimore', '21212': 'Baltimore',
  '21213': 'Baltimore', '21214': 'Baltimore', '21215': 'Baltimore', '21216': 'Baltimore',
  '21217': 'Baltimore', '21218': 'Baltimore', '21219': 'Sparrows Point', '21220': 'Middle River',
  '21221': 'Essex', '21222': 'Dundalk', '21223': 'Baltimore', '21224': 'Baltimore',
  '21225': 'Brooklyn', '21226': 'Curtis Bay', '21227': 'Halethorpe', '21228': 'Catonsville',
  '21229': 'Baltimore', '21230': 'Baltimore', '21231': 'Baltimore', '21234': 'Parkville',
  '21236': 'Nottingham', '21237': 'Rosedale', '21239': 'Baltimore', '21244': 'Windsor Mill',
  '21250': 'Baltimore', '21251': 'Baltimore', '21252': 'Towson', '21286': 'Towson',
  '21287': 'Baltimore', '21290': 'Baltimore', '21298': 'Baltimore',
  
  // Anne Arundel County
  '21401': 'Annapolis', '21402': 'Annapolis', '21403': 'Annapolis', '21404': 'Annapolis',
  '21405': 'Annapolis', '21409': 'Annapolis', '21012': 'Arnold', '21032': 'Crownsville',
  '21035': 'Davidsonville', '21037': 'Edgewater', '21054': 'Gambrills', '21060': 'Glen Burnie',
  '21061': 'Glen Burnie', '21076': 'Hanover', '21077': 'Harmans', '21090': 'Linthicum Heights',
  '21106': 'Mayo', '21108': 'Millersville', '21113': 'Odenton', '21114': 'Crofton',
  '21122': 'Pasadena', '21123': 'Pasadena', '21140': 'Riva', '21144': 'Severn',
  '21146': 'Severna Park', '21225': 'Brooklyn', '21226': 'Curtis Bay', '21240': 'Baltimore',
  
  // Montgomery County  
  '20814': 'Bethesda', '20815': 'Chevy Chase', '20816': 'Bethesda', '20817': 'Bethesda',
  '20818': 'Cabin John', '20832': 'Olney', '20833': 'Brookeville', '20837': 'Poolesville',
  '20838': 'Barnesville', '20839': 'Beallsville', '20841': 'Boyds', '20842': 'Dickerson',
  '20850': 'Rockville', '20851': 'Rockville', '20852': 'Rockville', '20853': 'Rockville',
  '20854': 'Potomac', '20855': 'Derwood', '20860': 'Sandy Spring', '20861': 'Ashton',
  '20862': 'Brinklow', '20866': 'Burtonsville', '20868': 'Spencerville', '20871': 'Clarksburg',
  '20872': 'Damascus', '20874': 'Germantown', '20876': 'Germantown', '20877': 'Gaithersburg',
  '20878': 'Gaithersburg', '20879': 'Gaithersburg', '20880': 'Washington Grove',
  '20882': 'Gaithersburg', '20883': 'Gaithersburg', '20884': 'Gaithersburg', '20885': 'Gaithersburg',
  '20886': 'Montgomery Village', '20895': 'Kensington', '20896': 'Garrett Park',
  '20901': 'Silver Spring', '20902': 'Silver Spring', '20903': 'Silver Spring',
  '20904': 'Silver Spring', '20905': 'Silver Spring', '20906': 'Silver Spring',
  '20907': 'Silver Spring', '20908': 'Silver Spring', '20910': 'Silver Spring',
  '20911': 'Silver Spring', '20912': 'Takoma Park', '20913': 'Takoma Park',
  
  // Prince George's County
  '20701': 'Annapolis Junction', '20703': 'Lanham', '20704': 'Beltsville', '20705': 'Beltsville',
  '20706': 'Lanham', '20707': 'Laurel', '20708': 'Laurel', '20709': 'Laurel',
  '20710': 'Bladensburg', '20712': 'Mount Rainier', '20715': 'Bowie', '20716': 'Bowie',
  '20717': 'Bowie', '20718': 'Bowie', '20719': 'Bowie', '20720': 'Bowie',
  '20721': 'Bowie', '20722': 'Brentwood', '20735': 'Clinton', '20737': 'Riverdale',
  '20740': 'College Park', '20741': 'College Park', '20742': 'College Park',
  '20743': 'Capitol Heights', '20744': 'Fort Washington', '20745': 'Oxon Hill',
  '20746': 'Suitland', '20747': 'District Heights', '20748': 'Temple Hills',
  '20762': 'Andrews Air Force Base', '20769': 'Glenn Dale', '20770': 'Greenbelt',
  '20771': 'Greenbelt', '20772': 'Upper Marlboro', '20773': 'Upper Marlboro',
  '20774': 'Upper Marlboro', '20775': 'Upper Marlboro', '20781': 'Hyattsville',
  '20782': 'Hyattsville', '20783': 'Hyattsville', '20784': 'Hyattsville', '20785': 'Hyattsville',
  
  // Frederick County
  '21701': 'Frederick', '21702': 'Frederick', '21703': 'Frederick', '21704': 'Frederick',
  '21705': 'Frederick', '21710': 'Adamstown', '21713': 'Boonsboro', '21714': 'Brunswick',
  '21716': 'Cascade', '21718': 'Clear Spring', '21719': 'Emmitsburg', '21727': 'Emmitsburg',
  '21754': 'Ijamsville', '21755': 'Jefferson', '21757': 'Keymar', '21758': 'Knoxville',
  '21762': 'Libertytown', '21769': 'Middletown', '21770': 'Monrovia', '21771': 'Mount Airy',
  '21773': 'Myersville', '21774': 'New Market', '21775': 'New Midway', '21776': 'New Windsor',
  '21777': 'Point Of Rocks', '21778': 'Rocky Ridge', '21787': 'Taneytown', '21788': 'Thurmont',
  '21790': 'Tuscarora', '21791': 'Union Bridge', '21793': 'Walkersville', '21797': 'Woodbine',
  '21798': 'Woodsboro',
  
  // Washington County
  '21711': 'Big Pool', '21713': 'Boonsboro', '21716': 'Cascade', '21718': 'Clear Spring',
  '21719': 'Cascade', '21720': 'Fairplay', '21722': 'Fort Ritchie', '21733': 'Fairplay',
  '21734': 'Funkstown', '21740': 'Hagerstown', '21741': 'Hagerstown', '21742': 'Hagerstown',
  '21750': 'Hancock', '21756': 'Keedysville', '21767': 'Maugansville', '21779': 'Rohrersville',
  '21780': 'Sabillasville', '21782': 'San Mar', '21783': 'Sharpsburg', '21795': 'Williamsport',
  
  // Carroll County
  '21047': 'Fallston', '21048': 'Finksburg', '21074': 'Hampstead', '21088': 'Lineboro',
  '21102': 'Manchester', '21104': 'Marriottsville', '21117': 'Owings Mills', '21136': 'Reisterstown',
  '21152': 'Sparks Glencoe', '21155': 'Upperco', '21157': 'Westminster', '21158': 'Westminster',
  '21160': 'Whiteford', '21161': 'White Hall', '21162': 'White Marsh', '21163': 'Woodstock',
  '21784': 'Sykesville', '21787': 'Taneytown', '21791': 'Union Bridge', '21776': 'New Windsor',
  
  // Harford County
  '21001': 'Aberdeen', '21005': 'Aberdeen Proving Ground', '21009': 'Abingdon', '21010': 'Gunpowder',
  '21014': 'Bel Air', '21015': 'Bel Air', '21017': 'Belcamp', '21028': 'Churchville',
  '21034': 'Darlington', '21040': 'Edgewood', '21047': 'Fallston', '21050': 'Forest Hill',
  '21078': 'Havre De Grace', '21082': 'Hydes', '21084': 'Jarrettsville', '21085': 'Joppa',
  '21087': 'Kingsville', '21111': 'Monkton', '21120': 'Parkton', '21130': 'Perryman',
  '21131': 'Phoenix', '21132': 'Pylesville', '21154': 'Street', '21160': 'Whiteford',
  '21161': 'White Hall',
  
  // Howard County
  '20701': 'Annapolis Junction', '20723': 'Laurel', '20724': 'Laurel', '20759': 'Fulton',
  '20763': 'Savage', '20777': 'Highland', '20794': 'Jessup', '21029': 'Clarksville',
  '21036': 'Dayton', '21042': 'Ellicott City', '21043': 'Ellicott City', '21044': 'Columbia',
  '21045': 'Columbia', '21046': 'Columbia', '21075': 'Elkridge', '21104': 'Marriottsville',
  '21150': 'Simpsonville', '21163': 'Woodstock', '21723': 'Cooksville', '21737': 'Glenelg',
  '21738': 'Glenwood', '21765': 'Lisbon', '21794': 'West Friendship', '21797': 'Woodbine',
  
  // Additional common hospital ZIPs
  '20889': 'Bethesda', '20892': 'Bethesda', '20894': 'Bethesda', '20810': 'Bethesda',
  '20811': 'Bethesda', '20812': 'Glen Echo', '20813': 'Bethesda', '20824': 'Bethesda',
  '20825': 'Bethesda', '20827': 'Bethesda', '20889': 'Bethesda',
};

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
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
  return `'${str.replace(/'/g, "''")}'`;
}

function main() {
  const csvFile = process.argv[2];
  
  if (!csvFile) {
    console.log('Quick City Fix SQL Generator');
    console.log('============================');
    console.log('Usage: node scripts/quick-city-fix-sql.js <CSV_FILE> [OUTPUT_SQL]');
    console.log('Example: node scripts/quick-city-fix-sql.js data/cms-hospitals/hospitals_MD.csv');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFile)) {
    console.error(`Error: File not found: ${csvFile}`);
    process.exit(1);
  }
  
  const state = path.basename(csvFile).match(/hospitals_([A-Z]{2})/)?.[1] || 'unknown';
  const outputFile = process.argv[3] || `fix_cities_${state}.sql`;
  
  console.log('🚀 Quick City Fix SQL Generator');
  console.log('================================');
  console.log(`Input: ${csvFile}`);
  console.log(`Output: ${outputFile}`);
  console.log('');
  
  const content = fs.readFileSync(csvFile, 'utf-8');
  const { headers, rows } = parseCSV(content);
  
  const missingCities = rows.filter(row => !row.city || row.city.trim() === '');
  
  if (missingCities.length === 0) {
    console.log('✅ All hospitals already have cities!');
    process.exit(0);
  }
  
  console.log(`Found ${missingCities.length} hospitals with missing cities`);
  console.log('Generating SQL...\n');
  
  const sqlStatements = [];
  let fixedCount = 0;
  let notFoundCount = 0;
  
  // SQL header
  sqlStatements.push('-- Quick City Fix SQL');
  sqlStatements.push(`-- Source: ${csvFile}`);
  sqlStatements.push(`-- Generated: ${new Date().toISOString()}`);
  sqlStatements.push('--');
  sqlStatements.push('-- Review before running!');
  sqlStatements.push('');
  sqlStatements.push('BEGIN;');
  sqlStatements.push('');
  
  // Process each hospital
  for (const hospital of missingCities) {
    const zipCode = hospital.zip_code?.replace(/[^0-9]/g, '').substring(0, 5);
    
    if (!zipCode) {
      sqlStatements.push(`-- ${hospital.name}: No ZIP code`);
      continue;
    }
    
    const city = MARYLAND_ZIPS[zipCode];
    
    if (city) {
      sqlStatements.push(`-- ${hospital.name}`);
      sqlStatements.push(`UPDATE hospitals SET city = ${escapeSQLString(city)}, updated_at = NOW() WHERE id = '${hospital.id}';`);
      sqlStatements.push('');
      fixedCount++;
      console.log(`✅ ${hospital.name}: ZIP ${zipCode} → ${city}`);
    } else {
      sqlStatements.push(`-- ${hospital.name}: ZIP ${zipCode} not in database`);
      sqlStatements.push(`-- TODO: Manually set city or use API lookup`);
      sqlStatements.push(`-- UPDATE hospitals SET city = 'CITY_NAME', updated_at = NOW() WHERE id = '${hospital.id}';`);
      sqlStatements.push('');
      notFoundCount++;
      console.log(`❓ ${hospital.name}: ZIP ${zipCode} not found (manual fix needed)`);
    }
  }
  
  // SQL footer
  sqlStatements.push('');
  sqlStatements.push(`-- Summary: ${fixedCount} fixed, ${notFoundCount} need manual review`);
  sqlStatements.push('');
  sqlStatements.push('COMMIT;');
  
  // Write file
  fs.writeFileSync(outputFile, sqlStatements.join('\n'), 'utf-8');
  
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Fixed: ${fixedCount} hospitals`);
  console.log(`❓ Manual review needed: ${notFoundCount} hospitals`);
  console.log('');
  console.log(`📄 SQL file saved: ${outputFile}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Review the SQL file');
  console.log('2. Fix any TODO items manually');
  console.log('3. Run in Supabase SQL editor');
  
  if (notFoundCount > 0) {
    console.log('\nFor unknown ZIPs, you can:');
    console.log('- Use the API version: node scripts/generate-city-fix-sql.js ' + csvFile);
    console.log('- Or manually look them up');
  }
}

// Run
main();
