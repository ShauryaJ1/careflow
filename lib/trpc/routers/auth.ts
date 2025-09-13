import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

export const authRouter = createTRPCRouter({
  // Check if email exists (for signup validation)
  checkEmailExists: publicProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .query(async ({ ctx, input }) => {
      // Check in auth.users table (this requires service role key)
      // For now, we'll check if a provider exists with this email
      const { data: provider } = await ctx.supabase
        .from("providers")
        .select("id")
        .eq("email", input.email.toLowerCase())
        .single();

      // We can't directly query auth.users from client, but we can check providers
      // The actual uniqueness is enforced by Supabase auth
      return {
        providerExists: !!provider,
        // Note: This doesn't check patient accounts, only provider accounts
        // Full email uniqueness is enforced by Supabase Auth
      };
    }),
});
