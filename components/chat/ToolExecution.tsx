import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp,
  Cloud,
  Search,
  Calculator,
  TrendingUp,
  ChefHat,
  Globe,
  Loader2,
  Check
} from "lucide-react";
import { useState } from "react";

interface ToolExecutionProps {
  toolName: string;
  args: any;
  result?: any;
  status: 'executing' | 'completed' | 'error';
}

// Get icon for tool
function getToolIcon(toolName: string) {
  switch (toolName) {
    case 'weather':
    case 'getWeather':
      return Cloud;
    case 'searchWeb':
    case 'search':
      return Search;
    case 'calculateMath':
    case 'calculate':
      return Calculator;
    case 'getStockPrice':
    case 'stock':
      return TrendingUp;
    case 'generateRecipe':
    case 'recipe':
      return ChefHat;
    default:
      return Globe;
  }
}

// Format tool name for display
function formatToolName(toolName: string): string {
  const names: Record<string, string> = {
    weather: 'Get Weather',
    getWeather: 'Get Weather',
    searchWeb: 'Web Search',
    calculateMath: 'Calculate Math',
    getStockPrice: 'Get Stock Price',
    generateRecipe: 'Generate Recipe'
  };
  
  return names[toolName] || toolName;
}

export function ToolExecution({ toolName, args, result, status }: ToolExecutionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = getToolIcon(toolName);
  
  return (
    <div className="my-4">
      {/* Tool Header */}
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{formatToolName(toolName)}</span>
        {status === 'executing' && (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Executing
          </Badge>
        )}
        {status === 'completed' && (
          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
            <Check className="h-3 w-3" />
            Completed
          </Badge>
        )}
        {status === 'error' && (
          <Badge variant="destructive">
            Error
          </Badge>
        )}
      </div>
      
      {/* Tool Result */}
      {result && status === 'completed' && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="border-muted">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    RESULT
                  </Badge>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                {toolName === 'weather' || toolName === 'getWeather' ? (
                  <WeatherResult data={result} />
                ) : toolName === 'searchWeb' ? (
                  <SearchResult data={result} />
                ) : toolName === 'calculateMath' ? (
                  <MathResult data={result} />
                ) : toolName === 'getStockPrice' ? (
                  <StockResult data={result} />
                ) : toolName === 'generateRecipe' ? (
                  <RecipeResult data={result} />
                ) : (
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}

// Weather Result Component
function WeatherResult({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">
            {data.temperature}°{data.unit === 'celsius' ? 'C' : 'F'}
          </h3>
          <p className="text-sm text-muted-foreground">{data.location}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{data.condition}</p>
          <p className="text-xs text-muted-foreground">
            Humidity: {data.humidity}%
          </p>
        </div>
      </div>
      
      {data.forecast && (
        <div className="flex gap-2 overflow-x-auto">
          {data.forecast.map((day: any, i: number) => (
            <div key={i} className="flex-shrink-0 text-center p-2 rounded-md bg-muted/50">
              <p className="text-xs font-medium">{day.day}</p>
              <p className="text-sm">{day.high}°</p>
              <p className="text-xs text-muted-foreground">{day.low}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Search Result Component
function SearchResult({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.results?.map((result: any, i: number) => (
        <div key={i} className="space-y-1">
          <a 
            href={result.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
            data-testid={`link-search-result-${i}`}
          >
            {result.title}
          </a>
          <p className="text-xs text-muted-foreground">
            {result.snippet}
          </p>
        </div>
      ))}
    </div>
  );
}

// Math Result Component
function MathResult({ data }: { data: any }) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-sm">
        <span className="text-muted-foreground">Expression:</span> {data.expression}
      </div>
      {data.error ? (
        <div className="text-sm text-destructive">{data.error}</div>
      ) : (
        <div className="text-2xl font-bold">= {data.result}</div>
      )}
    </div>
  );
}

// Stock Result Component
function StockResult({ data }: { data: any }) {
  const isPositive = data.change >= 0;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">${data.price}</h3>
          <p className="text-sm font-medium">{data.symbol}</p>
        </div>
        <div className={`text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <p className="text-sm font-medium">
            {isPositive ? '+' : ''}{data.change} ({data.changePercent}%)
          </p>
          <p className="text-xs text-muted-foreground">
            Vol: {(data.volume / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Day High:</span> ${data.dayHigh}
        </div>
        <div>
          <span className="text-muted-foreground">Day Low:</span> ${data.dayLow}
        </div>
        <div>
          <span className="text-muted-foreground">Market Cap:</span> {data.marketCap}
        </div>
      </div>
    </div>
  );
}

// Recipe Result Component
function RecipeResult({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{data.name}</h3>
      
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Prep: {data.prepTime}</span>
        <span>Cook: {data.cookTime}</span>
        <span>Servings: {data.servings}</span>
      </div>
      
      {data.ingredients && (
        <div>
          <h4 className="text-sm font-medium mb-1">Ingredients:</h4>
          <ul className="text-sm space-y-1">
            {data.ingredients.map((ing: any, i: number) => (
              <li key={i} className="text-muted-foreground">
                • {ing.amount} {ing.item}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {data.instructions && (
        <div>
          <h4 className="text-sm font-medium mb-1">Instructions:</h4>
          <ol className="text-sm space-y-1">
            {data.instructions.map((step: string, i: number) => (
              <li key={i} className="text-muted-foreground">
                {i + 1}. {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}