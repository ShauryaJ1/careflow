'use client';

import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import type { ChatModel } from '@/lib/ai/models';

interface AIChatbotWrapperProps {
  id: string;
  initialChatModel: ChatModel['id'];
  session: {
    user: {
      id: string;
      email?: string;
      name?: string;
    };
  };
}

export function AIChatbotWrapper({
  id,
  initialChatModel,
  session
}: AIChatbotWrapperProps) {
  return (
    <div className="w-screen h-screen overflow-hidden">
      <SidebarProvider>
        <DataStreamProvider>
          <AppSidebar session={session} />
          <SidebarInset>
            <Chat
              key={id}
              id={id}
              initialMessages={[]}
              initialChatModel={initialChatModel}
              initialVisibilityType="private"
              isReadonly={false}
              session={session}
              autoResume={false}
            />
          </SidebarInset>
          <DataStreamHandler />
        </DataStreamProvider>
      </SidebarProvider>
    </div>
  );
}