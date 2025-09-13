import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Code, FileText } from "lucide-react";

interface EmptyScreenProps {
  onSendMessage?: (message: string) => void;
}

const exampleMessages = [
  {
    heading: "Explain a concept",
    subheading: "Break down complex topics",
    message: `Can you explain quantum computing in simple terms?`
  },
  {
    heading: "Write code",
    subheading: "Help with programming",
    message: `Write a TypeScript function to sort an array of objects by date`
  },
  {
    heading: "Creative writing",
    subheading: "Generate stories and content",
    message: `Write a short story about a time traveler who gets stuck in ancient Rome`
  },
  {
    heading: "Analyze and summarize",
    subheading: "Extract key insights",
    message: `What are the main arguments for and against artificial intelligence?`
  }
];

export function EmptyScreen({ onSendMessage }: EmptyScreenProps) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-8 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-background p-3 shadow-sm">
            <Bot className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <h1 className="text-2xl font-semibold">
          Welcome to AI Chat
        </h1>
        
        <p className="leading-normal text-muted-foreground">
          I can help you with a wide range of tasks, from answering questions to creative writing and coding.
          Try an example below to get started.
        </p>
      </div>
      
      <div className="mt-4 flex flex-col items-start space-y-2">
        {exampleMessages.map((example, index) => (
          <Button
            key={index}
            variant="ghost"
            className="h-auto p-0 text-base w-full"
            data-testid={`example-message-${index}`}
            onClick={() => {
              onSendMessage?.(example.message);
            }}
          >
            <div className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left hover:bg-accent transition-colors">
              <div className="text-muted-foreground">
                {index === 0 && <Sparkles className="h-5 w-5" />}
                {index === 1 && <Code className="h-5 w-5" />}
                {index === 2 && <FileText className="h-5 w-5" />}
                {index === 3 && <Bot className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {example.heading}
                </div>
                <div className="text-sm text-muted-foreground">
                  {example.subheading}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}