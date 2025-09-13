"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Square,
  RefreshCw,
  Bot,
  User,
  Loader2,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ModelSelector } from "./ModelSelector";
import { EmptyScreen } from "./EmptyScreen";
import { ToolExecution } from "./ToolExecution";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ChatPanelProps {
  chatId?: string;
  initialMessages?: any[];
}

export function ChatPanel({ chatId, initialMessages = [] }: ChatPanelProps) {
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [enableTools, setEnableTools] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Use AI SDK v5 useChat hook with correct API and model
  const { 
    messages, 
    input,
    setInput,
    handleInputChange,
    handleSubmit: submitMessage,
    append,
    stop,
    error,
    reload,
    isLoading
  } = useChat({
    api: '/api/ai/chat',
    initialMessages,
    body: {
      model: selectedModel,
      enableTools
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: error.message || "Failed to connect to the AI assistant. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle example message from EmptyScreen
  const handleExampleMessage = async (message: string) => {
    setInput(message);
    // Use a small timeout to ensure the input is set before submitting
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 10);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Handle enter key submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Handle regenerate - reload last response
  const handleRegenerate = async () => {
    await reload();
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    submitMessage(e);
  };

  // Render message content with tool calls
  const renderMessageContent = (message: any) => {
    if (message.role === 'user') {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap m-0">{message.content}</p>
        </div>
      );
    }

    // For assistant messages, check for tool calls
    if (message.toolInvocations && message.toolInvocations.length > 0) {
      return (
        <div className="space-y-4">
          {message.content && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="whitespace-pre-wrap m-0">{message.content}</p>
            </div>
          )}
          {message.toolInvocations.map((toolCall: any, idx: number) => (
            <ToolExecution
              key={`${message.id}-tool-${idx}`}
              toolName={toolCall.toolName}
              args={toolCall.args}
              result={toolCall.result}
              status={toolCall.state === 'result' ? 'completed' : 'executing'}
            />
          ))}
        </div>
      );
    }

    // Regular assistant message
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p className="whitespace-pre-wrap m-0">{message.content}</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <EmptyScreen onSendMessage={handleExampleMessage} />
        </div>
      ) : (
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((message, index) => {
              if (!message.content && (!message.toolInvocations || message.toolInvocations.length === 0)) {
                return null;
              }
              
              return (
                <div
                  key={message.id || index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex gap-3 max-w-[85%] ${
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {message.role === "user" ? (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <Card className={`${
                      message.role === "user" 
                        ? "bg-primary/5 border-primary/10" 
                        : "bg-card"
                    }`}>
                      <CardContent className="p-4">
                        {renderMessageContent(message)}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-3 max-w-[85%]">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="w-4 h-4 text-muted-foreground animate-pulse" />
                    </div>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex justify-center">
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-destructive">
                      Error: {error?.message || "Something went wrong. Please try again."}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={handleRegenerate}
                      data-testid="button-retry"
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Input Form */}
      <div className="border-t bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Settings Bar */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  disabled={isLoading}
                />
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="enable-tools"
                    checked={enableTools}
                    onCheckedChange={setEnableTools}
                    disabled={isLoading}
                  />
                  <Label htmlFor="enable-tools" className="text-xs text-muted-foreground">
                    Tools
                  </Label>
                </div>
              </div>
              
              {messages.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  data-testid="button-reload"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Regenerate
                </Button>
              )}
            </div>

            {/* Input Field */}
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[60px] max-h-[200px] resize-none flex-1"
                disabled={isLoading}
                rows={1}
                data-testid="input-message"
              />
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  onClick={stop}
                  variant="destructive"
                  data-testid="button-stop"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input || !input.trim()}
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}