import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  Zap, 
  Brain, 
  Sparkles, 
  Cpu,
  Bot,
  Wand2,
  Star
} from "lucide-react";
import { SiOpenai, SiAnthropic, SiGoogle } from "react-icons/si";

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tier: 'flagship' | 'pro' | 'standard' | 'fast';
}

// All available models from different providers
export const models: Model[] = [
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable OpenAI model',
    icon: Brain,
    tier: 'flagship'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Balanced performance',
    icon: Sparkles,
    tier: 'standard'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Fast responses',
    icon: Zap,
    tier: 'fast'
  },
  
  // Anthropic Models
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Most intelligent Claude',
    icon: Star,
    tier: 'flagship'
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fast and efficient',
    icon: Zap,
    tier: 'fast'
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Complex analysis',
    icon: Brain,
    tier: 'pro'
  },
  
  // Google Models
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Latest fast model',
    icon: Zap,
    tier: 'fast'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Advanced reasoning',
    icon: Brain,
    tier: 'pro'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    description: 'Fast multimodal',
    icon: Sparkles,
    tier: 'standard'
  },
  
  // Mistral Models
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'mistral',
    description: 'Top reasoning',
    icon: Brain,
    tier: 'flagship'
  },
  {
    id: 'mistral-medium',
    name: 'Mistral Medium',
    provider: 'mistral',
    description: 'Balanced model',
    icon: Sparkles,
    tier: 'standard'
  },
  {
    id: 'mistral-small',
    name: 'Mistral Small',
    provider: 'mistral',
    description: 'Cost-efficient',
    icon: Zap,
    tier: 'fast'
  }
];

// Group models by provider
const modelsByProvider = models.reduce((acc, model) => {
  if (!acc[model.provider]) {
    acc[model.provider] = [];
  }
  acc[model.provider].push(model);
  return acc;
}, {} as Record<string, Model[]>);

// Provider info
const providerInfo: Record<string, { name: string; icon: React.ComponentType<{ className?: string }> }> = {
  openai: { name: 'OpenAI', icon: SiOpenai },
  anthropic: { name: 'Anthropic', icon: SiAnthropic },
  google: { name: 'Google', icon: SiGoogle },
  mistral: { name: 'Mistral', icon: Bot }
};

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const currentModel = models.find(model => model.id === selectedModel) || models[0];
  const IconComponent = currentModel.icon;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'flagship':
        return 'default';
      case 'pro':
        return 'secondary';
      case 'standard':
        return 'outline';
      case 'fast':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-2 text-xs"
          disabled={disabled}
          data-testid="model-selector-trigger"
        >
          <IconComponent className="h-3 w-3" />
          <span className="hidden sm:inline-block">{currentModel.name}</span>
          <Badge variant={getTierColor(currentModel.tier)} className="text-xs px-1 py-0">
            {currentModel.provider}
          </Badge>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="min-w-72">
        {Object.entries(modelsByProvider).map(([provider, providerModels], providerIndex) => {
          const ProviderIcon = providerInfo[provider]?.icon || Bot;
          
          return (
            <div key={provider}>
              {providerIndex > 0 && <DropdownMenuSeparator />}
              
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <ProviderIcon className="h-3 w-3" />
                {providerInfo[provider]?.name || provider}
              </DropdownMenuLabel>
              
              {providerModels.map((model) => {
                const ModelIcon = model.icon;
                const isSelected = model.id === selectedModel;
                
                return (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => onModelChange(model.id)}
                    className={`flex items-start gap-3 p-3 cursor-pointer ${
                      isSelected ? 'bg-accent' : ''
                    }`}
                    data-testid={`model-option-${model.id}`}
                  >
                    <ModelIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">
                          {model.name}
                        </div>
                        <Badge
                          variant={getTierColor(model.tier)}
                          className="text-xs px-2 py-0.5"
                        >
                          {model.tier}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {model.description}
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          );
        })}
        
        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Choose the model that best fits your needs
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}