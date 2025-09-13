// Database type definitions for CareFlow

export type ProviderType = 'clinic' | 'pharmacy' | 'telehealth' | 'hospital' | 'pop_up' | 'mobile' | 'urgent_care';

export type ServiceType = 'general' | 'dental' | 'maternal_care' | 'urgent_care' | 'mental_health' | 'pediatric' | 'vaccination' | 'specialty' | 'diagnostic';

export type RequestStatus = 'pending' | 'matched' | 'fulfilled' | 'cancelled';

export type AreaType = 'zip' | 'county' | 'grid' | 'city';

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface ProviderHours {
  [day: string]: {
    open: string;
    close: string;
  } | null;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  address?: string | null;
  geo_lat?: number | null;
  geo_long?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  hours?: ProviderHours | null;
  services: ServiceType[];
  insurance_accepted: string[];
  capacity?: number | null;
  current_wait_time?: number | null; // in minutes
  accepts_walk_ins: boolean;
  telehealth_available: boolean;
  languages_spoken: string[];
  accessibility_features?: string[] | null;
  rating?: number | null;
  total_reviews: number;
  is_active: boolean;
  last_verified: string; // ISO date string
  source?: string | null;
  metadata?: Record<string, any>;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface PopUpEvent {
  id: string;
  provider_id?: string | null;
  name: string;
  description?: string | null;
  date_start: string; // ISO date string
  date_end: string; // ISO date string
  address?: string | null;
  geo_lat?: number | null;
  geo_long?: number | null;
  services_offered: ServiceType[];
  capacity?: number | null;
  registration_required: boolean;
  registration_url?: string | null;
  cost_info?: string | null;
  is_free: boolean;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface PatientRequest {
  id: string;
  user_id?: string | null;
  geo_lat: number;
  geo_long: number;
  address?: string | null;
  requested_service: ServiceType;
  urgency_level: 1 | 2 | 3 | 4 | 5; // 1=emergency, 5=routine
  preferred_date?: string | null; // ISO date string
  preferred_time_slot?: TimeSlot | null;
  insurance_provider?: string | null;
  notes?: string | null;
  matched_provider_id?: string | null;
  match_score?: number | null; // 0.00 to 1.00
  status: RequestStatus;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface CacheSnapshot {
  id: string;
  cache_key: string;
  geo_area: string;
  area_type: AreaType;
  results_json: any; // This would be parsed JSON containing provider data
  result_count: number;
  last_updated: string; // ISO date string
  expires_at: string; // ISO date string
  created_at: string; // ISO date string
}

export interface ProviderMetrics {
  id: string;
  provider_id: string;
  date: string; // ISO date string
  total_requests: number;
  fulfilled_requests: number;
  average_wait_time?: number | null; // in minutes
  peak_hours?: Record<string, number> | null;
  created_at: string; // ISO date string
}

// Helper types for API responses
export interface NearbyProvider {
  provider_id: string;
  provider_name: string;
  provider_type: ProviderType;
  distance_miles: number;
  address?: string | null;
  phone?: string | null;
  services: ServiceType[];
  current_wait_time?: number | null;
}

// Form/Input types
export interface CreateProviderInput {
  name: string;
  type: ProviderType;
  address?: string;
  geo_lat?: number;
  geo_long?: number;
  phone?: string;
  email?: string;
  website?: string;
  hours?: ProviderHours;
  services?: ServiceType[];
  insurance_accepted?: string[];
  capacity?: number;
  accepts_walk_ins?: boolean;
  telehealth_available?: boolean;
  languages_spoken?: string[];
  accessibility_features?: string[];
}

export interface CreatePatientRequestInput {
  geo_lat: number;
  geo_long: number;
  address?: string;
  requested_service: ServiceType;
  urgency_level?: 1 | 2 | 3 | 4 | 5;
  preferred_date?: string;
  preferred_time_slot?: TimeSlot;
  insurance_provider?: string;
  notes?: string;
}

export interface CreatePopUpEventInput {
  provider_id?: string;
  name: string;
  description?: string;
  date_start: string;
  date_end: string;
  address?: string;
  geo_lat?: number;
  geo_long?: number;
  services_offered?: ServiceType[];
  capacity?: number;
  registration_required?: boolean;
  registration_url?: string;
  cost_info?: string;
  is_free?: boolean;
}

// Search/Filter types
export interface ProviderSearchParams {
  lat?: number;
  lng?: number;
  radius?: number; // in miles
  type?: ProviderType;
  services?: ServiceType[];
  insurance?: string;
  languages?: string[];
  accepts_walk_ins?: boolean;
  telehealth_available?: boolean;
  limit?: number;
  offset?: number;
}

export interface PopUpEventSearchParams {
  lat?: number;
  lng?: number;
  radius?: number; // in miles
  start_date?: string;
  end_date?: string;
  services?: ServiceType[];
  is_free?: boolean;
  limit?: number;
  offset?: number;
}

// Supabase Database Types
export interface Database {
  public: {
    Tables: {
      providers: {
        Row: Provider;
        Insert: Omit<Provider, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Provider, 'id' | 'created_at' | 'updated_at'>>;
      };
      pop_up_events: {
        Row: PopUpEvent;
        Insert: Omit<PopUpEvent, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PopUpEvent, 'id' | 'created_at' | 'updated_at'>>;
      };
      patient_requests: {
        Row: PatientRequest;
        Insert: Omit<PatientRequest, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PatientRequest, 'id' | 'created_at' | 'updated_at'>>;
      };
      cache_snapshots: {
        Row: CacheSnapshot;
        Insert: Omit<CacheSnapshot, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<CacheSnapshot, 'id' | 'created_at'>>;
      };
      provider_metrics: {
        Row: ProviderMetrics;
        Insert: Omit<ProviderMetrics, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ProviderMetrics, 'id' | 'created_at'>>;
      };
    };
    Functions: {
      calculate_distance: {
        Args: {
          lat1: number;
          lon1: number;
          lat2: number;
          lon2: number;
        };
        Returns: number;
      };
      find_nearby_providers: {
        Args: {
          user_lat: number;
          user_lon: number;
          max_distance_miles?: number;
          provider_type_filter?: ProviderType;
          service_filter?: ServiceType;
          limit_results?: number;
        };
        Returns: NearbyProvider[];
      };
    };
  };
}
