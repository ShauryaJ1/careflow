import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createContext } from '@/lib/trpc/init';
import { appRouter } from '@/lib/trpc/routers/app';

const handler = (request: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
