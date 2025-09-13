import { initTRPC, TRPCError } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * Context creation for tRPC
 * This is called for each request
 */
export async function createContext(opts?: FetchCreateContextFnOptions) {
  const supabase = await createClient();
  
  // Get the current user session
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    supabase,
    session,
    user: session?.user || null,
    headers: opts?.req.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialize tRPC with SuperJSON for better serialization
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Protected procedure that requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Admin procedure that requires admin role
 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }
  
  // Check if user has admin role in user metadata
  const { data: profile } = await ctx.supabase
    .from('profiles')
    .select('role')
    .eq('id', ctx.user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});
