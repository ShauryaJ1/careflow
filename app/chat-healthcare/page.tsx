import Chat from "@/components/chat/ChatPanel";
import ServiceRequestForm from "@/components/ServiceRequestForm";

export default function HealthcareChatPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-foreground">
          Healthcare Assistant
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Chat with Healthcare AI</h2>
            <div className="h-[600px]">
              <Chat />
            </div>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Request Healthcare Services</h2>
            <ServiceRequestForm />
          </div>
        </div>
      </div>
    </div>
  );
}