# CareFlow tRPC Setup Guide

## Overview

This project uses tRPC for end-to-end type-safe API calls, wrapping all database mutations, API calls, and integrations with external services like Trigger.dev and Gemini AI.

## Architecture

```
Client (React) → tRPC Client → API Route → tRPC Server → Supabase DB
                                         → Trigger.dev (Scrapers)
                                         → Gemini AI (Triage/Load Balancing)
```

## Database Setup

### 1. Run Migrations

Execute the SQL migrations in your Supabase dashboard:

1. Go to SQL Editor in Supabase
2. Run `supabase/migrations/001_create_tables.sql`
3. Run `supabase/migrations/002_additional_tables.sql`

### 2. Environment Variables

Copy `env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp env.local.example .env.local
```

## tRPC Structure

### Routers

- **`providers`** - Healthcare provider search and management
- **`requests`** - Patient request submission and matching
- **`events`** - Pop-up events and mobile services
- **`cache`** - Performance caching layer
- **`scraper`** - Data pipeline integration (Trigger.dev)
- **`ai`** - Smart triage and load balancing (Gemini)

### Key Features

#### 1. Provider Search (Location-Based)
```typescript
// Search providers with filters
const providers = trpc.providers.search.useQuery({
  lat: 34.0522,
  lng: -118.2437,
  radius: 10,
  type: 'urgent_care',
  services: ['vaccination'],
  telehealth_available: true
});

// Find nearby using PostGIS
const nearby = trpc.providers.findNearby.useMutation();
```

#### 2. Patient Requests
```typescript
// Submit a request
const createRequest = trpc.requests.create.useMutation();

// Get user's requests
const myRequests = trpc.requests.getUserRequests.useQuery();

// Smart matching with providers
const match = trpc.requests.matchWithProviders.useMutation();
```

#### 3. AI Integration
```typescript
// Triage a patient request
const triage = trpc.ai.triageRequest.useMutation({
  symptoms: "fever and cough",
  severity: 6,
  location: { lat: 34.05, lng: -118.24 }
});

// Get smart recommendations
const recommendations = trpc.ai.getSmartRecommendations.useMutation({
  algorithm: 'smart',
  weights: {
    distance: 0.3,
    capacity: 0.3,
    fragility: 0.2,
    waitTime: 0.2
  }
});

// Generate demand heatmap
const heatmap = trpc.ai.generateDemandHeatmap.useQuery({
  bounds: { north: 34.1, south: 34.0, east: -118.2, west: -118.3 },
  metric: 'unmet_demand'
});
```

#### 4. Pop-up Events
```typescript
// Search events
const events = trpc.events.search.useQuery({
  lat: 34.05,
  lng: -118.24,
  radius: 10,
  is_free: true
});

// Create event (provider/admin)
const createEvent = trpc.events.create.useMutation();
```

#### 5. Data Pipeline (Trigger.dev Ready)
```typescript
// Trigger scraper job
const scrapeData = trpc.scraper.triggerJob.useMutation({
  source: 'google',
  query: 'urgent care los angeles',
  location: { lat: 34.05, lng: -118.24, radius: 10 }
});

// Trigger hourly update
const hourlyUpdate = trpc.scraper.triggerHourlyUpdate.useMutation();
```

## Usage Examples

### In React Components

```tsx
import { trpc } from '@/lib/trpc/client';

function MyComponent() {
  // Query
  const { data, isLoading, error } = trpc.providers.search.useQuery({
    lat: 34.05,
    lng: -118.24
  });

  // Mutation
  const createRequest = trpc.requests.create.useMutation({
    onSuccess: (data) => {
      console.log('Request created:', data);
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  return (
    <button onClick={() => createRequest.mutate({ ... })}>
      Submit Request
    </button>
  );
}
```

### Authentication & Authorization

- **Public procedures** - Available to everyone
- **Protected procedures** - Require authentication
- **Admin procedures** - Require admin role

```typescript
// Public - anyone can search providers
trpc.providers.search.useQuery();

// Protected - must be logged in
trpc.requests.create.useMutation();

// Admin - requires admin role
trpc.scraper.triggerJob.useMutation();
```

## Real-time Updates

For real-time features, combine tRPC with Supabase Realtime:

```typescript
// Get subscription config from tRPC
const { data: config } = trpc.events.subscribeToArea.useQuery({
  lat: 34.05,
  lng: -118.24,
  radiusMiles: 10
});

// Use Supabase client for realtime
const channel = supabase
  .channel(config.channel)
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public',
    table: 'pop_up_events'
  }, (payload) => {
    console.log('New event:', payload);
  })
  .subscribe();
```

## Performance Optimization

### Caching Strategy

```typescript
// Check cache first
const cache = trpc.cache.get.useQuery({
  type: 'zip',
  identifier: '90210'
});

// If miss, fetch and cache
if (!cache.data) {
  const providers = await trpc.providers.search.useQuery();
  await trpc.cache.set.useMutation({
    key: { type: 'zip', identifier: '90210' },
    data: providers,
    expiresInMinutes: 60
  });
}
```

### Batch Queries

tRPC automatically batches requests:

```typescript
// These will be batched into a single HTTP request
const providers = trpc.providers.search.useQuery();
const events = trpc.events.getUpcoming.useQuery();
const requests = trpc.requests.getUserRequests.useQuery();
```

## Testing

```typescript
// Create a test client
import { appRouter } from '@/lib/trpc/routers/app';
import { createCallerFactory } from '@/lib/trpc/init';

const createCaller = createCallerFactory(appRouter);
const caller = createCaller({
  supabase: mockSupabase,
  session: mockSession,
  user: mockUser
});

// Test procedures
const result = await caller.providers.search({
  lat: 34.05,
  lng: -118.24
});
```

## Deployment Checklist

- [ ] Set environment variables in Vercel/production
- [ ] Run database migrations
- [ ] Enable RLS policies in Supabase
- [ ] Configure Trigger.dev for scraper jobs
- [ ] Set up Gemini API key for AI features
- [ ] Enable PostGIS extension in Supabase
- [ ] Configure rate limiting in Vercel Edge Middleware

## Next Steps

1. **Integrate Trigger.dev** for hourly scraper jobs
2. **Add Gemini 2.5 Pro** for smart triage and load balancing
3. **Implement Leaflet maps** for visualization
4. **Set up PWA** for offline support
5. **Add Supabase Realtime** for live updates
6. **Implement Framer Motion** for UI animations

## Troubleshooting

### Common Issues

1. **"UNAUTHORIZED" error** - Check if user is logged in
2. **"FORBIDDEN" error** - User doesn't have required role
3. **Type errors** - Run `npm run type-check`
4. **Database errors** - Check RLS policies and migrations

### Debug Mode

Enable tRPC logging in development:

```typescript
// In lib/trpc/provider.tsx
loggerLink({
  enabled: true // Always log in development
})
```
