#!/usr/bin/env node

/**
 * Fix missing city names in hospital CSV files by looking up from ZIP codes
 * Usage: node scripts/fix-missing-cities.js <INPUT_CSV> [OUTPUT_CSV]
 * Example: node scripts/fix-missing-cities.js data/cms-hospitals/hospitals_MD.csv
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ZIP code to city mapping for common Maryland ZIP codes
// You can expand this or use an API for comprehensive coverage
const ZIP_TO_CITY = {
  // Baltimore area
  '21239': 'Baltimore',
  '21201': 'Baltimore',
  '21202': 'Baltimore',
  '21203': 'Baltimore',
  '21204': 'Towson',
  '21205': 'Baltimore',
  '21206': 'Baltimore',
  '21207': 'Gwynn Oak',
  '21208': 'Pikesville',
  '21209': 'Baltimore',
  '21210': 'Baltimore',
  '21211': 'Baltimore',
  '21212': 'Baltimore',
  '21213': 'Baltimore',
  '21214': 'Baltimore',
  '21215': 'Baltimore',
  '21216': 'Baltimore',
  '21217': 'Baltimore',
  '21218': 'Baltimore',
  '21219': 'Sparrows Point',
  '21220': 'Middle River',
  '21221': 'Essex',
  '21222': 'Dundalk',
  '21223': 'Baltimore',
  '21224': 'Baltimore',
  '21225': 'Brooklyn',
  '21226': 'Curtis Bay',
  '21227': 'Halethorpe',
  '21228': 'Catonsville',
  '21229': 'Baltimore',
  '21230': 'Baltimore',
  '21231': 'Baltimore',
  '21234': 'Parkville',
  '21236': 'Nottingham',
  '21237': 'Rosedale',
  '21244': 'Windsor Mill',
  '21286': 'Towson',
  
  // Montgomery County
  '20850': 'Rockville',
  '20851': 'Rockville',
  '20852': 'Rockville',
  '20853': 'Rockville',
  '20854': 'Potomac',
  '20855': 'Derwood',
  '20814': 'Bethesda',
  '20815': 'Chevy Chase',
  '20816': 'Bethesda',
  '20817': 'Bethesda',
  '20818': 'Cabin John',
  '20832': 'Olney',
  '20833': 'Brookeville',
  '20837': 'Poolesville',
  '20838': 'Barnesville',
  '20839': 'Beallsville',
  '20841': 'Boyds',
  '20842': 'Dickerson',
  '20850': 'Rockville',
  '20860': 'Sandy Spring',
  '20861': 'Ashton',
  '20862': 'Brinklow',
  '20866': 'Burtonsville',
  '20868': 'Spencerville',
  '20871': 'Clarksburg',
  '20872': 'Damascus',
  '20874': 'Germantown',
  '20876': 'Germantown',
  '20877': 'Gaithersburg',
  '20878': 'Gaithersburg',
  '20879': 'Gaithersburg',
  '20880': 'Washington Grove',
  '20882': 'Gaithersburg',
  '20883': 'Gaithersburg',
  '20884': 'Gaithersburg',
  '20885': 'Gaithersburg',
  '20886': 'Montgomery Village',
  '20895': 'Kensington',
  '20896': 'Garrett Park',
  '20901': 'Silver Spring',
  '20902': 'Silver Spring',
  '20903': 'Silver Spring',
  '20904': 'Silver Spring',
  '20905': 'Silver Spring',
  '20906': 'Silver Spring',
  '20907': 'Silver Spring',
  '20908': 'Silver Spring',
  '20910': 'Silver Spring',
  '20911': 'Silver Spring',
  '20912': 'Takoma Park',
  '20913': 'Takoma Park',
  '20914': 'Silver Spring',
  '20915': 'Silver Spring',
  '20916': 'Silver Spring',
  '20918': 'Silver Spring',
  '20993': 'Silver Spring',
  '20997': 'Silver Spring',
  
  // Prince George's County
  '20701': 'Annapolis Junction',
  '20703': 'Lanham',
  '20704': 'Beltsville',
  '20705': 'Beltsville',
  '20706': 'Lanham',
  '20707': 'Laurel',
  '20708': 'Laurel',
  '20709': 'Laurel',
  '20710': 'Bladensburg',
  '20712': 'Mount Rainier',
  '20714': 'North Beach',
  '20715': 'Bowie',
  '20716': 'Bowie',
  '20717': 'Bowie',
  '20718': 'Bowie',
  '20719': 'Bowie',
  '20720': 'Bowie',
  '20721': 'Bowie',
  '20722': 'Brentwood',
  '20723': 'Laurel',
  '20724': 'Laurel',
  '20725': 'Laurel',
  '20726': 'Laurel',
  '20731': 'Capitol Heights',
  '20732': 'Chesapeake Beach',
  '20733': 'Churchton',
  '20735': 'Clinton',
  '20736': 'Owings',
  '20737': 'Riverdale',
  '20738': 'Riverdale',
  '20740': 'College Park',
  '20741': 'College Park',
  '20742': 'College Park',
  '20743': 'Capitol Heights',
  '20744': 'Fort Washington',
  '20745': 'Oxon Hill',
  '20746': 'Suitland',
  '20747': 'District Heights',
  '20748': 'Temple Hills',
  '20749': 'Fort Washington',
  '20750': 'Oxon Hill',
  '20751': 'Deale',
  '20752': 'Suitland',
  '20753': 'District Heights',
  '20754': 'Dunkirk',
  '20755': 'Fort George G Meade',
  '20757': 'Temple Hills',
  '20758': 'Friendship',
  '20759': 'Fulton',
  '20762': 'Andrews Air Force Base',
  '20763': 'Savage',
  '20764': 'Shady Side',
  '20765': 'Galesville',
  '20769': 'Glenn Dale',
  '20770': 'Greenbelt',
  '20771': 'Greenbelt',
  '20772': 'Upper Marlboro',
  '20773': 'Upper Marlboro',
  '20774': 'Upper Marlboro',
  '20775': 'Upper Marlboro',
  '20776': 'Harwood',
  '20777': 'Highland',
  '20778': 'West River',
  '20779': 'Tracys Landing',
  '20781': 'Hyattsville',
  '20782': 'Hyattsville',
  '20783': 'Hyattsville',
  '20784': 'Hyattsville',
  '20785': 'Hyattsville',
  '20787': 'Hyattsville',
  '20788': 'Hyattsville',
  '20790': 'Capitol Heights',
  '20791': 'Capitol Heights',
  '20792': 'Upper Marlboro',
  '20794': 'Jessup',
  '20797': 'Southern Md Facility',
  '20799': 'Capitol Heights',
  
  // Other Maryland areas
  '21401': 'Annapolis',
  '21402': 'Annapolis',
  '21403': 'Annapolis',
  '21404': 'Annapolis',
  '21405': 'Annapolis',
  '21409': 'Annapolis',
  '21411': 'Annapolis',
  '21412': 'Arnold',
  '21701': 'Frederick',
  '21702': 'Frederick',
  '21703': 'Frederick',
  '21704': 'Frederick',
  '21705': 'Frederick',
  '21709': 'Frederick',
  '21710': 'Adamstown',
  '21711': 'Big Pool',
  '21713': 'Boonsboro',
  '21714': 'Brunswick',
  '21715': 'Burkittsville',
  '21716': 'Cascade',
  '21717': 'Cavetown',
  '21718': 'Clear Spring',
  '21719': 'Emmitsburg',
  '21720': 'Fairplay',
  '21722': 'Fort Ritchie',
  '21723': 'Gapland',
  '21727': 'Emmitsburg',
  '21733': 'Fairplay',
  '21734': 'Funkstown',
  '21740': 'Hagerstown',
  '21741': 'Hagerstown',
  '21742': 'Hagerstown',
  '21750': 'Hancock',
  '21754': 'Ijamsville',
  '21755': 'Jefferson',
  '21756': 'Keedysville',
  '21757': 'Keymar',
  '21758': 'Knoxville',
  '21759': 'Ladiesburg',
  '21762': 'Libertytown',
  '21766': 'Little Orleans',
  '21767': 'Maugansville',
  '21769': 'Middletown',
  '21770': 'Monrovia',
  '21771': 'Mount Airy',
  '21773': 'Myersville',
  '21774': 'New Market',
  '21775': 'New Midway',
  '21776': 'New Windsor',
  '21777': 'Point Of Rocks',
  '21778': 'Rocky Ridge',
  '21779': 'Rohrersville',
  '21780': 'Sabillasville',
  '21782': 'San Mar',
  '21783': 'Sharpsburg',
  '21784': 'Sykesville',
  '21787': 'Taneytown',
  '21788': 'Thurmont',
  '21790': 'Tuscarora',
  '21791': 'Union Bridge',
  '21792': 'Unionville',
  '21793': 'Walkersville',
  '21794': 'West Friendship',
  '21795': 'Williamsport',
  '21797': 'Woodbine',
  '21798': 'Woodsboro',
};

// Function to lookup city by ZIP code using USPS API (requires registration)
// For now, we'll use the local mapping above
async function getCityFromZip(zip) {
  // Clean ZIP code (get first 5 digits)
  const cleanZip = zip.replace(/[^0-9]/g, '').substring(0, 5);
  
  // Look up in our mapping
  const city = ZIP_TO_CITY[cleanZip];
  
  if (city) {
    return city;
  }
  
  // If not found, you could call an API here
  // For example: https://api.zippopotam.us/us/{zip}
  try {
    return await new Promise((resolve, reject) => {
      https.get(`https://api.zippopotam.us/us/${cleanZip}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.places && json.places[0]) {
              resolve(json.places[0]['place name']);
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  } catch (error) {
    return null;
  }
}

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Simple CSV parsing (doesn't handle all edge cases)
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
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

async function main() {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3] || inputFile.replace('.csv', '_fixed.csv');
  
  if (!inputFile) {
    console.log('Usage: node scripts/fix-missing-cities.js <INPUT_CSV> [OUTPUT_CSV]');
    console.log('Example: node scripts/fix-missing-cities.js data/cms-hospitals/hospitals_MD.csv');
    process.exit(1);
  }
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }
  
  console.log(`Reading CSV from: ${inputFile}`);
  
  const content = fs.readFileSync(inputFile, 'utf-8');
  const { headers, rows } = parseCSV(content);
  
  // Find city and zip_code columns
  const cityIndex = headers.indexOf('city');
  const zipIndex = headers.indexOf('zip_code');
  
  if (cityIndex === -1) {
    console.error('Error: No "city" column found in CSV');
    process.exit(1);
  }
  
  if (zipIndex === -1) {
    console.error('Error: No "zip_code" column found in CSV');
    process.exit(1);
  }
  
  console.log(`Processing ${rows.length} rows...`);
  
  let fixedCount = 0;
  const fixedRows = [];
  
  for (const row of rows) {
    const currentCity = row.city;
    const zipCode = row.zip_code;
    
    // Check if city is missing or empty
    if (!currentCity || currentCity.trim() === '') {
      if (zipCode && zipCode.trim() !== '') {
        const newCity = await getCityFromZip(zipCode);
        
        if (newCity) {
          row.city = newCity;
          fixedCount++;
          console.log(`  Fixed: ZIP ${zipCode} → ${newCity}`);
        } else {
          console.log(`  Could not find city for ZIP: ${zipCode}`);
        }
      }
    }
    
    fixedRows.push(row);
  }
  
  // Write output CSV
  const outputLines = [];
  outputLines.push(headers.join(','));
  
  for (const row of fixedRows) {
    const values = headers.map(header => escapeCSV(row[header]));
    outputLines.push(values.join(','));
  }
  
  fs.writeFileSync(outputFile, outputLines.join('\n'), 'utf-8');
  
  console.log(`\n✅ Fixed ${fixedCount} missing cities`);
  console.log(`📁 Output saved to: ${outputFile}`);
  
  if (outputFile !== inputFile) {
    console.log(`\nTo replace the original file, run:`);
    console.log(`  mv ${outputFile} ${inputFile}`);
  }
}

main().catch(console.error);
