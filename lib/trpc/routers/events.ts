import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '../init';
import {
  createPopUpEventSchema,
  searchPopUpEventsSchema
} from '../validation';
import { TRPCError } from '@trpc/server';

export const eventsRouter = createTRPCRouter({
  /**
   * Search for pop-up events
   */
  search: publicProcedure
    .input(searchPopUpEventsSchema)
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      let query = supabase
        .from('pop_up_events')
        .select('*, providers(name, type, address)')
        .gte('date_end', new Date().toISOString());

      // Filter by date range
      if (input.start_date) {
        query = query.gte('date_start', input.start_date);
      }
      if (input.end_date) {
        query = query.lte('date_end', input.end_date);
      }

      // Filter by services
      if (input.services && input.services.length > 0) {
        query = query.contains('services_offered', input.services);
      }

      // Filter by free events
      if (input.is_free !== undefined) {
        query = query.eq('is_free', input.is_free);
      }

      // Apply pagination
      query = query.range(input.offset, input.offset + input.limit - 1)
        .order('date_start', { ascending: true });

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search events',
          cause: error
        });
      }

      // Filter by distance if location provided
      if (input.lat && input.lng && data) {
        const filtered = [];
        
        for (const event of data) {
          if (event.geo_lat && event.geo_long) {
            const { data: distance } = await supabase
              .rpc('calculate_distance', {
                lat1: input.lat,
                lon1: input.lng,
                lat2: event.geo_lat,
                lon2: event.geo_long
              });
            
            if (distance && distance <= input.radius) {
              filtered.push({
                ...event,
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
   * Get upcoming events
   */
  getUpcoming: publicProcedure
    .input(z.object({
      limit: z.number().int().positive().max(100).default(20),
      daysAhead: z.number().int().positive().default(30)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.daysAhead);

      const { data, error } = await supabase
        .from('pop_up_events')
        .select('*, providers(name, type, address)')
        .gte('date_start', new Date().toISOString())
        .lte('date_start', futureDate.toISOString())
        .order('date_start', { ascending: true })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get upcoming events',
          cause: error
        });
      }

      return data || [];
    }),

  /**
   * Get a single event by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('pop_up_events')
        .select('*, providers(name, type, address, phone, website)')
        .eq('id', input.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Event not found'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get event',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Create a new pop-up event (provider/admin only)
   */
  create: protectedProcedure
    .input(createPopUpEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('pop_up_events')
        .insert(input)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create event',
          cause: error
        });
      }

      // Broadcast new event via Realtime (providers listening will get notified)
      // This happens automatically via Supabase Realtime

      return data;
    }),

  /**
   * Update a pop-up event (provider/admin only)
   */
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: createPopUpEventSchema.partial()
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('pop_up_events')
        .update(input.data)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update event',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Delete a pop-up event (provider/admin only)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { error } = await supabase
        .from('pop_up_events')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete event',
          cause: error
        });
      }

      return { success: true };
    }),

  /**
   * Get events by provider
   */
  getByProvider: publicProcedure
    .input(z.object({
      providerId: z.string().uuid(),
      includeExpired: z.boolean().default(false)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from('pop_up_events')
        .select('*')
        .eq('provider_id', input.providerId)
        .order('date_start', { ascending: false });

      if (!input.includeExpired) {
        query = query.gte('date_end', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get provider events',
          cause: error
        });
      }

      return data || [];
    }),

  /**
   * Subscribe to realtime event updates for an area
   * Returns a subscription configuration for the client
   */
  subscribeToArea: publicProcedure
    .input(z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radiusMiles: z.number().positive().default(10)
    }))
    .query(({ input }) => {
      // Return configuration for client-side Supabase Realtime subscription
      return {
        channel: `events:${input.lat.toFixed(2)}:${input.lng.toFixed(2)}`,
        filters: {
          lat: input.lat,
          lng: input.lng,
          radius: input.radiusMiles
        }
      };
    })
});
