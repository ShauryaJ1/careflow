import { createTRPCRouter } from '../init';
import { providersRouter } from './providers';
import { requestsRouter } from './requests';
import { profilesRouter } from './profiles';

/**
 * Main application router
 * Core routers for CareFlow MVP
 */
export const appRouter = createTRPCRouter({
  providers: providersRouter,
  requests: requestsRouter,
  profiles: profilesRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
