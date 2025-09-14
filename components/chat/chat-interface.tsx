'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/app/api/chat/route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
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
  Map,
  ExternalLink
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

  const { messages, sendMessage, addToolResult, status, setMessages } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: {
        chatId,
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: ({ message }) => {
      // Save completed assistant message to database (user messages are saved in handleSendMessage)
      // onFinish in v5 receives an object with the message
      if (message && message.role === 'assistant') {
        // Ensure we save all parts including tool invocations
        // Filter out step markers and keep only meaningful parts
        const partsToSave = (message.parts || []).filter((part: any) => {
          // Skip step markers
          if (part.type === 'step-start' || part.type === 'step-finish') {
            return false;
          }
          return true;
        });
        
        // Log for debugging
        console.log('Saving assistant message with', partsToSave.length, 'parts');
        console.log('Parts structure:', JSON.stringify(partsToSave, null, 2));
        
        saveMessageMutation.mutate({
          chatId,
          role: message.role as 'user' | 'assistant' | 'system' | 'tool',
          parts: partsToSave,
          attachments: [],
        }, {
          onSuccess: () => {
            console.log(`Saved assistant message to DB (id: ${message.id})`);
          },
          onError: (error) => {
            console.error('Failed to save message:', error);
          }
        });
      }
    },
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
                toolCallId: toolCall.toolCallId,
                result: location,
              } as any);
            },
            (error) => {
              addToolResult({
                toolCallId: toolCall.toolCallId,
                result: { error: 'Unable to get location' },
              } as any);
            }
          );
        } else {
          addToolResult({
            toolCallId: toolCall.toolCallId,
            result: { error: 'Geolocation not supported' },
          } as any);
        }
      }
    },
  });

  // Load initial messages when component mounts
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0 && setMessages) {
      console.log('Loading initial messages:', initialMessages);
      console.log('First message parts:', initialMessages[0]?.parts);
      
      // Set the initial messages
      setMessages(initialMessages as ChatMessage[]);
    }
  }, []); // Only run once on mount

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
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

  const getTypeOfCareColor = (type: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
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
      const userMessage = input.trim();
      
      // Save user message to database
      saveMessageMutation.mutate({
        chatId,
        role: 'user',
        parts: [{ type: 'text', text: userMessage }],
        attachments: [],
      }, {
        onSuccess: () => {
          console.log('Saved user message to DB');
        },
        onError: (error) => {
          console.error('Failed to save user message:', error);
        }
      });
      
      // Send message to AI
      sendMessage({ text: userMessage });
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Emergency Alert */}
      <div className="px-4 pt-4">
        <Alert className="flex-shrink-0 mb-4 border-red-200 bg-red-50 dark:bg-red-950/20 max-w-5xl mx-auto">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>If this is a medical emergency, call 911 immediately.</strong>
          </AlertDescription>
        </Alert>
      </div>

      {/* Messages Area - Takes remaining space */}
      <div className="flex-1 overflow-y-auto px-4" ref={scrollAreaRef}>
        <div className="space-y-4 pb-4 max-w-5xl mx-auto">
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
                              {message.role === 'user' ? (
                                <p className="text-sm whitespace-pre-wrap">{part.text || part.content || ''}</p>
                              ) : (
                                <div className="text-sm space-y-4">
                                  {(part.text || part.content || '').split('\n').filter((line: string) => line.trim()).map((paragraph: string, index: number) => (
                                    <div key={index} className="prose prose-sm max-w-none dark:prose-invert">
                                      <ReactMarkdown>{paragraph}</ReactMarkdown>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );

                      case 'tool-confirmSelection':
                        // Handle both args and input structures
                        const confirmData = part.args || part.input || {};
                        const hospitalName = confirmData.hospitalName || 'Selected facility';
                        const estimatedTime = confirmData.estimatedTime || 'N/A';
                        
                        // Debug log for tool structure
                        if (!part.args && !part.input) {
                          console.log('confirmSelection tool part structure:', part);
                        }
                        
                        return (
                          <Card key={part.toolCallId || `confirm-${i}`}>
                            <CardContent className="p-3">
                              <p className="text-sm mb-3">
                                Confirm selection: <strong>{hospitalName}</strong>
                                <br />
                                Estimated time: {estimatedTime}
                              </p>
                              {part.state === 'output-available' || part.state === 'result' ? (
                                <p className="text-sm text-muted-foreground">{part.output || part.result || 'Selection processed'}</p>
                              ) : (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      addToolResult({
                                        toolCallId: part.toolCallId,
                                        result: 'Confirmed',
                                      } as any)
                                    }
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      addToolResult({
                                        toolCallId: part.toolCallId,
                                        result: 'Cancelled',
                                      } as any)
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
                        const locationOutput = part.output || part.result;
                        if ((part.state === 'output-available' || part.state === 'result') && locationOutput?.lat) {
                          return (
                            <Card key={part.toolCallId || `location-${i}`} className="bg-green-50 dark:bg-green-950/20">
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
                          <Card key={part.toolCallId || `location-loading-${i}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Getting your location...
                              </div>
                            </CardContent>
                          </Card>
                        );

                      case 'tool-searchProvidersWithExa':
                        if (part.state === 'output-available' || part.state === 'result' || part.output || part.result) {
                          const exaOutput = part.output || part.result || {};
                          const { searchQuery, totalFound, providersAdded, providers, careType, error } = exaOutput;
                          
                          if (error) {
                            return (
                              <Card key={part.toolCallId || `exa-error-${i}`} className="border-red-200 bg-red-50 dark:bg-red-950/20">
                                <CardContent className="p-3">
                                  <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                                    <AlertCircle className="h-4 w-4" />
                                    Error searching for providers: {error}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          }
                          
                          return (
                            <Card key={part.toolCallId || `exa-${i}`} className="overflow-hidden">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <Globe className="h-5 w-5" />
                                  {careType === 'telehealth' ? 'Telehealth Providers' : 'Pop-up Clinics'} Found
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  Found {totalFound} providers in your area
                                </p>
                              </CardHeader>
                              <CardContent>
                                {providers && providers.length > 0 ? (
                                  <div className="space-y-3">
                                    {providers.map((provider: any, idx: number) => (
                                      <div
                                        key={provider.id || idx}
                                        className="group relative"
                                      >
                                        <a
                                          href={provider.website && provider.website !== 'null' ? provider.website : '#'}
                                          target={provider.website && provider.website !== 'null' ? '_blank' : undefined}
                                          rel="noopener noreferrer"
                                          className={provider.website && provider.website !== 'null' ? 'cursor-pointer' : 'cursor-default'}
                                        >
                                          <div className={cn(
                                            "p-4 rounded-lg border transition-all",
                                            provider.website && provider.website !== 'null' 
                                              ? "hover:bg-muted/50 hover:border-primary/50 hover:shadow-sm" 
                                              : "bg-muted/20"
                                          )}>
                                            <div className="flex justify-between items-start mb-2">
                                              <div className="flex-1">
                                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                                  {provider.name}
                                                  {provider.website && provider.website !== 'null' && (
                                                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                  )}
                                                </h4>
                                                {provider.website && provider.website !== 'null' && (
                                                  <p className="text-xs text-blue-600 dark:text-blue-400 truncate max-w-[300px]">
                                                    {provider.website}
                                                  </p>
                                                )}
                                              </div>
                                              <Badge variant={careType === 'telehealth' ? 'secondary' : 'default'} className="text-xs">
                                                {careType === 'telehealth' ? 'Telehealth' : 'Pop-up'}
                                              </Badge>
                                            </div>
                                            
                                            {provider.description && provider.description !== 'null' && (
                                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                                {provider.description}
                                              </p>
                                            )}
                                            
                                            <div className="flex flex-wrap gap-3 text-xs">
                                              {provider.address && provider.address !== 'null' && provider.address !== 'Online' && (
                                                <div className="flex items-center gap-1">
                                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                                  <span className="text-muted-foreground">
                                                    {provider.address}, {provider.city}, {provider.state}
                                                  </span>
                                                </div>
                                              )}
                                              
                                              {provider.phone_number && provider.phone_number !== 'null' && (
                                                <div className="flex items-center gap-1">
                                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                                  <span className="text-muted-foreground">{provider.phone_number}</span>
                                                </div>
                                              )}
                                              
                                              {provider.wait_score && (
                                                <div className="flex items-center gap-1">
                                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                                  <span className="text-muted-foreground">~{provider.wait_score} min wait</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </a>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No providers found.</p>
                                )}
                                
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs text-muted-foreground">
                                    Search query: &quot;{searchQuery}&quot;
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        }
                        return (
                          <Card key={part.toolCallId || `exa-loading-${i}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching for providers...
                              </div>
                            </CardContent>
                          </Card>
                        );

                      case 'tool-showHospitalsOnMap':
                        // Handle both fresh and loaded message structures
                        if (part.state === 'output-available' || part.state === 'result' || part.output?.hospitals || part.result?.hospitals) {
                          // Handle both part.output structure and direct properties
                          const output = part.output || part.result || part;
                          const hospitals = output.hospitals || [];
                          const query = output.query || output.input?.query || 'your location';
                          const totalFound = output.totalFound || hospitals.length;
                          const mapUserLocation = output.userLocation;
                          
                          // Debug log for loaded messages
                          if (!part.output && !part.result) {
                            console.log('showHospitalsOnMap tool part structure:', part);
                          }
                          
                          return (
                            <Card key={part.toolCallId || `hospitals-${i}`} className="overflow-hidden">
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
                                    hospitals={hospitals || []}
                                    selectedHospital={selectedHospital}
                                    userLocation={mapUserLocation || userLocation}
                                    onHospitalSelect={setSelectedHospital}
                                  />
                                </div>
                                
                                {/* Hospital List */}
                                {hospitals && hospitals.length > 0 && (
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
                                )}
                              </CardContent>
                            </Card>
                          );
                        }
                        return (
                          <Card key={part.toolCallId || `hospitals-loading-${i}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching for medical facilities...
                              </div>
                            </CardContent>
                          </Card>
                        );

                      case 'step-start':
                      case 'step-finish':
                        // Don't render step markers
                        return null;
                      
                      default:
                        // Handle other tool results
                        if (part.type?.startsWith('tool-')) {
                          if (part.state === 'output-available') {
                            // Check if this is the hospitals map tool by examining the output
                            if (part.output?.hospitals && Array.isArray(part.output.hospitals)) {
                              const { hospitals, query, totalFound } = part.output;
                              return (
                                <Card key={part.toolCallId || `hospitals-fallback-${i}`} className="overflow-hidden">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                      <Map className="h-5 w-5" />
                                      Medical Facilities {query ? `Near: ${query}` : 'Found'}
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                      Found {totalFound || hospitals.length} facilities
                                    </p>
                                  </CardHeader>
                                  <CardContent className="p-0">
                                    <div className="h-[400px] w-full">
                                      <HospitalsMap
                                        hospitals={hospitals}
                                        selectedHospital={selectedHospital}
                                        userLocation={userLocation}
                                        onHospitalSelect={setSelectedHospital}
                                      />
                                    </div>
                                    
                                    {/* Hospital List */}
                                    {hospitals.length > 0 && (
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
                                            <div className="flex justify-between items-start gap-2">
                                              <div className="flex-1">
                                                <h4 className="font-medium text-sm">{hospital.name}</h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  {hospital.address}, {hospital.city}, {hospital.state}
                                                </p>
                                                <div className="flex gap-2 mt-2">
                                                  <Badge variant={getTypeOfCareColor(hospital.type_of_care)}>
                                                    {getTypeOfCareLabel(hospital.type_of_care)}
                                                  </Badge>
                                                  {hospital.wait_score && (
                                                    <Badge variant="secondary">
                                                      Wait: {hospital.wait_score}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                              {hospital.phone_number && (
                                                <div className="text-right">
                                                  <div className="flex items-center gap-1 text-primary">
                                                    <Phone className="h-3 w-3" />
                                                    <p className="text-xs">{hospital.phone_number}</p>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            }
                            
                          return null;
                          //   // Suppress UI for internal helper tools
                          //   if (part.type === 'tool-to_lat_lng' || part.type === 'tool-getNeighboringZipcodes') {
                          //     return null;
                          //   }

                          //   // Default fallback for other tools - show JSON
                          //   return (
                          //     <Card key={part.toolCallId || `tool-json-${i}`} className="bg-blue-50 dark:bg-blue-950/20">
                          //       <CardContent className="p-3">
                          //         <pre className="text-xs overflow-x-auto">
                          //           {JSON.stringify(part.output, null, 2)}
                          //         </pre>
                          //       </CardContent>
                          //     </Card>
                          //   );
                          }
                          return (
                            <Card key={part.toolCallId || `tool-loading-${i}`}>
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

          {(status as any) === 'in_progress' && (
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
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2 max-w-5xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms or ask for help..."
            disabled={(status as any) === 'in_progress'}
            className="flex-1"
          />
          <Button type="submit" disabled={(status as any) === 'in_progress' || !input.trim()}>
            {(status as any) === 'in_progress' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
