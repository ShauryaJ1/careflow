import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../init';
import { triageRequestSchema, loadBalancingSchema } from '../validation';
import { TRPCError } from '@trpc/server';

/**
 * AI router for Gemini 2.5 Pro integration
 * Handles smart triage, load balancing, and recommendations
 */
export const aiRouter = createTRPCRouter({
  /**
   * Triage a patient request using AI
   * Determines urgency and best care modality
   */
  triageRequest: publicProcedure
    .input(triageRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // TODO: Integrate with Gemini 2.5 Pro
      // const response = await gemini.generateContent({
      //   model: "gemini-2.5-pro",
      //   prompt: `Triage this healthcare request...`,
      //   ...input
      // });

      // Simulate AI triage response
      const urgencyScore = Math.min(5, Math.max(1, 
        input.severity <= 3 ? 4 : 
        input.severity <= 6 ? 3 : 
        input.severity <= 8 ? 2 : 1
      ));

      const recommendedModality = 
        urgencyScore <= 2 ? 'in_person' :
        input.preferredModality === 'telehealth' && urgencyScore >= 3 ? 'telehealth' :
        'any';

      const triageResult = {
        urgencyLevel: urgencyScore,
        recommendedModality,
        estimatedWaitTime: urgencyScore <= 2 ? '< 30 minutes' : '1-2 hours',
        recommendedServices: ['urgent_care', 'general'] as any[],
        triageNotes: `Based on severity ${input.severity}/10 and symptoms: ${input.symptoms}`,
        confidence: 0.85
      };

      // Store triage result for analytics
      await supabase
        .from('triage_results')
        .insert({
          input: input,
          result: triageResult,
          created_at: new Date().toISOString()
        });

      return triageResult;
    }),

  /**
   * Smart load balancing for provider recommendations
   * Considers distance, capacity, fragility index, and wait times
   */
  getSmartRecommendations: protectedProcedure
    .input(loadBalancingSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get request details
      const { data: requests, error: requestError } = await supabase
        .from('patient_requests')
        .select('*')
        .in('id', input.requests);

      if (requestError || !requests) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Requests not found'
        });
      }

      // Get provider details
      const { data: providers, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .in('id', input.providers);

      if (providerError || !providers) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Providers not found'
        });
      }

      // TODO: Integrate with Gemini for smart matching
      // const response = await gemini.generateContent({
      //   model: "gemini-2.5-pro",
      //   prompt: `Match these patients with providers using smart load balancing...`,
      //   requests,
      //   providers,
      //   weights: input.weights
      // });

      // Simulate smart load balancing
      const weights = input.weights || {
        distance: 0.3,
        capacity: 0.3,
        fragility: 0.2,
        waitTime: 0.2
      };

      const recommendations = [];

      for (const request of requests) {
        const scores = await Promise.all(providers.map(async (provider) => {
          let score = 0;

          // Distance score
          if (request.geo_lat && request.geo_long && provider.geo_lat && provider.geo_long) {
            const { data: distance } = await supabase
              .rpc('calculate_distance', {
                lat1: request.geo_lat,
                lon1: request.geo_long,
                lat2: provider.geo_lat,
                lon2: provider.geo_long
              });
            
            const distanceScore = distance ? Math.max(0, 1 - (distance / 50)) : 0;
            score += distanceScore * weights.distance;
          }

          // Capacity score
          if (provider.capacity) {
            const capacityScore = provider.capacity > 50 ? 1 : provider.capacity / 50;
            score += capacityScore * weights.capacity;
          }

          // Fragility score (prioritize underserved areas)
          // In production, this would use actual fragility index data
          const fragilityScore = 
            provider.type === 'mobile' || provider.type === 'pop_up' ? 0.8 :
            provider.type === 'clinic' ? 0.5 : 0.3;
          score += fragilityScore * weights.fragility;

          // Wait time score
          if (provider.current_wait_time !== null) {
            const waitScore = Math.max(0, 1 - (provider.current_wait_time / 180));
            score += waitScore * weights.waitTime;
          }

          return {
            providerId: provider.id,
            providerName: provider.name,
            providerType: provider.type,
            requestId: request.id,
            score: Math.min(1, score),
            factors: {
              distance: weights.distance,
              capacity: weights.capacity,
              fragility: weights.fragility,
              waitTime: weights.waitTime
            }
          };
        }));

        // Sort by score and take top 3
        scores.sort((a, b) => b.score - a.score);
        recommendations.push({
          requestId: request.id,
          recommendations: scores.slice(0, 3)
        });
      }

      return recommendations;
    }),

  /**
   * Get network quality assessment for telehealth recommendation
   */
  assessTelehealthViability: publicProcedure
    .input(z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      connectionType: z.enum(['4g', '5g', 'wifi', 'ethernet', 'unknown']).optional(),
      bandwidth: z.number().optional() // in Mbps
    }))
    .query(async ({ ctx, input }) => {
      // Simulate network assessment
      // In production, this would use actual network data and coverage maps
      
      const minBandwidth = 1.5; // Minimum Mbps for video call
      const recommendedBandwidth = 5; // Recommended Mbps for HD video
      
      let viability = 'unknown';
      let confidence = 0.5;
      
      if (input.bandwidth) {
        if (input.bandwidth >= recommendedBandwidth) {
          viability = 'excellent';
          confidence = 0.95;
        } else if (input.bandwidth >= minBandwidth) {
          viability = 'good';
          confidence = 0.8;
        } else {
          viability = 'poor';
          confidence = 0.9;
        }
      } else if (input.connectionType) {
        // Estimate based on connection type
        const estimates = {
          'ethernet': { viability: 'excellent', confidence: 0.9 },
          'wifi': { viability: 'good', confidence: 0.75 },
          '5g': { viability: 'good', confidence: 0.8 },
          '4g': { viability: 'fair', confidence: 0.7 },
          'unknown': { viability: 'unknown', confidence: 0.3 }
        };
        
        const estimate = estimates[input.connectionType];
        viability = estimate.viability;
        confidence = estimate.confidence;
      }

      return {
        viability,
        confidence,
        minBandwidthMet: input.bandwidth ? input.bandwidth >= minBandwidth : null,
        recommendedBandwidthMet: input.bandwidth ? input.bandwidth >= recommendedBandwidth : null,
        recommendations: viability === 'poor' || viability === 'fair' 
          ? ['Consider in-person visit', 'Find location with better connectivity']
          : ['Telehealth is viable', 'Ensure quiet environment for call']
      };
    }),

  /**
   * Generate heatmap data for unmet demand
   */
  generateDemandHeatmap: protectedProcedure
    .input(z.object({
      bounds: z.object({
        north: z.number().min(-90).max(90),
        south: z.number().min(-90).max(90),
        east: z.number().min(-180).max(180),
        west: z.number().min(-180).max(180)
      }),
      gridSize: z.number().positive().default(0.01), // degrees
      metric: z.enum(['requests', 'wait_time', 'capacity', 'unmet_demand']).default('unmet_demand')
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Get all pending requests in bounds
      const { data: requests, error: requestError } = await supabase
        .from('patient_requests')
        .select('geo_lat, geo_long, urgency_level, requested_service')
        .eq('status', 'pending')
        .gte('geo_lat', input.bounds.south)
        .lte('geo_lat', input.bounds.north)
        .gte('geo_long', input.bounds.west)
        .lte('geo_long', input.bounds.east);

      if (requestError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get requests for heatmap',
          cause: requestError
        });
      }

      // Get all providers in bounds
      const { data: providers, error: providerError } = await supabase
        .from('providers')
        .select('geo_lat, geo_long, capacity, current_wait_time')
        .eq('is_active', true)
        .gte('geo_lat', input.bounds.south)
        .lte('geo_lat', input.bounds.north)
        .gte('geo_long', input.bounds.west)
        .lte('geo_long', input.bounds.east);

      if (providerError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get providers for heatmap',
          cause: providerError
        });
      }

      // Create grid
      const grid: Record<string, { 
        lat: number; 
        lng: number; 
        value: number; 
        requestCount: number;
        providerCount: number;
      }> = {};

      // Populate grid with requests
      requests?.forEach(request => {
        const gridLat = Math.floor(request.geo_lat / input.gridSize) * input.gridSize;
        const gridLng = Math.floor(request.geo_long / input.gridSize) * input.gridSize;
        const key = `${gridLat},${gridLng}`;
        
        if (!grid[key]) {
          grid[key] = {
            lat: gridLat + input.gridSize / 2,
            lng: gridLng + input.gridSize / 2,
            value: 0,
            requestCount: 0,
            providerCount: 0
          };
        }
        
        grid[key].requestCount++;
        grid[key].value = grid[key].requestCount; // Default to request count
      });

      // Add provider data to grid
      providers?.forEach(provider => {
        const gridLat = Math.floor(provider.geo_lat / input.gridSize) * input.gridSize;
        const gridLng = Math.floor(provider.geo_long / input.gridSize) * input.gridSize;
        const key = `${gridLat},${gridLng}`;
        
        if (!grid[key]) {
          grid[key] = {
            lat: gridLat + input.gridSize / 2,
            lng: gridLng + input.gridSize / 2,
            value: 0,
            requestCount: 0,
            providerCount: 0
          };
        }
        
        grid[key].providerCount++;
      });

      // Calculate metric values
      Object.values(grid).forEach(cell => {
        switch (input.metric) {
          case 'requests':
            cell.value = cell.requestCount;
            break;
          case 'unmet_demand':
            // Higher value where requests exceed provider capacity
            cell.value = Math.max(0, cell.requestCount - (cell.providerCount * 10));
            break;
          case 'capacity':
            cell.value = cell.providerCount * 10; // Assume average capacity of 10
            break;
          case 'wait_time':
            // Would need actual wait time data
            cell.value = cell.requestCount / Math.max(1, cell.providerCount);
            break;
        }
      });

      return {
        heatmapData: Object.values(grid).filter(cell => cell.value > 0),
        totalRequests: requests?.length || 0,
        totalProviders: providers?.length || 0,
        gridSize: input.gridSize,
        metric: input.metric
      };
    })
});
