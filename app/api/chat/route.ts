import { 
  streamText, 
  tool, 
  convertToModelMessages, 
  UIMessage, 
  gateway,
  type InferUITools,
  type UIDataTypes,
  stepCountIs,
  generateObject 
} from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { get_established, how_far, to_lat_lng } from '@/lib/apis/maps';
import { get_neighboring_zipcodes } from '@/lib/apis/zipcodes';
import Exa from 'exa-js';

// Define tools for the assistant
const tools = {
  // Get neighboring ZIP codes within a radius
  getNeighboringZipcodes: tool({
    description: 'Return neighboring ZIP codes within a radius of a given ZIP',
    inputSchema: z.object({
      zip: z.string().regex(/^\d{5}$/,'ZIP must be a 5-digit US ZIP code'),
      radius: z.number().positive().describe('Radius distance value'),
      unit: z.enum(['mile', 'km']).optional().default('mile'),
    }),
    execute: async ({ zip, radius, unit }) => {
      try {
        const zipCodes = await get_neighboring_zipcodes({ zip, radius, unit });
        return { zip, radius, unit: unit ?? 'mile', count: zipCodes.length, zipCodes };
      } catch (error) {
        console.error('getNeighboringZipcodes error:', error);
        return { error: 'Failed to fetch neighboring ZIP codes. Ensure ZIPCODEAPI_KEY is set and inputs are valid.' };
      }
    },
  }),
  // Convert a free-form location into latitude/longitude
  to_lat_lng: tool({
    description: 'Convert any location (city, address, or 5-digit ZIP) to a { lat, lng } pair',
    inputSchema: z.object({
      location: z.string().min(1).describe('City, address, or 5-digit ZIP code'),
    }),
    execute: async ({ location }) => {
      try {
        const coords = await to_lat_lng(location);
        return coords;
      } catch (error) {
        console.error('to_lat_lng error:', error);
        return { error: 'Failed to geocode location. Ensure GEOAPIFY_API_KEY is set and input is valid.' };
      }
    },
  }),
  // Search hospitals in database
  searchHospitalsInDB: tool({
    description: 'Search for hospitals, clinics, and medical facilities in our database',
    inputSchema: z.object({
      city: z.string().optional().describe('City to search in'),
      state: z.string().optional().describe('State abbreviation (e.g., VA, MD)'),
      typeOfCare: z.array(z.enum(['ER', 'urgent_care', 'telehealth', 'clinic', 'pop_up_clinic', 'practitioner']))
        .optional().describe('Types of care to search for'),
      lat: z.number().optional().describe('User latitude for distance calculation'),
      lng: z.number().optional().describe('User longitude for distance calculation'),
      radius: z.number().optional().default(25).describe('Search radius in miles'),
    }),
    execute: async ({ city, state, typeOfCare, lat, lng, radius }) => {
      const supabase = await createClient();
      
      let query = supabase
        .from('hospitals')
        .select('*')
        .or('end_at.is.null,end_at.gte.now()');

      if (city) query = query.ilike('city', `%${city}%`);
      if (state) query = query.eq('state', state.toUpperCase());
      if (typeOfCare && typeOfCare.length > 0) {
        query = query.in('type_of_care', typeOfCare);
      }

      const { data: hospitals, error } = await query.limit(50);
      
      if (error) {
        console.error('Database search error:', error);
        return { error: 'Failed to search hospitals', hospitals: [] };
      }

      // Calculate distances if location provided
      let results = hospitals || [];
      if (lat && lng && results.length > 0) {
        const hospitalsWithDistance = await Promise.all(
          results.map(async (hospital) => {
            if (hospital.location?.coordinates) {
              try {
                const travelResult = await how_far({
                  from: { lat, lng },
                  to: { 
                    lat: hospital.location.coordinates[1], 
                    lng: hospital.location.coordinates[0] 
                  },
                  profile: 'driving',
                });
                
                return {
                  ...hospital,
                  distance_miles: travelResult.distanceMiles,
                  travel_time_minutes: travelResult.minutes,
                  total_time_minutes: travelResult.minutes + (hospital.wait_score || 30),
                };
              } catch (error) {
                console.error('Distance calculation error:', error);
                return hospital;
              }
            }
            return hospital;
          })
        );
        
        // Sort by total time
        results = hospitalsWithDistance.sort((a: any, b: any) => {
          const aTime = a.total_time_minutes || 999;
          const bTime = b.total_time_minutes || 999;
          return aTime - bTime;
        });
      }

      return {
        hospitals: results.slice(0, 10), // Return top 10 results
        totalFound: results.length,
      };
    },
  }),

  // Search for established facilities using OpenStreetMap
  searchEstablishedFacilities: tool({
    description: 'Search for established hospitals and clinics in the area using OpenStreetMap data',
    inputSchema: z.object({
      lat: z.number().describe('Center latitude'),
      lng: z.number().describe('Center longitude'),
      radiusMeters: z.number().default(5000).describe('Search radius in meters'),
    }),
    execute: async ({ lat, lng, radiusMeters }) => {
      try {
        const facilities = await get_established({
          center: { lat, lng },
          radiusMeters,
          limit: 20,
        });
        
        return {
          facilities,
          totalFound: facilities.length,
        };
      } catch (error) {
        console.error('OpenStreetMap search error:', error);
        return { error: 'Failed to search established facilities', facilities: [] };
      }
    },
  }),

  // Calculate travel time between two points
  calculateTravelTime: tool({
    description: 'Calculate travel time and distance between two locations. Accepts either numeric coordinates or free-form from/to text.',
    inputSchema: z
      .object({
        // Option A: numeric coordinates
        fromLat: z.coerce.number().describe('Starting latitude').optional(),
        fromLng: z.coerce.number().describe('Starting longitude').optional(),
        toLat: z.coerce.number().describe('Destination latitude').optional(),
        toLng: z.coerce.number().describe('Destination longitude').optional(),
        // Option B: text locations (address/city/ZIP)
        fromText: z.string().min(1).describe('Starting location (address, city, or ZIP)').optional(),
        toText: z.string().min(1).describe('Destination (address, city, or ZIP)').optional(),
        mode: z.enum(['driving', 'walking', 'cycling']).optional().default('driving'),
      })
      .describe('Provide either all of fromLat/fromLng/toLat/toLng or fromText/toText'),
    execute: async (input: any) => {
      try {
        const profile: 'driving' | 'walking' | 'cycling' = input.mode || 'driving';
        let from: { lat: number; lng: number } | string | undefined;
        let to: { lat: number; lng: number } | string | undefined;

        const haveCoords =
          input.fromLat != null && input.fromLng != null && input.toLat != null && input.toLng != null;
        const haveText = input.fromText && input.toText;

        if (haveCoords) {
          from = { lat: Number(input.fromLat), lng: Number(input.fromLng) };
          to = { lat: Number(input.toLat), lng: Number(input.toLng) };
          const withinLat = (x: number) => x >= -90 && x <= 90;
          const withinLng = (x: number) => x >= -180 && x <= 180;
          if (!withinLat(from.lat) || !withinLng(from.lng) || !withinLat(to.lat) || !withinLng(to.lng)) {
            return { error: 'Invalid coordinates. Lat must be [-90,90], Lng must be [-180,180].' };
          }
        } else if (haveText) {
          from = String(input.fromText);
          to = String(input.toText);
        } else {
          return { error: 'Provide either numeric coordinates (fromLat/fromLng/toLat/toLng) or text (fromText/toText).' };
        }

        const result = await how_far({ from: from!, to: to!, profile });
        
        return {
          minutes: Math.round(result.minutes),
          miles: Math.round(result.distanceMiles * 10) / 10,
          mode: profile,
        };
      } catch (error) {
        console.error('Travel time calculation error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { error: `Failed to calculate travel time: ${message}` };
      }
    },
  }),

  // Update wait score when user selects a hospital
  updateHospitalWaitScore: tool({
    description: 'Update the wait score for a hospital when a user indicates they will go there',
    inputSchema: z.object({
      hospitalId: z.string().describe('Hospital ID to update'),
      increment: z.number().default(1).describe('Amount to increase wait score'),
    }),
    execute: async ({ hospitalId, increment }) => {
      const supabase = await createClient();
      
      const { data: hospital, error: fetchError } = await supabase
        .from('hospitals')
        .select('wait_score')
        .eq('id', hospitalId)
        .single();

      if (fetchError) {
        return { error: 'Hospital not found' };
      }

      const newScore = (hospital.wait_score || 0) + increment;

      const { data, error } = await supabase
        .from('hospitals')
        .update({ 
          wait_score: newScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hospitalId)
        .select()
        .single();

      if (error) {
        return { error: 'Failed to update wait score' };
      }

      return {
        hospitalId,
        newWaitScore: newScore,
        message: 'Wait score updated successfully',
      };
    },
  }),

  // Get user location (client-side tool)
  getUserLocation: tool({
    description: 'Get the user\'s current location (requires user permission)',
    inputSchema: z.object({}),
  }),

  // Confirm user selection (client-side tool)
  confirmSelection: tool({
    description: 'Ask user to confirm their hospital selection',
    inputSchema: z.object({
      hospitalName: z.string().describe('Name of the hospital'),
      estimatedTime: z.string().describe('Estimated total time'),
    }),
  }),

  // Show hospitals on map (client-side visual tool)
  showHospitalsOnMap: tool({
    description: 'Display hospitals and medical facilities on an interactive map for the user based on zip code, state, city, or type of care',
    inputSchema: z.object({
      query: z.string().describe('Search query or location'),
      filters: z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        typeOfCare: z.array(z.enum(['ER', 'urgent_care', 'telehealth', 'clinic', 'pop_up_clinic', 'practitioner'])).optional(),
      }).optional(),
      userLocation: z.object({
        lat: z.number(),
        lng: z.number(),
      }).optional(),
    }),
    execute: async ({ query, filters, userLocation }) => {
      const supabase = await createClient();
      
      let dbQuery = supabase
        .from('hospitals')
        .select('*')
        .or('end_at.is.null,end_at.gte.now()')
        .limit(50);

      // Apply filters
      if (filters?.city) dbQuery = dbQuery.ilike('city', `%${filters.city}%`);
      if (filters?.state) dbQuery = dbQuery.eq('state', filters.state.toUpperCase());
      if (filters?.zipCode) dbQuery = dbQuery.eq('zip_code', filters.zipCode);
      if (filters?.typeOfCare && filters.typeOfCare.length > 0) {
        dbQuery = dbQuery.in('type_of_care', filters.typeOfCare);
      }

      const { data: hospitals, error } = await dbQuery;
      
      if (error) {
        console.error('Database search error:', error);
        return { 
          query,
          filters,
          userLocation,
          hospitals: [],
          error: 'Failed to search hospitals' 
        };
      }

      // Calculate distances if user location provided - ONLY for hospitals with locations
      let results = hospitals || [];
      if (userLocation && results.length > 0) {
        results = results.map((hospital) => {
          // Only calculate distance if location exists
          if (hospital.location?.coordinates) {
            // Simple distance calculation (Haversine formula for display purposes)
            const lat1 = userLocation.lat;
            const lon1 = userLocation.lng;
            const lat2 = hospital.location.coordinates[1];
            const lon2 = hospital.location.coordinates[0];
            
            const R = 3959; // Radius of the Earth in miles
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            
            return {
              ...hospital,
              distance_miles: Math.round(distance * 10) / 10,
            };
          }
          return hospital;
        });
        
        // Sort by distance - hospitals without locations go to the end
        results = results.sort((a: any, b: any) => {
          const aDist = a.distance_miles !== undefined ? a.distance_miles : 999;
          const bDist = b.distance_miles !== undefined ? b.distance_miles : 999;
          return aDist - bDist;
        });
      }

      return {
        query,
        filters,
        userLocation,
        hospitals: results,
        totalFound: results.length,
      };
    },
  }),

  // Search for providers using Exa and update database
  searchProvidersWithExa: tool({
    description: 'Search for telehealth providers or pop-up clinics using Exa search and update the database',
    inputSchema: z.object({
      location: z.string().describe('City and state or region (e.g., "Austin, TX" or "Northern Virginia")'),
      careType: z.enum(['telehealth', 'pop_up_clinic']).describe('Type of care to search for'),
      userNeeds: z.string().optional().describe('Specific needs or symptoms the user mentioned'),
    }),
    execute: async ({ location, careType, userNeeds }) => {
      try {
        // Initialize Exa client
        const exa = new Exa(process.env.EXA_API_KEY);
        
        // Construct search query based on care type and user needs
        let searchQuery = '';
        if (careType === 'telehealth') {
          searchQuery = `telehealth services virtual healthcare online medical consultation ${location} ${userNeeds || ''}`;
        } else if (careType === 'pop_up_clinic') {
          searchQuery = `pop-up clinic mobile health clinic community health event free clinic ${location} ${userNeeds || ''}`;
        }
        
        console.log('Exa search query:', searchQuery);
        
        // Perform Exa search for 5 results
        const searchResults = await exa.searchAndContents(searchQuery, {
          numResults: 5,
          useAutoprompt: true,
        });
        
        console.log(`Found ${searchResults.results.length} results from Exa`);
        console.log('Exa search results:', searchResults.results);
        
        // Define the hospital schema for generateObject
        const hospitalSchema = z.object({
          name: z.string(),
          address: z.string(),
          city: z.string(),
          state: z.string().length(2),
          zip_code: z.string(),
          type_of_care: z.enum(['telehealth', 'pop_up_clinic']),
          website: z.string().optional(),
          email: z.string().optional(),
          phone_number: z.string().optional(),
          description: z.string().optional(),
          wait_score: z.number().optional().default(30),
        });
        
        // Process each result with generateObject
        const processedProviders = [];
        for (const result of searchResults.results) {
          try {
            const { object } = await generateObject({
              model: gateway('google/gemini-2.5-flash'),
              schema: hospitalSchema,
              prompt: `Extract healthcare provider information from the following content and format it as a hospital/clinic entry.
              
              Content from ${result.url}:
              Title: ${result.title}
              Text: ${result.text?.substring(0, 2000)}
              
              Location context: ${location}
              Care type: ${careType}
              
              Guidelines:
              - For the address, try to extract the actual street address if available
              - If no street address is found, use a general address like "Online" for telehealth or the city name for pop-up clinics
              - State should be a 2-letter abbreviation
              - If no zip code is found, use "00000"
              - Set type_of_care to "${careType}"
              - Extract website from the URL if not explicitly mentioned
              - Set a reasonable default wait_score (30 for telehealth, 45 for pop-up clinics)`,
            });
            
            // Add metadata
            const provider = {
              ...object,
              type_of_care: careType,
              website: object.website || result.url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              start_at: new Date().toISOString(),
              end_at: careType === 'pop_up_clinic' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null, // Pop-ups expire in 30 days
            };
            
            processedProviders.push(provider);
          } catch (error) {
            console.error('Error processing provider:', error);
          }
        }
        
        console.log(`Successfully processed ${processedProviders.length} providers`);
        
        // Update database with new providers
        // Use service role client to bypass RLS for system inserts
        const { createClient: createServiceClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );
        
        const insertedProviders = [];
        
        for (const provider of processedProviders) {
          // Check if provider already exists
          const { data: existing } = await supabaseAdmin
            .from('hospitals')
            .select('id')
            .eq('name', provider.name)
            .eq('city', provider.city)
            .single();
          
          if (!existing) {
            const { data, error } = await supabaseAdmin
              .from('hospitals')
              .insert(provider)
              .select()
              .single();
            
            if (error) {
              console.error('Error inserting provider:', error);
            } else {
              insertedProviders.push(data);
            }
          } else {
            // Update existing provider
            const { data, error } = await supabaseAdmin
              .from('hospitals')
              .update({
                ...provider,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)
              .select()
              .single();
            
            if (!error) {
              insertedProviders.push(data);
            }
          }
        }
        
        console.log(`Added/updated ${insertedProviders.length} providers in database`);
        
        return {
          searchQuery,
          totalFound: searchResults.results.length,
          providersAdded: insertedProviders.length,
          providers: insertedProviders,
          careType,
        };
      } catch (error) {
        console.error('Exa search error:', error);
        return {
          error: 'Failed to search for providers',
          searchQuery: '',
          totalFound: 0,
          providersAdded: 0,
          providers: [],
        };
      }
    },
  }),
};

// Export types for proper type safety with the client
export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

// System prompt for the medical assistant
const SYSTEM_PROMPT = `You are a compassionate and knowledgeable medical assistant helping patients find appropriate care.

CRITICAL SAFETY RULES:
1. ALWAYS remind users to call 911 for life-threatening emergencies
2. Never diagnose conditions - only help route to appropriate care
3. Be empathetic and supportive while gathering information

SYMPTOM ASSESSMENT GUIDELINES:
Based on Scripps and Aetna guidelines, route patients as follows:

GO TO ER for:
- Chest pain or pressure
- Difficulty breathing or shortness of breath
- Severe bleeding that won't stop
- Loss of consciousness or confusion
- Signs of stroke (face drooping, arm weakness, speech difficulty)
- Severe head injury
- Severe burns
- Severe allergic reactions
- Broken bones with visible deformity
- Severe abdominal pain
- Vomiting blood
- Suicidal thoughts

GO TO URGENT CARE for:
- Minor cuts needing stitches
- Sprains and strains
- Minor burns
- Fever without severe symptoms
- Mild to moderate flu symptoms
- Minor infections
- Mild asthma attacks
- Minor allergic reactions
- UTI symptoms
- Pink eye
- Rashes without fever

CONSIDER TELEHEALTH for:
- Medication refills
- Follow-up visits
- Minor cold symptoms
- Mild allergies
- Skin conditions
- Mental health consultations
- Chronic condition management

PROVIDER SEARCH GUIDELINES:
When users are looking for TELEHEALTH or POP-UP CLINICS:
1. FIRST ask for their location (city/state or region name) - this is REQUIRED before searching
2. Use searchProvidersWithExa to find relevant providers in their area
3. This tool will automatically:
   - Search for 5 relevant providers using Exa
   - Format and save them to the database
   - Return the providers found
4. After searchProvidersWithExa completes:
   - If the type is pop_up_clinic, call showHospitalsOnMap to display them
   - For telehealth, you can list the providers or show them on the map
5. The search tool works best when you have:
   - Clear location information (city and state)
   - Type of care needed (telehealth or pop-up clinic)
   - Any specific user needs or symptoms

CONVERSATION FLOW:
1. Greet warmly and check for emergencies
2. Ask about symptoms and their severity
3. Ask about duration and any worsening
4. Consider patient's location and mobility
5. For telehealth/pop-up clinics: Get location NAME (city/state), then use searchProvidersWithExa
6. For other care types: Search existing database with searchHospitalsInDB
7. Present options sorted by total time (travel + wait)
8. Prefer rural facilities when appropriate for load balancing
9. Offer telehealth when suitable
10. Update wait scores when user selects a facility

NOTE: Some providers may not have location coordinates. These will still be displayed as text but won't appear on the map visualization.

Always be clear about your limitations and encourage professional medical consultation.

AVAILABLE TOOLS:
- searchHospitalsInDB: Search our Supabase hospitals table by city, state, typeOfCare, and optional user location (lat/lng + radius in miles). Returns up to 10 best options, sorted by total time when lat/lng provided.
- searchEstablishedFacilities: Search established facilities via OpenStreetMap around a center {lat,lng} within radiusMeters.
- calculateTravelTime: Compute travel time and distance between two points with a mode of driving, walking, or cycling. Remember to convert to lat-long before using this tool.
- updateHospitalWaitScore: Increment a hospital's wait_score when a user indicates they are going there.
- to_lat_lng: Convert any location string (city/address/5-digit ZIP) into coordinates { lat, lng } using Geoapify.
- getNeighboringZipcodes: Given a 5-digit ZIP and radius (+ optional unit of 'mile' or 'km'), return nearby ZIP codes.
- getUserLocation: Client-side tool to request the user's current location (must be triggered when appropriate).
- confirmSelection: Client-side tool to ask the user to confirm a selected facility.
- showHospitalsOnMap: Client-side visual tool to display hospitals on an interactive map.

TOOL USAGE NOTES:
- Prefer to_lat_lng first to normalize free-form locations or ZIP codes to coordinates before facility searches.
- You may combine getNeighboringZipcodes with database searches to broaden coverage for a ZIP-based query if unabile to find nearby facilities.
- Use calculateTravelTime to compare options by total time (travel + wait) when coordinates are known.
- Use client-side tools (getUserLocation, confirmSelection, showHospitalsOnMap) only when user interaction/visualization is needed.`;

export async function POST(request: Request) {
  const { messages, chatId }: { messages: UIMessage[]; chatId: string } = await request.json();

  const result = streamText({
    model: gateway('google/gemini-2.5-flash'),
    messages: convertToModelMessages(messages),
    tools,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    stopWhen: stepCountIs(10), // Prevent infinite tool loops
  });

  // Return as UI message stream for proper useChat integration
  return result.toUIMessageStreamResponse();
}
