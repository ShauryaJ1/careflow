import { cookies } from 'next/headers';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { AIChatbotWrapper } from '@/components/ai-chatbot-wrapper';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AIChatbotPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const id = generateUUID();
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  // Create a session object compatible with the Chat component
  const session = {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
    }
  };

  const chatModel = modelIdFromCookie?.value || DEFAULT_CHAT_MODEL;

  return (
    <div className="w-screen h-screen overflow-hidden">
      <AIChatbotWrapper
        id={id}
        initialChatModel={chatModel}
        session={session}
      />
    </div>
  );
}