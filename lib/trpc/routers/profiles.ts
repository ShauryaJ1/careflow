import { createTRPCRouter, protectedProcedure } from "../init";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// Input schemas
const patientProfileUpdateSchema = z.object({
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  geo_lat: z.number().nullable().optional(),
  geo_long: z.number().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  insurance_provider: z.string().nullable().optional(),
  insurance_member_id: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  medical_conditions: z.array(z.string()).nullable().optional(),
  current_medications: z.array(z.string()).nullable().optional(),
  allergies: z.array(z.string()).nullable().optional(),
  preferred_language: z.string().nullable().optional(),
  needs_interpreter: z.boolean().nullable().optional(),
  accessibility_needs: z.array(z.string()).nullable().optional(),
  notification_preferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }).nullable().optional(),
});

const providerProfileUpdateSchema = z.object({
  // Personal info
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  geo_lat: z.number().nullable().optional(),
  geo_long: z.number().nullable().optional(),
  preferred_language: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  license_number: z.string().nullable().optional(),
  years_of_experience: z.number().nullable().optional(),
  notification_preferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }).nullable().optional(),
  
  // Facility info (these are now stored directly in provider_profiles)
  provider_name: z.string().nullable().optional(),
  provider_type: z.enum(["clinic", "pharmacy", "telehealth", "hospital", "pop_up", "mobile", "urgent_care"]).nullable().optional(),
  services: z.array(z.enum(["general", "dental", "maternal_care", "urgent_care", "mental_health", "pediatric", "vaccination", "specialty", "diagnostic"])).nullable().optional(),
  languages_spoken: z.array(z.string()).nullable().optional(),
  telehealth_available: z.boolean().nullable().optional(),
  accepts_walk_ins: z.boolean().nullable().optional(),
  website: z.string().nullable().optional(),
  insurance_accepted: z.array(z.string()).nullable().optional(),
  capacity: z.number().nullable().optional(),
  accessibility_features: z.array(z.string()).nullable().optional(),
});

export const profilesRouter = createTRPCRouter({
  // Get current user's profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    
    // Check if user is a patient
    const { data: patientProfile } = await ctx.supabase
      .from("patient_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (patientProfile) {
      return {
        ...patientProfile,
        role: "patient",
        email: ctx.user.email,
      };
    }
    
    // Check if user is a provider
    const { data: providerProfile } = await ctx.supabase
      .from("provider_profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (providerProfile) {
      return {
        ...providerProfile,
        role: "provider",
        email: ctx.user.email,
      };
    }
    
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Profile not found",
    });
  }),

  // Update patient profile
  updatePatientProfile: protectedProcedure
    .input(patientProfileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user is a patient
      const { data: exists } = await ctx.supabase
        .from("patient_profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (!exists) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only patients can update patient profiles",
        });
      }

      // Update patient profile
      const { data, error } = await ctx.supabase
        .from("patient_profiles")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }

      return data;
    }),

  // Update provider profile - SIMPLIFIED VERSION
  updateProviderProfile: protectedProcedure
    .input(providerProfileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user is a provider
      const { data: exists } = await ctx.supabase
        .from("provider_profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (!exists) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only providers can update provider profiles",
        });
      }

      // Build update data - handle arrays specially to allow clearing
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Add all defined fields to update
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined) {
          // For array fields, always set them (even if empty) to allow clearing
          if (Array.isArray(value)) {
            updateData[key] = value;
          } else {
            updateData[key] = value;
          }
        }
      });

      console.log("Updating provider profile with data:", updateData);

      // Update provider profile directly - ALL fields are now in provider_profiles table
      const { data, error } = await ctx.supabase
        .from("provider_profiles")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        console.error("Provider profile update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update provider profile: ${error.message}`,
        });
      }

      console.log("Provider profile updated successfully:", data);
      return { success: true, data };
    }),

  // Get user role
  getUserRole: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    
    // Check if patient
    const { data: patient } = await ctx.supabase
      .from("patient_profiles")
      .select("id")
      .eq("id", userId)
      .single();
    
    if (patient) {
      return { role: "patient" };
    }
    
    // Check if provider
    const { data: provider } = await ctx.supabase
      .from("provider_profiles")
      .select("id")
      .eq("id", userId)
      .single();
    
    if (provider) {
      return { role: "provider" };
    }
    
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User role not found",
    });
  }),
});