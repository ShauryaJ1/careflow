import { createClient } from '@/lib/supabase/server';
import type { 
  PatientRequest, 
  CreatePatientRequestInput,
  RequestStatus,
  ServiceType 
} from '@/lib/types/database';

/**
 * Create a new patient request
 */
export async function createPatientRequest(
  input: CreatePatientRequestInput,
  userId?: string
): Promise<PatientRequest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('patient_requests')
    .insert({
      ...input,
      user_id: userId,
      urgency_level: input.urgency_level || 3,
      status: 'pending' as RequestStatus
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating patient request:', error);
    throw error;
  }

  return data;
}

/**
 * Get patient requests for a user
 */
export async function getUserRequests(userId: string): Promise<PatientRequest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('patient_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting user requests:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single patient request
 */
export async function getPatientRequest(requestId: string): Promise<PatientRequest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('patient_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) {
    console.error('Error getting patient request:', error);
    return null;
  }

  return data;
}

/**
 * Update patient request status
 */
export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  matchedProviderId?: string,
  matchScore?: number
): Promise<PatientRequest | null> {
  const supabase = await createClient();

  const updates: any = { status };
  
  if (matchedProviderId) {
    updates.matched_provider_id = matchedProviderId;
  }
  
  if (matchScore !== undefined) {
    updates.match_score = matchScore;
  }

  const { data, error } = await supabase
    .from('patient_requests')
    .update(updates)
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    console.error('Error updating request status:', error);
    throw error;
  }

  return data;
}

/**
 * Get pending requests by area
 */
export async function getPendingRequestsByArea(
  lat: number,
  lng: number,
  radiusMiles: number = 10
): Promise<PatientRequest[]> {
  const supabase = await createClient();

  // First get all pending requests
  const { data: requests, error } = await supabase
    .from('patient_requests')
    .select('*')
    .eq('status', 'pending')
    .order('urgency_level', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting pending requests:', error);
    throw error;
  }

  if (!requests) return [];

  // Filter by distance
  const filtered = [];
  for (const request of requests) {
    const { data: distance } = await supabase
      .rpc('calculate_distance', {
        lat1: lat,
        lon1: lng,
        lat2: request.geo_lat,
        lon2: request.geo_long
      });
    
    if (distance && distance <= radiusMiles) {
      filtered.push(request);
    }
  }

  return filtered;
}

/**
 * Get requests by urgency level
 */
export async function getUrgentRequests(
  maxUrgencyLevel: number = 2
): Promise<PatientRequest[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('patient_requests')
    .select('*')
    .eq('status', 'pending')
    .lte('urgency_level', maxUrgencyLevel)
    .order('urgency_level', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting urgent requests:', error);
    throw error;
  }

  return data || [];
}

/**
 * Match a patient request with providers
 */
export async function matchRequestWithProviders(
  requestId: string
): Promise<{ providerId: string; score: number }[]> {
  const supabase = await createClient();

  // Get the request details
  const request = await getPatientRequest(requestId);
  if (!request) {
    throw new Error('Request not found');
  }

  // Find nearby providers that offer the requested service
  const { data: providers } = await supabase
    .rpc('find_nearby_providers', {
      user_lat: request.geo_lat,
      user_lon: request.geo_long,
      max_distance_miles: 20,
      service_filter: request.requested_service,
      limit_results: 10
    });

  if (!providers || providers.length === 0) {
    return [];
  }

  // Calculate match scores based on various factors
  const matches = providers.map((provider: any) => {
    let score = 1.0;
    
    // Distance factor (closer is better)
    const distanceFactor = Math.max(0, 1 - (provider.distance_miles / 20));
    score *= (0.3 + 0.7 * distanceFactor);
    
    // Wait time factor (lower wait time is better)
    if (provider.current_wait_time !== null) {
      const waitFactor = Math.max(0, 1 - (provider.current_wait_time / 120));
      score *= (0.5 + 0.5 * waitFactor);
    }
    
    // Urgency factor (urgent requests prefer providers with low wait times)
    if (request.urgency_level <= 2 && provider.current_wait_time !== null) {
      score *= provider.current_wait_time < 30 ? 1.2 : 0.8;
    }
    
    return {
      providerId: provider.provider_id,
      score: Math.min(1, score)
    };
  });

  // Sort by score (highest first)
  matches.sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Auto-match pending requests
 */
export async function autoMatchPendingRequests(): Promise<number> {
  const supabase = await createClient();

  // Get all pending requests
  const { data: requests, error } = await supabase
    .from('patient_requests')
    .select('*')
    .eq('status', 'pending')
    .order('urgency_level', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !requests) {
    console.error('Error getting pending requests:', error);
    return 0;
  }

  let matchedCount = 0;

  for (const request of requests) {
    try {
      const matches = await matchRequestWithProviders(request.id);
      
      if (matches.length > 0) {
        const bestMatch = matches[0];
        await updateRequestStatus(
          request.id,
          'matched',
          bestMatch.providerId,
          bestMatch.score
        );
        matchedCount++;
      }
    } catch (error) {
      console.error(`Error matching request ${request.id}:`, error);
    }
  }

  return matchedCount;
}

/**
 * Cancel a patient request
 */
export async function cancelPatientRequest(
  requestId: string,
  userId?: string
): Promise<boolean> {
  const supabase = await createClient();

  const query = supabase
    .from('patient_requests')
    .update({ status: 'cancelled' as RequestStatus })
    .eq('id', requestId);

  // If userId is provided, ensure the request belongs to the user
  if (userId) {
    query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error cancelling request:', error);
    return false;
  }

  return true;
}

/**
 * Get request statistics
 */
export async function getRequestStatistics(
  startDate?: string,
  endDate?: string
): Promise<{
  total: number;
  pending: number;
  matched: number;
  fulfilled: number;
  cancelled: number;
  byService: Record<ServiceType, number>;
  averageMatchScore: number;
}> {
  const supabase = await createClient();

  let query = supabase
    .from('patient_requests')
    .select('status, requested_service, match_score');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error getting request statistics:', error);
    return {
      total: 0,
      pending: 0,
      matched: 0,
      fulfilled: 0,
      cancelled: 0,
      byService: {} as Record<ServiceType, number>,
      averageMatchScore: 0
    };
  }

  const stats = {
    total: data.length,
    pending: 0,
    matched: 0,
    fulfilled: 0,
    cancelled: 0,
    byService: {} as Record<ServiceType, number>,
    totalMatchScore: 0,
    matchCount: 0
  };

  data.forEach((request) => {
    // Count by status
    stats[request.status]++;
    
    // Count by service
    if (!stats.byService[request.requested_service]) {
      stats.byService[request.requested_service] = 0;
    }
    stats.byService[request.requested_service]++;
    
    // Calculate average match score
    if (request.match_score !== null) {
      stats.totalMatchScore += request.match_score;
      stats.matchCount++;
    }
  });

  return {
    total: stats.total,
    pending: stats.pending,
    matched: stats.matched,
    fulfilled: stats.fulfilled,
    cancelled: stats.cancelled,
    byService: stats.byService,
    averageMatchScore: stats.matchCount > 0 
      ? stats.totalMatchScore / stats.matchCount 
      : 0
  };
}
