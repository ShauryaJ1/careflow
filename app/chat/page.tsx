'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Loader2 } from 'lucide-react';

export default function ChatRedirectPage() {
  const router = useRouter();

  // Fetch chats to get the most recent one
  const { data, isLoading } = trpc.chat.list.useQuery({
    limit: 1,
    offset: 0,
  });

  // Create chat mutation
  const createChatMutation = trpc.chat.create.useMutation({
    onSuccess: (newChat) => {
      router.push(`/chat/${newChat.id}`);
    },
  });

  useEffect(() => {
    if (!isLoading && data) {
      if (data.chats && data.chats.length > 0) {
        // Redirect to the most recent chat
        router.push(`/chat/${data.chats[0].id}`);
      } else {
        // No chats exist, create a new one
        const title = `Medical Consultation - ${new Date().toLocaleDateString()}`;
        createChatMutation.mutate({
          title,
          visibility: 'private',
        });
      }
    }
  }, [data, isLoading]);

  // Show loading state while fetching chats or creating
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Medical Assistant...</p>
      </div>
    </div>
  );
}
