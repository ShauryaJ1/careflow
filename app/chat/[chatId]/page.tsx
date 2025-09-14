'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import ChatInterface from '@/components/chat/chat-interface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, MessageSquare, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;

  // Fetch chat details
  const { data: chat, isLoading: chatLoading, error: chatError } = trpc.chat.getById.useQuery(
    { chatId },
    {
      enabled: !!chatId,
      retry: false,
    }
  );

  // Fetch messages for this chat
  const { data: messagesData, isLoading: messagesLoading } = trpc.chat.messages.list.useQuery(
    { chatId, limit: 100 },
    {
      enabled: !!chatId && !!chat,
    }
  );

  // Update chat title mutation
  const updateChatMutation = trpc.chat.update.useMutation();

  // Handle authentication redirect
  useEffect(() => {
    if (chatError?.data?.code === 'UNAUTHORIZED') {
      router.push('/auth/login?redirect=/chat/' + chatId);
    }
  }, [chatError, chatId, router]);

  if (chatLoading || messagesLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (chatError) {
    if (chatError.data?.code === 'NOT_FOUND') {
      return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chat not found</AlertTitle>
            <AlertDescription>
              This chat doesn't exist or you don't have permission to view it.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/chat">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chats
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load chat. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!chat) {
    return null;
  }

  // Convert database messages to the format expected by the chat interface
  const initialMessages = messagesData?.messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: msg.parts as any[],
    createdAt: new Date(msg.createdAt),
  })) || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              {chat.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Started {new Date(chat.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <ChatInterface 
            chatId={chatId} 
            initialMessages={initialMessages}
          />
        </CardContent>
      </Card>
    </div>
  );
}
