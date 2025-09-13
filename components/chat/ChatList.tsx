import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  MoreHorizontal,
  Calendar,
  Clock
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import type { ChatSession } from "@shared/schema";

interface ChatListProps {
  currentChatId?: string;
}

export function ChatList({ currentChatId }: ChatListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fetch chat sessions from API
  const { data: sessions, isLoading, refetch } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat/sessions"],
  });

  const handleDeleteChat = async (chatId: string) => {
    setIsDeleting(chatId);
    try {
      await fetch(`/api/chat/sessions/${chatId}`, {
        method: 'DELETE',
      });
      refetch();
    } catch (error) {
      console.error('Failed to delete chat:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const sortedSessions = sessions?.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ) || [];

  return (
    <div className="flex h-full flex-col">
      {/* New Chat Button */}
      <div className="p-2 border-b">
        <Link href="/chat">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            data-testid="new-chat-button"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {sortedSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat history yet</p>
              <p className="text-xs">Start a conversation to see it here</p>
            </div>
          ) : (
            sortedSessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg p-3 transition-colors ${
                  currentChatId === session.id
                    ? 'bg-accent border'
                    : 'hover:bg-accent/50'
                }`}
              >
                <Link 
                  href={`/chat/${session.id}`}
                  className="block"
                  data-testid={`chat-link-${session.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <h3 className="font-medium text-sm truncate">
                          {session.title || "New Chat"}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(session.updatedAt), { 
                            addSuffix: true 
                          })}
                        </span>
                        <Badge variant="outline" className="text-xs px-1">
                          {session.model}
                        </Badge>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`chat-menu-${session.id}`}
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive hover:text-destructive"
                          disabled={isDeleting === session.id}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteChat(session.id);
                          }}
                          data-testid={`delete-chat-${session.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          {isDeleting === session.id ? 'Deleting...' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t text-center">
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Chat History
        </div>
      </div>
    </div>
  );
}