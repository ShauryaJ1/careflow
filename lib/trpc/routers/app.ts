import { createTRPCRouter } from '../init';
import { providersRouter } from './providers';
import { requestsRouter } from './requests';
import { eventsRouter } from './events';
import { cacheRouter } from './cache';
import { scraperRouter } from './scraper';
import { aiRouter } from './ai';

/**
 * Main application router
 * Combines all sub-routers for the CareFlow application
 */
export const appRouter = createTRPCRouter({
  providers: providersRouter,
  requests: requestsRouter,
  events: eventsRouter,
  cache: cacheRouter,
  scraper: scraperRouter,
  ai: aiRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
