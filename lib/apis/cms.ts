import { z } from 'zod';

// Provider Data dataset: https://data.cms.gov/provider-data/dataset/yv7e-xc69#api
const DATASET_ID = 'yv7e-xc69';
const PD_API_URL = `https://data.cms.gov/provider-data/api/1/datastore/query/${DATASET_ID}/0`;

// Optional: fallback to classic SODA (Socrata) if PD API fails for any reason
const CMS_DOMAIN = process.env.CMS_SODA_DOMAIN || 'data.cms.gov';
const CMS_APP_TOKEN = process.env.CMS_SODA_APP_TOKEN; // optional but recommended

// Zod schemas for rows
const measureIdSchema = z.enum(['OP_22', 'OP_18b']);

export const cmsRowSchema = z.object({
  facility_id: z.string(),
  facility_name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  zip_code: z.string().optional(),
  measure_id: z.union([measureIdSchema, z.string()]),
  score: z.union([z.string(), z.number()]).nullish(),
});
export type CmsRow = z.infer<typeof cmsRowSchema>;

export const hospitalWithMeasuresSchema = z.object({
  facility_id: z.string(),
  facility_name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  zip_code: z.string().optional(),
  OP_22: z.number().nullable(),
  OP_18b: z.number().nullable(),
});
export type HospitalWithMeasures = z.infer<typeof hospitalWithMeasuresSchema>;

function coerceScore(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

async function fetchViaProviderDataAPI(state: string): Promise<CmsRow[]> {
  const body = {
    limit: 1000,
    offset: 0,
    fields: [
      'facility_id',
      'facility_name',
      'address',
      'city',
      'state',
      'zip_code',
      'measure_id',
      'score',
    ],
    filters: [
      { type: 'eq', field: 'state', value: state.toUpperCase() },
      { type: 'in', field: 'measure_id', value: ['OP_22', 'OP_18b'] },
    ],
  } as const;

  const out: CmsRow[] = [];
  let offset = 0;
  // Page through results
  // PD API caps page size; continue until a short page is returned
  while (true) {
    const res = await fetch(PD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, offset }),
    });
    if (!res.ok) {
      throw new Error(`CMS Provider Data API failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as any;
    const records: any[] = Array.isArray(json?.results)
      ? json.results
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json)
      ? json
      : [];

    if (!Array.isArray(records) || records.length === 0) break;

    for (const r of records) {
      const parsed = cmsRowSchema.safeParse(r);
      if (parsed.success) out.push(parsed.data);
    }

    offset += body.limit;
    if (records.length < body.limit) break;
  }
  return out;
}

async function fetchViaSocrataFallback(state: string): Promise<CmsRow[]> {
  const url = new URL(`/resource/${DATASET_ID}.json`, `https://${CMS_DOMAIN}`);
  url.searchParams.set('$select', 'facility_id,facility_name,address,city,state,zip_code,measure_id,score');
  url.searchParams.set('$where', `upper(state)='${state.toUpperCase().replace(/'/g, "''")}' AND measure_id in ('OP_22','OP_18b')`);
  url.searchParams.set('$limit', '50000');

  const headers: Record<string, string> = {};
  if (CMS_APP_TOKEN) headers['X-App-Token'] = CMS_APP_TOKEN;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`CMS SODA request failed: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as unknown;
  const arr = Array.isArray(data) ? data : [];
  const out: CmsRow[] = [];
  for (const r of arr) {
    const parsed = cmsRowSchema.safeParse(r);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// Public API: fetch all hospitals in a state with OP_22 and OP_18b scores merged per facility
export async function get_state_hospitals_with_measures(state: string): Promise<HospitalWithMeasures[]> {
  if (!state || state.length !== 2) throw new Error('state must be a 2-letter code');
  const STATE = state.toUpperCase();

  let rows: CmsRow[] = [];
  try {
    rows = await fetchViaProviderDataAPI(state);
  } catch (e) {
    // Fallback to classic SODA if PD API is unavailable
    rows = await fetchViaSocrataFallback(state);
  }

  // Aggregate per facility
  const byFacility = new Map<string, HospitalWithMeasures>();
  for (const r of rows) {
    const key = r.facility_id;
    if (!byFacility.has(key)) {
      byFacility.set(key, hospitalWithMeasuresSchema.parse({
        facility_id: r.facility_id,
        facility_name: r.facility_name,
        address: r.address,
        city: r.city,
        state: r.state,
        zip_code: r.zip_code,
        OP_22: null,
        OP_18b: null,
      }));
    }
    const agg = byFacility.get(key)!;
    const score = coerceScore(r.score);
    if (r.measure_id === 'OP_22') agg.OP_22 = score;
    if (r.measure_id === 'OP_18b') agg.OP_18b = score;
  }

  // Ensure the output is strictly limited to the requested state
  return Array.from(byFacility.values()).filter((h) => (h.state || '').toUpperCase() === STATE);
}

// Backward-compatible helpers: single-facility getters using the same dataset
export async function get_waitScore_cms(facilityId: string): Promise<number | null> {
  // Try PD API first
  try {
    const res = await fetch(PD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 1,
        offset: 0,
        fields: ['facility_id', 'measure_id', 'score'],
        filters: [
          { type: 'eq', field: 'facility_id', value: facilityId },
          { type: 'eq', field: 'measure_id', value: 'OP_22' },
        ],
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as any;
      const row = (Array.isArray(json?.results) ? json.results : json)?.[0];
      const parsed = cmsRowSchema.safeParse(row);
      if (parsed.success) return coerceScore(parsed.data.score);
    }
  } catch {}

  // Fallback to SODA
  const url = new URL(`/resource/${DATASET_ID}.json`, `https://${CMS_DOMAIN}`);
  url.searchParams.set('$select', 'facility_id,measure_id,score');
  url.searchParams.set('$where', `facility_id='${facilityId.replace(/'/g, "''")}' AND measure_id='OP_22'`);
  url.searchParams.set('$limit', '1');
  const headers: Record<string, string> = {};
  if (CMS_APP_TOKEN) headers['X-App-Token'] = CMS_APP_TOKEN;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as any[];
  const row = data?.[0];
  const parsed = cmsRowSchema.safeParse(row);
  return parsed.success ? coerceScore(parsed.data.score) : null;
}

export async function get_timeSpent_cms(facilityId: string): Promise<number | null> {
  // Try PD API first
  try {
    const res = await fetch(PD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 1,
        offset: 0,
        fields: ['facility_id', 'measure_id', 'score'],
        filters: [
          { type: 'eq', field: 'facility_id', value: facilityId },
          { type: 'eq', field: 'measure_id', value: 'OP_18b' },
        ],
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as any;
      const row = (Array.isArray(json?.results) ? json.results : json)?.[0];
      const parsed = cmsRowSchema.safeParse(row);
      if (parsed.success) return coerceScore(parsed.data.score);
    }
  } catch {}

  // Fallback to SODA
  const url = new URL(`/resource/${DATASET_ID}.json`, `https://${CMS_DOMAIN}`);
  url.searchParams.set('$select', 'facility_id,measure_id,score');
  url.searchParams.set('$where', `facility_id='${facilityId.replace(/'/g, "''")}' AND measure_id='OP_18b'`);
  url.searchParams.set('$limit', '1');
  const headers: Record<string, string> = {};
  if (CMS_APP_TOKEN) headers['X-App-Token'] = CMS_APP_TOKEN;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as any[];
  const row = data?.[0];
  const parsed = cmsRowSchema.safeParse(row);
  return parsed.success ? coerceScore(parsed.data.score) : null;
}

export const cmsConstants = {
  DATASET_ID,
  PD_API_URL,
  CMS_DOMAIN,
};
