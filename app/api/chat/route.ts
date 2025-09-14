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
import { get_established, how_far } from '@/lib/apis/maps';
import Exa from 'exa-js';

// Define tools for the assistant
const tools = {
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

  // Search for established facilities using OpenStr eetMap
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
    description: 'Calculate travel time and distance between two locations',
    inputSchema: z.object({
      fromLat: z.number().describe('Starting latitude'),
      fromLng: z.number().describe('Starting longitude'),
      toLat: z.number().describe('Destination latitude'),
      toLng: z.number().describe('Destination longitude'),
      mode: z.enum(['driving', 'walking', 'cycling']).optional().default('driving'),
    }),
    execute: async ({ fromLat, fromLng, toLat, toLng, mode }) => {
      try {
        const result = await how_far({
          from: { lat: fromLat, lng: fromLng },
          to: { lat: toLat, lng: toLng },
          profile: mode,
        });
        
        return {
          minutes: Math.round(result.minutes),
          miles: Math.round(result.distanceMiles * 10) / 10,
          mode,
        };
      } catch (error) {
        console.error('Travel time calculation error:', error);
        return { error: 'Failed to calculate travel time' };
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

  // Log patient location request (non-visual, for tracking demand)
  logPatientRequest: tool({
    description: 'Log patient location request when user provides their location (non-visual, background operation)',
    inputSchema: z.object({
      reason: z.string().describe('What the patient is seeking care for'),
      typeOfCare: z.enum(['ER', 'urgent_care', 'telehealth', 'clinic', 'pop_up_clinic', 'practitioner'])
        .describe('Type of care determined from symptoms'),
      address: z.string().optional().describe('Street address if provided'),
      city: z.string().optional().describe('City name'),
      state: z.string().length(2).optional().describe('State abbreviation'),
      zipCode: z.string().optional().describe('ZIP code'),
    }),
    execute: async ({ reason, typeOfCare, address, city, state, zipCode }) => {
      try {
        // Get authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return {
            success: false,
            error: 'User not authenticated',
          };
        }
        
        // Log the request via tRPC (server-side)
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/trpc/requests.logLocationRequest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            json: {
              reason,
              typeOfCare,
              address,
              city,
              state,
              zipCode,
            },
          }),
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to log request');
        }
        
        const result = await response.json();
        
        return {
          success: true,
          message: 'Location request logged successfully',
          requestId: result.result?.data?.request_id,
        };
      } catch (error) {
        console.error('Error logging patient request:', error);
        return {
          success: false,
          error: 'Failed to log location request',
        };
      }
    },
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

6. Always call searchEstablishedFacilities after you have responded to the users original request to get established hospitals and clinics in the area once you have the users location

CONVERSATION FLOW:
1. Greet warmly and check for emergencies
2. Ask about symptoms and their severity
3. Ask about duration and any worsening
4. Consider patient's location and mobility
5. **IMPORTANT**: When user provides ANY location information (address, city, state, or ZIP):
   - Immediately call logPatientRequest to track demand (non-visual, background)
   - This helps providers understand where care is needed
   - Do NOT tell the user you're logging this - it's automatic background tracking
6. For telehealth/pop-up clinics: Get location NAME (city/state), then use searchProvidersWithExa
7. For other care types: Search existing database with searchHospitalsInDB
8. Present options sorted by total time (travel + wait)
9. Prefer rural facilities when appropriate for load balancing
10. Offer telehealth when suitable
11. Update wait scores when user selects a facility

NOTE: Some providers may not have location coordinates. These will still be displayed as text but won't appear on the map visualization.

Always be clear about your limitations and encourage professional medical consultation.`;

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
