import { z } from 'zod';

// ZipCodeAPI docs: https://www.zipcodeapi.com/API
// Endpoint shape: /rest/<API_KEY>/radius.json/<zip>/<radius>/<unit>

const ZIPCODEAPI_KEY = process.env.ZIPCODEAPI_KEY;
const ZIPCODEAPI_BASE_URL = process.env.ZIPCODEAPI_BASE_URL || 'https://www.zipcodeapi.com';

const zipRadiusResponseSchema = z.object({
  zip_codes: z.array(
    z.object({
      zip_code: z.string(),
      distance: z.number(),
      city: z.string().optional(),
      state: z.string().optional(),
    })
  ),
});

export type NeighborZip = z.infer<typeof zipRadiusResponseSchema>['zip_codes'][number];

const inputSchema = z.object({
  zip: z
    .string()
    .regex(/^\d{5}$/, 'zip must be a 5-digit US ZIP code'),
  radius: z.number().positive('radius must be > 0'),
  unit: z.enum(['mile', 'km']).default('mile'),
});

/**
 * Find neighboring ZIP codes within a radius of the given ZIP.
 * - Uses ZipCodeAPI radius endpoint.
 * - Returns list including zip code, distance, and optional city/state.
 */
export async function get_neighboring_zipcodes(args: {
  zip: string;
  radius: number; // numeric radius in the unit specified
  unit?: 'mile' | 'km';
}): Promise<NeighborZip[]> {
  const { zip, radius, unit } = inputSchema.parse(args);

  if (!ZIPCODEAPI_KEY) {
    throw new Error('ZIPCODEAPI_KEY is not set');
  }

  const url = new URL(
    `/rest/${encodeURIComponent(ZIPCODEAPI_KEY)}/radius.json/${encodeURIComponent(zip)}/${encodeURIComponent(
      String(radius)
    )}/${encodeURIComponent(unit)}`,
    ZIPCODEAPI_BASE_URL
  );

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ZipCodeAPI failed: ${res.status} ${res.statusText} ${text}`.trim());
  }

  const data = await res.json();
  const parsed = zipRadiusResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('Unexpected ZipCodeAPI response shape');
  }

  return parsed.data.zip_codes;
}

/**
 * Convenience helper: return only ZIP code strings.
 */
export async function get_neighboring_zipcode_list(args: {
  zip: string;
  radius: number;
  unit?: 'mile' | 'km';
}): Promise<string[]> {
  const items = await get_neighboring_zipcodes(args);
  return items.map((i) => i.zip_code);
}

