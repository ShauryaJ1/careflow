import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from '../init';
import {
  createPatientRequestSchema,
  updateRequestStatusSchema
} from '../validation';
import { TRPCError } from '@trpc/server';

export const requestsRouter = createTRPCRouter({
  /**
   * Create a new patient request
   * This triggers the demand signal system
   */
  create: publicProcedure
    .input(createPatientRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      const { data, error } = await supabase
        .from('patient_requests')
        .insert({
          ...input,
          user_id: user?.id,
          status: 'pending',
          urgency_level: input.urgency_level || 3
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create patient request',
          cause: error
        });
      }

      // TODO: Add auto-matching when scraper pipeline is ready

      return data;
    }),

  /**
   * Get user's requests
   */
  getUserRequests: protectedProcedure
    .input(z.object({
      limit: z.number().int().positive().max(100).default(50),
      offset: z.number().int().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      const { data, error } = await supabase
        .from('patient_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get user requests',
          cause: error
        });
      }

      return data || [];
    }),

  /**
   * Get a single request by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('patient_requests')
        .select('*, providers!matched_provider_id(*)')
        .eq('id', input.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Request not found'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get request',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Update request status (admin/provider)
   */
  updateStatus: protectedProcedure
    .input(updateRequestStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const updates: any = { status: input.status };
      
      if (input.matchedProviderId) {
        updates.matched_provider_id = input.matchedProviderId;
      }
      
      if (input.matchScore !== undefined) {
        updates.match_score = input.matchScore;
      }

      const { data, error } = await supabase
        .from('patient_requests')
        .update(updates)
        .eq('id', input.requestId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update request status',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Cancel a request
   */
  cancel: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;

      const { error } = await supabase
        .from('patient_requests')
        .update({ status: 'cancelled' })
        .eq('id', input.requestId)
        .eq('user_id', user.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to cancel request',
          cause: error
        });
      }

      return { success: true };
    }),

  /**
   * Get pending requests by area (for providers)
   * This feeds the heatmap visualization
   */
  getPendingByArea: protectedProcedure
    .input(z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radiusMiles: z.number().positive().default(10)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get all pending requests
      const { data: requests, error } = await supabase
        .from('patient_requests')
        .select('*')
        .eq('status', 'pending')
        .order('urgency_level', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get pending requests',
          cause: error
        });
      }

      if (!requests) return [];

      // Filter by distance
      const filtered = [];
      for (const request of requests) {
        const { data: distance } = await supabase
          .rpc('calculate_distance', {
            lat1: input.lat,
            lon1: input.lng,
            lat2: request.geo_lat,
            lon2: request.geo_long
          });
        
        if (distance && distance <= input.radiusMiles) {
          filtered.push({
            ...request,
            distance_miles: distance
          });
        }
      }

      return filtered;
    }),

  /**
   * Get urgent requests (for provider dashboard)
   */
  getUrgent: protectedProcedure
    .input(z.object({
      maxUrgencyLevel: z.number().int().min(1).max(5).default(2),
      limit: z.number().int().positive().max(100).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('patient_requests')
        .select('*')
        .eq('status', 'pending')
        .lte('urgency_level', input.maxUrgencyLevel)
        .order('urgency_level', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get urgent requests',
          cause: error
        });
      }

      return data || [];
    }),

  /**
   * Match a request with providers using smart load balancing
   */
  matchWithProviders: protectedProcedure
    .input(z.object({
      requestId: z.string().uuid(),
      algorithm: z.enum(['distance', 'capacity', 'fragility', 'smart']).default('smart')
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('patient_requests')
        .select('*')
        .eq('id', input.requestId)
        .single();

      if (requestError || !request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Request not found'
        });
      }

      // Find nearby providers
      const { data: providers } = await supabase
        .rpc('find_nearby_providers', {
          user_lat: request.geo_lat,
          user_lon: request.geo_long,
          max_distance_miles: 20,
          service_filter: request.requested_service,
          limit_results: 10
        });

      if (!providers || providers.length === 0) {
        return { matches: [] };
      }

      // Calculate match scores based on algorithm
      interface MatchScore {
        providerId: string;
        providerName: string;
        distance: number;
        waitTime: number | null;
        score: number;
      }
      
      const matches: MatchScore[] = providers.map((provider: any) => {
        let score = 1.0;
        
        if (input.algorithm === 'distance' || input.algorithm === 'smart') {
          const distanceFactor = Math.max(0, 1 - (provider.distance_miles / 20));
          score *= (0.3 + 0.7 * distanceFactor);
        }
        
        if (input.algorithm === 'capacity' || input.algorithm === 'smart') {
          if (provider.current_wait_time !== null) {
            const waitFactor = Math.max(0, 1 - (provider.current_wait_time / 120));
            score *= (0.5 + 0.5 * waitFactor);
          }
        }
        
        if (input.algorithm === 'fragility' || input.algorithm === 'smart') {
          // Prioritize rural/underserved areas
          // This would use actual fragility index data in production
          if (provider.provider_type === 'mobile' || provider.provider_type === 'pop_up') {
            score *= 1.2;
          }
        }
        
        // Urgency factor
        if (request.urgency_level <= 2 && provider.current_wait_time !== null) {
          score *= provider.current_wait_time < 30 ? 1.2 : 0.8;
        }
        
        return {
          providerId: provider.provider_id,
          providerName: provider.provider_name,
          distance: provider.distance_miles,
          waitTime: provider.current_wait_time,
          score: Math.min(1, score)
        };
      });

      // Sort by score
      matches.sort((a, b) => b.score - a.score);

      // Update request with best match
      if (matches.length > 0) {
        const bestMatch = matches[0];
        await supabase
          .from('patient_requests')
          .update({
            status: 'matched',
            matched_provider_id: bestMatch.providerId,
            match_score: bestMatch.score
          })
          .eq('id', input.requestId);
      }

      return { matches };
    }),

  /**
   * Get request statistics for analytics
   */
  getStatistics: protectedProcedure
    .input(z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      let query = supabase
        .from('patient_requests')
        .select('status, requested_service, match_score, urgency_level, created_at');

      if (input.startDate) {
        query = query.gte('created_at', input.startDate);
      }
      if (input.endDate) {
        query = query.lte('created_at', input.endDate);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get statistics',
          cause: error
        });
      }

      if (!data) {
        return {
          total: 0,
          byStatus: {},
          byService: {},
          byUrgency: {},
          averageMatchScore: 0
        };
      }

      const stats = {
        total: data.length,
        byStatus: {} as Record<string, number>,
        byService: {} as Record<string, number>,
        byUrgency: {} as Record<number, number>,
        totalMatchScore: 0,
        matchCount: 0
      };

      data.forEach((request) => {
        // Count by status
        stats.byStatus[request.status] = (stats.byStatus[request.status] || 0) + 1;
        
        // Count by service
        stats.byService[request.requested_service] = (stats.byService[request.requested_service] || 0) + 1;
        
        // Count by urgency
        stats.byUrgency[request.urgency_level] = (stats.byUrgency[request.urgency_level] || 0) + 1;
        
        // Calculate average match score
        if (request.match_score !== null) {
          stats.totalMatchScore += request.match_score;
          stats.matchCount++;
        }
      });

      return {
        total: stats.total,
        byStatus: stats.byStatus,
        byService: stats.byService,
        byUrgency: stats.byUrgency,
        averageMatchScore: stats.matchCount > 0 
          ? stats.totalMatchScore / stats.matchCount 
          : 0
      };
    }),

  /**
   * Batch process pending requests (admin only)
   * This would be triggered by a CRON job in production
   */
  autoMatchPending: adminProcedure
    .mutation(async ({ ctx }) => {
      const { supabase } = ctx;

      // Get all pending requests
      const { data: requests, error } = await supabase
        .from('patient_requests')
        .select('*')
        .eq('status', 'pending')
        .order('urgency_level', { ascending: true })
        .order('created_at', { ascending: true });

      if (error || !requests) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get pending requests',
          cause: error
        });
      }

      let matchedCount = 0;

      for (const request of requests) {
        try {
          // Find and match providers
          const { data: matches } = await supabase
            .rpc('match_request_with_providers', { request_id: request.id });
          
          if (matches && matches.length > 0) {
            const bestMatch = matches[0];
            await supabase
              .from('patient_requests')
              .update({
                status: 'matched',
                matched_provider_id: bestMatch.provider_id,
                match_score: bestMatch.score
              })
              .eq('id', request.id);
            
            matchedCount++;
          }
        } catch (error) {
          console.error(`Error matching request ${request.id}:`, error);
        }
      }

      return { 
        processed: requests.length,
        matched: matchedCount 
      };
    })
});
