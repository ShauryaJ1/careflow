import { 
  streamText, 
  tool, 
  convertToModelMessages, 
  UIMessage, 
  gateway,
  type InferUITools,
  type UIDataTypes,
  stepCountIs 
} from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { get_established, how_far } from '@/lib/apis/maps';

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

  // Show hospitals on map (client-side visual tool)
  showHospitalsOnMap: tool({
    description: 'Display hospitals and medical facilities on an interactive map for the user',
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

      // Calculate distances if user location provided
      let results = hospitals || [];
      if (userLocation && results.length > 0) {
        results = results.map((hospital) => {
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
        
        // Sort by distance
        results = results.sort((a: any, b: any) => {
          const aDist = a.distance_miles || 999;
          const bDist = b.distance_miles || 999;
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

CONVERSATION FLOW:
1. Greet warmly and check for emergencies
2. Ask about symptoms and their severity
3. Ask about duration and any worsening
4. Consider patient's location and mobility
5. Search for appropriate facilities
6. Present options sorted by total time (travel + wait)
7. Prefer rural facilities when appropriate for load balancing
8. Offer telehealth when suitable
9. Update wait scores when user selects a facility

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
