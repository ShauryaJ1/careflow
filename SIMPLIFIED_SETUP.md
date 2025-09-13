# CareFlow MVP - Simplified Setup

## Current Implementation

We've simplified the tRPC setup to focus on the core MVP features. Here's what's currently implemented:

### ✅ Core Features Ready

#### 1. **Provider Search & Management**
- Location-based provider search
- Find nearby providers using PostGIS
- Update wait times and capacity
- Get top-rated and low-wait providers

#### 2. **Patient Requests**
- Submit healthcare requests
- View user's request history
- Smart matching with providers (basic algorithm)
- Request status tracking

### 📦 Installed Dependencies

```json
{
  "ai": "5.0.44",                        // Vercel AI SDK
  "@ai-sdk/openai": "2.0.30",           // OpenAI provider
  "exa-js": "1.9.3",                     // Exa AI for search
  "@browserbasehq/stagehand": "2.5.0",  // Web scraping
  "zod": "3.23.8",                       // Validation
  "dotenv": "16.4.7"                     // Environment variables
}
```

### 🗂️ Project Structure

```
lib/trpc/
├── init.ts              # tRPC initialization & context
├── client.ts            # tRPC React client
├── provider.tsx         # tRPC provider component
├── validation.ts        # Zod schemas
└── routers/
    ├── app.ts          # Main router
    ├── providers.ts    # Provider endpoints
    └── requests.ts     # Patient request endpoints
```

### 🔑 Environment Variables

Create `.env.local`:
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key

# Optional for future features
SUPABASE_SERVICE_ROLE_KEY=your-service-key
EXA_API_KEY=your-exa-key
OPENAI_API_KEY=your-openai-key
```

## Usage Examples

### Search Providers
```typescript
const { data } = trpc.providers.search.useQuery({
  lat: 34.0522,
  lng: -118.2437,
  radius: 10,
  type: 'urgent_care'
});
```

### Submit Patient Request
```typescript
const createRequest = trpc.requests.create.useMutation();

createRequest.mutate({
  geo_lat: 34.0522,
  geo_long: -118.2437,
  requested_service: 'urgent_care',
  urgency_level: 3,
  notes: 'Need urgent care visit'
});
```

## Features Planned (Not Yet Implemented)

These routers were removed but can be added when needed:

1. **Pop-up Events** (`events.ts`) - For mobile clinics and temporary services
2. **Caching Layer** (`cache.ts`) - Performance optimization
3. **Data Pipeline** (`scraper.ts`) - Trigger.dev integration for automated updates
4. **AI Features** (`ai.ts`) - Gemini integration for triage and load balancing

## Next Steps to Launch MVP

1. **Run Database Migrations**
   ```bash
   # In Supabase SQL Editor:
   # 1. Run 001_create_tables.sql
   # 2. Run 002_additional_tables.sql
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Test Core Features**
   - Provider search
   - Patient request submission
   - Request matching

## To Add More Features

When ready to add more features:

1. **For Pop-up Events**: Create `events.ts` router
2. **For AI Triage**: Create `ai.ts` router with Gemini integration
3. **For Data Pipeline**: Create `scraper.ts` with Trigger.dev
4. **For Caching**: Create `cache.ts` for performance

Each feature can be added incrementally without breaking existing functionality.
