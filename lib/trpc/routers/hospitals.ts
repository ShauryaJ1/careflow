import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../init';
import {
  createHospitalSchema,
  updateHospitalSchema,
  searchHospitalsSchema,
  typeOfCareSchema
} from '../validation';
import { TRPCError } from '@trpc/server';

export const hospitalsRouter = createTRPCRouter({
  /**
   * Search hospitals with various filters
   * Used for patient-facing location-based search
   */
  search: publicProcedure
    .input(searchHospitalsSchema)
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      let query = supabase
        .from('hospitals')
        .select('*');

      // Filter by active hospitals (not ended)
      query = query.or('end_at.is.null,end_at.gte.now()');

      // Apply filters
      if (input.city) {
        query = query.ilike('city', `%${input.city}%`);
      }

      if (input.state) {
        // Use exact match for state abbreviations (already normalized on frontend)
        query = query.eq('state', input.state.toUpperCase());
      }

      if (input.zip_code) {
        query = query.eq('zip_code', input.zip_code);
      }

      if (input.type_of_care) {
        if (Array.isArray(input.type_of_care)) {
          query = query.in('type_of_care', input.type_of_care);
        } else {
          query = query.eq('type_of_care', input.type_of_care);
        }
      }

      // Pagination
      query = query.range(input.offset, input.offset + input.limit - 1);

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search hospitals',
          cause: error
        });
      }

      // Filter by distance if location provided
      if (input.lat && input.lng && data) {
        const filtered = [];
        
        for (const hospital of data) {
          if (hospital.location) {
            // Calculate distance using PostGIS function
            const { data: distance } = await supabase
              .rpc('calculate_distance', {
                lat1: input.lat,
                lon1: input.lng,
                lat2: hospital.location.coordinates[1], // latitude
                lon2: hospital.location.coordinates[0]  // longitude
              });
            
            if (distance && distance <= input.radius) {
              filtered.push({
                ...hospital,
                distance_miles: distance
              });
            }
          } else if (hospital.address) {
            // If no location data, include it but without distance
            filtered.push({
              ...hospital,
              distance_miles: null
            });
          }
        }
        
        // Sort by distance (null distances at the end)
        filtered.sort((a, b) => {
          if (a.distance_miles === null) return 1;
          if (b.distance_miles === null) return -1;
          return a.distance_miles - b.distance_miles;
        });
        
        return filtered;
      }

      return data || [];
    }),

  /**
   * Get a single hospital by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Hospital not found'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch hospital',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Create a new hospital (provider only)
   */
  create: protectedProcedure
    .input(createHospitalSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      
      // Check if user is a provider
      const { data: provider } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!provider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only providers can create hospitals'
        });
      }

      // Clean up empty strings
      const cleanedInput = {
        ...input,
        website: input.website === '' ? null : input.website,
        email: input.email === '' ? null : input.email,
        start_at: input.start_at || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('hospitals')
        .insert(cleanedInput)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create hospital',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Update a hospital (provider only)
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: updateHospitalSchema
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      
      // Check if user is a provider
      const { data: provider } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!provider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only providers can update hospitals'
        });
      }

      // Clean up empty strings
      const cleanedData = {
        ...input.data,
        website: input.data.website === '' ? null : input.data.website,
        email: input.data.email === '' ? null : input.data.email,
      };

      const { data, error } = await supabase
        .from('hospitals')
        .update(cleanedData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Hospital not found'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update hospital',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Delete a hospital (provider only)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      
      // Check if user is a provider
      const { data: provider } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!provider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only providers can delete hospitals'
        });
      }
      
      const { error } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', input.id);

      if (error) {
        if (error.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Hospital not found'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete hospital',
          cause: error
        });
      }

      return { success: true };
    }),

  /**
   * List all hospitals (with pagination)
   */
  list: publicProcedure
    .input(z.object({
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .or('end_at.is.null,end_at.gte.now()')
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list hospitals',
          cause: error
        });
      }

      return data || [];
    }),

  /**
   * Calculate wait time cooldown for a hospital
   * Uses API or averages from nearby hospitals
   */
  calculateCooldown: publicProcedure
    .input(z.object({
      hospitalId: z.string().uuid(),
      useApi: z.boolean().default(true)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      // Get the hospital details
      const { data: hospital, error: hospitalError } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', input.hospitalId)
        .single();

      if (hospitalError || !hospital) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Hospital not found'
        });
      }

      // If using API, this would be where we'd call external APIs
      // For now, we'll calculate from nearby hospitals
      
      // Find hospitals in the same zip code
      let { data: nearbyHospitals } = await supabase
        .from('hospitals')
        .select('cooldown')
        .eq('zip_code', hospital.zip_code)
        .neq('id', input.hospitalId)
        .not('cooldown', 'is', null)
        .limit(5);

      // If not enough in zip code, try city
      if (!nearbyHospitals || nearbyHospitals.length < 5) {
        const { data: cityHospitals } = await supabase
          .from('hospitals')
          .select('cooldown')
          .eq('city', hospital.city)
          .eq('state', hospital.state)
          .neq('id', input.hospitalId)
          .not('cooldown', 'is', null)
          .limit(5);
        
        nearbyHospitals = cityHospitals;
      }

      // If still not enough, try state
      if (!nearbyHospitals || nearbyHospitals.length < 5) {
        const { data: stateHospitals } = await supabase
          .from('hospitals')
          .select('cooldown')
          .eq('state', hospital.state)
          .neq('id', input.hospitalId)
          .not('cooldown', 'is', null)
          .limit(5);
        
        nearbyHospitals = stateHospitals;
      }

      if (!nearbyHospitals || nearbyHospitals.length === 0) {
        return {
          cooldown: null,
          method: 'no_data',
          message: 'No nearby hospitals with cooldown data'
        };
      }

      // Calculate average cooldown
      const totalCooldown = nearbyHospitals.reduce((sum, h) => sum + (h.cooldown || 0), 0);
      const averageCooldown = totalCooldown / nearbyHospitals.length;

      // Update the hospital with the calculated cooldown
      await supabase
        .from('hospitals')
        .update({ cooldown: averageCooldown })
        .eq('id', input.hospitalId);

      return {
        cooldown: averageCooldown,
        method: 'averaged',
        samples: nearbyHospitals.length,
        message: `Averaged from ${nearbyHospitals.length} nearby hospitals`
      };
    }),

  /**
   * Find hospitals with shortest wait time
   * Combines travel time and wait score
   */
  findShortestWait: publicProcedure
    .input(z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radius: z.number().positive().default(25),
      type_of_care: typeOfCareSchema.optional(),
      limit: z.number().int().positive().max(10).default(5)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      // Search for hospitals within radius
      let query = supabase
        .from('hospitals')
        .select('*')
        .or('end_at.is.null,end_at.gte.now()');

      if (input.type_of_care) {
        query = query.eq('type_of_care', input.type_of_care);
      }

      const { data: hospitals, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search hospitals',
          cause: error
        });
      }

      if (!hospitals || hospitals.length === 0) {
        return [];
      }

      // Calculate distance and total time for each hospital
      const hospitalsWithTime = [];
      
      for (const hospital of hospitals) {
        if (hospital.location) {
          const { data: distance } = await supabase
            .rpc('calculate_distance', {
              lat1: input.lat,
              lon1: input.lng,
              lat2: hospital.location.coordinates[1],
              lon2: hospital.location.coordinates[0]
            });
          
          if (distance && distance <= input.radius) {
            // Estimate travel time (assuming 30 mph average speed)
            const travelTimeMinutes = (distance / 30) * 60;
            
            // Use wait_score if available, otherwise use a default
            const waitTimeMinutes = hospital.wait_score || 30;
            
            const totalTimeMinutes = travelTimeMinutes + waitTimeMinutes;
            
            hospitalsWithTime.push({
              ...hospital,
              distance_miles: distance,
              travel_time_minutes: Math.round(travelTimeMinutes),
              wait_time_minutes: waitTimeMinutes,
              total_time_minutes: Math.round(totalTimeMinutes)
            });
          }
        }
      }

      // Sort by total time and return top results
      hospitalsWithTime.sort((a, b) => a.total_time_minutes - b.total_time_minutes);
      
      return hospitalsWithTime.slice(0, input.limit);
    })
});
