// US State abbreviation mappings
export const STATE_ABBREVIATIONS: Record<string, string> = {
  // Full name to abbreviation
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
  'district of columbia': 'DC',
  'washington dc': 'DC',
  'washington d.c.': 'DC',
};

// Abbreviation to full name
export const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia',
};

/**
 * Convert a state name or abbreviation to its abbreviation
 * @param input - State name or abbreviation
 * @returns State abbreviation or the original input if not found
 */
export function getStateAbbreviation(input: string): string {
  if (!input) return input;
  
  const normalized = input.trim().toLowerCase();
  
  // Check if it's already an abbreviation
  const upperInput = input.trim().toUpperCase();
  if (STATE_NAMES[upperInput]) {
    return upperInput;
  }
  
  // Check if it's a full state name
  if (STATE_ABBREVIATIONS[normalized]) {
    return STATE_ABBREVIATIONS[normalized];
  }
  
  // Return original if not found
  return input.trim();
}

/**
 * Get the full state name from an abbreviation
 * @param abbreviation - State abbreviation
 * @returns Full state name or the original input if not found
 */
export function getStateName(abbreviation: string): string {
  if (!abbreviation) return abbreviation;
  
  const upper = abbreviation.trim().toUpperCase();
  return STATE_NAMES[upper] || abbreviation;
}

/**
 * Check if a string is a valid state (name or abbreviation)
 * @param input - String to check
 * @returns True if valid state
 */
export function isValidState(input: string): boolean {
  if (!input) return false;
  
  const normalized = input.trim().toLowerCase();
  const upper = input.trim().toUpperCase();
  
  return !!STATE_ABBREVIATIONS[normalized] || !!STATE_NAMES[upper];
}
