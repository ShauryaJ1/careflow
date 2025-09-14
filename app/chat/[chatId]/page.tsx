'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import ChatInterface from '@/components/chat/chat-interface';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { 
  MessageSquare, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Menu,
  Trash2,
  Bot
} from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.chatId as string;
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Prevent body scrolling on this page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Fetch chat details
  const { data: chat, isLoading: chatLoading, error: chatError } = trpc.chat.getById.useQuery(
    { chatId },
    {
      enabled: !!chatId,
      retry: false,
    }
  );

  // Fetch all chats for sidebar
  const { data: allChats, refetch: refetchChats } = trpc.chat.list.useQuery({
    limit: 50,
    offset: 0,
  });

  // Fetch messages for this chat
  const { data: messagesData, isLoading: messagesLoading } = trpc.chat.messages.list.useQuery(
    { chatId, limit: 100 },
    {
      enabled: !!chatId && !!chat,
    }
  );

  // Create chat mutation
  const createChatMutation = trpc.chat.create.useMutation({
    onSuccess: (newChat) => {
      router.push(`/chat/${newChat.id}`);
      refetchChats();
      setIsMobileSidebarOpen(false);
    },
  });

  // Delete chat mutation
  const deleteChatMutation = trpc.chat.delete.useMutation({
    onSuccess: () => {
      toast.success('Chat deleted');
      refetchChats();
      setChatToDelete(null);
      // If deleting current chat, redirect to /chat
      if (chatToDelete === chatId) {
        router.push('/chat');
      }
    },
    onError: () => {
      toast.error('Failed to delete chat');
      setChatToDelete(null);
    },
  });

  const handleCreateChat = async () => {
    const title = `Medical Consultation - ${new Date().toLocaleDateString()}`;
    await createChatMutation.mutateAsync({
      title,
      visibility: 'private',
    });
  };

  const handleDeleteChat = async () => {
    if (chatToDelete) {
      await deleteChatMutation.mutateAsync({ chatId: chatToDelete });
    }
  };

  // Handle authentication redirect
  useEffect(() => {
    if (chatError?.data?.code === 'UNAUTHORIZED') {
      router.push('/auth/login?redirect=/chat/' + chatId);
    }
  }, [chatError, chatId, router]);

  // Sidebar content component
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b flex-shrink-0">
        <Button 
          onClick={handleCreateChat} 
          className="w-full gap-2"
          disabled={createChatMutation.isPending}
        >
          {createChatMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              New Chat
            </>
          )}
        </Button>
      </div>

      {/* Chat List - with its own scroll */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {allChats?.chats.map((chatItem) => (
            <Link 
              key={chatItem.id} 
              href={`/chat/${chatItem.id}`}
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <div
                className={cn(
                  "group flex items-start gap-3 rounded-lg p-3 mb-2 hover:bg-accent transition-colors cursor-pointer",
                  chatItem.id === chatId && "bg-accent"
                )}
              >
                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    chatItem.id === chatId && "text-primary"
                  )}>
                    {chatItem.title}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    setChatToDelete(chatItem.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  if (chatLoading || messagesLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar skeleton */}
        <div className="hidden md:flex w-80 border-r flex-col">
          <div className="p-4 border-b">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-2 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (chatError) {
    if (chatError.data?.code === 'NOT_FOUND') {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chat not found</AlertTitle>
            <AlertDescription>
              This chat doesn&apos;t exist or you don&apos;t have permission to view it.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Alert variant="destructive" className="max-w-md">
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden"> {/* 4rem = navbar height, prevent outer scroll */}
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-80 border-r bg-muted/10 h-full">
          <SidebarContent />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="font-semibold flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Medical Assistant
                </h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidebarContent />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="border-b bg-background px-4 py-3 flex items-center gap-3 flex-shrink-0">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex-1">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {chat.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Started {new Date(chat.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Chat Interface - Takes remaining height */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface 
              chatId={chatId} 
              initialMessages={initialMessages}
            />
          </div>
        </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
              All messages in this chat will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}