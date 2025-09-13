import { createClient } from '@/lib/supabase/server';
import type { 
  Provider, 
  ProviderSearchParams, 
  CreateProviderInput,
  NearbyProvider,
  ServiceType,
  ProviderType 
} from '@/lib/types/database';

/**
 * Search for providers based on various criteria
 */
export async function searchProviders(params: ProviderSearchParams): Promise<Provider[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('providers')
    .select('*')
    .eq('is_active', true);

  // Filter by provider type
  if (params.type) {
    query = query.eq('type', params.type);
  }

  // Filter by services offered
  if (params.services && params.services.length > 0) {
    query = query.contains('services', params.services);
  }

  // Filter by insurance accepted
  if (params.insurance) {
    query = query.contains('insurance_accepted', [params.insurance]);
  }

  // Filter by languages spoken
  if (params.languages && params.languages.length > 0) {
    query = query.contains('languages_spoken', params.languages);
  }

  // Filter by walk-ins accepted
  if (params.accepts_walk_ins !== undefined) {
    query = query.eq('accepts_walk_ins', params.accepts_walk_ins);
  }

  // Filter by telehealth availability
  if (params.telehealth_available !== undefined) {
    query = query.eq('telehealth_available', params.telehealth_available);
  }

  // Apply pagination
  const limit = params.limit || 50;
  const offset = params.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('Error searching providers:', error);
    throw error;
  }

  // If location-based search, filter by distance
  if (params.lat && params.lng && params.radius) {
    const filteredData = await filterByDistance(
      data || [],
      params.lat,
      params.lng,
      params.radius
    );
    return filteredData;
  }

  return data || [];
}

/**
 * Find providers near a specific location
 */
export async function findNearbyProviders(
  lat: number,
  lng: number,
  maxDistanceMiles: number = 10,
  providerType?: ProviderType,
  serviceType?: ServiceType,
  limit: number = 50
): Promise<NearbyProvider[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('find_nearby_providers', {
      user_lat: lat,
      user_lon: lng,
      max_distance_miles: maxDistanceMiles,
      provider_type_filter: providerType || null,
      service_filter: serviceType || null,
      limit_results: limit
    });

  if (error) {
    console.error('Error finding nearby providers:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single provider by ID
 */
export async function getProviderById(id: string): Promise<Provider | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error getting provider:', error);
    return null;
  }

  return data;
}

/**
 * Create a new provider
 */
export async function createProvider(input: CreateProviderInput): Promise<Provider | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('providers')
    .insert({
      ...input,
      services: input.services || [],
      insurance_accepted: input.insurance_accepted || [],
      languages_spoken: input.languages_spoken || ['English'],
      accessibility_features: input.accessibility_features || [],
      accepts_walk_ins: input.accepts_walk_ins ?? false,
      telehealth_available: input.telehealth_available ?? false,
      is_active: true,
      total_reviews: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating provider:', error);
    throw error;
  }

  return data;
}

/**
 * Update a provider
 */
export async function updateProvider(
  id: string, 
  updates: Partial<CreateProviderInput>
): Promise<Provider | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating provider:', error);
    throw error;
  }

  return data;
}

/**
 * Update provider wait time
 */
export async function updateProviderWaitTime(
  id: string, 
  waitTimeMinutes: number
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('providers')
    .update({ current_wait_time: waitTimeMinutes })
    .eq('id', id);

  if (error) {
    console.error('Error updating wait time:', error);
    throw error;
  }
}

/**
 * Get providers with low wait times
 */
export async function getProvidersWithLowWaitTime(
  maxWaitMinutes: number = 30,
  limit: number = 10
): Promise<Provider[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('is_active', true)
    .lte('current_wait_time', maxWaitMinutes)
    .order('current_wait_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error getting providers with low wait time:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get top-rated providers
 */
export async function getTopRatedProviders(
  minRating: number = 4.0,
  limit: number = 10
): Promise<Provider[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('is_active', true)
    .gte('rating', minRating)
    .order('rating', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error getting top-rated providers:', error);
    throw error;
  }

  return data || [];
}

/**
 * Helper function to filter providers by distance
 */
async function filterByDistance(
  providers: Provider[],
  lat: number,
  lng: number,
  maxDistanceMiles: number
): Promise<Provider[]> {
  const supabase = await createClient();
  
  const filtered = [];
  
  for (const provider of providers) {
    if (provider.geo_lat && provider.geo_long) {
      const { data: distance } = await supabase
        .rpc('calculate_distance', {
          lat1: lat,
          lon1: lng,
          lat2: provider.geo_lat,
          lon2: provider.geo_long
        });
      
      if (distance && distance <= maxDistanceMiles) {
        filtered.push(provider);
      }
    }
  }
  
  return filtered;
}

/**
 * Batch update provider metrics
 */
export async function updateProviderMetrics(
  providerId: string,
  date: string,
  metrics: {
    total_requests?: number;
    fulfilled_requests?: number;
    average_wait_time?: number;
    peak_hours?: Record<string, number>;
  }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('provider_metrics')
    .upsert({
      provider_id: providerId,
      date: date,
      ...metrics
    }, {
      onConflict: 'provider_id,date'
    });

  if (error) {
    console.error('Error updating provider metrics:', error);
    throw error;
  }
}
