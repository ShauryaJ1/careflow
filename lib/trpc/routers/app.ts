import { createTRPCRouter } from '../init';
import { providersRouter } from './providers';
import { requestsRouter } from './requests';

/**
 * Main application router
 * Core routers for CareFlow MVP
 */
export const appRouter = createTRPCRouter({
  providers: providersRouter,
  requests: requestsRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
