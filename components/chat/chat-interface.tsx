'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/app/api/chat/route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  MapPin, 
  Clock, 
  Phone, 
  Globe,
  User,
  Bot,
  AlertCircle,
  Loader2,
  Navigation,
  Map
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Hospital } from '@/lib/types/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';

// Dynamically import the map component to avoid SSR issues
const HospitalsMap = dynamic(() => import('@/components/hospitals-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-muted/20 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface ChatInterfaceProps {
  chatId: string;
  initialMessages?: any[];
}

export default function ChatInterface({ chatId, initialMessages = [] }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Save messages to database
  const saveMessageMutation = trpc.chat.messages.create.useMutation();
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());

  const { messages, sendMessage, addToolResult, isLoading } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    body: {
      chatId,
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      // Handle client-side tools
      if (toolCall.toolName === 'getUserLocation') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              setUserLocation(location);
              addToolResult({
                tool: 'getUserLocation',
                toolCallId: toolCall.toolCallId,
                output: location,
              });
            },
            (error) => {
              addToolResult({
                tool: 'getUserLocation',
                toolCallId: toolCall.toolCallId,
                output: { error: 'Unable to get location' },
              });
            }
          );
        } else {
          addToolResult({
            tool: 'getUserLocation',
            toolCallId: toolCall.toolCallId,
            output: { error: 'Geolocation not supported' },
          });
        }
      }
    },
  });

  // Save messages to database
  useEffect(() => {
    const saveMessages = async () => {
      for (const message of messages) {
        // Skip if already saved
        if (savedMessageIds.has(message.id)) continue;
        
        try {
          // Build parts from message
          let parts: any[] = [];
          
          if (message.parts) {
            parts = message.parts;
          } else if (message.content) {
            parts = [{ type: 'text', text: message.content }];
          }
          
          if (parts.length > 0) {
            await saveMessageMutation.mutateAsync({
              chatId,
              role: message.role as 'user' | 'assistant' | 'system' | 'tool',
              parts,
              attachments: [],
            });
            setSavedMessageIds(prev => new Set([...prev, message.id]));
            console.log('Saved message to DB:', message.id, message.role);
          }
        } catch (error) {
          console.error('Failed to save message:', error);
        }
      }
    };
    
    if (messages.length > savedMessageIds.size) {
      saveMessages();
    }
  }, [messages, chatId, savedMessageIds.size, saveMessageMutation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Could not get user location:', error);
        }
      );
    }
  }, []);

  const getTypeOfCareLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ER': 'Emergency Room',
      'urgent_care': 'Urgent Care',
      'telehealth': 'Telehealth',
      'clinic': 'Clinic',
      'pop_up_clinic': 'Pop-up Clinic',
      'practitioner': 'Practitioner',
    };
    return labels[type] || type;
  };

  const getTypeOfCareColor = (type: string) => {
    const colors: Record<string, string> = {
      'ER': 'destructive',
      'urgent_care': 'default',
      'telehealth': 'secondary',
      'clinic': 'outline',
      'pop_up_clinic': 'default',
      'practitioner': 'secondary',
    };
    return colors[type] || 'default';
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Emergency Alert */}
      <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-950/20">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <strong>If this is a medical emergency, call 911 immediately.</strong>
        </AlertDescription>
      </Alert>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div className={cn(
                "flex items-start gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}>
                {message.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] space-y-2",
                  message.role === 'user' ? 'items-end' : 'items-start'
                )}>
                  {message.parts?.map((part: any, i: number) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <Card key={`${message.id}-${i}`} className={cn(
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          )}>
                            <CardContent className="p-3">
                              <p className="text-sm whitespace-pre-wrap">{part.text}</p>
                            </CardContent>
                          </Card>
                        );

                      case 'tool-confirmSelection':
                        return (
                          <Card key={part.toolCallId}>
                            <CardContent className="p-3">
                              <p className="text-sm mb-3">
                                Confirm selection: <strong>{part.args.hospitalName}</strong>
                                <br />
                                Estimated time: {part.args.estimatedTime}
                              </p>
                              {part.state === 'output-available' ? (
                                <p className="text-sm text-muted-foreground">{part.output}</p>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      addToolResult({
                                        tool: 'confirmSelection',
                                        toolCallId: part.toolCallId,
                                        output: 'Confirmed',
                                      })
                                    }
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      addToolResult({
                                        tool: 'confirmSelection',
                                        toolCallId: part.toolCallId,
                                        output: 'Cancelled',
                                      })
                                    }
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );

                      case 'tool-getUserLocation':
                        if (part.state === 'output-available' && part.output?.lat) {
                          return (
                            <Card key={part.toolCallId} className="bg-green-50 dark:bg-green-950/20">
                              <CardContent className="p-3">
                                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                  <Navigation className="h-4 w-4" />
                                  Location retrieved successfully
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                        return (
                          <Card key={part.toolCallId}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Getting your location...
                              </div>
                            </CardContent>
                          </Card>
                        );

                      case 'tool-showHospitalsOnMap':
                        if (part.state === 'output-available' && part.output) {
                          const { hospitals, userLocation: mapUserLocation, query, totalFound } = part.output;
                          return (
                            <Card key={part.toolCallId} className="overflow-hidden">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Map className="h-5 w-5" />
                                  Medical Facilities Near: {query}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  Found {totalFound} facilities
                                </p>
                              </CardHeader>
                              <CardContent className="p-0">
                                <div className="h-[400px] w-full">
                                  <HospitalsMap
                                    hospitals={hospitals}
                                    selectedHospital={selectedHospital}
                                    userLocation={mapUserLocation || userLocation}
                                    onHospitalSelect={setSelectedHospital}
                                  />
                                </div>
                                
                                {/* Hospital List */}
                                <div className="p-4 max-h-[300px] overflow-y-auto">
                                  <div className="space-y-2">
                                    {hospitals.slice(0, 5).map((hospital: any) => (
                                      <div
                                        key={hospital.id}
                                        className={cn(
                                          "p-3 rounded-lg border cursor-pointer transition-colors",
                                          selectedHospital?.id === hospital.id
                                            ? "border-primary bg-primary/5"
                                            : "hover:bg-muted/50"
                                        )}
                                        onClick={() => setSelectedHospital(hospital)}
                                      >
                                        <div className="flex justify-between items-start mb-1">
                                          <p className="font-medium text-sm">{hospital.name}</p>
                                          {hospital.distance_miles && (
                                            <Badge variant="secondary" className="text-xs">
                                              {hospital.distance_miles.toFixed(1)} mi
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex gap-2 mb-1">
                                          <Badge variant={getTypeOfCareColor(hospital.type_of_care) as any} className="text-xs">
                                            {getTypeOfCareLabel(hospital.type_of_care)}
                                          </Badge>
                                          {hospital.wait_score && (
                                            <Badge variant="outline" className="text-xs">
                                              ~{hospital.wait_score} min wait
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <div className="flex items-start gap-1">
                                            <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                                            <p className="text-xs text-muted-foreground">
                                              {hospital.address}, {hospital.city}, {hospital.state} {hospital.zip_code}
                                            </p>
                                          </div>
                                          {hospital.phone_number && (
                                            <div className="flex items-center gap-1">
                                              <Phone className="h-3 w-3 text-muted-foreground" />
                                              <p className="text-xs text-muted-foreground">{hospital.phone_number}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                        return (
                          <Card key={part.toolCallId}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching for medical facilities...
                              </div>
                            </CardContent>
                          </Card>
                        );

                      default:
                        // Handle other tool results
                        if (part.type?.startsWith('tool-')) {
                          if (part.state === 'output-available') {
                            return (
                              <Card key={part.toolCallId} className="bg-blue-50 dark:bg-blue-950/20">
                                <CardContent className="p-3">
                                  <pre className="text-xs overflow-x-auto">
                                    {JSON.stringify(part.output, null, 2)}
                                  </pre>
                                </CardContent>
                              </Card>
                            );
                          }
                          return (
                            <Card key={part.toolCallId}>
                              <CardContent className="p-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Processing...
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                        return null;
                    }
                  })}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your symptoms or ask for help..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}