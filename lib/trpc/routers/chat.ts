import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';

export const chatRouter = createTRPCRouter({
  // Create a new chat
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      visibility: z.enum(['private', 'public']).default('private'),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      
      const { data: chat, error } = await ctx.supabase
        .from('Chat')
        .insert({
          userId,
          title: input.title,
          visibility: input.visibility,
        })
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create chat',
        });
      }

      return chat;
    }),

  // Get a specific chat by ID
  getById: protectedProcedure
    .input(z.object({ 
      chatId: z.string().uuid() 
    }))
    .query(async ({ ctx, input }) => {
      const { data: chat, error } = await ctx.supabase
        .from('Chat')
        .select('*')
        .eq('id', input.chatId)
        .eq('userId', ctx.user.id)
        .single();

      if (error || !chat) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Chat not found',
        });
      }

      return chat;
    }),

  // List all chats for the current user
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const { data: chats, error, count } = await ctx.supabase
        .from('Chat')
        .select('*', { count: 'exact' })
        .eq('userId', ctx.user.id)
        .order('createdAt', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch chats',
        });
      }

      return {
        chats: chats || [],
        total: count || 0,
      };
    }),

  // Update a chat
  update: protectedProcedure
    .input(z.object({
      chatId: z.string().uuid(),
      title: z.string().min(1).optional(),
      visibility: z.enum(['private', 'public']).optional(),
      lastContext: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { chatId, ...updates } = input;

      const { data: chat, error } = await ctx.supabase
        .from('Chat')
        .update(updates)
        .eq('id', chatId)
        .eq('userId', ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update chat',
        });
      }

      return chat;
    }),

  // Delete a chat
  delete: protectedProcedure
    .input(z.object({ 
      chatId: z.string().uuid() 
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('Chat')
        .delete()
        .eq('id', input.chatId)
        .eq('userId', ctx.user.id);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete chat',
        });
      }

      return { success: true };
    }),

  // Messages operations
  messages: createTRPCRouter({
    // Create a new message
    create: protectedProcedure
      .input(z.object({
        chatId: z.string().uuid(),
        role: z.enum(['user', 'assistant', 'system', 'tool']),
        parts: z.array(z.any()),
        attachments: z.array(z.any()).optional().default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify chat ownership
        const { data: chat } = await ctx.supabase
          .from('Chat')
          .select('id')
          .eq('id', input.chatId)
          .eq('userId', ctx.user.id)
          .single();

        if (!chat) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot add message to this chat',
          });
        }

        const { data: message, error } = await ctx.supabase
          .from('Message_v2')
          .insert({
            chatId: input.chatId,
            role: input.role,
            parts: input.parts,
            attachments: input.attachments || [],
          })
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create message',
          });
        }

        return message;
      }),

    // Get messages for a chat
    list: protectedProcedure
      .input(z.object({
        chatId: z.string().uuid(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        // Verify chat ownership
        const { data: chat } = await ctx.supabase
          .from('Chat')
          .select('id')
          .eq('id', input.chatId)
          .eq('userId', ctx.user.id)
          .single();

        if (!chat) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot access messages for this chat',
          });
        }

        const { data: messages, error, count } = await ctx.supabase
          .from('Message_v2')
          .select('*', { count: 'exact' })
          .eq('chatId', input.chatId)
          .order('createdAt', { ascending: true })
          .range(input.offset, input.offset + input.limit - 1);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch messages',
          });
        }

        return {
          messages: messages || [],
          total: count || 0,
        };
      }),

    // Delete a message
    delete: protectedProcedure
      .input(z.object({
        messageId: z.string().uuid(),
        chatId: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify chat ownership
        const { data: chat } = await ctx.supabase
          .from('Chat')
          .select('id')
          .eq('id', input.chatId)
          .eq('userId', ctx.user.id)
          .single();

        if (!chat) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cannot delete message from this chat',
          });
        }

        const { error } = await ctx.supabase
          .from('Message_v2')
          .delete()
          .eq('id', input.messageId)
          .eq('chatId', input.chatId);

        if (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete message',
          });
        }

        return { success: true };
      }),
  }),
});
