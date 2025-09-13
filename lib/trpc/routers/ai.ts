import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import Exa from 'exa-js';
import { generateObject } from 'ai';
import { createHospitalSchema } from '../validation';

// Check if API keys are configured
const EXA_API_KEY = process.env.EXA_API_KEY;
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;

// Initialize Exa client for web scraping
const exa = EXA_API_KEY ? new Exa(EXA_API_KEY) : null;

export const aiRouter = createTRPCRouter({
  /**
   * Scrape hospital website and extract information using AI
   */
  scrapeHospitalWebsite: protectedProcedure
    .input(z.object({
      websiteUrl: z.string().url()
    }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx;
      
      // Check if user is a provider
      const { data: provider } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!provider) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only providers can use AI scraping'
        });
      }

      // Check if API keys are configured
      if (!exa) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Web scraping is not configured. Please add EXA_API_KEY to your environment variables.'
        });
      }
      
      if (!AI_GATEWAY_API_KEY) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'AI Gateway is not configured. Please add AI_GATEWAY_API_KEY to your environment variables.'
        });
      }

      try {
        // Use Exa to get website content with livecrawl for fresh data
        console.log('Fetching content from:', input.websiteUrl);
        
        const searchResult = await exa.getContents(
          [input.websiteUrl],
          {
            text: true,
            livecrawl: "preferred", // Always crawl for fresh content, fallback to cache on failure
            highlights: {
              highlightsPerUrl: 10,
              numSentences: 3,
              query: "hospital clinic hours address phone email services emergency urgent care"
            }
          }
        );

        if (!searchResult.results || searchResult.results.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Could not fetch website content'
          });
        }

        const websiteContent = searchResult.results[0];
        const contentText = websiteContent.text || '';
        const highlights = websiteContent.highlights?.join('\n') || '';

        // Use Gemini 2.5 Pro to extract structured information
        const { object: extractedData } = await generateObject({
          model: 'google/gemini-2.5-flash',
          schema: z.object({
            name: z.string().describe('The name of the hospital or medical facility'),
            address: z.string().describe('Street address of the facility'),
            city: z.string().describe('City where the facility is located'),
            state: z.string().describe('State abbreviation (e.g., NY, CA)'),
            zip_code: z.string().describe('ZIP code of the facility'),
            type_of_care: z.enum(['ER', 'urgent_care', 'telehealth', 'clinic', 'pop_up_clinic', 'practitioner'])
              .describe('Type of care provided based on the website content'),
            phone_number: z.string().optional().describe('Main phone number'),
            email: z.string().optional().describe('Contact email address'),
            description: z.string().optional().describe('Brief description of the facility and services'),
            hours: z.object({
              monday: z.object({ open: z.string(), close: z.string() }).optional(),
              tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
              wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
              thursday: z.object({ open: z.string(), close: z.string() }).optional(),
              friday: z.object({ open: z.string(), close: z.string() }).optional(),
              saturday: z.object({ open: z.string(), close: z.string() }).optional(),
              sunday: z.object({ open: z.string(), close: z.string() }).optional(),
            }).optional().describe('Operating hours for each day of the week'),
            services: z.array(z.string()).optional().describe('List of services offered'),
            acceptsWalkIns: z.boolean().optional().describe('Whether the facility accepts walk-in patients'),
            hasEmergencyRoom: z.boolean().optional().describe('Whether the facility has an emergency room'),
          }),
          prompt: `Extract hospital/medical facility information from the following website content.
          
Website URL: ${input.websiteUrl}
Title: ${websiteContent.title || 'N/A'}

Key Information Highlights:
${highlights}

Full Content (first 5000 chars):
${contentText}

Please extract all available information about this medical facility. For operating hours, use 24-hour format (e.g., "08:00", "17:00"). If information is not available, omit that field. Ensure that your description includes the target audience and as many details as possible that would be helpful for a patient to know.`,
        });

        // Transform the AI response to match our hospital schema
        const hospitalData = {
          name: extractedData.name,
          address: extractedData.address,
          city: extractedData.city,
          state: extractedData.state,
          zip_code: extractedData.zip_code,
          type_of_care: extractedData.type_of_care,
          website: input.websiteUrl,
          phone_number: extractedData.phone_number,
          email: extractedData.email,
          description: extractedData.description,
          open_time: extractedData.hours ? {
            sunday: extractedData.hours.sunday,
            monday: extractedData.hours.monday,
            tuesday: extractedData.hours.tuesday,
            wednesday: extractedData.hours.wednesday,
            thursday: extractedData.hours.thursday,
            friday: extractedData.hours.friday,
            saturday: extractedData.hours.saturday,
          } : undefined,
        };

        return {
          success: true,
          data: hospitalData,
          additionalInfo: {
            services: extractedData.services,
            acceptsWalkIns: extractedData.acceptsWalkIns,
            hasEmergencyRoom: extractedData.hasEmergencyRoom,
          }
        };

      } catch (error) {
        console.error('AI scraping error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to scrape website or extract information',
          cause: error
        });
      }
    }),
});
