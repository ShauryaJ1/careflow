import { z } from 'zod';
import { createTRPCRouter, publicProcedure, adminProcedure } from '../init';
import { cacheKeySchema, setCacheSchema } from '../validation';
import { TRPCError } from '@trpc/server';

export const cacheRouter = createTRPCRouter({
  /**
   * Get cached data for a specific area
   */
  get: publicProcedure
    .input(cacheKeySchema)
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      const cacheKey = `${input.type}:${input.identifier}`;
      
      const { data, error } = await supabase
        .from('cache_snapshots')
        .select('*')
        .eq('cache_key', cacheKey)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Cache miss - return null
          return null;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get cache',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Set cache data (admin only)
   */
  set: adminProcedure
    .input(setCacheSchema)
    .mutation(async ({ ctx, input }) => {
      const { supabase } = ctx;
      
      const cacheKey = `${input.key.type}:${input.key.identifier}`;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + input.expiresInMinutes);

      const { data, error } = await supabase
        .from('cache_snapshots')
        .upsert({
          cache_key: cacheKey,
          geo_area: input.key.identifier,
          area_type: input.key.type,
          results_json: input.data,
          result_count: Array.isArray(input.data) ? input.data.length : 1,
          expires_at: expiresAt.toISOString(),
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'cache_key'
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to set cache',
          cause: error
        });
      }

      return data;
    }),

  /**
   * Clear expired cache entries (admin only)
   */
  clearExpired: adminProcedure
    .mutation(async ({ ctx }) => {
      const { supabase } = ctx;

      const { data, error } = await supabase
        .from('cache_snapshots')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear expired cache',
          cause: error
        });
      }

      return { cleared: data?.length || 0 };
    }),

  /**
   * Clear all cache (admin only)
   */
  clearAll: adminProcedure
    .mutation(async ({ ctx }) => {
      const { supabase } = ctx;

      const { error } = await supabase
        .from('cache_snapshots')
        .delete()
        .neq('cache_key', '');

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to clear cache',
          cause: error
        });
      }

      return { success: true };
    }),

  /**
   * Get cache statistics
   */
  getStats: adminProcedure
    .query(async ({ ctx }) => {
      const { supabase } = ctx;

      const { data: total, error: totalError } = await supabase
        .from('cache_snapshots')
        .select('*', { count: 'exact', head: true });

      const { data: expired, error: expiredError } = await supabase
        .from('cache_snapshots')
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', new Date().toISOString());

      if (totalError || expiredError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get cache stats'
        });
      }

      return {
        total: total?.count || 0,
        expired: expired?.count || 0,
        active: (total?.count || 0) - (expired?.count || 0)
      };
    })
});
