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

export const typeOfCareSchema = z.enum([
  'ER',
  'urgent_care',
  'telehealth',
  'clinic',
  'pop_up_clinic',
  'practitioner'
]);

// Provider hours schema
export const providerHoursSchema = z.record(
  z.string(),
  z.object({
    open: z.string(),
    close: z.string()
  }).nullable()
);

// Hospital open time schema
export const hospitalOpenTimeSchema = z.object({
  sunday: z.object({
    open: z.string(),
    close: z.string()
  }).nullable().optional(),
  monday: z.object({
    open: z.string(),
    close: z.string()
  }).nullable().optional(),
  tuesday: z.object({
    open: z.string(),
    close: z.string()
  }).nullable().optional(),
  wednesday: z.object({
    open: z.string(),
    close: z.string()
  }).nullable().optional(),
  thursday: z.object({
    open: z.string(),
    close: z.string()
  }).nullable().optional(),
  friday: z.object({
    open: z.string(),
    close: z.string()
  }).nullable().optional(),
  saturday: z.object({
    open: z.string(),
    close: z.string()
  }).nullable().optional()
});

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

// Hospital schemas
export const createHospitalSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip_code: z.string().min(1),
  type_of_care: typeOfCareSchema,
  wait_score: z.number().optional(),
  cooldown: z.number().optional(),
  op_22: z.number().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone_number: z.string().max(20).optional(),
  description: z.string().max(1000).optional(),
  open_time: hospitalOpenTimeSchema.optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional()
});

export const updateHospitalSchema = createHospitalSchema.partial();

export const searchHospitalsSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().positive().default(10),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  type_of_care: z.union([
    typeOfCareSchema,
    z.array(typeOfCareSchema)
  ]).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

// Future schemas - to be added when features are implemented
// - Pop-up events
// - Cache management
// - Scraper/Pipeline (Trigger.dev)
// - AI Agent (Gemini)
// - Realtime subscriptions
// - Analytics/Heatmaps
