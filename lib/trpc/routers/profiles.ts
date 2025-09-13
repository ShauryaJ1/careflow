import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";

// Input schemas for profile updates
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
  full_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  geo_lat: z.number().nullable().optional(),
  geo_long: z.number().nullable().optional(),
  preferred_language: z.string().nullable().optional(),
  notification_preferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }).nullable().optional(),
  // Provider-specific fields
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
    
    // Get profile data
    const { data: profile, error } = await ctx.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Profile not found",
      });
    }

    // If provider, also fetch provider details
    if (profile.role === "provider" && profile.provider_id) {
      const { data: providerData } = await ctx.supabase
        .from("providers")
        .select("*")
        .eq("id", profile.provider_id)
        .single();

      return {
        ...profile,
        providerData,
      };
    }

    return profile;
  }),

  // Update patient profile
  updatePatientProfile: protectedProcedure
    .input(patientProfileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // First verify user is a patient
      const { data: profile, error: profileError } = await ctx.supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || profile.role !== "patient") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only patients can update patient profiles",
        });
      }

      // Update profile
      const { data, error } = await ctx.supabase
        .from("profiles")
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

  // Update provider profile
  updateProviderProfile: protectedProcedure
    .input(providerProfileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // First verify user is a provider and get provider_id
      const { data: profile, error: profileError } = await ctx.supabase
        .from("profiles")
        .select("role, provider_id")
        .eq("id", userId)
        .single();

      if (profileError || profile.role !== "provider") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only providers can update provider profiles",
        });
      }

      // Extract provider-specific fields
      const {
        provider_name,
        provider_type,
        services,
        languages_spoken,
        telehealth_available,
        accepts_walk_ins,
        website,
        insurance_accepted,
        capacity,
        accessibility_features,
        ...profileFields
      } = input;

      // Update profile table
      const { error: updateProfileError } = await ctx.supabase
        .from("profiles")
        .update({
          ...profileFields,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateProfileError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }

      // If no provider_id exists, create a new provider record
      if (!profile.provider_id && provider_name) {
        const { data: newProvider, error: createError } = await ctx.supabase
          .from("providers")
          .insert({
            name: provider_name,
            type: provider_type || "clinic",
            address: profileFields.address,
            geo_lat: profileFields.geo_lat,
            geo_long: profileFields.geo_long,
            phone: profileFields.phone,
            email: ctx.user.email!,
            services: services || [],
            languages_spoken: languages_spoken || [],
            telehealth_available: telehealth_available || false,
            accepts_walk_ins: accepts_walk_ins || false,
            website,
            insurance_accepted: insurance_accepted || [],
            capacity,
            accessibility_features: accessibility_features || [],
            is_active: true,
          })
          .select()
          .single();

        if (createError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create provider record",
          });
        }

        // Update profile with new provider_id
        await ctx.supabase
          .from("profiles")
          .update({ provider_id: newProvider.id })
          .eq("id", userId);

        return { success: true, providerId: newProvider.id };
      }

      // Update existing provider record
      if (profile.provider_id) {
        const providerUpdateData: any = {};
        
        if (provider_name !== undefined) providerUpdateData.name = provider_name;
        if (provider_type !== undefined) providerUpdateData.type = provider_type;
        if (services !== undefined) providerUpdateData.services = services;
        if (languages_spoken !== undefined) providerUpdateData.languages_spoken = languages_spoken;
        if (telehealth_available !== undefined) providerUpdateData.telehealth_available = telehealth_available;
        if (accepts_walk_ins !== undefined) providerUpdateData.accepts_walk_ins = accepts_walk_ins;
        if (website !== undefined) providerUpdateData.website = website;
        if (insurance_accepted !== undefined) providerUpdateData.insurance_accepted = insurance_accepted;
        if (capacity !== undefined) providerUpdateData.capacity = capacity;
        if (accessibility_features !== undefined) providerUpdateData.accessibility_features = accessibility_features;
        if (profileFields.address !== undefined) providerUpdateData.address = profileFields.address;
        if (profileFields.geo_lat !== undefined) providerUpdateData.geo_lat = profileFields.geo_lat;
        if (profileFields.geo_long !== undefined) providerUpdateData.geo_long = profileFields.geo_long;
        if (profileFields.phone !== undefined) providerUpdateData.phone = profileFields.phone;
        
        providerUpdateData.updated_at = new Date().toISOString();

        const { error: updateProviderError } = await ctx.supabase
          .from("providers")
          .update(providerUpdateData)
          .eq("id", profile.provider_id);

        if (updateProviderError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update provider record",
          });
        }
      }

      return { success: true };
    }),

  // Get user role
  getUserRole: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    
    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Profile not found",
      });
    }

    return data.role;
  }),
});
