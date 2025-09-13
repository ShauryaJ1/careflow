import { z } from 'zod';

// Enum schemas matching database types
export const providerTypeSchema = z.enum([
  'clinic',
  'pharmacy', 
  'telehealth',
  'hospital',
  'pop_up',
  'mobile',
  'urgent_care'
]);

export const serviceTypeSchema = z.enum([
  'general',
  'dental',
  'maternal_care',
  'urgent_care',
  'mental_health',
  'pediatric',
  'vaccination',
  'specialty',
  'diagnostic'
]);

export const requestStatusSchema = z.enum([
  'pending',
  'matched',
  'fulfilled',
  'cancelled'
]);

export const timeSlotSchema = z.enum([
  'morning',
  'afternoon',
  'evening'
]);

export const areaTypeSchema = z.enum([
  'zip',
  'county',
  'grid',
  'city'
]);

// Provider hours schema
export const providerHoursSchema = z.record(
  z.string(),
  z.object({
    open: z.string(),
    close: z.string()
  }).nullable()
);

// Provider schemas
export const createProviderSchema = z.object({
  name: z.string().min(1).max(255),
  type: providerTypeSchema,
  address: z.string().optional(),
  geo_lat: z.number().min(-90).max(90).optional(),
  geo_long: z.number().min(-180).max(180).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  hours: providerHoursSchema.optional(),
  services: z.array(serviceTypeSchema).default([]),
  insurance_accepted: z.array(z.string()).default([]),
  capacity: z.number().int().positive().optional(),
  accepts_walk_ins: z.boolean().default(false),
  telehealth_available: z.boolean().default(false),
  languages_spoken: z.array(z.string()).default(['English']),
  accessibility_features: z.array(z.string()).optional()
});

export const updateProviderSchema = createProviderSchema.partial();

export const searchProvidersSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().positive().default(10),
  type: providerTypeSchema.optional(),
  services: z.array(serviceTypeSchema).optional(),
  insurance: z.string().optional(),
  languages: z.array(z.string()).optional(),
  accepts_walk_ins: z.boolean().optional(),
  telehealth_available: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

export const nearbyProvidersSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  maxDistanceMiles: z.number().positive().default(10),
  providerType: providerTypeSchema.optional(),
  serviceType: serviceTypeSchema.optional(),
  limit: z.number().int().positive().max(100).default(50)
});

// Patient request schemas
export const createPatientRequestSchema = z.object({
  geo_lat: z.number().min(-90).max(90),
  geo_long: z.number().min(-180).max(180),
  address: z.string().optional(),
  requested_service: serviceTypeSchema,
  urgency_level: z.number().int().min(1).max(5).default(3),
  preferred_date: z.string().datetime().optional(),
  preferred_time_slot: timeSlotSchema.optional(),
  insurance_provider: z.string().optional(),
  notes: z.string().max(1000).optional()
});

export const updateRequestStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: requestStatusSchema,
  matchedProviderId: z.string().uuid().optional(),
  matchScore: z.number().min(0).max(1).optional()
});

// Pop-up event schemas
export const createPopUpEventSchema = z.object({
  provider_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  date_start: z.string().datetime(),
  date_end: z.string().datetime(),
  address: z.string().optional(),
  geo_lat: z.number().min(-90).max(90).optional(),
  geo_long: z.number().min(-180).max(180).optional(),
  services_offered: z.array(serviceTypeSchema).default([]),
  capacity: z.number().int().positive().optional(),
  registration_required: z.boolean().default(false),
  registration_url: z.string().url().optional(),
  cost_info: z.string().optional(),
  is_free: z.boolean().default(true)
});

export const searchPopUpEventsSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().positive().default(10),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  services: z.array(serviceTypeSchema).optional(),
  is_free: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

// Cache schemas
export const cacheKeySchema = z.object({
  type: areaTypeSchema,
  identifier: z.string()
});

export const setCacheSchema = z.object({
  key: cacheKeySchema,
  data: z.any(),
  expiresInMinutes: z.number().positive().default(60)
});

// Scraper/Pipeline schemas (for Trigger.dev integration)
export const scraperJobSchema = z.object({
  source: z.enum(['google', 'stagehand', 'exa', 'perplexity', 'manual']),
  query: z.string(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radius: z.number().positive()
  }).optional(),
  maxResults: z.number().int().positive().max(100).default(20)
});

// AI Agent schemas (for Gemini integration)
export const triageRequestSchema = z.object({
  symptoms: z.string(),
  duration: z.string(),
  severity: z.number().int().min(1).max(10),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  hasInsurance: z.boolean(),
  preferredModality: z.enum(['in_person', 'telehealth', 'any']).default('any')
});

export const loadBalancingSchema = z.object({
  requests: z.array(z.string().uuid()),
  providers: z.array(z.string().uuid()),
  algorithm: z.enum(['distance', 'capacity', 'fragility', 'smart']).default('smart'),
  weights: z.object({
    distance: z.number().min(0).max(1).default(0.3),
    capacity: z.number().min(0).max(1).default(0.3),
    fragility: z.number().min(0).max(1).default(0.2),
    waitTime: z.number().min(0).max(1).default(0.2)
  }).optional()
});

// Realtime subscription schemas
export const subscribeToAreaSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().positive().default(10),
  events: z.array(z.enum(['provider_update', 'new_popup', 'request_update'])).default(['provider_update', 'new_popup'])
});

// Analytics schemas
export const heatmapDataSchema = z.object({
  bounds: z.object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180)
  }),
  gridSize: z.number().positive().default(0.01), // degrees
  metric: z.enum(['requests', 'wait_time', 'capacity', 'unmet_demand']).default('requests'),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional()
});
