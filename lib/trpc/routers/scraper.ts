import { z } from 'zod';
import { createTRPCRouter, publicProcedure, adminProcedure } from '../init';
import { scraperJobSchema } from '../validation';
import { TRPCError } from '@trpc/server';

/**
 * Scraper router for Trigger.dev integration
 * Handles data pipeline for fetching provider information
 */
export const scraperRouter = createTRPCRouter({
  /**
   * Trigger a scraper job
   * This would integrate with Trigger.dev in production
   */
  triggerJob: adminProcedure
    .input(scraperJobSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // In production, this would trigger a Trigger.dev job
      // For now, we'll simulate by creating a job record
      const jobId = crypto.randomUUID();
      
      // Log the scraper job request
      const { error } = await supabase
        .from('scraper_jobs')
        .insert({
          id: jobId,
          source: input.source,
          query: input.query,
          location: input.location,
          max_results: input.maxResults,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log scraper job:', error);
      }

      // TODO: Integrate with Trigger.dev
      // const job = await trigger.sendEvent({
      //   name: "scraper.job",
      //   payload: {
      //     jobId,
      //     ...input
      //   }
      // });

      return {
        jobId,
        status: 'pending',
        message: 'Scraper job queued for processing'
      };
    }),

  /**
   * Trigger hourly update job for all providers
   * This would be called by a CRON job
   */
  triggerHourlyUpdate: adminProcedure
    .mutation(async ({ ctx }) => {
      const { supabase } = ctx;

      // Get all unique locations from providers
      const { data: locations, error } = await supabase
        .from('providers')
        .select('geo_lat, geo_long')
        .not('geo_lat', 'is', null)
        .not('geo_long', 'is', null);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get provider locations',
          cause: error
        });
      }

      // Group locations into clusters
      const clusters = new Map<string, { lat: number; lng: number; count: number }>();
      
      locations?.forEach(loc => {
        // Round to 1 decimal place for clustering
        const key = `${loc.geo_lat.toFixed(1)},${loc.geo_long.toFixed(1)}`;
        const existing = clusters.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          clusters.set(key, {
            lat: loc.geo_lat,
            lng: loc.geo_long,
            count: 1
          });
        }
      });

      // Trigger scraper jobs for each cluster
      const jobs = [];
      for (const [key, cluster] of clusters) {
        // TODO: Trigger actual Trigger.dev job
        jobs.push({
          location: key,
          lat: cluster.lat,
          lng: cluster.lng,
          providerCount: cluster.count
        });
      }

      return {
        clustersProcessed: clusters.size,
        jobs: jobs
      };
    }),

  /**
   * Get scraper job status
   */
  getJobStatus: publicProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('scraper_jobs')
        .select('*')
        .eq('id', input.jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Job not found'
          });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get job status',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Process scraped data and update database
   * This would be called by Trigger.dev webhook
   */
  processScrapedData: adminProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      results: z.array(z.object({
        name: z.string(),
        type: z.string(),
        address: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        hours: z.any().optional(),
        services: z.array(z.string()).optional(),
        lat: z.number().optional(),
        lng: z.number().optional()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;

      // Process each scraped result
      const processed = [];
      const errors = [];

      for (const result of input.results) {
        try {
          // Check if provider already exists
          const { data: existing } = await supabase
            .from('providers')
            .select('id')
            .eq('name', result.name)
            .eq('address', result.address || '')
            .single();

          if (existing) {
            // Update existing provider
            const { error } = await supabase
              .from('providers')
              .update({
                phone: result.phone,
                website: result.website,
                hours: result.hours,
                services: result.services,
                last_verified: new Date().toISOString(),
                source: `scraper_${input.jobId}`
              })
              .eq('id', existing.id);

            if (error) throw error;
            processed.push({ id: existing.id, action: 'updated' });
          } else {
            // Create new provider
            const { data, error } = await supabase
              .from('providers')
              .insert({
                name: result.name,
                type: result.type as any,
                address: result.address,
                geo_lat: result.lat,
                geo_long: result.lng,
                phone: result.phone,
                website: result.website,
                hours: result.hours,
                services: result.services as any[],
                is_active: true,
                source: `scraper_${input.jobId}`,
                last_verified: new Date().toISOString()
              })
              .select()
              .single();

            if (error) throw error;
            processed.push({ id: data.id, action: 'created' });
          }
        } catch (error) {
          errors.push({
            name: result.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update job status
      await supabase
        .from('scraper_jobs')
        .update({
          status: 'completed',
          results_count: processed.length,
          errors_count: errors.length,
          completed_at: new Date().toISOString()
        })
        .eq('id', input.jobId);

      return {
        processed: processed.length,
        errors: errors.length,
        details: {
          processed,
          errors
        }
      };
    }),

  /**
   * Get recent scraper jobs
   */
  getRecentJobs: adminProcedure
    .input(z.object({
      limit: z.number().int().positive().max(100).default(20)
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('scraper_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recent jobs',
          cause: error
        });
      }

      return data || [];
    })
});
