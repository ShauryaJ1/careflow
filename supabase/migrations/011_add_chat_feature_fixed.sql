-- Chat feature tables integrated with existing auth system
-- This replaces 011_add_chat_feature to properly work with Supabase auth

-- DO NOT create a User table - we use auth.users from Supabase

-- Create Chat table (linked to auth.users)
CREATE TABLE IF NOT EXISTS "Chat" (
    "id" uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "title" text NOT NULL,
    "visibility" varchar DEFAULT 'private' NOT NULL,
    "lastContext" jsonb
);

-- Create Document table (linked to auth.users)
CREATE TABLE IF NOT EXISTS "Document" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "title" text NOT NULL,
    "content" text,
    "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "text" varchar DEFAULT 'text' NOT NULL,
    CONSTRAINT "Document_id_createdAt_pk" PRIMARY KEY("id","createdAt")
);

-- Create Suggestion table (linked to auth.users)
CREATE TABLE IF NOT EXISTS "Suggestion" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "documentId" uuid NOT NULL,
    "documentCreatedAt" timestamp NOT NULL,
    "originalText" text NOT NULL,
    "suggestedText" text NOT NULL,
    "description" text,
    "isResolved" boolean DEFAULT false NOT NULL,
    "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "Suggestion_id_pk" PRIMARY KEY("id")
);

-- Create Message table
CREATE TABLE IF NOT EXISTS "Message" (
    "id" uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "chatId" uuid NOT NULL,
    "role" varchar NOT NULL,
    "content" json NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Create Vote table
CREATE TABLE IF NOT EXISTS "Vote" (
    "chatId" uuid NOT NULL,
    "messageId" uuid NOT NULL,
    "isUpvoted" boolean NOT NULL,
    CONSTRAINT "Vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);

-- Create Message_v2 table
CREATE TABLE IF NOT EXISTS "Message_v2" (
    "id" uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "chatId" uuid NOT NULL,
    "role" varchar NOT NULL,
    "parts" json NOT NULL,
    "attachments" json NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW()
);

-- Create Vote_v2 table
CREATE TABLE IF NOT EXISTS "Vote_v2" (
    "chatId" uuid NOT NULL,
    "messageId" uuid NOT NULL,
    "isUpvoted" boolean NOT NULL,
    CONSTRAINT "Vote_v2_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);

-- Create Stream table
CREATE TABLE IF NOT EXISTS "Stream" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "chatId" uuid NOT NULL,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "Stream_id_pk" PRIMARY KEY("id")
);

-- Add foreign key constraints for relationships between chat tables
DO $$ BEGIN
    ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_fk" 
    FOREIGN KEY ("documentId","documentCreatedAt") REFERENCES "public"."Document"("id","createdAt") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" 
    FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Vote" ADD CONSTRAINT "Vote_chatId_Chat_id_fk" 
    FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_Message_id_fk" 
    FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_chatId_Chat_id_fk" 
    FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_chatId_Chat_id_fk" 
    FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_messageId_Message_v2_id_fk" 
    FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" 
    FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "Chat_userId_idx" ON "Chat" ("userId");
CREATE INDEX IF NOT EXISTS "Chat_createdAt_idx" ON "Chat" ("createdAt");
CREATE INDEX IF NOT EXISTS "Document_userId_idx" ON "Document" ("userId");
CREATE INDEX IF NOT EXISTS "Message_chatId_idx" ON "Message" ("chatId");
CREATE INDEX IF NOT EXISTS "Message_v2_chatId_idx" ON "Message_v2" ("chatId");
CREATE INDEX IF NOT EXISTS "Stream_chatId_idx" ON "Stream" ("chatId");

-- Add RLS policies for chat tables
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream" ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chats
CREATE POLICY "Users can view own chats" ON "Chat"
    FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can create own chats" ON "Chat"
    FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own chats" ON "Chat"
    FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own chats" ON "Chat"
    FOR DELETE USING (auth.uid() = "userId");

-- Users can only see their own documents
CREATE POLICY "Users can view own documents" ON "Document"
    FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can create own documents" ON "Document"
    FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own documents" ON "Document"
    FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own documents" ON "Document"
    FOR DELETE USING (auth.uid() = "userId");

-- Messages belong to chats, so check chat ownership
CREATE POLICY "Users can view messages in their chats" ON "Message"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Chat" 
            WHERE "Chat"."id" = "Message"."chatId" 
            AND "Chat"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their chats" ON "Message"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Chat" 
            WHERE "Chat"."id" = "Message"."chatId" 
            AND "Chat"."userId" = auth.uid()
        )
    );

-- Similar policies for Message_v2
CREATE POLICY "Users can view messages in their chats v2" ON "Message_v2"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "Chat" 
            WHERE "Chat"."id" = "Message_v2"."chatId" 
            AND "Chat"."userId" = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their chats v2" ON "Message_v2"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "Chat" 
            WHERE "Chat"."id" = "Message_v2"."chatId" 
            AND "Chat"."userId" = auth.uid()
        )
    );

-- Add comments
COMMENT ON TABLE "Chat" IS 'Chat conversations for the AI assistant feature';
COMMENT ON TABLE "Document" IS 'Documents created or uploaded by users';
COMMENT ON TABLE "Message" IS 'Messages within chat conversations';
COMMENT ON TABLE "Message_v2" IS 'Version 2 of messages with enhanced features';
