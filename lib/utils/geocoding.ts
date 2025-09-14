/**
 * Free geocoding using OpenStreetMap's Nominatim API
 * No API key required, but please respect their usage policy
 */

interface GeocodingResult {
  lat: number;
  lng: number;
  display_name?: string;
}

/**
 * Convert an address to latitude/longitude coordinates
 * Uses server-side proxy to avoid CORS issues
 * @param address Full address string
 * @returns Coordinates or null if not found
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    // Clean the address
    const cleanAddress = address.trim();
    if (!cleanAddress) return null;
    
    // Check if we're in browser or server environment
    const isServer = typeof window === 'undefined';
    
    if (isServer) {
      // Server-side: Direct call to Nominatim
      const encodedAddress = encodeURIComponent(cleanAddress);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
        {
          headers: {
            'User-Agent': 'CareFlow Healthcare App/1.0',
          },
        }
      );
      
      if (!response.ok) {
        console.error('Geocoding failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          display_name: result.display_name,
        };
      }
    } else {
      // Client-side: Use our API route to avoid CORS
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: cleanAddress }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return data;
        }
      } else if (response.status === 503) {
        // Geocoding service is unavailable, return null gracefully
        console.log('Geocoding service unavailable, skipping geocoding');
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses with rate limiting
 * @param addresses Array of address strings
 * @returns Array of geocoding results
 */
export async function batchGeocodeAddresses(
  addresses: string[]
): Promise<(GeocodingResult | null)[]> {
  const results: (GeocodingResult | null)[] = [];
  
  for (const address of addresses) {
    const result = await geocodeAddress(address);
    results.push(result);
    
    // Wait 1 second between requests to respect Nominatim rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

/**
 * Build a full address string from components
 */
export function buildAddressString(
  street: string,
  city: string,
  state: string,
  zipCode?: string
): string {
  const parts = [street, city, state];
  if (zipCode) parts.push(zipCode);
  return parts.filter(Boolean).join(', ');
}

/**
 * Calculate distance between two coordinates in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Radius of the Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Pre-computed coordinates for known Northern Virginia hospitals
 * This avoids making API calls for seeded data
 */
export const KNOWN_HOSPITAL_COORDINATES: Record<string, GeocodingResult> = {
  'Inova Fairfax Hospital': { lat: 38.8499, lng: -77.2729 },
  'Virginia Hospital Center': { lat: 38.8800, lng: -77.1067 },
  'Inova Alexandria Hospital': { lat: 38.8234, lng: -77.1411 },
  'MedStar Urgent Care - Arlington': { lat: 38.8699, lng: -77.0847 },
  'Patient First - Fair Oaks': { lat: 38.8754, lng: -77.3827 },
  'CVS MinuteClinic - Alexandria': { lat: 38.7395, lng: -77.1527 },
  'Arlington Free Clinic': { lat: 38.8462, lng: -77.0919 },
  'Neighborhood Health - Alexandria': { lat: 38.8304, lng: -77.1386 },
  'Inova Cares Clinic - Fairfax': { lat: 38.9197, lng: -77.2273 },
  'Mobile Health Unit - Fairfax County': { lat: 38.8462, lng: -77.2706 },
  'Inova Virtual Health': { lat: 38.8462, lng: -77.2706 },
  'Velocity Urgent Care - Woodbridge': { lat: 38.6581, lng: -77.2806 },
  'GoHealth Urgent Care - McLean': { lat: 38.9386, lng: -77.2167 },
  'Capital Area Pediatrics - Reston': { lat: 38.9586, lng: -77.3361 },
  'Inova Loudoun Hospital': { lat: 39.1157, lng: -77.5636 },
  'Reston Hospital Center': { lat: 38.9586, lng: -77.3361 },
  'Sentara Northern Virginia Medical Center': { lat: 38.6304, lng: -77.2594 },
};

/**
 * Get coordinates for a hospital, using cache first, then geocoding
 */
export async function getHospitalCoordinates(
  hospitalName: string,
  address?: string,
  city?: string,
  state?: string,
  zipCode?: string
): Promise<GeocodingResult | null> {
  // Check if we have pre-computed coordinates
  if (KNOWN_HOSPITAL_COORDINATES[hospitalName]) {
    return KNOWN_HOSPITAL_COORDINATES[hospitalName];
  }
  
  // Otherwise, geocode the address
  if (address && city && state) {
    const fullAddress = buildAddressString(address, city, state, zipCode);
    return await geocodeAddress(fullAddress);
  }
  
  return null;
}
