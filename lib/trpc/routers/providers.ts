import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '../init';
import {
  createProviderSchema,
  updateProviderSchema,
  searchProvidersSchema,
  nearbyProvidersSchema
} from '../validation';
import { TRPCError } from '@trpc/server';

export const providersRouter = createTRPCRouter({
  /**
   * Search providers with various filters
   * Used for patient-facing location-based search
   */
  search: publicProcedure
    .input(searchProvidersSchema)
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      let query = supabase
        .from('providers')
        .select('*')
        .eq('is_active', true);

      // Apply filters
      if (input.type) {
        query = query.eq('type', input.type);
      }

      if (input.services && input.services.length > 0) {
        query = query.contains('services', input.services);
      }

      if (input.insurance) {
        query = query.contains('insurance_accepted', [input.insurance]);
      }

      if (input.languages && input.languages.length > 0) {
        query = query.contains('languages_spoken', input.languages);
      }

      if (input.accepts_walk_ins !== undefined) {
        query = query.eq('accepts_walk_ins', input.accepts_walk_ins);
      }

      if (input.telehealth_available !== undefined) {
        query = query.eq('telehealth_available', input.telehealth_available);
      }

      // Pagination
      query = query.range(input.offset, input.offset + input.limit - 1);

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search providers',
          cause: error
        });
      }

      // Filter by distance if location provided
      if (input.lat && input.lng && data) {
        const filtered = [];
        
        for (const provider of data) {
          if (provider.geo_lat && provider.geo_long) {
            const { data: distance } = await supabase
              .rpc('calculate_distance', {
                lat1: input.lat,
                lon1: input.lng,
                lat2: provider.geo_lat,
                lon2: provider.geo_long
              });
            
            if (distance && distance <= input.radius) {
              filtered.push({
                ...provider,
                distance_miles: distance
              });
            }
          }
        }
        
        // Sort by distance
        filtered.sort((a, b) => a.distance_miles - b.distance_miles);
        
        return filtered;
      }

      return data || [];
    }),

  /**
   * Find nearby providers using PostGIS functions
   * Optimized for map display with Leaflet
   */
  findNearby: publicProcedure
    .input(nearbyProvidersSchema)
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .rpc('find_nearby_providers', {
          user_lat: input.lat,
          user_lon: input.lng,
          max_distance_miles: input.maxDistanceMiles,
          provider_type_filter: input.providerType || null,
          service_filter: input.serviceType || null,
          limit_results: input.limit
        });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to find nearby providers',
          cause: error
        });
      }

      return data || [];
    }),

  /**
   * Get a single provider by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Provider not found'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get provider',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Create a new provider (admin/provider only)
   */
  create: adminProcedure
    .input(createProviderSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('providers')
        .insert({
          ...input,
          is_active: true,
          total_reviews: 0,
          source: 'manual_entry'
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create provider',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Update a provider (admin/provider only)
   */
  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: updateProviderSchema
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('providers')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update provider',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Update provider wait time (provider/admin only)
   */
  updateWaitTime: protectedProcedure
    .input(z.object({
      providerId: z.string().uuid(),
      waitTimeMinutes: z.number().int().min(0)
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { error } = await supabase
        .from('providers')
        .update({ current_wait_time: input.waitTimeMinutes })
        .eq('id', input.providerId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update wait time',
          cause: error
        });
      }

      return { success: true };
    }),

  /**
   * Update provider capacity (provider/admin only)
   */
  updateCapacity: protectedProcedure
    .input(z.object({
      providerId: z.string().uuid(),
      capacity: z.number().int().positive()
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { error } = await supabase
        .from('providers')
        .update({ capacity: input.capacity })
        .eq('id', input.providerId);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update capacity',
          cause: error
        });
      }

      // Also log this in capacity_snapshots for tracking
      await supabase
        .from('capacity_snapshots')
        .insert({
          provider_id: input.providerId,
          capacity: input.capacity,
          timestamp: new Date().toISOString()
        });

      return { success: true };
    }),

  /**
   * Get providers with low wait times
   */
  getLowWaitTime: publicProcedure
    .input(z.object({
      maxWaitMinutes: z.number().int().positive().default(30),
      limit: z.number().int().positive().max(50).default(10)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)
        .lte('current_wait_time', input.maxWaitMinutes)
        .order('current_wait_time', { ascending: true })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get providers with low wait time',
          cause: error
        });
      }

      return data || [];
    }),

  /**
   * Get top-rated providers
   */
  getTopRated: publicProcedure
    .input(z.object({
      minRating: z.number().min(0).max(5).default(4.0),
      limit: z.number().int().positive().max(50).default(10)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('is_active', true)
        .gte('rating', input.minRating)
        .order('rating', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get top-rated providers',
          cause: error
        });
      }

      return data || [];
    }),

  /**
   * Delete a provider (admin only)
   */
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('providers')
        .update({ is_active: false })
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete provider',
          cause: error
        });
      }

      return { success: true };
    }),

  /**
   * Get provider metrics for analytics
   */
  getMetrics: protectedProcedure
    .input(z.object({
      providerId: z.string().uuid(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from('provider_metrics')
        .select('*')
        .eq('provider_id', input.providerId);

      if (input.startDate) {
        query = query.gte('date', input.startDate);
      }
      if (input.endDate) {
        query = query.lte('date', input.endDate);
      }

      const { data, error } = await query
        .order('date', { ascending: false });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get provider metrics',
          cause: error
        });
      }

      return data || [];
    })
});
