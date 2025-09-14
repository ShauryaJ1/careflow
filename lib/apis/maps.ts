import { z } from 'zod';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

// Inputs
export const coordinatesSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const locationInputSchema = z.union([z.string().min(1), coordinatesSchema]);
export type LocationInput = z.infer<typeof locationInputSchema>;

// Output for how_far
export const travelResultSchema = z.object({
  seconds: z.number().nonnegative(),
  minutes: z.number().nonnegative(),
  distanceMeters: z.number().nonnegative(),
  distanceMiles: z.number().nonnegative(),
  profile: z.enum(['driving', 'walking', 'cycling']).default('driving'),
});
export type TravelResult = z.infer<typeof travelResultSchema>;

// Overpass schemas
const overpassElementSchema = z.object({
  type: z.enum(['node', 'way', 'relation']),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  tags: z.record(z.string(), z.string()).optional(),
});
const overpassResponseSchema = z.object({
  elements: z.array(overpassElementSchema),
});

export const establishedPlaceSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  category: z.enum(['hospital', 'clinic', 'doctor', 'urgent_care']),
  lat: z.number(),
  lng: z.number(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      housenumber: z.string().optional(),
    })
    .optional(),
});
export type EstablishedPlace = z.infer<typeof establishedPlaceSchema>;

export const getEstablishedInputSchema = z.object({
  center: coordinatesSchema,
  radiusMeters: z.number().int().positive().max(50000).default(5000),
  limit: z.number().int().positive().max(500).default(200),
});
export type GetEstablishedInput = z.infer<typeof getEstablishedInputSchema>;

async function geocodeIfNeeded(loc: LocationInput): Promise<Coordinates> {
  const parsed = locationInputSchema.parse(loc);
  if (typeof parsed === 'string') {
    if (!GEOAPIFY_API_KEY) throw new Error('GEOAPIFY_API_KEY is required to geocode a string location');
    const url = new URL('https://api.geoapify.com/v1/geocode/search');
    url.searchParams.set('text', parsed);
    // If looks like a US ZIP code, constrain to US for better accuracy
    if (/^\d{5}$/.test(parsed)) {
      url.searchParams.set('filter', 'countrycode:us');
    }
    url.searchParams.set('limit', '1');
    url.searchParams.set('apiKey', GEOAPIFY_API_KEY);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Geoapify geocoding failed: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as any;
    const feat = data?.features?.[0];
    const coords = feat?.geometry?.coordinates;
    if (!coords || coords.length < 2) throw new Error('No geocoding result found for input location');
    return { lng: Number(coords[0]), lat: Number(coords[1]) };
  }
  return parsed;
}

// Convert various location-like inputs into normalized lat/lng coordinates.
// Accepts:
// - Coordinates object: { lat, lng }
// - Alt-key objects: { lat, lon } or { latitude, longitude }
// - Tuple-like array: [lat, lng] or [lng, lat] (auto-detects by range)
// - String:
//     - "lat,lng" or "lng,lat" (auto-detects by range)
//     - Any free-form address or ZIP (geocoded via Geoapify)
export async function to_lat_lng(
  input:
    | Coordinates
    | { lat: number; lon: number }
    | { latitude: number; longitude: number }
    | [number, number]
    | string
): Promise<Coordinates> {
  // 1) Direct coordinates object
  // { lat, lng }
  if (typeof input === 'object' && input != null && 'lat' in input && 'lng' in input) {
    const coords = { lat: Number((input as any).lat), lng: Number((input as any).lng) };
    return coordinatesSchema.parse(coords);
  }

  // 2) Alt key variants
  // { lat, lon }
  if (typeof input === 'object' && input != null && 'lat' in input && 'lon' in input) {
    const coords = { lat: Number((input as any).lat), lng: Number((input as any).lon) };
    return coordinatesSchema.parse(coords);
  }
  // { latitude, longitude }
  if (typeof input === 'object' && input != null && 'latitude' in input && 'longitude' in input) {
    const coords = { lat: Number((input as any).latitude), lng: Number((input as any).longitude) };
    return coordinatesSchema.parse(coords);
  }

  // 3) Tuple-like arrays: [a, b]
  if (Array.isArray(input) && input.length === 2) {
    const a = Number(input[0]);
    const b = Number(input[1]);
    // Try as [lat, lng]
    const asLatLng = { lat: a, lng: b };
    const asLngLat = { lat: b, lng: a };
    const withinLat = (x: number) => x >= -90 && x <= 90;
    const withinLng = (x: number) => x >= -180 && x <= 180;
    if (withinLat(asLatLng.lat) && withinLng(asLatLng.lng)) return coordinatesSchema.parse(asLatLng);
    if (withinLat(asLngLat.lat) && withinLng(asLngLat.lng)) return coordinatesSchema.parse(asLngLat);
    // Fall back to strict schema (will throw)
    return coordinatesSchema.parse(asLatLng);
  }

  // 4) Strings: parse "lat,lng" quickly; otherwise geocode
  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Quick numeric pair: "a,b"
    const m = trimmed.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const asLatLng = { lat: a, lng: b };
      const asLngLat = { lat: b, lng: a };
      const withinLat = (x: number) => x >= -90 && x <= 90;
      const withinLng = (x: number) => x >= -180 && x <= 180;
      if (withinLat(asLatLng.lat) && withinLng(asLatLng.lng)) return coordinatesSchema.parse(asLatLng);
      if (withinLat(asLngLat.lat) && withinLng(asLngLat.lng)) return coordinatesSchema.parse(asLngLat);
      // If neither orientation is within range, let schema throw
      return coordinatesSchema.parse(asLatLng);
    }

    // Otherwise, treat as address/ZIP and geocode via existing helper
    return geocodeIfNeeded(trimmed);
  }

  // Unsupported input
  throw new Error('Unsupported location input format');
}

export async function how_far(args: {
  from: LocationInput;
  to: LocationInput;
  profile?: 'driving' | 'walking' | 'cycling';
}): Promise<TravelResult> {
  const { from, to } = args;
  const profile = args.profile || 'driving';
  const a = await geocodeIfNeeded(from);
  const b = await geocodeIfNeeded(to);

  if (!GEOAPIFY_API_KEY) throw new Error('GEOAPIFY_API_KEY is not set');

  const modeMap: Record<'driving' | 'walking' | 'cycling', string> = {
    driving: 'drive',
    walking: 'walk',
    cycling: 'bicycle',
  };
  const mode = modeMap[profile];

  const url = new URL('https://api.geoapify.com/v1/routing');
  url.searchParams.set('waypoints', `${a.lng},${a.lat}|${b.lng},${b.lat}`);
  url.searchParams.set('mode', mode);
  url.searchParams.set('apiKey', GEOAPIFY_API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Geoapify routing failed: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as any;

  // Geoapify returns a FeatureCollection
  if (data?.error || data?.message || data?.statusCode) {
    const errMsg = typeof data?.message === 'string' ? data.message : JSON.stringify(data);
    throw new Error(`Geoapify error: ${errMsg}`);
  }

  const feature = data?.features?.[0];
  const props = feature?.properties || {};

  // Prefer properties.time & properties.distance; fall back to legs/segments
  const prefTime = props.time ?? props.legs?.[0]?.time ?? props.segments?.[0]?.time;
  const prefDist = props.distance ?? props.legs?.[0]?.distance ?? props.segments?.[0]?.distance;

  if (prefTime == null || prefDist == null) {
    throw new Error('No route found (empty features or missing time/distance)');
  }

  const seconds = Number(prefTime) || 0;
  const distanceMeters = Number(prefDist) || 0;
  const minutes = seconds / 60;
  const distanceMiles = distanceMeters / 1609.344;

  return travelResultSchema.parse({ seconds, minutes, distanceMeters, distanceMiles, profile });
}

// Fetch established facilities in area using OpenStreetMap Overpass API
export async function get_established(input: GetEstablishedInput): Promise<EstablishedPlace[]> {
  const { center, radiusMeters, limit } = getEstablishedInputSchema.parse(input);
  const { lat, lng } = center;

  // Query hospitals, clinics, doctors, urgent care
  const q = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      way["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      node["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
      way["amenity"="doctors"](around:${radiusMeters},${lat},${lng});
      node["healthcare"="urgent_care"](around:${radiusMeters},${lat},${lng});
      way["healthcare"="urgent_care"](around:${radiusMeters},${lat},${lng});
    );
    out center ${Math.min(limit, 500)};
  `.trim();

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ data: q }).toString(),
  });
  if (!res.ok) throw new Error(`Overpass API failed: ${res.status} ${res.statusText}`);
  const data = await res.json();

  const parsed = overpassResponseSchema.safeParse(data);
  if (!parsed.success) throw new Error('Invalid Overpass response shape');

  const elements = parsed.data.elements;

  const normalize = (el: z.infer<typeof overpassElementSchema>): EstablishedPlace | null => {
    const tags = el.tags || {};
    const coords = el.type === 'node'
      ? (el.lat != null && el.lon != null ? { lat: el.lat, lng: el.lon } : null)
      : el.center
        ? { lat: el.center.lat, lng: el.center.lon }
        : null;
    if (!coords) return null;

    let category: EstablishedPlace['category'] | null = null;
    if (tags['amenity'] === 'hospital') category = 'hospital';
    else if (tags['amenity'] === 'clinic') category = 'clinic';
    else if (tags['amenity'] === 'doctors') category = 'doctor';
    else if (tags['healthcare'] === 'urgent_care') category = 'urgent_care';
    if (!category) return null;

    const address = {
      housenumber: tags['addr:housenumber'],
      street: tags['addr:street'],
      city: tags['addr:city'],
      state: tags['addr:state'],
      postcode: tags['addr:postcode'],
    };

    return establishedPlaceSchema.parse({
      id: `${el.type}/${el.id}`,
      name: tags.name,
      category,
      lat: coords.lat,
      lng: coords.lng,
      address,
    });
  };

  const out: EstablishedPlace[] = [];
  for (const el of elements) {
    const item = normalize(el);
    if (item) out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
