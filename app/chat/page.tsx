'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Calendar,
  Trash2,
  AlertCircle,
  Loader2,
  MapPin,
  Bot
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
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

export default function ChatListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch chats
  const { data, isLoading, error, refetch } = trpc.chat.list.useQuery({
    limit: 50,
    offset: 0,
  });

  // Create chat mutation
  const createChatMutation = trpc.chat.create.useMutation({
    onSuccess: (newChat) => {
      router.push(`/chat/${newChat.id}`);
    },
    onError: (error) => {
      toast.error('Failed to create chat');
      setIsCreating(false);
    },
  });

  // Delete chat mutation
  const deleteChatMutation = trpc.chat.delete.useMutation({
    onSuccess: () => {
      toast.success('Chat deleted');
      refetch();
      setChatToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete chat');
      setChatToDelete(null);
    },
  });

  const handleCreateChat = async () => {
    setIsCreating(true);
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

  // Filter chats based on search
  const filteredChats = data?.chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load chats. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Bot className="h-8 w-8 text-primary" />
          Medical Assistant Chats
        </h1>
        <p className="text-muted-foreground">
          Get help finding the right medical care for your needs
        </p>
      </div>

      {/* Emergency Alert */}
      <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <strong>If this is a medical emergency, call 911 immediately.</strong>
        </AlertDescription>
      </Alert>

      {/* Actions Bar */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          onClick={handleCreateChat} 
          disabled={isCreating}
          className="gap-2"
        >
          {isCreating ? (
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

      {/* Chat List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredChats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              {searchQuery ? 'No chats found' : 'No chats yet'}
            </p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms' 
                : 'Start a new chat to get medical assistance'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateChat} disabled={isCreating}>
                <Plus className="h-4 w-4 mr-2" />
                Start Your First Chat
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChats.map((chat) => (
            <Link key={chat.id} href={`/chat/${chat.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {chat.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        setChatToDelete(chat.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>Medical consultation</span>
                  </div>
                  {chat.lastContext && (
                    <div className="mt-2 flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Has location context
                      </span>
                    </div>
                  )}
                  <Badge variant="secondary" className="mt-3">
                    {chat.visibility === 'private' ? 'Private' : 'Public'}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

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

      {/* Quick Start Guide */}
      {filteredChats.length === 0 && !searchQuery && !isLoading && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How to Use the Medical Assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">Describe Your Symptoms</p>
                <p className="text-sm text-muted-foreground">
                  Tell the assistant about your symptoms or medical needs
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">Get Recommendations</p>
                <p className="text-sm text-muted-foreground">
                  The assistant will help determine if you need ER, urgent care, or other services
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">View Facilities on Map</p>
                <p className="text-sm text-muted-foreground">
                  See nearby medical facilities displayed on an interactive map with wait times
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold">4</span>
              </div>
              <div>
                <p className="font-medium">Get Directions</p>
                <p className="text-sm text-muted-foreground">
                  Select a facility to get directions and estimated travel time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
